import { CodeChunk } from '../rag/ingestion';

// Export CodeChunk for use in other agents
export { CodeChunk };
import { LLMProvider } from '../llm/llmProvider';
import { RefactorAgent } from './RefactorAgent';
import { ArchitectAgent } from './ArchitectAgent';
import { LibrarianAgent } from './LibrarianAgent';
import { TutorAgent } from './TutorAgent';
import { OpenAIAgentOrchestrator, EnhancedAgentResults, UniqueRecommendation, BusinessStrategy } from '../services/OpenAIAgentOrchestrator';

// Export enhanced types for external use
export { EnhancedAgentResults, UniqueRecommendation, BusinessStrategy };

export interface CodebaseAnalysis {
    overall_summary: string;
    key_technologies: string[];
    architectural_patterns: string[];
    main_dependencies: string[];
    potential_areas_for_refactoring: string[];
    project_type: string;
    complexity_score: number;
    code_quality_metrics: {
        maintainability: number;
        readability: number;
        testability: number;
    };
}

export interface AgentResults {
    analysis: CodebaseAnalysis;
    refactoring: any;
    architecture: any;
    libraries: any;
    tutorials: any;
    enhanced?: EnhancedAgentResults; // New enhanced results from advanced agents
}

export class MultiAgentOrchestrator {
    private llmProvider: LLMProvider;
    private refactorAgent: RefactorAgent;
    private architectAgent: ArchitectAgent;
    private librarianAgent: LibrarianAgent;
    private tutorAgent: TutorAgent;
    private enhancedOrchestrator: OpenAIAgentOrchestrator;
    private useEnhancedAgents: boolean = true;

    constructor(llmProvider: LLMProvider, composioApiKey?: string) {
        this.llmProvider = llmProvider;
        this.refactorAgent = new RefactorAgent(llmProvider);
        this.architectAgent = new ArchitectAgent(llmProvider);
        this.librarianAgent = new LibrarianAgent();
        this.tutorAgent = new TutorAgent();
        this.enhancedOrchestrator = new OpenAIAgentOrchestrator(llmProvider);
        
        // Initialize enhanced orchestrator with Composio API key
        if (composioApiKey) {
            this.enhancedOrchestrator.initialize(composioApiKey);
        }
    }

    async analyzeCodebase(chunks: CodeChunk[]): Promise<AgentResults> {
        try {
            // Step 1: Initial analysis and summary
            console.log('Starting codebase analysis...');
            const analysis = await this.performInitialAnalysis(chunks);

            // Step 2: Run specialist agents in parallel for better performance
            console.log('Running specialist agents...');
            const [refactoring, architecture, libraries, tutorials] = await Promise.all([
                this.refactorAgent.generateRefactoringSuggestions(analysis, chunks),
                this.architectAgent.generateArchitectureSuggestions(analysis, chunks),
                this.librarianAgent.findRelevantLibraries(analysis, chunks),
                this.tutorAgent.findTutorials(analysis, chunks)
            ]);

            // Step 3: Run enhanced agent analysis for unique value propositions
            let enhanced: EnhancedAgentResults | undefined;
            if (this.useEnhancedAgents) {
                try {
                    console.log('Running enhanced agent analysis...');
                    enhanced = await this.enhancedOrchestrator.analyzeWithEnhancedAgents(analysis, chunks);
                    console.log('Enhanced analysis completed successfully');
                    
                    // If enhanced analysis succeeded, prioritize showing it
                    if (enhanced && enhanced.uniqueRecommendations.length > 0) {
                        console.log('Enhanced analysis has', enhanced.uniqueRecommendations.length, 'unique recommendations');
                    }
                } catch (error) {
                    console.warn('Enhanced agent analysis failed, continuing without it:', error);
                    enhanced = undefined;
                    // If enhanced agents fail due to API issues, disable them for this session
                    if (error instanceof Error && (error.message.includes('API') || error.message.includes('overloaded'))) {
                        console.log('Disabling enhanced agents due to API issues');
                        this.useEnhancedAgents = false;
                    }
                }
            }

            return {
                analysis,
                refactoring,
                architecture,
                libraries,
                tutorials,
                enhanced
            };
        } catch (error) {
            console.error('Analysis failed:', error);
            throw new Error(`Multi-agent analysis failed: ${error}`);
        }
    }

    /**
     * Configure enhanced agent settings
     */
    setEnhancedAgents(enabled: boolean): void {
        this.useEnhancedAgents = enabled;
    }

    /**
     * Initialize enhanced agents with API keys
     */
    async initializeEnhancedAgents(composioApiKey: string): Promise<void> {
        await this.enhancedOrchestrator.initialize(composioApiKey);
    }

    private async performInitialAnalysis(chunks: CodeChunk[]): Promise<CodebaseAnalysis> {
        // Prepare codebase summary for analysis
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

            // Parse JSON response
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const analysis = JSON.parse(jsonMatch[0]) as CodebaseAnalysis;
            return analysis;
        } catch (error) {
            console.error('Failed to parse analysis response:', error);
            // Return fallback analysis
            return this.createFallbackAnalysis(chunks);
        }
    }

    private createCodebaseSummary(chunks: CodeChunk[]): string {
        const summary = [];
        
        // Basic statistics
        const totalLines = chunks.reduce((sum, chunk) => sum + (chunk.endLine - chunk.startLine + 1), 0);
        const fileCount = new Set(chunks.map(chunk => chunk.filePath)).size;
        const languageCount = new Set(chunks.map(chunk => chunk.language));
        
        summary.push(`Project Statistics:
- Total files: ${fileCount}
- Total lines of code: ${totalLines}
- Languages: ${Array.from(languageCount).join(', ')}
- Total code chunks: ${chunks.length}`);

        // File structure overview
        const fileTypes = new Map<string, number>();
        const functionNames = new Set<string>();
        const classNames = new Set<string>();
        
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

        // Sample code chunks for context
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

    private createFallbackAnalysis(chunks: CodeChunk[]): CodebaseAnalysis {
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