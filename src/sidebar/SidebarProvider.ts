import * as vscode from 'vscode';
import * as path from 'path';
import { KeyManager } from '../security/keyManager';
import { LLMProviderFactory } from '../llm/llmProvider';
import { CodeIngestion } from '../rag/ingestion';
import { CodeEmbeddingService } from '../rag/embedding';
import { MultiAgentOrchestrator, AgentResults } from '../agents/main';
import { CodeFixService } from '../services/CodeFixService';
import { FileEditService } from '../services/FileEditService';

export class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'strategic-code-companion.sidebar';
    
    private _view?: vscode.WebviewView;
    private keyManager: KeyManager;
    private isAnalyzing = false;
    private codeFixService?: CodeFixService;
    private fileEditService?: FileEditService;

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
                    console.log('Strategic Code Companion: Composio key received:', data.composioKey ? 'Yes' : 'No');
                    await this.saveApiKey(data.provider, data.apiKey, data.composioKey);
                    break;
                case 'openUrl':
                    vscode.env.openExternal(vscode.Uri.parse(data.url));
                    break;
                case 'fixRefactoring':
                    await this.handleFixRefactoring(data.suggestionId, data.suggestion);
                    break;
                case 'implementFeature':
                    await this.handleImplementFeature(data.featureId, data.feature);
                    break;
                case 'implementRecommendation':
                    await this.handleImplementRecommendation(data.recommendationId, data.recommendation);
                    break;
                case 'installLibrary':
                    await this.handleInstallLibrary(data.libraryName);
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
                const embeddings = await embeddingService.generateEmbeddings(chunks.slice(0, 200)); // Increased embedding limit
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
                // Get Composio API key if available for enhanced analysis
                const composioKey = await this.keyManager.getComposioKey();
                const orchestrator = new MultiAgentOrchestrator(llmProvider, composioKey || undefined);
                const results = await orchestrator.analyzeCodebase(chunks.slice(0, 100)); // Increased analysis chunk limit
                console.log('Strategic Code Companion: Analysis completed successfully');

                // Initialize AI editing services
                this.codeFixService = new CodeFixService(llmProvider, workspaceRoot);
                this.fileEditService = new FileEditService(workspaceRoot);
                await this.fileEditService.loadBackupsFromDisk();

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
            // Also clear Composio key if it exists
            try {
                await this.keyManager.clearComposioKey();
            } catch (composioError) {
                console.warn('Failed to clear Composio key:', composioError);
                // Don't fail the whole process if Composio key clearing fails
            }
            this.showOnboardingView();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to clear API key: ${error}`);
        }
    }

    private async saveApiKey(provider: string, apiKey: string, composioKey?: string) {
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
                    
                    // Save Composio key if provided
                    if (composioKey) {
                        try {
                            await this.keyManager.storeComposioKey(composioKey);
                            console.log('Strategic Code Companion: Composio API key saved successfully');
                        } catch (composioError) {
                            console.warn('Strategic Code Companion: Failed to save Composio key:', composioError);
                            // Don't fail the whole process if Composio key fails
                        }
                    }
                    
                    // Show success message and switch to main view
                    vscode.window.showInformationMessage('Configuration saved successfully!');
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

    private async handleFixRefactoring(suggestionId: string, suggestion: any) {
        if (!this.codeFixService || !this.fileEditService) {
            vscode.window.showErrorMessage('AI editing services not initialized. Please run analysis first.');
            return;
        }

        try {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Applying refactoring: ${suggestion.title}`,
                cancellable: false
            }, async (progress) => {
                progress.report({ message: 'Generating code fixes...' });
                
                // Generate the code fixes
                const fixes = await this.codeFixService!.generateRefactoringFix(suggestion);
                
                progress.report({ message: 'Previewing changes...' });
                
                // Show diff preview and get user confirmation
                const shouldApply = await this.fileEditService!.previewChanges(fixes);
                
                if (!shouldApply) {
                    vscode.window.showInformationMessage('Refactoring cancelled by user.');
                    return;
                }
                
                progress.report({ message: 'Applying changes...' });
                
                // Apply the fixes
                const result = await this.fileEditService!.applyFixes(fixes, `Refactoring: ${suggestion.title}`);
                
                if (result.success) {
                    vscode.window.showInformationMessage(
                        `Successfully applied refactoring: ${suggestion.title}`
                    );
                } else {
                    vscode.window.showWarningMessage(
                        `Refactoring partially applied. ${result.failedFixes.length} changes failed.`
                    );
                }
            });
        } catch (error) {
            console.error('Failed to apply refactoring:', error);
            vscode.window.showErrorMessage(`Failed to apply refactoring: ${error}`);
        }
    }

    private async handleImplementFeature(featureId: string, feature: any) {
        if (!this.codeFixService || !this.fileEditService) {
            vscode.window.showErrorMessage('AI editing services not initialized. Please run analysis first.');
            return;
        }

        try {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Implementing feature: ${feature.title}`,
                cancellable: false
            }, async (progress) => {
                progress.report({ message: 'Generating feature implementation...' });
                
                // Generate the feature implementation
                const fixes = await this.codeFixService!.generateFeatureImplementation(feature);
                
                if (fixes.length === 0) {
                    vscode.window.showWarningMessage('No code changes generated for this feature.');
                    return;
                }
                
                progress.report({ message: 'Previewing changes...' });
                
                // Show diff preview and get user confirmation
                const shouldApply = await this.fileEditService!.previewChanges(fixes);
                
                if (!shouldApply) {
                    vscode.window.showInformationMessage('Feature implementation cancelled by user.');
                    return;
                }
                
                progress.report({ message: 'Implementing feature...' });
                
                // Apply the fixes
                const result = await this.fileEditService!.applyFixes(fixes, `Implement feature: ${feature.title}`);
                
                if (result.success) {
                    vscode.window.showInformationMessage(
                        `Successfully implemented feature: ${feature.title}. Created ${result.appliedFixes.length} files/changes.`
                    );
                } else {
                    vscode.window.showWarningMessage(
                        `Feature partially implemented. ${result.failedFixes.length} changes failed.`
                    );
                }
            });
        } catch (error) {
            console.error('Failed to implement feature:', error);
            vscode.window.showErrorMessage(`Failed to implement feature: ${error}`);
        }
    }

    private async handleImplementRecommendation(recommendationId: string, recommendation: any) {
        if (!this.codeFixService || !this.fileEditService) {
            vscode.window.showErrorMessage('AI editing services not initialized. Please run analysis first.');
            return;
        }

        try {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Implementing ${recommendation.title}...`,
                cancellable: false
            }, async (progress) => {
                progress.report({ message: 'Analyzing implementation requirements...' });
                
                // Generate implementation plan using the code fix service
                const implementationPrompt = `
                    Implement the following strategic recommendation:
                    
                    Title: ${recommendation.title}
                    Description: ${recommendation.description}
                    Category: ${recommendation.category}
                    
                    Business Justification:
                    ${recommendation.justification.businessRationale}
                    
                    Implementation Plan:
                    - Effort Level: ${recommendation.implementationPlan.effort}
                    - Timeframe: ${recommendation.implementationPlan.timeframe}
                    - Prerequisites: ${recommendation.implementationPlan.prerequisites.join(', ')}
                    - Steps: ${recommendation.implementationPlan.steps.join(', ')}
                    
                    Generate comprehensive code changes to implement this recommendation.
                    Focus on creating the foundation and core functionality that provides the described business value.
                    
                    Return detailed implementation instructions and code changes.
                `;

                progress.report({ message: 'Generating implementation code...' });
                const fixes = await this.codeFixService!.generateRefactoringFix({ 
                    id: recommendationId, 
                    title: recommendation.title,
                    description: implementationPrompt,
                    priority: recommendation.priority,
                    category: 'best-practices' as const,
                    beforeCode: '// Current implementation',
                    afterCode: '// Enhanced implementation with ' + recommendation.title,
                    estimatedEffort: recommendation.implementationPlan?.effort || 'medium' as const,
                    benefits: [recommendation.justification?.businessRationale || 'Enhanced functionality']
                });

                progress.report({ message: 'Applying changes...' });
                const success = await this.fileEditService!.previewChanges(fixes);
                
                if (success) {
                    vscode.window.showInformationMessage(
                        `Successfully implemented recommendation: ${recommendation.title}. Applied ${fixes.length} changes.`
                    );
                } else {
                    vscode.window.showWarningMessage(
                        `Recommendation implementation encountered issues. Please check the preview.`
                    );
                }
            });
        } catch (error) {
            console.error('Failed to implement recommendation:', error);
            vscode.window.showErrorMessage(`Failed to implement recommendation: ${error}`);
        }
    }

    private async handleInstallLibrary(libraryName: string) {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder is open!');
            return;
        }

        try {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
            
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Installing ${libraryName}...`,
                cancellable: false
            }, async (progress) => {
                progress.report({ message: 'Running npm install...' });
                
                const { spawn } = require('child_process');
                const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
                
                return new Promise<void>((resolve, reject) => {
                    const npmProcess = spawn(command, ['install', libraryName], {
                        cwd: workspaceRoot,
                        stdio: 'pipe'
                    });

                    let output = '';
                    let errorOutput = '';

                    npmProcess.stdout.on('data', (data: Buffer) => {
                        output += data.toString();
                    });

                    npmProcess.stderr.on('data', (data: Buffer) => {
                        errorOutput += data.toString();
                    });

                    npmProcess.on('close', (code: number) => {
                        if (code === 0) {
                            vscode.window.showInformationMessage(
                                `Successfully installed ${libraryName}!`
                            );
                            resolve();
                        } else {
                            console.error('npm install error:', errorOutput);
                            vscode.window.showErrorMessage(
                                `Failed to install ${libraryName}: ${errorOutput}`
                            );
                            reject(new Error(errorOutput));
                        }
                    });

                    npmProcess.on('error', (error: Error) => {
                        console.error('npm install process error:', error);
                        vscode.window.showErrorMessage(
                            `Failed to start npm install: ${error.message}`
                        );
                        reject(error);
                    });
                });
            });
        } catch (error) {
            console.error('Failed to install library:', error);
            vscode.window.showErrorMessage(`Failed to install library: ${error}`);
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
        :root {
            --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --gradient-secondary: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            --gradient-accent: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            --shadow-soft: 0 4px 20px rgba(0, 0, 0, 0.08);
            --shadow-medium: 0 8px 30px rgba(0, 0, 0, 0.12);
            --shadow-strong: 0 12px 40px rgba(0, 0, 0, 0.15);
            --border-radius: 12px;
            --border-radius-lg: 16px;
            --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        * {
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', sans-serif;
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            margin: 0;
            padding: 0;
            line-height: 1.6;
            overflow-x: hidden;
        }
        
        .container {
            max-width: 100%;
            padding: 12px;
            height: 100vh;
            overflow-y: auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 24px;
            position: relative;
        }
        
        .logo {
            background: var(--gradient-primary);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-size: 1.8em;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.02em;
        }
        
        .header p {
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
            margin: 0;
            font-weight: 400;
        }
        .form-group {
            margin-bottom: 24px;
            position: relative;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            font-size: 0.9em;
            color: var(--vscode-foreground);
        }
        
        select, input {
            width: 100%;
            padding: 16px 20px;
            border: 2px solid transparent;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: var(--border-radius);
            font-size: 14px;
            transition: var(--transition);
            box-shadow: var(--shadow-soft);
        }
        
        select:focus, input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            transform: translateY(-1px);
        }
        
        button {
            background: var(--gradient-primary);
            color: white;
            border: none;
            padding: 14px 28px;
            border-radius: var(--border-radius);
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: var(--transition);
            box-shadow: var(--shadow-soft);
            position: relative;
            overflow: hidden;
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-medium);
        }
        
        button:active {
            transform: translateY(0);
        }
        
        .help-text {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 8px;
            line-height: 1.5;
        }
        
        .main-btn {
            padding: 18px 36px;
            font-size: 16px;
            margin: 24px 0;
            width: 100%;
            background: var(--gradient-accent);
            font-weight: 700;
            letter-spacing: 0.5px;
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
            border-radius: var(--border-radius-lg);
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: var(--shadow-soft);
            transition: var(--transition);
            position: relative;
            overflow: hidden;
        }
        
        .analysis-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: var(--gradient-primary);
        }
        
        .analysis-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-medium);
        }
        
        .card-header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            position: relative;
        }
        
        .card-icon {
            font-size: 28px;
            margin-right: 16px;
            background: var(--gradient-primary);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .card-title {
            font-size: 20px;
            font-weight: 700;
            margin: 0;
            color: var(--vscode-foreground);
            letter-spacing: -0.01em;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .metric-item {
            background: linear-gradient(135deg, var(--vscode-input-background) 0%, rgba(102, 126, 234, 0.05) 100%);
            padding: 20px;
            border-radius: var(--border-radius);
            border: 1px solid var(--vscode-input-border);
            text-align: center;
            transition: var(--transition);
            position: relative;
            overflow: hidden;
        }
        
        .metric-item:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-soft);
        }
        
        .metric-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: var(--gradient-accent);
        }
        
        .metric-label {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        
        .metric-value {
            font-size: 32px;
            font-weight: 800;
            background: var(--gradient-primary);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            line-height: 1;
        }
        
        .tech-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin: 16px 0;
        }
        
        .tech-tag {
            background: linear-gradient(135deg, var(--vscode-badge-background) 0%, rgba(102, 126, 234, 0.1) 100%);
            color: var(--vscode-badge-foreground);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            border: 1px solid var(--vscode-panel-border);
            transition: var(--transition);
        }
        
        .tech-tag:hover {
            transform: translateY(-1px);
            box-shadow: var(--shadow-soft);
            background: var(--gradient-accent);
            color: white;
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
            border-radius: var(--border-radius-lg);
            padding: 24px;
            margin-bottom: 24px;
            transition: var(--transition);
            position: relative;
            overflow: hidden;
            box-shadow: var(--shadow-soft);
        }
        
        .library-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: var(--gradient-secondary);
        }
        
        .library-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-medium);
        }
        
        .library-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
        }
        
        .lib-title-section h4 {
            margin: 0 0 8px 0;
            font-size: 20px;
            font-weight: 700;
            color: var(--vscode-foreground);
        }
        
        .lib-category-badge {
            background: var(--gradient-accent);
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .lib-meta {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;
        }
        
        .relevance-score {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 4px 8px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 600;
        }
        
        .lib-description {
            color: var(--vscode-descriptionForeground);
            margin: 16px 0;
            line-height: 1.6;
        }
        
        .library-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
            gap: 16px;
            margin: 20px 0;
            padding: 16px;
            background: linear-gradient(135deg, var(--vscode-input-background) 0%, rgba(102, 126, 234, 0.03) 100%);
            border-radius: var(--border-radius);
            border: 1px solid var(--vscode-input-border);
        }
        
        .stat-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 4px;
        }
        
        .stat-icon {
            font-size: 16px;
        }
        
        .stat-value {
            font-weight: 700;
            font-size: 14px;
            color: var(--vscode-foreground);
        }
        
        .stat-label {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .lib-content-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }
        
        @media (max-width: 600px) {
            .lib-content-grid {
                grid-template-columns: 1fr;
            }
        }
        
        .section-title {
            font-size: 14px;
            font-weight: 700;
            margin: 0 0 12px 0;
            color: var(--vscode-foreground);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .benefit-list, .usecase-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .benefit-item, .usecase-item {
            padding: 8px 0;
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
            border-bottom: 1px solid rgba(102, 126, 234, 0.1);
            position: relative;
            padding-left: 16px;
        }
        
        .benefit-item:before {
            content: '✨';
            position: absolute;
            left: 0;
            font-size: 12px;
        }
        
        .usecase-item:before {
            content: '→';
            position: absolute;
            left: 0;
            color: #667eea;
            font-weight: bold;
        }
        
        .library-actions {
            display: flex;
            gap: 12px;
            margin-top: 20px;
            flex-wrap: wrap;
        }
        
        .action-button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            border-radius: var(--border-radius);
            text-decoration: none;
            font-size: 13px;
            font-weight: 600;
            transition: var(--transition);
            border: none;
            cursor: pointer;
            flex: 1;
            justify-content: center;
            min-width: 120px;
        }
        
        .action-button.primary {
            background: var(--gradient-primary);
            color: white;
        }
        
        .action-button.secondary {
            background: var(--gradient-accent);
            color: white;
        }
        
        .action-button.install {
            background: var(--gradient-secondary);
            color: white;
        }
        
        .action-button:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-soft);
        }
        
        .button-icon {
            font-size: 16px;
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
        
        /* Enhanced Results Styling */
        .recommendations-grid {
            display: grid;
            gap: 20px;
            margin-top: 16px;
        }
        
        .recommendation-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-left: 4px solid var(--vscode-button-background);
            border-radius: 8px;
            padding: 20px;
            transition: all 0.2s ease;
            position: relative;
        }
        
        .recommendation-card.priority-high {
            border-left-color: #ff6b6b;
            background: linear-gradient(135deg, rgba(255, 107, 107, 0.05) 0%, transparent 50%);
        }
        
        .recommendation-card.priority-medium {
            border-left-color: #ffa726;
            background: linear-gradient(135deg, rgba(255, 167, 38, 0.05) 0%, transparent 50%);
        }
        
        .recommendation-card.priority-low {
            border-left-color: #66bb6a;
            background: linear-gradient(135deg, rgba(102, 187, 106, 0.05) 0%, transparent 50%);
        }
        
        .recommendation-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        
        .recommendation-header h4 {
            margin: 0;
            color: var(--vscode-editor-foreground);
            font-size: 16px;
            font-weight: 600;
        }
        
        .priority-badge {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .priority-badge.priority-high {
            background: rgba(255, 107, 107, 0.2);
            color: #ff6b6b;
        }
        
        .priority-badge.priority-medium {
            background: rgba(255, 167, 38, 0.2);
            color: #ffa726;
        }
        
        .priority-badge.priority-low {
            background: rgba(102, 187, 106, 0.2);
            color: #66bb6a;
        }
        
        .recommendation-description {
            margin-bottom: 16px;
            line-height: 1.5;
            color: var(--vscode-descriptionForeground);
        }
        
        .impact-metrics {
            margin-bottom: 16px;
        }
        
        .impact-item {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
        }
        
        .impact-label {
            min-width: 120px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        
        .impact-bar {
            flex: 1;
            height: 6px;
            background: var(--vscode-panel-border);
            border-radius: 3px;
            overflow: hidden;
        }
        
        .impact-fill {
            height: 100%;
            background: var(--vscode-button-background);
            transition: width 0.3s ease;
        }
        
        .impact-value {
            font-size: 12px;
            font-weight: 600;
            color: var(--vscode-editor-foreground);
            min-width: 30px;
        }
        
        .justification {
            margin-bottom: 16px;
            padding: 12px;
            background: rgba(var(--vscode-button-background-rgb, 0, 122, 204), 0.1);
            border-radius: 6px;
        }
        
        .justification strong {
            color: var(--vscode-editor-foreground);
        }
        
        .implementation-plan {
            margin-bottom: 16px;
        }
        
        .plan-meta {
            display: flex;
            gap: 12px;
            margin-top: 8px;
        }
        
        .effort-badge {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
        }
        
        .effort-badge.effort-low {
            background: rgba(102, 187, 106, 0.2);
            color: #66bb6a;
        }
        
        .effort-badge.effort-medium {
            background: rgba(255, 167, 38, 0.2);
            color: #ffa726;
        }
        
        .effort-badge.effort-high {
            background: rgba(255, 107, 107, 0.2);
            color: #ff6b6b;
        }
        
        .timeframe {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        
        .implement-btn {
            width: 100%;
            padding: 12px 16px;
            background: linear-gradient(135deg, var(--vscode-button-background) 0%, var(--vscode-button-hoverBackground) 100%);
            border: none;
            border-radius: 6px;
            color: var(--vscode-button-foreground);
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .implement-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        .opportunities-grid {
            display: grid;
            gap: 16px;
            margin-top: 16px;
        }
        
        .opportunity-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 16px;
            transition: transform 0.2s ease;
        }
        
        .opportunity-card:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
        }
        
        .opportunity-meta {
            display: flex;
            gap: 12px;
            margin: 12px 0;
        }
        
        .impact-badge {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
        }
        
        .impact-badge.impact-high {
            background: rgba(255, 107, 107, 0.2);
            color: #ff6b6b;
        }
        
        .impact-badge.impact-medium {
            background: rgba(255, 167, 38, 0.2);
            color: #ffa726;
        }
        
        .impact-badge.impact-low {
            background: rgba(102, 187, 106, 0.2);
            color: #66bb6a;
        }
        
        .market-gap {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }
        
        .trend-analysis {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid var(--vscode-panel-border);
            font-size: 13px;
        }
        
        .strategy-content {
            margin-top: 16px;
        }
        
        .positioning-section, .growth-opportunities {
            margin-bottom: 20px;
        }
        
        .growth-item {
            padding: 12px;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            margin-bottom: 12px;
        }
        
        .potential-badge {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            float: right;
        }
        
        .potential-badge.potential-high {
            background: rgba(255, 107, 107, 0.2);
            color: #ff6b6b;
        }
        
        .potential-badge.potential-medium {
            background: rgba(255, 167, 38, 0.2);
            color: #ffa726;
        }
        
        .potential-badge.potential-low {
            background: rgba(102, 187, 106, 0.2);
            color: #66bb6a;
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
            
            <div class="advanced-section" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid var(--vscode-panel-border);">
                <h4>🚀 Advanced Features (Optional)</h4>
                <p class="help-text">Enable enhanced competitive analysis and market intelligence</p>
                
                <div class="form-group">
                    <label for="composio-key-input">Composio API Key (Optional):</label>
                    <input type="password" id="composio-key-input" placeholder="Enter Composio API key for enhanced analysis">
                    <div class="help-text">
                        Get your free API key at <a href="https://composio.dev/signup" target="_blank">composio.dev/signup</a>
                        <br>Enables real-time GitHub integration and advanced competitive analysis
                    </div>
                </div>
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
                    <button class="tab-button" data-tab="enhanced">🚀 Strategic Insights</button>
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
                    <div id="enhanced-content" class="tab-panel">
                        <div id="enhanced-data"></div>
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
            const composioKey = document.getElementById('composio-key-input').value.trim();
            
            console.log('Strategic Code Companion Webview: Provider:', provider);
            console.log('Strategic Code Companion Webview: API key length:', apiKey.length);
            console.log('Strategic Code Companion Webview: Composio key length:', composioKey.length);
            
            if (!apiKey) {
                alert('Please enter an API key');
                return;
            }
            
            console.log('Strategic Code Companion Webview: Sending message to extension');
            vscode.postMessage({
                type: 'saveApiKey',
                provider: provider,
                apiKey: apiKey,
                composioKey: composioKey || undefined
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
            
            // Display Enhanced Results (if available)
            if (results.enhanced) {
                displayEnhancedResults(results.enhanced);
                // Show the enhanced tab by default if available
                switchTab('enhanced');
            } else {
                // Hide enhanced tab if not available
                const enhancedTab = document.querySelector('[data-tab="enhanced"]');
                if (enhancedTab) enhancedTab.style.display = 'none';
            }
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
                    
                    <div class="action-buttons" style="margin-top: 16px;">
                        <button class="fix-it-btn" onclick="fixRefactoring('\${suggestion.id}', \${JSON.stringify(suggestion).replace(/"/g, '&quot;')})" 
                                style="background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 8px;">
                            🔧 Fix It
                        </button>
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
                    
                    <div class="action-buttons" style="margin-top: 16px;">
                        <button class="implement-btn" onclick="implementFeature('\${feature.id}', \${JSON.stringify(feature).replace(/"/g, '&quot;')})" 
                                style="background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 8px;">
                            🚀 Implement Feature
                        </button>
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
                        <div class="lib-title-section">
                            <h4>\${lib.name}</h4>
                            <div class="lib-category-badge">\${lib.category}</div>
                        </div>
                        <div class="lib-meta">
                            <span class="tech-tag">\${lib.language}</span>
                            <span class="relevance-score">📊 \${Math.round(lib.relevanceScore * 100)}% match</span>
                        </div>
                    </div>
                    
                    <p class="lib-description">\${lib.description}</p>
                    
                    <div class="library-stats">
                        <div class="stat-item">
                            <span class="stat-icon">⭐</span>
                            <span class="stat-value">\${lib.stars.toLocaleString()}</span>
                            <span class="stat-label">stars</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-icon">🍴</span>
                            <span class="stat-value">\${lib.forks.toLocaleString()}</span>
                            <span class="stat-label">forks</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-icon">📅</span>
                            <span class="stat-value">\${new Date(lib.lastUpdated).toLocaleDateString()}</span>
                            <span class="stat-label">updated</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-icon">⚡</span>
                            <span class="stat-value">\${lib.integrationEffort}</span>
                            <span class="stat-label">effort</span>
                        </div>
                    </div>
                    
                    <div class="lib-content-grid">
                        <div class="benefits-section">
                            <h5 class="section-title">💡 Benefits</h5>
                            <ul class="benefit-list">
                                \${lib.benefits.slice(0, 3).map(benefit => \`<li class="benefit-item">\${benefit}</li>\`).join('')}
                            </ul>
                        </div>
                        
                        <div class="usecases-section">
                            <h5 class="section-title">🎯 Use Cases</h5>
                            <ul class="usecase-list">
                                \${lib.useCases.slice(0, 3).map(useCase => \`<li class="usecase-item">\${useCase}</li>\`).join('')}
                            </ul>
                        </div>
                    </div>
                    
                    <div class="library-actions">
                        <a href="\${lib.githubUrl}" class="action-button primary" onclick="openUrl('\${lib.githubUrl}')">
                            <span class="button-icon">📱</span>
                            <span>View on GitHub</span>
                        </a>
                        \${lib.npmUrl ? \`
                            <a href="\${lib.npmUrl}" class="action-button secondary" onclick="openUrl('\${lib.npmUrl}')">
                                <span class="button-icon">📦</span>
                                <span>NPM Package</span>
                            </a>
                        \` : ''}
                        <button class="action-button install" onclick="installLibrary('\${lib.name}')">
                            <span class="button-icon">⚡</span>
                            <span>Quick Install</span>
                        </button>
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
        
        function displayEnhancedResults(enhanced) {
            const container = document.getElementById('enhanced-data');
            
            if (!enhanced) {
                container.innerHTML = '<p>Enhanced analysis not available.</p>';
                return;
            }
            
            let html = '';
            
            // Unique Recommendations Section
            if (enhanced.uniqueRecommendations && enhanced.uniqueRecommendations.length > 0) {
                html += \`
                    <div class="analysis-card">
                        <div class="card-header">
                            <span class="card-icon">🎯</span>
                            <h3 class="card-title">Unique Value Propositions</h3>
                        </div>
                        <div class="recommendations-grid">
                            \${enhanced.uniqueRecommendations.map(rec => \`
                                <div class="recommendation-card priority-\${rec.priority}">
                                    <div class="recommendation-header">
                                        <h4>\${rec.title}</h4>
                                        <span class="priority-badge priority-\${rec.priority}">\${rec.priority}</span>
                                    </div>
                                    <p class="recommendation-description">\${rec.description}</p>
                                    
                                    <div class="impact-metrics">
                                        <div class="impact-item">
                                            <span class="impact-label">User Experience</span>
                                            <div class="impact-bar">
                                                <div class="impact-fill" style="width: \${rec.businessImpact.userExperience * 10}%"></div>
                                            </div>
                                            <span class="impact-value">\${rec.businessImpact.userExperience}/10</span>
                                        </div>
                                        <div class="impact-item">
                                            <span class="impact-label">Market Differentiation</span>
                                            <div class="impact-bar">
                                                <div class="impact-fill" style="width: \${rec.businessImpact.marketDifferentiation * 10}%"></div>
                                            </div>
                                            <span class="impact-value">\${rec.businessImpact.marketDifferentiation}/10</span>
                                        </div>
                                        <div class="impact-item">
                                            <span class="impact-label">Business Value</span>
                                            <div class="impact-bar">
                                                <div class="impact-fill" style="width: \${rec.businessImpact.businessValue * 10}%"></div>
                                            </div>
                                            <span class="impact-value">\${rec.businessImpact.businessValue}/10</span>
                                        </div>
                                    </div>
                                    
                                    <div class="justification">
                                        <strong>Why This Creates Competitive Advantage:</strong>
                                        <p>\${rec.justification.businessRationale}</p>
                                        <p><strong>Market Gap:</strong> \${rec.justification.marketGap}</p>
                                    </div>
                                    
                                    <div class="implementation-plan">
                                        <strong>Implementation:</strong>
                                        <div class="plan-meta">
                                            <span class="effort-badge effort-\${rec.implementationPlan.effort}">\${rec.implementationPlan.effort} effort</span>
                                            <span class="timeframe">\${rec.implementationPlan.timeframe}</span>
                                        </div>
                                    </div>
                                    
                                    <button class="implement-btn" onclick="implementRecommendation('\${rec.id}', \${JSON.stringify(rec).replace(/"/g, '&quot;')})">
                                        <span class="button-icon">🚀</span>
                                        <span>Implement This Feature</span>
                                    </button>
                                </div>
                            \`).join('')}
                        </div>
                    </div>
                \`;
            }
            
            // Competitive Analysis Section
            if (enhanced.competitiveAnalysis && enhanced.competitiveAnalysis.innovationOpportunities.length > 0) {
                html += \`
                    <div class="analysis-card">
                        <div class="card-header">
                            <span class="card-icon">🏆</span>
                            <h3 class="card-title">Innovation Opportunities</h3>
                        </div>
                        <div class="opportunities-grid">
                            \${enhanced.competitiveAnalysis.innovationOpportunities.map(opp => \`
                                <div class="opportunity-card impact-\${opp.potentialImpact}">
                                    <h4>\${opp.opportunity}</h4>
                                    <p>\${opp.description}</p>
                                    <div class="opportunity-meta">
                                        <span class="impact-badge impact-\${opp.potentialImpact}">\${opp.potentialImpact} impact</span>
                                        <span class="market-gap">\${opp.marketGap}</span>
                                    </div>
                                    <div class="trend-analysis">
                                        <strong>Trend Analysis:</strong> \${opp.trendAnalysis}
                                    </div>
                                </div>
                            \`).join('')}
                        </div>
                    </div>
                \`;
            }
            
            // Business Strategy Section
            if (enhanced.businessStrategy) {
                const strategy = enhanced.businessStrategy;
                html += \`
                    <div class="analysis-card">
                        <div class="card-header">
                            <span class="card-icon">📈</span>
                            <h3 class="card-title">Strategic Positioning</h3>
                        </div>
                        <div class="strategy-content">
                            <div class="positioning-section">
                                <h4>Market Position</h4>
                                <p><strong>Current:</strong> \${strategy.marketPositioning.currentPosition}</p>
                                <p><strong>Target:</strong> \${strategy.marketPositioning.targetPosition}</p>
                                
                                <div class="differentiators">
                                    <h5>Key Differentiators:</h5>
                                    <ul>
                                        \${strategy.marketPositioning.differentiators.map(diff => \`<li>\${diff}</li>\`).join('')}
                                    </ul>
                                </div>
                            </div>
                            
                            <div class="growth-opportunities">
                                <h4>Growth Opportunities</h4>
                                \${strategy.growthOpportunities.map(opp => \`
                                    <div class="growth-item potential-\${opp.potential}">
                                        <strong>\${opp.opportunity}</strong>
                                        <p>\${opp.strategy}</p>
                                        <span class="potential-badge potential-\${opp.potential}">\${opp.potential} potential</span>
                                    </div>
                                \`).join('')}
                            </div>
                        </div>
                    </div>
                \`;
            }
            
            container.innerHTML = html || '<p>No enhanced analysis available.</p>';
        }
        
        function implementRecommendation(recId, recommendation) {
            console.log('Implementing recommendation:', recId);
            vscode.postMessage({
                type: 'implementRecommendation',
                recommendationId: recId,
                recommendation: recommendation
            });
        }
        
        function openUrl(url) {
            vscode.postMessage({
                type: 'openUrl',
                url: url
            });
        }
        
        function fixRefactoring(suggestionId, suggestion) {
            console.log('Fixing refactoring:', suggestionId);
            vscode.postMessage({
                type: 'fixRefactoring',
                suggestionId: suggestionId,
                suggestion: suggestion
            });
        }
        
        function implementFeature(featureId, feature) {
            console.log('Implementing feature:', featureId);
            vscode.postMessage({
                type: 'implementFeature',
                featureId: featureId,
                feature: feature
            });
        }
        
        function installLibrary(libraryName) {
            console.log('Installing library:', libraryName);
            if (confirm(\`Install \${libraryName} via npm?\`)) {
                vscode.postMessage({
                    type: 'installLibrary',
                    libraryName: libraryName
                });
            }
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