"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibrarianAgent = void 0;
const axios_1 = __importDefault(require("axios"));
class LibrarianAgent {
    constructor() { }
    async findRelevantLibraries(analysis, codeChunks) {
        try {
            // Step 1: Analyze functionality gaps and potential improvements
            const functionalityAnalysis = await this.analyzeFunctionalityGaps(analysis, codeChunks);
            console.log('LibrarianAgent: Functionality analysis:', functionalityAnalysis);
            // Step 2: Generate targeted searches based on functionality needs
            const functionalityQueries = this.generateFunctionalityBasedQueries(functionalityAnalysis, analysis);
            console.log('LibrarianAgent: Functionality-based queries:', functionalityQueries);
            const recommendations = [];
            // Search for libraries that add specific functionality
            for (const query of functionalityQueries) {
                try {
                    const repos = await this.searchGitHubRepos(query.searchTerm);
                    const processedRepos = await this.processRepositories(repos, analysis, query);
                    recommendations.push(...processedRepos);
                }
                catch (error) {
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
        }
        catch (error) {
            console.error('Failed to find relevant libraries:', error);
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
    }
    async analyzeFunctionalityGaps(analysis, codeChunks) {
        const functionality = {
            // User Experience Enhancements
            missingUXFeatures: [],
            // Performance Opportunities  
            performanceGaps: [],
            // Security Improvements
            securityNeeds: [],
            // Developer Experience
            devExperienceGaps: [],
            // Business Value Features
            businessValueGaps: [],
            // Modern Web Features
            modernWebGaps: []
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
            if (!hasModals)
                functionality.missingUXFeatures.push('interactive-modals');
            if (!hasToasts)
                functionality.missingUXFeatures.push('notification-system');
            if (!hasLoading)
                functionality.missingUXFeatures.push('loading-states');
            if (!hasValidation)
                functionality.missingUXFeatures.push('form-validation');
            if (!hasSearch)
                functionality.missingUXFeatures.push('search-functionality');
            if (!hasDragDrop)
                functionality.missingUXFeatures.push('drag-drop-interactions');
            // Performance opportunities
            const hasLazyLoading = codeChunks.some(chunk => chunk.content.toLowerCase().includes('lazy'));
            const hasVirtualization = codeChunks.some(chunk => chunk.content.toLowerCase().includes('virtual'));
            const hasImageOptimization = codeChunks.some(chunk => chunk.content.toLowerCase().includes('image') && chunk.content.toLowerCase().includes('optimization'));
            if (!hasLazyLoading)
                functionality.performanceGaps.push('lazy-loading');
            if (!hasVirtualization)
                functionality.performanceGaps.push('virtualization');
            if (!hasImageOptimization)
                functionality.performanceGaps.push('image-optimization');
            // Modern web features
            const hasPWA = codeChunks.some(chunk => chunk.content.toLowerCase().includes('service-worker') || chunk.content.toLowerCase().includes('pwa'));
            const hasOffline = codeChunks.some(chunk => chunk.content.toLowerCase().includes('offline'));
            const hasWebRTC = codeChunks.some(chunk => chunk.content.toLowerCase().includes('webrtc'));
            if (!hasPWA)
                functionality.modernWebGaps.push('progressive-web-app');
            if (!hasOffline)
                functionality.modernWebGaps.push('offline-functionality');
            if (!hasWebRTC)
                functionality.modernWebGaps.push('real-time-communication');
            // Business value features
            const hasAnalytics = codeChunks.some(chunk => chunk.content.toLowerCase().includes('analytics') || chunk.content.toLowerCase().includes('tracking'));
            const hasA11y = codeChunks.some(chunk => chunk.content.toLowerCase().includes('accessibility') || chunk.content.toLowerCase().includes('aria'));
            const hasI18n = codeChunks.some(chunk => chunk.content.toLowerCase().includes('i18n') || chunk.content.toLowerCase().includes('internationalization'));
            if (!hasAnalytics)
                functionality.businessValueGaps.push('user-analytics');
            if (!hasA11y)
                functionality.businessValueGaps.push('accessibility');
            if (!hasI18n)
                functionality.businessValueGaps.push('internationalization');
        }
        // Security analysis
        const hasAuth = codeChunks.some(chunk => chunk.content.toLowerCase().includes('auth'));
        const hasEncryption = codeChunks.some(chunk => chunk.content.toLowerCase().includes('encrypt') || chunk.content.toLowerCase().includes('crypto'));
        const hasRateLimit = codeChunks.some(chunk => chunk.content.toLowerCase().includes('rate') && chunk.content.toLowerCase().includes('limit'));
        if (!hasAuth)
            functionality.securityNeeds.push('authentication-system');
        if (!hasEncryption)
            functionality.securityNeeds.push('data-encryption');
        if (!hasRateLimit)
            functionality.securityNeeds.push('rate-limiting');
        return functionality;
    }
    generateFunctionalityBasedQueries(functionalityAnalysis, analysis) {
        const queries = [];
        // Focus on unique value propositions and differentiating features
        // UX Enhancement queries - focus on unique, standout features
        functionalityAnalysis.missingUXFeatures.forEach((feature) => {
            switch (feature) {
                case 'interactive-modals':
                    queries.push({
                        searchTerm: 'headless modal dialog unstyled accessible component library',
                        functionality: 'Unique User Experience',
                        priority: 'high',
                        description: 'Create distinctive modal experiences that set your product apart'
                    });
                    break;
                case 'notification-system':
                    queries.push({
                        searchTerm: 'innovative toast notification unique animation library',
                        functionality: 'Memorable User Feedback',
                        priority: 'high',
                        description: 'Implement unique notification patterns that users remember'
                    });
                    break;
                case 'drag-drop-interactions':
                    queries.push({
                        searchTerm: 'beautiful drag drop animation gesture library',
                        functionality: 'Engaging Interactions',
                        priority: 'medium',
                        description: 'Create delightful drag-drop experiences that wow users'
                    });
                    break;
                case 'search-functionality':
                    queries.push({
                        searchTerm: 'intelligent search fuzzy autocomplete smart filtering',
                        functionality: 'Smart Discovery',
                        priority: 'high',
                        description: 'Add AI-powered search that understands user intent'
                    });
                    break;
            }
        });
        // Performance enhancement queries - focus on cutting-edge optimizations
        functionalityAnalysis.performanceGaps.forEach((gap) => {
            switch (gap) {
                case 'lazy-loading':
                    queries.push({
                        searchTerm: 'intersection observer lazy loading progressive image enhancement',
                        functionality: 'Performance Excellence',
                        priority: 'high',
                        description: 'Implement next-gen loading strategies for superior performance'
                    });
                    break;
                case 'virtualization':
                    queries.push({
                        searchTerm: 'windowing virtualization large dataset rendering library',
                        functionality: 'Scale Excellence',
                        priority: 'medium',
                        description: 'Handle massive datasets with enterprise-grade virtualization'
                    });
                    break;
                case 'image-optimization':
                    queries.push({
                        searchTerm: 'next-gen image format webp avif optimization library',
                        functionality: 'Modern Performance',
                        priority: 'high',
                        description: 'Leverage latest image technologies for competitive advantage'
                    });
                    break;
            }
        });
        // Modern web features - focus on cutting-edge capabilities
        functionalityAnalysis.modernWebGaps.forEach((gap) => {
            switch (gap) {
                case 'progressive-web-app':
                    queries.push({
                        searchTerm: 'offline-first PWA background sync push notifications',
                        functionality: 'App-like Experience',
                        priority: 'medium',
                        description: 'Transform into a native-quality web app'
                    });
                    break;
                case 'real-time-communication':
                    queries.push({
                        searchTerm: 'real-time collaboration websocket peer-to-peer library',
                        functionality: 'Live Collaboration',
                        priority: 'medium',
                        description: 'Enable real-time collaboration features'
                    });
                    break;
            }
        });
        // Business value features - focus on competitive advantages
        functionalityAnalysis.businessValueGaps.forEach((gap) => {
            switch (gap) {
                case 'user-analytics':
                    queries.push({
                        searchTerm: 'privacy-first analytics user behavior heatmap library',
                        functionality: 'Intelligent Insights',
                        priority: 'high',
                        description: 'Gain deep user insights while respecting privacy'
                    });
                    break;
                case 'accessibility':
                    queries.push({
                        searchTerm: 'inclusive design accessibility automation testing library',
                        functionality: 'Universal Access',
                        priority: 'high',
                        description: 'Create inclusive experiences that reach everyone'
                    });
                    break;
                case 'internationalization':
                    queries.push({
                        searchTerm: 'intelligent localization dynamic translation library',
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
                searchTerm: 'micro-interactions animation library delightful UX',
                functionality: 'Premium Experience',
                priority: 'high',
                description: 'Add premium micro-interactions that create emotional connection'
            });
            queries.push({
                searchTerm: 'machine learning recommendation personalization library',
                functionality: 'AI-Powered Features',
                priority: 'medium',
                description: 'Integrate AI to personalize user experiences'
            });
        }
        return queries.slice(0, 8); // Increased to allow more unique suggestions
    }
    analyzeCodePatterns(codeChunks, analysis) {
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
            missingFeatures: []
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
        if (!patterns.hasTesting)
            patterns.missingFeatures.push('testing');
        if (!patterns.hasAuthentication && analysis.project_type === 'web-app')
            patterns.missingFeatures.push('authentication');
        if (!patterns.hasStateManagement && analysis.key_technologies.includes('React'))
            patterns.missingFeatures.push('state-management');
        return patterns;
    }
    generateSmartSearchQueries(analysis, codePatterns) {
        const queries = [];
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
    generateSearchQueries(analysis) {
        const queries = [];
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
    async searchGitHubRepos(query) {
        try {
            // Enhanced search with better filters
            const searchQuery = `${query} stars:>500 language:javascript language:typescript pushed:>2023-01-01`;
            const response = await axios_1.default.get(`${LibrarianAgent.GITHUB_API_BASE}/search/repositories`, {
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
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error) && error.response?.status === 403) {
                console.warn('GitHub API rate limit reached, using fallback data');
                return this.getFallbackRepos(query);
            }
            throw error;
        }
    }
    getFallbackRepos(query) {
        // Return empty array - no fallback data
        return [];
    }
    async processRepositories(repos, analysis, query) {
        const recommendations = [];
        for (const repo of repos) {
            try {
                const recommendation = await this.createRecommendation(repo, analysis, query);
                if (recommendation) {
                    recommendations.push(recommendation);
                }
            }
            catch (error) {
                console.warn(`Failed to process repo ${repo.full_name}:`, error);
            }
        }
        return recommendations;
    }
    async createRecommendation(repo, analysis, query) {
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
    calculateRelevanceScore(repo, analysis) {
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
        if (repo.stargazers_count > 10000)
            score += 0.3;
        else if (repo.stargazers_count > 5000)
            score += 0.2;
        else if (repo.stargazers_count > 1000)
            score += 0.1;
        // Recent activity
        const lastUpdate = new Date(repo.updated_at);
        const monthsOld = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsOld < 3)
            score += 0.2;
        else if (monthsOld < 12)
            score += 0.1;
        // Language match
        if (repo.language && analysis.key_technologies.some(tech => tech.toLowerCase().includes(repo.language.toLowerCase()) ||
            repo.language.toLowerCase().includes(tech.toLowerCase()))) {
            score += 0.2;
        }
        return Math.min(score, 1.0);
    }
    categorizeRepository(repo) {
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
    assessIntegrationEffort(repo, analysis) {
        // Simple heuristic based on popularity and language match
        if (analysis.key_technologies.includes(repo.language?.toLowerCase()) && repo.stargazers_count > 5000) {
            return 'low';
        }
        if (repo.stargazers_count > 1000) {
            return 'medium';
        }
        return 'high';
    }
    generateBenefits(repo, category) {
        const baseBenefits = [
            `${repo.stargazers_count.toLocaleString()} GitHub stars indicate community trust`,
            'Well-maintained open source project'
        ];
        const categoryBenefits = {
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
    generateUseCases(repo, category) {
        const categoryUseCases = {
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
    generateFunctionalityBenefits(repo, category, query) {
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
            }
            else if (query.functionality.includes('User Interface')) {
                functionalityBenefits.push('Enhances user interaction and engagement');
            }
            else if (query.functionality.includes('Business')) {
                functionalityBenefits.push('Drives business value and user insights');
            }
            else if (query.functionality.includes('Modern Web')) {
                functionalityBenefits.push('Leverages latest web technologies');
            }
            return [...baseBenefits, ...functionalityBenefits];
        }
        // Fallback to category-based benefits
        const categoryBenefits = {
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
    generateFunctionalityUseCases(repo, category, query) {
        if (query?.functionality) {
            // Generate use cases based on functionality type
            const functionalityUseCases = {
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
        const categoryUseCases = {
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
    generateNpmUrl(repo) {
        // Simple heuristic to generate npm URL
        if (repo.language === 'JavaScript' || repo.language === 'TypeScript') {
            return `https://www.npmjs.com/package/${repo.name}`;
        }
        return undefined;
    }
    deduplicateAndRank(recommendations) {
        // Remove duplicates by name and sort by relevance score
        const seen = new Set();
        const unique = recommendations.filter(rec => {
            if (seen.has(rec.name)) {
                return false;
            }
            seen.add(rec.name);
            return true;
        });
        return unique.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
    generateSummary(recommendations) {
        const byCategory = {};
        let highRelevance = 0;
        let easyIntegration = 0;
        recommendations.forEach(rec => {
            byCategory[rec.category] = (byCategory[rec.category] || 0) + 1;
            if (rec.relevanceScore >= 0.7)
                highRelevance++;
            if (rec.integrationEffort === 'low')
                easyIntegration++;
        });
        return {
            totalRecommendations: recommendations.length,
            byCategory,
            highRelevance,
            easyIntegration
        };
    }
}
exports.LibrarianAgent = LibrarianAgent;
LibrarianAgent.GITHUB_API_BASE = 'https://api.github.com';
//# sourceMappingURL=LibrarianAgent.js.map