import * as vscode from 'vscode';
import { LLMProvider } from '../llm/llmProvider';
import { CodebaseAnalysis, CodeChunk } from '../agents/main';
import { FeatureSuggestion } from '../agents/ArchitectAgent';
import { RefactoringSuggestion } from '../agents/RefactorAgent';
import { RAGContextBuilder } from '../utils/RAGContextBuilder';

export interface ImplementationPlan {
    featureId: string;
    title: string;
    description: string;
    files: FileImplementation[];
    dependencies: string[];
    testingStrategy: string[];
    implementationSteps: string[];
    estimatedTime: string;
}

export interface FileImplementation {
    filePath: string;
    action: 'create' | 'modify';
    language: string;
    codeChanges: CodeChange[];
    explanation: string;
}

export interface CodeChange {
    type: 'insert' | 'replace' | 'delete';
    lineNumber?: number;
    oldCode?: string;
    newCode: string;
    explanation: string;
}

export class RAGImplementationService {
    private llmProvider: LLMProvider;
    private currentAnalysis?: CodebaseAnalysis;
    private currentCodeChunks?: CodeChunk[];

    constructor(llmProvider: LLMProvider) {
        this.llmProvider = llmProvider;
    }

    setCodebaseContext(analysis: CodebaseAnalysis, codeChunks: CodeChunk[]) {
        this.currentAnalysis = analysis;
        this.currentCodeChunks = codeChunks;
    }

    /**
     * Generate personalized implementation plan using RAG context
     */
    async generateFeatureImplementation(feature: FeatureSuggestion): Promise<ImplementationPlan> {
        if (!this.currentAnalysis || !this.currentCodeChunks) {
            throw new Error('Codebase context not set. Run analysis first.');
        }

        // Build comprehensive RAG context
        const ragContext = RAGContextBuilder.buildComprehensiveContext(
            this.currentAnalysis,
            this.currentCodeChunks
        );

        // Find relevant code files for this feature
        const relevantFiles = this.findRelevantFilesForFeature(feature, this.currentCodeChunks);
        
        // Generate contextual implementation prompt
        const implementationPrompt = this.buildImplementationPrompt(
            feature, 
            this.currentAnalysis, 
            ragContext,
            relevantFiles
        );

        try {
            const response = await this.llmProvider.generateResponse([
                { 
                    role: 'system', 
                    content: 'You are an expert software architect and developer. Generate detailed, implementable code changes based on the existing codebase context. Return only valid JSON.'
                },
                { role: 'user', content: implementationPrompt }
            ], { 
                temperature: 0.3, 
                maxTokens: 3000 
            });

            return this.parseImplementationResponse(response.content || '', feature);
        } catch (error) {
            console.error('Failed to generate feature implementation:', error);
            return this.generateFallbackImplementation(feature);
        }
    }

    /**
     * Generate personalized refactoring fix using RAG context
     */
    async generateRefactoringFix(suggestion: RefactoringSuggestion): Promise<ImplementationPlan> {
        if (!this.currentAnalysis || !this.currentCodeChunks) {
            throw new Error('Codebase context not set. Run analysis first.');
        }

        // Build RAG context focused on refactoring
        const ragContext = RAGContextBuilder.buildComprehensiveContext(
            this.currentAnalysis,
            this.currentCodeChunks
        );

        // Find the specific files that need refactoring
        const targetFiles = this.findFilesForRefactoring(suggestion, this.currentCodeChunks);
        
        const refactoringPrompt = this.buildRefactoringPrompt(
            suggestion,
            this.currentAnalysis,
            ragContext,
            targetFiles
        );

        try {
            const response = await this.llmProvider.generateResponse([
                { 
                    role: 'system', 
                    content: 'You are an expert code refactoring specialist. Generate precise, safe refactoring changes based on existing code. Return only valid JSON.'
                },
                { role: 'user', content: refactoringPrompt }
            ], { 
                temperature: 0.2, 
                maxTokens: 2500 
            });

            const feature = this.convertRefactoringToFeature(suggestion);
            return this.parseImplementationResponse(response.content || '', feature);
        } catch (error) {
            console.error('Failed to generate refactoring fix:', error);
            return this.generateFallbackRefactoring(suggestion);
        }
    }

