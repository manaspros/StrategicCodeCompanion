"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMProviderFactory = exports.LLMProvider = void 0;
class LLMProvider {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
}
exports.LLMProvider = LLMProvider;
class LLMProviderFactory {
    static createProvider(type, apiKey) {
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
exports.LLMProviderFactory = LLMProviderFactory;
//# sourceMappingURL=llmProvider.js.map