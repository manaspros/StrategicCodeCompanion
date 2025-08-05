import axios from 'axios';
import { CodeChunk } from './ingestion';

export interface EmbeddingVector {
    vector: number[];
    metadata: {
        chunkId: string;
        filePath: string;
        type: string;
        language: string;
    };
}

export class CodeEmbeddingService {
    private static readonly EMBEDDING_DIMENSION = 768; // Standard embedding dimension
    
    private embeddings: Map<string, EmbeddingVector> = new Map();
    private chunks: Map<string, CodeChunk> = new Map();

    constructor() {
        // Simple in-memory storage - no native dependencies required
    }

    /**
     * Generates embeddings for code chunks using Nomic Embed (or fallback)
     */
    async generateEmbeddings(chunks: CodeChunk[]): Promise<EmbeddingVector[]> {
        const embeddings: EmbeddingVector[] = [];
        
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

    private async processBatch(chunks: CodeChunk[]): Promise<EmbeddingVector[]> {
        const embeddings: EmbeddingVector[] = [];
        
        for (const chunk of chunks) {
            try {
                // Prepare text for embedding - combine code with metadata
                const textToEmbed = this.prepareTextForEmbedding(chunk);
                
                // Try Nomic Embed first, fallback to simple embedding
                let vector: number[];
                try {
                    vector = await this.getNomicEmbedding(textToEmbed);
                } catch (error) {
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
                
            } catch (error) {
                console.warn(`Failed to generate embedding for chunk ${chunk.id}:`, error);
            }
        }
        
        return embeddings;
    }

    private prepareTextForEmbedding(chunk: CodeChunk): string {
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

    private async getNomicEmbedding(text: string): Promise<number[]> {
        // Note: This is a placeholder implementation
        // In a real implementation, you would need to use the Nomic API
        // For now, we'll use the fallback method
        throw new Error('Nomic API not implemented - using fallback');
    }

    private getFallbackEmbedding(text: string): number[] {
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

    private simpleHash(str: string): number {
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
    async buildVectorStore(embeddings: EmbeddingVector[]): Promise<void> {
        // Store embeddings in simple map structure
        embeddings.forEach((embedding, index) => {
            this.embeddings.set(embedding.metadata.chunkId, embedding);
        });
        
        console.log(`Built vector store with ${embeddings.length} embeddings`);
    }

    /**
     * Searches for similar code chunks using cosine similarity
     */
    async searchSimilar(queryText: string, topK: number = 5): Promise<CodeChunk[]> {
        try {
            // Generate embedding for query
            let queryVector: number[];
            try {
                queryVector = await this.getNomicEmbedding(queryText);
            } catch {
                queryVector = this.getFallbackEmbedding(queryText);
            }

            // Calculate similarities with all stored embeddings
            const similarities: Array<{chunkId: string, similarity: number}> = [];
            
            for (const [chunkId, embedding] of this.embeddings) {
                const similarity = this.cosineSimilarity(queryVector, embedding.vector);
                similarities.push({ chunkId, similarity });
            }

            // Sort by similarity and get top K
            similarities.sort((a, b) => b.similarity - a.similarity);
            const topResults = similarities.slice(0, topK);
            
            // Retrieve corresponding chunks
            const similarChunks: CodeChunk[] = [];
            for (const result of topResults) {
                const chunk = this.chunks.get(result.chunkId);
                if (chunk) {
                    similarChunks.push(chunk);
                }
            }

            return similarChunks;
        } catch (error) {
            console.error('Search failed:', error);
            return [];
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity(vecA: number[], vecB: number[]): number {
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
    getAllChunks(): CodeChunk[] {
        return Array.from(this.chunks.values());
    }

    /**
     * Gets chunk by ID
     */
    getChunk(id: string): CodeChunk | undefined {
        return this.chunks.get(id);
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}