import axios from 'axios';
import { CodebaseAnalysis, CodeChunk } from './main';
import { LLMProvider } from '../llm/llmProvider';
import { RAGContextBuilder } from '../utils/RAGContextBuilder';

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
    private llmProvider?: LLMProvider;
    
    constructor(llmProvider?: LLMProvider) {
        this.llmProvider = llmProvider;
    }

    async findRelevantLibraries(analysis: CodebaseAnalysis, codeChunks: CodeChunk[]): Promise<LibraryResults> {
        try {
            // Step 1: Use LLM to analyze codebase and generate intelligent search queries
            const intelligentQueries = await this.generateIntelligentQueries(analysis, codeChunks);
            console.log('LibrarianAgent: LLM-generated intelligent queries:', intelligentQueries);
            
            const recommendations: LibraryRecommendation[] = [];

            // Search for libraries using LLM-generated queries
            for (const query of intelligentQueries) {
                try {
                    const repos = await this.searchGitHubRepos(query.searchTerm);
                    const processedRepos = await this.processRepositories(repos, analysis, query);
                    recommendations.push(...processedRepos);
                } catch (error) {
                    console.warn(`Failed to search for "${query.searchTerm}":`, error);
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
            // Fallback to basic analysis if LLM fails
            return this.getFallbackLibraryResults(analysis, codeChunks);
        }
    }

    private async generateIntelligentQueries(analysis: CodebaseAnalysis, codeChunks: CodeChunk[]): Promise<Array<{searchTerm: string, functionality: string, priority: 'high' | 'medium' | 'low', description: string}>> {
        if (!this.llmProvider) {
            console.warn('LibrarianAgent: No LLM provider available, using fallback query generation');
            return this.getFallbackQueries(analysis);
        }

        try {
            // Build rich context for LLM using shared RAG builder
            const codebaseContext = RAGContextBuilder.buildLibraryContext(analysis, codeChunks);
            
            const prompt = `You are an expert software architect and library curator. Analyze this codebase and generate intelligent library search queries that would add unique value and competitive advantages.

CODEBASE ANALYSIS:
${JSON.stringify(analysis, null, 2)}

CODE CONTEXT:
${codebaseContext}

TASK: Generate 5-7 specific, actionable library search queries that would:
1. Fill important functionality gaps in this codebase
2. Create competitive advantages and unique features
3. Improve performance, security, or user experience
4. Leverage modern technologies and best practices
5. Be practical and implementable with this technology stack

For each query, consider:
- What specific functionality is missing or could be enhanced?
- What would create the biggest business impact?
- What libraries would be findable with effective search terms?

Return ONLY a JSON array in this exact format:
[
    {
        "searchTerm": "specific searchable terms (2-4 words)",
        "functionality": "brief functionality category",
        "priority": "high|medium|low", 
        "description": "why this would create unique value for this project"
    }
]

Focus on practical, searchable terms that will find actual libraries, not overly specific phrases.`;

            const response = await this.llmProvider.generateResponse([
                { role: 'system', content: 'You are an expert software architect specializing in library recommendations. Return only valid JSON.' },
                { role: 'user', content: prompt }
            ], { temperature: 0.3, maxTokens: 800 });

            // Parse LLM response
            const queries = this.parseIntelligentQueries(response.content || '');
            console.log('LibrarianAgent: Generated', queries.length, 'intelligent queries via LLM');
            
            return queries.length > 0 ? queries : this.getFallbackQueries(analysis);
        } catch (error) {
            console.warn('LibrarianAgent: LLM query generation failed, using fallback:', error);
            return this.getFallbackQueries(analysis);
        }
    }


    private parseIntelligentQueries(llmResponse: string): Array<{searchTerm: string, functionality: string, priority: 'high' | 'medium' | 'low', description: string}> {
        try {
            // Try to extract JSON from response
            const jsonMatch = llmResponse.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('No JSON array found in response');
            }
            
            const queries = JSON.parse(jsonMatch[0]);
            
            // Validate structure
            if (!Array.isArray(queries)) {
                throw new Error('Response is not an array');
            }
            
            return queries.filter(q => 
                q.searchTerm && 
                q.functionality && 
                q.priority && 
                q.description &&
                ['high', 'medium', 'low'].includes(q.priority)
            );
        } catch (error) {
            console.warn('Failed to parse LLM response:', error);
            return [];
        }
    }

    private getFallbackQueries(analysis: CodebaseAnalysis): Array<{searchTerm: string, functionality: string, priority: 'high' | 'medium' | 'low', description: string}> {
        const queries = [];
        
        // Technology-specific fallback queries
        if (analysis.key_technologies.some(tech => tech.toLowerCase().includes('react'))) {
            queries.push({
                searchTerm: 'react performance optimization',
                functionality: 'Performance Enhancement',
                priority: 'high' as const,
                description: 'Optimize React app performance for better user experience'
            });
            queries.push({
                searchTerm: 'react state management',
                functionality: 'State Management',
                priority: 'medium' as const,
                description: 'Improve application state management architecture'
            });
        }
        
        if (analysis.project_type === 'web-app') {
            queries.push({
                searchTerm: 'web accessibility library',
                functionality: 'Accessibility',
                priority: 'high' as const,
                description: 'Make the application accessible to all users'
            });
            queries.push({
                searchTerm: 'progressive web app',
                functionality: 'Modern Web Features',
                priority: 'medium' as const,
                description: 'Add native app-like capabilities'
            });
        }
        
        // Generic quality improvements
        queries.push({
            searchTerm: 'javascript testing framework',
            functionality: 'Code Quality',
            priority: 'medium' as const,
            description: 'Improve code reliability through comprehensive testing'
        });
        
        return queries.slice(0, 5);
    }

    private getFallbackLibraryResults(analysis: CodebaseAnalysis, codeChunks: CodeChunk[]): LibraryResults {
        // Return basic fallback results
        return {
            recommendations: [],
            summary: {
                totalRecommendations: 0,
                byCategory: {},
                highRelevance: 0,
                easyIntegration: 0
            }
        };
    }

    private async analyzeFunctionalityGaps(analysis: CodebaseAnalysis, codeChunks: CodeChunk[]): Promise<any> {
        const functionality = {
            // User Experience Enhancements
            missingUXFeatures: [] as string[],
            
            // Performance Opportunities  
            performanceGaps: [] as string[],
            
            // Security Improvements
            securityNeeds: [] as string[],
            
            // Developer Experience
            devExperienceGaps: [] as string[],
            
            // Business Value Features
            businessValueGaps: [] as string[],
            
            // Modern Web Features
            modernWebGaps: [] as string[]
        };

        // Analyze based on project type and existing code
        if (analysis.project_type === 'web-app') {
            // UX Enhancement opportunities
            const hasModals = codeChunks.some(chunk => chunk.content.toLowerCase().includes('modal'));
            const hasToasts = codeChunks.some(chunk => chunk.content.toLowerCase().includes('toast') || chunk.content.toLowerCase().includes('notification'));
            const hasLoading = codeChunks.some(chunk => chunk.content.toLowerCase().includes('loading') || chunk.content.toLowerCase().includes('spinner'));
            const hasValidation = codeChunks.some(chunk => chunk.content.toLowerCase().includes('validation') || chunk.content.toLowerCase().includes('validate'));
            const hasSearch = codeChunks.some(chunk => chunk.content.toLowerCase().includes('search') || chunk.content.toLowerCase().includes('filter'));
            const hasDragDrop = codeChunks.some(chunk => chunk.content.toLowerCase().includes('drag') || chunk.content.toLowerCase().includes('drop'));
            
            if (!hasModals) functionality.missingUXFeatures.push('interactive-modals');
            if (!hasToasts) functionality.missingUXFeatures.push('notification-system');
            if (!hasLoading) functionality.missingUXFeatures.push('loading-states');
            if (!hasValidation) functionality.missingUXFeatures.push('form-validation');
            if (!hasSearch) functionality.missingUXFeatures.push('search-functionality');
            if (!hasDragDrop) functionality.missingUXFeatures.push('drag-drop-interactions');
            
            // Performance opportunities
            const hasLazyLoading = codeChunks.some(chunk => chunk.content.toLowerCase().includes('lazy'));
            const hasVirtualization = codeChunks.some(chunk => chunk.content.toLowerCase().includes('virtual'));
            const hasImageOptimization = codeChunks.some(chunk => chunk.content.toLowerCase().includes('image') && chunk.content.toLowerCase().includes('optimization'));
            
            if (!hasLazyLoading) functionality.performanceGaps.push('lazy-loading');
            if (!hasVirtualization) functionality.performanceGaps.push('virtualization');
            if (!hasImageOptimization) functionality.performanceGaps.push('image-optimization');
            
            // Modern web features
            const hasPWA = codeChunks.some(chunk => chunk.content.toLowerCase().includes('service-worker') || chunk.content.toLowerCase().includes('pwa'));
            const hasOffline = codeChunks.some(chunk => chunk.content.toLowerCase().includes('offline'));
            const hasWebRTC = codeChunks.some(chunk => chunk.content.toLowerCase().includes('webrtc'));
            
            if (!hasPWA) functionality.modernWebGaps.push('progressive-web-app');
            if (!hasOffline) functionality.modernWebGaps.push('offline-functionality');
            if (!hasWebRTC) functionality.modernWebGaps.push('real-time-communication');
            
            // Business value features
            const hasAnalytics = codeChunks.some(chunk => chunk.content.toLowerCase().includes('analytics') || chunk.content.toLowerCase().includes('tracking'));
            const hasA11y = codeChunks.some(chunk => chunk.content.toLowerCase().includes('accessibility') || chunk.content.toLowerCase().includes('aria'));
            const hasI18n = codeChunks.some(chunk => chunk.content.toLowerCase().includes('i18n') || chunk.content.toLowerCase().includes('internationalization'));
            
            if (!hasAnalytics) functionality.businessValueGaps.push('user-analytics');
            if (!hasA11y) functionality.businessValueGaps.push('accessibility');
            if (!hasI18n) functionality.businessValueGaps.push('internationalization');
        }

        // Security analysis
        const hasAuth = codeChunks.some(chunk => chunk.content.toLowerCase().includes('auth'));
        const hasEncryption = codeChunks.some(chunk => chunk.content.toLowerCase().includes('encrypt') || chunk.content.toLowerCase().includes('crypto'));
        const hasRateLimit = codeChunks.some(chunk => chunk.content.toLowerCase().includes('rate') && chunk.content.toLowerCase().includes('limit'));
        
        if (!hasAuth) functionality.securityNeeds.push('authentication-system');
        if (!hasEncryption) functionality.securityNeeds.push('data-encryption');
        if (!hasRateLimit) functionality.securityNeeds.push('rate-limiting');

        return functionality;
    }

    private generateFunctionalityBasedQueries(functionalityAnalysis: any, analysis: CodebaseAnalysis): Array<{searchTerm: string, functionality: string, priority: 'high' | 'medium' | 'low', description: string}> {
        const queries: Array<{searchTerm: string, functionality: string, priority: 'high' | 'medium' | 'low', description: string}> = [];
        
        // Focus on unique value propositions and differentiating features
        
        // UX Enhancement queries - focus on unique, standout features
        functionalityAnalysis.missingUXFeatures.forEach((feature: string) => {
            switch (feature) {
                case 'interactive-modals':
                    queries.push({
                        searchTerm: 'react modal dialog component',
                        functionality: 'Unique User Experience',
                        priority: 'high',
                        description: 'Create distinctive modal experiences that set your product apart'
                    });
                    break;
                case 'notification-system':
                    queries.push({
                        searchTerm: 'react toast notification',
                        functionality: 'Memorable User Feedback',
                        priority: 'high',
                        description: 'Implement unique notification patterns that users remember'
                    });
                    break;
                case 'drag-drop-interactions':
                    queries.push({
                        searchTerm: 'react drag drop library',
                        functionality: 'Engaging Interactions',
                        priority: 'medium',
                        description: 'Create delightful drag-drop experiences that wow users'
                    });
                    break;
                case 'search-functionality':
                    queries.push({
                        searchTerm: 'react search autocomplete',
                        functionality: 'Smart Discovery',
                        priority: 'high',
                        description: 'Add AI-powered search that understands user intent'
                    });
                    break;
            }
        });
        
        // Performance enhancement queries - focus on cutting-edge optimizations
        functionalityAnalysis.performanceGaps.forEach((gap: string) => {
            switch (gap) {
                case 'lazy-loading':
                    queries.push({
                        searchTerm: 'react lazy loading intersection observer',
                        functionality: 'Performance Excellence',
                        priority: 'high',
                        description: 'Implement next-gen loading strategies for superior performance'
                    });
                    break;
                case 'virtualization':
                    queries.push({
                        searchTerm: 'react virtual scroll list',
                        functionality: 'Scale Excellence',
                        priority: 'medium',
                        description: 'Handle massive datasets with enterprise-grade virtualization'
                    });
                    break;
                case 'image-optimization':
                    queries.push({
                        searchTerm: 'javascript image optimization webp',
                        functionality: 'Modern Performance',
                        priority: 'high',
                        description: 'Leverage latest image technologies for competitive advantage'
                    });
                    break;
            }
        });
        
        // Modern web features - focus on cutting-edge capabilities
        functionalityAnalysis.modernWebGaps.forEach((gap: string) => {
            switch (gap) {
                case 'progressive-web-app':
                    queries.push({
                        searchTerm: 'react PWA service worker',
                        functionality: 'App-like Experience',
                        priority: 'medium',
                        description: 'Transform into a native-quality web app'
                    });
                    break;
                case 'real-time-communication':
                    queries.push({
                        searchTerm: 'websocket real-time react',
                        functionality: 'Live Collaboration',
                        priority: 'medium',
                        description: 'Enable real-time collaboration features'
                    });
                    break;
            }
        });
        
        // Business value features - focus on competitive advantages
        functionalityAnalysis.businessValueGaps.forEach((gap: string) => {
            switch (gap) {
                case 'user-analytics':
                    queries.push({
                        searchTerm: 'react analytics tracking',
                        functionality: 'Intelligent Insights',
                        priority: 'high',
                        description: 'Gain deep user insights while respecting privacy'
                    });
                    break;
                case 'accessibility':
                    queries.push({
                        searchTerm: 'react accessibility a11y',
                        functionality: 'Universal Access',
                        priority: 'high',
                        description: 'Create inclusive experiences that reach everyone'
                    });
                    break;
                case 'internationalization':
                    queries.push({
                        searchTerm: 'react i18n internationalization',
                        functionality: 'Global Reach',
                        priority: 'medium',
                        description: 'Expand globally with smart localization'
                    });
                    break;
            }
        });
        
        // Add unique competitive features based on project type
        if (analysis.project_type === 'web-app') {
            queries.push({
                searchTerm: 'react animation library framer motion',
                functionality: 'Premium Experience',
                priority: 'high',
                description: 'Add premium micro-interactions that create emotional connection'
            });
            
            queries.push({
                searchTerm: 'javascript machine learning recommendation',
                functionality: 'AI-Powered Features',
                priority: 'medium',
                description: 'Integrate AI to personalize user experiences'
            });
        }
        
        return queries.slice(0, 8); // Increased to allow more unique suggestions
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
        // Return empty array - no fallback data
        return [];
    }

    private async processRepositories(repos: any[], analysis: CodebaseAnalysis, query: any): Promise<LibraryRecommendation[]> {
        const recommendations: LibraryRecommendation[] = [];

        for (const repo of repos) {
            try {
                const recommendation = await this.createRecommendation(repo, analysis, query);
                if (recommendation) {
                    recommendations.push(recommendation);
                }
            } catch (error) {
                console.warn(`Failed to process repo ${repo.full_name}:`, error);
            }
        }

        return recommendations;
    }

    private async createRecommendation(repo: any, analysis: CodebaseAnalysis, query?: any): Promise<LibraryRecommendation | null> {
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
            benefits: this.generateFunctionalityBenefits(repo, category, query),
            useCases: this.generateFunctionalityUseCases(repo, category, query),
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

    private generateFunctionalityBenefits(repo: any, category: LibraryRecommendation['category'], query?: any): string[] {
        const baseBenefits = [
            `${repo.stargazers_count.toLocaleString()} GitHub stars indicate community trust`,
            'Well-maintained open source project'
        ];

        if (query?.functionality && query?.description) {
            // Add functionality-specific benefits
            const functionalityBenefits = [
                query.description,
                `Enhances ${query.functionality.toLowerCase()}`,
                `Priority: ${query.priority} impact on user experience`
            ];
            
            // Add specific benefits based on functionality type
            if (query.functionality.includes('Performance')) {
                functionalityBenefits.push('Improves app speed and responsiveness');
            } else if (query.functionality.includes('User Interface')) {
                functionalityBenefits.push('Enhances user interaction and engagement');
            } else if (query.functionality.includes('Business')) {
                functionalityBenefits.push('Drives business value and user insights');
            } else if (query.functionality.includes('Modern Web')) {
                functionalityBenefits.push('Leverages latest web technologies');
            }
            
            return [...baseBenefits, ...functionalityBenefits];
        }

        // Fallback to category-based benefits
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

    private generateFunctionalityUseCases(repo: any, category: LibraryRecommendation['category'], query?: any): string[] {
        if (query?.functionality) {
            // Generate use cases based on functionality type
            const functionalityUseCases: { [key: string]: string[] } = {
                'User Interface Enhancement': [
                    'Improve user interaction patterns',
                    'Create engaging user experiences',
                    'Modernize interface components'
                ],
                'Performance Optimization': [
                    'Reduce loading times',
                    'Optimize resource usage',
                    'Improve perceived performance'
                ],
                'User Feedback System': [
                    'Notify users of actions',
                    'Provide status updates',
                    'Enhance user communication'
                ],
                'Interactive Features': [
                    'Enable drag-and-drop workflows',
                    'Create intuitive interactions',
                    'Improve data manipulation'
                ],
                'Data Discovery': [
                    'Enable powerful search capabilities',
                    'Implement filtering systems',
                    'Improve content findability'
                ],
                'Business Intelligence': [
                    'Track user behavior',
                    'Measure feature usage',
                    'Optimize conversion rates'
                ],
                'Accessibility': [
                    'Support screen readers',
                    'Ensure keyboard navigation',
                    'Meet WCAG guidelines'
                ],
                'Modern Web Features': [
                    'Enable offline functionality',
                    'Add app-like experience',
                    'Leverage modern browser APIs'
                ],
                'Real-time Features': [
                    'Enable live updates',
                    'Support collaborative features',
                    'Implement real-time communication'
                ]
            };

            return functionalityUseCases[query.functionality] || ['Enhance application functionality'];
        }

        // Fallback to category-based use cases
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

}