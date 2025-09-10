import { AgentResults } from '../agents/main';
import { ReportOptions } from './ReportGenerator';

export class MarkdownReportGenerator {
    async generate(results: AgentResults, options: ReportOptions): Promise<string> {
        const sections: string[] = [];

        // Header
        sections.push(this.generateHeader(results));

        // Executive Summary
        if (options.includeExecutiveSummary) {
            sections.push(this.generateExecutiveSummary(results));
        }

        // Quality Metrics Dashboard
        if (options.includeMetrics) {
            sections.push(this.generateMetricsDashboard(results));
        }

        // Detailed Analysis
        if (options.includeDetailedAnalysis) {
            sections.push(this.generateDetailedAnalysis(results));
        }

        // Recommendations
        if (options.includeRecommendations) {
            sections.push(this.generateRefactoringSection(results));
            sections.push(this.generateArchitectureSection(results));
            sections.push(this.generateLibrariesSection(results));
            sections.push(this.generateTutorialsSection(results));
        }

        // Enhanced Strategic Insights
        if (results.enhanced) {
            sections.push(this.generateStrategicInsights(results));
        }

        // Footer
        sections.push(this.generateFooter());

        return sections.join('\n\n---\n\n');
    }

    private generateHeader(results: AgentResults): string {
        const date = new Date().toLocaleString();
        return `# 🤖 Strategic Code Companion - Analysis Report

**Generated:** ${date}  
**Project Type:** ${results.analysis.project_type}  
**Complexity Score:** ${results.analysis.complexity_score}/10  

## 📋 Table of Contents

- [Executive Summary](#executive-summary)
- [Quality Metrics Dashboard](#quality-metrics-dashboard)
- [Detailed Analysis](#detailed-analysis)
- [Refactoring Recommendations](#refactoring-recommendations)
- [Architecture Suggestions](#architecture-suggestions)
- [Library Recommendations](#library-recommendations)
- [Learning Resources](#learning-resources)
${results.enhanced ? '- [Strategic Insights](#strategic-insights)' : ''}`;
    }

    generateExecutiveSummary(results: AgentResults): string {
        const quality = results.analysis.code_quality_metrics;
        const avgQuality = Math.round((quality.maintainability + quality.readability + quality.testability) / 3);
        
        return `## 📊 Executive Summary

### Project Overview
${results.analysis.overall_summary}

### Quality Assessment
- **Overall Quality Score:** ${avgQuality}/10 ${this.getQualityEmoji(avgQuality)}
- **Complexity Level:** ${this.getComplexityLevel(results.analysis.complexity_score)}
- **Maintainability:** ${quality.maintainability}/10
- **Readability:** ${quality.readability}/10  
- **Testability:** ${quality.testability}/10

### Key Technologies
${results.analysis.key_technologies.map(tech => `- ${tech}`).join('\n')}

### Architecture Patterns
${results.analysis.architectural_patterns.map(pattern => `- ${pattern}`).join('\n')}

### Priority Areas for Improvement
${results.analysis.potential_areas_for_refactoring.slice(0, 3).map(area => `- ${area}`).join('\n')}`;
    }

    private generateMetricsDashboard(results: AgentResults): string {
        const metrics = results.analysis.code_quality_metrics;
        const complexity = results.analysis.complexity_score;
        
        return `## 📈 Quality Metrics Dashboard

| Metric | Score | Status | Priority |
|--------|-------|---------|----------|
| **Maintainability** | ${metrics.maintainability}/10 | ${this.getStatusIcon(metrics.maintainability)} | ${this.getPriorityLevel(10 - metrics.maintainability)} |
| **Readability** | ${metrics.readability}/10 | ${this.getStatusIcon(metrics.readability)} | ${this.getPriorityLevel(10 - metrics.readability)} |
| **Testability** | ${metrics.testability}/10 | ${this.getStatusIcon(metrics.testability)} | ${this.getPriorityLevel(10 - metrics.testability)} |
| **Complexity** | ${complexity}/10 | ${this.getStatusIcon(10 - complexity)} | ${this.getPriorityLevel(complexity)} |

### Quality Trend Analysis
${this.generateQualityTrendAnalysis(results)}`;
    }

