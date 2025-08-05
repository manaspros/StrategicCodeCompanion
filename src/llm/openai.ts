import OpenAI from 'openai';
import { LLMProvider, LLMResponse, LLMMessage } from './llmProvider';

export class OpenAIProvider extends LLMProvider {
    private client: OpenAI;

    constructor(apiKey: string) {
        super(apiKey);
        this.client = new OpenAI({
            apiKey: apiKey,
        });
    }

    async generateResponse(
        messages: LLMMessage[], 
        options?: {
            temperature?: number;
            maxTokens?: number;
            model?: string;
        }
    ): Promise<LLMResponse> {
        try {
            const response = await this.client.chat.completions.create({
                model: options?.model || this.getDefaultModel(),
                messages: messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                temperature: options?.temperature || 0.7,
                max_tokens: options?.maxTokens || 4096,
            });

            const choice = response.choices[0];
            if (!choice.message.content) {
                throw new Error('No content in OpenAI response');
            }

            return {
                content: choice.message.content,
                usage: {
                    inputTokens: response.usage?.prompt_tokens || 0,
                    outputTokens: response.usage?.completion_tokens || 0,
                    totalTokens: response.usage?.total_tokens || 0
                }
            };
        } catch (error) {
            throw new Error(`OpenAI API error: ${error}`);
        }
    }

    getDefaultModel(): string {
        return 'gpt-4o-mini'; // Updated to current model
    }

    async validateApiKey(): Promise<boolean> {
        try {
            console.log('OpenAI: Validating API key...');
            const response = await this.client.chat.completions.create({
                model: 'gpt-4o-mini', // Use a reliable, current model
                messages: [{ role: 'user', content: 'Test' }],
                max_tokens: 5
            });
            console.log('OpenAI: API key validation successful');
            return true;
        } catch (error) {
            console.error('OpenAI: API key validation failed:', error);
            return false;
        }
    }
}