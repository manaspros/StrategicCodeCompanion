import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { CodeFix, CodeFixResult } from './CodeFixService';

export interface BackupInfo {
    backupId: string;
    timestamp: Date;
    originalFiles: { [filePath: string]: string };
    description: string;
}

export interface ApplyResult {
    success: boolean;
    appliedFixes: CodeFix[];
    failedFixes: { fix: CodeFix; error: string }[];
    backupId?: string;
}

export class FileEditService {
    private workspaceRoot: string;
    private backupDir: string;
    private backups: Map<string, BackupInfo> = new Map();

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.backupDir = path.join(workspaceRoot, '.vscode', 'strategic-code-companion-backups');
        this.ensureBackupDirectory();
    }

    /**
     * Apply code fixes with safety measures
     */
    async applyFixes(fixes: CodeFix[], description: string): Promise<ApplyResult> {
        try {
            console.log(`FileEditService: Applying ${fixes.length} fixes - ${description}`);
            
            // Create backup before making any changes
            const backupId = await this.createBackup(fixes, description);
            
            const appliedFixes: CodeFix[] = [];
            const failedFixes: { fix: CodeFix; error: string }[] = [];

            // Apply each fix
            for (const fix of fixes) {
                try {
                    await this.applySingleFix(fix);
                    appliedFixes.push(fix);
                    console.log(`FileEditService: Successfully applied fix to ${fix.filePath}`);
                } catch (error) {
                    console.error(`FileEditService: Failed to apply fix to ${fix.filePath}:`, error);
                    failedFixes.push({ fix, error: String(error) });
                }
            }

            // If any fixes failed, offer to rollback
            if (failedFixes.length > 0 && appliedFixes.length > 0) {
                const rollbackChoice = await vscode.window.showWarningMessage(
                    `${failedFixes.length} fixes failed. Do you want to rollback all changes?`,
                    'Rollback', 'Keep Successful Changes'
                );

                if (rollbackChoice === 'Rollback') {
                    await this.rollbackChanges(backupId);
                    return {
                        success: false,
                        appliedFixes: [],
                        failedFixes,
                        backupId
                    };
                }
            }

            const success = failedFixes.length === 0;
            if (success) {
                vscode.window.showInformationMessage(
                    `Successfully applied ${appliedFixes.length} code fixes!`
                );
            } else {
                vscode.window.showWarningMessage(
                    `Applied ${appliedFixes.length} fixes, but ${failedFixes.length} failed.`
                );
            }

            return {
                success,
                appliedFixes,
                failedFixes,
                backupId
            };

        } catch (error) {
            console.error('FileEditService: Failed to apply fixes:', error);
            vscode.window.showErrorMessage(`Failed to apply fixes: ${error}`);
            return {
                success: false,
                appliedFixes: [],
                failedFixes: fixes.map(fix => ({ fix, error: String(error) }))
            };
        }
    }

    /**
     * Preview changes before applying them
     */
    async previewChanges(fixes: CodeFix[]): Promise<boolean> {
        try {
            // Group fixes by file for better organization
            const fileGroups = new Map<string, CodeFix[]>();
            fixes.forEach(fix => {
                if (!fileGroups.has(fix.filePath)) {
                    fileGroups.set(fix.filePath, []);
                }
                fileGroups.get(fix.filePath)!.push(fix);
            });

            // Show diff for each file
            for (const [filePath, fileFixes] of fileGroups) {
                const shouldContinue = await this.showFileDiff(filePath, fileFixes);
                if (!shouldContinue) {
                    return false; // User cancelled
                }
            }

            // Final confirmation
            const confirmation = await vscode.window.showInformationMessage(
                `Ready to apply ${fixes.length} changes to ${fileGroups.size} files. Continue?`,
                'Apply Changes', 'Cancel'
            );

            return confirmation === 'Apply Changes';

        } catch (error) {
            console.error('FileEditService: Failed to preview changes:', error);
            vscode.window.showErrorMessage(`Failed to preview changes: ${error}`);
            return false;
        }
    }

    /**
     * Create a backup of files before modification
     */
    private async createBackup(fixes: CodeFix[], description: string): Promise<string> {
        const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date();
        const originalFiles: { [filePath: string]: string } = {};

        // Read original content of all files that will be modified
        for (const fix of fixes) {
            const fullPath = path.resolve(this.workspaceRoot, fix.filePath);
            
            if (fs.existsSync(fullPath)) {
                // Existing file - backup original content
                originalFiles[fix.filePath] = fs.readFileSync(fullPath, 'utf8');
            } else {
                // New file - mark as new
                originalFiles[fix.filePath] = ''; // Empty string indicates new file
            }
        }

        // Store backup info
        const backupInfo: BackupInfo = {
            backupId,
            timestamp,
            originalFiles,
            description
        };

        this.backups.set(backupId, backupInfo);

        // Optionally save backup to disk for persistence
        await this.saveBackupToDisk(backupInfo);

        console.log(`FileEditService: Created backup ${backupId} for ${Object.keys(originalFiles).length} files`);
        return backupId;
    }

    /**
     * Apply a single code fix
     */
    private async applySingleFix(fix: CodeFix): Promise<void> {
        const fullPath = path.resolve(this.workspaceRoot, fix.filePath);
        const directory = path.dirname(fullPath);

        // Ensure directory exists
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        // Validate syntax before writing (basic check)
        if (!this.isValidSyntax(fix.modifiedContent, fix.filePath)) {
            throw new Error('Generated code has syntax errors');
        }

        // Write the modified content
        fs.writeFileSync(fullPath, fix.modifiedContent, 'utf8');

        // Notify VS Code about the file change
        if (fix.originalContent === '') {
            // New file created
            const uri = vscode.Uri.file(fullPath);
            await vscode.workspace.openTextDocument(uri);
        } else {
            // Existing file modified - trigger refresh
            const uri = vscode.Uri.file(fullPath);
            const document = await vscode.workspace.openTextDocument(uri);
            // Force reload in editor if open
            const editors = vscode.window.visibleTextEditors.filter(editor => 
                editor.document.uri.fsPath === fullPath
            );
            if (editors.length > 0) {
                await vscode.commands.executeCommand('workbench.action.files.revert', uri);
            }
        }
    }

    /**
     * Show diff preview for a file
     */
    private async showFileDiff(filePath: string, fixes: CodeFix[]): Promise<boolean> {
        try {
            // Combine all fixes for this file
            let finalContent = fixes[0].originalContent;
            for (const fix of fixes) {
                finalContent = fix.modifiedContent; // Last fix wins (simplified)
            }

            const fullPath = path.resolve(this.workspaceRoot, filePath);
            
            // Create temporary files for diff
            const tempDir = path.join(this.backupDir, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempOriginal = path.join(tempDir, `${path.basename(filePath)}.original`);
            const tempModified = path.join(tempDir, `${path.basename(filePath)}.modified`);

            fs.writeFileSync(tempOriginal, fixes[0].originalContent || '// New file', 'utf8');
            fs.writeFileSync(tempModified, finalContent, 'utf8');

            // Open diff in VS Code
            const originalUri = vscode.Uri.file(tempOriginal);
            const modifiedUri = vscode.Uri.file(tempModified);

            await vscode.commands.executeCommand(
                'vscode.diff',
                originalUri,
                modifiedUri,
                `${path.basename(filePath)} - Proposed Changes`
            );

            // Ask user for confirmation
            const choices = ['Accept Changes', 'Skip This File', 'Cancel All'];
            const choice = await vscode.window.showInformationMessage(
                `Review changes to ${filePath}. ${fixes.length} modification(s) proposed.`,
                ...choices
            );

            // Clean up temp files
            try {
                fs.unlinkSync(tempOriginal);
                fs.unlinkSync(tempModified);
            } catch (error) {
                console.warn('Failed to clean up temp files:', error);
            }

            return choice === 'Accept Changes' || choice === undefined;

        } catch (error) {
            console.error(`Failed to show diff for ${filePath}:`, error);
            const choice = await vscode.window.showWarningMessage(
                `Cannot preview ${filePath}. Apply changes blindly?`,
                'Apply', 'Skip', 'Cancel'
            );
            return choice === 'Apply';
        }
    }

    /**
     * Rollback changes using backup
     */
    async rollbackChanges(backupId: string): Promise<boolean> {
        try {
            const backup = this.backups.get(backupId);
            if (!backup) {
                throw new Error(`Backup ${backupId} not found`);
            }

            console.log(`FileEditService: Rolling back changes for backup ${backupId}`);

            for (const [filePath, originalContent] of Object.entries(backup.originalFiles)) {
                const fullPath = path.resolve(this.workspaceRoot, filePath);
                
                if (originalContent === '') {
                    // This was a new file - delete it
                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                    }
                } else {
                    // Restore original content
                    fs.writeFileSync(fullPath, originalContent, 'utf8');
                }
            }

            vscode.window.showInformationMessage(
                `Successfully rolled back ${Object.keys(backup.originalFiles).length} files`
            );

            return true;

        } catch (error) {
            console.error('FileEditService: Failed to rollback changes:', error);
            vscode.window.showErrorMessage(`Failed to rollback changes: ${error}`);
            return false;
        }
    }

    /**
     * List available backups
     */
    getAvailableBackups(): BackupInfo[] {
        return Array.from(this.backups.values()).sort((a, b) => 
            b.timestamp.getTime() - a.timestamp.getTime()
        );
    }

    /**
     * Basic syntax validation
     */
    private isValidSyntax(content: string, filePath: string): boolean {
        const extension = path.extname(filePath).toLowerCase();
        
        try {
            if (extension === '.json') {
                JSON.parse(content);
            } else if (extension === '.js' || extension === '.jsx' || extension === '.ts' || extension === '.tsx') {
                // Basic checks - could be enhanced with proper AST parsing
                const balancedBraces = (content.match(/\{/g) || []).length === (content.match(/\}/g) || []).length;
                const balancedParens = (content.match(/\(/g) || []).length === (content.match(/\)/g) || []).length;
                const balancedBrackets = (content.match(/\[/g) || []).length === (content.match(/\]/g) || []).length;
                
                return balancedBraces && balancedParens && balancedBrackets;
            }
            
            return true; // Assume valid for other file types
        } catch (error) {
            return false;
        }
    }

    /**
     * Ensure backup directory exists
     */
    private ensureBackupDirectory(): void {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    /**
     * Save backup to disk for persistence
     */
    private async saveBackupToDisk(backup: BackupInfo): Promise<void> {
        try {
            const backupFile = path.join(this.backupDir, `${backup.backupId}.json`);
            const backupData = {
                ...backup,
                timestamp: backup.timestamp.toISOString()
            };
            fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
        } catch (error) {
            console.warn('Failed to save backup to disk:', error);
        }
    }

    /**
     * Load backups from disk
     */
    async loadBackupsFromDisk(): Promise<void> {
        try {
            if (!fs.existsSync(this.backupDir)) {
                return;
            }

            const backupFiles = fs.readdirSync(this.backupDir)
                .filter(file => file.endsWith('.json'));

            for (const file of backupFiles) {
                try {
                    const backupPath = path.join(this.backupDir, file);
                    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
                    
                    const backup: BackupInfo = {
                        ...backupData,
                        timestamp: new Date(backupData.timestamp)
                    };
                    
                    this.backups.set(backup.backupId, backup);
                } catch (error) {
                    console.warn(`Failed to load backup file ${file}:`, error);
                }
            }

            console.log(`FileEditService: Loaded ${this.backups.size} backups from disk`);
        } catch (error) {
            console.warn('Failed to load backups from disk:', error);
        }
    }
}