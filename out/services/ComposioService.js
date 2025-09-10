"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComposioService = void 0;
const core_1 = require("@composio/core");
class ComposioService {
    constructor() {
        this.initialized = false;
        // Don't initialize Composio until we have an API key
        this.initialized = false;
    }
    async initialize(apiKey) {
        try {
            if (apiKey) {
                console.log('Initializing Composio with provided API key...');
                this.composio = new core_1.Composio({
                    apiKey: apiKey
                });
                this.initialized = true;
                console.log('Composio initialized successfully');
            }
            else {
                console.log('No Composio API key provided, using fallback analysis');
                this.initialized = false;
            }
        }
        catch (error) {
            console.warn('Failed to initialize Composio:', error);
            this.initialized = false;
        }
    }
    async performCompetitiveAnalysis(analysis, codeChunks) {
        try {
            if (!this.initialized) {
                console.warn('Composio not initialized, using fallback competitive analysis');
                return this.getFallbackCompetitiveAnalysis(analysis);
            }
            // Use Composio's GitHub integration for advanced repository search
            const projectKeywords = this.extractProjectKeywords(analysis, codeChunks);
            const competitorQuery = this.buildCompetitorSearchQuery(analysis, projectKeywords);
            // Search for similar projects and analyze their features
            const similarProjects = await this.findSimilarProjects(competitorQuery);
            const featureAnalysis = await this.analyzeCompetitorFeatures(similarProjects, analysis);
            const innovationOpportunities = await this.identifyInnovationOpportunities(analysis, featureAnalysis);
            return {
                similarProjects,
                missingFeatures: featureAnalysis,
                innovationOpportunities
            };
        }
        catch (error) {
            console.warn('Composio competitive analysis failed, using fallback:', error);
            return this.getFallbackCompetitiveAnalysis(analysis);
        }
    }
    async gatherMarketIntelligence(analysis) {
        try {
            if (!this.initialized) {
                console.warn('Composio not initialized, using fallback market intelligence');
                return this.getFallbackMarketIntelligence(analysis);
            }
            // Use Composio's search integrations to gather market data
            const technologyTrends = await this.analyzeTechnologyTrends(analysis.key_technologies);
            const packageEcosystem = await this.analyzePackageEcosystem(analysis.key_technologies, analysis.project_type);
            const developmentTrends = await this.analyzeDevelopmentTrends(analysis);
            return {
                technologyTrends,
                packageEcosystem,
                developmentTrends
            };
        }
        catch (error) {
            console.warn('Composio market intelligence failed, using fallback:', error);
            return this.getFallbackMarketIntelligence(analysis);
        }
    }
    extractProjectKeywords(analysis, codeChunks) {
        const keywords = new Set();
        // Add technology keywords
        analysis.key_technologies.forEach(tech => keywords.add(tech.toLowerCase()));
        // Add project type keywords
        keywords.add(analysis.project_type);
        // Extract keywords from function and class names
        codeChunks.forEach(chunk => {
            if (chunk.metadata?.name) {
                const name = chunk.metadata.name.toLowerCase();
                // Extract meaningful words from camelCase/PascalCase
                const words = name.split(/(?=[A-Z])|[_-]/).filter(w => w.length > 2);
                words.forEach(word => keywords.add(word.toLowerCase()));
            }
        });
        // Add architectural pattern keywords
        analysis.architectural_patterns.forEach(pattern => {
            const words = pattern.toLowerCase().split(/[_-\s]+/);
            words.forEach(word => {
                if (word.length > 2)
                    keywords.add(word);
            });
        });
        return Array.from(keywords).slice(0, 10); // Limit to most relevant
    }
    buildCompetitorSearchQuery(analysis, keywords) {
        const projectType = analysis.project_type;
        const mainTech = analysis.key_technologies.slice(0, 3).join(' ');
        const keyWords = keywords.slice(0, 5).join(' ');
        return `${projectType} ${mainTech} ${keyWords} stars:>100 pushed:>2023-01-01`;
    }
    async findSimilarProjects(query) {
        try {
            // This would use Composio's GitHub integration
            // For now, we'll simulate the structure until the API is properly configured
            console.log('Composio GitHub search query:', query);
            // Placeholder for Composio GitHub search
            // const repos = await this.composio.github.search.repositories({ q: query });
            return this.generateMockSimilarProjects();
        }
        catch (error) {
            console.warn('Composio GitHub search failed:', error);
            return this.generateMockSimilarProjects();
        }
    }
    async analyzeCompetitorFeatures(projects, analysis) {
        // Analyze what features competitors have that this project doesn't
        const projectFeatures = this.extractCurrentFeatures(analysis);
        const competitorFeatures = this.extractCompetitorFeatures(projects);
        return competitorFeatures
            .filter(feature => !projectFeatures.includes(feature.feature))
            .map(feature => ({
            feature: feature.feature,
            description: feature.description,
            competitorCount: feature.competitorCount,
            businessValue: this.assessBusinessValue(feature.feature),
            implementationEffort: this.assessImplementationEffort(feature.feature, analysis)
        }));
    }
    async identifyInnovationOpportunities(analysis, missingFeatures) {
        // Identify cutting-edge opportunities not yet widely adopted
        const opportunities = [];
        // AI/ML Integration opportunities
        if (!analysis.key_technologies.some(tech => tech.toLowerCase().includes('ai') || tech.toLowerCase().includes('ml'))) {
            opportunities.push({
                opportunity: 'AI-Powered User Experience',
                description: 'Integrate machine learning for personalized user experiences and intelligent features',
                marketGap: 'Most similar projects lack AI integration',
                potentialImpact: 'high',
                trendAnalysis: 'AI integration is becoming standard in modern applications'
            });
        }
        // Real-time collaboration
        if (analysis.project_type === 'web-app' && !this.hasRealTimeFeatures(analysis)) {
            opportunities.push({
                opportunity: 'Real-time Collaborative Features',
                description: 'Add live collaboration capabilities with real-time sync and multiplayer interactions',
                marketGap: 'Limited real-time features in similar projects',
                potentialImpact: 'high',
                trendAnalysis: 'Real-time collaboration is becoming expected in web applications'
            });
        }
        // Voice/Conversational Interface
        opportunities.push({
            opportunity: 'Voice-First Interface',
            description: 'Implement voice commands and conversational UI for hands-free interaction',
            marketGap: 'Very few competitors have voice interfaces',
            potentialImpact: 'medium',
            trendAnalysis: 'Voice interfaces are emerging as a differentiator'
        });
        // Blockchain/Web3 Integration
        if (!this.hasBlockchainFeatures(analysis)) {
            opportunities.push({
                opportunity: 'Web3 Integration',
                description: 'Add decentralized features, cryptocurrency payments, or NFT support',
                marketGap: 'Minimal Web3 adoption in this project category',
                potentialImpact: 'medium',
                trendAnalysis: 'Web3 features create unique value propositions'
            });
        }
        return opportunities;
    }
    async analyzeTechnologyTrends(technologies) {
        // This would use Composio's search integrations to gather trend data
        return technologies.map(tech => ({
            technology: tech,
            trend: this.assessTechnologyTrend(tech),
            adoptionRate: this.estimateAdoptionRate(tech),
            useCase: this.identifyPrimaryUseCase(tech),
            futureProspect: this.assessFutureProspect(tech)
        }));
    }
    async analyzePackageEcosystem(technologies, projectType) {
        // This would use Composio's NPM/package registry integrations
        const categories = this.categorizeByTechnology(technologies, projectType);
        return categories.map(category => ({
            category: category.name,
            popularPackages: category.packages.map(pkg => ({
                name: pkg.name,
                weeklyDownloads: pkg.downloads,
                trend: pkg.trend,
                useCase: pkg.useCase
            }))
        }));
    }
    async analyzeDevelopmentTrends(analysis) {
        // Identify development patterns and trends
        const trends = [];
        // Microservices vs Monolith
        if (analysis.architectural_patterns.some(p => p.includes('monolith'))) {
            trends.push({
                pattern: 'Microservices Architecture',
                description: 'Break down monolithic structure into smaller, independent services',
                adoptionLevel: 'High adoption in enterprise applications',
                businessBenefit: 'Improved scalability and team autonomy'
            });
        }
        // Serverless adoption
        trends.push({
            pattern: 'Serverless Computing',
            description: 'Migrate to serverless functions for better cost optimization and scalability',
            adoptionLevel: 'Growing adoption across all project types',
            businessBenefit: 'Reduced infrastructure costs and improved scalability'
        });
        // Edge computing
        if (analysis.project_type === 'web-app') {
            trends.push({
                pattern: 'Edge Computing',
                description: 'Deploy compute resources closer to users for better performance',
                adoptionLevel: 'Early adoption phase',
                businessBenefit: 'Significantly improved user experience and performance'
            });
        }
        return trends;
    }
    // Helper methods for fallback data and assessments
    getFallbackCompetitiveAnalysis(analysis) {
        return {
            similarProjects: this.generateMockSimilarProjects(),
            missingFeatures: [
                {
                    feature: 'Advanced Analytics',
                    description: 'User behavior tracking and business intelligence',
                    competitorCount: 3,
                    businessValue: 'high',
                    implementationEffort: 'medium'
                },
                {
                    feature: 'Real-time Notifications',
                    description: 'Push notifications and real-time user communication',
                    competitorCount: 5,
                    businessValue: 'medium',
                    implementationEffort: 'low'
                }
            ],
            innovationOpportunities: [
                {
                    opportunity: 'AI-Powered Recommendations',
                    description: 'Machine learning-based personalization and recommendations',
                    marketGap: 'Limited AI adoption in similar projects',
                    potentialImpact: 'high',
                    trendAnalysis: 'AI integration becoming essential for competitive advantage'
                }
            ]
        };
    }
    getFallbackMarketIntelligence(analysis) {
        return {
            technologyTrends: analysis.key_technologies.map(tech => ({
                technology: tech,
                trend: 'stable',
                adoptionRate: 0.7,
                useCase: `Primary technology for ${analysis.project_type} development`,
                futureProspect: 'Continued growth and evolution expected'
            })),
            packageEcosystem: [
                {
                    category: 'Core Development',
                    popularPackages: [
                        {
                            name: 'example-package',
                            weeklyDownloads: 50000,
                            trend: 'growing',
                            useCase: 'Essential functionality'
                        }
                    ]
                }
            ],
            developmentTrends: [
                {
                    pattern: 'Modern Development Practices',
                    description: 'Adoption of contemporary development methodologies',
                    adoptionLevel: 'High',
                    businessBenefit: 'Improved code quality and maintainability'
                }
            ]
        };
    }
    generateMockSimilarProjects() {
        return [
            {
                name: 'competitor-project',
                description: 'Similar project with advanced features',
                stars: 1500,
                features: ['AI Integration', 'Real-time Sync', 'Advanced Analytics'],
                uniqueAdvantages: ['First-mover advantage', 'Strong community'],
                marketPosition: 'Market leader in innovation'
            }
        ];
    }
    extractCurrentFeatures(analysis) {
        // Extract features from analysis
        return analysis.architectural_patterns.concat(analysis.main_dependencies);
    }
    extractCompetitorFeatures(projects) {
        // Extract features from competitor projects
        return [
            {
                feature: 'Advanced Search',
                description: 'Intelligent search with filters and recommendations',
                competitorCount: 3
            },
            {
                feature: 'Collaborative Editing',
                description: 'Real-time collaborative editing capabilities',
                competitorCount: 2
            }
        ];
    }
    assessBusinessValue(feature) {
        const highValueFeatures = ['analytics', 'ai', 'search', 'collaboration', 'security'];
        const mediumValueFeatures = ['notification', 'ui', 'integration', 'export'];
        const featureLower = feature.toLowerCase();
        if (highValueFeatures.some(hv => featureLower.includes(hv)))
            return 'high';
        if (mediumValueFeatures.some(mv => featureLower.includes(mv)))
            return 'medium';
        return 'low';
    }
    assessImplementationEffort(feature, analysis) {
        // Assess based on existing technology stack and complexity
        const complexityScore = analysis.complexity_score;
        const hasRelevantTech = analysis.key_technologies.some(tech => feature.toLowerCase().includes(tech.toLowerCase()));
        if (hasRelevantTech && complexityScore < 5)
            return 'low';
        if (complexityScore > 7)
            return 'high';
        return 'medium';
    }
    assessTechnologyTrend(tech) {
        const risingTech = ['typescript', 'react', 'vue', 'next.js', 'svelte', 'rust', 'go'];
        const decliningTech = ['jquery', 'angularjs', 'backbone'];
        const techLower = tech.toLowerCase();
        if (risingTech.some(rt => techLower.includes(rt)))
            return 'rising';
        if (decliningTech.some(dt => techLower.includes(dt)))
            return 'declining';
        return 'stable';
    }
    estimateAdoptionRate(tech) {
        // Rough estimates based on common technologies
        const adoptionRates = {
            'javascript': 0.95,
            'typescript': 0.75,
            'react': 0.70,
            'vue': 0.30,
            'angular': 0.25,
            'python': 0.85,
            'java': 0.65,
            'go': 0.15,
            'rust': 0.05
        };
        return adoptionRates[tech.toLowerCase()] || 0.50;
    }
    identifyPrimaryUseCase(tech) {
        const useCases = {
            'javascript': 'Frontend and full-stack development',
            'typescript': 'Type-safe JavaScript development',
            'react': 'Modern user interface development',
            'vue': 'Progressive web application development',
            'python': 'Backend development and data science',
            'java': 'Enterprise application development',
            'go': 'High-performance backend services',
            'rust': 'System programming and performance-critical applications'
        };
        return useCases[tech.toLowerCase()] || 'General purpose development';
    }
    assessFutureProspect(tech) {
        const prospects = {
            'typescript': 'Strong growth expected as JavaScript typing becomes standard',
            'react': 'Continued dominance in frontend development',
            'vue': 'Steady growth in enterprise adoption',
            'rust': 'Rapid growth in system programming and WebAssembly',
            'go': 'Strong growth in cloud-native development'
        };
        return prospects[tech.toLowerCase()] || 'Stable evolution expected with gradual improvements';
    }
    categorizeByTechnology(technologies, projectType) {
        // Mock package ecosystem data
        return [
            {
                name: 'UI Components',
                packages: [
                    {
                        name: 'react-component-lib',
                        downloads: 100000,
                        trend: 'growing',
                        useCase: 'Reusable UI components'
                    }
                ]
            }
        ];
    }
    hasRealTimeFeatures(analysis) {
        return analysis.main_dependencies.some(dep => dep.toLowerCase().includes('socket') ||
            dep.toLowerCase().includes('websocket') ||
            dep.toLowerCase().includes('realtime'));
    }
    hasBlockchainFeatures(analysis) {
        return analysis.key_technologies.some(tech => tech.toLowerCase().includes('web3') ||
            tech.toLowerCase().includes('blockchain') ||
            tech.toLowerCase().includes('ethereum') ||
            tech.toLowerCase().includes('crypto'));
    }
}
exports.ComposioService = ComposioService;
//# sourceMappingURL=ComposioService.js.map