    private generateDetailedAnalysis(results: AgentResults): string {
        return `## 🔍 Detailed Analysis

### Project Structure
- **Main Dependencies:** ${results.analysis.main_dependencies.join(', ')}
- **Architecture Patterns:** ${results.analysis.architectural_patterns.join(', ')}
- **Complexity Factors:** ${this.getComplexityFactors(results.analysis.complexity_score)}

### Code Health Assessment
${results.analysis.potential_areas_for_refactoring.map((area, index) => 
    `${index + 1}. **${area}**\n   - Impact: ${this.assessRefactoringImpact(area)}\n   - Effort: ${this.assessRefactoringEffort(area)}`
).join('\n\n')}`;
    }

    private generateRefactoringSection(results: AgentResults): string {
        if (!results.refactoring?.suggestions || results.refactoring.suggestions.length === 0) {
            return `## 🔧 Refactoring Recommendations\n\nNo specific refactoring suggestions generated.`;
        }

        const suggestions = results.refactoring.suggestions.map((suggestion: any, index: number) => {
            return `### ${index + 1}. ${suggestion.title}

**Priority:** ${suggestion.priority.toUpperCase()} ${this.getPriorityEmoji(suggestion.priority)}  
**Category:** ${suggestion.category}  
**Estimated Effort:** ${suggestion.estimatedEffort}

${suggestion.description}

#### Benefits
${suggestion.benefits.map((benefit: string) => `- ${benefit}`).join('\n')}

#### Implementation
\`\`\`${this.getCodeLanguage(suggestion.beforeCode)}
// Before
${suggestion.beforeCode}

// After
${suggestion.afterCode}
\`\`\``;
        }).join('\n\n');

        return `## 🔧 Refactoring Recommendations

${suggestions}`;
    }

    private generateArchitectureSection(results: AgentResults): string {
        if (!results.architecture?.features || results.architecture.features.length === 0) {
            return `## 🏗️ Architecture Suggestions\n\nNo specific architecture suggestions generated.`;
        }

        const features = results.architecture.features.map((feature: any, index: number) => {
            return `### ${index + 1}. ${feature.title}

**Priority:** ${feature.priority.toUpperCase()} ${this.getPriorityEmoji(feature.priority)}  
**Complexity:** ${feature.complexity}  
**Estimated Time:** ${feature.estimatedTimeWeeks} weeks  

${feature.description}

#### Technologies Required
${feature.implementationOverview.technologies.map((tech: string) => `- ${tech}`).join('\n')}

#### Benefits
${feature.benefits.map((benefit: string) => `- ${benefit}`).join('\n')}`;
        }).join('\n\n');

        return `## 🏗️ Architecture Suggestions

${features}`;
    }

    private generateLibrariesSection(results: AgentResults): string {
        if (!results.libraries?.recommendations || results.libraries.recommendations.length === 0) {
            return `## 📚 Library Recommendations\n\nNo specific library recommendations generated.`;
        }

        const libraries = results.libraries.recommendations.map((lib: any) => {
            return `### ${lib.name}

**Category:** ${lib.category} | **Language:** ${lib.language} | **Relevance:** ${Math.round(lib.relevanceScore * 100)}%

${lib.description}

**📊 Statistics:**
- ⭐ Stars: ${lib.stars.toLocaleString()}
- 🍴 Forks: ${lib.forks.toLocaleString()}  
- 📅 Last Updated: ${new Date(lib.lastUpdated).toLocaleDateString()}
- ⚡ Integration Effort: ${lib.integrationEffort}

**🎯 Primary Use Cases:**
${lib.useCases.slice(0, 3).map((useCase: string) => `- ${useCase}`).join('\n')}

**💡 Key Benefits:**
${lib.benefits.slice(0, 3).map((benefit: string) => `- ${benefit}`).join('\n')}

**🔗 Links:**
- [GitHub Repository](${lib.githubUrl})
${lib.npmUrl ? `- [NPM Package](${lib.npmUrl})` : ''}`;
        }).join('\n\n');

        return `## 📚 Library Recommendations

${libraries}`;
    }

