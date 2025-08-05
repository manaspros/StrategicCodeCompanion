import * as vscode from 'vscode';
import { SidebarProvider } from './sidebar/SidebarProvider';
import { KeyManager } from './security/keyManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('Strategic Code Companion is activating...');
    console.log('Extension URI:', context.extensionUri.toString());
    
    // Initialize the key manager for secure API key storage
    const keyManager = new KeyManager(context);
    
    // Create the sidebar provider
    const sidebarProvider = new SidebarProvider(context.extensionUri, keyManager);
    
    try {
        console.log('Strategic Code Companion: About to register webview provider');
        
        // Register the sidebar view with minimal options
        const registration = vscode.window.registerWebviewViewProvider(
            'strategic-code-companion.sidebar',
            sidebarProvider
        );
        
        context.subscriptions.push(registration);
        console.log('Strategic Code Companion: Webview provider registered successfully');
        
        // Test if the provider was registered
        setTimeout(() => {
            console.log('Strategic Code Companion: 5 seconds passed, provider should be ready');
        }, 5000);

    } catch (error) {
        console.error('Strategic Code Companion: Activation failed:', error);
        vscode.window.showErrorMessage(`Strategic Code Companion activation failed: ${error}`);
    }

    // Register commands
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

    context.subscriptions.push(analyzeWorkspaceCommand, openSettingsCommand, openViewCommand);

    // Show welcome message on first activation
    const hasShownWelcome = context.globalState.get('hasShownWelcome', false);
    if (!hasShownWelcome) {
        vscode.window.showInformationMessage(
            'Welcome to Strategic Code Companion! Click the icon in the Activity Bar to get started.',
            'Open'
        ).then(selection => {
            if (selection === 'Open') {
                vscode.commands.executeCommand('workbench.view.extension.strategic-code-companion');
            }
        });
        context.globalState.update('hasShownWelcome', true);
    }
}

export function deactivate() {
    // Cleanup if needed
}