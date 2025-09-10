"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAGContextBuilder = void 0;
class RAGContextBuilder {
    /**
     * Builds comprehensive RAG context for LLM analysis
     */
    static buildComprehensiveContext(analysis, codeChunks, refactoring, architecture) {
        return {
            codebaseOverview: this.buildCodebaseOverview(analysis, codeChunks),
            skillAnalysis: 'Analysis delegated to DynamicAnalysisEngine for LLM-driven insights',
            technicalGaps: this.buildBasicTechnicalContext(analysis, refactoring, architecture),
            businessOpportunities: 'Analysis delegated to DynamicAnalysisEngine for LLM-driven insights',
            implementationContext: this.buildBasicImplementationContext(analysis, codeChunks)
        };
    }
    /**
     * Builds codebase overview for library recommendations
     */
    static buildLibraryContext(analysis, codeChunks) {
        const context = [];
        // Basic project data only
        context.push(`Project Type: ${analysis.project_type}`);
        context.push(`Technologies: ${analysis.key_technologies.join(', ')}`);
        context.push(`Complexity Score: ${analysis.complexity_score}/10`);
        // File structure basics
        const fileTypes = new Set(codeChunks.map(chunk => chunk.filePath.split('.').pop()));
        context.push(`File Types: ${Array.from(fileTypes).join(', ')}`);
        context.push(`Total Files: ${codeChunks.length}`);
        // Quality metrics
        context.push(`Quality Metrics: Maintainability ${analysis.code_quality_metrics.maintainability}/10, Testability ${analysis.code_quality_metrics.testability}/10`);
        // Note: All pattern detection and feature gap analysis is now handled by DynamicAnalysisEngine
        context.push('Pattern Analysis: Performed by DynamicAnalysisEngine via LLM');
        return context.join('\n');
    }
    /**
     * Builds learning context for tutorial recommendations
     */
    static buildTutorialContext(analysis, codeChunks, refactoring, architecture) {
        const context = [];
        // Basic data only - no hardcoded skill assessment
        context.push(`Project Overview: ${analysis.overall_summary}`);
        context.push(`Technologies: ${analysis.key_technologies.join(', ')}`);
        context.push(`Complexity Level: ${analysis.complexity_score}/10`);
        context.push(`Files Analyzed: ${codeChunks.length}`);
        // External analysis results (if available)
        if (refactoring && refactoring.suggestions) {
            const refactoringAreas = refactoring.suggestions.slice(0, 3).map((s) => s.category || 'general');
            context.push(`Refactoring Focus Areas: ${refactoringAreas.join(', ')}`);
        }
        if (architecture && architecture.features) {
            const architectureAreas = architecture.features.slice(0, 3).map((f) => f.category || 'general');
            context.push(`Architecture Enhancement Areas: ${architectureAreas.join(', ')}`);
        }
        // Note: All skill analysis is now handled by DynamicAnalysisEngine
        context.push('Skill Gap Analysis: Performed by DynamicAnalysisEngine via LLM');
        return context.join('\n');
    }
    static buildCodebaseOverview(analysis, codeChunks) {
        const overview = [];
        overview.push(`Project: ${analysis.overall_summary}`);
        overview.push(`Type: ${analysis.project_type}`);
        overview.push(`Files analyzed: ${codeChunks.length}`);
        overview.push(`Technologies: ${analysis.key_technologies.join(', ')}`);
        if (analysis.architectural_patterns && analysis.architectural_patterns.length > 0) {
            overview.push(`Architecture: ${analysis.architectural_patterns.join(', ')}`);
        }
        return overview.join('\n');
    }
    static buildBasicTechnicalContext(analysis, refactoring, architecture) {
        const context = [];
        // Basic quality metrics only
        context.push(`Quality Metrics - Maintainability: ${analysis.code_quality_metrics.maintainability}/10`);
        context.push(`Quality Metrics - Testability: ${analysis.code_quality_metrics.testability}/10`);
        context.push(`Complexity Score: ${analysis.complexity_score}/10`);
        // External analysis summaries (if available)
        if (refactoring && refactoring.summary) {
            context.push(`Refactoring Analysis Available: ${JSON.stringify(refactoring.summary)}`);
        }
        if (architecture && architecture.summary) {
            context.push(`Architecture Analysis Available: ${JSON.stringify(architecture.summary)}`);
        }
        context.push('Technical Gap Analysis: Performed by DynamicAnalysisEngine via LLM');
        return context.join('\n');
    }
    static buildBasicImplementationContext(analysis, codeChunks) {
        const context = [];
        // Only basic file metrics - no hardcoded pattern detection
        const totalLines = codeChunks.reduce((sum, chunk) => sum + chunk.content.split('\n').length, 0);
        const avgLinesPerFile = Math.round(totalLines / Math.max(codeChunks.length, 1));
        context.push(`Code Volume: ${totalLines} total lines`);
        context.push(`Average File Size: ${avgLinesPerFile} lines`);
        context.push(`File Count: ${codeChunks.length}`);
        // File type distribution
        const fileTypes = new Map();
        codeChunks.forEach(chunk => {
            const ext = chunk.filePath.split('.').pop() || 'unknown';
            fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1);
        });
        const typeDistribution = Array.from(fileTypes.entries())
            .map(([ext, count]) => `${ext}: ${count}`)
            .join(', ');
        context.push(`File Types: ${typeDistribution}`);
        context.push('Implementation Pattern Analysis: Performed by DynamicAnalysisEngine via LLM');
        return context.join('\n');
    }
}
exports.RAGContextBuilder = RAGContextBuilder;
//# sourceMappingURL=RAGContextBuilder.js.map