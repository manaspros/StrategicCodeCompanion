"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchitectAgent = void 0;
class ArchitectAgent {
    constructor(llmProvider) {
        this.llmProvider = llmProvider;
    }
    async generateArchitectureSuggestions(analysis) {
        try {
            const systemPrompt = `You are a senior software architect with expertise in system design and product development.
            Based on the codebase analysis, suggest 3-5 strategic new features that would enhance the project.
            
            Consider:
            1. Natural evolution of the current architecture
            2. User value and business impact
            3. Technical feasibility
            4. Integration with existing patterns
            5. Market trends and best practices
            
            Focus on features that align with the project's purpose and complement existing functionality.`;
            const userPrompt = `Based on this codebase analysis, suggest new features that would enhance the project:

Analysis:
- Project Summary: ${analysis.overall_summary}
- Type: ${analysis.project_type}
- Technologies: ${analysis.key_technologies.join(', ')}
- Architectural Patterns: ${analysis.architectural_patterns.join(', ')}
- Current Complexity: ${analysis.complexity_score}/10
- Quality Metrics: Maintainability: ${analysis.code_quality_metrics.maintainability}/10

Please return your suggestions as a JSON object with this structure:
{
    "features": [
        {
            "id": "unique-feature-id",
            "title": "Feature Name",
            "description": "Detailed description of what this feature does and why it's valuable",
            "category": "user-experience|performance|security|functionality|developer-experience",
            "priority": "high|medium|low",
            "complexity": "low|medium|high",
            "estimatedTimeWeeks": 1-12,
            "implementationOverview": {
                "steps": ["step1", "step2", "step3"],
                "technologies": ["tech1", "tech2"],
                "considerations": ["consideration1", "consideration2"]
            },
            "benefits": ["benefit1", "benefit2", "benefit3"],
            "prerequisites": ["prereq1", "prereq2"]
        }
    ]
}

Provide 3-5 strategic, well-thought-out feature suggestions.`;
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
        }
        catch (error) {
            console.error('Failed to generate architecture suggestions:', error);
            return this.createFallbackSuggestions(analysis);
        }
    }
    generateSummary(features) {
        const byCategory = {};
        const byComplexity = {};
        const highPriorityFeatures = [];
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
    createFallbackSuggestions(analysis) {
        const features = [];
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
exports.ArchitectAgent = ArchitectAgent;
//# sourceMappingURL=ArchitectAgent.js.map