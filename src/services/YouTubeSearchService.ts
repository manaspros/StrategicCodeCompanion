import { TutorialRecommendation } from '../agents/TutorAgent';

interface CuratedVideo {
    id: string;
    title: string;
    description: string;
    url: string;
    thumbnailUrl: string;
    duration: string;
    views: number;
    rating: number;
    publishedDate: string;
    author: string;
    channel: string;
    tags: string[];
}

export class YouTubeSearchService {
    private static curatedVideos: CuratedVideo[] = [
        // JavaScript & TypeScript
        {
            id: 'js-advanced-concepts',
            title: 'Advanced JavaScript Concepts: Closures, Hoisting, and Event Loop',
            description: 'Deep dive into advanced JavaScript concepts that every developer needs to master for professional development.',
            url: 'https://www.youtube.com/watch?v=Bv_5Zv5c-Ts',
            thumbnailUrl: 'https://img.youtube.com/vi/Bv_5Zv5c-Ts/maxresdefault.jpg',
            duration: '28:45',
            views: 156000,
            rating: 4.8,
            publishedDate: '2024-01-15',
            author: 'Codevolution',
            channel: 'Codevolution',
            tags: ['javascript', 'advanced', 'concepts', 'closures', 'hoisting']
        },
        {
            id: 'typescript-mastery',
            title: 'TypeScript Complete Course: From Beginner to Advanced',
            description: 'Complete TypeScript tutorial covering basics to advanced features like generics, decorators, and advanced types.',
            url: 'https://www.youtube.com/watch?v=BwuLxPH8IDs',
            thumbnailUrl: 'https://img.youtube.com/vi/BwuLxPH8IDs/maxresdefault.jpg',
            duration: '2:31:28',
            views: 487000,
            rating: 4.9,
            publishedDate: '2023-11-20',
            author: 'Programming with Mosh',
            channel: 'Programming with Mosh',
            tags: ['typescript', 'complete-course', 'generics', 'advanced-types', 'decorators']
        },
        {
            id: 'ts-advanced-types',
            title: 'TypeScript Advanced Types and Generic Programming',
            description: 'Master TypeScript advanced type system: conditional types, mapped types, utility types, and complex generic patterns.',
            url: 'https://www.youtube.com/watch?v=2lCCKiWGlC0',
            thumbnailUrl: 'https://img.youtube.com/vi/2lCCKiWGlC0/maxresdefault.jpg',
            duration: '45:30',
            views: 125000,
            rating: 4.8,
            publishedDate: '2024-01-10',
            author: 'Matt Pocock',
            channel: 'Total TypeScript',
            tags: ['typescript', 'advanced-types', 'generics', 'conditional-types', 'mapped-types']
        },
        // React
        {
            id: 'react-performance',
            title: 'React Performance Optimization: Complete Guide',
            description: 'Learn React performance optimization techniques: memoization, code splitting, lazy loading, and concurrent features.',
            url: 'https://www.youtube.com/watch?v=5fLW5Q5ODiE',
            thumbnailUrl: 'https://img.youtube.com/vi/5fLW5Q5ODiE/maxresdefault.jpg',
            duration: '42:15',
            views: 234000,
            rating: 4.9,
            publishedDate: '2024-01-25',
            author: 'Jack Herrington',
            channel: 'Jack Herrington',
            tags: ['react', 'performance', 'optimization', 'memoization', 'code-splitting']
        },
        {
            id: 'react-concurrent',
            title: 'React 18 Concurrent Features: Suspense and Streaming',
            description: 'Explore React 18 concurrent rendering, Suspense for data fetching, streaming SSR, and advanced patterns.',
            url: 'https://www.youtube.com/watch?v=N0Ve0RogFMs',
            thumbnailUrl: 'https://img.youtube.com/vi/N0Ve0RogFMs/maxresdefault.jpg',
            duration: '38:45',
            views: 89000,
            rating: 4.9,
            publishedDate: '2024-02-08',
            author: 'Ben Holmes',
            channel: 'Ben Holmes',
            tags: ['react', 'concurrent', 'suspense', 'streaming', 'react-18']
        },
        {
            id: 'react-hooks-advanced',
            title: 'Advanced React Hooks: Custom Hooks and Optimization',
            description: 'Master advanced React hooks patterns: custom hooks, useReducer, useContext optimization, and complex state management.',
            url: 'https://www.youtube.com/watch?v=O4J_-hoQmFs',
            thumbnailUrl: 'https://img.youtube.com/vi/O4J_-hoQmFs/maxresdefault.jpg',
            duration: '52:20',
            views: 178000,
            rating: 4.8,
            publishedDate: '2023-12-15',
            author: 'Codevolution',
            channel: 'Codevolution',
            tags: ['react', 'hooks', 'custom-hooks', 'useReducer', 'optimization']
        },
        // Web Performance
        {
            id: 'web-performance',
            title: 'Web Performance Optimization: Core Web Vitals Masterclass',
            description: 'Complete guide to web performance: Core Web Vitals, Lighthouse optimization, loading strategies, and modern techniques.',
            url: 'https://www.youtube.com/watch?v=YJGCZCaIZkQ',
            thumbnailUrl: 'https://img.youtube.com/vi/YJGCZCaIZkQ/maxresdefault.jpg',
            duration: '41:20',
            views: 156000,
            rating: 4.9,
            publishedDate: '2024-01-30',
            author: 'Steve Griffith',
            channel: 'Steve Griffith - Prof3ssorSt3v3',
            tags: ['performance', 'web-vitals', 'optimization', 'lighthouse', 'loading']
        },
        // Testing
        {
            id: 'testing-strategies',
            title: 'Testing Strategies: Unit, Integration & E2E Testing',
            description: 'Learn comprehensive testing strategies: Jest, React Testing Library, Cypress, TDD principles, and testing best practices.',
            url: 'https://www.youtube.com/watch?v=r9HdJ8P6GQI',
            thumbnailUrl: 'https://img.youtube.com/vi/r9HdJ8P6GQI/maxresdefault.jpg',
            duration: '45:20',
            views: 120000,
            rating: 4.7,
            publishedDate: '2024-01-12',
            author: 'Kent C. Dodds',
            channel: 'Kent C. Dodds',
            tags: ['testing', 'jest', 'react-testing-library', 'tdd', 'cypress']
        },
        // Security
        {
            id: 'web-security',
            title: 'Web Security: Complete Guide to Secure Applications',
            description: 'Learn web security fundamentals: OWASP Top 10, authentication, authorization, CSRF protection, and secure coding practices.',
            url: 'https://www.youtube.com/watch?v=F7exs_6YrJg',
            thumbnailUrl: 'https://img.youtube.com/vi/F7exs_6YrJg/maxresdefault.jpg',
            duration: '35:30',
            views: 95000,
            rating: 4.6,
            publishedDate: '2023-12-05',
            author: 'Traversy Media',
            channel: 'Traversy Media',
            tags: ['security', 'owasp', 'authentication', 'authorization', 'secure-coding']
        },
        // Architecture
        {
            id: 'clean-architecture',
            title: 'Clean Architecture: Building Maintainable Software',
            description: 'Learn clean architecture principles, SOLID design patterns, dependency injection, and building scalable applications.',
            url: 'https://www.youtube.com/watch?v=CnailTcJV_U',
            thumbnailUrl: 'https://img.youtube.com/vi/CnailTcJV_U/maxresdefault.jpg',
            duration: '47:30',
            views: 203000,
            rating: 4.8,
            publishedDate: '2023-11-25',
            author: 'Uncle Bob',
            channel: 'Clean Coders',
            tags: ['architecture', 'clean-code', 'solid', 'design-patterns', 'maintainable']
        },
        // Accessibility
        {
            id: 'web-accessibility',
            title: 'Web Accessibility: WCAG Guidelines and Implementation',
            description: 'Master web accessibility: WCAG 2.1 guidelines, screen readers, keyboard navigation, and inclusive design principles.',
            url: 'https://www.youtube.com/watch?v=ysVOUnWZz58',
            thumbnailUrl: 'https://img.youtube.com/vi/ysVOUnWZz58/maxresdefault.jpg',
            duration: '35:45',
            views: 78000,
            rating: 4.8,
            publishedDate: '2024-01-08',
            author: 'Marcy Sutton',
            channel: 'Marcy Sutton',
            tags: ['accessibility', 'wcag', 'screen-readers', 'inclusive-design', 'a11y']
        },
        // Node.js & Backend
        {
            id: 'nodejs-advanced',
            title: 'Node.js Advanced Concepts: Event Loop, Clustering & Performance',
            description: 'Deep dive into Node.js internals: event loop, clustering, worker threads, performance optimization, and scalability.',
            url: 'https://www.youtube.com/watch?v=PNa9OMajw9w',
            thumbnailUrl: 'https://img.youtube.com/vi/PNa9OMajw9w/maxresdefault.jpg',
            duration: '1:15:30',
            views: 167000,
            rating: 4.7,
            publishedDate: '2023-10-20',
            author: 'Stephen Grider',
            channel: 'Stephen Grider',
            tags: ['nodejs', 'event-loop', 'clustering', 'performance', 'scalability']
        }
    ];

