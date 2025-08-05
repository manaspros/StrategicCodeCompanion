"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeProvider = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const llmProvider_1 = require("./llmProvider");
class ClaudeProvider extends llmProvider_1.LLMProvider {
    constructor(apiKey) {
        super(apiKey);
        this.client = new sdk_1.default({
            apiKey: apiKey,
        });
    }
    async generateResponse(messages, options) {
        try {
            // Convert messages to Claude format
            const systemMessage = messages.find(m => m.role === 'system');
            const conversationMessages = messages.filter(m => m.role !== 'system');
            const claudeMessages = conversationMessages.map(msg => ({
                role: msg.role,
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
        }
        catch (error) {
            throw new Error(`Claude API error: ${error}`);
        }
    }
    getDefaultModel() {
        return 'claude-3-5-haiku-20241022'; // Updated to current model
    }
    async validateApiKey() {
        try {
            console.log('Claude: Validating API key...');
            await this.client.messages.create({
                model: this.getDefaultModel(),
                max_tokens: 10,
                messages: [{ role: 'user', content: 'Test' }]
            });
            console.log('Claude: API key validation successful');
            return true;
        }
        catch (error) {
            console.error('Claude: API key validation failed:', error);
            return false;
        }
    }
}
exports.ClaudeProvider = ClaudeProvider;
//# sourceMappingURL=claude.js.map