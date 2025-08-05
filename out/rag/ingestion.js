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
exports.CodeIngestion = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ignore_1 = __importDefault(require("ignore"));
const parser = __importStar(require("@babel/parser"));
const traverse_1 = __importDefault(require("@babel/traverse"));
const t = __importStar(require("@babel/types"));
class CodeIngestion {
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this.initializeIgnoreFilter();
    }
    initializeIgnoreFilter() {
        this.ignoreFilter = (0, ignore_1.default)().add(CodeIngestion.DEFAULT_IGNORE_PATTERNS);
        // Add patterns from .gitignore if it exists
        const gitignorePath = path.join(this.workspaceRoot, '.gitignore');
        if (fs.existsSync(gitignorePath)) {
            const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
            this.ignoreFilter.add(gitignoreContent);
        }
        // Add patterns from .vscodeignore if it exists
        const vscodeignorePath = path.join(this.workspaceRoot, '.vscodeignore');
        if (fs.existsSync(vscodeignorePath)) {
            const vscodeignoreContent = fs.readFileSync(vscodeignorePath, 'utf8');
            this.ignoreFilter.add(vscodeignoreContent);
        }
    }
    async ingestWorkspace() {
        const allFiles = await this.getAllSourceFiles();
        const chunks = [];
        console.log(`Found ${allFiles.length} files, processing up to ${CodeIngestion.MAX_FILES} files...`);
        // Limit the number of files to process
        const filesToProcess = allFiles.slice(0, CodeIngestion.MAX_FILES);
        for (const filePath of filesToProcess) {
            try {
                // Check file size before processing
                const stats = fs.statSync(filePath);
                if (stats.size > CodeIngestion.MAX_FILE_SIZE) {
                    console.warn(`Skipping large file: ${filePath} (${Math.round(stats.size / 1024)}KB)`);
                    continue;
                }
                const fileChunks = await this.processFile(filePath);
                chunks.push(...fileChunks.slice(0, CodeIngestion.MAX_CHUNKS_PER_FILE));
            }
            catch (error) {
                console.warn(`Failed to process file ${filePath}:`, error);
            }
        }
        console.log(`Successfully processed ${filesToProcess.length} files, generated ${chunks.length} chunks`);
        return chunks;
    }
    async getAllSourceFiles() {
        const files = [];
        const walkDir = (dir) => {
            // Early exit if we've found enough files
            if (files.length >= CodeIngestion.MAX_FILES * 2) {
                return;
            }
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const relativePath = path.relative(this.workspaceRoot, fullPath);
                if (this.ignoreFilter.ignores(relativePath)) {
                    continue;
                }
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    walkDir(fullPath);
                }
                else if (stat.isFile()) {
                    const ext = path.extname(fullPath).toLowerCase();
                    if (CodeIngestion.SUPPORTED_EXTENSIONS.has(ext)) {
                        files.push(fullPath);
                        // Early exit if we've found enough files
                        if (files.length >= CodeIngestion.MAX_FILES * 2) {
                            return;
                        }
                    }
                }
            }
        };
        walkDir(this.workspaceRoot);
        return files;
    }
    async processFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const language = this.getLanguageFromExtension(path.extname(filePath));
        // Use AST-aware chunking for supported languages
        if (language === 'javascript' || language === 'typescript') {
            return this.processJavaScriptTypeScript(filePath, content, language);
        }
        else if (language === 'python') {
            return this.processPython(filePath, content);
        }
        else {
            // Fallback to simple chunking for unsupported languages
            return this.processGeneric(filePath, content, language);
        }
    }
    processJavaScriptTypeScript(filePath, content, language) {
        const chunks = [];
        try {
            const ast = parser.parse(content, {
                sourceType: 'module',
                plugins: [
                    'jsx',
                    'typescript',
                    'decorators-legacy',
                    'classProperties',
                    'objectRestSpread',
                    'asyncGenerators',
                    'functionBind',
                    'exportDefaultFrom',
                    'exportNamespaceFrom',
                    'dynamicImport',
                    'nullishCoalescingOperator',
                    'optionalChaining'
                ]
            });
            const lines = content.split('\n');
            (0, traverse_1.default)(ast, {
                FunctionDeclaration: (nodePath) => {
                    const node = nodePath.node;
                    const chunk = this.createChunkFromNode(node, filePath, lines, language, 'function');
                    if (chunk)
                        chunks.push(chunk);
                },
                ArrowFunctionExpression: (nodePath) => {
                    const node = nodePath.node;
                    if (t.isVariableDeclarator(nodePath.parent) && t.isIdentifier(nodePath.parent.id)) {
                        const chunk = this.createChunkFromNode(node, filePath, lines, language, 'function');
                        if (chunk) {
                            chunk.metadata.name = nodePath.parent.id.name;
                            chunks.push(chunk);
                        }
                    }
                },
                ClassDeclaration: (nodePath) => {
                    const node = nodePath.node;
                    const chunk = this.createChunkFromNode(node, filePath, lines, language, 'class');
                    if (chunk)
                        chunks.push(chunk);
                },
                TSInterfaceDeclaration: (nodePath) => {
                    const node = nodePath.node;
                    const chunk = this.createChunkFromNode(node, filePath, lines, language, 'interface');
                    if (chunk)
                        chunks.push(chunk);
                },
                TSTypeAliasDeclaration: (nodePath) => {
                    const node = nodePath.node;
                    const chunk = this.createChunkFromNode(node, filePath, lines, language, 'type');
                    if (chunk)
                        chunks.push(chunk);
                }
            });
        }
        catch (error) {
            console.warn(`Failed to parse ${filePath} as ${language}:`, error);
            return this.processGeneric(filePath, content, language);
        }
        return chunks;
    }
    processPython(filePath, content) {
        // For Python, we'll use a simple regex-based approach
        // In a production environment, you'd want to use a proper Python AST parser
        const chunks = [];
        const lines = content.split('\n');
        const functionRegex = /^(\s*)def\s+(\w+)\s*\([^)]*\):/;
        const classRegex = /^(\s*)class\s+(\w+).*:/;
        let currentChunk = null;
        let currentIndent = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const functionMatch = line.match(functionRegex);
            const classMatch = line.match(classRegex);
            if (functionMatch || classMatch) {
                // Save previous chunk if exists
                if (currentChunk) {
                    currentChunk.endLine = i - 1;
                    currentChunk.content = lines.slice(currentChunk.startLine, currentChunk.endLine + 1).join('\n');
                    chunks.push(currentChunk);
                }
                // Start new chunk
                const match = functionMatch || classMatch;
                const indent = match[1].length;
                const name = match[2];
                const type = functionMatch ? 'function' : 'class';
                currentChunk = {
                    id: `${filePath}:${i + 1}:${name}`,
                    filePath,
                    startLine: i,
                    type,
                    language: 'python',
                    metadata: { name }
                };
                currentIndent = indent;
            }
        }
        // Close final chunk
        if (currentChunk) {
            currentChunk.endLine = lines.length - 1;
            currentChunk.content = lines.slice(currentChunk.startLine, currentChunk.endLine + 1).join('\n');
            chunks.push(currentChunk);
        }
        return chunks;
    }
    processGeneric(filePath, content, language) {
        // Simple line-based chunking for unsupported languages
        const chunks = [];
        const lines = content.split('\n');
        const chunkSize = 50; // Lines per chunk
        for (let i = 0; i < lines.length; i += chunkSize) {
            const endLine = Math.min(i + chunkSize - 1, lines.length - 1);
            const chunkContent = lines.slice(i, endLine + 1).join('\n');
            chunks.push({
                id: `${filePath}:${i + 1}-${endLine + 1}`,
                content: chunkContent,
                filePath,
                startLine: i,
                endLine,
                type: 'other',
                language,
                metadata: {}
            });
        }
        return chunks;
    }
    createChunkFromNode(node, filePath, lines, language, type) {
        if (!node.loc)
            return null;
        const startLine = node.loc.start.line - 1;
        const endLine = node.loc.end.line - 1;
        const content = lines.slice(startLine, endLine + 1).join('\n');
        const metadata = {};
        if (t.isFunctionDeclaration(node) || t.isArrowFunctionExpression(node)) {
            if (t.isFunctionDeclaration(node) && node.id) {
                metadata.name = node.id.name;
            }
            metadata.params = node.params.map((param) => {
                if (t.isIdentifier(param))
                    return param.name;
                return 'unknown';
            });
        }
        else if (t.isClassDeclaration(node) && node.id) {
            metadata.name = node.id.name;
        }
        return {
            id: `${filePath}:${startLine + 1}:${metadata.name || 'anonymous'}`,
            content,
            filePath,
            startLine,
            endLine,
            type,
            language,
            metadata
        };
    }
    getLanguageFromExtension(ext) {
        const languageMap = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.h': 'c',
            '.hpp': 'cpp',
            '.cs': 'csharp',
            '.php': 'php',
            '.rb': 'ruby',
            '.go': 'go',
            '.rs': 'rust',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.scala': 'scala',
            '.r': 'r',
            '.sql': 'sql',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.sass': 'sass',
            '.less': 'less',
            '.vue': 'vue',
            '.svelte': 'svelte'
        };
        return languageMap[ext.toLowerCase()] || 'text';
    }
}
exports.CodeIngestion = CodeIngestion;
CodeIngestion.MAX_FILES = 100; // Limit to 100 files for faster analysis
CodeIngestion.MAX_FILE_SIZE = 100 * 1024; // 100KB max file size
CodeIngestion.MAX_CHUNKS_PER_FILE = 20; // Limit chunks per file
CodeIngestion.DEFAULT_IGNORE_PATTERNS = [
    // Dependencies and package managers
    'node_modules/**',
    'bower_components/**',
    'jspm_packages/**',
    'vendor/**',
    'third_party/**',
    'packages/**',
    '.pnp/**',
    '.yarn/**',
    // Build outputs
    'dist/**',
    'build/**',
    'out/**',
    'target/**',
    'bin/**',
    'obj/**',
    'public/**',
    'static/**',
    'assets/**',
    // Python
    '__pycache__/**',
    '*.pyc',
    '*.pyo',
    '*.pyd',
    '.Python',
    '*.so',
    '.pytest_cache/**',
    '.coverage/**',
    'htmlcov/**',
    '.tox/**',
    '.env/**',
    '.venv/**',
    'venv/**',
    'env/**',
    'ENV/**',
    // Version control
    '.git/**',
    '.svn/**',
    '.hg/**',
    '.bzr/**',
    // IDEs and editors  
    '.vscode/**',
    '.idea/**',
    '*.swp',
    '*.swo',
    '*~',
    '.DS_Store',
    'Thumbs.db',
    // Logs and temp files
    '*.log',
    '*.tmp',
    '*.temp',
    '*.bak',
    '*.backup',
    '*.cache',
    // Test coverage
    'coverage/**',
    '.nyc_output/**',
    // Minified files
    '*.min.js',
    '*.min.css',
    '*.bundle.js',
    '*.chunk.js',
    // Binary files
    '*.exe',
    '*.dll',
    '*.dylib',
    '*.zip',
    '*.tar',
    '*.gz',
    '*.rar',
    '*.7z',
    // Images and media (usually not relevant for code analysis)
    '*.jpg',
    '*.jpeg',
    '*.png',
    '*.gif',
    '*.bmp',
    '*.ico',
    '*.svg',
    '*.mp4',
    '*.mp3',
    '*.wav',
    '*.mov',
    // Documentation builds
    'docs/_build/**',
    'site/**',
    '_site/**',
    // Lock files and configs that are usually auto-generated
    'package-lock.json',
    'yarn.lock',
    'composer.lock',
    'Pipfile.lock'
];
CodeIngestion.SUPPORTED_EXTENSIONS = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.hpp',
    '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.r',
    '.sql', '.html', '.css', '.scss', '.sass', '.less', '.vue', '.svelte'
]);
//# sourceMappingURL=ingestion.js.map