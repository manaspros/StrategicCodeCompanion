import { LLMProvider as ProviderType } from '../security/keyManager';

export interface LLMResponse {
    content: string;
    usage?: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
}

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export abstract class LLMProvider {
    protected apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    abstract generateResponse(messages: LLMMessage[], options?: {
        temperature?: number;
        maxTokens?: number;
        model?: string;
    }): Promise<LLMResponse>;

    abstract getDefaultModel(): string;
    abstract validateApiKey(): Promise<boolean>;
}

export class LLMProviderFactory {
    static createProvider(type: ProviderType, apiKey: string): LLMProvider {
        switch (type) {
            case 'gemini':
                return new (require('./gemini').GeminiProvider)(apiKey);
            case 'claude':
                return new (require('./claude').ClaudeProvider)(apiKey);
            case 'openai':
                return new (require('./openai').OpenAIProvider)(apiKey);
            default:
                throw new Error(`Unsupported LLM provider: ${type}`);
        }
    }
}