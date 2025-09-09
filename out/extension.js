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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const SidebarProvider_1 = require("./sidebar/SidebarProvider");
const keyManager_1 = require("./security/keyManager");
const GitHubIntegration_1 = require("./github/GitHubIntegration");
const GitHubProvider_1 = require("./github/GitHubProvider");
const DependencyGraphProvider_1 = require("./visualizations/DependencyGraphProvider");
const ReportGenerator_1 = require("./reports/ReportGenerator");
function activate(context) {
    console.log('Strategic Code Companion is activating...');
    console.log('Extension URI:', context.extensionUri.toString());
    // Initialize the key manager for secure API key storage
    const keyManager = new keyManager_1.KeyManager(context);
    // Create the sidebar provider
    const sidebarProvider = new SidebarProvider_1.SidebarProvider(context.extensionUri, keyManager);
    // Initialize GitHub integration
    let githubIntegration;
    let githubProvider;
    let githubCommands;
    if (vscode.workspace.getConfiguration('strategic-code-companion').get('enableGitHubIntegration')) {
        githubIntegration = new GitHubIntegration_1.GitHubIntegration(context);
        githubProvider = new GitHubProvider_1.GitHubProvider(githubIntegration);
        githubCommands = new GitHubProvider_1.GitHubCommands(githubIntegration, githubProvider, context);
        // Initialize GitHub integration with token if available
        const githubToken = vscode.workspace.getConfiguration('strategic-code-companion').get('githubToken');
        if (githubToken) {
            githubIntegration.initialize(githubToken).catch(error => {
                console.warn('GitHub integration initialization failed:', error);
            });
        }
        // Register GitHub tree view
        const githubTreeView = vscode.window.createTreeView('strategic-code-companion.github', {
            treeDataProvider: githubProvider,
            showCollapseAll: true
        });
        context.subscriptions.push(githubTreeView);
    }
    // Initialize dependency graph provider
    let dependencyGraphProvider;
    if (vscode.workspace.getConfiguration('strategic-code-companion').get('enableEnhancedVisualizations')) {
        dependencyGraphProvider = new DependencyGraphProvider_1.DependencyGraphProvider(context);
    }
    try {
        console.log('Strategic Code Companion: About to register webview provider');
        // Register the sidebar view
        const registration = vscode.window.registerWebviewViewProvider('strategic-code-companion.sidebar', sidebarProvider);
        context.subscriptions.push(registration);
        console.log('Strategic Code Companion: Webview provider registered successfully');
    }
    catch (error) {
        console.error('Strategic Code Companion: Activation failed:', error);
        vscode.window.showErrorMessage(`Strategic Code Companion activation failed: ${error}`);
    }
    // Register core commands
    const analyzeWorkspaceCommand = vscode.commands.registerCommand('strategic-code-companion.analyzeWorkspace', () => {
        sidebarProvider.analyzeWorkspace();
    });
    const openSettingsCommand = vscode.commands.registerCommand('strategic-code-companion.openSettings', () => {
        sidebarProvider.openSettings();
    });
    const openViewCommand = vscode.commands.registerCommand('strategic-code-companion.openView', () => {
        vscode.commands.executeCommand('workbench.view.extension.strategic-code-companion');
    });
    // Register dependency graph command
    const showDependencyGraphCommand = vscode.commands.registerCommand('strategic-code-companion.showDependencyGraph', () => {
        if (!dependencyGraphProvider) {
            vscode.window.showWarningMessage('Enhanced visualizations are disabled. Enable them in settings.');
            return;
        }
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder is open!');
            return;
        }
        const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        dependencyGraphProvider.showDependencyGraph(workspacePath);
    });
    // Register export report command
    const exportReportCommand = vscode.commands.registerCommand('strategic-code-companion.exportReport', async () => {
        try {
            // Get the last analysis results (this would need to be stored in the extension)
            const lastResults = context.globalState.get('lastAnalysisResults');
            if (!lastResults) {
                vscode.window.showWarningMessage('No analysis results available. Please run an analysis first.');
                return;
            }
            const format = await vscode.window.showQuickPick([
                { label: 'HTML Report', value: 'html' },
                { label: 'Markdown Report', value: 'markdown' },
                { label: 'PDF Report', value: 'pdf' },
                { label: 'JSON Data', value: 'json' }
            ], { placeHolder: 'Select export format' });
            if (!format)
                return;
            const defaultFilename = ReportGenerator_1.ReportGenerator.generateOutputFilename(format.value);
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(defaultFilename),
                filters: {
                    'Report Files': format.value === 'pdf' ? ['pdf'] :
                        format.value === 'html' ? ['html'] :
                            format.value === 'markdown' ? ['md'] : ['json']
                }
            });
            if (saveUri) {
                const reportGenerator = new ReportGenerator_1.ReportGenerator();
                await reportGenerator.generateReport(lastResults, format.value, saveUri.fsPath);
                vscode.window.showInformationMessage(`Report exported: ${saveUri.fsPath}`, 'Open File').then(selection => {
                    if (selection === 'Open File') {
                        vscode.env.openExternal(saveUri);
                    }
                });
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Export failed: ${error.message}`);
        }
    });
    context.subscriptions.push(analyzeWorkspaceCommand, openSettingsCommand, openViewCommand, showDependencyGraphCommand, exportReportCommand);
    // Configuration change listener
    const configChangeListener = vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('strategic-code-companion')) {
            // Reload features based on new configuration
            if (event.affectsConfiguration('strategic-code-companion.enableGitHubIntegration')) {
                const enabled = vscode.workspace.getConfiguration('strategic-code-companion').get('enableGitHubIntegration');
                if (enabled && !githubIntegration) {
                    // Enable GitHub integration
                    githubIntegration = new GitHubIntegration_1.GitHubIntegration(context);
                    githubProvider = new GitHubProvider_1.GitHubProvider(githubIntegration);
                    githubCommands = new GitHubProvider_1.GitHubCommands(githubIntegration, githubProvider, context);
                    const githubTreeView = vscode.window.createTreeView('strategic-code-companion.github', {
                        treeDataProvider: githubProvider,
                        showCollapseAll: true
                    });
                    context.subscriptions.push(githubTreeView);
                }
            }
            if (event.affectsConfiguration('strategic-code-companion.enableEnhancedVisualizations')) {
                const enabled = vscode.workspace.getConfiguration('strategic-code-companion').get('enableEnhancedVisualizations');
                if (enabled && !dependencyGraphProvider) {
                    dependencyGraphProvider = new DependencyGraphProvider_1.DependencyGraphProvider(context);
                }
            }
            if (event.affectsConfiguration('strategic-code-companion.githubToken')) {
                const token = vscode.workspace.getConfiguration('strategic-code-companion').get('githubToken');
                if (githubIntegration && token) {
                    githubIntegration.initialize(token).catch(error => {
                        console.warn('GitHub token update failed:', error);
                    });
                }
            }
        }
    });
    context.subscriptions.push(configChangeListener);
    // Show welcome message on first activation
    const hasShownWelcome = context.globalState.get('hasShownWelcome', false);
    if (!hasShownWelcome) {
        vscode.window.showInformationMessage('Welcome to Strategic Code Companion! 🚀 Your AI-powered strategic partner for code analysis.', 'Open Strategic Companion', 'View Features', 'Configure Settings').then(selection => {
            switch (selection) {
                case 'Open Strategic Companion':
                    vscode.commands.executeCommand('workbench.view.extension.strategic-code-companion');
                    break;
                case 'View Features':
                    vscode.commands.executeCommand('strategic-code-companion.showFeatures');
                    break;
                case 'Configure Settings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'strategic-code-companion');
                    break;
            }
        });
        context.globalState.update('hasShownWelcome', true);
    }
    // Register cleanup handlers
    context.subscriptions.push({
        dispose: () => {
            githubIntegration?.dispose();
            dependencyGraphProvider?.dispose();
        }
    });
}
exports.activate = activate;
function deactivate() {
    // Cleanup if needed
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map