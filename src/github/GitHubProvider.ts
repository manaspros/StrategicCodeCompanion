import * as vscode from 'vscode';
import { GitHubIntegration, AnalysisSession, GitHubRepoInfo } from './GitHubIntegration';

export class GitHubProvider implements vscode.TreeDataProvider<GitHubTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<GitHubTreeItem | undefined | null | void> = new vscode.EventEmitter<GitHubTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<GitHubTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private githubIntegration: GitHubIntegration) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: GitHubTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: GitHubTreeItem): Thenable<GitHubTreeItem[]> {
        if (!element) {
            // Root level items
            return Promise.resolve([
                new GitHubTreeItem('Recent Analyses', vscode.TreeItemCollapsibleState.Expanded, 'recent'),
                new GitHubTreeItem('Analyze New Repository', vscode.TreeItemCollapsibleState.None, 'analyze-new')
            ]);
        } else if (element.type === 'recent') {
            // Show recent analysis sessions
            const sessions = this.githubIntegration.getRecentSessions();
            return Promise.resolve(
                sessions.map(session => new GitHubTreeItem(
                    `${session.repoInfo.fullName}`,
                    vscode.TreeItemCollapsibleState.None,
                    'session',
                    session
                ))
            );
        }

        return Promise.resolve([]);
    }
}

export class GitHubTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: 'recent' | 'analyze-new' | 'session',
        public readonly session?: AnalysisSession
    ) {
        super(label, collapsibleState);

        this.tooltip = this.getTooltip();
        this.description = this.getDescription();
        this.contextValue = type;

        if (type === 'analyze-new') {
            this.command = {
                command: 'strategic-code-companion.analyzeGitHubRepo',
                title: 'Analyze GitHub Repository',
            };
            this.iconPath = new vscode.ThemeIcon('add');
        } else if (type === 'session' && session) {
            this.command = {
                command: 'strategic-code-companion.viewGitHubAnalysis',
                title: 'View Analysis Results',
                arguments: [session.id]
            };
            this.iconPath = this.getSessionIcon();
        } else if (type === 'recent') {
            this.iconPath = new vscode.ThemeIcon('history');
        }
    }

    private getTooltip(): string {
        if (this.type === 'analyze-new') {
            return 'Analyze a new GitHub repository';
        } else if (this.type === 'session' && this.session) {
            const repo = this.session.repoInfo;
            return `${repo.fullName}\n` +
                   `Language: ${repo.language || 'Unknown'}\n` +
                   `Stars: ${repo.stars}\n` +
                   `Analyzed: ${this.session.timestamp.toLocaleDateString()}`;
        } else if (this.type === 'recent') {
            return 'Recently analyzed repositories';
        }
        return this.label;
    }

    private getDescription(): string {
        if (this.type === 'session' && this.session) {
            const repo = this.session.repoInfo;
            return `${repo.language || 'Unknown'} • ⭐${repo.stars}`;
        }
        return '';
    }

    private getSessionIcon(): vscode.ThemeIcon {
        if (this.session?.analysisResults) {
            // Analysis completed
            return new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
        } else {
            // Analysis in progress or failed
            return new vscode.ThemeIcon('clock');
        }
    }
}

// Commands for GitHub integration
export class GitHubCommands {
    constructor(
        private githubIntegration: GitHubIntegration,
        private githubProvider: GitHubProvider,
        private context: vscode.ExtensionContext
    ) {
        this.registerCommands();
    }

