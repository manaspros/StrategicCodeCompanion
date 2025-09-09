import fs from 'fs/promises';
import path from 'path';
import { AgentResults } from '../agents/main';
import { MarkdownReportGenerator } from './MarkdownReportGenerator';
import { HTMLReportGenerator } from './HTMLReportGenerator';
import { PDFReportGenerator } from './PDFReportGenerator';

export type ReportFormat = 'json' | 'markdown' | 'html' | 'pdf';

export interface ReportOptions {
    includeExecutiveSummary?: boolean;
    includeDetailedAnalysis?: boolean;
    includeCodeExamples?: boolean;
    includeMetrics?: boolean;
    includeRecommendations?: boolean;
    templatePath?: string;
}

export class ReportGenerator {
    private markdownGenerator: MarkdownReportGenerator;
    private htmlGenerator: HTMLReportGenerator;
    private pdfGenerator: PDFReportGenerator;

    constructor() {
        this.markdownGenerator = new MarkdownReportGenerator();
        this.htmlGenerator = new HTMLReportGenerator();
        this.pdfGenerator = new PDFReportGenerator();
    }

    async generateReport(
        results: AgentResults,
        format: ReportFormat,
        outputPath?: string,
        options: ReportOptions = {}
    ): Promise<string> {
        const defaultOptions: ReportOptions = {
            includeExecutiveSummary: true,
            includeDetailedAnalysis: true,
            includeCodeExamples: true,
            includeMetrics: true,
            includeRecommendations: true,
            ...options
        };

        let reportContent: string;

        switch (format) {
            case 'json':
                reportContent = await this.generateJSONReport(results);
                break;
            case 'markdown':
                reportContent = await this.markdownGenerator.generate(results, defaultOptions);
                break;
            case 'html':
                reportContent = await this.htmlGenerator.generate(results, defaultOptions);
                break;
            case 'pdf':
                if (!outputPath) {
                    throw new Error('Output path is required for PDF generation');
                }
                await this.pdfGenerator.generate(results, outputPath, defaultOptions);
                return `PDF report generated: ${outputPath}`;
            default:
                throw new Error(`Unsupported report format: ${format}`);
        }

        if (outputPath) {
            await this.saveReport(reportContent, outputPath);
            return `Report saved: ${outputPath}`;
        }

        return reportContent;
    }

    private async generateJSONReport(results: AgentResults): Promise<string> {
        const report = {
            generatedAt: new Date().toISOString(),
            version: '1.0.0',
            executiveSummary: {
                projectType: results.analysis.project_type,
                complexityScore: results.analysis.complexity_score,
                overallSummary: results.analysis.overall_summary,
                keyTechnologies: results.analysis.key_technologies,
                qualityMetrics: results.analysis.code_quality_metrics
            },
            detailedAnalysis: {
                architecturalPatterns: results.analysis.architectural_patterns,
                dependencies: results.analysis.main_dependencies,
                refactoringAreas: results.analysis.potential_areas_for_refactoring
            },
            recommendations: {
                refactoring: results.refactoring,
                architecture: results.architecture,
                libraries: results.libraries,
                tutorials: results.tutorials,
                ...(results.enhanced && { enhanced: results.enhanced })
            },
            metadata: {
                analysisTimestamp: new Date().toISOString(),
                tool: 'Strategic Code Companion',
                version: '1.0.0'
            }
        };

        return JSON.stringify(report, null, 2);
    }

    private async saveReport(content: string, filePath: string): Promise<void> {
        const directory = path.dirname(filePath);
        
        try {
            await fs.mkdir(directory, { recursive: true });
            await fs.writeFile(filePath, content, 'utf-8');
        } catch (error) {
            throw new Error(`Failed to save report: ${error}`);
        }
    }

    async generateExecutiveSummary(results: AgentResults): Promise<string> {
        return this.markdownGenerator.generateExecutiveSummary(results);
    }

    async generateTechnicalReport(results: AgentResults): Promise<string> {
        return this.markdownGenerator.generateTechnicalReport(results);
    }

    async generateBusinessReport(results: AgentResults): Promise<string> {
        if (!results.enhanced) {
            throw new Error('Enhanced analysis results required for business report');
        }
        return this.markdownGenerator.generateBusinessReport(results);
    }

    // Utility method to determine optimal output filename
    static generateOutputFilename(format: ReportFormat, projectName?: string): string {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const name = projectName || 'codebase-analysis';
        
        switch (format) {
            case 'json':
                return `${name}-analysis-${timestamp}.json`;
            case 'markdown':
                return `${name}-report-${timestamp}.md`;
            case 'html':
                return `${name}-report-${timestamp}.html`;
            case 'pdf':
                return `${name}-report-${timestamp}.pdf`;
            default:
                return `${name}-report-${timestamp}.txt`;
        }
    }
}