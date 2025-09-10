#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const CLIAnalysisEngine_1 = require("./CLIAnalysisEngine");
const ReportGenerator_1 = require("../reports/ReportGenerator");
const CLIConfig_1 = require("./CLIConfig");
const packageJson = require('../../package.json');
const program = new commander_1.Command();
program
    .name('strategic-code-companion')
    .description('AI-powered code analysis for strategic insights')
    .version(packageJson.version);
program
    .command('analyze')
    .description('Analyze codebase for strategic insights')
    .argument('<path>', 'Path to code directory to analyze')
    .option('-p, --provider <provider>', 'LLM provider (gemini|claude|openai)', 'gemini')
    .option('-k, --key <apiKey>', 'API key for LLM provider')
    .option('-c, --composio <composioKey>', 'Composio API key for enhanced analysis')
    .option('-o, --output <format>', 'Output format (json|markdown|html|pdf)', 'json')
    .option('-f, --file <filename>', 'Output file path')
    .option('--config <configPath>', 'Path to configuration file')
    .option('--verbose', 'Enable verbose logging')
    .option('--no-enhanced', 'Disable enhanced analysis features')
    .action(async (codePath, options) => {
    try {
        console.log('🤖 Strategic Code Companion - CLI Analysis Tool');
        console.log('='.repeat(50));
        if (options.verbose) {
            console.log('Options:', options);
            console.log('Code path:', path_1.default.resolve(codePath));
        }
        // Initialize configuration
        const config = new CLIConfig_1.CLIConfig();
        if (options.config) {
            await config.loadFromFile(options.config);
        }
        // Override config with command line options
        if (options.key)
            config.setApiKey(options.provider, options.key);
        if (options.composio)
            config.setComposioKey(options.composio);
        if (options.provider)
            config.setProvider(options.provider);
        // Validate configuration
        if (!config.hasValidConfig()) {
            console.error('❌ Missing API key configuration!');
            console.log('\nTo configure API keys:');
            console.log('1. Use --key option: strategic-code-companion analyze ./code --key YOUR_API_KEY');
            console.log('2. Create config file: strategic-code-companion config');
            console.log('3. Set environment variables: SCC_API_KEY, SCC_COMPOSIO_KEY');
            process.exit(1);
        }
        // Validate code path
        const resolvedPath = path_1.default.resolve(codePath);
        try {
            const stat = await promises_1.default.stat(resolvedPath);
            if (!stat.isDirectory()) {
                console.error('❌ Path must be a directory');
                process.exit(1);
            }
        }
        catch (error) {
            console.error(`❌ Cannot access path: ${resolvedPath}`);
            process.exit(1);
        }
        // Initialize analysis engine
        const analysisEngine = new CLIAnalysisEngine_1.CLIAnalysisEngine(config);
        console.log(`📂 Analyzing: ${resolvedPath}`);
        console.log(`🔑 Provider: ${config.getProvider()}`);
        console.log(`🚀 Enhanced features: ${options.enhanced ? 'enabled' : 'disabled'}`);
        console.log();
        // Run analysis
        const results = await analysisEngine.analyzeCodebase(resolvedPath, options.enhanced !== false);
        // Generate report
        const reportGenerator = new ReportGenerator_1.ReportGenerator();
        const outputFormat = options.output;
        if (options.file) {
            // Save to file
            await reportGenerator.generateReport(results, outputFormat, options.file);
            console.log(`📄 Report saved: ${options.file}`);
        }
        else {
            // Output to console
            if (outputFormat === 'json') {
                console.log(JSON.stringify(results, null, 2));
            }
            else {
                const report = await reportGenerator.generateReport(results, outputFormat);
                console.log(report);
            }
        }
        console.log('\n✅ Analysis complete!');
    }
    catch (error) {
        console.error('❌ Analysis failed:', error);
        if (options.verbose && error instanceof Error) {
            console.error('Stack trace:', error.stack);
        }
        process.exit(1);
    }
});
program
    .command('config')
    .description('Configure API keys and settings')
    .option('--provider <provider>', 'Set default LLM provider')
    .option('--key <apiKey>', 'Set API key for current provider')
    .option('--composio <composioKey>', 'Set Composio API key')
    .option('--show', 'Show current configuration')
    .action(async (options) => {
    const config = new CLIConfig_1.CLIConfig();
    try {
        await config.loadFromFile();
    }
    catch {
        // Config file doesn't exist, will be created
    }
    if (options.show) {
        console.log('Current configuration:');
        console.log(`Provider: ${config.getProvider() || 'not set'}`);
        console.log(`API Key: ${config.hasApiKey() ? '***hidden***' : 'not set'}`);
        console.log(`Composio Key: ${config.hasComposioKey() ? '***hidden***' : 'not set'}`);
        return;
    }
    if (options.provider) {
        config.setProvider(options.provider);
    }
    if (options.key) {
        config.setApiKey(config.getProvider() || 'gemini', options.key);
    }
    if (options.composio) {
        config.setComposioKey(options.composio);
    }
    await config.saveToFile();
    console.log('✅ Configuration saved!');
});
program
    .command('report')
    .description('Generate report from previous analysis results')
    .argument('<resultsFile>', 'Path to analysis results JSON file')
    .option('-o, --output <format>', 'Output format (markdown|html|pdf)', 'markdown')
    .option('-f, --file <filename>', 'Output file path')
    .action(async (resultsFile, options) => {
    try {
        const resultsData = await promises_1.default.readFile(resultsFile, 'utf-8');
        const results = JSON.parse(resultsData);
        const reportGenerator = new ReportGenerator_1.ReportGenerator();
        const outputFormat = options.output;
        if (options.file) {
            await reportGenerator.generateReport(results, outputFormat, options.file);
            console.log(`📄 Report saved: ${options.file}`);
        }
        else {
            const report = await reportGenerator.generateReport(results, outputFormat);
            console.log(report);
        }
    }
    catch (error) {
        console.error('❌ Report generation failed:', error);
        process.exit(1);
    }
});
// Add help examples
program.on('--help', () => {
    console.log('');
    console.log('Examples:');
    console.log('  $ strategic-code-companion analyze ./my-project --key YOUR_API_KEY');
    console.log('  $ strategic-code-companion analyze ./src --output html --file report.html');
    console.log('  $ strategic-code-companion config --provider claude --key sk-...');
    console.log('  $ strategic-code-companion report analysis-results.json --output pdf');
    console.log('');
});
if (process.argv.length === 2) {
    program.help();
}
program.parse();
//# sourceMappingURL=index.js.map