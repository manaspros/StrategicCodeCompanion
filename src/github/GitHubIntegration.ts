import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';
import path from 'path';
import fs from 'fs/promises';
import { CLIAnalysisEngine } from '../cli/CLIAnalysisEngine';
import { CLIConfig } from '../cli/CLIConfig';
import { AgentResults } from '../agents/main';

export interface GitHubRepoInfo {
    owner: string;
    repo: string;
    fullName: string;
    url: string;
    description?: string;
    language?: string;
    stars: number;
    forks: number;
    lastUpdated: string;
}

export interface AnalysisSession {
    id: string;
    repoInfo: GitHubRepoInfo;
    analysisResults?: AgentResults;
    timestamp: Date;
    localPath?: string;
}

export class GitHubIntegration {
    private octokit: Octokit | null = null;
    private outputChannel: vscode.OutputChannel;
    private sessions: Map<string, AnalysisSession> = new Map();
    private tempDir: string;

    constructor(private context: vscode.ExtensionContext) {
        this.outputChannel = vscode.window.createOutputChannel('Strategic Code Companion - GitHub');
        this.tempDir = path.join(context.globalStoragePath, 'github-repos');
        this.loadSessions();
    }

    async initialize(githubToken?: string): Promise<void> {
        if (githubToken) {
            this.octokit = new Octokit({
                auth: githubToken,
            });
            
            // Test authentication
            try {
                const { data } = await this.octokit.rest.users.getAuthenticated();
                this.outputChannel.appendLine(`✅ GitHub authenticated as: ${data.login}`);
                vscode.window.showInformationMessage(`GitHub connected as ${data.login}`);
            } catch (error) {
                throw new Error(`GitHub authentication failed: ${error}`);
            }
        } else {
            // Use unauthenticated API (rate limited)
            this.octokit = new Octokit();
            this.outputChannel.appendLine('⚠️ Using GitHub API without authentication (rate limited)');
        }
        
        // Ensure temp directory exists
        await fs.mkdir(this.tempDir, { recursive: true });
    }

