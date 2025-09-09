import { AgentResults } from '../agents/main';
import { ReportOptions } from './ReportGenerator';
import { HTMLReportGenerator } from './HTMLReportGenerator';
import puppeteer from 'puppeteer';
import fs from 'fs/promises';

export class PDFReportGenerator {
    private htmlGenerator: HTMLReportGenerator;

    constructor() {
        this.htmlGenerator = new HTMLReportGenerator();
    }

    async generate(
        results: AgentResults, 
        outputPath: string, 
        options: ReportOptions
    ): Promise<void> {
        // Generate HTML content
        const htmlContent = await this.htmlGenerator.generate(results, options);
        
        // Add PDF-specific styles
        const pdfHtml = this.addPdfStyles(htmlContent);

        // Launch puppeteer and generate PDF
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            const page = await browser.newPage();
            await page.setContent(pdfHtml, { waitUntil: 'networkidle0' });

            // Configure PDF options
            const pdfOptions: puppeteer.PDFOptions = {
                path: outputPath,
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    right: '20mm',
                    bottom: '20mm',
                    left: '20mm'
                },
                displayHeaderFooter: true,
                headerTemplate: this.generateHeaderTemplate(results),
                footerTemplate: this.generateFooterTemplate(),
                preferCSSPageSize: false
            };

            await page.pdf(pdfOptions);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    private addPdfStyles(htmlContent: string): string {
        const pdfStyles = `
        <style>
            /* PDF-specific styles */
            @media print {
                body {
                    background: white !important;
                    color: #333 !important;
                    font-size: 12px;
                    line-height: 1.4;
                }

                .container {
                    max-width: none;
                    margin: 0;
                    padding: 0;
                }

                .report-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                    -webkit-print-color-adjust: exact;
                    color: white !important;
                    page-break-after: avoid;
                    margin-bottom: 20px;
                }

                .navbar {
                    display: none;
                }

                .section {
                    background: white !important;
                    border: 1px solid #e2e8f0 !important;
                    margin-bottom: 20px;
                    page-break-inside: avoid;
                    break-inside: avoid;
                }

                .section-header {
                    page-break-after: avoid;
                    border-bottom: 2px solid #667eea !important;
                }

                .recommendation-card, 
                .library-card, 
                .tutorial-card,
                .metric-card {
                    background: #f8fafc !important;
                    border: 1px solid #e2e8f0 !important;
                    page-break-inside: avoid;
                    break-inside: avoid;
                    margin-bottom: 15px;
                }

                .code-block {
                    background: #1f2937 !important;
                    color: #f9fafb !important;
                    -webkit-print-color-adjust: exact;
                    font-size: 10px;
                    page-break-inside: avoid;
                }

                .code-before-after {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }

                .strategic-insights {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                    color: white !important;
                    -webkit-print-color-adjust: exact;
                }

                .tech-tag {
                    background: linear-gradient(135deg, #667eea, #764ba2) !important;
                    color: white !important;
                    -webkit-print-color-adjust: exact;
                }

                .priority-badge {
                    -webkit-print-color-adjust: exact;
                }

                .priority-high {
                    background: #fecaca !important;
                    color: #dc2626 !important;
                }

                .priority-medium {
                    background: #fed7aa !important;
                    color: #ea580c !important;
                }

                .priority-low {
                    background: #bbf7d0 !important;
                    color: #16a34a !important;
                }

                .impact-bar {
                    background: rgba(102, 126, 234, 0.2) !important;
                    -webkit-print-color-adjust: exact;
                }

                .impact-fill {
                    background: linear-gradient(90deg, #4facfe, #00f2fe) !important;
                    -webkit-print-color-adjust: exact;
                }

                .footer {
                    page-break-before: auto;
                }

                h1, h2, h3 {
                    page-break-after: avoid;
                    color: #2d3748 !important;
                }

                /* Ensure tables don't break awkwardly */
                table {
                    page-break-inside: avoid;
                }

                /* Chart and metric styling for print */
                .metrics-grid {
                    display: grid !important;
                    grid-template-columns: repeat(2, 1fr) !important;
                    gap: 10px !important;
                }

                .business-impact-grid {
                    grid-template-columns: 1fr !important;
                }

                /* Page break management */
                .page-break-before {
                    page-break-before: always;
                }

                .page-break-after {
                    page-break-after: always;
                }

                .no-break {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
            }

            /* Ensure proper font rendering */
            * {
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
        </style>`;

        // Insert PDF styles before closing head tag
        return htmlContent.replace('</head>', `${pdfStyles}</head>`);
    }

    private generateHeaderTemplate(results: AgentResults): string {
        return `
        <div style="font-size: 10px; padding: 10px; width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0;">
            <span style="font-weight: bold;">Strategic Code Companion - Analysis Report</span>
            <span>Project: ${results.analysis.project_type}</span>
        </div>`;
    }

    private generateFooterTemplate(): string {
        return `
        <div style="font-size: 10px; padding: 10px; width: 100%; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0;">
            <span>Generated on: <span class="date"></span></span>
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
            <span>Strategic Code Companion v1.0.0</span>
        </div>`;
    }

    // Alternative implementation using HTML-to-PDF libraries (if Puppeteer isn't available)
    async generateWithHtmlPdf(
        results: AgentResults, 
        outputPath: string, 
        options: ReportOptions
    ): Promise<void> {
        try {
            const pdf = await import('html-pdf');
            const htmlContent = await this.htmlGenerator.generate(results, options);
            const pdfHtml = this.addPdfStyles(htmlContent);

            const pdfOptions = {
                format: 'A4' as const,
                orientation: 'portrait' as const,
                border: {
                    top: '20mm',
                    right: '20mm',
                    bottom: '20mm',
                    left: '20mm'
                },
                header: {
                    height: '15mm',
                    contents: `
                        <div style="text-align: center; font-size: 12px; padding: 5px;">
                            <strong>Strategic Code Companion - Analysis Report</strong>
                        </div>`
                },
                footer: {
                    height: '15mm',
                    contents: {
                        default: `
                            <div style="text-align: center; font-size: 10px; padding: 5px;">
                                Page {{page}} of {{pages}} | Generated by Strategic Code Companion v1.0.0
                            </div>`
                    }
                }
            };

            return new Promise((resolve, reject) => {
                pdf.create(pdfHtml, pdfOptions).toFile(outputPath, (err: any) => {
                    if (err) {
                        reject(new Error(`PDF generation failed: ${err.message}`));
                    } else {
                        resolve();
                    }
                });
            });
        } catch (error) {
            throw new Error(`PDF library not available. Please install puppeteer or html-pdf: ${error}`);
        }
    }

    // Utility method to add page breaks strategically
    private optimizeForPrint(htmlContent: string): string {
        return htmlContent
            .replace(/<div class="section"/g, '<div class="section no-break"')
            .replace(/<div class="recommendation-card"/g, '<div class="recommendation-card no-break"')
            .replace(/<div class="library-card"/g, '<div class="library-card no-break"')
            .replace(/<div class="tutorial-card"/g, '<div class="tutorial-card no-break"')
            .replace(/<div id="strategic"/g, '<div id="strategic" class="page-break-before"');
    }
}