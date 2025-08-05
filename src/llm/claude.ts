import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMResponse, LLMMessage } from './llmProvider';

export class ClaudeProvider extends LLMProvider {
    private client: Anthropic;

    constructor(apiKey: string) {
        super(apiKey);
        this.client = new Anthropic({
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
            // Convert messages to Claude format
            const systemMessage = messages.find(m => m.role === 'system');
            const conversationMessages = messages.filter(m => m.role !== 'system');

            const claudeMessages: Anthropic.MessageParam[] = conversationMessages.map(msg => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content
            }));

            const response = await this.client.messages.create({
                model: options?.model || this.getDefaultModel(),
                max_tokens: options?.maxTokens || 4096,
                temperature: options?.temperature || 0.7,
                system: systemMessage?.content,
                messages: claudeMessages
            });

            const content = response.content[0];
            if (content.type !== 'text') {
                throw new Error('Unexpected response type from Claude');
            }

            return {
                content: content.text,
                usage: {
                    inputTokens: response.usage.input_tokens,
                    outputTokens: response.usage.output_tokens,
                    totalTokens: response.usage.input_tokens + response.usage.output_tokens
                }
            };
        } catch (error) {
            throw new Error(`Claude API error: ${error}`);
        }
    }

    getDefaultModel(): string {
        return 'claude-3-5-haiku-20241022'; // Updated to current model
    }

    async validateApiKey(): Promise<boolean> {
        try {
            console.log('Claude: Validating API key...');
            await this.client.messages.create({
                model: this.getDefaultModel(),
                max_tokens: 10,
                messages: [{ role: 'user', content: 'Test' }]
            });
            console.log('Claude: API key validation successful');
            return true;
        } catch (error) {
            console.error('Claude: API key validation failed:', error);
            return false;
        }
    }
}