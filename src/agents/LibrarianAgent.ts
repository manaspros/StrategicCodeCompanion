import axios from 'axios';
import { CodebaseAnalysis, CodeChunk } from './main';

export interface LibraryRecommendation {
    id: string;
    name: string;
    description: string;
    githubUrl: string;
    npmUrl?: string;
    stars: number;
    forks: number;
    lastUpdated: string;
    language: string;
    license: string;
    category: 'utility' | 'framework' | 'testing' | 'build-tool' | 'ui-component' | 'data-processing' | 'security' | 'performance';
    relevanceScore: number;
    integrationEffort: 'low' | 'medium' | 'high';
    benefits: string[];
    useCases: string[];
    alternatives: string[];
}

export interface LibraryResults {
    recommendations: LibraryRecommendation[];
    summary: {
        totalRecommendations: number;
        byCategory: { [key: string]: number };
        highRelevance: number;
        easyIntegration: number;
    };
}

export class LibrarianAgent {
    private static readonly GITHUB_API_BASE = 'https://api.github.com';
    
    constructor() {}

    async findRelevantLibraries(analysis: CodebaseAnalysis, codeChunks: CodeChunk[]): Promise<LibraryResults> {
        try {
            // Analyze actual code patterns to suggest relevant libraries
            const codePatterns = this.analyzeCodePatterns(codeChunks, analysis);
            const searchQueries = this.generateSmartSearchQueries(analysis, codePatterns);
            const recommendations: LibraryRecommendation[] = [];

            console.log('LibrarianAgent: Generated search queries:', searchQueries);

            // Search for repositories for each query
            for (const query of searchQueries) {
                try {
                    const repos = await this.searchGitHubRepos(query);
                    const processedRepos = await this.processRepositories(repos, analysis, codePatterns);
                    recommendations.push(...processedRepos);
                } catch (error) {
                    console.warn(`Failed to search for "${query}":`, error);
                }
            }

            // Remove duplicates and sort by relevance
            const uniqueRecommendations = this.deduplicateAndRank(recommendations);
            const topRecommendations = uniqueRecommendations.slice(0, 8);

            return {
                recommendations: topRecommendations,
                summary: this.generateSummary(topRecommendations)
            };
        } catch (error) {
            console.error('Failed to find relevant libraries:', error);
            return this.createFallbackRecommendations(analysis);
        }
    }

    private analyzeCodePatterns(codeChunks: CodeChunk[], analysis: CodebaseAnalysis): any {
        const patterns = {
            hasAnimation: false,
            hasAPI: false,
            hasDataVisualization: false,
            hasFormHandling: false,
            hasRouting: false,
            hasStateManagement: false,
            hasTesting: false,
            hasAuthentication: false,
            hasFileUpload: false,
            hasRealTime: false,
            missingFeatures: [] as string[]
        };

        // Analyze code for patterns
        codeChunks.forEach(chunk => {
            const content = chunk.content.toLowerCase();
            
            // Animation libraries
            if (content.includes('gsap') || content.includes('animation') || content.includes('transition')) {
                patterns.hasAnimation = true;
            }
            
            // API handling
            if (content.includes('fetch') || content.includes('axios') || content.includes('api')) {
                patterns.hasAPI = true;
            }
            
            // Forms
            if (content.includes('form') || content.includes('input') || content.includes('validation')) {
                patterns.hasFormHandling = true;
            }
            
            // Routing
            if (content.includes('router') || content.includes('route') || content.includes('navigate')) {
                patterns.hasRouting = true;
            }
            
            // State management
            if (content.includes('usestate') || content.includes('redux') || content.includes('zustand')) {
                patterns.hasStateManagement = true;
            }
            
            // Testing
            if (content.includes('test') || content.includes('spec') || content.includes('jest')) {
                patterns.hasTesting = true;
            }
            
            // Authentication
            if (content.includes('auth') || content.includes('login') || content.includes('user')) {
                patterns.hasAuthentication = true;
            }
        });

        // Identify missing features that could be valuable
        if (!patterns.hasTesting) patterns.missingFeatures.push('testing');
        if (!patterns.hasAuthentication && analysis.project_type === 'web-app') patterns.missingFeatures.push('authentication');
        if (!patterns.hasStateManagement && analysis.key_technologies.includes('React')) patterns.missingFeatures.push('state-management');

        return patterns;
    }

