"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefactorAgent = void 0;
class RefactorAgent {
    constructor(llmProvider) {
        this.llmProvider = llmProvider;
    }
    async generateRefactoringSuggestions(analysis, codeChunks) {
        try {
            // Analyze actual code patterns
            const codePatterns = this.analyzeCodePatterns(codeChunks, analysis);
            const systemPrompt = `You are a senior software engineer and refactoring expert. 
            Analyze the actual code samples provided and generate specific, actionable refactoring suggestions.
            
            Focus on REAL patterns found in the code:
            1. Actual code smells and anti-patterns you can see
            2. Specific performance issues in the provided code
            3. Concrete maintainability problems
            4. Security vulnerabilities in the actual code
            5. Technology-specific best practice violations
            
            IMPORTANT: Only suggest refactoring for patterns you can actually see in the provided code samples.
            Don't give generic advice - be specific to this codebase.`;
            const userPrompt = `Based on this ACTUAL codebase analysis and code samples, generate specific refactoring suggestions:

PROJECT CONTEXT:
- Summary: ${analysis.overall_summary}
- Technologies: ${analysis.key_technologies.join(', ')}
- Project Type: ${analysis.project_type}
- Complexity: ${analysis.complexity_score}/10

ACTUAL CODE PATTERNS FOUND:
${codePatterns}

SPECIFIC AREAS IDENTIFIED FOR IMPROVEMENT:
${analysis.potential_areas_for_refactoring.join('\n- ')}

Please analyze the ACTUAL code samples above and return specific suggestions as JSON:
{
    "suggestions": [
        {
            "id": "unique-id",
            "title": "Specific refactoring for this codebase",
            "description": "Detailed explanation based on actual code patterns found",
            "priority": "high|medium|low",
            "category": "performance|maintainability|readability|security|best-practices",
            "beforeCode": "// ACTUAL code from the codebase that needs refactoring",
            "afterCode": "// Improved version of the ACTUAL code",
            "filePath": "actual/file/path.js",
            "estimatedEffort": "low|medium|high",
            "benefits": ["specific benefit1", "specific benefit2"]
        }
    ]
}

REQUIREMENTS:
- Only suggest refactoring for patterns actually found in the code
- Use REAL code examples from the provided samples
- Be specific to the ${analysis.key_technologies.join('/')} tech stack
- Focus on the most impactful improvements for a ${analysis.project_type}
- Provide 3-5 highly relevant suggestions`;
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
    analyzeCodePatterns(codeChunks, analysis) {
        const patterns = [];
        // Analyze key code samples
        const importantChunks = codeChunks
            .filter(chunk => chunk.type === 'function' || chunk.type === 'class' || chunk.type === 'interface')
            .slice(0, 8); // Limit to most important chunks
        patterns.push(`CODE SAMPLES FROM ${analysis.project_type.toUpperCase()}:`);
        patterns.push('');
        importantChunks.forEach((chunk, index) => {
            patterns.push(`${index + 1}. FILE: ${chunk.filePath}`);
            patterns.push(`   TYPE: ${chunk.type.toUpperCase()}`);
            if (chunk.metadata.name) {
                patterns.push(`   NAME: ${chunk.metadata.name}`);
            }
            patterns.push(`   LANGUAGE: ${chunk.language}`);
            patterns.push(`   CODE:`);
            patterns.push('   ```' + chunk.language);
            patterns.push(chunk.content.substring(0, 500) + (chunk.content.length > 500 ? '...' : ''));
            patterns.push('   ```');
            patterns.push('');
        });
        // Add pattern analysis
        patterns.push('DETECTED PATTERNS:');
        if (analysis.key_technologies.includes('React')) {
            const reactPatterns = this.analyzeReactPatterns(codeChunks);
            patterns.push(...reactPatterns);
        }
        if (analysis.key_technologies.includes('JavaScript') || analysis.key_technologies.includes('TypeScript')) {
            const jsPatterns = this.analyzeJavaScriptPatterns(codeChunks);
            patterns.push(...jsPatterns);
        }
        // Add file structure analysis
        const fileTypes = new Map();
        const functionCount = codeChunks.filter(c => c.type === 'function').length;
        const classCount = codeChunks.filter(c => c.type === 'class').length;
        patterns.push(`- Total Functions: ${functionCount}`);
        patterns.push(`- Total Classes: ${classCount}`);
        patterns.push(`- Complexity Score: ${analysis.complexity_score}/10`);
        return patterns.join('\n');
    }
    analyzeReactPatterns(codeChunks) {
        const patterns = [];
        // Look for React-specific patterns
        const reactChunks = codeChunks.filter(chunk => chunk.content.includes('React') ||
            chunk.content.includes('useEffect') ||
            chunk.content.includes('useState') ||
            chunk.content.includes('jsx') ||
            chunk.content.includes('tsx'));
        if (reactChunks.length > 0) {
            patterns.push('- React component patterns detected');
            // Check for hooks usage
            const hooksUsage = reactChunks.some(chunk => chunk.content.includes('useEffect') || chunk.content.includes('useState'));
            if (hooksUsage) {
                patterns.push('- React Hooks detected');
            }
            // Check for class components
            const classComponents = reactChunks.some(chunk => chunk.content.includes('extends React.Component') ||
                chunk.content.includes('extends Component'));
            if (classComponents) {
                patterns.push('- Class components detected (consider functional components)');
            }
            // Check for prop drilling patterns
            const propPatterns = reactChunks.filter(chunk => chunk.content.includes('props.') && chunk.content.split('props.').length > 3);
            if (propPatterns.length > 0) {
                patterns.push('- Potential prop drilling detected');
            }
        }
        return patterns;
    }
    analyzeJavaScriptPatterns(codeChunks) {
        const patterns = [];
        // Check for common JavaScript patterns
        const jsChunks = codeChunks.filter(chunk => chunk.language === 'javascript' || chunk.language === 'typescript');
        if (jsChunks.length > 0) {
            // Check for async/await vs callbacks
            const hasCallbacks = jsChunks.some(chunk => chunk.content.includes('callback') || chunk.content.includes('.then('));
            const hasAsyncAwait = jsChunks.some(chunk => chunk.content.includes('async') || chunk.content.includes('await'));
            if (hasCallbacks && !hasAsyncAwait) {
                patterns.push('- Callback-based async patterns (consider async/await)');
            }
            // Check for error handling
            const hasErrorHandling = jsChunks.some(chunk => chunk.content.includes('try') || chunk.content.includes('catch'));
            if (!hasErrorHandling) {
                patterns.push('- Limited error handling detected');
            }
            // Check for performance patterns
            const hasPerformanceIssues = jsChunks.some(chunk => chunk.content.includes('document.querySelector') ||
                chunk.content.includes('for (var ') ||
                chunk.content.includes('var '));
            if (hasPerformanceIssues) {
                patterns.push('- Potential performance optimization opportunities');
            }
        }
        return patterns;
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