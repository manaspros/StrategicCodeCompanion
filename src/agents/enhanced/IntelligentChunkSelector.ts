import { CodeChunk } from '../main';
import { LLMProvider } from '../../llm/llmProvider';

export interface ChunkPriority {
    chunk: CodeChunk;
    priorityScore: number;
    relevanceReasons: string[];
    analysisType: 'critical' | 'important' | 'supporting' | 'context';
}

export interface ChunkSelectionStrategy {
    maxChunks: number;
    focusArea: 'architecture' | 'business-logic' | 'quality' | 'performance' | 'security' | 'general';
    includeContext: boolean;
    diversityWeight: number; // 0-1, higher means more diverse selection
}

export class IntelligentChunkSelector {
    constructor(private llmProvider: LLMProvider) {}

    /**
     * Intelligently select the most relevant code chunks for analysis
     */
    async selectOptimalChunks(
        allChunks: CodeChunk[],
        strategy: ChunkSelectionStrategy
    ): Promise<ChunkPriority[]> {
        console.log(`🎯 Selecting optimal chunks for ${strategy.focusArea} analysis...`);

        // Step 1: Score all chunks based on multiple criteria
        const scoredChunks = await this.scoreChunks(allChunks, strategy);

        // Step 2: Apply diversity selection to avoid similar chunks
        const diversifiedChunks = this.applyDiversitySelection(scoredChunks, strategy);

        // Step 3: Select top chunks respecting the limit
        const selectedChunks = diversifiedChunks.slice(0, strategy.maxChunks);

        console.log(`✅ Selected ${selectedChunks.length} optimal chunks (${selectedChunks.filter(c => c.analysisType === 'critical').length} critical, ${selectedChunks.filter(c => c.analysisType === 'important').length} important)`);

        return selectedChunks;
    }

    private async scoreChunks(
        chunks: CodeChunk[],
        strategy: ChunkSelectionStrategy
    ): Promise<ChunkPriority[]> {
        const scored: ChunkPriority[] = [];

        for (const chunk of chunks) {
            const score = await this.calculateChunkScore(chunk, strategy);
            const reasons = this.getRelevanceReasons(chunk, strategy, score);
            const analysisType = this.determineAnalysisType(score);

            scored.push({
                chunk,
                priorityScore: score.total,
                relevanceReasons: reasons,
                analysisType
            });
        }

        return scored.sort((a, b) => b.priorityScore - a.priorityScore);
    }

    private async calculateChunkScore(
        chunk: CodeChunk,
        strategy: ChunkSelectionStrategy
    ): Promise<ChunkScore> {
        const score: ChunkScore = {
            complexity: 0,
            businessRelevance: 0,
            architecturalImportance: 0,
            qualityIndicators: 0,
            contextValue: 0,
            total: 0
        };

        // Base scoring
        score.complexity = this.assessComplexity(chunk);
        score.businessRelevance = this.assessBusinessRelevance(chunk);
        score.architecturalImportance = this.assessArchitecturalImportance(chunk);
        score.qualityIndicators = this.assessQualityIndicators(chunk);
        score.contextValue = this.assessContextValue(chunk);

        // Apply focus area weighting
        this.applyFocusWeighting(score, strategy.focusArea);

        // Calculate total score
        score.total = (
            score.complexity * 0.2 +
            score.businessRelevance * 0.25 +
            score.architecturalImportance * 0.25 +
            score.qualityIndicators * 0.2 +
            score.contextValue * 0.1
        );

        return score;
    }

