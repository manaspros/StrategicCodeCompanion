import { CodebaseAnalysis, CodeChunk } from '../agents/main';
import { RefactoringResults } from '../agents/RefactorAgent';
import { ArchitectureResults } from '../agents/ArchitectAgent';

export interface RAGContext {
    codebaseOverview: string;
    skillAnalysis: string;
    technicalGaps: string;
    businessOpportunities: string;
    implementationContext: string;
}

export class RAGContextBuilder {
    
    /**
     * Builds comprehensive RAG context for LLM analysis
     */
    static buildComprehensiveContext(
        analysis: CodebaseAnalysis,
        codeChunks: CodeChunk[],
        refactoring?: RefactoringResults,
        architecture?: ArchitectureResults
    ): RAGContext {
        return {
            codebaseOverview: this.buildCodebaseOverview(analysis, codeChunks),
            skillAnalysis: this.buildSkillAnalysis(analysis, codeChunks),
            technicalGaps: this.buildTechnicalGaps(analysis, codeChunks, refactoring, architecture),
            businessOpportunities: this.buildBusinessOpportunities(analysis, codeChunks),
            implementationContext: this.buildImplementationContext(analysis, codeChunks)
        };
    }

    /**
     * Builds codebase overview for library recommendations
     */
    static buildLibraryContext(analysis: CodebaseAnalysis, codeChunks: CodeChunk[]): string {
        const context = [];
        
        // Project overview
        context.push(`Project Type: ${analysis.project_type}`);
        context.push(`Technologies: ${analysis.key_technologies.join(', ')}`);
        context.push(`Complexity Score: ${analysis.complexity_score}/10`);
        
        // File structure insights
        const fileTypes = new Set(codeChunks.map(chunk => chunk.filePath.split('.').pop()));
        context.push(`File Types: ${Array.from(fileTypes).join(', ')}`);
        
        // Code patterns
        const patterns = this.detectCodePatterns(codeChunks);
        if (patterns.length > 0) {
            context.push(`Detected Patterns: ${patterns.join(', ')}`);
        }
        
        // Missing functionality
        const missingFeatures = this.identifyMissingFeatures(codeChunks);
        if (missingFeatures.length > 0) {
            context.push(`Missing Features: ${missingFeatures.join(', ')}`);
        }
        
        // Quality metrics
        context.push(`Quality Metrics: Maintainability ${analysis.code_quality_metrics.maintainability}/10, Testability ${analysis.code_quality_metrics.testability}/10`);
        
        return context.join('\n');
    }

    /**
     * Builds learning context for tutorial recommendations
     */
    static buildTutorialContext(
        analysis: CodebaseAnalysis, 
        codeChunks: CodeChunk[], 
        refactoring?: RefactoringResults, 
        architecture?: ArchitectureResults
    ): string {
        const context = [];
        
        // Current skill level assessment
        const skillLevel = this.assessSkillLevel(analysis, codeChunks);
        context.push(`Current Skill Level: ${skillLevel}`);
        
        // Technology proficiency
        const techProficiency = this.assessTechnologyProficiency(analysis, codeChunks);
        context.push(`Technology Proficiency: ${techProficiency}`);
        
        // Learning opportunities from analysis
        if (refactoring) {
            const refactoringAreas = refactoring.suggestions.slice(0, 3).map((s: any) => s.category);
            context.push(`Refactoring Learning Areas: ${refactoringAreas.join(', ')}`);
        }
        
        if (architecture) {
            const architectureAreas = architecture.features.slice(0, 3).map((f: any) => f.category);
            context.push(`Architecture Learning Areas: ${architectureAreas.join(', ')}`);
        }
        
        // Missing best practices
        const missingPractices = this.identifyMissingBestPractices(codeChunks);
        if (missingPractices.length > 0) {
            context.push(`Missing Best Practices: ${missingPractices.join(', ')}`);
        }
        
        return context.join('\n');
    }

    private static buildCodebaseOverview(analysis: CodebaseAnalysis, codeChunks: CodeChunk[]): string {
        const overview = [];
        overview.push(`Project: ${analysis.overall_summary}`);
        overview.push(`Type: ${analysis.project_type}`);
        overview.push(`Files analyzed: ${codeChunks.length}`);
        overview.push(`Technologies: ${analysis.key_technologies.join(', ')}`);
        overview.push(`Architecture: ${analysis.architectural_patterns.join(', ')}`);
        return overview.join('\n');
    }

    private static buildSkillAnalysis(analysis: CodebaseAnalysis, codeChunks: CodeChunk[]): string {
        const skills = [];
        
        // Assess current skill indicators
        const hasAdvancedPatterns = codeChunks.some(c => 
            c.content.includes('class') || 
            c.content.includes('interface') || 
            c.content.includes('generic')
        );
        skills.push(`Advanced patterns: ${hasAdvancedPatterns ? 'Present' : 'Limited'}`);
        
        const hasModernJS = codeChunks.some(c => 
            c.content.includes('async/await') || 
            c.content.includes('=>') ||
            c.content.includes('const ')
        );
        skills.push(`Modern JavaScript: ${hasModernJS ? 'Yes' : 'Basic'}`);
        
        const hasTesting = codeChunks.some(c => 
            c.content.includes('test') || 
            c.content.includes('spec')
        );
        skills.push(`Testing practices: ${hasTesting ? 'Present' : 'Missing'}`);
        
        return skills.join('\n');
    }

