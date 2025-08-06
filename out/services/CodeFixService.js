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
exports.CodeFixService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class CodeFixService {
    constructor(llmProvider, workspaceRoot) {
        this.llmProvider = llmProvider;
        this.workspaceRoot = workspaceRoot;
    }
    /**
     * Generate code fix for a refactoring suggestion
     */
    async generateRefactoringFix(suggestion, contextFiles) {
        try {
            console.log(`CodeFixService: Generating fix for refactoring "${suggestion.title}"`);
            // Read the target file if specified
            let targetFile = suggestion.filePath;
            if (!targetFile && contextFiles && contextFiles.length > 0) {
                targetFile = contextFiles[0];
            }
            if (!targetFile) {
                throw new Error('No target file specified for refactoring');
            }
            const fullPath = path.resolve(this.workspaceRoot, targetFile);
            const originalContent = fs.readFileSync(fullPath, 'utf8');
            // Generate the fix using LLM
            const modifiedContent = await this.generateCodeWithLLM(originalContent, targetFile, suggestion, 'refactor');
            return [{
                    id: `refactor_${suggestion.id}`,
                    filePath: targetFile,
                    originalContent,
                    modifiedContent,
                    description: `Refactor: ${suggestion.title}`,
                    changeType: 'refactor'
                }];
        }
        catch (error) {
            console.error('CodeFixService: Failed to generate refactoring fix:', error);
            throw new Error(`Failed to generate refactoring fix: ${error}`);
        }
    }
    /**
     * Generate code for implementing a new feature
     */
    async generateFeatureImplementation(feature, targetDirectory) {
        try {
            console.log(`CodeFixService: Generating implementation for feature "${feature.title}"`);
            const fixes = [];
            // Determine target directory
            const targetDir = targetDirectory || this.detectBestDirectory(feature);
            // Generate main feature files
            const featureFiles = await this.generateFeatureFiles(feature, targetDir);
            fixes.push(...featureFiles);
            // Generate integration code (modify existing files)
            const integrationFixes = await this.generateIntegrationCode(feature);
            fixes.push(...integrationFixes);
            return fixes;
        }
        catch (error) {
            console.error('CodeFixService: Failed to generate feature implementation:', error);
            throw new Error(`Failed to generate feature implementation: ${error}`);
        }
    }
    /**
     * Generate library integration code
     */
    async generateLibraryIntegration(libraryName, libraryUrl, projectContext) {
        try {
            console.log(`CodeFixService: Generating integration for library "${libraryName}"`);
            const fixes = [];
            // Generate configuration files
            const configFixes = await this.generateLibraryConfig(libraryName, projectContext);
            fixes.push(...configFixes);
            // Generate usage examples
            const usageFixes = await this.generateLibraryUsage(libraryName, projectContext);
            fixes.push(...usageFixes);
            return fixes;
        }
        catch (error) {
            console.error('CodeFixService: Failed to generate library integration:', error);
            throw new Error(`Failed to generate library integration: ${error}`);
        }
    }
    /**
     * Core LLM-based code generation
     */
    async generateCodeWithLLM(originalCode, filePath, suggestion, type) {
        const fileExtension = path.extname(filePath);
        const language = this.getLanguageFromExtension(fileExtension);
        const systemPrompt = `You are an expert software engineer. Your task is to ${type === 'refactor' ? 'refactor existing code' : 'implement new features'} based on specific requirements.

IMPORTANT RULES:
1. Return ONLY the complete, modified code - no explanations or markdown
2. Preserve existing functionality while making the requested changes
3. Follow the existing code style and patterns
4. Ensure the code is syntactically correct and follows best practices
5. Keep imports and dependencies consistent with the existing codebase`;
        let userPrompt;
        if (type === 'refactor') {
            const refactorSuggestion = suggestion;
            userPrompt = `Refactor this ${language} code according to the following requirements:

REFACTORING TASK: ${refactorSuggestion.title}
DESCRIPTION: ${refactorSuggestion.description}
CATEGORY: ${refactorSuggestion.category}
PRIORITY: ${refactorSuggestion.priority}

BEFORE CODE EXAMPLE:
${refactorSuggestion.beforeCode}

AFTER CODE EXAMPLE:
${refactorSuggestion.afterCode}

CURRENT CODE TO REFACTOR:
\`\`\`${language}
${originalCode}
\`\`\`

Apply the refactoring pattern shown in the before/after example to the current code. Return the complete refactored file:`;
        }
        else {
            const featureSuggestion = suggestion;
            userPrompt = `Implement this new feature in ${language}:

FEATURE: ${featureSuggestion.title}
DESCRIPTION: ${featureSuggestion.description}
CATEGORY: ${featureSuggestion.category}

IMPLEMENTATION STEPS:
${featureSuggestion.implementationOverview.steps.join('\n- ')}

TECHNOLOGIES TO USE:
${featureSuggestion.implementationOverview.technologies.join(', ')}

EXISTING CODE CONTEXT:
\`\`\`${language}
${originalCode}
\`\`\`

Generate the complete file with the new feature implemented:`;
        }
        const response = await this.llmProvider.generateResponse([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ], {
            temperature: 0.3,
            maxTokens: 4000
        });
        // Extract code from response (remove any markdown formatting)
        let generatedCode = response.content.trim();
        // Remove markdown code blocks if present
        const codeBlockRegex = new RegExp(`\`\`\`${language}?\\s*([\\s\\S]*?)\\s*\`\`\``, 'i');
        const match = generatedCode.match(codeBlockRegex);
        if (match) {
            generatedCode = match[1].trim();
        }
        return generatedCode;
    }
    async generateFeatureFiles(feature, targetDir) {
        const fixes = [];
        // Generate main component/service file
        const mainFileName = this.generateFileName(feature.title);
        const mainFilePath = path.join(targetDir, mainFileName);
        const newFileContent = await this.generateNewFileContent(feature, mainFileName);
        fixes.push({
            id: `feature_${feature.id}_main`,
            filePath: mainFilePath,
            originalContent: '',
            modifiedContent: newFileContent,
            description: `Create new file: ${mainFileName}`,
            changeType: 'feature'
        });
        return fixes;
    }
    async generateIntegrationCode(feature) {
        // Find files that need to be modified to integrate the new feature
        // This is a simplified version - could be made more sophisticated
        const fixes = [];
        // Look for main App file or index file to add imports/usage
        const possibleFiles = ['src/App.tsx', 'src/App.jsx', 'src/index.tsx', 'src/main.tsx'];
        for (const filePath of possibleFiles) {
            const fullPath = path.resolve(this.workspaceRoot, filePath);
            if (fs.existsSync(fullPath)) {
                try {
                    const originalContent = fs.readFileSync(fullPath, 'utf8');
                    const modifiedContent = await this.addFeatureIntegration(originalContent, feature, filePath);
                    if (modifiedContent !== originalContent) {
                        fixes.push({
                            id: `feature_${feature.id}_integration_${path.basename(filePath)}`,
                            filePath,
                            originalContent,
                            modifiedContent,
                            description: `Integrate ${feature.title} into ${path.basename(filePath)}`,
                            changeType: 'feature'
                        });
                        break; // Only modify one main file
                    }
                }
                catch (error) {
                    console.warn(`Failed to generate integration for ${filePath}:`, error);
                }
            }
        }
        return fixes;
    }
    async generateLibraryConfig(libraryName, projectContext) {
        // Generate package.json modifications, config files, etc.
        // This is a placeholder - would need more sophisticated implementation
        return [];
    }
    async generateLibraryUsage(libraryName, projectContext) {
        // Generate example usage code
        // This is a placeholder - would need more sophisticated implementation
        return [];
    }
    detectBestDirectory(feature) {
        // Simple heuristic to determine where to place the new feature
        const possibleDirs = ['src/components', 'src/features', 'src/pages', 'src'];
        for (const dir of possibleDirs) {
            const fullPath = path.resolve(this.workspaceRoot, dir);
            if (fs.existsSync(fullPath)) {
                return dir;
            }
        }
        return 'src'; // Default fallback
    }
    generateFileName(featureTitle) {
        // Convert feature title to a valid filename
        const baseName = featureTitle
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
        return `${baseName}.tsx`; // Assuming React/TypeScript project
    }
    async generateNewFileContent(feature, fileName) {
        const systemPrompt = `You are an expert React/TypeScript developer. Create a complete, production-ready component file.

REQUIREMENTS:
1. Return ONLY the complete file content - no explanations
2. Use modern React patterns (functional components, hooks)
3. Include proper TypeScript types
4. Follow React best practices
5. Include basic styling (CSS modules or styled-components)
6. Add proper error handling and loading states if applicable`;
        const userPrompt = `Create a new React component file named "${fileName}" for this feature:

FEATURE: ${feature.title}
DESCRIPTION: ${feature.description}
CATEGORY: ${feature.category}
COMPLEXITY: ${feature.complexity}

IMPLEMENTATION REQUIREMENTS:
${feature.implementationOverview.steps.join('\n- ')}

TECHNOLOGIES TO USE:
${feature.implementationOverview.technologies.join(', ')}

BENEFITS TO ACHIEVE:
${feature.benefits.join('\n- ')}

Generate a complete, working React component file:`;
        const response = await this.llmProvider.generateResponse([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ], {
            temperature: 0.4,
            maxTokens: 3000
        });
        return response.content.trim();
    }
    async addFeatureIntegration(originalContent, feature, filePath) {
        const language = this.getLanguageFromExtension(path.extname(filePath));
        const systemPrompt = `You are an expert developer. Add integration code for a new feature into an existing file.

RULES:
1. Return the COMPLETE modified file - no explanations
2. Add necessary imports at the top
3. Integrate the feature naturally into the existing code structure
4. Preserve all existing functionality
5. Follow the existing code style and patterns`;
        const userPrompt = `Add integration for this feature into the existing file:

FEATURE TO INTEGRATE: ${feature.title}
DESCRIPTION: ${feature.description}

EXISTING FILE (${filePath}):
\`\`\`${language}
${originalContent}
\`\`\`

Add the necessary imports and integration code for the new feature. Return the complete modified file:`;
        const response = await this.llmProvider.generateResponse([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ], {
            temperature: 0.3,
            maxTokens: 4000
        });
        return response.content.trim();
    }
    getLanguageFromExtension(extension) {
        const langMap = {
            '.js': 'javascript',
            '.jsx': 'jsx',
            '.ts': 'typescript',
            '.tsx': 'tsx',
            '.py': 'python',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp',
            '.php': 'php',
            '.rb': 'ruby',
            '.go': 'go',
            '.rs': 'rust',
            '.swift': 'swift',
            '.kt': 'kotlin'
        };
        return langMap[extension.toLowerCase()] || 'text';
    }
}
exports.CodeFixService = CodeFixService;
//# sourceMappingURL=CodeFixService.js.map