    private generateTutorialsSection(results: AgentResults): string {
        if (!results.tutorials?.tutorials || results.tutorials.tutorials.length === 0) {
            return `## 🎓 Learning Resources\n\nNo specific tutorials found.`;
        }

        const tutorials = results.tutorials.tutorials.map((tutorial: any) => {
            const stars = '★'.repeat(Math.floor(tutorial.rating)) + '☆'.repeat(5 - Math.floor(tutorial.rating));
            return `### ${tutorial.title}

**👤 Author:** ${tutorial.author} | **📺 Platform:** ${tutorial.platform}  
**⏱️ Duration:** ${tutorial.duration} | **📊 Rating:** ${stars} (${tutorial.rating.toFixed(1)})  
**👥 Views:** ${tutorial.views.toLocaleString()} | **🎯 Difficulty:** ${tutorial.difficulty}

${tutorial.description}

**📚 Topics Covered:** ${tutorial.topics.join(', ')}

**🔗 [Watch Tutorial](${tutorial.url})**`;
        }).join('\n\n');

        return `## 🎓 Learning Resources

${tutorials}`;
    }

    private generateStrategicInsights(results: AgentResults): string {
        if (!results.enhanced) return '';

        let sections: string[] = [];

        // Unique Value Propositions
        if (results.enhanced.uniqueRecommendations && results.enhanced.uniqueRecommendations.length > 0) {
            const recommendations = results.enhanced.uniqueRecommendations.map((rec: any) => {
                return `### ${rec.title}

**Priority:** ${rec.priority.toUpperCase()} ${this.getPriorityEmoji(rec.priority)}  
**Business Impact:** ${rec.businessImpact.businessValue}/10  

${rec.description}

#### Business Rationale
${rec.justification.businessRationale}

**Market Gap Opportunity:** ${rec.justification.marketGap}

#### Implementation Plan
- **Effort Level:** ${rec.implementationPlan.effort}
- **Timeline:** ${rec.implementationPlan.timeframe}
- **Prerequisites:** ${rec.implementationPlan.prerequisites.join(', ')}

#### Success Metrics
- User Experience Impact: ${rec.businessImpact.userExperience}/10
- Market Differentiation: ${rec.businessImpact.marketDifferentiation}/10
- Business Value: ${rec.businessImpact.businessValue}/10`;
            }).join('\n\n');

            sections.push(`## 🎯 Strategic Insights

### Unique Value Propositions

${recommendations}`);
        }

        // Competitive Analysis
        if (results.enhanced.competitiveAnalysis) {
            const opportunities = results.enhanced.competitiveAnalysis.innovationOpportunities.map((opp: any) => {
                return `#### ${opp.opportunity}
- **Impact:** ${opp.potentialImpact.toUpperCase()}
- **Market Gap:** ${opp.marketGap}
- **Trend Analysis:** ${opp.trendAnalysis}

${opp.description}`;
            }).join('\n\n');

            sections.push(`### Innovation Opportunities

${opportunities}`);
        }

        // Business Strategy
        if (results.enhanced.businessStrategy) {
            const strategy = results.enhanced.businessStrategy;
            const growthOps = strategy.growthOpportunities.map((opp: any) => {
                return `- **${opp.opportunity}** (${opp.potential} potential): ${opp.strategy}`;
            }).join('\n');

            sections.push(`### Strategic Positioning

**Current Position:** ${strategy.marketPositioning.currentPosition}  
**Target Position:** ${strategy.marketPositioning.targetPosition}

**Key Differentiators:**
${strategy.marketPositioning.differentiators.map((diff: string) => `- ${diff}`).join('\n')}

**Growth Opportunities:**
${growthOps}`);
        }

        return sections.join('\n\n');
    }

