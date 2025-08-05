import { LLMProvider } from '../llm/llmProvider';
import { CodebaseAnalysis, CodeChunk } from './main';

export interface FeatureSuggestion {
    id: string;
    title: string;
    description: string;
    category: 'user-experience' | 'performance' | 'security' | 'functionality' | 'developer-experience';
    priority: 'high' | 'medium' | 'low';
    complexity: 'low' | 'medium' | 'high';
    estimatedTimeWeeks: number;
    implementationOverview: {
        steps: string[];
        technologies: string[];
        considerations: string[];
    };
    benefits: string[];
    prerequisites: string[];
}

export interface ArchitectureResults {
    features: FeatureSuggestion[];
    summary: {
        totalFeatures: number;
        byCategory: { [key: string]: number };
        byComplexity: { [key: string]: number };
        recommendedNext: string[];
    };
}

export class ArchitectAgent {
    private llmProvider: LLMProvider;

    constructor(llmProvider: LLMProvider) {
        this.llmProvider = llmProvider;
    }

    async generateArchitectureSuggestions(analysis: CodebaseAnalysis, codeChunks: CodeChunk[]): Promise<ArchitectureResults> {
        try {
            // Analyze existing architecture patterns
            const architectureAnalysis = this.analyzeExistingArchitecture(codeChunks, analysis);
            
            const systemPrompt = `You are a senior software architect with expertise in system design and product development.
            Based on the ACTUAL codebase structure and patterns, suggest specific architectural improvements and features.
            
            IMPORTANT REQUIREMENTS:
            1. Only suggest features that make sense for THIS specific project type and tech stack
            2. Base suggestions on ACTUAL code patterns you can see
            3. Consider the existing architecture and build upon it
            4. Provide implementable suggestions, not generic ones
            5. Focus on features that solve real user problems for this type of application
            
            DO NOT suggest generic features - be specific to the project context.`;

            const userPrompt = `Analyze this ACTUAL codebase and suggest specific architectural improvements:

PROJECT CONTEXT:
- Summary: ${analysis.overall_summary}
- Type: ${analysis.project_type}
- Technologies: ${analysis.key_technologies.join(', ')}
- Complexity: ${analysis.complexity_score}/10

ACTUAL ARCHITECTURE ANALYSIS:
${architectureAnalysis}

Based on the ACTUAL code structure above, suggest specific features that would:
1. Build naturally on the existing architecture
2. Solve real problems for ${analysis.project_type} users
3. Leverage the ${analysis.key_technologies.join('/')} tech stack effectively
4. Improve upon the identified areas for enhancement

Return as JSON:
{
    "features": [
        {
            "id": "specific-feature-id",
            "title": "Contextual Feature Name",
            "description": "Specific description based on actual code patterns",
            "category": "user-experience|performance|security|functionality|developer-experience",
            "priority": "high|medium|low",
            "complexity": "low|medium|high",
            "estimatedTimeWeeks": 1-12,
            "implementationOverview": {
                "steps": ["specific implementation steps"],
                "technologies": ["actual technologies from the stack"],
                "considerations": ["real technical considerations"]
            },
            "benefits": ["specific benefits for this project type"],
            "prerequisites": ["actual prerequisites from the codebase"]
        }
    ]
}

Provide 3-4 highly relevant, implementation-ready suggestions.`;

            const response = await this.llmProvider.generateResponse([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], {
                temperature: 0.6,
                maxTokens: 3000
            });

            // Parse JSON response
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in architecture response');
            }

            const parsed = JSON.parse(jsonMatch[0]);
            const features = parsed.features || [];

            // Generate summary
            const summary = this.generateSummary(features);

            return {
                features,
                summary
            };
        } catch (error) {
            console.error('Failed to generate architecture suggestions:', error);
            return this.createFallbackSuggestions(analysis);
        }
    }

    private analyzeExistingArchitecture(codeChunks: CodeChunk[], analysis: CodebaseAnalysis): string {
        const archAnalysis: string[] = [];
        
        // Analyze file structure and patterns
        const fileStructure = this.analyzeFileStructure(codeChunks);
        archAnalysis.push('FILE STRUCTURE:');
        archAnalysis.push(...fileStructure);
        archAnalysis.push('');
        
        // Analyze component patterns (for UI projects)
        if (analysis.key_technologies.includes('React') || analysis.key_technologies.includes('Vue') || analysis.key_technologies.includes('Angular')) {
            const componentPatterns = this.analyzeComponentPatterns(codeChunks, analysis);
            archAnalysis.push('COMPONENT ARCHITECTURE:');
            archAnalysis.push(...componentPatterns);
            archAnalysis.push('');
        }
        
        // Analyze data flow and state management
        const dataFlow = this.analyzeDataFlow(codeChunks, analysis);
        archAnalysis.push('DATA FLOW PATTERNS:');
        archAnalysis.push(...dataFlow);
        archAnalysis.push('');
        
        // Identify missing architectural elements
        const gaps = this.identifyArchitecturalGaps(codeChunks, analysis);
        archAnalysis.push('ARCHITECTURAL OPPORTUNITIES:');
        archAnalysis.push(...gaps);
        
        return archAnalysis.join('\n');
    }
    
    private analyzeFileStructure(codeChunks: CodeChunk[]): string[] {
        const structure: string[] = [];
        
        // Get unique directories
        const directories = new Set<string>();
        codeChunks.forEach(chunk => {
            const dir = chunk.filePath.split('/').slice(0, -1).join('/');
            if (dir) directories.add(dir);
        });
        
        structure.push(`- Total code files analyzed: ${codeChunks.length}`);
        structure.push(`- Directory structure depth: ${Array.from(directories).length} directories`);
        
        // Analyze file types distribution
        const fileTypes = new Map<string, number>();
        codeChunks.forEach(chunk => {
            const ext = chunk.filePath.split('.').pop() || 'unknown';
            fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1);
        });
        
        structure.push('- File type distribution:');
        Array.from(fileTypes.entries()).forEach(([ext, count]) => {
            structure.push(`  * .${ext}: ${count} files`);
        });
        
        return structure;
    }
    
    private analyzeComponentPatterns(codeChunks: CodeChunk[], analysis: CodebaseAnalysis): string[] {
        const patterns: string[] = [];
        
        const componentChunks = codeChunks.filter(chunk => 
            chunk.type === 'function' || chunk.type === 'class'
        );
        
        patterns.push(`- Components/Functions found: ${componentChunks.length}`);
        
        if (analysis.key_technologies.includes('React')) {
            // Look for React patterns
            const reactHooks = codeChunks.filter(chunk => 
                chunk.content.includes('useState') || 
                chunk.content.includes('useEffect') ||
                chunk.content.includes('useContext')
            );
            patterns.push(`- React hooks usage: ${reactHooks.length} components using hooks`);
            
            const propPatterns = codeChunks.filter(chunk => 
                chunk.content.includes('props.')
            );
            patterns.push(`- Components with props: ${propPatterns.length}`);
        }
        
        return patterns;
    }
    
    private analyzeDataFlow(codeChunks: CodeChunk[], analysis: CodebaseAnalysis): string[] {
        const dataFlow: string[] = [];
        
        // Look for API calls
        const apiCalls = codeChunks.filter(chunk => 
            chunk.content.includes('fetch(') ||
            chunk.content.includes('axios') ||
            chunk.content.includes('api.')
        );
        dataFlow.push(`- API integration points: ${apiCalls.length}`);
        
        // Look for state management
        const stateManagement = codeChunks.filter(chunk => 
            chunk.content.includes('useState') ||
            chunk.content.includes('Redux') ||
            chunk.content.includes('Zustand') ||
            chunk.content.includes('store')
        );
        dataFlow.push(`- State management usage: ${stateManagement.length} files`);
        
        // Look for data processing
        const dataProcessing = codeChunks.filter(chunk => 
            chunk.content.includes('.map(') ||
            chunk.content.includes('.filter(') ||
            chunk.content.includes('.reduce(')
        );
        dataFlow.push(`- Data transformation patterns: ${dataProcessing.length} files`);
        
        return dataFlow;
    }
    
    private identifyArchitecturalGaps(codeChunks: CodeChunk[], analysis: CodebaseAnalysis): string[] {
        const gaps: string[] = [];
        
        // Check for testing
        const testFiles = codeChunks.filter(chunk => 
            chunk.filePath.includes('test') || 
            chunk.filePath.includes('spec') ||
            chunk.content.includes('describe(') ||
            chunk.content.includes('it(')
        );
        if (testFiles.length === 0) {
            gaps.push('- Missing: Automated testing infrastructure');
        }
        
        // Check for error handling
        const errorHandling = codeChunks.filter(chunk => 
            chunk.content.includes('try') ||
            chunk.content.includes('catch') ||
            chunk.content.includes('Error')
        );
        if (errorHandling.length < codeChunks.length * 0.2) {
            gaps.push('- Opportunity: Enhanced error handling and logging');
        }
        
        // Check for TypeScript (if JavaScript project)
        if (analysis.key_technologies.includes('JavaScript') && !analysis.key_technologies.includes('TypeScript')) {
            gaps.push('- Opportunity: TypeScript adoption for better type safety');
        }
        
        // Project-specific opportunities
        if (analysis.project_type === 'web-app') {
            gaps.push('- Opportunity: Performance monitoring and analytics');
            gaps.push('- Opportunity: Progressive Web App (PWA) features');
            gaps.push('- Opportunity: Accessibility improvements');
        }
        
        return gaps;
    }

    private generateSummary(features: FeatureSuggestion[]) {
        const byCategory: { [key: string]: number } = {};
        const byComplexity: { [key: string]: number } = {};
        const highPriorityFeatures: string[] = [];

        features.forEach(feature => {
            byCategory[feature.category] = (byCategory[feature.category] || 0) + 1;
            byComplexity[feature.complexity] = (byComplexity[feature.complexity] || 0) + 1;
            
            if (feature.priority === 'high') {
                highPriorityFeatures.push(feature.title);
            }
        });

        // Recommend next features based on priority and complexity
        const recommendedNext = features
            .filter(f => f.priority === 'high' || (f.priority === 'medium' && f.complexity === 'low'))
            .slice(0, 3)
            .map(f => f.title);

        return {
            totalFeatures: features.length,
            byCategory,
            byComplexity,
            recommendedNext
        };
    }

    private createFallbackSuggestions(analysis: CodebaseAnalysis): ArchitectureResults {
        const features: FeatureSuggestion[] = [];

        // Generic suggestions based on project type
        if (analysis.project_type === 'web-app' || analysis.project_type === 'api') {
            features.push({
                id: 'authentication-system',
                title: 'User Authentication & Authorization',
                description: 'Implement a comprehensive user authentication system with role-based access control to secure the application and enable personalized experiences.',
                category: 'security',
                priority: 'high',
                complexity: 'medium',
                estimatedTimeWeeks: 3,
                implementationOverview: {
                    steps: [
                        'Design user schema and database tables',
                        'Implement JWT-based authentication',
                        'Create login/register endpoints',
                        'Add role-based middleware',
                        'Build frontend authentication components'
                    ],
                    technologies: ['JWT', 'bcrypt', 'database', 'session management'],
                    considerations: [
                        'Password security and hashing',
                        'Session management and expiration',
                        'GDPR compliance for user data',
                        'Rate limiting for login attempts'
                    ]
                },
                benefits: [
                    'Secure user access control',
                    'Personalized user experiences',
                    'Audit trail for user actions',
                    'Foundation for premium features'
                ],
                prerequisites: ['Database setup', 'Basic API structure']
            });

            features.push({
                id: 'caching-layer',
                title: 'Intelligent Caching System',
                description: 'Implement multi-level caching to improve application performance and reduce database load.',
                category: 'performance',
                priority: 'medium',
                complexity: 'medium',
                estimatedTimeWeeks: 2,
                implementationOverview: {
                    steps: [
                        'Analyze data access patterns',
                        'Choose caching strategy (Redis/in-memory)',
                        'Implement cache middleware',
                        'Add cache invalidation logic',
                        'Monitor cache hit rates'
                    ],
                    technologies: ['Redis', 'memory caching', 'cache middleware'],
                    considerations: [
                        'Cache invalidation strategies',
                        'Memory usage optimization',
                        'Cache warming strategies',
                        'Fallback mechanisms'
                    ]
                },
                benefits: [
                    'Faster response times',
                    'Reduced database load',
                    'Better user experience',
                    'Lower infrastructure costs'
                ],
                prerequisites: ['Performance monitoring setup']
            });
        }

        if (analysis.project_type === 'library' || analysis.project_type === 'cli-tool') {
            features.push({
                id: 'comprehensive-testing',
                title: 'Comprehensive Test Suite',
                description: 'Build a robust testing framework with unit, integration, and end-to-end tests to ensure code quality and reliability.',
                category: 'developer-experience',
                priority: 'high',
                complexity: 'medium',
                estimatedTimeWeeks: 3,
                implementationOverview: {
                    steps: [
                        'Set up testing framework',
                        'Write unit tests for core functions',
                        'Add integration tests',
                        'Implement CI/CD pipeline',
                        'Add code coverage reporting'
                    ],
                    technologies: ['Jest', 'testing-library', 'CI/CD', 'coverage tools'],
                    considerations: [
                        'Test data management',
                        'Mocking external dependencies',
                        'Performance testing',
                        'Automated test execution'
                    ]
                },
                benefits: [
                    'Higher code quality',
                    'Faster development cycles',
                    'Confidence in deployments',
                    'Better documentation through tests'
                ],
                prerequisites: ['Project structure finalized']
            });
        }

        // Universal suggestions
        features.push({
            id: 'monitoring-analytics',
            title: 'Application Monitoring & Analytics',
            description: 'Implement comprehensive monitoring and analytics to track application performance, errors, and user behavior.',
            category: 'developer-experience',
            priority: 'medium',
            complexity: 'low',
            estimatedTimeWeeks: 2,
            implementationOverview: {
                steps: [
                    'Choose monitoring tools',
                    'Implement error tracking',
                    'Add performance metrics',
                    'Create monitoring dashboard',
                    'Set up alerting system'
                ],
                technologies: ['logging framework', 'APM tools', 'metrics collection'],
                considerations: [
                    'Data privacy and retention',
                    'Performance impact of monitoring',
                    'Alert fatigue prevention',
                    'Cost management'
                ]
            },
            benefits: [
                'Proactive issue detection',
                'Performance optimization insights',
                'Better user experience tracking',
                'Improved debugging capabilities'
            ],
            prerequisites: ['Basic application structure']
        });

        return {
            features,
            summary: this.generateSummary(features)
        };
    }
}