    async analyzeGitHubRepository(repoUrl: string, useEnhancedFeatures: boolean = true): Promise<AnalysisSession> {
        if (!this.octokit) {
            throw new Error('GitHub integration not initialized. Please configure GitHub token.');
        }

        // Parse repository URL
        const repoInfo = this.parseGitHubUrl(repoUrl);
        if (!repoInfo) {
            throw new Error('Invalid GitHub repository URL');
        }

        const sessionId = `${repoInfo.owner}-${repoInfo.repo}-${Date.now()}`;

        try {
            // Show progress
            return await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Analyzing ${repoInfo.fullName}`,
                cancellable: true
            }, async (progress, token) => {
                // Step 1: Fetch repository information
                progress.report({ message: 'Fetching repository information...', increment: 10 });
                const repoDetails = await this.fetchRepositoryInfo(repoInfo.owner, repoInfo.repo);
                
                if (token.isCancellationRequested) {
                    throw new Error('Analysis cancelled by user');
                }

                // Step 2: Clone repository to temporary location
                progress.report({ message: 'Cloning repository...', increment: 20 });
                const localPath = await this.cloneRepository(repoDetails);
                
                if (token.isCancellationRequested) {
                    await this.cleanupRepository(localPath);
                    throw new Error('Analysis cancelled by user');
                }

                // Step 3: Create analysis session
                const session: AnalysisSession = {
                    id: sessionId,
                    repoInfo: repoDetails,
                    timestamp: new Date(),
                    localPath
                };

                this.sessions.set(sessionId, session);

                // Step 4: Run code analysis
                progress.report({ message: 'Running AI-powered code analysis...', increment: 40 });
                const analysisResults = await this.runAnalysis(localPath, useEnhancedFeatures);
                
                if (token.isCancellationRequested) {
                    await this.cleanupRepository(localPath);
                    throw new Error('Analysis cancelled by user');
                }

                // Step 5: Store results
                session.analysisResults = analysisResults;
                this.sessions.set(sessionId, session);
                await this.saveSessions();

                progress.report({ message: 'Analysis complete!', increment: 100 });

                this.outputChannel.appendLine(`✅ Analysis completed for ${repoInfo.fullName}`);
                return session;
            });

        } catch (error) {
            this.outputChannel.appendLine(`❌ Analysis failed for ${repoInfo.fullName}: ${error}`);
            throw error;
        }
    }

    private parseGitHubUrl(url: string): Partial<GitHubRepoInfo> | null {
        // Support various GitHub URL formats
        const patterns = [
            /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/)?$/,
            /^([^\/]+)\/([^\/]+)$/  // Simple owner/repo format
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return {
                    owner: match[1],
                    repo: match[2].replace(/\.git$/, ''),
                    fullName: `${match[1]}/${match[2].replace(/\.git$/, '')}`,
                    url: `https://github.com/${match[1]}/${match[2].replace(/\.git$/, '')}`
                };
            }
        }

        return null;
    }

    private async fetchRepositoryInfo(owner: string, repo: string): Promise<GitHubRepoInfo> {
        try {
            const { data } = await this.octokit!.rest.repos.get({ owner, repo });
            
            return {
                owner: data.owner.login,
                repo: data.name,
                fullName: data.full_name,
                url: data.html_url,
                description: data.description || undefined,
                language: data.language || undefined,
                stars: data.stargazers_count,
                forks: data.forks_count,
                lastUpdated: data.updated_at
            };
        } catch (error: any) {
            if (error.status === 404) {
                throw new Error(`Repository ${owner}/${repo} not found or not accessible`);
            }
            throw new Error(`Failed to fetch repository info: ${error.message}`);
        }
    }

    private async cloneRepository(repoInfo: GitHubRepoInfo): Promise<string> {
        const repoPath = path.join(this.tempDir, `${repoInfo.owner}-${repoInfo.repo}-${Date.now()}`);
        
        try {
            // Use git command to clone the repository
            await this.executeCommand(`git clone --depth 1 ${repoInfo.url}.git "${repoPath}"`);
            
            // Verify clone success
            const stat = await fs.stat(repoPath);
            if (!stat.isDirectory()) {
                throw new Error('Failed to clone repository');
            }

            this.outputChannel.appendLine(`📁 Repository cloned to: ${repoPath}`);
            return repoPath;

        } catch (error) {
            // Cleanup on failure
            try {
                await fs.rm(repoPath, { recursive: true, force: true });
            } catch {}
            
            throw new Error(`Failed to clone repository: ${error}`);
        }
    }

    private async runAnalysis(localPath: string, useEnhancedFeatures: boolean): Promise<AgentResults> {
        // Get API configuration from existing VS Code settings
        const config = new CLIConfig();
        
        // Load from VS Code settings or show error
        const apiKey = vscode.workspace.getConfiguration('strategic-code-companion').get('apiKey') as string;
        const provider = vscode.workspace.getConfiguration('strategic-code-companion').get('provider') as string || 'gemini';
        const composioKey = vscode.workspace.getConfiguration('strategic-code-companion').get('composioKey') as string;

        if (!apiKey) {
            throw new Error('No API key configured. Please configure your API settings in VS Code settings.');
        }

        config.setProvider(provider as any);
        config.setApiKey(provider as any, apiKey);
        if (composioKey) {
            config.setComposioKey(composioKey);
        }

        // Run analysis using CLI engine
        const analysisEngine = new CLIAnalysisEngine(config);
        return await analysisEngine.analyzeCodebase(localPath, useEnhancedFeatures);
    }

    private async executeCommand(command: string): Promise<string> {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);

        try {
            const { stdout, stderr } = await execAsync(command);
            if (stderr && !stderr.includes('warning')) {
                throw new Error(stderr);
            }
            return stdout;
        } catch (error: any) {
            throw new Error(`Command failed: ${error.message}`);
        }
    }

    async cleanupRepository(repoPath: string): Promise<void> {
        try {
            await fs.rm(repoPath, { recursive: true, force: true });
            this.outputChannel.appendLine(`🗑️ Cleaned up: ${repoPath}`);
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Failed to cleanup: ${repoPath} - ${error}`);
        }
    }

    async cleanupOldSessions(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
        const now = Date.now();
        const sessionsToRemove: string[] = [];

        for (const [sessionId, session] of this.sessions) {
            if (now - session.timestamp.getTime() > maxAge) {
                sessionsToRemove.push(sessionId);
                if (session.localPath) {
                    await this.cleanupRepository(session.localPath);
                }
            }
        }

        for (const sessionId of sessionsToRemove) {
            this.sessions.delete(sessionId);
        }

        if (sessionsToRemove.length > 0) {
            await this.saveSessions();
            this.outputChannel.appendLine(`🧹 Cleaned up ${sessionsToRemove.length} old analysis sessions`);
        }
    }

    getRecentSessions(): AnalysisSession[] {
        return Array.from(this.sessions.values())
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 10); // Return last 10 sessions
    }

    getSession(sessionId: string): AnalysisSession | undefined {
        return this.sessions.get(sessionId);
    }

    async deleteSession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (session) {
            if (session.localPath) {
                await this.cleanupRepository(session.localPath);
            }
            this.sessions.delete(sessionId);
            await this.saveSessions();
        }
    }

    private async saveSessions(): Promise<void> {
        try {
            const sessionsData = Array.from(this.sessions.entries()).map(([id, session]) => ({
                id,
                ...session,
                timestamp: session.timestamp.toISOString()
            }));

            const sessionsFile = path.join(this.context.globalStoragePath, 'github-sessions.json');
            await fs.mkdir(path.dirname(sessionsFile), { recursive: true });
            await fs.writeFile(sessionsFile, JSON.stringify(sessionsData, null, 2));
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Failed to save sessions: ${error}`);
        }
    }

    private async loadSessions(): Promise<void> {
        try {
            const sessionsFile = path.join(this.context.globalStoragePath, 'github-sessions.json');
            const data = await fs.readFile(sessionsFile, 'utf-8');
            const sessionsData = JSON.parse(data);

            this.sessions.clear();
            for (const sessionData of sessionsData) {
                const session: AnalysisSession = {
                    ...sessionData,
                    timestamp: new Date(sessionData.timestamp)
                };
                this.sessions.set(session.id, session);
            }

            this.outputChannel.appendLine(`📂 Loaded ${this.sessions.size} previous analysis sessions`);
        } catch (error) {
            // File doesn't exist or is corrupted, start fresh
            this.sessions.clear();
        }
    }

    async searchRepositories(query: string, options: {
        language?: string;
        sort?: 'stars' | 'forks' | 'updated';
        order?: 'asc' | 'desc';
        per_page?: number;
    } = {}): Promise<GitHubRepoInfo[]> {
        if (!this.octokit) {
            throw new Error('GitHub integration not initialized');
        }

        try {
            const searchQuery = [
                query,
                options.language ? `language:${options.language}` : '',
            ].filter(Boolean).join(' ');

            const { data } = await this.octokit.rest.search.repos({
                q: searchQuery,
                sort: options.sort,
                order: options.order || 'desc',
                per_page: options.per_page || 20
            });

            return data.items.map(repo => ({
                owner: repo.owner.login,
                repo: repo.name,
                fullName: repo.full_name,
                url: repo.html_url,
                description: repo.description || undefined,
                language: repo.language || undefined,
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                lastUpdated: repo.updated_at
            }));

        } catch (error: any) {
            throw new Error(`Repository search failed: ${error.message}`);
        }
    }

    dispose(): void {
        this.outputChannel.dispose();
        
        // Cleanup temp directory on extension deactivation
        this.cleanupOldSessions(0).catch(() => {
            // Ignore errors during cleanup
        });
    }
}