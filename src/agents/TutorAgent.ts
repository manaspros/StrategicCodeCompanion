import axios from 'axios';
import { CodebaseAnalysis, CodeChunk } from './main';
import { RefactoringResults } from './RefactorAgent';
import { ArchitectureResults } from './ArchitectAgent';
import { LLMProvider } from '../llm/llmProvider';
import { RAGContextBuilder } from '../utils/RAGContextBuilder';

export interface TutorialRecommendation {
    id: string;
    title: string;
    description: string;
    url: string;
    platform: 'youtube' | 'other';
    duration?: string;
    views?: number;
    rating?: number;
    publishedDate: string;
    author: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    topics: string[];
    relevanceScore: number;
    relatedTo: 'refactoring' | 'architecture' | 'general';
}

export interface TutorialResults {
    tutorials: TutorialRecommendation[];
    summary: {
        totalTutorials: number;
        byDifficulty: { [key: string]: number };
        byPlatform: { [key: string]: number };
        averageRelevance: number;
    };
}

export class TutorAgent {
    private static readonly YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
    private llmProvider?: LLMProvider;
    
    constructor(llmProvider?: LLMProvider) {
        this.llmProvider = llmProvider;
    }

    async findTutorials(analysis: CodebaseAnalysis, codeChunks: CodeChunk[], refactoring?: RefactoringResults, architecture?: ArchitectureResults): Promise<TutorialResults> {
        try {
            // Use LLM to analyze skill gaps and generate personalized learning recommendations
            const intelligentTutorials = await this.generateIntelligentTutorials(analysis, codeChunks, refactoring, architecture);
            console.log('TutorAgent: LLM-generated intelligent tutorials:', intelligentTutorials.length);

            return {
                tutorials: intelligentTutorials,
                summary: this.generateSummary(intelligentTutorials)
            };
        } catch (error) {
            console.error('Failed to find tutorials:', error);
            // Fallback to basic tutorials if LLM fails
            return this.getFallbackTutorialResults(analysis, codeChunks);
        }
    }

    private async generateIntelligentTutorials(
        analysis: CodebaseAnalysis, 
        codeChunks: CodeChunk[], 
        refactoring?: RefactoringResults, 
        architecture?: ArchitectureResults
    ): Promise<TutorialRecommendation[]> {
        if (!this.llmProvider) {
            console.warn('TutorAgent: No LLM provider available, using fallback tutorials');
            return this.getFallbackTutorials(analysis);
        }

        try {
            // Build rich context for skill analysis using shared RAG builder
            const skillContext = RAGContextBuilder.buildTutorialContext(analysis, codeChunks, refactoring, architecture);
            
            const prompt = `You are an expert programming educator and mentor. Analyze this developer's codebase to identify specific skill gaps and learning opportunities that would create competitive advantages.

CODEBASE ANALYSIS:
${JSON.stringify(analysis, null, 2)}

SKILL CONTEXT:
${skillContext}

TASK: Generate 6-8 highly relevant tutorial recommendations that:
1. Address specific skill gaps identified in this codebase
2. Focus on advanced techniques that create competitive advantages
3. Are practical and immediately applicable to this project
4. Prioritize skills that differentiate developers in the job market
5. Consider the developer's current skill level based on code analysis

For each tutorial, consider:
- What specific skills are missing or could be enhanced?
- What would create the biggest impact on code quality and career growth?
- What knowledge would make this developer stand out from others?

Return ONLY a JSON array in this exact format:
[
    {
        "id": "unique-tutorial-id",
        "title": "Specific tutorial title focusing on practical skills",
        "description": "Detailed description of what will be learned and why it's valuable",
        "url": "https://youtube.com/watch?v=example-id",
        "platform": "youtube",
        "duration": "MM:SS",
        "views": realistic_number,
        "rating": 4.5_to_4.9,
        "publishedDate": "2023-XX-XX", 
        "author": "Credible instructor name",
        "difficulty": "beginner|intermediate|advanced",
        "topics": ["relevant", "skill", "keywords"],
        "relevanceScore": 0.80_to_0.95,
        "relatedTo": "refactoring|architecture|general"
    }
]

Focus on advanced, practical skills that would make this developer more competitive and effective.`;

            const response = await this.llmProvider.generateResponse([
                { role: 'system', content: 'You are an expert programming educator. Return only valid JSON containing highly relevant tutorial recommendations.' },
                { role: 'user', content: prompt }
            ], { temperature: 0.4, maxTokens: 1200 });

            // Parse LLM response
            const tutorials = this.parseIntelligentTutorials(response.content || '');
            console.log('TutorAgent: Generated', tutorials.length, 'intelligent tutorials via LLM');
            
            return tutorials.length > 0 ? tutorials : this.getFallbackTutorials(analysis);
        } catch (error) {
            console.warn('TutorAgent: LLM tutorial generation failed, using fallback:', error);
            return this.getFallbackTutorials(analysis);
        }
    }


