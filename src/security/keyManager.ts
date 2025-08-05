import * as vscode from 'vscode';

export type LLMProvider = 'gemini' | 'claude' | 'openai';

export interface APIKeyConfig {
    provider: LLMProvider;
    apiKey: string;
}

export class KeyManager {
    private static readonly API_KEY_SECRET = 'strategic-code-companion.apiKey';
    private static readonly PROVIDER_KEY = 'strategic-code-companion.provider';

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Securely stores the API key using VS Code's SecretStorage API
     */
    async storeAPIKey(config: APIKeyConfig): Promise<void> {
        try {
            // Store the API key securely
            await this.context.secrets.store(KeyManager.API_KEY_SECRET, config.apiKey);
            
            // Store the provider in workspace state (not sensitive)
            await this.context.workspaceState.update(KeyManager.PROVIDER_KEY, config.provider);
            
            vscode.window.showInformationMessage('API key stored securely!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to store API key: ${error}`);
            throw error;
        }
    }

    /**
     * Retrieves the stored API key configuration
     */
    async getAPIKeyConfig(): Promise<APIKeyConfig | null> {
        try {
            const apiKey = await this.context.secrets.get(KeyManager.API_KEY_SECRET);
            const provider = this.context.workspaceState.get<LLMProvider>(KeyManager.PROVIDER_KEY);

            if (!apiKey || !provider) {
                return null;
            }

            return { provider, apiKey };
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to retrieve API key: ${error}`);
            return null;
        }
    }

    /**
     * Checks if API key is configured
     */
    async hasAPIKey(): Promise<boolean> {
        const config = await this.getAPIKeyConfig();
        return config !== null;
    }

    /**
     * Clears the stored API key
     */
    async clearAPIKey(): Promise<void> {
        try {
            await this.context.secrets.delete(KeyManager.API_KEY_SECRET);
            await this.context.workspaceState.update(KeyManager.PROVIDER_KEY, undefined);
            vscode.window.showInformationMessage('API key cleared successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to clear API key: ${error}`);
            throw error;
        }
    }

    /**
     * Prompts user to enter API key configuration
     */
    async promptForAPIKey(): Promise<APIKeyConfig | null> {
        // First, ask for the provider
        const providerOptions: vscode.QuickPickItem[] = [
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

        const provider = selectedProvider.detail as LLMProvider;

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
    async ensureAPIKey(): Promise<APIKeyConfig | null> {
        let config = await this.getAPIKeyConfig();
        
        if (!config) {
            config = await this.promptForAPIKey();
            if (config) {
                await this.storeAPIKey(config);
            }
        }

        return config;
    }
}