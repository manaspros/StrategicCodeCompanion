"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiAgentOrchestrator = void 0;
const RefactorAgent_1 = require("./RefactorAgent");
const ArchitectAgent_1 = require("./ArchitectAgent");
const LibrarianAgent_1 = require("./LibrarianAgent");
const TutorAgent_1 = require("./TutorAgent");
class MultiAgentOrchestrator {
    constructor(llmProvider) {
        this.llmProvider = llmProvider;
        this.refactorAgent = new RefactorAgent_1.RefactorAgent(llmProvider);
        this.architectAgent = new ArchitectAgent_1.ArchitectAgent(llmProvider);
        this.librarianAgent = new LibrarianAgent_1.LibrarianAgent();
        this.tutorAgent = new TutorAgent_1.TutorAgent();
    }
    async analyzeCodebase(chunks) {
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
            return {
                analysis,
                refactoring,
                architecture,
                libraries,
                tutorials
            };
        }
        catch (error) {
            console.error('Analysis failed:', error);
            throw new Error(`Multi-agent analysis failed: ${error}`);
        }
    }
    async performInitialAnalysis(chunks) {
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
            const analysis = JSON.parse(jsonMatch[0]);
            return analysis;
        }
        catch (error) {
            console.error('Failed to parse analysis response:', error);
            // Return fallback analysis
            return this.createFallbackAnalysis(chunks);
        }
    }
    createCodebaseSummary(chunks) {
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
exports.MultiAgentOrchestrator = MultiAgentOrchestrator;
//# sourceMappingURL=main.js.map