    private static buildTechnicalGaps(
        analysis: CodebaseAnalysis, 
        codeChunks: CodeChunk[], 
        refactoring?: RefactoringResults, 
        architecture?: ArchitectureResults
    ): string {
        const gaps = [];
        
        if (analysis.code_quality_metrics.maintainability < 7) {
            gaps.push('Maintainability could be improved');
        }
        
        if (analysis.code_quality_metrics.testability < 7) {
            gaps.push('Testing coverage and practices need attention');
        }
        
        if (analysis.complexity_score > 7) {
            gaps.push('High complexity indicates need for refactoring');
        }
        
        return gaps.join('\n');
    }

    private static buildBusinessOpportunities(analysis: CodebaseAnalysis, codeChunks: CodeChunk[]): string {
        const opportunities = [];
        
        // Identify potential business value additions
        if (analysis.project_type === 'web-app') {
            opportunities.push('User experience enhancements for engagement');
            opportunities.push('Performance optimizations for conversion');
            opportunities.push('Accessibility improvements for market reach');
        }
        
        opportunities.push('Security improvements for trust and compliance');
        opportunities.push('Modern architecture for scalability and maintainability');
        
        return opportunities.join('\n');
    }

    private static buildImplementationContext(analysis: CodebaseAnalysis, codeChunks: CodeChunk[]): string {
        const context = [];
        
        // Current implementation patterns
        const hasStateManagement = codeChunks.some(c => 
            c.content.includes('useState') || 
            c.content.includes('redux') || 
            c.content.includes('store')
        );
        context.push(`State management: ${hasStateManagement ? 'Present' : 'Basic'}`);
        
        const hasAPI = codeChunks.some(c => 
            c.content.includes('fetch') || 
            c.content.includes('axios') || 
            c.content.includes('api')
        );
        context.push(`API integration: ${hasAPI ? 'Present' : 'Limited'}`);
        
        const hasRouting = codeChunks.some(c => 
            c.content.includes('route') || 
            c.content.includes('router')
        );
        context.push(`Routing: ${hasRouting ? 'Present' : 'Basic'}`);
        
        return context.join('\n');
    }

    private static detectCodePatterns(codeChunks: CodeChunk[]): string[] {
        const patterns = [];
        
        if (codeChunks.some(c => c.content.includes('useState') || c.content.includes('useEffect'))) {
            patterns.push('React hooks');
        }
        
        if (codeChunks.some(c => c.content.includes('interface') || c.content.includes('type'))) {
            patterns.push('TypeScript definitions');
        }
        
        if (codeChunks.some(c => c.content.includes('async') && c.content.includes('await'))) {
            patterns.push('Async/await patterns');
        }
        
        if (codeChunks.some(c => c.content.includes('class') && c.content.includes('extends'))) {
            patterns.push('OOP patterns');
        }
        
        return patterns;
    }

    private static identifyMissingFeatures(codeChunks: CodeChunk[]): string[] {
        const missing = [];
        
        if (!codeChunks.some(c => c.content.toLowerCase().includes('error') && c.content.toLowerCase().includes('boundary'))) {
            missing.push('Error handling');
        }
        
        if (!codeChunks.some(c => c.content.toLowerCase().includes('loading'))) {
            missing.push('Loading states');
        }
        
        if (!codeChunks.some(c => c.content.toLowerCase().includes('auth'))) {
            missing.push('Authentication');
        }
        
        if (!codeChunks.some(c => c.content.toLowerCase().includes('test'))) {
            missing.push('Testing');
        }
        
        return missing;
    }

    private static assessSkillLevel(analysis: CodebaseAnalysis, codeChunks: CodeChunk[]): string {
        let score = 0;
        
        // Advanced TypeScript usage
        if (codeChunks.some(c => c.content.includes('generic') || c.content.includes('<T>'))) score += 2;
        
        // Advanced React patterns
        if (codeChunks.some(c => c.content.includes('useMemo') || c.content.includes('useCallback'))) score += 2;
        
        // Testing practices
        if (codeChunks.some(c => c.content.includes('test') || c.content.includes('spec'))) score += 2;
        
        // Modern patterns
        if (codeChunks.some(c => c.content.includes('async') && c.content.includes('await'))) score += 1;
        
        // Architecture complexity
        if (analysis.complexity_score < 5) score += 1;
        
        if (score >= 6) return 'Advanced';
        if (score >= 3) return 'Intermediate';
        return 'Beginner';
    }

    private static assessTechnologyProficiency(analysis: CodebaseAnalysis, codeChunks: CodeChunk[]): string {
        const proficiency: string[] = [];
        
        analysis.key_technologies.forEach(tech => {
            const techLower = tech.toLowerCase();
            let level = 'Basic';
            
            if (techLower.includes('typescript')) {
                const hasAdvanced = codeChunks.some(c => c.content.includes('generic') || c.content.includes('<T>'));
                level = hasAdvanced ? 'Advanced' : 'Intermediate';
            } else if (techLower.includes('react')) {
                const hasAdvanced = codeChunks.some(c => c.content.includes('useMemo') || c.content.includes('useCallback'));
                level = hasAdvanced ? 'Advanced' : 'Intermediate';
            }
            
            proficiency.push(`${tech}: ${level}`);
        });
        
        return proficiency.join(', ');
    }

    private static identifyMissingBestPractices(codeChunks: CodeChunk[]): string[] {
        const missing = [];
        
        if (!codeChunks.some(c => c.content.includes('accessibility') || c.content.includes('aria'))) {
            missing.push('Accessibility');
        }
        
        if (!codeChunks.some(c => c.content.includes('security') || c.content.includes('sanitize'))) {
            missing.push('Security practices');
        }
        
        if (!codeChunks.some(c => c.content.includes('performance') || c.content.includes('optimize'))) {
            missing.push('Performance optimization');
        }
        
        if (!codeChunks.some(c => c.content.includes('validation') || c.content.includes('validate'))) {
            missing.push('Input validation');
        }
        
        return missing;
    }
}