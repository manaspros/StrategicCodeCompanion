"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedMultiAgentOrchestrator = void 0;
const SemanticCodeAnalyzer_1 = require("./SemanticCodeAnalyzer");
const IntelligentChunkSelector_1 = require("./IntelligentChunkSelector");
const EnhancedRefactorAgent_1 = require("./EnhancedRefactorAgent");
// Import your existing agents
const ArchitectAgent_1 = require("../ArchitectAgent");
const LibrarianAgent_1 = require("../LibrarianAgent");
const TutorAgent_1 = require("../TutorAgent");
const OpenAIAgentOrchestrator_1 = require("../../services/OpenAIAgentOrchestrator");
class EnhancedMultiAgentOrchestrator {
    constructor(llmProvider, composioApiKey) {
        this.llmProvider = llmProvider;
        // Initialize enhanced components
        this.semanticAnalyzer = new SemanticCodeAnalyzer_1.SemanticCodeAnalyzer(llmProvider);
        this.chunkSelector = new IntelligentChunkSelector_1.IntelligentChunkSelector(llmProvider);
        this.enhancedRefactorAgent = new EnhancedRefactorAgent_1.EnhancedRefactorAgent(llmProvider);
        // Keep existing agents
        this.architectAgent = new ArchitectAgent_1.ArchitectAgent(llmProvider);
        this.librarianAgent = new LibrarianAgent_1.LibrarianAgent(llmProvider);
        this.tutorAgent = new TutorAgent_1.TutorAgent(llmProvider);
        this.enhancedOrchestrator = new OpenAIAgentOrchestrator_1.OpenAIAgentOrchestrator(llmProvider);
        if (composioApiKey) {
            this.enhancedOrchestrator.initialize(composioApiKey);
        }
    }
    async analyzeCodebase(chunks, useEnhanced = true) {
        try {
            console.log('🚀 Enhanced Multi-Agent Analysis Starting...');
            // Step 1: Initial analysis (same as before)
            const analysis = await this.performInitialAnalysis(chunks);
            console.log('✅ Initial analysis completed');
            let semanticContext, chunkPriorities, enhancedInsights;
            let refactoring, architecture, libraries, tutorials;
            if (useEnhanced) {
                // Step 2: Semantic analysis for deep understanding
                console.log('🧠 Performing semantic code analysis...');
                semanticContext = await this.semanticAnalyzer.analyzeSemanticContext(chunks);
                // Step 3: Intelligent chunk selection for each agent
                console.log('🎯 Selecting optimal code chunks...');
                chunkPriorities = await this.performIntelligentChunkSelection(chunks);
                // Step 4: Enhanced analysis with selected chunks
                console.log('🔬 Running enhanced agent analysis...');
                const results = await this.runEnhancedAnalysis(analysis, chunkPriorities, semanticContext);
                refactoring = results.refactoring;
                architecture = results.architecture;
                libraries = results.libraries;
                tutorials = results.tutorials;
                enhancedInsights = {
                    codeFlows: semanticContext.codeFlows,
                    qualityHotspots: semanticContext.qualityHotspots,
                    architecturalPatterns: semanticContext.architecturalPatterns,
                    businessLogicAreas: semanticContext.businessLogicAreas
                };
            }
            else {
                // Fallback to original analysis
                console.log('⚡ Running standard agent analysis...');
                [refactoring, architecture, libraries, tutorials] = await Promise.all([
                    this.enhancedRefactorAgent.generateRefactoringSuggestions(analysis, chunks.slice(0, 50)),
                    this.architectAgent.generateArchitectureSuggestions(analysis, chunks.slice(0, 50)),
                    this.librarianAgent.findRelevantLibraries(analysis, chunks.slice(0, 50)),
                    this.tutorAgent.findTutorials(analysis, chunks.slice(0, 50))
                ]);
            }
            // Step 5: Enhanced strategic analysis (if available)
            let enhanced;
            try {
                console.log('🚀 Running strategic enhancement analysis...');
                enhanced = await this.enhancedOrchestrator.analyzeWithEnhancedAgents(analysis, chunks);
            }
            catch (error) {
                console.warn('Enhanced strategic analysis failed:', error);
            }
            console.log('✅ Enhanced Multi-Agent Analysis Complete!');
            return {
                analysis,
                refactoring,
                architecture,
                libraries,
                tutorials,
                enhanced,
                semanticContext,
                chunkPriorities: chunkPriorities ? Object.values(chunkPriorities).flat() : undefined,
                enhancedInsights,
                analysisStrategy: useEnhanced ? 'enhanced' : 'standard'
            };
        }
        catch (error) {
            console.error('Enhanced analysis failed:', error);
            throw new Error(`Enhanced multi-agent analysis failed: ${error}`);
        }
    }
    async performIntelligentChunkSelection(chunks) {
        const strategies = {
            refactoring: {
                maxChunks: 30,
                focusArea: 'quality',
                includeContext: true,
                diversityWeight: 0.3
            },
            architecture: {
                maxChunks: 25,
                focusArea: 'architecture',
                includeContext: true,
                diversityWeight: 0.4
            },
            libraries: {
                maxChunks: 20,
                focusArea: 'business-logic',
                includeContext: false,
                diversityWeight: 0.5
            },
            tutorials: {
                maxChunks: 15,
                focusArea: 'general',
                includeContext: true,
                diversityWeight: 0.6
            }
        };
        const selections = await Promise.all([
            this.chunkSelector.selectOptimalChunks(chunks, strategies.refactoring),
            this.chunkSelector.selectOptimalChunks(chunks, strategies.architecture),
            this.chunkSelector.selectOptimalChunks(chunks, strategies.libraries),
            this.chunkSelector.selectOptimalChunks(chunks, strategies.tutorials)
        ]);
        return {
            refactoring: selections[0],
            architecture: selections[1],
            libraries: selections[2],
            tutorials: selections[3]
        };
    }
    async runEnhancedAnalysis(analysis, chunkPriorities, semanticContext) {
        // Extract chunks from priorities for each agent
        const refactoringChunks = chunkPriorities.refactoring.map((p) => p.chunk);
        const architectureChunks = chunkPriorities.architecture.map((p) => p.chunk);
        const librariesChunks = chunkPriorities.libraries.map((p) => p.chunk);
        const tutorialsChunks = chunkPriorities.tutorials.map((p) => p.chunk);
        // Run agents in parallel with optimal chunks
        const [refactoring, architecture, libraries, tutorials] = await Promise.all([
            this.enhancedRefactorAgent.generateRefactoringSuggestions(analysis, refactoringChunks),
            this.runEnhancedArchitectureAnalysis(analysis, architectureChunks, semanticContext),
            this.runEnhancedLibraryAnalysis(analysis, librariesChunks, semanticContext),
            this.runEnhancedTutorialAnalysis(analysis, tutorialsChunks, semanticContext)
        ]);
        return { refactoring, architecture, libraries, tutorials };
    }
    async runEnhancedArchitectureAnalysis(analysis, chunks, semanticContext) {
        // Enhance architecture analysis with semantic context
        console.log('🏗️ Enhanced Architecture Analysis with semantic insights...');
        const baseResults = await this.architectAgent.generateArchitectureSuggestions(analysis, chunks);
        // Enhance with architectural patterns from semantic analysis
        if (semanticContext.architecturalPatterns) {
            const enhancedFeatures = baseResults.features?.map((feature) => ({
                ...feature,
                semanticInsights: {
                    relatedPatterns: semanticContext.architecturalPatterns
                        .filter((p) => p.adherence < 0.7)
                        .map((p) => p.pattern),
                    qualityHotspots: semanticContext.qualityHotspots
                        .filter((h) => h.riskScore > 7)
                        .length
                }
            }));
            return { ...baseResults, features: enhancedFeatures };
        }
        return baseResults;
    }
    async runEnhancedLibraryAnalysis(analysis, chunks, semanticContext) {
        // Enhance library analysis with business logic insights
        console.log('📚 Enhanced Library Analysis with business context...');
        const baseResults = await this.librarianAgent.findRelevantLibraries(analysis, chunks);
        // Enhance with business logic areas from semantic analysis
        if (semanticContext.businessLogicAreas) {
            const enhancedRecommendations = baseResults.recommendations?.map((rec) => ({
                ...rec,
                businessContext: {
                    relevantDomains: semanticContext.businessLogicAreas
                        .filter((area) => area.complexity > 7)
                        .map((area) => area.domain),
                    criticalAreas: semanticContext.businessLogicAreas
                        .filter((area) => area.businessCriticality === 'critical')
                        .length
                }
            }));
            return { ...baseResults, recommendations: enhancedRecommendations };
        }
        return baseResults;
    }
    async runEnhancedTutorialAnalysis(analysis, chunks, semanticContext) {
        // Enhance tutorial analysis with quality insights
        console.log('🎓 Enhanced Tutorial Analysis with quality context...');
        const baseResults = await this.tutorAgent.findTutorials(analysis, chunks);
        // Enhance with quality hotspots from semantic analysis
        if (semanticContext.qualityHotspots) {
            const learningAreas = semanticContext.qualityHotspots
                .filter((h) => h.riskScore > 6)
                .map((h) => h.issues.map((i) => i.type))
                .flat();
            const enhancedTutorials = baseResults.tutorials?.map((tutorial) => ({
                ...tutorial,
                relevanceContext: {
                    addressesQualityIssues: learningAreas.some((area) => tutorial.topics?.some((topic) => topic.toLowerCase().includes(area.toLowerCase()))),
                    priorityTopics: learningAreas.slice(0, 3)
                }
            }));
            return { ...baseResults, tutorials: enhancedTutorials };
        }
        return baseResults;
    }
    // Keep existing method for compatibility
    async performInitialAnalysis(chunks) {
        const codebaseSummary = this.createCodebaseSummary(chunks);
        const systemPrompt = `You are an expert software architect and code analyst. 
        Analyze the provided codebase and return a comprehensive analysis in the exact JSON format specified.
        
        Focus on:
        1. Overall architecture and design patterns
        2. Technologies and frameworks used
        3. Code quality and potential improvements
        4. Project complexity and maintainability
        
        Be thorough but concise in your analysis.`;
        const userPrompt = `Analyze this codebase and provide insights:

${codebaseSummary}

Return your analysis as a JSON object with the following structure:
{
    "overall_summary": "Brief description of what this project does and its main purpose",
    "key_technologies": ["list", "of", "main", "technologies", "frameworks", "libraries"],
    "architectural_patterns": ["list", "of", "design", "patterns", "found"],
    "main_dependencies": ["key", "external", "dependencies"],
    "potential_areas_for_refactoring": ["specific", "areas", "that", "need", "improvement"],
    "project_type": "web-app|library|cli-tool|api|mobile-app|desktop-app|other",
    "complexity_score": 1-10,
    "code_quality_metrics": {
        "maintainability": 1-10,
        "readability": 1-10,
        "testability": 1-10
    }
}`;
        try {
            const response = await this.llmProvider.generateResponse([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], {
                temperature: 0.3,
                maxTokens: 2048
            });
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            const analysis = JSON.parse(jsonMatch[0]);
            return analysis;
        }
        catch (error) {
            console.error('Failed to parse analysis response:', error);
            return this.createFallbackAnalysis(chunks);
        }
    }
    createCodebaseSummary(chunks) {
        const summary = [];
        const totalLines = chunks.reduce((sum, chunk) => sum + (chunk.endLine - chunk.startLine + 1), 0);
        const fileCount = new Set(chunks.map(chunk => chunk.filePath)).size;
        const languageCount = new Set(chunks.map(chunk => chunk.language));
        summary.push(`Project Statistics:
- Total files: ${fileCount}
- Total lines of code: ${totalLines}
- Languages: ${Array.from(languageCount).join(', ')}
- Total code chunks: ${chunks.length}`);
        const fileTypes = new Map();
        const functionNames = new Set();
        const classNames = new Set();
        chunks.forEach(chunk => {
            const ext = chunk.filePath.split('.').pop() || 'unknown';
            fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1);
            if (chunk.type === 'function' && chunk.metadata.name) {
                functionNames.add(chunk.metadata.name);
            }
            if (chunk.type === 'class' && chunk.metadata.name) {
                classNames.add(chunk.metadata.name);
            }
        });
        summary.push(`\nFile Types:
${Array.from(fileTypes.entries()).map(([ext, count]) => `- .${ext}: ${count} chunks`).join('\n')}`);
        if (functionNames.size > 0) {
            summary.push(`\nKey Functions: ${Array.from(functionNames).slice(0, 10).join(', ')}${functionNames.size > 10 ? '...' : ''}`);
        }
        if (classNames.size > 0) {
            summary.push(`\nKey Classes: ${Array.from(classNames).slice(0, 10).join(', ')}${classNames.size > 10 ? '...' : ''}`);
        }
        summary.push('\n--- Sample Code Chunks ---');
        const sampleChunks = chunks
            .filter(chunk => chunk.type === 'function' || chunk.type === 'class')
            .slice(0, 5);
        sampleChunks.forEach((chunk, index) => {
            summary.push(`\n${index + 1}. ${chunk.filePath} (${chunk.type}):
${chunk.content.substring(0, 300)}${chunk.content.length > 300 ? '...' : ''}`);
        });
        return summary.join('\n');
    }
    createFallbackAnalysis(chunks) {
        const languages = Array.from(new Set(chunks.map(chunk => chunk.language)));
        const fileCount = new Set(chunks.map(chunk => chunk.filePath)).size;
        return {
            overall_summary: `A ${languages.join(', ')} project with ${fileCount} files and ${chunks.length} code chunks`,
            key_technologies: languages,
            architectural_patterns: ['Unknown'],
            main_dependencies: ['Unknown'],
            potential_areas_for_refactoring: ['Code analysis needed'],
            project_type: 'other',
            complexity_score: 5,
            code_quality_metrics: {
                maintainability: 5,
                readability: 5,
                testability: 5
            }
        };
    }
}
exports.EnhancedMultiAgentOrchestrator = EnhancedMultiAgentOrchestrator;
//# sourceMappingURL=EnhancedMultiAgentOrchestrator.js.map