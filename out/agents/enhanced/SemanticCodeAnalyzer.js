"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticCodeAnalyzer = void 0;
class SemanticCodeAnalyzer {
    constructor(llmProvider) {
        this.llmProvider = llmProvider;
    }
    async analyzeSemanticContext(codeChunks) {
        console.log('🧠 Performing semantic code analysis...');
        // Analyze in parallel for better performance
        const [codeFlows, dependencies, architecturalPatterns, businessLogicAreas, qualityHotspots, crossCuttingConcerns] = await Promise.all([
            this.analyzeCodeFlows(codeChunks),
            this.analyzeDependencies(codeChunks),
            this.analyzeArchitecturalPatterns(codeChunks),
            this.analyzeBusinessLogicAreas(codeChunks),
            this.analyzeQualityHotspots(codeChunks),
            this.analyzeCrossCuttingConcerns(codeChunks)
        ]);
        return {
            codeFlows,
            dependencies,
            architecturalPatterns,
            businessLogicAreas,
            qualityHotspots,
            crossCuttingConcerns
        };
    }
    async analyzeCodeFlows(codeChunks) {
        const systemPrompt = `You are an expert software architect. Analyze the provided code to identify key business flows and data processing paths.

Focus on:
1. User-facing workflows and business processes
2. Data transformation pipelines
3. API endpoints and their complete execution paths
4. Critical business logic sequences
5. Integration points and external service calls

For each flow, assess:
- Business value (how critical is this to users/business)
- Complexity (technical complexity and maintainability)
- Risk level (potential for bugs, security issues, performance problems)`;
        const codeContext = this.buildCodeContext(codeChunks, 'flows');
        const userPrompt = `Analyze these code samples and identify the key business flows:

${codeContext}

Return a JSON array of flows:
{
  "flows": [
    {
      "id": "user-authentication",
      "name": "User Authentication Flow",
      "entryPoints": ["POST /auth/login", "POST /auth/register"],
      "dataFlow": [
        {"step": "validate-credentials", "files": ["auth/validator.js"], "complexity": 3},
        {"step": "check-database", "files": ["auth/database.js"], "complexity": 2},
        {"step": "generate-token", "files": ["auth/jwt.js"], "complexity": 1}
      ],
      "complexity": 6,
      "businessValue": "high",
      "riskLevel": "high"
    }
  ]
}`;
        try {
            const response = await this.llmProvider.generateResponse([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], { temperature: 0.3, maxTokens: 2000 });
            const result = this.extractJSON(response.content);
            return result.flows || [];
        }
        catch (error) {
            console.warn('Code flow analysis failed:', error);
            return [];
        }
    }
    async analyzeDependencies(codeChunks) {
        const systemPrompt = `You are a software architecture expert specializing in dependency analysis. Analyze the code structure to understand:

1. Module relationships and import/export patterns
2. Circular dependencies and tight coupling
3. External library usage and integration patterns  
4. Architectural boundaries and layer violations
5. Dependency injection patterns`;
        const codeContext = this.buildCodeContext(codeChunks, 'dependencies');
        const userPrompt = `Analyze the dependency structure of this codebase:

${codeContext}

Return detailed dependency analysis as JSON:
{
  "modules": [
    {
      "name": "user-service",
      "dependencies": ["database", "validation", "auth"],
      "dependents": ["user-controller", "admin-service"],
      "couplingScore": 0.7,
      "stability": 0.8
    }
  ],
  "circularDependencies": [
    ["module-a", "module-b", "module-a"]
  ],
  "externalDependencies": [
    {
      "name": "lodash",
      "usage": "utility functions",
      "riskLevel": "low",
      "alternatives": ["native JS methods", "ramda"]
    }
  ],
  "couplingMetrics": [
    {
      "metric": "afferent-coupling",
      "value": 15,
      "threshold": 10,
      "status": "warning"
    }
  ]
}`;
        try {
            const response = await this.llmProvider.generateResponse([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], { temperature: 0.2, maxTokens: 2500 });
            const result = this.extractJSON(response.content);
            return {
                modules: result.modules || [],
                circularDependencies: result.circularDependencies || [],
                externalDependencies: result.externalDependencies || [],
                couplingMetrics: result.couplingMetrics || []
            };
        }
        catch (error) {
            console.warn('Dependency analysis failed:', error);
            return {
                modules: [],
                circularDependencies: [],
                externalDependencies: [],
                couplingMetrics: []
            };
        }
    }
    async analyzeArchitecturalPatterns(codeChunks) {
        const systemPrompt = `You are a software architect expert. Analyze the code to identify architectural patterns and assess their implementation quality.

Look for:
1. Design patterns (MVC, MVP, MVVM, Repository, Factory, Observer, etc.)
2. Architectural patterns (Layered, Microservices, Event-driven, etc.)
3. Code organization patterns (Module patterns, Namespace patterns)
4. Integration patterns (API patterns, Database patterns)

Assess:
- How well each pattern is implemented (adherence score 0-1)
- What violations exist
- Recommendations for improvement`;
        const codeContext = this.buildCodeContext(codeChunks, 'architecture');
        const userPrompt = `Analyze architectural patterns in this codebase:

${codeContext}

Return pattern analysis as JSON:
{
  "patterns": [
    {
      "pattern": "MVC",
      "implementation": [
        "controllers/UserController.js - handles HTTP requests",
        "models/User.js - data model and business logic", 
        "views/UserView.js - presentation logic"
      ],
      "adherence": 0.8,
      "violations": [
        "Controller contains business logic that should be in model",
        "View directly accesses model without going through controller"
      ],
      "recommendations": [
        "Move business logic from UserController to UserService",
        "Implement proper view-controller communication"
      ]
    }
  ]
}`;
        try {
            const response = await this.llmProvider.generateResponse([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], { temperature: 0.3, maxTokens: 2000 });
            const result = this.extractJSON(response.content);
            return result.patterns || [];
        }
        catch (error) {
            console.warn('Architectural pattern analysis failed:', error);
            return [];
        }
    }
    async analyzeBusinessLogicAreas(codeChunks) {
        const systemPrompt = `You are a business analyst and software architect. Analyze the code to identify distinct business domains and logic areas.

Focus on:
1. Core business domains (User Management, Order Processing, Payment, etc.)
2. Business rule implementation and complexity
3. Domain boundaries and relationships
4. Critical business processes
5. Areas that change frequently due to business requirements`;
        const codeContext = this.buildCodeContext(codeChunks, 'business');
        const userPrompt = `Identify business logic areas in this codebase:

${codeContext}

Return business area analysis as JSON:
{
  "areas": [
    {
      "domain": "User Management",
      "files": [
        "services/UserService.js",
        "models/User.js", 
        "controllers/UserController.js"
      ],
      "complexity": 7,
      "testCoverage": 85,
      "changeFrequency": "medium",
      "businessCriticality": "critical"
    }
  ]
}`;
        try {
            const response = await this.llmProvider.generateResponse([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], { temperature: 0.3, maxTokens: 2000 });
            const result = this.extractJSON(response.content);
            return result.areas || [];
        }
        catch (error) {
            console.warn('Business logic analysis failed:', error);
            return [];
        }
    }
    async analyzeQualityHotspots(codeChunks) {
        const systemPrompt = `You are a code quality expert. Analyze the provided code to identify quality hotspots - areas with potential issues that need attention.

Look for:
1. High complexity functions/methods
2. Code smells and anti-patterns
3. Performance bottlenecks
4. Security vulnerabilities
5. Maintainability issues
6. Technical debt areas

Prioritize by business impact and effort to fix.`;
        const codeContext = this.buildCodeContext(codeChunks, 'quality');
        const userPrompt = `Identify quality hotspots in this code:

${codeContext}

Return quality analysis as JSON:
{
  "hotspots": [
    {
      "filePath": "services/UserService.js",
      "issues": [
        {
          "type": "high-complexity",
          "severity": "high",
          "description": "validateUser method has cyclomatic complexity of 15",
          "line": 45,
          "recommendation": "Break down into smaller validation methods"
        }
      ],
      "riskScore": 8.5,
      "effortToFix": "medium",
      "businessImpact": "high"
    }
  ]
}`;
        try {
            const response = await this.llmProvider.generateResponse([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], { temperature: 0.2, maxTokens: 2500 });
            const result = this.extractJSON(response.content);
            return result.hotspots || [];
        }
        catch (error) {
            console.warn('Quality hotspot analysis failed:', error);
            return [];
        }
    }
    async analyzeCrossCuttingConcerns(codeChunks) {
        const systemPrompt = `You are a software architect specializing in cross-cutting concerns. Analyze how the codebase handles concerns that span multiple modules.

Evaluate:
1. Logging - consistency, levels, structured logging
2. Error handling - patterns, consistency, propagation
3. Security - authentication, authorization, input validation
4. Caching - strategies, consistency, invalidation
5. Monitoring - metrics, health checks, observability
6. Validation - input validation, business rule validation

Assess implementation consistency and identify gaps.`;
        const codeContext = this.buildCodeContext(codeChunks, 'concerns');
        const userPrompt = `Analyze cross-cutting concerns in this codebase:

${codeContext}

Return concern analysis as JSON:
{
  "concerns": [
    {
      "concern": "error-handling",
      "implementation": "inconsistent",
      "locations": [
        "controllers/ - uses try/catch inconsistently",
        "services/ - some methods throw, others return null",
        "utils/ - no error handling in utility functions"
      ],
      "recommendations": [
        "Implement consistent error handling strategy",
        "Create custom error classes for different error types",
        "Add error boundary components for UI"
      ]
    }
  ]
}`;
        try {
            const response = await this.llmProvider.generateResponse([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], { temperature: 0.3, maxTokens: 2000 });
            const result = this.extractJSON(response.content);
            return result.concerns || [];
        }
        catch (error) {
            console.warn('Cross-cutting concern analysis failed:', error);
            return [];
        }
    }
    buildCodeContext(codeChunks, analysisType) {
        // Select most relevant chunks based on analysis type
        const relevantChunks = this.selectRelevantChunks(codeChunks, analysisType);
        const context = ['CODE ANALYSIS CONTEXT:', ''];
        relevantChunks.forEach((chunk, index) => {
            context.push(`FILE ${index + 1}: ${chunk.filePath}`);
            context.push(`TYPE: ${chunk.type} | LANGUAGE: ${chunk.language}`);
            if (chunk.metadata.name) {
                context.push(`NAME: ${chunk.metadata.name}`);
            }
            context.push('```' + chunk.language);
            // Include more context for better understanding
            context.push(chunk.content.length > 1000 ?
                chunk.content.substring(0, 800) + '\n... [truncated] ...' :
                chunk.content);
            context.push('```');
            context.push('');
        });
        return context.join('\n');
    }
    selectRelevantChunks(codeChunks, analysisType) {
        let chunks = [...codeChunks];
        switch (analysisType) {
            case 'flows':
                // Prioritize controllers, services, and main business logic
                chunks = chunks.filter(c => c.filePath.includes('controller') ||
                    c.filePath.includes('service') ||
                    c.filePath.includes('route') ||
                    c.type === 'function' ||
                    c.type === 'class');
                break;
            case 'dependencies':
                // Focus on imports, exports, and module boundaries
                chunks = chunks.filter(c => c.content.includes('import') ||
                    c.content.includes('require') ||
                    c.content.includes('export') ||
                    c.content.includes('module'));
                break;
            case 'architecture':
                // Look at overall structure and main components
                chunks = chunks.filter(c => c.type === 'class' ||
                    c.filePath.includes('index') ||
                    c.filePath.includes('main') ||
                    c.filePath.includes('app'));
                break;
            case 'business':
                // Focus on services and business logic
                chunks = chunks.filter(c => c.filePath.includes('service') ||
                    c.filePath.includes('model') ||
                    c.filePath.includes('business') ||
                    c.type === 'class');
                break;
            case 'quality':
                // Look at complex functions and classes
                chunks = chunks.filter(c => c.type === 'function' ||
                    c.type === 'class' ||
                    c.content.length > 500 // Larger chunks more likely to have issues
                );
                break;
            case 'concerns':
                // Look for patterns across all code
                chunks = chunks.filter(c => c.content.includes('try') ||
                    c.content.includes('catch') ||
                    c.content.includes('log') ||
                    c.content.includes('auth') ||
                    c.content.includes('valid'));
                break;
        }
        // Sort by relevance and limit to most important
        return chunks
            .sort((a, b) => b.content.length - a.content.length)
            .slice(0, 10);
    }
    extractJSON(content) {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return {};
        }
        catch {
            return {};
        }
    }
}
exports.SemanticCodeAnalyzer = SemanticCodeAnalyzer;
//# sourceMappingURL=SemanticCodeAnalyzer.js.map