    private generateSmartSearchQueries(analysis: CodebaseAnalysis, codePatterns: any): string[] {
        const queries: string[] = [];
        const tech = analysis.key_technologies.join(' ').toLowerCase();
        
        // Base on actual project needs and missing features
        if (analysis.project_type === 'web-app') {
            if (analysis.key_technologies.includes('React')) {
                // React-specific enhancement libraries
                queries.push('react performance optimization library');
                queries.push('react animation library');
                queries.push('react ui component library');
                queries.push('react form validation library');
                
                if (!codePatterns.hasTesting) {
                    queries.push('react testing library');
                }
                
                if (!codePatterns.hasStateManagement) {
                    queries.push('react state management zustand');
                }
            }
            
            // Web app enhancements
            queries.push('web accessibility library');
            queries.push('progressive web app library');
            queries.push('web performance monitoring');
            queries.push('user analytics library');
        }
        
        // Add unique feature suggestions
        queries.push('innovative web features library');
        queries.push('modern web development tools');
        queries.push('creative user experience library');
        
        return queries;
    }

    private generateSearchQueries(analysis: CodebaseAnalysis): string[] {
        const queries: string[] = [];
        const technologies = analysis.key_technologies;
        const projectType = analysis.project_type;

        // Technology-specific queries
        if (technologies.includes('javascript') || technologies.includes('typescript')) {
            queries.push('javascript utility library');
            queries.push('typescript helper functions');
            
            if (projectType === 'web-app') {
                queries.push('react components library');
                queries.push('javascript state management');
            }
        }

        if (technologies.includes('python')) {
            queries.push('python utility library');
            queries.push('python data processing');
        }

        if (technologies.includes('java')) {
            queries.push('java utility library');
            queries.push('spring boot extensions');
        }

        // Project-type specific queries
        switch (projectType) {
            case 'web-app':
                queries.push('web development tools');
                queries.push('frontend utility library');
                break;
            case 'api':
                queries.push('api development tools');
                queries.push('backend utility library');
                break;
            case 'cli-tool':
                queries.push('command line interface library');
                queries.push('cli development tools');
                break;
            case 'library':
                queries.push('library development tools');
                queries.push('package development utility');
                break;
        }

        // Quality-based queries
        if (analysis.code_quality_metrics.testability < 7) {
            queries.push('testing framework library');
            queries.push('test utility library');
        }

        if (analysis.complexity_score > 7) {
            queries.push('code complexity tools');
            queries.push('refactoring utility library');
        }

        return queries.slice(0, 6); // Limit to avoid rate limits
    }

