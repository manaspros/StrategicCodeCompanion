"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyManager = void 0;
const vscode = __importStar(require("vscode"));
class KeyManager {
    constructor(context) {
        this.context = context;
    }
    /**
     * Securely stores the API key using VS Code's SecretStorage API
     */
    async storeAPIKey(config) {
        try {
            // Store the API key securely
            await this.context.secrets.store(KeyManager.API_KEY_SECRET, config.apiKey);
            // Store the provider in workspace state (not sensitive)
            await this.context.workspaceState.update(KeyManager.PROVIDER_KEY, config.provider);
            vscode.window.showInformationMessage('API key stored securely!');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to store API key: ${error}`);
            throw error;
        }
    }
    /**
     * Retrieves the stored API key configuration
     */
    async getAPIKeyConfig() {
        try {
            const apiKey = await this.context.secrets.get(KeyManager.API_KEY_SECRET);
            const provider = this.context.workspaceState.get(KeyManager.PROVIDER_KEY);
            if (!apiKey || !provider) {
                return null;
            }
            return { provider, apiKey };
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to retrieve API key: ${error}`);
            return null;
        }
    }
    /**
     * Checks if API key is configured
     */
    async hasAPIKey() {
        const config = await this.getAPIKeyConfig();
        return config !== null;
    }
    /**
     * Clears the stored API key
     */
    async clearAPIKey() {
        try {
            await this.context.secrets.delete(KeyManager.API_KEY_SECRET);
            await this.context.workspaceState.update(KeyManager.PROVIDER_KEY, undefined);
            vscode.window.showInformationMessage('API key cleared successfully!');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to clear API key: ${error}`);
            throw error;
        }
    }
    /**
     * Prompts user to enter API key configuration
     */
    async promptForAPIKey() {
        // First, ask for the provider
        const providerOptions = [
            { label: 'Google Gemini', description: 'Google\'s Gemini AI', detail: 'gemini' },
            { label: 'Anthropic Claude', description: 'Anthropic\'s Claude AI', detail: 'claude' },
            { label: 'OpenAI GPT', description: 'OpenAI\'s GPT models', detail: 'openai' }
        ];
        const selectedProvider = await vscode.window.showQuickPick(providerOptions, {
            placeHolder: 'Select your preferred LLM provider',
            canPickMany: false
        });
        if (!selectedProvider) {
            return null;
        }
        const provider = selectedProvider.detail;
        // Then ask for the API key
        const apiKey = await vscode.window.showInputBox({
            prompt: `Enter your ${selectedProvider.label} API key`,
            placeHolder: 'Your API key will be stored securely',
            password: true,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'API key cannot be empty';
                }
                if (value.length < 10) {
                    return 'API key seems too short';
                }
                return null;
            }
        });
        if (!apiKey) {
            return null;
        }
        return { provider, apiKey: apiKey.trim() };
    }
    /**
     * Ensures API key is configured, prompting user if needed
     */
    async ensureAPIKey() {
        let config = await this.getAPIKeyConfig();
        if (!config) {
            config = await this.promptForAPIKey();
            if (config) {
                await this.storeAPIKey(config);
            }
        }
        return config;
    }
    /**
     * Stores Composio API key securely
     */
    async storeComposioKey(composioKey) {
        try {
            await this.context.secrets.store(KeyManager.COMPOSIO_KEY_SECRET, composioKey);
            console.log('Composio API key stored securely');
        }
        catch (error) {
            console.error('Failed to store Composio API key:', error);
            throw error;
        }
    }
    /**
     * Retrieves the stored Composio API key
     */
    async getComposioKey() {
        try {
            const composioKey = await this.context.secrets.get(KeyManager.COMPOSIO_KEY_SECRET);
            return composioKey || null;
        }
        catch (error) {
            console.error('Failed to retrieve Composio API key:', error);
            return null;
        }
    }
    /**
     * Clears the stored Composio API key
     */
    async clearComposioKey() {
        try {
            await this.context.secrets.delete(KeyManager.COMPOSIO_KEY_SECRET);
            console.log('Composio API key cleared successfully');
        }
        catch (error) {
            console.error('Failed to clear Composio API key:', error);
            throw error;
        }
    }
}
exports.KeyManager = KeyManager;
KeyManager.API_KEY_SECRET = 'strategic-code-companion.apiKey';
KeyManager.PROVIDER_KEY = 'strategic-code-companion.provider';
KeyManager.COMPOSIO_KEY_SECRET = 'strategic-code-companion.composioKey';
//# sourceMappingURL=keyManager.js.map