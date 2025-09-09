"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGenerator = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const MarkdownReportGenerator_1 = require("./MarkdownReportGenerator");
const HTMLReportGenerator_1 = require("./HTMLReportGenerator");
const PDFReportGenerator_1 = require("./PDFReportGenerator");
class ReportGenerator {
    constructor() {
        this.markdownGenerator = new MarkdownReportGenerator_1.MarkdownReportGenerator();
        this.htmlGenerator = new HTMLReportGenerator_1.HTMLReportGenerator();
        this.pdfGenerator = new PDFReportGenerator_1.PDFReportGenerator();
    }
    async generateReport(results, format, outputPath, options = {}) {
        const defaultOptions = {
            includeExecutiveSummary: true,
            includeDetailedAnalysis: true,
            includeCodeExamples: true,
            includeMetrics: true,
            includeRecommendations: true,
            ...options
        };
        let reportContent;
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
    async generateJSONReport(results) {
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
    async saveReport(content, filePath) {
        const directory = path_1.default.dirname(filePath);
        try {
            await promises_1.default.mkdir(directory, { recursive: true });
            await promises_1.default.writeFile(filePath, content, 'utf-8');
        }
        catch (error) {
            throw new Error(`Failed to save report: ${error}`);
        }
    }
    async generateExecutiveSummary(results) {
        return this.markdownGenerator.generateExecutiveSummary(results);
    }
    async generateTechnicalReport(results) {
        return this.markdownGenerator.generateTechnicalReport(results);
    }
    async generateBusinessReport(results) {
        if (!results.enhanced) {
            throw new Error('Enhanced analysis results required for business report');
        }
        return this.markdownGenerator.generateBusinessReport(results);
    }
    // Utility method to determine optimal output filename
    static generateOutputFilename(format, projectName) {
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
exports.ReportGenerator = ReportGenerator;
//# sourceMappingURL=ReportGenerator.js.map