    private assessComplexity(chunk: CodeChunk): number {
        let complexity = 0;

        // Size-based complexity
        const lines = chunk.content.split('\n').length;
        if (lines > 100) complexity += 3;
        else if (lines > 50) complexity += 2;
        else if (lines > 20) complexity += 1;

        // Cyclomatic complexity indicators
        const controlStructures = (chunk.content.match(/\b(if|else|while|for|switch|case|try|catch)\b/g) || []).length;
        complexity += Math.min(controlStructures * 0.3, 3);

        // Nesting depth (rough estimate)
        const maxNesting = this.estimateNestingDepth(chunk.content);
        complexity += Math.min(maxNesting * 0.5, 2);

        // Function/method count in file
        const functionCount = (chunk.content.match(/function\s+\w+|=>\s*{|\w+\s*\(/g) || []).length;
        complexity += Math.min(functionCount * 0.1, 2);

        return Math.min(complexity, 10);
    }

    private assessBusinessRelevance(chunk: CodeChunk): number {
        let relevance = 0;

        const content = chunk.content.toLowerCase();
        const path = chunk.filePath.toLowerCase();

        // Business domain indicators
        const businessTerms = [
            'user', 'customer', 'order', 'payment', 'account', 'profile',
            'transaction', 'billing', 'subscription', 'product', 'service',
            'authentication', 'authorization', 'security', 'validation'
        ];
        
        businessTerms.forEach(term => {
            if (content.includes(term) || path.includes(term)) {
                relevance += 0.5;
            }
        });

        // File path indicators
        if (path.includes('service') || path.includes('business') || path.includes('domain')) {
            relevance += 2;
        }
        if (path.includes('controller') || path.includes('api') || path.includes('handler')) {
            relevance += 1.5;
        }
        if (path.includes('model') || path.includes('entity')) {
            relevance += 1.5;
        }

        // Type-based relevance
        if (chunk.type === 'class' || chunk.type === 'function') {
            relevance += 1;
        }

        return Math.min(relevance, 10);
    }

    private assessArchitecturalImportance(chunk: CodeChunk): number {
        let importance = 0;

        const content = chunk.content.toLowerCase();
        const path = chunk.filePath.toLowerCase();

        // Architectural pattern indicators
        const patterns = [
            'factory', 'singleton', 'observer', 'strategy', 'decorator',
            'facade', 'adapter', 'proxy', 'command', 'template'
        ];
        patterns.forEach(pattern => {
            if (content.includes(pattern) || path.includes(pattern)) {
                importance += 1;
            }
        });

        // Configuration and setup files
        if (path.includes('config') || path.includes('setup') || path.includes('main') || path.includes('app')) {
            importance += 2;
        }

        // Interface/contract definitions
        if (chunk.type === 'interface' || content.includes('interface') || content.includes('abstract')) {
            importance += 1.5;
        }

        // Dependency injection indicators
        if (content.includes('inject') || content.includes('dependency') || content.includes('container')) {
            importance += 1.5;
        }

        // Module boundaries
        if (content.includes('export') && content.includes('import')) {
            importance += 1;
        }

        return Math.min(importance, 10);
    }

    private assessQualityIndicators(chunk: CodeChunk): number {
        let quality = 5; // Start with neutral score

        const content = chunk.content;

        // Positive indicators
        if (content.includes('test') || content.includes('spec')) {
            quality += 1; // Good: has tests
        }
        if (content.match(/\/\*\*[\s\S]*?\*\//)) {
            quality += 0.5; // Good: has documentation
        }
        if (content.includes('try') && content.includes('catch')) {
            quality += 0.5; // Good: has error handling
        }

        // Negative indicators (code smells)
        if (content.includes('TODO') || content.includes('FIXME') || content.includes('HACK')) {
            quality -= 1; // Bad: has technical debt markers
        }
        if ((content.match(/console\.log/g) || []).length > 3) {
            quality -= 0.5; // Bad: too many console.log statements
        }
        if (content.includes('any') && content.includes('typescript')) {
            quality -= 0.5; // Bad: TypeScript with any types
        }

        // Complexity-based quality reduction
        const lines = content.split('\n').length;
        if (lines > 200) {
            quality -= 1; // Bad: very long file/function
        }

        return Math.max(0, Math.min(quality, 10));
    }

    private assessContextValue(chunk: CodeChunk): number {
        let contextValue = 0;

        // Files that provide good context for understanding the system
        const path = chunk.filePath.toLowerCase();

        if (path.includes('readme') || path.includes('doc')) {
            contextValue += 2;
        }
        if (path.includes('example') || path.includes('demo')) {
            contextValue += 1.5;
        }
        if (path.includes('util') || path.includes('helper') || path.includes('common')) {
            contextValue += 1;
        }

        // Type-based context value
        if (chunk.type === 'interface' || chunk.type === 'type') {
            contextValue += 1.5; // Interfaces provide good context
        }

        return Math.min(contextValue, 10);
    }

    private applyFocusWeighting(score: ChunkScore, focusArea: string): void {
        const weights = {
            architecture: { complexity: 1.2, architecturalImportance: 2.0, contextValue: 1.5 },
            'business-logic': { businessRelevance: 2.0, complexity: 1.3, qualityIndicators: 1.2 },
            quality: { qualityIndicators: 2.0, complexity: 1.5, businessRelevance: 1.2 },
            performance: { complexity: 1.8, architecturalImportance: 1.3, qualityIndicators: 1.4 },
            security: { businessRelevance: 1.5, qualityIndicators: 1.8, contextValue: 1.2 },
            general: { complexity: 1.1, businessRelevance: 1.1, architecturalImportance: 1.1 }
        };

        const weight = weights[focusArea as keyof typeof weights] || weights.general;
        
        Object.keys(weight).forEach(key => {
            const k = key as keyof ChunkScore;
            if (typeof score[k] === 'number') {
                (score[k] as number) *= weight[k as keyof typeof weight] || 1;
            }
        });
    }

    private applyDiversitySelection(
        scoredChunks: ChunkPriority[],
        strategy: ChunkSelectionStrategy
    ): ChunkPriority[] {
        if (strategy.diversityWeight === 0) {
            return scoredChunks; // No diversity required
        }

        const selected: ChunkPriority[] = [];
        const remaining = [...scoredChunks];

        while (selected.length < strategy.maxChunks && remaining.length > 0) {
            if (selected.length === 0) {
                // Always select the highest scoring chunk first
                selected.push(remaining.shift()!);
                continue;
            }

            // For subsequent selections, balance score and diversity
            let bestChunk = remaining[0];
            let bestScore = this.calculateDiversityScore(bestChunk, selected, strategy.diversityWeight);

            for (let i = 1; i < Math.min(remaining.length, 10); i++) { // Only check top 10 for performance
                const chunk = remaining[i];
                const diversityScore = this.calculateDiversityScore(chunk, selected, strategy.diversityWeight);
                
                if (diversityScore > bestScore) {
                    bestChunk = chunk;
                    bestScore = diversityScore;
                }
            }

            selected.push(bestChunk);
            remaining.splice(remaining.indexOf(bestChunk), 1);
        }

        return selected;
    }

    private calculateDiversityScore(
        candidate: ChunkPriority,
        selected: ChunkPriority[],
        diversityWeight: number
    ): number {
        const baseScore = candidate.priorityScore;
        
        // Calculate diversity penalty
        let diversityPenalty = 0;
        
        for (const selectedChunk of selected) {
            const similarity = this.calculateSimilarity(candidate.chunk, selectedChunk.chunk);
            diversityPenalty += similarity;
        }
        
        diversityPenalty = diversityPenalty / selected.length; // Average similarity
        
        // Combine base score with diversity bonus
        const diversityBonus = (1 - diversityPenalty) * diversityWeight * baseScore;
        
        return baseScore + diversityBonus;
    }

    private calculateSimilarity(chunk1: CodeChunk, chunk2: CodeChunk): number {
        let similarity = 0;

        // File path similarity
        const path1Parts = chunk1.filePath.toLowerCase().split(/[\/\\]/);
        const path2Parts = chunk2.filePath.toLowerCase().split(/[\/\\]/);
        const pathOverlap = path1Parts.filter(part => path2Parts.includes(part)).length;
        similarity += (pathOverlap / Math.max(path1Parts.length, path2Parts.length)) * 0.3;

        // Type similarity
        if (chunk1.type === chunk2.type) {
            similarity += 0.2;
        }

        // Language similarity
        if (chunk1.language === chunk2.language) {
            similarity += 0.1;
        }

        // Content similarity (basic keyword overlap)
        const words1 = new Set(chunk1.content.toLowerCase().match(/\w+/g) || []);
        const words2 = new Set(chunk2.content.toLowerCase().match(/\w+/g) || []);
        const commonWords = new Set([...words1].filter(word => words2.has(word)));
        const keywordSimilarity = commonWords.size / Math.max(words1.size, words2.size);
        similarity += keywordSimilarity * 0.4;

        return Math.min(similarity, 1);
    }

    private getRelevanceReasons(
        chunk: CodeChunk,
        strategy: ChunkSelectionStrategy,
        score: ChunkScore
    ): string[] {
        const reasons: string[] = [];

        if (score.complexity > 6) {
            reasons.push('High complexity code requiring attention');
        }
        if (score.businessRelevance > 6) {
            reasons.push('Critical business logic component');
        }
        if (score.architecturalImportance > 6) {
            reasons.push('Key architectural component');
        }
        if (score.qualityIndicators < 4) {
            reasons.push('Quality concerns identified');
        }
        if (chunk.type === 'class' || chunk.type === 'function') {
            reasons.push('Core implementation component');
        }

        return reasons;
    }

    private determineAnalysisType(score: ChunkScore): 'critical' | 'important' | 'supporting' | 'context' {
        if (score.total > 8) return 'critical';
        if (score.total > 6) return 'important';
        if (score.total > 3) return 'supporting';
        return 'context';
    }

    private estimateNestingDepth(content: string): number {
        const lines = content.split('\n');
        let maxDepth = 0;
        let currentDepth = 0;

        for (const line of lines) {
            const openBraces = (line.match(/{/g) || []).length;
            const closeBraces = (line.match(/}/g) || []).length;
            
            currentDepth += openBraces - closeBraces;
            maxDepth = Math.max(maxDepth, currentDepth);
        }

        return maxDepth;
    }
}

interface ChunkScore {
    complexity: number;
    businessRelevance: number;
    architecturalImportance: number;
    qualityIndicators: number;
    contextValue: number;
    total: number;
}