    private generateFooter(): string {
        return `## 📞 Next Steps

1. **Immediate Actions:** Focus on high-priority refactoring items
2. **Short-term Goals:** Implement quick wins to improve code quality
3. **Long-term Vision:** Consider architectural improvements and strategic features
4. **Continuous Improvement:** Regular code reviews and quality monitoring

---

*Report generated by Strategic Code Companion v1.0.0*  
*🤖 Powered by AI-driven code analysis*`;
    }

    // Utility methods
    private getQualityEmoji(score: number): string {
        if (score >= 8) return '🟢';
        if (score >= 6) return '🟡';
        return '🔴';
    }

    private getComplexityLevel(score: number): string {
        if (score <= 3) return 'Low';
        if (score <= 6) return 'Medium';
        return 'High';
    }

    private getStatusIcon(score: number): string {
        if (score >= 8) return '✅ Excellent';
        if (score >= 6) return '⚠️ Good';
        if (score >= 4) return '🔶 Needs Improvement';
        return '❌ Critical';
    }

    private getPriorityLevel(score: number): string {
        if (score >= 8) return '🔴 High';
        if (score >= 5) return '🟡 Medium';
        return '🟢 Low';
    }

    private getPriorityEmoji(priority: string): string {
        switch (priority.toLowerCase()) {
            case 'high': return '🔴';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '⚪';
        }
    }

    private getCodeLanguage(code: string): string {
        if (code.includes('function') || code.includes('const')) return 'javascript';
        if (code.includes('def ') || code.includes('import ')) return 'python';
        if (code.includes('class ') || code.includes('public ')) return 'java';
        return 'text';
    }

    private generateQualityTrendAnalysis(results: AgentResults): string {
        const metrics = results.analysis.code_quality_metrics;
        const avgScore = (metrics.maintainability + metrics.readability + metrics.testability) / 3;
        
        if (avgScore >= 7) {
            return "📈 **Positive Trend**: Code quality metrics are in good shape. Focus on maintaining standards and minor optimizations.";
        } else if (avgScore >= 5) {
            return "📊 **Stable Trend**: Code quality is moderate. Targeted improvements will yield significant benefits.";
        } else {
            return "📉 **Needs Attention**: Code quality metrics indicate need for systematic improvement across multiple areas.";
        }
    }

    private getComplexityFactors(score: number): string {
        const factors = [];
        if (score >= 7) factors.push('High cyclomatic complexity');
        if (score >= 6) factors.push('Deep nesting levels');
        if (score >= 5) factors.push('Large function/class sizes');
        if (score >= 4) factors.push('Multiple responsibilities');
        
        return factors.length > 0 ? factors.join(', ') : 'Well-structured code';
    }

    private assessRefactoringImpact(area: string): string {
        // Simple heuristic based on area type
        if (area.toLowerCase().includes('performance')) return 'High';
        if (area.toLowerCase().includes('security')) return 'Critical';
        if (area.toLowerCase().includes('maintainability')) return 'Medium';
        return 'Medium';
    }

    private assessRefactoringEffort(area: string): string {
        if (area.toLowerCase().includes('architecture')) return 'High';
        if (area.toLowerCase().includes('refactor')) return 'Medium';
        return 'Low';
    }

    // Public methods for specific report types
    generateTechnicalReport(results: AgentResults): string {
        return this.generate(results, {
            includeExecutiveSummary: false,
            includeDetailedAnalysis: true,
            includeCodeExamples: true,
            includeMetrics: true,
            includeRecommendations: true
        });
    }

    generateBusinessReport(results: AgentResults): string {
        return this.generate(results, {
            includeExecutiveSummary: true,
            includeDetailedAnalysis: false,
            includeCodeExamples: false,
            includeMetrics: false,
            includeRecommendations: false
        });
    }
}