import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface APIConfig {
    provider: 'gemini' | 'claude' | 'openai';
    apiKey: string;
}

export interface CLIConfigData {
    defaultProvider: 'gemini' | 'claude' | 'openai';
    apiKeys: {
        gemini?: string;
        claude?: string;
        openai?: string;
    };
    composioKey?: string;
    outputPreferences: {
        defaultFormat: 'json' | 'markdown' | 'html' | 'pdf';
        verboseLogging: boolean;
    };
}

export class CLIConfig {
    private configData: CLIConfigData;
    private configPath: string;

    constructor(configPath?: string) {
        this.configPath = configPath || path.join(os.homedir(), '.strategic-code-companion', 'config.json');
        this.configData = {
            defaultProvider: 'gemini',
            apiKeys: {},
            outputPreferences: {
                defaultFormat: 'json',
                verboseLogging: false
            }
        };
    }

    async loadFromFile(configPath?: string): Promise<void> {
        const filePath = configPath || this.configPath;
        
        try {
            const configContent = await fs.readFile(filePath, 'utf-8');
            this.configData = { ...this.configData, ...JSON.parse(configContent) };
        } catch (error) {
            // Config file doesn't exist or is invalid, use defaults
            if (configPath) {
                // Only throw if specific config path was requested
                throw new Error(`Cannot read config file: ${filePath}`);
            }
        }

        // Load from environment variables if available
        this.loadFromEnvironment();
    }

    private loadFromEnvironment(): void {
        if (process.env.SCC_API_KEY) {
            const provider = (process.env.SCC_PROVIDER as any) || this.configData.defaultProvider;
            this.setApiKey(provider, process.env.SCC_API_KEY);
        }

        if (process.env.SCC_GEMINI_KEY) {
            this.configData.apiKeys.gemini = process.env.SCC_GEMINI_KEY;
        }

        if (process.env.SCC_CLAUDE_KEY) {
            this.configData.apiKeys.claude = process.env.SCC_CLAUDE_KEY;
        }

        if (process.env.SCC_OPENAI_KEY) {
            this.configData.apiKeys.openai = process.env.SCC_OPENAI_KEY;
        }

        if (process.env.SCC_COMPOSIO_KEY) {
            this.configData.composioKey = process.env.SCC_COMPOSIO_KEY;
        }

        if (process.env.SCC_PROVIDER) {
            this.configData.defaultProvider = process.env.SCC_PROVIDER as any;
        }
    }

    async saveToFile(): Promise<void> {
        const configDir = path.dirname(this.configPath);
        
        try {
            await fs.mkdir(configDir, { recursive: true });
            await fs.writeFile(this.configPath, JSON.stringify(this.configData, null, 2));
        } catch (error) {
            throw new Error(`Cannot save config file: ${this.configPath}`);
        }
    }

    setProvider(provider: 'gemini' | 'claude' | 'openai'): void {
        this.configData.defaultProvider = provider;
    }

    getProvider(): 'gemini' | 'claude' | 'openai' {
        return this.configData.defaultProvider;
    }

    setApiKey(provider: 'gemini' | 'claude' | 'openai', apiKey: string): void {
        this.configData.apiKeys[provider] = apiKey;
    }

    getApiKey(provider?: 'gemini' | 'claude' | 'openai'): string | undefined {
        const targetProvider = provider || this.configData.defaultProvider;
        return this.configData.apiKeys[targetProvider];
    }

    hasApiKey(provider?: 'gemini' | 'claude' | 'openai'): boolean {
        return !!this.getApiKey(provider);
    }

    setComposioKey(key: string): void {
        this.configData.composioKey = key;
    }

    getComposioKey(): string | undefined {
        return this.configData.composioKey;
    }

    hasComposioKey(): boolean {
        return !!this.configData.composioKey;
    }

    getApiConfig(): APIConfig | null {
        const apiKey = this.getApiKey();
        if (!apiKey) return null;

        return {
            provider: this.getProvider(),
            apiKey
        };
    }

    hasValidConfig(): boolean {
        return this.hasApiKey();
    }

    setOutputFormat(format: 'json' | 'markdown' | 'html' | 'pdf'): void {
        this.configData.outputPreferences.defaultFormat = format;
    }

    getOutputFormat(): 'json' | 'markdown' | 'html' | 'pdf' {
        return this.configData.outputPreferences.defaultFormat;
    }

    setVerboseLogging(enabled: boolean): void {
        this.configData.outputPreferences.verboseLogging = enabled;
    }

    isVerboseLoggingEnabled(): boolean {
        return this.configData.outputPreferences.verboseLogging;
    }

    // Utility method to get config status for display
    getConfigStatus(): {
        provider: string;
        hasApiKey: boolean;
        hasComposioKey: boolean;
        configPath: string;
    } {
        return {
            provider: this.getProvider(),
            hasApiKey: this.hasApiKey(),
            hasComposioKey: this.hasComposioKey(),
            configPath: this.configPath
        };
    }
}