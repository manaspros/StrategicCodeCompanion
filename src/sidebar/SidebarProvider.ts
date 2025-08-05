import * as vscode from 'vscode';
import * as path from 'path';
import { KeyManager } from '../security/keyManager';
import { LLMProviderFactory } from '../llm/llmProvider';
import { CodeIngestion } from '../rag/ingestion';
import { CodeEmbeddingService } from '../rag/embedding';
import { MultiAgentOrchestrator, AgentResults } from '../agents/main';

export class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'strategic-code-companion.sidebar';
    
    private _view?: vscode.WebviewView;
    private keyManager: KeyManager;
    private isAnalyzing = false;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        keyManager: KeyManager
    ) {
        this.keyManager = keyManager;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        console.log('Strategic Code Companion: resolveWebviewView called');
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: []
        };

        // Set the proper HTML content
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        
        console.log('Strategic Code Companion: Simple HTML set successfully');
        
        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            console.log('Strategic Code Companion: Received message:', data.type);
            console.log('Strategic Code Companion: Full message data:', JSON.stringify(data, null, 2));
            switch (data.type) {
                case 'analyzeWorkspace':
                    await this.analyzeWorkspace();
                    break;
                case 'openSettings':
                    await this.openSettings();
                    break;
                case 'clearApiKey':
                    await this.clearApiKey();
                    break;
                case 'saveApiKey':
                    console.log('Strategic Code Companion: Processing saveApiKey message');
                    console.log('Strategic Code Companion: Provider:', data.provider);
                    console.log('Strategic Code Companion: API key received:', data.apiKey ? 'Yes' : 'No');
                    await this.saveApiKey(data.provider, data.apiKey);
                    break;
                case 'openUrl':
                    vscode.env.openExternal(vscode.Uri.parse(data.url));
                    break;
                case 'testResults':
                    // Test results view with dummy data
                    this.showResults({
                        analysis: {
                            overall_summary: "Test analysis of your codebase",
                            key_technologies: ["JavaScript", "TypeScript"],
                            architectural_patterns: ["MVC", "Observer"],
                            main_dependencies: ["React", "Node.js"],
                            potential_areas_for_refactoring: ["Improve error handling"],
                            project_type: "web-app",
                            complexity_score: 7,
                            code_quality_metrics: {
                                maintainability: 8,
                                readability: 7,
                                testability: 6
                            }
                        },
                        refactoring: { suggestions: [], summary: { totalSuggestions: 0, highPriority: 0, mediumPriority: 0, lowPriority: 0, categories: [] } },
                        architecture: { features: [], summary: { totalFeatures: 0, byCategory: {}, byComplexity: {}, recommendedNext: [] } },
                        libraries: { recommendations: [], summary: { totalRecommendations: 0, byCategory: {}, highRelevance: 0, easyIntegration: 0 } },
                        tutorials: { tutorials: [], summary: { totalTutorials: 0, byDifficulty: {}, byPlatform: {}, averageRelevance: 0 } }
                    });
                    break;
            }
        });

        // Initialize the view
        console.log('Strategic Code Companion: About to initialize view');
        this.initializeView();
    }

    private async initializeView() {
        const hasApiKey = await this.keyManager.hasAPIKey();
        
        if (hasApiKey) {
            this.showMainView();
        } else {
            this.showOnboardingView();
        }
    }

    public async analyzeWorkspace() {
        if (this.isAnalyzing) {
            vscode.window.showWarningMessage('Analysis is already running!');
            return;
        }

        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder is open!');
            return;
        }

        try {
            this.isAnalyzing = true;
            this.showLoadingView();

            // Ensure API key is configured
            const apiConfig = await this.keyManager.ensureAPIKey();
            if (!apiConfig) {
                this.showOnboardingView();
                return;
            }

            // Create LLM provider
            const llmProvider = LLMProviderFactory.createProvider(apiConfig.provider, apiConfig.apiKey);

            // Validate API key
            const isValid = await llmProvider.validateApiKey();
            if (!isValid) {
                vscode.window.showErrorMessage('Invalid API key. Please check your configuration.');
                this.showOnboardingView();
                return;
            }

            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

            // Step 1: Ingest codebase
            this.updateLoadingMessage('Scanning codebase...');
            console.log('Strategic Code Companion: Starting codebase ingestion...');
            
            let chunks;
            try {
                const ingestion = new CodeIngestion(workspaceRoot);
                chunks = await ingestion.ingestWorkspace();
                console.log(`Strategic Code Companion: Found ${chunks.length} code chunks`);
            } catch (error) {
                console.error('Strategic Code Companion: Ingestion failed:', error);
                vscode.window.showErrorMessage(`Code analysis failed: ${error}`);
                this.showMainView();
                return;
            }

            if (chunks.length === 0) {
                vscode.window.showWarningMessage('No code files found in the workspace!');
                this.showMainView();
                return;
            }

            // Step 2: Generate embeddings (simplified)
            this.updateLoadingMessage('Processing code structure...');
            console.log('Strategic Code Companion: Generating embeddings...');
            
            try {
                const embeddingService = new CodeEmbeddingService();
                const embeddings = await embeddingService.generateEmbeddings(chunks.slice(0, 50)); // Limit for testing
                await embeddingService.buildVectorStore(embeddings);
                console.log('Strategic Code Companion: Embeddings generated successfully');
            } catch (error) {
                console.error('Strategic Code Companion: Embedding generation failed:', error);
                vscode.window.showErrorMessage(`Embedding generation failed: ${error}`);
                this.showMainView();
                return;
            }

            // Step 3: Run multi-agent analysis
            this.updateLoadingMessage('Running AI analysis...');
            console.log('Strategic Code Companion: Starting multi-agent analysis...');
            
            try {
                const orchestrator = new MultiAgentOrchestrator(llmProvider);
                const results = await orchestrator.analyzeCodebase(chunks.slice(0, 20)); // Limit for testing
                console.log('Strategic Code Companion: Analysis completed successfully');

                // Step 4: Display results
                this.showResults(results);
            } catch (error) {
                console.error('Strategic Code Companion: Analysis failed:', error);
                vscode.window.showErrorMessage(`AI analysis failed: ${error}`);
                this.showMainView();
                return;
            }

        } catch (error) {
            console.error('Strategic Code Companion: Analysis failed:', error);
            vscode.window.showErrorMessage(`Analysis failed: ${error}`);
            this.showMainView();
        } finally {
            this.isAnalyzing = false;
            console.log('Strategic Code Companion: Analysis completed, resetting state');
        }
    }

    public async openSettings() {
        this.showOnboardingView();
    }

    private async clearApiKey() {
        try {
            await this.keyManager.clearAPIKey();
            this.showOnboardingView();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to clear API key: ${error}`);
        }
    }

    private async saveApiKey(provider: string, apiKey: string) {
        try {
            console.log(`Strategic Code Companion: Saving API key for provider: ${provider}`);
            
            // Show a progress message to user
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Validating API key...",
                cancellable: false
            }, async (progress) => {
                try {
                    // First, validate the API key
                    console.log('Strategic Code Companion: Creating provider...');
                    const llmProvider = LLMProviderFactory.createProvider(provider as any, apiKey);
                    console.log('Strategic Code Companion: Testing API key...');
                    
                    progress.report({ message: "Testing connection..." });
                    const isValid = await llmProvider.validateApiKey();
                    
                    if (!isValid) {
                        vscode.window.showErrorMessage('Invalid API key. Please check your configuration.');
                        return;
                    }
                    
                    progress.report({ message: "Saving securely..." });
                    // If valid, store it
                    await this.keyManager.storeAPIKey({ provider: provider as any, apiKey });
                    console.log('Strategic Code Companion: API key saved successfully');
                    
                    // Show success message and switch to main view
                    vscode.window.showInformationMessage('API key saved successfully!');
                    setTimeout(() => {
                        this.showMainView();
                    }, 500); // Small delay to ensure webview is ready
                    
                } catch (innerError) {
                    console.error('Strategic Code Companion: Validation error:', innerError);
                    vscode.window.showErrorMessage(`API key validation failed: ${innerError}`);
                }
            });
            
        } catch (error) {
            console.error('Strategic Code Companion: Failed to save API key:', error);
            vscode.window.showErrorMessage(`Failed to save API key: ${error}`);
        }
    }

    private showOnboardingView() {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'showOnboarding'
            });
        }
    }

    private showMainView() {
        console.log('Strategic Code Companion: showMainView called');
        if (this._view) {
            console.log('Strategic Code Companion: Sending showMain message to webview');
            this._view.webview.postMessage({
                type: 'showMain'
            });
        } else {
            console.error('Strategic Code Companion: _view is null, cannot show main view');
        }
    }

    private showLoadingView() {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'showLoading',
                message: 'Starting analysis...'
            });
        }
    }

    private updateLoadingMessage(message: string) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateLoading',
                message
            });
        }
    }

    private showResults(results: AgentResults) {
        console.log('Strategic Code Companion: showResults called');
        if (this._view) {
            console.log('Strategic Code Companion: Sending showResults message to webview');
            this._view.webview.postMessage({
                type: 'showResults',
                results
            });
        } else {
            console.error('Strategic Code Companion: _view is null, cannot show results');
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        console.log('Strategic Code Companion: Generating HTML for webview');
        
        // For now, let's use a simple HTML without external resources to test
        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Strategic Code Companion</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 2em;
            margin-bottom: 10px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        }
        select, input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
        }
        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .help-text {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
        }
        .main-btn {
            padding: 15px 30px;
            font-size: 16px;
            margin: 20px 0;
        }
        
        /* Professional Results Styling */
        .results-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .back-button {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .back-button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        /* Tabs Styling */
        .tabs-container {
            width: 100%;
        }
        
        .tabs {
            display: flex;
            flex-wrap: wrap;
            border-bottom: 1px solid var(--vscode-panel-border);
            margin-bottom: 20px;
        }
        
        .tab-button {
            background: transparent;
            color: var(--vscode-foreground);
            border: none;
            padding: 12px 16px;
            cursor: pointer;
            font-size: 14px;
            border-bottom: 2px solid transparent;
            transition: all 0.2s ease;
            flex: 1;
            min-width: 0;
        }
        
        .tab-button:hover {
            background: var(--vscode-list-hoverBackground);
        }
        
        .tab-button.active {
            border-bottom-color: var(--vscode-focusBorder);
            background: var(--vscode-tab-activeBackground);
            color: var(--vscode-tab-activeForeground);
        }
        
        .tab-panel {
            display: none;
            animation: fadeIn 0.3s ease-in;
        }
        
        .tab-panel.active {
            display: block;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        /* Card Styling */
        .analysis-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .card-header {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
        }
        
        .card-icon {
            font-size: 24px;
            margin-right: 12px;
        }
        
        .card-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
            color: var(--vscode-foreground);
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin: 16px 0;
        }
        
        .metric-item {
            background: var(--vscode-input-background);
            padding: 16px;
            border-radius: 6px;
            border: 1px solid var(--vscode-input-border);
        }
        
        .metric-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        
        .metric-value {
            font-size: 24px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        
        .tech-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin: 12px 0;
        }
        
        .tech-tag {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 500;
        }
        
        /* Suggestion Cards */
        .suggestion-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 16px;
            position: relative;
        }
        
        .priority-high { border-left: 4px solid #f14c4c; }
        .priority-medium { border-left: 4px solid #ffcc02; }
        .priority-low { border-left: 4px solid #89d185; }
        
        .suggestion-header {
            display: flex;
            justify-content: between;
            align-items: flex-start;
            margin-bottom: 12px;
        }
        
        .priority-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .priority-high .priority-badge { background: #f14c4c; color: white; }
        .priority-medium .priority-badge { background: #ffcc02; color: black; }
        .priority-low .priority-badge { background: #89d185; color: black; }
        
        .code-block {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 16px;
            margin: 12px 0;
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
            overflow-x: auto;
        }
        
        .before-after {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin: 16px 0;
        }
        
        @media (max-width: 600px) {
            .before-after {
                grid-template-columns: 1fr;
            }
        }
        
        /* Library Cards */
        .library-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 16px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .library-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .library-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
        }
        
        .library-stats {
            display: flex;
            gap: 16px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin: 8px 0;
        }
        
        .stat-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .link-preview {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            text-decoration: none;
            border-radius: 4px;
            font-size: 14px;
            margin: 8px 8px 8px 0;
            transition: background 0.2s ease;
        }
        
        .link-preview:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        /* Tutorial Cards */
        .tutorial-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 16px;
            transition: transform 0.2s ease;
        }
        
        .tutorial-card:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
        }
        
        .tutorial-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 12px 0;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        
        .difficulty-badge {
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 500;
        }
        
        .difficulty-beginner { background: #89d185; color: black; }
        .difficulty-intermediate { background: #ffcc02; color: black; }
        .difficulty-advanced { background: #f14c4c; color: white; }
        
        .rating-stars {
            color: #ffcc02;
        }
        
        .video-preview {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: var(--vscode-input-background);
            border-radius: 6px;
            margin: 12px 0;
            cursor: pointer;
            transition: background 0.2s ease;
        }
        
        .video-preview:hover {
            background: var(--vscode-list-hoverBackground);
        }
        
        .video-thumbnail {
            width: 60px;
            height: 45px;
            background: var(--vscode-button-background);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🤖 Strategic Code Companion</div>
            <p>Your AI-powered strategic partner for code analysis</p>
        </div>
        
        <div id="onboarding">
            <h3>Setup Your AI Provider</h3>
            <div class="form-group">
                <label for="provider-select">Choose your LLM provider:</label>
                <select id="provider-select">
                    <option value="gemini">Google Gemini</option>
                    <option value="claude">Anthropic Claude</option>
                    <option value="openai">OpenAI GPT</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="api-key-input">API Key:</label>
                <input type="password" id="api-key-input" placeholder="Enter your API key">
                <div class="help-text">Your API key will be stored securely using VS Code's built-in encryption</div>
            </div>
            
            <button id="save-key-btn">Save Configuration</button>
        </div>
        
        <div id="main" style="display: none;">
            <div class="header">
                <h2>Ready to analyze your workspace</h2>
            </div>
            
            <button id="analyze-btn" class="main-btn">
                🔍 Analyze Workspace
            </button>
            <div class="help-text">Click to start a comprehensive analysis of your codebase</div>
            
            <div style="margin-top: 30px;">
                <button id="settings-btn">⚙️ Settings</button>
                <button id="clear-key-btn" style="margin-left: 10px;">🗑️ Clear API Key</button>
                <button id="test-results-btn" style="margin-left: 10px;">🧪 Test Results</button>
            </div>
        </div>
        
        <div id="loading" style="display: none;">
            <div class="header">
                <h2>🔄 Analyzing Your Code...</h2>
                <p id="loading-message">Starting analysis...</p>
            </div>
            <div style="text-align: center; margin: 20px;">
                <div style="animation: spin 1s linear infinite; display: inline-block;">⚙️</div>
            </div>
            <style>
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            </style>
        </div>
        
        <div id="results" style="display: none;">
            <div class="results-header">
                <h2>✅ Analysis Complete!</h2>
                <button id="back-btn" class="back-button">← Back</button>
            </div>
            
            <div class="tabs-container">
                <div class="tabs">
                    <button class="tab-button active" data-tab="overview">📊 Overview</button>
                    <button class="tab-button" data-tab="refactoring">🔧 Refactoring</button>
                    <button class="tab-button" data-tab="architecture">🏗️ Architecture</button>
                    <button class="tab-button" data-tab="libraries">📚 Libraries</button>
                    <button class="tab-button" data-tab="tutorials">🎓 Tutorials</button>
                </div>
                
                <div class="tab-content">
                    <div id="overview-content" class="tab-panel active">
                        <div id="overview-data"></div>
                    </div>
                    <div id="refactoring-content" class="tab-panel">
                        <div id="refactoring-data"></div>
                    </div>
                    <div id="architecture-content" class="tab-panel">
                        <div id="architecture-data"></div>
                    </div>
                    <div id="libraries-content" class="tab-panel">
                        <div id="libraries-data"></div>
                    </div>
                    <div id="tutorials-content" class="tab-panel">
                        <div id="tutorials-data"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        
        function saveApiKey() {
            console.log('Strategic Code Companion Webview: saveApiKey function called');
            
            const provider = document.getElementById('provider-select').value;
            const apiKey = document.getElementById('api-key-input').value.trim();
            
            console.log('Strategic Code Companion Webview: Provider:', provider);
            console.log('Strategic Code Companion Webview: API key length:', apiKey.length);
            
            if (!apiKey) {
                alert('Please enter an API key');
                return;
            }
            
            console.log('Strategic Code Companion Webview: Sending message to extension');
            vscode.postMessage({
                type: 'saveApiKey',
                provider: provider,
                apiKey: apiKey
            });
            console.log('Strategic Code Companion Webview: Message sent');
        }
        
        function analyzeWorkspace() {
            vscode.postMessage({ type: 'analyzeWorkspace' });
        }
        
        function openSettings() {
            document.getElementById('main').style.display = 'none';
            document.getElementById('onboarding').style.display = 'block';
        }
        
        function clearApiKey() {
            if (confirm('Are you sure you want to clear your API key?')) {
                vscode.postMessage({ type: 'clearApiKey' });
            }
        }
        
        function showMain() {
            document.getElementById('onboarding').style.display = 'none';
            document.getElementById('loading').style.display = 'none';
            document.getElementById('results').style.display = 'none';
            document.getElementById('main').style.display = 'block';
        }
        
        function testResults() {
            vscode.postMessage({ type: 'testResults' });
        }
        
        // Add event listeners when DOM is loaded
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Strategic Code Companion Webview: DOM loaded, setting up event listeners');
            
            // Save API Key button
            const saveKeyBtn = document.getElementById('save-key-btn');
            if (saveKeyBtn) {
                saveKeyBtn.addEventListener('click', saveApiKey);
                console.log('Strategic Code Companion Webview: Save key button listener added');
            }
            
            // Analyze workspace button
            const analyzeBtn = document.getElementById('analyze-btn');
            if (analyzeBtn) {
                analyzeBtn.addEventListener('click', analyzeWorkspace);
            }
            
            // Settings button
            const settingsBtn = document.getElementById('settings-btn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', openSettings);
            }
            
            // Clear API key button
            const clearKeyBtn = document.getElementById('clear-key-btn');
            if (clearKeyBtn) {
                clearKeyBtn.addEventListener('click', clearApiKey);
            }
            
            // Test results button
            const testResultsBtn = document.getElementById('test-results-btn');
            if (testResultsBtn) {
                testResultsBtn.addEventListener('click', testResults);
            }
            
            // Back button
            const backBtn = document.getElementById('back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', showMain);
            }
            
            // Tab switching functionality
            document.addEventListener('click', function(e) {
                if (e.target && e.target.classList.contains('tab-button')) {
                    const targetTab = e.target.getAttribute('data-tab');
                    switchTab(targetTab);
                }
            });
        });
        
        function switchTab(tabName) {
            // Remove active class from all tabs and panels
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding panel
            document.querySelector(\`[data-tab="\${tabName}"]\`).classList.add('active');
            document.getElementById(\`\${tabName}-content\`).classList.add('active');
        }
        
        function displayProfessionalResults(results) {
            console.log('Displaying professional results:', results);
            
            // Display Overview
            displayOverview(results.analysis);
            
            // Display Refactoring suggestions
            displayRefactoring(results.refactoring);
            
            // Display Architecture suggestions
            displayArchitecture(results.architecture);
            
            // Display Library recommendations
            displayLibraries(results.libraries);
            
            // Display Tutorials
            displayTutorials(results.tutorials);
        }
        
        function displayOverview(analysis) {
            const container = document.getElementById('overview-data');
            
            const html = \`
                <div class="analysis-card">
                    <div class="card-header">
                        <span class="card-icon">📊</span>
                        <h3 class="card-title">Project Overview</h3>
                    </div>
                    <p>\${analysis.overall_summary}</p>
                    
                    <div class="metrics-grid">
                        <div class="metric-item">
                            <div class="metric-label">Complexity Score</div>
                            <div class="metric-value">\${analysis.complexity_score}/10</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">Maintainability</div>
                            <div class="metric-value">\${analysis.code_quality_metrics.maintainability}/10</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">Readability</div>
                            <div class="metric-value">\${analysis.code_quality_metrics.readability}/10</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">Testability</div>
                            <div class="metric-value">\${analysis.code_quality_metrics.testability}/10</div>
                        </div>
                    </div>
                </div>
                
                <div class="analysis-card">
                    <div class="card-header">
                        <span class="card-icon">🛠️</span>
                        <h3 class="card-title">Technologies Used</h3>
                    </div>
                    <div class="tech-tags">
                        \${analysis.key_technologies.map(tech => \`<span class="tech-tag">\${tech}</span>\`).join('')}
                    </div>
                </div>
                
                <div class="analysis-card">
                    <div class="card-header">
                        <span class="card-icon">🏗️</span>
                        <h3 class="card-title">Architecture Patterns</h3>
                    </div>
                    <div class="tech-tags">
                        \${analysis.architectural_patterns.map(pattern => \`<span class="tech-tag">\${pattern}</span>\`).join('')}
                    </div>
                </div>
                
                <div class="analysis-card">
                    <div class="card-header">
                        <span class="card-icon">⚠️</span>
                        <h3 class="card-title">Areas for Improvement</h3>
                    </div>
                    <ul>
                        \${analysis.potential_areas_for_refactoring.map(area => \`<li>\${area}</li>\`).join('')}
                    </ul>
                </div>
            \`;
            
            container.innerHTML = html;
        }
        
        function displayRefactoring(refactoring) {
            const container = document.getElementById('refactoring-data');
            
            if (!refactoring.suggestions || refactoring.suggestions.length === 0) {
                container.innerHTML = '<p>No refactoring suggestions available.</p>';
                return;
            }
            
            const html = refactoring.suggestions.map(suggestion => \`
                <div class="suggestion-card priority-\${suggestion.priority}">
                    <div class="suggestion-header">
                        <h4>\${suggestion.title}</h4>
                        <span class="priority-badge">\${suggestion.priority}</span>
                    </div>
                    <p>\${suggestion.description}</p>
                    
                    <div class="before-after">
                        <div>
                            <h5>❌ Before:</h5>
                            <div class="code-block">\${suggestion.beforeCode}</div>
                        </div>
                        <div>
                            <h5>✅ After:</h5>
                            <div class="code-block">\${suggestion.afterCode}</div>
                        </div>
                    </div>
                    
                    <div class="suggestion-meta">
                        <span><strong>Effort:</strong> \${suggestion.estimatedEffort}</span>
                        <span><strong>Category:</strong> \${suggestion.category}</span>
                    </div>
                    
                    <div class="benefits">
                        <strong>Benefits:</strong>
                        <ul>
                            \${suggestion.benefits.map(benefit => \`<li>\${benefit}</li>\`).join('')}
                        </ul>
                    </div>
                </div>
            \`).join('');
            
            container.innerHTML = html;
        }
        
        function displayArchitecture(architecture) {
            const container = document.getElementById('architecture-data');
            
            if (!architecture.features || architecture.features.length === 0) {
                container.innerHTML = '<p>No architecture suggestions available.</p>';
                return;
            }
            
            const html = architecture.features.map(feature => \`
                <div class="analysis-card">
                    <div class="card-header">
                        <span class="card-icon">🏗️</span>
                        <h3 class="card-title">\${feature.title}</h3>
                    </div>
                    <p>\${feature.description}</p>
                    
                    <div class="feature-meta">
                        <span class="priority-badge priority-\${feature.priority}">\${feature.priority}</span>
                        <span><strong>Complexity:</strong> \${feature.complexity}</span>
                        <span><strong>Estimated Time:</strong> \${feature.estimatedTimeWeeks} weeks</span>
                    </div>
                    
                    <div class="tech-tags">
                        \${feature.implementationOverview.technologies.map(tech => \`<span class="tech-tag">\${tech}</span>\`).join('')}
                    </div>
                    
                    <div class="benefits">
                        <strong>Benefits:</strong>
                        <ul>
                            \${feature.benefits.map(benefit => \`<li>\${benefit}</li>\`).join('')}
                        </ul>
                    </div>
                </div>
            \`).join('');
            
            container.innerHTML = html;
        }
        
        function displayLibraries(libraries) {
            const container = document.getElementById('libraries-data');
            
            if (!libraries.recommendations || libraries.recommendations.length === 0) {
                container.innerHTML = '<p>No library recommendations available.</p>';
                return;
            }
            
            const html = libraries.recommendations.map(lib => \`
                <div class="library-card">
                    <div class="library-header">
                        <h4>\${lib.name}</h4>
                        <span class="tech-tag">\${lib.language}</span>
                    </div>
                    <p>\${lib.description}</p>
                    
                    <div class="library-stats">
                        <div class="stat-item">
                            <span>⭐</span>
                            <span>\${lib.stars.toLocaleString()}</span>
                        </div>
                        <div class="stat-item">
                            <span>🍴</span>
                            <span>\${lib.forks.toLocaleString()}</span>
                        </div>
                        <div class="stat-item">
                            <span>📅</span>
                            <span>\${new Date(lib.lastUpdated).toLocaleDateString()}</span>
                        </div>
                    </div>
                    
                    <div class="benefits">
                        <strong>Benefits:</strong>
                        <ul>
                            \${lib.benefits.map(benefit => \`<li>\${benefit}</li>\`).join('')}
                        </ul>
                    </div>
                    
                    <div class="library-links">
                        <a href="\${lib.githubUrl}" class="link-preview" onclick="openUrl('\${lib.githubUrl}')">
                            📱 GitHub
                        </a>
                        \${lib.npmUrl ? \`<a href="\${lib.npmUrl}" class="link-preview" onclick="openUrl('\${lib.npmUrl}')">📦 NPM</a>\` : ''}
                    </div>
                </div>
            \`).join('');
            
            container.innerHTML = html;
        }
        
        function displayTutorials(tutorials) {
            const container = document.getElementById('tutorials-data');
            
            if (!tutorials.tutorials || tutorials.tutorials.length === 0) {
                container.innerHTML = '<p>No tutorials available.</p>';
                return;
            }
            
            const html = tutorials.tutorials.map(tutorial => {
                const stars = '★'.repeat(Math.floor(tutorial.rating)) + '☆'.repeat(5 - Math.floor(tutorial.rating));
                
                return \`
                    <div class="tutorial-card">
                        <h4>\${tutorial.title}</h4>
                        <p>\${tutorial.description}</p>
                        
                        <div class="tutorial-meta">
                            <span class="difficulty-badge difficulty-\${tutorial.difficulty}">\${tutorial.difficulty}</span>
                            <span class="rating-stars">\${stars} (\${tutorial.rating.toFixed(1)})</span>
                            <span>\${tutorial.views.toLocaleString()} views</span>
                        </div>
                        
                        <div class="video-preview" onclick="openUrl('\${tutorial.url}')">
                            <div class="video-thumbnail">▶️</div>
                            <div>
                                <div><strong>\${tutorial.author}</strong></div>
                                <div>\${tutorial.duration} • \${tutorial.platform}</div>
                                <div class="tech-tags">
                                    \${tutorial.topics.map(topic => \`<span class="tech-tag">\${topic}</span>\`).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                \`;
            }).join('');
            
            container.innerHTML = html;
        }
        
        function openUrl(url) {
            vscode.postMessage({
                type: 'openUrl',
                url: url
            });
        }
        
        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            console.log('Strategic Code Companion: Received message:', message.type);
            
            switch (message.type) {
                case 'showOnboarding':
                    console.log('Strategic Code Companion: Showing onboarding view');
                    document.getElementById('onboarding').style.display = 'block';
                    document.getElementById('main').style.display = 'none';
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('results').style.display = 'none';
                    break;
                    
                case 'showMain':
                    console.log('Strategic Code Companion: Showing main view');
                    showMain();
                    break;
                    
                case 'showLoading':
                    console.log('Strategic Code Companion: Showing loading view');
                    document.getElementById('onboarding').style.display = 'none';
                    document.getElementById('main').style.display = 'none';
                    document.getElementById('loading').style.display = 'block';
                    document.getElementById('results').style.display = 'none';
                    document.getElementById('loading-message').textContent = message.message || 'Analyzing...';
                    break;
                    
                case 'updateLoading':
                    console.log('Strategic Code Companion: Updating loading message:', message.message);
                    document.getElementById('loading-message').textContent = message.message;
                    break;
                    
                case 'showResults':
                    console.log('Strategic Code Companion: Showing results');
                    document.getElementById('onboarding').style.display = 'none';
                    document.getElementById('main').style.display = 'none';
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('results').style.display = 'block';
                    
                    // Display professional results
                    displayProfessionalResults(message.results);
                    break;
                    
                default:
                    console.log('Strategic Code Companion: Unknown message type:', message.type);
            }
        });
        
        console.log('Strategic Code Companion: Webview script loaded');
    </script>
</body>
</html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}