    private parseIntelligentTutorials(llmResponse: string): TutorialRecommendation[] {
        try {
            // Try to extract JSON from response
            const jsonMatch = llmResponse.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('No JSON array found in response');
            }
            
            const tutorials = JSON.parse(jsonMatch[0]);
            
            // Validate structure
            if (!Array.isArray(tutorials)) {
                throw new Error('Response is not an array');
            }
            
            return tutorials.filter(t => 
                t.id && 
                t.title && 
                t.description && 
                t.difficulty &&
                t.relevanceScore &&
                ['beginner', 'intermediate', 'advanced'].includes(t.difficulty) &&
                ['refactoring', 'architecture', 'general'].includes(t.relatedTo)
            );
        } catch (error) {
            console.warn('Failed to parse LLM tutorial response:', error);
            return [];
        }
    }

    private getFallbackTutorials(analysis: CodebaseAnalysis): TutorialRecommendation[] {
        const tutorials: TutorialRecommendation[] = [];
        
        // Technology-specific fallback tutorials
        if (analysis.key_technologies.some(tech => tech.toLowerCase().includes('react'))) {
            tutorials.push({
                id: 'react-performance-mastery',
                title: 'React Performance: Advanced Optimization Techniques',
                description: 'Master React performance optimization with advanced techniques like code splitting, memoization, and virtualization',
                url: 'https://youtube.com/watch?v=example-react-performance',
                platform: 'youtube',
                duration: '42:15',
                views: 150000,
                rating: 4.8,
                publishedDate: '2024-01-20',
                author: 'React Performance Expert',
                difficulty: 'advanced',
                topics: ['react', 'performance', 'optimization', 'memoization'],
                relevanceScore: 0.92,
                relatedTo: 'general'
            });
        }
        
        if (analysis.key_technologies.some(tech => tech.toLowerCase().includes('typescript'))) {
            tutorials.push({
                id: 'typescript-advanced-types',
                title: 'TypeScript: Advanced Type System and Generic Programming',
                description: 'Deep dive into TypeScript\'s advanced features: conditional types, mapped types, and sophisticated generic patterns',
                url: 'https://youtube.com/watch?v=example-typescript-advanced',
                platform: 'youtube',
                duration: '38:45',
                views: 89000,
                rating: 4.9,
                publishedDate: '2024-02-10',
                author: 'TypeScript Master',
                difficulty: 'advanced',
                topics: ['typescript', 'generics', 'advanced-types', 'type-safety'],
                relevanceScore: 0.90,
                relatedTo: 'general'
            });
        }
        
        // Quality-focused tutorials
        if (analysis.code_quality_metrics.testability < 7) {
            tutorials.push({
                id: 'testing-strategies-mastery',
                title: 'Testing Strategies: TDD and Advanced Testing Patterns',
                description: 'Learn advanced testing strategies, TDD principles, and how to write maintainable, comprehensive test suites',
                url: 'https://youtube.com/watch?v=example-testing-advanced',
                platform: 'youtube',
                duration: '45:20',
                views: 120000,
                rating: 4.7,
                publishedDate: '2024-01-15',
                author: 'Testing Professional',
                difficulty: 'intermediate',
                topics: ['testing', 'tdd', 'test-strategies', 'quality'],
                relevanceScore: 0.88,
                relatedTo: 'general'
            });
        }
        
        // Modern web development practices
        tutorials.push({
            id: 'modern-web-security',
            title: 'Modern Web Security: Practical Implementation Guide',
            description: 'Comprehensive guide to implementing security best practices in modern web applications',
            url: 'https://youtube.com/watch?v=example-web-security',
            platform: 'youtube',
            duration: '35:30',
            views: 95000,
            rating: 4.6,
            publishedDate: '2023-12-05',
            author: 'Security Expert',
            difficulty: 'intermediate',
            topics: ['security', 'web-security', 'best-practices', 'implementation'],
            relevanceScore: 0.85,
            relatedTo: 'architecture'
        });
        
        return tutorials.slice(0, 6);
    }

    private getFallbackTutorialResults(analysis: CodebaseAnalysis, codeChunks: CodeChunk[]): TutorialResults {
        const fallbackTutorials = this.getFallbackTutorials(analysis);
        return {
            tutorials: fallbackTutorials,
            summary: this.generateSummary(fallbackTutorials)
        };
    }

    private analyzeLearningNeeds(codeChunks: CodeChunk[], analysis: CodebaseAnalysis): any {
        const needs = {
            advancedPatterns: [] as string[],
            missingSkills: [] as string[],
            optimizationAreas: [] as string[],
            technologyDepth: {} as any
        };

        // Analyze code complexity and patterns
        const complexityLevel = analysis.complexity_score;
        
        if (complexityLevel > 7) {
            needs.advancedPatterns.push('code-architecture');
            needs.advancedPatterns.push('design-patterns');
        }
        
        // Analyze technology usage depth
        analysis.key_technologies.forEach(tech => {
            const techUsage = codeChunks.filter(chunk => 
                chunk.content.toLowerCase().includes(tech.toLowerCase())
            ).length;
            
            if (techUsage > 5) {
                needs.technologyDepth[tech] = 'advanced';
            } else {
                needs.technologyDepth[tech] = 'intermediate';
                needs.missingSkills.push(`advanced-${tech.toLowerCase()}`);
            }
        });

        // Check for missing modern practices
        const hasModernJS = codeChunks.some(chunk => 
            chunk.content.includes('async') || chunk.content.includes('await')
        );
        if (!hasModernJS) {
            needs.missingSkills.push('modern-javascript');
        }

        const hasTypeScript = analysis.key_technologies.includes('TypeScript');
        if (!hasTypeScript && analysis.key_technologies.includes('JavaScript')) {
            needs.missingSkills.push('typescript');
        }

        return needs;
    }

    private generateContextualSearchQueries(
        analysis: CodebaseAnalysis, 
        learningNeeds: any, 
        refactoring?: RefactoringResults, 
        architecture?: ArchitectureResults
    ): Array<{terms: string, context: 'refactoring' | 'architecture' | 'general', difficulty: 'beginner' | 'intermediate' | 'advanced'}> {
        const queries: Array<{terms: string, context: 'refactoring' | 'architecture' | 'general', difficulty: 'beginner' | 'intermediate' | 'advanced'}> = [];
        
        // Focus on skills that create unique competitive advantages
        learningNeeds.missingSkills.forEach((skill: string) => {
            if (skill.includes('typescript')) {
                queries.push({
                    terms: 'advanced type system design generic programming',
                    context: 'general',
                    difficulty: 'advanced'
                });
            } else if (skill.includes('modern-javascript')) {
                queries.push({
                    terms: 'functional programming immutable data structures advanced patterns',
                    context: 'general',
                    difficulty: 'advanced'
                });
            } else if (skill.includes('advanced-react')) {
                queries.push({
                    terms: 'concurrent rendering suspense custom hooks advanced',
                    context: 'general',
                    difficulty: 'advanced'
                });
            }
        });

        // Add cutting-edge architectural patterns
        learningNeeds.advancedPatterns.forEach((pattern: string) => {
            if (pattern === 'code-architecture') {
                queries.push({
                    terms: 'event-driven architecture domain modeling hexagonal architecture',
                    context: 'architecture',
                    difficulty: 'advanced'
                });
            } else if (pattern === 'design-patterns') {
                queries.push({
                    terms: 'functional programming monads category theory practical',
                    context: 'refactoring',
                    difficulty: 'advanced'
                });
            }
        });

        // Focus on business-differentiating skills
        queries.push({
            terms: 'web performance optimization core web vitals lighthouse',
            context: 'general',
            difficulty: 'intermediate'
        });
        
        queries.push({
            terms: 'accessibility inclusive design WCAG implementation',
            context: 'general',
            difficulty: 'intermediate'
        });
        
        queries.push({
            terms: 'security-first development threat modeling secure coding',
            context: 'architecture',
            difficulty: 'advanced'
        });
        
        queries.push({
            terms: 'observability monitoring distributed tracing production debugging',
            context: 'architecture',
            difficulty: 'advanced'
        });
        
        queries.push({
            terms: 'machine learning web development AI integration practical',
            context: 'general',
            difficulty: 'advanced'
        });

        return queries;
    }

    private generateSearchQueries(analysis: CodebaseAnalysis, refactoring?: RefactoringResults, architecture?: ArchitectureResults): Array<{terms: string, context: 'refactoring' | 'architecture' | 'general', difficulty: 'beginner' | 'intermediate' | 'advanced'}> {
        const queries: Array<{terms: string, context: 'refactoring' | 'architecture' | 'general', difficulty: 'beginner' | 'intermediate' | 'advanced'}> = [];
        
        // Technology-specific tutorials
        analysis.key_technologies.forEach(tech => {
            queries.push({
                terms: `${tech} tutorial best practices`,
                context: 'general',
                difficulty: 'intermediate'
            });
        });

        // Project-type specific tutorials
        switch (analysis.project_type) {
            case 'web-app':
                queries.push({
                    terms: 'web application development tutorial',
                    context: 'general',
                    difficulty: 'intermediate'
                });
                break;
            case 'api':
                queries.push({
                    terms: 'REST API development best practices',
                    context: 'architecture',
                    difficulty: 'intermediate'
                });
                break;
            case 'cli-tool':
                queries.push({
                    terms: 'command line tool development',
                    context: 'general',
                    difficulty: 'intermediate'
                });
                break;
        }

        // Refactoring-specific tutorials
        if (refactoring) {
            const categories = refactoring.summary.categories;
            categories.forEach(category => {
                queries.push({
                    terms: `code refactoring ${category} tutorial`,
                    context: 'refactoring',
                    difficulty: 'intermediate'
                });
            });

            queries.push({
                terms: 'clean code refactoring techniques',
                context: 'refactoring',
                difficulty: 'intermediate'
            });
        }

        // Architecture-specific tutorials
        if (architecture) {
            const categories = Object.keys(architecture.summary.byCategory);
            categories.forEach(category => {
                queries.push({
                    terms: `software architecture ${category} tutorial`,
                    context: 'architecture',
                    difficulty: 'advanced'
                });
            });
        }

        // Quality improvement tutorials
        if (analysis.code_quality_metrics.maintainability < 7) {
            queries.push({
                terms: 'code maintainability best practices',
                context: 'refactoring',
                difficulty: 'intermediate'
            });
        }

        if (analysis.code_quality_metrics.testability < 7) {
            queries.push({
                terms: 'software testing tutorial best practices',
                context: 'general',
                difficulty: 'intermediate'
            });
        }

        return queries.slice(0, 8); // Limit to avoid rate limits
    }

    private async searchTutorials(query: {terms: string, context: 'refactoring' | 'architecture' | 'general', difficulty: 'beginner' | 'intermediate' | 'advanced'}): Promise<TutorialRecommendation[]> {
        try {
            // For now, return curated fallback tutorials based on query
            // Real implementation would use YouTube Data API
            console.log(`TutorAgent: Generating curated tutorials for "${query.terms}"`);
            return this.generateCuratedTutorials(query);
        } catch (error) {
            console.warn('Failed to search tutorials:', error);
            return this.generateCuratedTutorials(query);
        }
    }

    private generateCuratedTutorials(query: {terms: string, context: 'refactoring' | 'architecture' | 'general', difficulty: 'beginner' | 'intermediate' | 'advanced'}): TutorialRecommendation[] {
        const tutorials: TutorialRecommendation[] = [];
        const topics = this.extractTopics(query.terms);
        
        // Generate tutorials based on query context and terms
        if (query.terms.includes('typescript') || query.terms.includes('type system')) {
            tutorials.push({
                id: 'ts-advanced-patterns',
                title: 'Advanced TypeScript: Generic Programming and Type System Design',
                description: 'Master TypeScript\'s advanced type system, generics, conditional types, and mapped types for creating robust, type-safe applications',
                url: 'https://youtube.com/watch?v=example-typescript-advanced',
                platform: 'youtube',
                duration: '45:30',
                views: 125000,
                rating: 4.8,
                publishedDate: '2024-01-15',
                author: 'TypeScript Mastery',
                difficulty: 'advanced',
                topics: ['typescript', 'generics', 'type-safety', 'advanced-patterns'],
                relevanceScore: 0.95,
                relatedTo: query.context
            });
        }

        if (query.terms.includes('react') || query.terms.includes('concurrent')) {
            tutorials.push({
                id: 'react-concurrent-features',
                title: 'React 18 Concurrent Features: Suspense, Streaming, and Performance',
                description: 'Learn React 18\'s concurrent rendering, Suspense for data fetching, streaming SSR, and performance optimization techniques',
                url: 'https://youtube.com/watch?v=example-react-concurrent',
                platform: 'youtube',
                duration: '38:45',
                views: 89000,
                rating: 4.9,
                publishedDate: '2024-02-08',
                author: 'React Experts',
                difficulty: 'advanced',
                topics: ['react', 'concurrent', 'suspense', 'performance'],
                relevanceScore: 0.92,
                relatedTo: query.context
            });
        }

        if (query.terms.includes('functional') || query.terms.includes('immutable')) {
            tutorials.push({
                id: 'functional-js-patterns',
                title: 'Functional JavaScript: Immutable Data Structures and Composition',
                description: 'Master functional programming concepts in JavaScript: immutability, pure functions, composition, and monadic patterns',
                url: 'https://youtube.com/watch?v=example-functional-js',
                platform: 'youtube',
                duration: '52:15',
                views: 67000,
                rating: 4.7,
                publishedDate: '2023-12-20',
                author: 'Functional Programming Hub',
                difficulty: 'advanced',
                topics: ['functional', 'immutable', 'composition', 'javascript'],
                relevanceScore: 0.88,
                relatedTo: query.context
            });
        }

        if (query.terms.includes('performance') || query.terms.includes('web vitals')) {
            tutorials.push({
                id: 'web-performance-optimization',
                title: 'Web Performance Optimization: Core Web Vitals and Lighthouse Strategies',
                description: 'Complete guide to optimizing web performance, improving Core Web Vitals scores, and implementing performance best practices',
                url: 'https://youtube.com/watch?v=example-performance',
                platform: 'youtube',
                duration: '41:20',
                views: 156000,
                rating: 4.9,
                publishedDate: '2024-01-30',
                author: 'Web Performance Pro',
                difficulty: 'intermediate',
                topics: ['performance', 'web-vitals', 'optimization', 'lighthouse'],
                relevanceScore: 0.93,
                relatedTo: query.context
            });
        }

        if (query.terms.includes('accessibility') || query.terms.includes('WCAG')) {
            tutorials.push({
                id: 'web-accessibility-wcag',
                title: 'Web Accessibility: WCAG 2.1 Implementation and Inclusive Design',
                description: 'Learn to build accessible web applications, implement WCAG guidelines, and create inclusive user experiences',
                url: 'https://youtube.com/watch?v=example-accessibility',
                platform: 'youtube',
                duration: '35:45',
                views: 78000,
                rating: 4.8,
                publishedDate: '2024-01-10',
                author: 'Accessibility First',
                difficulty: 'intermediate',
                topics: ['accessibility', 'wcag', 'inclusive-design', 'a11y'],
                relevanceScore: 0.90,
                relatedTo: query.context
            });
        }

        if (query.terms.includes('architecture') || query.terms.includes('event-driven')) {
            tutorials.push({
                id: 'event-driven-architecture',
                title: 'Event-Driven Architecture: Domain Events and Microservices',
                description: 'Master event-driven architecture patterns, domain modeling, and building resilient distributed systems',
                url: 'https://youtube.com/watch?v=example-event-driven',
                platform: 'youtube',
                duration: '47:30',
                views: 95000,
                rating: 4.7,
                publishedDate: '2023-11-25',
                author: 'Software Architecture',
                difficulty: 'advanced',
                topics: ['architecture', 'event-driven', 'microservices', 'domain'],
                relevanceScore: 0.89,
                relatedTo: query.context
            });
        }

        if (query.terms.includes('security') || query.terms.includes('threat')) {
            tutorials.push({
                id: 'security-first-development',
                title: 'Security-First Development: Threat Modeling and Secure Coding',
                description: 'Learn security-first development practices, threat modeling techniques, and secure coding patterns for web applications',
                url: 'https://youtube.com/watch?v=example-security',
                platform: 'youtube',
                duration: '39:15',
                views: 62000,
                rating: 4.6,
                publishedDate: '2024-01-05',
                author: 'Security Code Review',
                difficulty: 'advanced',
                topics: ['security', 'threat-modeling', 'secure-coding', 'web-security'],
                relevanceScore: 0.87,
                relatedTo: query.context
            });
        }

        if (query.terms.includes('observability') || query.terms.includes('monitoring')) {
            tutorials.push({
                id: 'observability-monitoring',
                title: 'Production Observability: Distributed Tracing and Monitoring',
                description: 'Implement comprehensive observability: distributed tracing, metrics collection, and production debugging strategies',
                url: 'https://youtube.com/watch?v=example-observability',
                platform: 'youtube',
                duration: '43:50',
                views: 84000,
                rating: 4.8,
                publishedDate: '2024-02-01',
                author: 'DevOps Observability',
                difficulty: 'advanced',
                topics: ['observability', 'monitoring', 'tracing', 'debugging'],
                relevanceScore: 0.86,
                relatedTo: query.context
            });
        }

        if (query.terms.includes('machine learning') || query.terms.includes('AI')) {
            tutorials.push({
                id: 'ml-web-integration',
                title: 'Machine Learning in Web Development: AI Integration Patterns',
                description: 'Practical guide to integrating machine learning into web applications: recommendation engines, NLP, and real-time ML',
                url: 'https://youtube.com/watch?v=example-ml-web',
                platform: 'youtube',
                duration: '56:20',
                views: 112000,
                rating: 4.9,
                publishedDate: '2024-02-15',
                author: 'ML for Web Developers',
                difficulty: 'advanced',
                topics: ['machine-learning', 'ai', 'web-development', 'integration'],
                relevanceScore: 0.94,
                relatedTo: query.context
            });
        }

        // Add default high-quality tutorials if no specific matches
        if (tutorials.length === 0) {
            tutorials.push({
                id: 'clean-code-principles',
                title: 'Clean Code Principles: Writing Maintainable Software',
                description: 'Essential clean code principles and refactoring techniques for writing maintainable, readable, and robust software',
                url: 'https://youtube.com/watch?v=example-clean-code',
                platform: 'youtube',
                duration: '34:25',
                views: 245000,
                rating: 4.8,
                publishedDate: '2023-10-15',
                author: 'Clean Code Institute',
                difficulty: query.difficulty,
                topics: topics.length > 0 ? topics : ['clean-code', 'refactoring', 'best-practices'],
                relevanceScore: 0.75,
                relatedTo: query.context
            });

            tutorials.push({
                id: 'modern-dev-practices',
                title: 'Modern Development Practices: Testing, CI/CD, and Code Quality',
                description: 'Comprehensive guide to modern development workflows: automated testing, continuous integration, and maintaining code quality',
                url: 'https://youtube.com/watch?v=example-modern-practices',
                platform: 'youtube',
                duration: '42:10',
                views: 178000,
                rating: 4.7,
                publishedDate: '2023-11-08',
                author: 'Modern Development',
                difficulty: 'intermediate',
                topics: topics.length > 0 ? topics : ['testing', 'ci-cd', 'code-quality'],
                relevanceScore: 0.72,
                relatedTo: query.context
            });
        }

        return tutorials.slice(0, 3); // Return up to 3 tutorials per query
    }
    private extractTopics(terms: string): string[] {
        const topics = [];
        const words = terms.toLowerCase().split(' ');
        
        // Extract meaningful topics
        const meaningfulWords = words.filter(word => 
            word.length > 3 && 
            !['tutorial', 'best', 'practices', 'guide', 'complete'].includes(word)
        );

        topics.push(...meaningfulWords.slice(0, 4));
        
        // Add some common programming topics
        const commonTopics = ['coding', 'development', 'programming', 'software engineering'];
        if (topics.length < 3) {
            topics.push(...commonTopics.slice(0, 3 - topics.length));
        }

        return topics;
    }

    private deduplicateAndRank(tutorials: TutorialRecommendation[]): TutorialRecommendation[] {
        // Remove duplicates by title and sort by relevance score
        const seen = new Set<string>();
        const unique = tutorials.filter(tutorial => {
            const key = tutorial.title.toLowerCase();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });

        return unique.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    private generateSummary(tutorials: TutorialRecommendation[]) {
        const byDifficulty: { [key: string]: number } = {};
        const byPlatform: { [key: string]: number } = {};
        let totalRelevance = 0;

        tutorials.forEach(tutorial => {
            byDifficulty[tutorial.difficulty] = (byDifficulty[tutorial.difficulty] || 0) + 1;
            byPlatform[tutorial.platform] = (byPlatform[tutorial.platform] || 0) + 1;
            totalRelevance += tutorial.relevanceScore;
        });

        return {
            totalTutorials: tutorials.length,
            byDifficulty,
            byPlatform,
            averageRelevance: tutorials.length > 0 ? Math.round((totalRelevance / tutorials.length) * 100) / 100 : 0
        };
    }

}