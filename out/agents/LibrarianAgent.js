"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibrarianAgent = void 0;
const axios_1 = __importDefault(require("axios"));
const DynamicAnalysisEngine_1 = require("../engines/DynamicAnalysisEngine");
const RateLimitManager_1 = require("./enhanced/RateLimitManager");
class LibrarianAgent {
    constructor(llmProvider) {
        this.llmProvider = llmProvider;
        this.dynamicAnalysisEngine = llmProvider ? new DynamicAnalysisEngine_1.DynamicAnalysisEngine(llmProvider) : undefined;
        // Initialize rate limit manager with GitHub API limits
        const rateLimitConfig = {
            maxRequestsPerHour: 5000,
            maxRequestsPerMinute: 30,
            backoffMultiplier: 2,
            maxRetries: 3,
            fallbackStrategies: []
        };
        this.rateLimitManager = new RateLimitManager_1.RateLimitManager(rateLimitConfig);
    }
    async findRelevantLibraries(analysis, codeChunks) {
        try {
            if (!this.dynamicAnalysisEngine) {
                console.warn('LibrarianAgent: No dynamic analysis engine available');
                return this.getFallbackLibraryResults(analysis, codeChunks);
            }
            // Step 1: Perform dynamic analysis of the codebase
            console.log('LibrarianAgent: Performing dynamic codebase analysis...');
            const dynamicAnalysis = await this.dynamicAnalysisEngine.analyzeCodebaseDynamically(analysis, codeChunks);
            // Step 2: Generate intelligent search strategy based on analysis
            console.log('LibrarianAgent: Generating intelligent search strategy...');
            const searchStrategy = await this.dynamicAnalysisEngine.generateLibrarySearchStrategy(analysis, codeChunks, dynamicAnalysis);
            const recommendations = [];
            // Step 3: Execute search strategy
            for (const query of searchStrategy.queries) {
                try {
                    // Use primary search terms
                    let repos = await this.searchGitHubReposWithStrategy(query.searchTerms, query);
                    // If no results, try alternative terms
                    if (repos.length === 0 && query.alternativeTerms.length > 0) {
                        console.log(`LibrarianAgent: Primary search found no results, trying alternatives for ${query.rationale}`);
                        repos = await this.searchGitHubReposWithStrategy(query.alternativeTerms, query);
                    }
                    const processedRepos = await this.processRepositoriesWithStrategy(repos, analysis, query, dynamicAnalysis);
                    recommendations.push(...processedRepos);
                }
                catch (error) {
                    console.warn(`Failed to search for "${query.searchTerms.join(' ')}":`, error);
                }
            }
            // Remove duplicates and sort by relevance
            const uniqueRecommendations = this.deduplicateAndRank(recommendations);
            const topRecommendations = uniqueRecommendations.slice(0, 10);
            console.log(`LibrarianAgent: Generated ${topRecommendations.length} intelligent recommendations`);
            return {
                recommendations: topRecommendations,
                summary: this.generateSummary(topRecommendations)
            };
        }
        catch (error) {
            console.error('Failed to find relevant libraries:', error);
            return this.getFallbackLibraryResults(analysis, codeChunks);
        }
    }
    async searchGitHubReposWithStrategy(searchTerms, query) {
        const searchKey = `github-search-${searchTerms.join('-')}`;
        return await this.rateLimitManager.executeWithRateLimit(searchKey, async () => {
            // Build intelligent search query
            const searchQuery = `${searchTerms.join(' ')} stars:>100 pushed:>2023-01-01`;
            // Apply exclusions if specified
            let finalQuery = searchQuery;
            if (query.excludeTerms && query.excludeTerms.length > 0) {
                finalQuery += ` -${query.excludeTerms.join(' -')}`;
            }
            const response = await axios_1.default.get(`${LibrarianAgent.GITHUB_API_BASE}/search/repositories`, {
                params: {
                    q: finalQuery,
                    sort: 'stars',
                    order: 'desc',
                    per_page: 6
                },
                timeout: 15000,
                headers: {
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'User-Agent': 'Strategic-Code-Companion'
                }
            });
            console.log(`LibrarianAgent: Found ${response.data.items?.length || 0} repos for "${searchTerms.join(' ')}"`);
            return response.data.items || [];
        }, []);
    }
    async processRepositoriesWithStrategy(repos, analysis, query, dynamicAnalysis) {
        const recommendations = [];
        for (const repo of repos) {
            try {
                const recommendation = await this.createIntelligentRecommendation(repo, analysis, query, dynamicAnalysis);
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
    async createIntelligentRecommendation(repo, analysis, query, dynamicAnalysis) {
        // Enhanced relevance scoring based on dynamic analysis
        const relevanceScore = this.calculateIntelligentRelevanceScore(repo, analysis, query, dynamicAnalysis);
        if (relevanceScore < 0.4) {
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
            benefits: this.generateIntelligentBenefits(repo, category, query, dynamicAnalysis),
            useCases: this.generateIntelligentUseCases(repo, category, query, dynamicAnalysis),
            alternatives: []
        };
    }
    calculateIntelligentRelevanceScore(repo, analysis, query, dynamicAnalysis) {
        let score = 0;
        // Base relevance from search strategy
        const priorityWeight = query.priority === 'critical' ? 0.4 : query.priority === 'high' ? 0.3 : 0.2;
        score += priorityWeight;
        // Technology alignment
        const repoText = `${repo.name} ${repo.description || ''}`.toLowerCase();
        analysis.key_technologies.forEach(tech => {
            if (repoText.includes(tech.toLowerCase())) {
                score += 0.3;
            }
        });
        // Functionality gap alignment
        if (dynamicAnalysis.functionalityGaps) {
            dynamicAnalysis.functionalityGaps.forEach((gap) => {
                if (repoText.includes(gap.gap.toLowerCase().split(' ')[0])) {
                    score += gap.priority === 'critical' ? 0.4 : gap.priority === 'high' ? 0.3 : 0.2;
                }
            });
        }
        // Quality indicators
        if (repo.stargazers_count > 10000)
            score += 0.3;
        else if (repo.stargazers_count > 5000)
            score += 0.2;
        else if (repo.stargazers_count > 1000)
            score += 0.1;
        // Recent activity
        const lastUpdate = new Date(repo.updated_at);
        const monthsOld = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsOld < 6)
            score += 0.2;
        else if (monthsOld < 12)
            score += 0.1;
        return Math.min(score, 1.0);
    }
    generateIntelligentBenefits(repo, category, query, dynamicAnalysis) {
        const benefits = [
            `${repo.stargazers_count.toLocaleString()} GitHub stars indicate strong community trust`,
            query.rationale || 'Addresses identified functionality gaps'
        ];
        // Add dynamic analysis-based benefits
        if (dynamicAnalysis.performanceInsights) {
            const relevantInsight = dynamicAnalysis.performanceInsights.find((insight) => repo.name.toLowerCase().includes(insight.area.toLowerCase()) ||
                repo.description?.toLowerCase().includes(insight.area.toLowerCase()));
            if (relevantInsight) {
                benefits.push(`Addresses ${relevantInsight.area}: ${relevantInsight.optimizationOpportunity}`);
            }
        }
        return benefits;
    }
    generateIntelligentUseCases(repo, category, query, dynamicAnalysis) {
        const useCases = [query.expectedResults || 'Enhances application functionality'];
        // Add specific use cases based on dynamic analysis
        if (dynamicAnalysis.architecturalOpportunities) {
            const relevantOpportunity = dynamicAnalysis.architecturalOpportunities.find((opp) => repo.name.toLowerCase().includes(opp.opportunity.toLowerCase().split(' ')[0]));
            if (relevantOpportunity) {
                useCases.push(`Supports architectural goal: ${relevantOpportunity.opportunity}`);
                useCases.push(...relevantOpportunity.benefits.slice(0, 2));
            }
        }
        return useCases;
    }
    getFallbackLibraryResults(analysis, codeChunks) {
        console.log('LibrarianAgent: Using minimal fallback results - dynamic analysis unavailable');
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
    // Helper methods for compatibility with existing code
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
        if (analysis.key_technologies.some(tech => repo.language?.toLowerCase() === tech.toLowerCase()) && repo.stargazers_count > 5000) {
            return 'low';
        }
        if (repo.stargazers_count > 1000) {
            return 'medium';
        }
        return 'high';
    }
    generateNpmUrl(repo) {
        if (repo.language === 'JavaScript' || repo.language === 'TypeScript') {
            return `https://www.npmjs.com/package/${repo.name}`;
        }
        return undefined;
    }
    deduplicateAndRank(recommendations) {
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
    // Rate limiting fallback methods
    async getCachedRecommendations() {
        console.log('LibrarianAgent: Using cached recommendations fallback');
        // TODO: Implement actual caching mechanism
        return this.getStaticRecommendations();
    }
    async getStaticRecommendations() {
        console.log('LibrarianAgent: Using static recommendations fallback');
        const staticRecommendations = [
            {
                id: 'lodash',
                name: 'lodash',
                description: 'A modern JavaScript utility library delivering modularity, performance & extras.',
                githubUrl: 'https://github.com/lodash/lodash',
                npmUrl: 'https://www.npmjs.com/package/lodash',
                stars: 59000,
                forks: 7000,
                lastUpdated: '2024-01-01',
                language: 'JavaScript',
                license: 'MIT',
                category: 'utility',
                relevanceScore: 0.8,
                integrationEffort: 'low',
                benefits: ['Widely used and tested', 'Comprehensive utility functions', 'Good TypeScript support'],
                useCases: ['Data manipulation', 'Array/Object utilities', 'Functional programming'],
                alternatives: ['ramda', 'native ES6 methods']
            },
            {
                id: 'axios',
                name: 'axios',
                description: 'Promise based HTTP client for the browser and node.js',
                githubUrl: 'https://github.com/axios/axios',
                npmUrl: 'https://www.npmjs.com/package/axios',
                stars: 105000,
                forks: 10800,
                lastUpdated: '2024-01-15',
                language: 'JavaScript',
                license: 'MIT',
                category: 'utility',
                relevanceScore: 0.9,
                integrationEffort: 'low',
                benefits: ['Request/response interceptors', 'Wide browser support', 'Promise-based'],
                useCases: ['HTTP requests', 'API communication', 'File uploads'],
                alternatives: ['fetch', 'node-fetch', 'got']
            }
        ];
        return {
            recommendations: staticRecommendations,
            summary: this.generateSummary(staticRecommendations)
        };
    }
    async getFallbackRecommendationsForQuery(searchTerms, query) {
        console.log(`Generating fallback recommendations for: ${searchTerms.join(' ')}`);
        // Static fallback based on common search terms
        const termString = searchTerms.join(' ').toLowerCase();
        if (termString.includes('react') || termString.includes('next')) {
            return [
                {
                    id: 1,
                    name: 'react-hook-form',
                    description: 'Performant, flexible and extensible forms with easy validation.',
                    html_url: 'https://github.com/react-hook-form/react-hook-form',
                    stargazers_count: 40000,
                    forks_count: 2000,
                    updated_at: '2024-01-01',
                    language: 'TypeScript',
                    license: { name: 'MIT' }
                }
            ];
        }
        if (termString.includes('typescript') || termString.includes('type')) {
            return [
                {
                    id: 2,
                    name: 'type-fest',
                    description: 'A collection of essential TypeScript types',
                    html_url: 'https://github.com/sindresorhus/type-fest',
                    stargazers_count: 13000,
                    forks_count: 500,
                    updated_at: '2024-01-01',
                    language: 'TypeScript',
                    license: { name: 'MIT' }
                }
            ];
        }
        if (termString.includes('test') || termString.includes('jest')) {
            return [
                {
                    id: 3,
                    name: '@testing-library/react',
                    description: 'React testing utilities that encourage good testing practices',
                    html_url: 'https://github.com/testing-library/react-testing-library',
                    stargazers_count: 18000,
                    forks_count: 1100,
                    updated_at: '2024-01-01',
                    language: 'JavaScript',
                    license: { name: 'MIT' }
                }
            ];
        }
        // Default empty fallback
        return [];
    }
}
exports.LibrarianAgent = LibrarianAgent;
LibrarianAgent.GITHUB_API_BASE = 'https://api.github.com';
//# sourceMappingURL=LibrarianAgent.js.map