    private async searchGitHubRepos(query: string): Promise<any[]> {
        try {
            // Enhanced search with better filters
            const searchQuery = `${query} stars:>500 language:javascript language:typescript pushed:>2023-01-01`;
            
            const response = await axios.get(`${LibrarianAgent.GITHUB_API_BASE}/search/repositories`, {
                params: {
                    q: searchQuery,
                    sort: 'stars',
                    order: 'desc',
                    per_page: 8
                },
                timeout: 15000,
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Strategic-Code-Companion'
                }
            });

            console.log(`LibrarianAgent: Found ${response.data.items?.length || 0} repos for "${query}"`);
            return response.data.items || [];
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 403) {
                console.warn('GitHub API rate limit reached, using fallback data');
                return this.getFallbackRepos(query);
            }
            throw error;
        }
    }

    private getFallbackRepos(query: string): any[] {
        // Curated list of high-quality, innovative libraries
        const fallbackLibraries = [
            {
                id: '1',
                name: 'framer-motion',
                description: 'A production-ready motion library for React. Utilize the power behind Framer, the best prototyping tool for teams.',
                html_url: 'https://github.com/framer/motion',
                stargazers_count: 22000,
                forks_count: 820,
                language: 'TypeScript',
                updated_at: '2024-01-15T10:30:00Z',
                license: { name: 'MIT License' }
            },
            {
                id: '2',
                name: 'react-hook-form',
                description: 'Performant, flexible and extensible forms with easy validation.',
                html_url: 'https://github.com/react-hook-form/react-hook-form',
                stargazers_count: 39000,
                forks_count: 1960,
                language: 'TypeScript',
                updated_at: '2024-01-10T14:20:00Z',
                license: { name: 'MIT License' }
            },
            {
                id: '3',
                name: 'zustand',
                description: 'A small, fast and scalable bearbones state-management solution using simplified flux principles.',
                html_url: 'https://github.com/pmndrs/zustand',
                stargazers_count: 35000,
                forks_count: 1080,
                language: 'TypeScript',
                updated_at: '2024-01-12T09:15:00Z',
                license: { name: 'MIT License' }
            },
            {
                id: '4',
                name: 'react-query',
                description: 'Hooks for fetching, caching and updating asynchronous data in React.',
                html_url: 'https://github.com/TanStack/query',
                stargazers_count: 38000,
                forks_count: 2600,
                language: 'TypeScript',
                updated_at: '2024-01-08T16:45:00Z',
                license: { name: 'MIT License' }
            }
        ];

        // Filter based on query relevance
        return fallbackLibraries.filter(lib => {
            const queryWords = query.toLowerCase().split(' ');
            const libText = `${lib.name} ${lib.description}`.toLowerCase();
            return queryWords.some(word => libText.includes(word));
        }).slice(0, 3);
    }

    private async processRepositories(repos: any[], analysis: CodebaseAnalysis, codePatterns: any): Promise<LibraryRecommendation[]> {
        const recommendations: LibraryRecommendation[] = [];

        for (const repo of repos) {
            try {
                const recommendation = await this.createRecommendation(repo, analysis);
                if (recommendation) {
                    recommendations.push(recommendation);
                }
            } catch (error) {
                console.warn(`Failed to process repo ${repo.full_name}:`, error);
            }
        }

        return recommendations;
    }

    private async createRecommendation(repo: any, analysis: CodebaseAnalysis): Promise<LibraryRecommendation | null> {
        // Calculate relevance score based on various factors
        const relevanceScore = this.calculateRelevanceScore(repo, analysis);
        
        if (relevanceScore < 0.3) {
            return null; // Skip low-relevance repositories
        }

        const category = this.categorizeRepository(repo);
        const integrationEffort = this.assessIntegrationEffort(repo, analysis);

        return {
            id: repo.id.toString(),
            name: repo.name,
            description: repo.description || 'No description available',
            githubUrl: repo.html_url,
            npmUrl: this.generateNpmUrl(repo),
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            lastUpdated: repo.updated_at,
            language: repo.language || 'Unknown',
            license: repo.license?.name || 'Unknown',
            category,
            relevanceScore: Math.round(relevanceScore * 100) / 100,
            integrationEffort,
            benefits: this.generateBenefits(repo, category),
            useCases: this.generateUseCases(repo, category),
            alternatives: [] // Could be enhanced with more API calls
        };
    }

    private calculateRelevanceScore(repo: any, analysis: CodebaseAnalysis): number {
        let score = 0;
        
        // Technology match boost
        const repoText = `${repo.name} ${repo.description || ''}`.toLowerCase();
        analysis.key_technologies.forEach(tech => {
            if (repoText.includes(tech.toLowerCase())) {
                score += 0.3;
            }
        });
        
        // Project type relevance
        if (analysis.project_type === 'web-app') {
            if (repoText.includes('react') || repoText.includes('web') || repoText.includes('ui')) {
                score += 0.2;
            }
        }
        
        // Popularity score (stars)
        if (repo.stargazers_count > 10000) score += 0.3;
        else if (repo.stargazers_count > 5000) score += 0.2;
        else if (repo.stargazers_count > 1000) score += 0.1;
        
        // Recent activity
        const lastUpdate = new Date(repo.updated_at);
        const monthsOld = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsOld < 3) score += 0.2;
        else if (monthsOld < 12) score += 0.1;
        
        // Language match
        if (repo.language && analysis.key_technologies.some(tech => 
            tech.toLowerCase().includes(repo.language.toLowerCase()) || 
            repo.language.toLowerCase().includes(tech.toLowerCase())
        )) {
            score += 0.2;
        }
        
        return Math.min(score, 1.0);
    }

    private categorizeRepository(repo: any): LibraryRecommendation['category'] {
        const name = repo.name.toLowerCase();
        const description = repo.description?.toLowerCase() || '';
        const combined = `${name} ${description}`;

        if (combined.includes('test') || combined.includes('jest') || combined.includes('mocha')) {
            return 'testing';
        }
        if (combined.includes('build') || combined.includes('webpack') || combined.includes('rollup')) {
            return 'build-tool';
        }
        if (combined.includes('react') || combined.includes('vue') || combined.includes('component')) {
            return 'ui-component';
        }
        if (combined.includes('data') || combined.includes('parser') || combined.includes('csv')) {
            return 'data-processing';
        }
        if (combined.includes('security') || combined.includes('auth') || combined.includes('crypto')) {
            return 'security';
        }
        if (combined.includes('performance') || combined.includes('optimize') || combined.includes('cache')) {
            return 'performance';
        }
        if (combined.includes('framework') || combined.includes('express') || combined.includes('fastify')) {
            return 'framework';
        }

        return 'utility';
    }

    private assessIntegrationEffort(repo: any, analysis: CodebaseAnalysis): 'low' | 'medium' | 'high' {
        // Simple heuristic based on popularity and language match
        if (analysis.key_technologies.includes(repo.language?.toLowerCase()) && repo.stargazers_count > 5000) {
            return 'low';
        }
        if (repo.stargazers_count > 1000) {
            return 'medium';
        }
        return 'high';
    }

    private generateBenefits(repo: any, category: LibraryRecommendation['category']): string[] {
        const baseBenefits = [
            `${repo.stargazers_count.toLocaleString()} GitHub stars indicate community trust`,
            'Well-maintained open source project'
        ];

        const categoryBenefits: { [key: string]: string[] } = {
            'utility': ['Reduces boilerplate code', 'Saves development time'],
            'framework': ['Structured development approach', 'Built-in best practices'],
            'testing': ['Improves code quality', 'Automated testing capabilities'],
            'build-tool': ['Optimized build process', 'Better developer experience'],
            'ui-component': ['Consistent UI components', 'Faster UI development'],
            'data-processing': ['Efficient data handling', 'Reduced complexity'],
            'security': ['Enhanced application security', 'Industry-standard practices'],
            'performance': ['Improved application speed', 'Better resource utilization']
        };

        return [...baseBenefits, ...(categoryBenefits[category] || [])];
    }

    private generateUseCases(repo: any, category: LibraryRecommendation['category']): string[] {
        const categoryUseCases: { [key: string]: string[] } = {
            'utility': ['General purpose development', 'Code simplification'],
            'framework': ['Application architecture', 'Rapid prototyping'],
            'testing': ['Unit testing', 'Integration testing', 'Test automation'],
            'build-tool': ['Build optimization', 'Asset bundling', 'Development workflow'],
            'ui-component': ['User interface development', 'Design system implementation'],
            'data-processing': ['Data transformation', 'API integration', 'Data validation'],
            'security': ['Authentication', 'Authorization', 'Data protection'],
            'performance': ['Performance optimization', 'Caching', 'Resource management']
        };

        return categoryUseCases[category] || ['General development tasks'];
    }

    private generateNpmUrl(repo: any): string | undefined {
        // Simple heuristic to generate npm URL
        if (repo.language === 'JavaScript' || repo.language === 'TypeScript') {
            return `https://www.npmjs.com/package/${repo.name}`;
        }
        return undefined;
    }

    private deduplicateAndRank(recommendations: LibraryRecommendation[]): LibraryRecommendation[] {
        // Remove duplicates by name and sort by relevance score
        const seen = new Set<string>();
        const unique = recommendations.filter(rec => {
            if (seen.has(rec.name)) {
                return false;
            }
            seen.add(rec.name);
            return true;
        });

        return unique.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    private generateSummary(recommendations: LibraryRecommendation[]) {
        const byCategory: { [key: string]: number } = {};
        let highRelevance = 0;
        let easyIntegration = 0;

        recommendations.forEach(rec => {
            byCategory[rec.category] = (byCategory[rec.category] || 0) + 1;
            if (rec.relevanceScore >= 0.7) highRelevance++;
            if (rec.integrationEffort === 'low') easyIntegration++;
        });

        return {
            totalRecommendations: recommendations.length,
            byCategory,
            highRelevance,
            easyIntegration
        };
    }

    private createFallbackRecommendations(analysis: CodebaseAnalysis): LibraryResults {
        const recommendations: LibraryRecommendation[] = [
            {
                id: 'lodash',
                name: 'lodash',
                description: 'A modern JavaScript utility library delivering modularity, performance & extras.',
                githubUrl: 'https://github.com/lodash/lodash',
                npmUrl: 'https://www.npmjs.com/package/lodash',
                stars: 55000,
                forks: 6700,
                lastUpdated: new Date().toISOString(),
                language: 'JavaScript',
                license: 'MIT',
                category: 'utility',
                relevanceScore: 0.9,
                integrationEffort: 'low',
                benefits: ['Reduces boilerplate code', 'Well-tested utility functions', 'Wide community adoption'],
                useCases: ['Data manipulation', 'Array/Object operations', 'Functional programming'],
                alternatives: ['Ramda', 'Underscore.js']
            }
        ];

        return {
            recommendations,
            summary: this.generateSummary(recommendations)
        };
    }
}