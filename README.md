# Strategic Code Companion

An AI-powered VS Code extension that provides comprehensive codebase analysis through a multi-agent system.

## Features

- 🤖 **Multi-Agent Analysis**: Refactoring, Architecture, Library recommendations, and Learning resources
- 🔐 **Secure API Key Management**: Uses VS Code's built-in SecretStorage API
- 🔍 **Advanced Code Analysis**: AST-aware chunking with semantic understanding
- 💎 **Modern UI**: Beautiful Webview-based sidebar with tabbed results
- 🌐 **Multi-Provider Support**: Google Gemini, Anthropic Claude, and OpenAI GPT

## Installation & Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Compile TypeScript**:
   ```bash
   npm run compile
   ```

3. **Run Extension**:
   - Open the project in VS Code
   - Press `F5` to launch Extension Development Host
   - In the new VS Code window, click the Strategic Code Companion icon in the Activity Bar

## First Time Setup

1. **Configure AI Provider**:
   - Click the Strategic Code Companion icon in the Activity Bar
   - Select your preferred LLM provider (Gemini/Claude/OpenAI)
   - Enter your API key (stored securely using OS keychain)

2. **Analyze Your Code**:
   - Open any workspace with code files
   - Click "Analyze Workspace" button
   - Wait for the multi-agent analysis to complete
   - Explore results in the tabbed interface

## Analysis Results

The extension provides insights across 5 key areas:

### 1. Overview
- Project summary and complexity metrics
- Technology stack analysis
- Code quality scores

### 2. Refactoring
- Specific code improvement suggestions
- Before/after code examples
- Priority-based recommendations

### 3. Architecture  
- New feature suggestions
- Implementation roadmaps
- Technology recommendations

### 4. Libraries
- Relevant GitHub repository suggestions
- Integration effort estimates
- Community metrics and ratings

### 5. Tutorials
- Learning resource recommendations
- Difficulty-based filtering
- Video tutorials and documentation

## Architecture

```
src/
├── extension.ts            # Main activation
├── security/
│   └── keyManager.ts       # Secure API key storage
├── llm/                    # Multi-provider LLM support
├── rag/                    # Code analysis pipeline
├── agents/                 # Multi-agent system
└── sidebar/                # Modern Webview UI
```

## Security

- API keys are stored using VS Code's SecretStorage API
- Keys are encrypted using the operating system's native keychain
- No sensitive data is stored in plain text or configuration files

## Dependencies

- **Core**: TypeScript, VS Code Extension API
- **AI Providers**: OpenAI, Anthropic, Google Generative AI
- **Code Analysis**: Babel Parser for AST processing
- **UI**: Custom Webview with modern CSS

## Development

```bash
# Watch mode for development
npm run watch

# Launch extension development host
# Press F5 in VS Code
```

## Requirements

- VS Code 1.74.0 or higher
- Node.js 18.x or higher
- API key from one of the supported providers

## Supported Languages

- JavaScript/TypeScript (full AST analysis)
- Python (regex-based chunking)
- Java, C++, C#, PHP, Ruby, Go, etc. (generic chunking)

## Troubleshooting

1. **API Key Issues**: Use the "Clear API Key" button and reconfigure
2. **Analysis Fails**: Check VS Code Developer Console for errors
3. **No Results**: Ensure workspace contains supported code files

---

Built with ❤️ for developers who want AI-powered strategic insights into their codebase.