    private registerCommands(): void {
        // Analyze GitHub Repository command
        const analyzeRepoCommand = vscode.commands.registerCommand(
            'strategic-code-companion.analyzeGitHubRepo',
            async () => {
                const repoUrl = await vscode.window.showInputBox({
                    prompt: 'Enter GitHub repository URL or owner/repo',
                    placeHolder: 'https://github.com/owner/repo or owner/repo',
                    validateInput: (value) => {
                        if (!value) return 'Please enter a repository URL';
                        if (!value.includes('/')) return 'Please use format: owner/repo or full URL';
                        return null;
                    }
                });

                if (!repoUrl) return;

                try {
                    const session = await this.githubIntegration.analyzeGitHubRepository(repoUrl, true);
                    vscode.window.showInformationMessage(
                        `✅ Analysis completed for ${session.repoInfo.fullName}`,
                        'View Results'
                    ).then(selection => {
                        if (selection === 'View Results') {
                            vscode.commands.executeCommand('strategic-code-companion.viewGitHubAnalysis', session.id);
                        }
                    });
                    this.githubProvider.refresh();
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
                }
            }
        );

        // View GitHub Analysis Results command
        const viewAnalysisCommand = vscode.commands.registerCommand(
            'strategic-code-companion.viewGitHubAnalysis',
            async (sessionId: string) => {
                const session = this.githubIntegration.getSession(sessionId);
                if (!session) {
                    vscode.window.showErrorMessage('Analysis session not found');
                    return;
                }

                if (!session.analysisResults) {
                    vscode.window.showWarningMessage('Analysis results not available');
                    return;
                }

                // Create and show webview with results
                const panel = vscode.window.createWebviewPanel(
                    'githubAnalysisResults',
                    `Analysis: ${session.repoInfo.fullName}`,
                    vscode.ViewColumn.One,
                    {
                        enableScripts: true,
                        retainContextWhenHidden: true
                    }
                );

                panel.webview.html = this.getAnalysisWebviewContent(session);

                // Handle webview messages
                panel.webview.onDidReceiveMessage(
                    message => {
                        switch (message.type) {
                            case 'exportResults':
                                this.exportAnalysisResults(session);
                                break;
                            case 'deleteSession':
                                this.deleteSession(sessionId);
                                panel.dispose();
                                break;
                        }
                    },
                    undefined,
                    this.context.subscriptions
                );
            }
        );

        // Search GitHub Repositories command
        const searchReposCommand = vscode.commands.registerCommand(
            'strategic-code-companion.searchGitHubRepos',
            async () => {
                const query = await vscode.window.showInputBox({
                    prompt: 'Search GitHub repositories',
                    placeHolder: 'Enter search terms (e.g., "react hooks", "machine learning python")'
                });

                if (!query) return;

                try {
                    const repos = await this.githubIntegration.searchRepositories(query, {
                        per_page: 10
                    });

                    if (repos.length === 0) {
                        vscode.window.showInformationMessage('No repositories found');
                        return;
                    }

                    const items = repos.map(repo => ({
                        label: repo.fullName,
                        description: `${repo.language || 'Unknown'} • ⭐${repo.stars} • 🍴${repo.forks}`,
                        detail: repo.description || 'No description',
                        repo: repo
                    }));

                    const selected = await vscode.window.showQuickPick(items, {
                        placeHolder: 'Select a repository to analyze'
                    });

                    if (selected) {
                        const session = await this.githubIntegration.analyzeGitHubRepository(selected.repo.url, true);
                        vscode.commands.executeCommand('strategic-code-companion.viewGitHubAnalysis', session.id);
                        this.githubProvider.refresh();
                    }

                } catch (error: any) {
                    vscode.window.showErrorMessage(`Search failed: ${error.message}`);
                }
            }
        );

        // Configure GitHub Token command
        const configureTokenCommand = vscode.commands.registerCommand(
            'strategic-code-companion.configureGitHubToken',
            async () => {
                const token = await vscode.window.showInputBox({
                    prompt: 'Enter your GitHub Personal Access Token',
                    password: true,
                    placeHolder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
                    validateInput: (value) => {
                        if (!value) return null; // Allow empty to use unauthenticated API
                        if (!value.startsWith('ghp_') && !value.startsWith('github_pat_')) {
                            return 'Invalid token format';
                        }
                        return null;
                    }
                });

                if (token !== undefined) {
                    try {
                        await this.githubIntegration.initialize(token || undefined);
                        await vscode.workspace.getConfiguration('strategic-code-companion')
                            .update('githubToken', token, vscode.ConfigurationTarget.Global);
                        
                        if (token) {
                            vscode.window.showInformationMessage('✅ GitHub token configured successfully');
                        } else {
                            vscode.window.showInformationMessage('GitHub token cleared - using unauthenticated API');
                        }
                    } catch (error: any) {
                        vscode.window.showErrorMessage(`Configuration failed: ${error.message}`);
                    }
                }
            }
        );

        // Delete Analysis Session command
        const deleteSessionCommand = vscode.commands.registerCommand(
            'strategic-code-companion.deleteGitHubSession',
            async (item: GitHubTreeItem) => {
                if (item.type === 'session' && item.session) {
                    const confirm = await vscode.window.showWarningMessage(
                        `Delete analysis session for ${item.session.repoInfo.fullName}?`,
                        'Delete',
                        'Cancel'
                    );

                    if (confirm === 'Delete') {
                        await this.githubIntegration.deleteSession(item.session.id);
                        this.githubProvider.refresh();
                        vscode.window.showInformationMessage('Analysis session deleted');
                    }
                }
            }
        );

        // Add commands to context
        this.context.subscriptions.push(
            analyzeRepoCommand,
            viewAnalysisCommand,
            searchReposCommand,
            configureTokenCommand,
            deleteSessionCommand
        );
    }

