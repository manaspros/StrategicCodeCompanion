import axios from 'axios';
import { CodeChunk } from './ingestion';

export interface EmbeddingVector {
    vector: number[];
    metadata: {
        chunkId: string;
        originalChunkId?: string; // For multi-part chunks
        filePath: string;
        type: string;
        language: string;
        subChunkIndex?: number; // Which part of the chunk (0-based)
        totalSubChunks?: number; // Total number of parts
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
                
                // Handle large chunks by breaking them into sub-chunks
                const subEmbeddings = await this.processLargeChunk(chunk, textToEmbed);
                embeddings.push(...subEmbeddings);
                
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
        
        // Limit text length to avoid Nomic API token limit (8192 tokens ≈ 3000 chars for safety)
        const maxLength = 3000;
        if (text.length > maxLength) {
            console.log(`Truncating chunk from ${text.length} to ${maxLength} chars for Nomic API`);
            text = text.substring(0, maxLength) + '\n... [truncated for embedding]';
        }
        
        return text;
    }

    private async processLargeChunk(chunk: CodeChunk, textToEmbed: string): Promise<EmbeddingVector[]> {
        const maxLength = 3000;
        const embeddings: EmbeddingVector[] = [];
        
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
        } else {
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
                if (i > 0) finalContent = '... ' + finalContent;
                if (i < totalSubChunks - 1) finalContent = finalContent + ' ...';
                
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

    private async getNomicEmbedding(text: string): Promise<number[]> {
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
            
        } catch (error) {
            console.error('Nomic API request failed:', error);
            throw error;
        }
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
            // Generate embedding for query using Nomic
            const queryVector = await this.getNomicEmbedding(queryText);

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