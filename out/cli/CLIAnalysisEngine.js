"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLIAnalysisEngine = void 0;
const llmProvider_1 = require("../llm/llmProvider");
const ingestion_1 = require("../rag/ingestion");
const embedding_1 = require("../rag/embedding");
const main_1 = require("../agents/main");
const ProgressIndicator_1 = require("./ProgressIndicator");
class CLIAnalysisEngine {
    constructor(config) {
        this.config = config;
        this.progressIndicator = new ProgressIndicator_1.ProgressIndicator();
    }
    async analyzeCodebase(codePath, useEnhancedFeatures = true) {
        const steps = [
            'Scanning codebase',
            'Processing code structure',
            'Generating embeddings',
            'Running AI analysis',
            ...(useEnhancedFeatures ? ['Enhanced competitive analysis'] : [])
        ];
        this.progressIndicator.start(steps);
        try {
            // Step 1: Ingest codebase
            this.progressIndicator.updateStep(0, 'Scanning files and extracting code chunks...');
            const ingestion = new ingestion_1.CodeIngestion(codePath);
            const chunks = await ingestion.ingestWorkspace();
            if (chunks.length === 0) {
                throw new Error('No code files found in the specified directory');
            }
            console.log(`📊 Found ${chunks.length} code chunks in ${new Set(chunks.map(c => c.filePath)).size} files`);
            // Step 2: Process code structure
            this.progressIndicator.updateStep(1, 'Analyzing code structure and relationships...');
            const processedChunks = this.filterAndPrepareChunks(chunks);
            console.log(`🔍 Processing ${processedChunks.length} relevant code chunks`);
            // Step 3: Generate embeddings
            this.progressIndicator.updateStep(2, 'Building semantic understanding...');
            const embeddingService = new embedding_1.CodeEmbeddingService();
            const embeddings = await embeddingService.generateEmbeddings(processedChunks.slice(0, 200));
            await embeddingService.buildVectorStore(embeddings);
            console.log(`🧠 Generated embeddings for semantic analysis`);
            // Step 4: Create LLM provider and orchestrator
            this.progressIndicator.updateStep(3, 'Initializing AI analysis...');
            const apiConfig = this.config.getApiConfig();
            if (!apiConfig) {
                throw new Error('Invalid API configuration');
            }
            const llmProvider = llmProvider_1.LLMProviderFactory.createProvider(apiConfig.provider, apiConfig.apiKey);
            // Validate API key
            const isValid = await llmProvider.validateApiKey();
            if (!isValid) {
                throw new Error('Invalid API key - please check your configuration');
            }
            // Step 5: Run analysis
            this.progressIndicator.updateStep(3, 'Running multi-agent analysis...');
            const orchestrator = new main_1.MultiAgentOrchestrator(llmProvider, useEnhancedFeatures ? this.config.getComposioKey() : undefined);
            const results = await orchestrator.analyzeCodebase(processedChunks.slice(0, 100));
            // Step 6: Enhanced analysis (if enabled)
            if (useEnhancedFeatures && this.config.hasComposioKey()) {
                this.progressIndicator.updateStep(4, 'Running competitive intelligence analysis...');
                console.log(`🚀 Enhanced features enabled with strategic insights`);
            }
            this.progressIndicator.complete();
            return results;
        }
        catch (error) {
            this.progressIndicator.error(error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
    }
    filterAndPrepareChunks(chunks) {
        // Filter out overly simple or irrelevant chunks
        return chunks.filter(chunk => {
            // Skip very small chunks
            if (chunk.content.length < 50)
                return false;
            // Skip test files for main analysis (but keep some for context)
            if (chunk.filePath.includes('test') || chunk.filePath.includes('spec')) {
                return Math.random() < 0.3; // Keep 30% of test files
            }
            // Skip build files and configs unless they're significant
            if (chunk.filePath.includes('build') || chunk.filePath.includes('dist')) {
                return false;
            }
            // Prefer functions and classes over generic code
            if (chunk.type === 'function' || chunk.type === 'class') {
                return true;
            }
            // Keep significant generic chunks
            return chunk.content.length > 100;
        });
    }
    async validateSetup() {
        try {
            if (!this.config.hasValidConfig()) {
                console.error('❌ Configuration validation failed');
                return false;
            }
            const apiConfig = this.config.getApiConfig();
            if (!apiConfig)
                return false;
            const llmProvider = llmProvider_1.LLMProviderFactory.createProvider(apiConfig.provider, apiConfig.apiKey);
            const isValid = await llmProvider.validateApiKey();
            if (!isValid) {
                console.error('❌ API key validation failed');
                return false;
            }
            console.log('✅ Setup validation successful');
            return true;
        }
        catch (error) {
            console.error('❌ Setup validation error:', error);
            return false;
        }
    }
}
exports.CLIAnalysisEngine = CLIAnalysisEngine;
//# sourceMappingURL=CLIAnalysisEngine.js.map