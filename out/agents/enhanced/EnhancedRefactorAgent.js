"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedRefactorAgent = void 0;
const SemanticCodeAnalyzer_1 = require("./SemanticCodeAnalyzer");
class EnhancedRefactorAgent {
    constructor(llmProvider) {
        this.llmProvider = llmProvider;
        this.semanticAnalyzer = new SemanticCodeAnalyzer_1.SemanticCodeAnalyzer(llmProvider);
    }
    async generateRefactoringSuggestions(analysis, codeChunks) {
        console.log('🔄 Enhanced Refactor Agent: Starting deep analysis...');
        // Step 1: Perform semantic analysis
        const semanticContext = await this.semanticAnalyzer.analyzeSemanticContext(codeChunks);
        // Step 2: Generate context-aware refactoring suggestions
        const suggestions = await this.generateContextAwareSuggestions(analysis, codeChunks, semanticContext);
        // Step 3: Prioritize suggestions based on business impact
        const prioritizedSuggestions = this.prioritizeBySemantic(suggestions, semanticContext);
        console.log(`✅ Enhanced Refactor Agent: Generated ${prioritizedSuggestions.length} context-aware suggestions`);
        return {
            suggestions: prioritizedSuggestions,
            summary: this.generateEnhancedSummary(prioritizedSuggestions, semanticContext)
        };
    }
    async generateContextAwareSuggestions(analysis, codeChunks, semanticContext) {
        const suggestions = [];
        // Generate suggestions based on different semantic aspects
        const suggestionGenerators = [
            () => this.generateQualityHotspotSuggestions(semanticContext, codeChunks),
            () => this.generateArchitecturalPatternSuggestions(semanticContext, codeChunks),
            () => this.generateCrossCuttingConcernSuggestions(semanticContext, codeChunks),
            () => this.generateBusinessLogicSuggestions(semanticContext, codeChunks, analysis),
            () => this.generateDependencySuggestions(semanticContext, codeChunks)
        ];
        // Run all generators in parallel
        const generatedSuggestions = await Promise.all(suggestionGenerators.map(generator => generator()));
        // Flatten and combine all suggestions
        generatedSuggestions.forEach(suggestionGroup => {
            suggestions.push(...suggestionGroup);
        });
        return suggestions;
    }
    async generateQualityHotspotSuggestions(semanticContext, codeChunks) {
        const suggestions = [];
        for (const hotspot of semanticContext.qualityHotspots.slice(0, 3)) {
            const codeChunk = codeChunks.find(chunk => chunk.filePath === hotspot.filePath);
            if (!codeChunk)
                continue;
            const systemPrompt = `You are a senior software engineer specializing in code quality improvements. 
            
Given a quality hotspot identified in the code, create a specific refactoring suggestion with:
1. Exact code examples from the provided file
2. Clear before/after transformation
3. Concrete benefits and implementation steps
4. Realistic effort estimation`;
            const userPrompt = `Create a refactoring suggestion for this quality hotspot:

FILE: ${hotspot.filePath}
ISSUES: ${hotspot.issues.map(issue => `${issue.type}: ${issue.description}`).join(', ')}
RISK SCORE: ${hotspot.riskScore}/10
BUSINESS IMPACT: ${hotspot.businessImpact}

CODE CONTEXT:
\`\`\`${codeChunk.language}
${codeChunk.content.substring(0, 1000)}${codeChunk.content.length > 1000 ? '...' : ''}
\`\`\`

Return a specific refactoring suggestion as JSON:
{
  "suggestion": {
    "id": "hotspot-fix-unique-id",
    "title": "Fix [specific issue] in ${hotspot.filePath}",
    "description": "Detailed explanation of the problem and solution",
    "priority": "high|medium|low",
    "category": "performance|maintainability|readability|security|best-practices",
    "beforeCode": "// ACTUAL problematic code from the file",
    "afterCode": "// IMPROVED version of the same code",
    "filePath": "${hotspot.filePath}",
    "estimatedEffort": "low|medium|high", 
    "benefits": ["specific benefit 1", "specific benefit 2"]
  }
}`;
            try {
                const response = await this.llmProvider.generateResponse([
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ], { temperature: 0.3, maxTokens: 1500 });
                const result = this.extractJSON(response.content);
                if (result.suggestion) {
                    suggestions.push(result.suggestion);
                }
            }
            catch (error) {
                console.warn(`Failed to generate suggestion for hotspot ${hotspot.filePath}:`, error);
            }
        }
        return suggestions;
    }
    async generateArchitecturalPatternSuggestions(semanticContext, codeChunks) {
        const suggestions = [];
        // Focus on patterns with violations
        const violatedPatterns = semanticContext.architecturalPatterns.filter(pattern => pattern.violations.length > 0);
        for (const pattern of violatedPatterns.slice(0, 2)) {
            const systemPrompt = `You are an expert software architect. Given an architectural pattern with identified violations, create specific refactoring suggestions to properly implement the pattern.

Focus on:
1. Concrete code examples showing the violation
2. Step-by-step refactoring to fix the violation
3. Maintaining pattern integrity across the codebase`;
            const userPrompt = `Create refactoring suggestions for this architectural pattern violation:

PATTERN: ${pattern.pattern}
ADHERENCE SCORE: ${pattern.adherence}/1.0
VIOLATIONS: ${pattern.violations.map(v => v.violation).join(', ')}
CURRENT IMPLEMENTATION: ${pattern.implementation.join(', ')}

RECOMMENDATIONS: ${pattern.recommendations.join(', ')}

Based on the pattern violations, create 1-2 specific refactoring suggestions as JSON:
{
  "suggestions": [
    {
      "id": "pattern-fix-unique-id",
      "title": "Fix ${pattern.pattern} pattern violation",
      "description": "Specific description of how to fix the violation",
      "priority": "medium",
      "category": "best-practices",
      "beforeCode": "// Current code showing the violation",
      "afterCode": "// Corrected code following the pattern properly", 
      "filePath": "relevant/file/path.js",
      "estimatedEffort": "medium",
      "benefits": ["Better separation of concerns", "Improved maintainability"]
    }
  ]
}`;
            try {
                const response = await this.llmProvider.generateResponse([
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ], { temperature: 0.3, maxTokens: 1500 });
                const result = this.extractJSON(response.content);
                if (result.suggestions) {
                    suggestions.push(...result.suggestions);
                }
            }
            catch (error) {
                console.warn(`Failed to generate architectural suggestions for ${pattern.pattern}:`, error);
            }
        }
        return suggestions;
    }
    async generateCrossCuttingConcernSuggestions(semanticContext, codeChunks) {
        const suggestions = [];
        // Focus on inconsistent implementations
        const inconsistentConcerns = semanticContext.crossCuttingConcerns.filter(concern => concern.implementation === 'inconsistent' || concern.implementation === 'missing');
        for (const concern of inconsistentConcerns.slice(0, 2)) {
            const systemPrompt = `You are a software engineer expert in cross-cutting concerns. Given an inconsistent or missing cross-cutting concern implementation, create specific refactoring suggestions to standardize and improve it.

Focus on:
1. Identifying the inconsistency with code examples
2. Proposing a consistent approach
3. Showing how to refactor existing code to the new standard`;
            const userPrompt = `Create refactoring suggestions for this cross-cutting concern:

CONCERN: ${concern.concern}
IMPLEMENTATION STATUS: ${concern.implementation}
LOCATIONS: ${concern.locations.join(', ')}
RECOMMENDATIONS: ${concern.recommendations.join(', ')}

Create 1-2 specific refactoring suggestions to standardize this concern as JSON:
{
  "suggestions": [
    {
      "id": "concern-${concern.concern}-fix",
      "title": "Standardize ${concern.concern} implementation",
      "description": "Specific approach to make ${concern.concern} consistent",
      "priority": "medium", 
      "category": "best-practices",
      "beforeCode": "// Current inconsistent implementation",
      "afterCode": "// Standardized implementation",
      "filePath": "relevant/affected/file.js",
      "estimatedEffort": "medium",
      "benefits": ["Consistent ${concern.concern}", "Better maintainability", "Reduced bugs"]
    }
  ]
}`;
            try {
                const response = await this.llmProvider.generateResponse([
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ], { temperature: 0.3, maxTokens: 1500 });
                const result = this.extractJSON(response.content);
                if (result.suggestions) {
                    suggestions.push(...result.suggestions);
                }
            }
            catch (error) {
                console.warn(`Failed to generate suggestions for ${concern.concern}:`, error);
            }
        }
        return suggestions;
    }
    async generateBusinessLogicSuggestions(semanticContext, codeChunks, analysis) {
        const suggestions = [];
        // Focus on critical business areas with high complexity
        const criticalAreas = semanticContext.businessLogicAreas.filter(area => area.businessCriticality === 'critical' && area.complexity > 7);
        for (const area of criticalAreas.slice(0, 2)) {
            const systemPrompt = `You are a business logic optimization expert. Given a critical business domain with high complexity, create refactoring suggestions to simplify and improve the business logic.

Focus on:
1. Breaking down complex business rules
2. Improving domain modeling
3. Separating business logic from technical concerns`;
            const userPrompt = `Create refactoring suggestions for this critical business domain:

DOMAIN: ${area.domain}
COMPLEXITY: ${area.complexity}/10
BUSINESS CRITICALITY: ${area.businessCriticality}
CHANGE FREQUENCY: ${area.changeFrequency}
FILES: ${area.files.join(', ')}

PROJECT CONTEXT: ${analysis.overall_summary}
TECHNOLOGIES: ${analysis.key_technologies.join(', ')}

Create 1-2 refactoring suggestions to improve this business domain as JSON:
{
  "suggestions": [
    {
      "id": "business-${area.domain.toLowerCase().replace(/\s+/g, '-')}-refactor",
      "title": "Simplify ${area.domain} business logic",
      "description": "Specific approach to reduce complexity in ${area.domain}",
      "priority": "high",
      "category": "maintainability", 
      "beforeCode": "// Complex business logic example",
      "afterCode": "// Simplified, more maintainable approach",
      "filePath": "${area.files[0]}",
      "estimatedEffort": "high",
      "benefits": ["Reduced complexity", "Easier testing", "Better maintainability"]
    }
  ]
}`;
            try {
                const response = await this.llmProvider.generateResponse([
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ], { temperature: 0.3, maxTokens: 1500 });
                const result = this.extractJSON(response.content);
                if (result.suggestions) {
                    suggestions.push(...result.suggestions);
                }
            }
            catch (error) {
                console.warn(`Failed to generate business logic suggestions for ${area.domain}:`, error);
            }
        }
        return suggestions;
    }
    async generateDependencySuggestions(semanticContext, codeChunks) {
        const suggestions = [];
        // Focus on circular dependencies
        if (semanticContext.dependencies.circularDependencies.length > 0) {
            const circularDep = semanticContext.dependencies.circularDependencies[0];
            const systemPrompt = `You are a software architect expert in dependency management. Given a circular dependency, create a specific refactoring suggestion to break the cycle.

Focus on:
1. Identifying the root cause of the circular dependency
2. Proposing architectural changes to break the cycle
3. Concrete code examples of the refactoring`;
            const userPrompt = `Create a refactoring suggestion to fix this circular dependency:

CIRCULAR DEPENDENCY: ${circularDep.join(' → ')}

Create a specific suggestion to break this cycle as JSON:
{
  "suggestion": {
    "id": "circular-dep-fix",
    "title": "Break circular dependency between modules",
    "description": "Specific approach to eliminate the circular reference",
    "priority": "high",
    "category": "best-practices",
    "beforeCode": "// Current code causing circular dependency",
    "afterCode": "// Refactored code with dependency inversion or extraction",
    "filePath": "${circularDep[0]}",
    "estimatedEffort": "high", 
    "benefits": ["Eliminated circular dependency", "Better module separation", "Improved testability"]
  }
}`;
            try {
                const response = await this.llmProvider.generateResponse([
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ], { temperature: 0.3, maxTokens: 1500 });
                const result = this.extractJSON(response.content);
                if (result.suggestion) {
                    suggestions.push(result.suggestion);
                }
            }
            catch (error) {
                console.warn('Failed to generate circular dependency suggestion:', error);
            }
        }
        return suggestions;
    }
    prioritizeBySemantic(suggestions, semanticContext) {
        // Enhance priority based on semantic context
        const prioritized = suggestions.map(suggestion => {
            let priorityScore = this.getPriorityScore(suggestion.priority);
            // Boost priority for critical business areas
            const affectedBusinessArea = semanticContext.businessLogicAreas.find(area => area.files.some(file => suggestion.filePath?.includes(file)));
            if (affectedBusinessArea?.businessCriticality === 'critical') {
                priorityScore += 2;
            }
            // Boost priority for high-risk quality hotspots
            const affectedHotspot = semanticContext.qualityHotspots.find(hotspot => hotspot.filePath === suggestion.filePath);
            if (affectedHotspot && (affectedHotspot.riskScore || 0) > 8) {
                priorityScore += 1;
            }
            return {
                ...suggestion,
                priorityScore,
                priority: this.getUpdatedPriority(priorityScore)
            };
        });
        // Sort by enhanced priority score
        return prioritized.sort((a, b) => b.priorityScore - a.priorityScore);
    }
    getPriorityScore(priority) {
        switch (priority) {
            case 'high': return 3;
            case 'medium': return 2;
            case 'low': return 1;
            default: return 1;
        }
    }
    getUpdatedPriority(score) {
        if (score >= 4)
            return 'high';
        if (score >= 2)
            return 'medium';
        return 'low';
    }
    generateEnhancedSummary(suggestions, semanticContext) {
        const priorities = { high: 0, medium: 0, low: 0 };
        const categories = new Set();
        suggestions.forEach(suggestion => {
            priorities[suggestion.priority]++;
            categories.add(suggestion.category);
        });
        return {
            totalSuggestions: suggestions.length,
            highPriority: priorities.high,
            mediumPriority: priorities.medium,
            lowPriority: priorities.low,
            categories: Array.from(categories),
            semanticInsights: {
                qualityHotspotsAddressed: suggestions.filter(s => s.id.includes('hotspot')).length,
                architecturalIssuesAddressed: suggestions.filter(s => s.id.includes('pattern')).length,
                businessLogicImprovements: suggestions.filter(s => s.id.includes('business')).length,
                crossCuttingConcernsFixes: suggestions.filter(s => s.id.includes('concern')).length
            }
        };
    }
    extractJSON(content) {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return {};
        }
        catch {
            return {};
        }
    }
}
exports.EnhancedRefactorAgent = EnhancedRefactorAgent;
//# sourceMappingURL=EnhancedRefactorAgent.js.map