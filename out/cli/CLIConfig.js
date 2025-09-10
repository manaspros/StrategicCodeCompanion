"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLIConfig = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
class CLIConfig {
    constructor(configPath) {
        this.configPath = configPath || path_1.default.join(os_1.default.homedir(), '.strategic-code-companion', 'config.json');
        this.configData = {
            defaultProvider: 'gemini',
            apiKeys: {},
            outputPreferences: {
                defaultFormat: 'json',
                verboseLogging: false
            }
        };
    }
    async loadFromFile(configPath) {
        const filePath = configPath || this.configPath;
        try {
            const configContent = await promises_1.default.readFile(filePath, 'utf-8');
            this.configData = { ...this.configData, ...JSON.parse(configContent) };
        }
        catch (error) {
            // Config file doesn't exist or is invalid, use defaults
            if (configPath) {
                // Only throw if specific config path was requested
                throw new Error(`Cannot read config file: ${filePath}`);
            }
        }
        // Load from environment variables if available
        this.loadFromEnvironment();
    }
    loadFromEnvironment() {
        if (process.env.SCC_API_KEY) {
            const provider = process.env.SCC_PROVIDER || this.configData.defaultProvider;
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
            this.configData.defaultProvider = process.env.SCC_PROVIDER;
        }
    }
    async saveToFile() {
        const configDir = path_1.default.dirname(this.configPath);
        try {
            await promises_1.default.mkdir(configDir, { recursive: true });
            await promises_1.default.writeFile(this.configPath, JSON.stringify(this.configData, null, 2));
        }
        catch (error) {
            throw new Error(`Cannot save config file: ${this.configPath}`);
        }
    }
    setProvider(provider) {
        this.configData.defaultProvider = provider;
    }
    getProvider() {
        return this.configData.defaultProvider;
    }
    setApiKey(provider, apiKey) {
        this.configData.apiKeys[provider] = apiKey;
    }
    getApiKey(provider) {
        const targetProvider = provider || this.configData.defaultProvider;
        return this.configData.apiKeys[targetProvider];
    }
    hasApiKey(provider) {
        return !!this.getApiKey(provider);
    }
    setComposioKey(key) {
        this.configData.composioKey = key;
    }
    getComposioKey() {
        return this.configData.composioKey;
    }
    hasComposioKey() {
        return !!this.configData.composioKey;
    }
    getApiConfig() {
        const apiKey = this.getApiKey();
        if (!apiKey)
            return null;
        return {
            provider: this.getProvider(),
            apiKey
        };
    }
    hasValidConfig() {
        return this.hasApiKey();
    }
    setOutputFormat(format) {
        this.configData.outputPreferences.defaultFormat = format;
    }
    getOutputFormat() {
        return this.configData.outputPreferences.defaultFormat;
    }
    setVerboseLogging(enabled) {
        this.configData.outputPreferences.verboseLogging = enabled;
    }
    isVerboseLoggingEnabled() {
        return this.configData.outputPreferences.verboseLogging;
    }
    // Utility method to get config status for display
    getConfigStatus() {
        return {
            provider: this.getProvider(),
            hasApiKey: this.hasApiKey(),
            hasComposioKey: this.hasComposioKey(),
            configPath: this.configPath
        };
    }
}
exports.CLIConfig = CLIConfig;
//# sourceMappingURL=CLIConfig.js.map