    private buildImplementationPrompt(
        feature: FeatureSuggestion, 
        analysis: CodebaseAnalysis, 
        ragContext: any,
        relevantFiles: CodeChunk[]
    ): string {
        return `You are implementing a new feature in an existing codebase. Use the provided context to generate precise, implementable code changes.

FEATURE TO IMPLEMENT:
Title: ${feature.title}
Description: ${feature.description}
Category: ${feature.category}
Priority: ${feature.priority}
Complexity: ${feature.complexity}
Estimated Time: ${feature.estimatedTimeWeeks} weeks

IMPLEMENTATION REQUIREMENTS:
Steps: ${feature.implementationOverview.steps.join(', ')}
Technologies: ${feature.implementationOverview.technologies.join(', ')}
Considerations: ${feature.implementationOverview.considerations.join(', ')}

EXISTING CODEBASE CONTEXT:
${ragContext.codebaseOverview}

TECHNICAL CONTEXT:
${ragContext.technicalGaps}

IMPLEMENTATION CONTEXT:
${ragContext.implementationContext}

RELEVANT EXISTING CODE:
${relevantFiles.slice(0, 5).map(file => 
    `File: ${file.filePath}\nContent: ${file.content.substring(0, 500)}...`
).join('\\n\\n')}

PROJECT DETAILS:
- Type: ${analysis.project_type}
- Technologies: ${analysis.key_technologies.join(', ')}
- Architecture: ${analysis.architectural_patterns?.join(', ') || 'Standard'}
- Complexity: ${analysis.complexity_score}/10

TASK: Generate a detailed implementation plan that:
1. Builds seamlessly on the existing codebase patterns
2. Uses the same coding style and conventions shown in the existing code
3. Follows the project's architectural patterns
4. Includes all necessary files (new and modified)
5. Provides step-by-step implementation guidance
6. Includes testing strategies appropriate for this codebase

Return ONLY a JSON object in this exact format:
{
    "featureId": "${feature.id}",
    "title": "${feature.title}",
    "description": "Detailed description of what will be implemented",
    "files": [
        {
            "filePath": "relative/path/to/file.ext",
            "action": "create|modify",
            "language": "javascript|typescript|etc",
            "codeChanges": [
                {
                    "type": "insert|replace|delete",
                    "lineNumber": 42,
                    "oldCode": "existing code to replace",
                    "newCode": "new code to add",
                    "explanation": "why this change is needed"
                }
            ],
            "explanation": "what this file does in the feature"
        }
    ],
    "dependencies": ["package-name@version"],
    "testingStrategy": ["test approach 1", "test approach 2"],
    "implementationSteps": ["step 1", "step 2", "step 3"],
    "estimatedTime": "2-3 hours"
}

Focus on practical, implementable changes that follow the existing codebase patterns exactly.`;
    }

    private buildRefactoringPrompt(
        suggestion: RefactoringSuggestion,
        analysis: CodebaseAnalysis,
        ragContext: any,
        targetFiles: CodeChunk[]
    ): string {
        return `You are refactoring existing code to improve quality and maintainability. Use the provided context to generate safe, precise refactoring changes.

REFACTORING TO IMPLEMENT:
Title: ${suggestion.title}
Description: ${suggestion.description}
Category: ${suggestion.category}
Priority: ${suggestion.priority}
Estimated Effort: ${suggestion.estimatedEffort}

BEFORE CODE:
${suggestion.beforeCode}

AFTER CODE (Target):
${suggestion.afterCode}

EXISTING CODEBASE CONTEXT:
${ragContext.codebaseOverview}

TARGET FILES TO REFACTOR:
${targetFiles.map(file => 
    `File: ${file.filePath}\nContent: ${file.content.substring(0, 800)}...`
).join('\\n\\n')}

PROJECT DETAILS:
- Type: ${analysis.project_type}
- Technologies: ${analysis.key_technologies.join(', ')}
- Code Quality: Maintainability ${analysis.code_quality_metrics.maintainability}/10, Testability ${analysis.code_quality_metrics.testability}/10

TASK: Generate a detailed refactoring plan that:
1. Safely transforms the existing code
2. Maintains all existing functionality
3. Follows established patterns in the codebase
4. Includes proper error handling
5. Preserves or improves test coverage

Return the same JSON format as feature implementation, focused on code improvements rather than new features.`;
    }

