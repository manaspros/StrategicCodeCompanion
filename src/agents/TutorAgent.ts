import axios from 'axios';
import { CodebaseAnalysis, CodeChunk } from './main';
import { RefactoringResults } from './RefactorAgent';
import { ArchitectureResults } from './ArchitectAgent';

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
    
    constructor() {}

    async findTutorials(analysis: CodebaseAnalysis, codeChunks: CodeChunk[], refactoring?: RefactoringResults, architecture?: ArchitectureResults): Promise<TutorialResults> {
        try {
            // Analyze what the user actually needs to learn based on their code
            const learningNeeds = this.analyzeLearningNeeds(codeChunks, analysis);
            const searchQueries = this.generateContextualSearchQueries(analysis, learningNeeds, refactoring, architecture);
            const tutorials: TutorialRecommendation[] = [];

            console.log('TutorAgent: Learning needs identified:', learningNeeds);
            console.log('TutorAgent: Generated search queries:', searchQueries);

            // Search for tutorials for each query
            for (const query of searchQueries) {
                try {
                    const queryTutorials = await this.searchTutorials(query);
                    tutorials.push(...queryTutorials);
                } catch (error) {
                    console.warn(`Failed to search tutorials for "${query.terms}":`, error);
                }
            }

            // Remove duplicates and sort by relevance
            const uniqueTutorials = this.deduplicateAndRank(tutorials);
            const topTutorials = uniqueTutorials.slice(0, 10);

            return {
                tutorials: topTutorials,
                summary: this.generateSummary(topTutorials)
            };
        } catch (error) {
            console.error('Failed to find tutorials:', error);
            return {
                tutorials: [],
                summary: {
                    totalTutorials: 0,
                    byDifficulty: {},
                    byPlatform: {},
                    averageRelevance: 0
                }
            };
        }
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
        // Return empty array - no mock tutorials
        // Real implementation would use YouTube Data API
        return [];
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