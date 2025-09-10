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
                // Handle large chunks by breaking them into sub-chunks
                const subEmbeddings = await this.processLargeChunk(chunk, textToEmbed);
                embeddings.push(...subEmbeddings);
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
        // Limit text length to avoid Nomic API token limit (8192 tokens ≈ 3000 chars for safety)
        const maxLength = 3000;
        if (text.length > maxLength) {
            console.log(`Truncating chunk from ${text.length} to ${maxLength} chars for Nomic API`);
            text = text.substring(0, maxLength) + '\n... [truncated for embedding]';
        }
        return text;
    }
    async processLargeChunk(chunk, textToEmbed) {
        const maxLength = 3000;
        const embeddings = [];
        if (textToEmbed.length <= maxLength) {
            // Small chunk - single embedding
            const vector = await this.getNomicEmbedding(textToEmbed);
            embeddings.push({
                vector,
                metadata: {
                    chunkId: chunk.id,
                    filePath: chunk.filePath,
                    type: chunk.type,
                    language: chunk.language,
                    subChunkIndex: 0,
                    totalSubChunks: 1
                }
            });
        }
        else {
            // Large chunk - break into multiple embeddings to preserve ALL data
            const metadata = [
                `Name: ${chunk.name}`,
                `Type: ${chunk.type}`,
                `Language: ${chunk.language}`,
                `File: ${chunk.filePath}`
            ].join('\n') + '\n\n';
            const contentOnly = chunk.content;
            const availableSpace = maxLength - metadata.length - 50; // Reserve space for metadata + part info
            // Calculate number of sub-chunks needed
            const totalSubChunks = Math.ceil(contentOnly.length / availableSpace);
            console.log(`Breaking large chunk ${chunk.name} into ${totalSubChunks} sub-embeddings (preserving ALL ${contentOnly.length} chars)`);
            // Create embedding for each sub-chunk
            for (let i = 0; i < totalSubChunks; i++) {
                const start = i * availableSpace;
                const end = Math.min(start + availableSpace, contentOnly.length);
                const subContent = contentOnly.substring(start, end);
                // Add continuation markers
                let finalContent = subContent;
                if (i > 0)
                    finalContent = '... ' + finalContent;
                if (i < totalSubChunks - 1)
                    finalContent = finalContent + ' ...';
                const subChunkText = `${metadata}Part: ${i + 1} of ${totalSubChunks}\n\n${finalContent}`;
                const vector = await this.getNomicEmbedding(subChunkText);
                embeddings.push({
                    vector,
                    metadata: {
                        chunkId: `${chunk.id}_part_${i}`,
                        originalChunkId: chunk.id,
                        filePath: chunk.filePath,
                        type: chunk.type,
                        language: chunk.language,
                        subChunkIndex: i,
                        totalSubChunks: totalSubChunks
                    }
                });
            }
        }
        return embeddings;
    }
    async getNomicEmbedding(text) {
        const nomicApiKey = process.env.NOMIC_API_KEY || 'nk-FopoMYmt6vR21Tq6wBsajndbcwA7kbelpfq5pTiPIXg';
        if (!nomicApiKey) {
            throw new Error('Nomic API key not configured');
        }
        try {
            const response = await fetch('https://api-atlas.nomic.ai/v1/embedding/text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${nomicApiKey}`
                },
                body: JSON.stringify({
                    model: 'nomic-embed-text-v1.5',
                    texts: [text],
                    task_type: 'search_document',
                    dimensionality: CodeEmbeddingService.EMBEDDING_DIMENSION
                })
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Nomic API error: ${response.status} ${response.statusText} - ${errorText}`);
            }
            const data = await response.json();
            if (!data.embeddings || !data.embeddings[0]) {
                throw new Error('Invalid response from Nomic API: missing embeddings');
            }
            return data.embeddings[0];
        }
        catch (error) {
            console.error('Nomic API request failed:', error);
            throw error;
        }
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
            // Generate embedding for query using Nomic
            const queryVector = await this.getNomicEmbedding(queryText);
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