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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubIntegration = void 0;
const vscode = __importStar(require("vscode"));
const rest_1 = require("@octokit/rest");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const CLIAnalysisEngine_1 = require("../cli/CLIAnalysisEngine");
const CLIConfig_1 = require("../cli/CLIConfig");
class GitHubIntegration {
    constructor(context) {
        this.context = context;
        this.octokit = null;
        this.sessions = new Map();
        this.outputChannel = vscode.window.createOutputChannel('Strategic Code Companion - GitHub');
        this.tempDir = path_1.default.join(context.globalStoragePath, 'github-repos');
        this.loadSessions();
    }
    async initialize(githubToken) {
        if (githubToken) {
            this.octokit = new rest_1.Octokit({
                auth: githubToken,
            });
            // Test authentication
            try {
                const { data } = await this.octokit.rest.users.getAuthenticated();
                this.outputChannel.appendLine(`✅ GitHub authenticated as: ${data.login}`);
                vscode.window.showInformationMessage(`GitHub connected as ${data.login}`);
            }
            catch (error) {
                throw new Error(`GitHub authentication failed: ${error}`);
            }
        }
        else {
            // Use unauthenticated API (rate limited)
            this.octokit = new rest_1.Octokit();
            this.outputChannel.appendLine('⚠️ Using GitHub API without authentication (rate limited)');
        }
        // Ensure temp directory exists
        await promises_1.default.mkdir(this.tempDir, { recursive: true });
    }
    async analyzeGitHubRepository(repoUrl, useEnhancedFeatures = true) {
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
                const session = {
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
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Analysis failed for ${repoInfo.fullName}: ${error}`);
            throw error;
        }
    }
    parseGitHubUrl(url) {
        // Support various GitHub URL formats
        const patterns = [
            /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/)?$/,
            /^([^\/]+)\/([^\/]+)$/ // Simple owner/repo format
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
    async fetchRepositoryInfo(owner, repo) {
        try {
            const { data } = await this.octokit.rest.repos.get({ owner, repo });
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
        }
        catch (error) {
            if (error.status === 404) {
                throw new Error(`Repository ${owner}/${repo} not found or not accessible`);
            }
            throw new Error(`Failed to fetch repository info: ${error.message}`);
        }
    }
    async cloneRepository(repoInfo) {
        const repoPath = path_1.default.join(this.tempDir, `${repoInfo.owner}-${repoInfo.repo}-${Date.now()}`);
        try {
            // Use git command to clone the repository
            await this.executeCommand(`git clone --depth 1 ${repoInfo.url}.git "${repoPath}"`);
            // Verify clone success
            const stat = await promises_1.default.stat(repoPath);
            if (!stat.isDirectory()) {
                throw new Error('Failed to clone repository');
            }
            this.outputChannel.appendLine(`📁 Repository cloned to: ${repoPath}`);
            return repoPath;
        }
        catch (error) {
            // Cleanup on failure
            try {
                await promises_1.default.rm(repoPath, { recursive: true, force: true });
            }
            catch { }
            throw new Error(`Failed to clone repository: ${error}`);
        }
    }
    async runAnalysis(localPath, useEnhancedFeatures) {
        // Get API configuration from existing VS Code settings
        const config = new CLIConfig_1.CLIConfig();
        // Load from VS Code settings or show error
        const apiKey = vscode.workspace.getConfiguration('strategic-code-companion').get('apiKey');
        const provider = vscode.workspace.getConfiguration('strategic-code-companion').get('provider') || 'gemini';
        const composioKey = vscode.workspace.getConfiguration('strategic-code-companion').get('composioKey');
        if (!apiKey) {
            throw new Error('No API key configured. Please configure your API settings in VS Code settings.');
        }
        config.setProvider(provider);
        config.setApiKey(provider, apiKey);
        if (composioKey) {
            config.setComposioKey(composioKey);
        }
        // Run analysis using CLI engine
        const analysisEngine = new CLIAnalysisEngine_1.CLIAnalysisEngine(config);
        return await analysisEngine.analyzeCodebase(localPath, useEnhancedFeatures);
    }
    async executeCommand(command) {
        const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
        const { promisify } = await Promise.resolve().then(() => __importStar(require('util')));
        const execAsync = promisify(exec);
        try {
            const { stdout, stderr } = await execAsync(command);
            if (stderr && !stderr.includes('warning')) {
                throw new Error(stderr);
            }
            return stdout;
        }
        catch (error) {
            throw new Error(`Command failed: ${error.message}`);
        }
    }
    async cleanupRepository(repoPath) {
        try {
            await promises_1.default.rm(repoPath, { recursive: true, force: true });
            this.outputChannel.appendLine(`🗑️ Cleaned up: ${repoPath}`);
        }
        catch (error) {
            this.outputChannel.appendLine(`⚠️ Failed to cleanup: ${repoPath} - ${error}`);
        }
    }
    async cleanupOldSessions(maxAge = 24 * 60 * 60 * 1000) {
        const now = Date.now();
        const sessionsToRemove = [];
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
    getRecentSessions() {
        return Array.from(this.sessions.values())
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 10); // Return last 10 sessions
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    async deleteSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            if (session.localPath) {
                await this.cleanupRepository(session.localPath);
            }
            this.sessions.delete(sessionId);
            await this.saveSessions();
        }
    }
    async saveSessions() {
        try {
            const sessionsData = Array.from(this.sessions.entries()).map(([id, session]) => ({
                id,
                ...session,
                timestamp: session.timestamp.toISOString()
            }));
            const sessionsFile = path_1.default.join(this.context.globalStoragePath, 'github-sessions.json');
            await promises_1.default.mkdir(path_1.default.dirname(sessionsFile), { recursive: true });
            await promises_1.default.writeFile(sessionsFile, JSON.stringify(sessionsData, null, 2));
        }
        catch (error) {
            this.outputChannel.appendLine(`⚠️ Failed to save sessions: ${error}`);
        }
    }
    async loadSessions() {
        try {
            const sessionsFile = path_1.default.join(this.context.globalStoragePath, 'github-sessions.json');
            const data = await promises_1.default.readFile(sessionsFile, 'utf-8');
            const sessionsData = JSON.parse(data);
            this.sessions.clear();
            for (const sessionData of sessionsData) {
                const session = {
                    ...sessionData,
                    timestamp: new Date(sessionData.timestamp)
                };
                this.sessions.set(session.id, session);
            }
            this.outputChannel.appendLine(`📂 Loaded ${this.sessions.size} previous analysis sessions`);
        }
        catch (error) {
            // File doesn't exist or is corrupted, start fresh
            this.sessions.clear();
        }
    }
    async searchRepositories(query, options = {}) {
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
        }
        catch (error) {
            throw new Error(`Repository search failed: ${error.message}`);
        }
    }
    dispose() {
        this.outputChannel.dispose();
        // Cleanup temp directory on extension deactivation
        this.cleanupOldSessions(0).catch(() => {
            // Ignore errors during cleanup
        });
    }
}
exports.GitHubIntegration = GitHubIntegration;
//# sourceMappingURL=GitHubIntegration.js.map