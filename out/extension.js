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
function activate(context) {
    console.log('Strategic Code Companion is activating...');
    console.log('Extension URI:', context.extensionUri.toString());
    // Initialize the key manager for secure API key storage
    const keyManager = new keyManager_1.KeyManager(context);
    // Create the sidebar provider
    const sidebarProvider = new SidebarProvider_1.SidebarProvider(context.extensionUri, keyManager);
    try {
        console.log('Strategic Code Companion: About to register webview provider');
        // Register the sidebar view with minimal options
        const registration = vscode.window.registerWebviewViewProvider('strategic-code-companion.sidebar', sidebarProvider);
        context.subscriptions.push(registration);
        console.log('Strategic Code Companion: Webview provider registered successfully');
        // Test if the provider was registered
        setTimeout(() => {
            console.log('Strategic Code Companion: 5 seconds passed, provider should be ready');
        }, 5000);
    }
    catch (error) {
        console.error('Strategic Code Companion: Activation failed:', error);
        vscode.window.showErrorMessage(`Strategic Code Companion activation failed: ${error}`);
    }
    // Register commands
    const analyzeWorkspaceCommand = vscode.commands.registerCommand('strategic-code-companion.analyzeWorkspace', () => {
        sidebarProvider.analyzeWorkspace();
    });
    const openSettingsCommand = vscode.commands.registerCommand('strategic-code-companion.openSettings', () => {
        sidebarProvider.openSettings();
    });
    const openViewCommand = vscode.commands.registerCommand('strategic-code-companion.openView', () => {
        vscode.commands.executeCommand('workbench.view.extension.strategic-code-companion');
    });
    context.subscriptions.push(analyzeWorkspaceCommand, openSettingsCommand, openViewCommand);
    // Show welcome message on first activation
    const hasShownWelcome = context.globalState.get('hasShownWelcome', false);
    if (!hasShownWelcome) {
        vscode.window.showInformationMessage('Welcome to Strategic Code Companion! Click the icon in the Activity Bar to get started.', 'Open').then(selection => {
            if (selection === 'Open') {
                vscode.commands.executeCommand('workbench.view.extension.strategic-code-companion');
            }
        });
        context.globalState.update('hasShownWelcome', true);
    }
}
exports.activate = activate;
function deactivate() {
    // Cleanup if needed
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map