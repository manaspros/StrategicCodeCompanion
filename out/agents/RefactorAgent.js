"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefactorAgent = void 0;
class RefactorAgent {
    constructor(llmProvider) {
        this.llmProvider = llmProvider;
    }
    async generateRefactoringSuggestions(analysis) {
        try {
            const systemPrompt = `You are a senior software engineer and refactoring expert. 
            Based on the codebase analysis provided, generate specific, actionable refactoring suggestions.
            
            Focus on:
            1. Code smells and anti-patterns
            2. Performance improvements
            3. Maintainability enhancements
            4. Security vulnerabilities
            5. Best practice violations
            
            For each suggestion, provide concrete before/after code examples.
            Prioritize suggestions based on impact and complexity.`;
            const userPrompt = `Based on this codebase analysis, generate refactoring suggestions:

Analysis:
- Summary: ${analysis.overall_summary}
- Technologies: ${analysis.key_technologies.join(', ')}
- Patterns: ${analysis.architectural_patterns.join(', ')}
- Areas for refactoring: ${analysis.potential_areas_for_refactoring.join(', ')}
- Complexity: ${analysis.complexity_score}/10
- Quality metrics: Maintainability: ${analysis.code_quality_metrics.maintainability}/10, Readability: ${analysis.code_quality_metrics.readability}/10

Please return your suggestions as a JSON object with this structure:
{
    "suggestions": [
        {
            "id": "unique-id",
            "title": "Short descriptive title",
            "description": "Detailed explanation of the issue and why it should be refactored",
            "priority": "high|medium|low",
            "category": "performance|maintainability|readability|security|best-practices",
            "beforeCode": "// Example of current problematic code",
            "afterCode": "// Example of improved code",
            "filePath": "optional/path/to/file.js",
            "estimatedEffort": "low|medium|high",
            "benefits": ["benefit1", "benefit2", "benefit3"]
        }
    ]
}

Provide 3-7 actionable suggestions with realistic code examples.`;
            const response = await this.llmProvider.generateResponse([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], {
                temperature: 0.4,
                maxTokens: 3000
            });
            // Parse JSON response
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in refactoring response');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            const suggestions = parsed.suggestions || [];
            // Generate summary
            const summary = this.generateSummary(suggestions);
            return {
                suggestions,
                summary
            };
        }
        catch (error) {
            console.error('Failed to generate refactoring suggestions:', error);
            return this.createFallbackSuggestions(analysis);
        }
    }
    generateSummary(suggestions) {
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
            categories: Array.from(categories)
        };
    }
    createFallbackSuggestions(analysis) {
        const suggestions = [
            {
                id: 'generic-naming',
                title: 'Improve Variable and Function Naming',
                description: 'Use more descriptive names for variables and functions to improve code readability.',
                priority: 'medium',
                category: 'readability',
                beforeCode: `// Poor naming
const d = new Date();
const u = users.filter(x => x.active);`,
                afterCode: `// Better naming
const currentDate = new Date();
const activeUsers = users.filter(user => user.active);`,
                estimatedEffort: 'low',
                benefits: ['Improved readability', 'Easier maintenance', 'Better self-documenting code']
            },
            {
                id: 'error-handling',
                title: 'Add Comprehensive Error Handling',
                description: 'Implement proper error handling to make the application more robust.',
                priority: 'high',
                category: 'best-practices',
                beforeCode: `// Missing error handling
const data = JSON.parse(response);
processData(data);`,
                afterCode: `// With error handling
try {
    const data = JSON.parse(response);
    processData(data);
} catch (error) {
    console.error('Failed to process data:', error);
    throw new Error('Data processing failed');
}`,
                estimatedEffort: 'medium',
                benefits: ['Better error handling', 'Improved debugging', 'More robust application']
            }
        ];
        // Add technology-specific suggestions
        if (analysis.key_technologies.includes('javascript') || analysis.key_technologies.includes('typescript')) {
            suggestions.push({
                id: 'async-await',
                title: 'Replace Callbacks with Async/Await',
                description: 'Convert callback-based code to async/await for better readability and error handling.',
                priority: 'medium',
                category: 'maintainability',
                beforeCode: `// Callback-based
getData((err, data) => {
    if (err) throw err;
    processData(data, (err, result) => {
        if (err) throw err;
        console.log(result);
    });
});`,
                afterCode: `// Async/await
try {
    const data = await getData();
    const result = await processData(data);
    console.log(result);
} catch (error) {
    console.error('Operation failed:', error);
}`,
                estimatedEffort: 'medium',
                benefits: ['Better readability', 'Easier error handling', 'Reduced callback hell']
            });
        }
        return {
            suggestions,
            summary: this.generateSummary(suggestions)
        };
    }
}
exports.RefactorAgent = RefactorAgent;
//# sourceMappingURL=RefactorAgent.js.map