    /**
     * Search for tutorials based on topics and difficulty
     */
    static searchTutorials(topics: string[], difficulty?: string, limit: number = 5): TutorialRecommendation[] {
        const normalizedTopics = topics.map(topic => topic.toLowerCase());
        
        // Score and rank videos based on topic relevance
        const scoredVideos = this.curatedVideos.map(video => {
            let score = 0;
            
            // Check title and description for topic matches
            const searchText = `${video.title} ${video.description} ${video.tags.join(' ')}`.toLowerCase();
            
            normalizedTopics.forEach(topic => {
                // Exact tag match gets highest score
                if (video.tags.some(tag => tag.includes(topic) || topic.includes(tag))) {
                    score += 10;
                }
                // Title match gets good score
                if (video.title.toLowerCase().includes(topic)) {
                    score += 8;
                }
                // Description match gets moderate score
                if (video.description.toLowerCase().includes(topic)) {
                    score += 5;
                }
                // Partial matches in any text
                if (searchText.includes(topic)) {
                    score += 3;
                }
            });
            
            // Boost score based on video quality metrics
            if (video.rating >= 4.8) score += 2;
            if (video.views >= 100000) score += 2;
            if (video.views >= 200000) score += 1;
            
            return { video, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score);
        
        // Convert to TutorialRecommendation format
        const recommendations: TutorialRecommendation[] = scoredVideos
            .slice(0, limit)
            .map((item, index) => ({
                id: item.video.id,
                title: item.video.title,
                description: item.video.description,
                url: item.video.url,
                thumbnailUrl: item.video.thumbnailUrl,
                platform: 'youtube' as const,
                duration: item.video.duration,
                views: item.video.views,
                rating: item.video.rating,
                publishedDate: item.video.publishedDate,
                author: item.video.author,
                difficulty: this.mapDifficultyFromContent(item.video.title, item.video.description) || (difficulty as 'beginner' | 'intermediate' | 'advanced') || 'intermediate',
                topics: normalizedTopics,
                relevanceScore: Math.min(0.95, 0.7 + (item.score / 50)), // Convert score to 0.7-0.95 range
                relatedTo: this.determineRelation(normalizedTopics)
            }));
            
        return recommendations;
    }

    /**
     * Get tutorial by specific topic with intelligent matching
     */
    static getTutorialByTopic(topic: string, difficulty?: string): TutorialRecommendation | null {
        const results = this.searchTutorials([topic], difficulty, 1);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Get curated tutorials for common programming topics
     */
    static getCuratedTutorialsForTopics(topics: string[]): TutorialRecommendation[] {
        const recommendations: TutorialRecommendation[] = [];
        
        topics.forEach(topic => {
            const tutorial = this.getTutorialByTopic(topic);
            if (tutorial && !recommendations.find(r => r.id === tutorial.id)) {
                recommendations.push(tutorial);
            }
        });
        
        // If we don't have enough, add some high-quality general recommendations
        if (recommendations.length < 3) {
            const generalRecs = this.getHighQualityRecommendations(5 - recommendations.length);
            generalRecs.forEach(rec => {
                if (!recommendations.find(r => r.id === rec.id)) {
                    recommendations.push(rec);
                }
            });
        }
        
        return recommendations;
    }

    /**
     * Get high-quality general recommendations
     */
    static getHighQualityRecommendations(limit: number = 5): TutorialRecommendation[] {
        const highQualityVideos = this.curatedVideos
            .filter(video => video.rating >= 4.7 && video.views >= 100000)
            .sort((a, b) => b.rating - a.rating)
            .slice(0, limit);
            
        return highQualityVideos.map(video => ({
            id: video.id,
            title: video.title,
            description: video.description,
            url: video.url,
            thumbnailUrl: video.thumbnailUrl,
            platform: 'youtube' as const,
            duration: video.duration,
            views: video.views,
            rating: video.rating,
            publishedDate: video.publishedDate,
            author: video.author,
            difficulty: this.mapDifficultyFromContent(video.title, video.description) || 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
            topics: video.tags,
            relevanceScore: 0.85,
            relatedTo: 'general' as const
        }));
    }

    private static mapDifficultyFromContent(title: string, description: string): 'beginner' | 'intermediate' | 'advanced' | null {
        const content = `${title} ${description}`.toLowerCase();
        
        if (content.includes('beginner') || content.includes('basics') || content.includes('introduction') || content.includes('getting started')) {
            return 'beginner';
        }
        if (content.includes('advanced') || content.includes('mastery') || content.includes('expert') || content.includes('deep dive')) {
            return 'advanced';
        }
        if (content.includes('intermediate') || content.includes('complete') || content.includes('comprehensive')) {
            return 'intermediate';
        }
        
        return null;
    }

    private static determineRelation(topics: string[]): 'refactoring' | 'architecture' | 'general' {
        const topicString = topics.join(' ').toLowerCase();
        
        if (topicString.includes('refactor') || topicString.includes('clean') || topicString.includes('code-quality')) {
            return 'refactoring';
        }
        if (topicString.includes('architecture') || topicString.includes('design') || topicString.includes('patterns')) {
            return 'architecture';
        }
        
        return 'general';
    }
}