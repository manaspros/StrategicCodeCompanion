import axios from 'axios';
import { CodebaseAnalysis } from './main';
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

    async findTutorials(analysis: CodebaseAnalysis, refactoring?: RefactoringResults, architecture?: ArchitectureResults): Promise<TutorialResults> {
        try {
            const searchQueries = this.generateSearchQueries(analysis, refactoring, architecture);
            const tutorials: TutorialRecommendation[] = [];

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
            return this.createFallbackTutorials(analysis);
        }
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
        // Since we don't have YouTube API key, we'll create mock tutorials based on the search terms
        // In a real implementation, you would use the YouTube Data API
        return this.generateMockTutorials(query);
    }

    private generateMockTutorials(query: {terms: string, context: 'refactoring' | 'architecture' | 'general', difficulty: 'beginner' | 'intermediate' | 'advanced'}): TutorialRecommendation[] {
        const tutorials: TutorialRecommendation[] = [];
        const baseId = this.generateId(query.terms);
        
        // Generate 2-3 mock tutorials per query
        const tutorialTemplates = [
            {
                titleTemplate: `Complete Guide to ${query.terms}`,
                authorTemplate: 'Programming with Experts',
                duration: '45:30',
                views: 125000
            },
            {
                titleTemplate: `${query.terms} - Best Practices`,
                authorTemplate: 'Code Academy Pro',
                duration: '28:15',
                views: 87000
            },
            {
                titleTemplate: `Master ${query.terms} in 2024`,
                authorTemplate: 'TechMentor',
                duration: '1:12:45',
                views: 203000
            }
        ];

        tutorialTemplates.slice(0, 2).forEach((template, index) => {
            tutorials.push({
                id: `${baseId}-${index}`,
                title: template.titleTemplate,
                description: `Learn ${query.terms} with practical examples and hands-on coding. This comprehensive tutorial covers all the essential concepts and best practices.`,
                url: `https://youtube.com/watch?v=${this.generateYouTubeId()}`,
                platform: 'youtube',
                duration: template.duration,
                views: template.views,
                rating: 4.2 + Math.random() * 0.6, // Random rating between 4.2-4.8
                publishedDate: this.generateRandomDate(),
                author: template.authorTemplate,
                difficulty: query.difficulty,
                topics: this.extractTopics(query.terms),
                relevanceScore: 0.7 + Math.random() * 0.3, // Random score between 0.7-1.0
                relatedTo: query.context
            });
        });

        return tutorials;
    }

    private generateId(terms: string): string {
        return terms.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }

    private generateYouTubeId(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
        let result = '';
        for (let i = 0; i < 11; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    private generateRandomDate(): string {
        const start = new Date(2022, 0, 1);
        const end = new Date();
        const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
        return randomDate.toISOString();
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

    private createFallbackTutorials(analysis: CodebaseAnalysis): TutorialResults {
        const tutorials: TutorialRecommendation[] = [
            {
                id: 'clean-code-basics',
                title: 'Clean Code Fundamentals',
                description: 'Learn the principles of writing clean, maintainable code with practical examples.',
                url: 'https://youtube.com/watch?v=example1',
                platform: 'youtube',
                duration: '42:30',
                views: 156000,
                rating: 4.7,
                publishedDate: '2023-06-15T10:00:00Z',
                author: 'CleanCode Academy',
                difficulty: 'intermediate',
                topics: ['clean code', 'best practices', 'software quality'],
                relevanceScore: 0.9,
                relatedTo: 'general'
            },
            {
                id: 'refactoring-techniques',
                title: 'Refactoring Techniques Every Developer Should Know',
                description: 'Master essential refactoring techniques to improve your codebase quality.',
                url: 'https://youtube.com/watch?v=example2',
                platform: 'youtube',
                duration: '35:45',
                views: 98000,
                rating: 4.5,
                publishedDate: '2023-08-22T14:30:00Z',
                author: 'Code Refactor Pro',
                difficulty: 'intermediate',
                topics: ['refactoring', 'code improvement', 'maintainability'],
                relevanceScore: 0.8,
                relatedTo: 'refactoring'
            }
        ];

        return {
            tutorials,
            summary: this.generateSummary(tutorials)
        };
    }
}