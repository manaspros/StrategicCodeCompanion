"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const openai_1 = __importDefault(require("openai"));
const llmProvider_1 = require("./llmProvider");
class OpenAIProvider extends llmProvider_1.LLMProvider {
    constructor(apiKey) {
        super(apiKey);
        this.client = new openai_1.default({
            apiKey: apiKey,
        });
    }
    async generateResponse(messages, options) {
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
        }
        catch (error) {
            throw new Error(`OpenAI API error: ${error}`);
        }
    }
    getDefaultModel() {
        return 'gpt-4o-mini'; // Updated to current model
    }
    async validateApiKey() {
        try {
            console.log('OpenAI: Validating API key...');
            const response = await this.client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: 'Test' }],
                max_tokens: 5
            });
            console.log('OpenAI: API key validation successful');
            return true;
        }
        catch (error) {
            console.error('OpenAI: API key validation failed:', error);
            return false;
        }
    }
}
exports.OpenAIProvider = OpenAIProvider;
//# sourceMappingURL=openai.js.map