    private findRelevantFilesForFeature(feature: FeatureSuggestion, codeChunks: CodeChunk[]): CodeChunk[] {
        // Find files that might be relevant to this feature based on:
        // 1. Technologies mentioned in the feature
        // 2. Feature category
        // 3. Implementation steps
        
        const searchTerms = [
            ...feature.implementationOverview.technologies.map(tech => tech.toLowerCase()),
            feature.category.toLowerCase(),
            ...feature.implementationOverview.steps.map(step => 
                step.toLowerCase().split(' ').filter(word => word.length > 3)
            ).flat()
        ];

        return codeChunks.filter(chunk => {
            const content = chunk.content.toLowerCase();
            const filePath = chunk.filePath.toLowerCase();
            
            return searchTerms.some(term => 
                content.includes(term) || filePath.includes(term)
            );
        }).slice(0, 10); // Limit to most relevant files
    }

    private findFilesForRefactoring(suggestion: RefactoringSuggestion, codeChunks: CodeChunk[]): CodeChunk[] {
        // Look for files that contain similar patterns to what needs refactoring
        const beforeCodeFragments = suggestion.beforeCode
            .split('\\n')
            .filter(line => line.trim().length > 3)
            .map(line => line.trim().toLowerCase());

        return codeChunks.filter(chunk => {
            const content = chunk.content.toLowerCase();
            return beforeCodeFragments.some(fragment => content.includes(fragment));
        }).slice(0, 5);
    }

    private parseImplementationResponse(response: string, feature: FeatureSuggestion): ImplementationPlan {
        try {
            const jsonMatch = response.match(/\\{[\\s\\S]*\\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const parsed = JSON.parse(jsonMatch[0]);
            
            // Validate required fields
            if (!parsed.files || !Array.isArray(parsed.files)) {
                throw new Error('Invalid implementation plan structure');
            }

            return parsed;
        } catch (error) {
            console.warn('Failed to parse implementation response:', error);
            return this.generateFallbackImplementation(feature);
        }
    }

    private generateFallbackImplementation(feature: FeatureSuggestion): ImplementationPlan {
        return {
            featureId: feature.id,
            title: feature.title,
            description: `Basic implementation plan for ${feature.title}. Manual implementation required.`,
            files: [{
                filePath: 'src/features/new-feature.ts',
                action: 'create',
                language: 'typescript',
                codeChanges: [{
                    type: 'insert',
                    newCode: `// TODO: Implement ${feature.title}\n// Description: ${feature.description}\n\nexport class NewFeature {\n    // Implementation needed\n}`,
                    explanation: 'Basic feature structure - requires manual implementation'
                }],
                explanation: 'Placeholder file for new feature implementation'
            }],
            dependencies: [],
            testingStrategy: ['Manual testing required', 'Add unit tests for core functionality'],
            implementationSteps: [
                'Review feature requirements',
                'Design implementation approach',
                'Implement core functionality',
                'Add comprehensive tests',
                'Integration testing'
            ],
            estimatedTime: `${feature.estimatedTimeWeeks} weeks (manual implementation)`
        };
    }

    private generateFallbackRefactoring(suggestion: RefactoringSuggestion): ImplementationPlan {
        const featureId = `refactor-${Date.now()}`;
        return {
            featureId,
            title: `Refactor: ${suggestion.title}`,
            description: `Refactoring task: ${suggestion.description}`,
            files: [{
                filePath: 'src/refactoring-target.ts',
                action: 'modify',
                language: 'typescript',
                codeChanges: [{
                    type: 'replace',
                    oldCode: suggestion.beforeCode,
                    newCode: suggestion.afterCode,
                    explanation: 'Apply suggested refactoring changes'
                }],
                explanation: 'Target file for refactoring changes'
            }],
            dependencies: [],
            testingStrategy: ['Verify existing functionality', 'Run regression tests'],
            implementationSteps: [
                'Backup current code',
                'Apply refactoring changes',
                'Test functionality',
                'Verify code quality improvements'
            ],
            estimatedTime: suggestion.estimatedEffort || '2-4 hours'
        };
    }

    private convertRefactoringToFeature(suggestion: RefactoringSuggestion): FeatureSuggestion {
        return {
            id: `refactor-${Date.now()}`,
            title: `Refactor: ${suggestion.title}`,
            description: suggestion.description,
            category: 'developer-experience',
            priority: suggestion.priority as 'high' | 'medium' | 'low',
            complexity: 'low',
            estimatedTimeWeeks: 0.5,
            implementationOverview: {
                steps: ['Apply refactoring changes', 'Test functionality', 'Verify improvements'],
                technologies: [],
                considerations: ['Maintain existing functionality', 'Preserve test coverage']
            },
            benefits: [`Improved ${suggestion.category}`, 'Better code quality', 'Enhanced maintainability'],
            prerequisites: []
        };
    }
}