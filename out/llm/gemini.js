"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiProvider = void 0;
const generative_ai_1 = require("@google/generative-ai");
const llmProvider_1 = require("./llmProvider");
class GeminiProvider extends llmProvider_1.LLMProvider {
    constructor(apiKey) {
        super(apiKey);
        this.client = new generative_ai_1.GoogleGenerativeAI(apiKey);
    }
    async generateResponse(messages, options) {
        try {
            const model = this.client.getGenerativeModel({
                model: options?.model || this.getDefaultModel(),
                generationConfig: {
                    temperature: options?.temperature || 0.7,
                    maxOutputTokens: options?.maxTokens || 4096,
                },
            });
            // Convert messages to Gemini format
            const systemMessage = messages.find((m) => m.role === "system");
            const conversationMessages = messages.filter((m) => m.role !== "system");
            let prompt = "";
            if (systemMessage) {
                prompt += `System: ${systemMessage.content}\n\n`;
            }
            for (const message of conversationMessages) {
                prompt += `${message.role === "user" ? "Human" : "Assistant"}: ${message.content}\n\n`;
            }
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            return {
                content: text,
                usage: {
                    inputTokens: 0,
                    outputTokens: 0,
                    totalTokens: 0,
                },
            };
        }
        catch (error) {
            throw new Error(`Gemini API error: ${error}`);
        }
    }
    getDefaultModel() {
        return "gemini-2.5-flash"; // Updated to current model
    }
    async validateApiKey() {
        try {
            console.log("Gemini: Validating API key...");
            const model = this.client.getGenerativeModel({
                model: "gemini-1.5-flash",
            }); // Updated model
            await model.generateContent("Test");
            console.log("Gemini: API key validation successful");
            return true;
        }
        catch (error) {
            console.error("Gemini: API key validation failed:", error);
            return false;
        }
    }
}
exports.GeminiProvider = GeminiProvider;
//# sourceMappingURL=gemini.js.map