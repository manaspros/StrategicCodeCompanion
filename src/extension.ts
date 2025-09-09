import * as vscode from 'vscode';
import { SidebarProvider } from './sidebar/SidebarProvider';
import { KeyManager } from './security/keyManager';
import { GitHubIntegration } from './github/GitHubIntegration';
import { GitHubProvider, GitHubCommands } from './github/GitHubProvider';
import { DependencyGraphProvider } from './visualizations/DependencyGraphProvider';
import { ReportGenerator } from './reports/ReportGenerator';

export function activate(context: vscode.ExtensionContext) {
    console.log('Strategic Code Companion is activating...');
    console.log('Extension URI:', context.extensionUri.toString());
    
    // Initialize the key manager for secure API key storage
    const keyManager = new KeyManager(context);
    
    // Create the sidebar provider
    const sidebarProvider = new SidebarProvider(context.extensionUri, keyManager);
    
    // Initialize GitHub integration
    let githubIntegration: GitHubIntegration | undefined;
    let githubProvider: GitHubProvider | undefined;
    let githubCommands: GitHubCommands | undefined;
    
    if (vscode.workspace.getConfiguration('strategic-code-companion').get('enableGitHubIntegration')) {
        githubIntegration = new GitHubIntegration(context);
        githubProvider = new GitHubProvider(githubIntegration);
        githubCommands = new GitHubCommands(githubIntegration, githubProvider, context);
        
        // Initialize GitHub integration with token if available
        const githubToken = vscode.workspace.getConfiguration('strategic-code-companion').get('githubToken') as string;
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
    let dependencyGraphProvider: DependencyGraphProvider | undefined;
    if (vscode.workspace.getConfiguration('strategic-code-companion').get('enableEnhancedVisualizations')) {
        dependencyGraphProvider = new DependencyGraphProvider(context);
    }
    
    try {
        console.log('Strategic Code Companion: About to register webview provider');
        
        // Register the sidebar view
        const registration = vscode.window.registerWebviewViewProvider(
            'strategic-code-companion.sidebar',
            sidebarProvider
        );
        
        context.subscriptions.push(registration);
        console.log('Strategic Code Companion: Webview provider registered successfully');
        
    } catch (error) {
        console.error('Strategic Code Companion: Activation failed:', error);
        vscode.window.showErrorMessage(`Strategic Code Companion activation failed: ${error}`);
    }

    // Register core commands
    const analyzeWorkspaceCommand = vscode.commands.registerCommand(
        'strategic-code-companion.analyzeWorkspace',
        () => {
            sidebarProvider.analyzeWorkspace();
        }
    );

    const openSettingsCommand = vscode.commands.registerCommand(
        'strategic-code-companion.openSettings',
        () => {
            sidebarProvider.openSettings();
        }
    );

    const openViewCommand = vscode.commands.registerCommand(
        'strategic-code-companion.openView',
        () => {
            vscode.commands.executeCommand('workbench.view.extension.strategic-code-companion');
        }
    );

    // Register dependency graph command
    const showDependencyGraphCommand = vscode.commands.registerCommand(
        'strategic-code-companion.showDependencyGraph',
        () => {
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
        }
    );

    // Register export report command
    const exportReportCommand = vscode.commands.registerCommand(
        'strategic-code-companion.exportReport',
        async () => {
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

                if (!format) return;

                const defaultFilename = ReportGenerator.generateOutputFilename(format.value as any);
                const saveUri = await vscode.window.showSaveDialog({
                    defaultUri: vscode.Uri.file(defaultFilename),
                    filters: {
                        'Report Files': format.value === 'pdf' ? ['pdf'] : 
                                       format.value === 'html' ? ['html'] :
                                       format.value === 'markdown' ? ['md'] : ['json']
                    }
                });

                if (saveUri) {
                    const reportGenerator = new ReportGenerator();
                    await reportGenerator.generateReport(
                        lastResults as any,
                        format.value as any,
                        saveUri.fsPath
                    );

                    vscode.window.showInformationMessage(
                        `Report exported: ${saveUri.fsPath}`,
                        'Open File'
                    ).then(selection => {
                        if (selection === 'Open File') {
                            vscode.env.openExternal(saveUri);
                        }
                    });
                }

            } catch (error: any) {
                vscode.window.showErrorMessage(`Export failed: ${error.message}`);
            }
        }
    );

    context.subscriptions.push(
        analyzeWorkspaceCommand, 
        openSettingsCommand, 
        openViewCommand,
        showDependencyGraphCommand,
        exportReportCommand
    );

    // Configuration change listener
    const configChangeListener = vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('strategic-code-companion')) {
            // Reload features based on new configuration
            if (event.affectsConfiguration('strategic-code-companion.enableGitHubIntegration')) {
                const enabled = vscode.workspace.getConfiguration('strategic-code-companion').get('enableGitHubIntegration');
                if (enabled && !githubIntegration) {
                    // Enable GitHub integration
                    githubIntegration = new GitHubIntegration(context);
                    githubProvider = new GitHubProvider(githubIntegration);
                    githubCommands = new GitHubCommands(githubIntegration, githubProvider, context);
                    
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
                    dependencyGraphProvider = new DependencyGraphProvider(context);
                }
            }
            
            if (event.affectsConfiguration('strategic-code-companion.githubToken')) {
                const token = vscode.workspace.getConfiguration('strategic-code-companion').get('githubToken') as string;
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
        vscode.window.showInformationMessage(
            'Welcome to Strategic Code Companion! 🚀 Your AI-powered strategic partner for code analysis.',
            'Open Strategic Companion',
            'View Features',
            'Configure Settings'
        ).then(selection => {
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

export function deactivate() {
    // Cleanup if needed
}