    private getAnalysisWebviewContent(session: AnalysisSession): string {
        const results = session.analysisResults!;
        const repo = session.repoInfo;

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>GitHub Analysis: ${repo.fullName}</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background: var(--vscode-editor-background);
                    margin: 0;
                    padding: 20px;
                    line-height: 1.6;
                }
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }
                .repo-info {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin: 20px 0;
                }
                .metric {
                    background: var(--vscode-input-background);
                    padding: 15px;
                    border-radius: 8px;
                    border: 1px solid var(--vscode-input-border);
                }
                .actions {
                    margin: 20px 0;
                    display: flex;
                    gap: 10px;
                }
                .btn {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .btn:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                .section {
                    margin: 20px 0;
                    padding: 20px;
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 8px;
                }
                .tech-tag {
                    display: inline-block;
                    background: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 0.8em;
                    margin: 2px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📊 ${repo.fullName}</h1>
                <p>${repo.description || 'No description available'}</p>
                <p>⭐ ${repo.stars} stars • 🍴 ${repo.forks} forks • 📅 Analyzed on ${session.timestamp.toLocaleDateString()}</p>
                <a href="${repo.url}" style="color: white;">🔗 View on GitHub</a>
            </div>

            <div class="actions">
                <button class="btn" onclick="exportResults()">📄 Export Report</button>
                <button class="btn" onclick="deleteSession()" style="background: var(--vscode-errorForeground);">🗑️ Delete Session</button>
            </div>

            <div class="repo-info">
                <div class="metric">
                    <h3>📈 Quality Score</h3>
                    <p>Overall: ${Math.round((results.analysis.code_quality_metrics.maintainability + results.analysis.code_quality_metrics.readability + results.analysis.code_quality_metrics.testability) / 3)}/10</p>
                </div>
                <div class="metric">
                    <h3>🔧 Complexity</h3>
                    <p>${results.analysis.complexity_score}/10</p>
                </div>
            </div>

            <div class="section">
                <h2>🛠️ Technologies</h2>
                <div>
                    ${results.analysis.key_technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
                </div>
            </div>

            <div class="section">
                <h2>📋 Summary</h2>
                <p>${results.analysis.overall_summary}</p>
                
                <h3>🎯 Areas for Improvement</h3>
                <ul>
                    ${results.analysis.potential_areas_for_refactoring.map(area => `<li>${area}</li>`).join('')}
                </ul>
            </div>

            ${results.refactoring?.suggestions?.length > 0 ? `
            <div class="section">
                <h2>🔧 Refactoring Suggestions</h2>
                <p><strong>${results.refactoring.suggestions.length}</strong> improvement opportunities identified</p>
            </div>
            ` : ''}

            ${results.architecture?.features?.length > 0 ? `
            <div class="section">
                <h2>🏗️ Architecture Recommendations</h2>
                <p><strong>${results.architecture.features.length}</strong> architectural improvements suggested</p>
            </div>
            ` : ''}

            ${results.libraries?.recommendations?.length > 0 ? `
            <div class="section">
                <h2>📚 Library Recommendations</h2>
                <p><strong>${results.libraries.recommendations.length}</strong> relevant libraries found</p>
            </div>
            ` : ''}

            ${results.enhanced ? `
            <div class="section" style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));">
                <h2>🚀 Strategic Insights</h2>
                <p>Enhanced competitive analysis and strategic recommendations available</p>
                ${results.enhanced.uniqueRecommendations ? `<p><strong>${results.enhanced.uniqueRecommendations.length}</strong> unique value propositions identified</p>` : ''}
            </div>
            ` : ''}

            <script>
                const vscode = acquireVsCodeApi();

                function exportResults() {
                    vscode.postMessage({ type: 'exportResults' });
                }

                function deleteSession() {
                    if (confirm('Are you sure you want to delete this analysis session?')) {
                        vscode.postMessage({ type: 'deleteSession' });
                    }
                }
            </script>
        </body>
        </html>`;
    }

    private async exportAnalysisResults(session: AnalysisSession): Promise<void> {
        if (!session.analysisResults) {
            vscode.window.showErrorMessage('No analysis results to export');
            return;
        }

        try {
            const { ReportGenerator } = await import('../reports/ReportGenerator');
            const reportGenerator = new ReportGenerator();

            const format = await vscode.window.showQuickPick([
                { label: 'HTML Report', value: 'html' },
                { label: 'Markdown Report', value: 'markdown' },
                { label: 'PDF Report', value: 'pdf' },
                { label: 'JSON Data', value: 'json' }
            ], { placeHolder: 'Select export format' });

            if (!format) return;

            const defaultFilename = ReportGenerator.generateOutputFilename(
                format.value as any, 
                session.repoInfo.repo
            );

            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(defaultFilename),
                filters: {
                    'Report Files': format.value === 'pdf' ? ['pdf'] : 
                                   format.value === 'html' ? ['html'] :
                                   format.value === 'markdown' ? ['md'] : ['json']
                }
            });

            if (saveUri) {
                await reportGenerator.generateReport(
                    session.analysisResults,
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

    private async deleteSession(sessionId: string): Promise<void> {
        await this.githubIntegration.deleteSession(sessionId);
        this.githubProvider.refresh();
    }
}