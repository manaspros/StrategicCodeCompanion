"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeEmbeddingService = void 0;
class CodeEmbeddingService {
    constructor() {
        this.embeddings = new Map();
        this.chunks = new Map();
        // Simple in-memory storage - no native dependencies required
    }
    /**
     * Generates embeddings for code chunks using Nomic Embed (or fallback)
     */
    async generateEmbeddings(chunks) {
        const embeddings = [];
        // Process chunks in batches to avoid rate limits
        const batchSize = 10;
        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);
            const batchEmbeddings = await this.processBatch(batch);
            embeddings.push(...batchEmbeddings);
            // Small delay to respect rate limits
            if (i + batchSize < chunks.length) {
                await this.delay(100);
            }
        }
        return embeddings;
    }
    async processBatch(chunks) {
        const embeddings = [];
        for (const chunk of chunks) {
            try {
                // Prepare text for embedding - combine code with metadata
                const textToEmbed = this.prepareTextForEmbedding(chunk);
                // Try Nomic Embed first, fallback to simple embedding
                let vector;
                try {
                    vector = await this.getNomicEmbedding(textToEmbed);
                }
                catch (error) {
                    console.warn('Nomic Embed failed, using fallback:', error);
                    vector = this.getFallbackEmbedding(textToEmbed);
                }
                embeddings.push({
                    vector,
                    metadata: {
                        chunkId: chunk.id,
                        filePath: chunk.filePath,
                        type: chunk.type,
                        language: chunk.language
                    }
                });
                // Store chunk for later retrieval
                this.chunks.set(chunk.id, chunk);
            }
            catch (error) {
                console.warn(`Failed to generate embedding for chunk ${chunk.id}:`, error);
            }
        }
        return embeddings;
    }
    prepareTextForEmbedding(chunk) {
        let text = chunk.content;
        // Add metadata context to improve embedding quality
        const metadata = [];
        if (chunk.metadata.name) {
            metadata.push(`Name: ${chunk.metadata.name}`);
        }
        if (chunk.metadata.params && chunk.metadata.params.length > 0) {
            metadata.push(`Parameters: ${chunk.metadata.params.join(', ')}`);
        }
        metadata.push(`Type: ${chunk.type}`);
        metadata.push(`Language: ${chunk.language}`);
        metadata.push(`File: ${chunk.filePath}`);
        if (metadata.length > 0) {
            text = `${metadata.join('\n')}\n\n${text}`;
        }
        return text;
    }
    async getNomicEmbedding(text) {
        // Note: This is a placeholder implementation
        // In a real implementation, you would need to use the Nomic API
        // For now, we'll use the fallback method
        throw new Error('Nomic API not implemented - using fallback');
    }
    getFallbackEmbedding(text) {
        // Simple hash-based embedding as fallback
        // In production, you'd want to use a proper embedding model
        const hash = this.simpleHash(text);
        const vector = new Array(CodeEmbeddingService.EMBEDDING_DIMENSION).fill(0);
        // Generate pseudo-random vector based on text hash
        for (let i = 0; i < CodeEmbeddingService.EMBEDDING_DIMENSION; i++) {
            const seed = hash + i;
            vector[i] = Math.sin(seed) * Math.cos(seed * 2) * Math.tan(seed / 3);
        }
        // Normalize vector
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        return vector.map(val => val / magnitude);
    }
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
    /**
     * Builds the vector store from embeddings
     */
    async buildVectorStore(embeddings) {
        // Store embeddings in simple map structure
        embeddings.forEach((embedding, index) => {
            this.embeddings.set(embedding.metadata.chunkId, embedding);
        });
        console.log(`Built vector store with ${embeddings.length} embeddings`);
    }
    /**
     * Searches for similar code chunks using cosine similarity
     */
    async searchSimilar(queryText, topK = 5) {
        try {
            // Generate embedding for query
            let queryVector;
            try {
                queryVector = await this.getNomicEmbedding(queryText);
            }
            catch {
                queryVector = this.getFallbackEmbedding(queryText);
            }
            // Calculate similarities with all stored embeddings
            const similarities = [];
            for (const [chunkId, embedding] of this.embeddings) {
                const similarity = this.cosineSimilarity(queryVector, embedding.vector);
                similarities.push({ chunkId, similarity });
            }
            // Sort by similarity and get top K
            similarities.sort((a, b) => b.similarity - a.similarity);
            const topResults = similarities.slice(0, topK);
            // Retrieve corresponding chunks
            const similarChunks = [];
            for (const result of topResults) {
                const chunk = this.chunks.get(result.chunkId);
                if (chunk) {
                    similarChunks.push(chunk);
                }
            }
            return similarChunks;
        }
        catch (error) {
            console.error('Search failed:', error);
            return [];
        }
    }
    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) {
            throw new Error('Vectors must have the same length');
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);
        if (normA === 0 || normB === 0) {
            return 0;
        }
        return dotProduct / (normA * normB);
    }
    /**
     * Gets all chunks for context
     */
    getAllChunks() {
        return Array.from(this.chunks.values());
    }
    /**
     * Gets chunk by ID
     */
    getChunk(id) {
        return this.chunks.get(id);
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.CodeEmbeddingService = CodeEmbeddingService;
CodeEmbeddingService.EMBEDDING_DIMENSION = 768; // Standard embedding dimension
//# sourceMappingURL=embedding.js.map