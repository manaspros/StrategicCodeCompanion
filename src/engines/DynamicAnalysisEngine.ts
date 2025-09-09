import { LLMProvider } from '../llm/llmProvider';
import { CodebaseAnalysis, CodeChunk } from '../agents/main';
import { RefactoringResults } from '../agents/RefactorAgent';
import { ArchitectureResults } from '../agents/ArchitectAgent';

export interface DynamicCodeAnalysis {
    functionalityGaps: Array<{
        gap: string;
        priority: 'critical' | 'high' | 'medium' | 'low';
        description: string;
        businessImpact: string;
        technicalComplexity: 'simple' | 'moderate' | 'complex';
    }>;
    technologyProficiency: Array<{
        technology: string;
        currentLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
        missingConcepts: string[];
        learningPriority: 'high' | 'medium' | 'low';
        businessRelevance: string;
    }>;
    architecturalOpportunities: Array<{
        opportunity: string;
        currentState: string;
        desiredState: string;
        benefits: string[];
        implementationPath: string[];
        riskLevel: 'low' | 'medium' | 'high';
    }>;
    codePatterns: Array<{
        pattern: string;
        frequency: 'rare' | 'occasional' | 'common' | 'dominant';
        quality: 'poor' | 'acceptable' | 'good' | 'excellent';
        modernization: string;
        businessValue: string;
    }>;
    performanceInsights: Array<{
        area: string;
        currentState: string;
        optimizationOpportunity: string;
        potentialImpact: 'minor' | 'moderate' | 'significant' | 'transformative';
        implementationEffort: 'low' | 'medium' | 'high';
    }>;
}

export interface LibrarySearchStrategy {
    queries: Array<{
        searchTerms: string[];
        alternativeTerms: string[];
        excludeTerms: string[];
        priority: 'critical' | 'high' | 'medium' | 'low';
        rationale: string;
        expectedResults: string;
        searchStrategy: 'broad' | 'specific' | 'niche' | 'trending';
    }>;
    searchOptimization: {
        platforms: Array<'github' | 'npm' | 'awesome-lists' | 'stackshare' | 'libraries.io'>;
        filters: Array<{
            type: 'stars' | 'activity' | 'size' | 'license' | 'language';
            criteria: string;
        }>;
        rankingFactors: string[];
    };
}

export interface LearningPathStrategy {
    learningGoals: Array<{
        goal: string;
        currentSkillGap: string;
        targetSkillLevel: 'functional' | 'proficient' | 'expert' | 'thought-leader';
        businessJustification: string;
        urgency: 'immediate' | 'short-term' | 'medium-term' | 'long-term';
    }>;
    tutorialRequirements: Array<{
        topic: string;
        difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
        format: 'video' | 'article' | 'interactive' | 'project-based' | 'course';
        duration: 'quick' | 'moderate' | 'comprehensive' | 'deep-dive';
        prerequisites: string[];
        learningOutcomes: string[];
    }>;
    learningSequence: {
        immediateNext: string[];
        followUp: string[];
        advanced: string[];
        specializationPaths: string[];
    };
}

export class DynamicAnalysisEngine {
    private llmProvider: LLMProvider;

    constructor(llmProvider: LLMProvider) {
        this.llmProvider = llmProvider;
    }

    /**
     * Performs comprehensive LLM-driven code analysis with zero hardcoded logic
     */
    async analyzeCodebaseDynamically(
        analysis: CodebaseAnalysis,
        codeChunks: CodeChunk[],
        refactoring?: RefactoringResults,
        architecture?: ArchitectureResults
    ): Promise<DynamicCodeAnalysis> {
        const prompt = `You are a world-class software architect and technology strategist with deep expertise in code analysis, business strategy, and technology trends.

ANALYZE THIS CODEBASE COMPREHENSIVELY:

PROJECT OVERVIEW:
${JSON.stringify(analysis, null, 2)}

CODE STRUCTURE:
- Total files analyzed: ${codeChunks.length}
- File types: ${this.getFileTypes(codeChunks)}
- Code volume: ${this.getCodeVolumeMetrics(codeChunks)}

EXISTING ANALYSIS CONTEXT:
${refactoring ? `Refactoring opportunities identified: ${JSON.stringify(refactoring.summary, null, 2)}` : 'No refactoring analysis available'}
${architecture ? `Architecture suggestions available: ${JSON.stringify(architecture.summary, null, 2)}` : 'No architecture analysis available'}

SAMPLE CODE PATTERNS (first 3 files for context):
${codeChunks.slice(0, 3).map(chunk => `File: ${chunk.filePath}\nContent sample: ${chunk.content.substring(0, 300)}...`).join('\n\n')}

COMPREHENSIVE ANALYSIS REQUIRED:

Analyze this codebase to identify:

1. **Functionality Gaps**: What specific functionality is missing that would create business value?
2. **Technology Proficiency**: What is the developer's skill level with each technology, and what concepts are missing?
3. **Architectural Opportunities**: What architectural improvements would create competitive advantages?
4. **Code Patterns**: What patterns exist, their quality, and how they can be modernized?
5. **Performance Insights**: Where are the performance optimization opportunities?

CRITICAL: Base your analysis ENTIRELY on the actual code provided. Do not make assumptions about missing features unless you can see evidence in the code structure.

Return ONLY a JSON object in this exact format:
{
    "functionalityGaps": [
        {
            "gap": "specific functionality missing",
            "priority": "critical|high|medium|low",
            "description": "detailed explanation of why this matters",
            "businessImpact": "specific business value this would create",
            "technicalComplexity": "simple|moderate|complex"
        }
    ],
    "technologyProficiency": [
        {
            "technology": "specific technology from the stack",
            "currentLevel": "beginner|intermediate|advanced|expert",
            "missingConcepts": ["concept1", "concept2"],
            "learningPriority": "high|medium|low", 
            "businessRelevance": "why this skill matters for success"
        }
    ],
    "architecturalOpportunities": [
        {
            "opportunity": "specific architectural improvement",
            "currentState": "what exists now",
            "desiredState": "what it should become",
            "benefits": ["benefit1", "benefit2"],
            "implementationPath": ["step1", "step2"],
            "riskLevel": "low|medium|high"
        }
    ],
    "codePatterns": [
        {
            "pattern": "specific pattern observed",
            "frequency": "rare|occasional|common|dominant",
            "quality": "poor|acceptable|good|excellent", 
            "modernization": "how to modernize this pattern",
            "businessValue": "business value of improving this"
        }
    ],
    "performanceInsights": [
        {
            "area": "specific performance area",
            "currentState": "current performance characteristics",
            "optimizationOpportunity": "specific optimization approach",
            "potentialImpact": "minor|moderate|significant|transformative",
            "implementationEffort": "low|medium|high"
        }
    ]
}

Focus on actionable insights that create competitive advantages and business value.`;

        try {
            const response = await this.llmProvider.generateResponse([
                { role: 'system', content: 'You are an expert code analyst. Return only valid JSON with comprehensive analysis.' },
                { role: 'user', content: prompt }
            ], { temperature: 0.3, maxTokens: 2000 });

            return this.parseAnalysisResponse(response.content || '');
        } catch (error) {
            console.warn('DynamicAnalysisEngine: LLM analysis failed:', error);
            return this.generateMinimalAnalysis(analysis);
        }
    }

    /**
     * Generates intelligent library search strategies with zero hardcoded queries
     */
    async generateLibrarySearchStrategy(
        analysis: CodebaseAnalysis,
        codeChunks: CodeChunk[],
        dynamicAnalysis: DynamicCodeAnalysis
    ): Promise<LibrarySearchStrategy> {
        const prompt = `You are a library and tool curation expert with deep knowledge of software ecosystems across all platforms.

PROJECT CONTEXT:
- Project type: ${analysis.project_type}
- Technologies: ${analysis.key_technologies.join(', ')}
- Complexity: ${analysis.complexity_score}/10

FUNCTIONALITY GAPS IDENTIFIED:
${JSON.stringify(dynamicAnalysis.functionalityGaps, null, 2)}

ARCHITECTURAL OPPORTUNITIES:
${JSON.stringify(dynamicAnalysis.architecturalOpportunities, null, 2)}

PERFORMANCE INSIGHTS:
${JSON.stringify(dynamicAnalysis.performanceInsights, null, 2)}

TASK: Generate optimal library search strategies that would fill the identified gaps and create competitive advantages.

Consider:
1. What specific libraries would address the functionality gaps?
2. What search terms would find the most relevant, high-quality libraries?
3. What alternative search approaches would uncover hidden gems?
4. What platforms beyond GitHub should be searched?
5. How should results be filtered and ranked for maximum relevance?

Return ONLY a JSON object in this exact format:
{
    "queries": [
        {
            "searchTerms": ["primary", "search", "terms"],
            "alternativeTerms": ["backup", "alternative", "terms"],
            "excludeTerms": ["terms", "to", "exclude"],
            "priority": "critical|high|medium|low",
            "rationale": "why this search is important for this project",
            "expectedResults": "what kind of libraries this should find",
            "searchStrategy": "broad|specific|niche|trending"
        }
    ],
    "searchOptimization": {
        "platforms": ["github", "npm", "awesome-lists"],
        "filters": [
            {
                "type": "stars|activity|size|license|language",
                "criteria": "specific filter criteria"
            }
        ],
        "rankingFactors": ["factor1", "factor2", "factor3"]
    }
}

Focus on search strategies that will find libraries creating unique competitive advantages.`;

        try {
            const response = await this.llmProvider.generateResponse([
                { role: 'system', content: 'You are a library curation expert. Return only valid JSON with intelligent search strategies.' },
                { role: 'user', content: prompt }
            ], { temperature: 0.4, maxTokens: 1500 });

            return this.parseSearchStrategyResponse(response.content || '');
        } catch (error) {
            console.warn('DynamicAnalysisEngine: Search strategy generation failed:', error);
            return this.generateBasicSearchStrategy(analysis);
        }
    }

    /**
     * Generates personalized learning paths with zero hardcoded content
     */
    async generateLearningPathStrategy(
        analysis: CodebaseAnalysis,
        codeChunks: CodeChunk[],
        dynamicAnalysis: DynamicCodeAnalysis
    ): Promise<LearningPathStrategy> {
        const prompt = `You are an expert programming educator and career strategist with deep knowledge of skill development and market demands.

DEVELOPER SKILL ANALYSIS:
${JSON.stringify(dynamicAnalysis.technologyProficiency, null, 2)}

CODE PATTERN ANALYSIS:
${JSON.stringify(dynamicAnalysis.codePatterns, null, 2)}

PROJECT CONTEXT:
- Project type: ${analysis.project_type}
- Complexity level: ${analysis.complexity_score}/10
- Code quality metrics: ${JSON.stringify(analysis.code_quality_metrics)}

TASK: Create a personalized learning strategy that will:
1. Address the specific skill gaps identified in this developer's code
2. Focus on skills that create competitive advantages in the job market
3. Prioritize learning that has immediate business impact on this project
4. Provide a logical learning sequence from current skill level to expertise

Consider:
- What are the most critical skill gaps that limit this developer's effectiveness?
- What advanced concepts would make this developer stand out from others?
- What learning sequence makes the most pedagogical sense?
- What tutorial formats would be most effective for each skill level?

Return ONLY a JSON object in this exact format:
{
    "learningGoals": [
        {
            "goal": "specific learning objective",
            "currentSkillGap": "what's missing now",
            "targetSkillLevel": "functional|proficient|expert|thought-leader",
            "businessJustification": "why this matters for career/project success",
            "urgency": "immediate|short-term|medium-term|long-term"
        }
    ],
    "tutorialRequirements": [
        {
            "topic": "specific topic to learn",
            "difficulty": "beginner|intermediate|advanced|expert",
            "format": "video|article|interactive|project-based|course",
            "duration": "quick|moderate|comprehensive|deep-dive",
            "prerequisites": ["prerequisite1", "prerequisite2"],
            "learningOutcomes": ["outcome1", "outcome2"]
        }
    ],
    "learningSequence": {
        "immediateNext": ["skill1", "skill2"],
        "followUp": ["skill3", "skill4"], 
        "advanced": ["skill5", "skill6"],
        "specializationPaths": ["path1", "path2"]
    }
}

Focus on learning that creates unique competitive advantages and career differentiation.`;

        try {
            const response = await this.llmProvider.generateResponse([
                { role: 'system', content: 'You are an expert programming educator. Return only valid JSON with personalized learning strategies.' },
                { role: 'user', content: prompt }
            ], { temperature: 0.4, maxTokens: 1500 });

            return this.parseLearningStrategyResponse(response.content || '');
        } catch (error) {
            console.warn('DynamicAnalysisEngine: Learning strategy generation failed:', error);
            return this.generateBasicLearningStrategy(analysis);
        }
    }

    // Helper methods
    private getFileTypes(codeChunks: CodeChunk[]): string {
        const types = new Set(codeChunks.map(chunk => chunk.filePath.split('.').pop()));
        return Array.from(types).join(', ');
    }

    private getCodeVolumeMetrics(codeChunks: CodeChunk[]): string {
        const totalLines = codeChunks.reduce((sum, chunk) => sum + chunk.content.split('\n').length, 0);
        const avgSize = Math.round(totalLines / codeChunks.length);
        return `${totalLines} total lines, ${avgSize} avg lines per file`;
    }

    private parseAnalysisResponse(response: string): DynamicCodeAnalysis {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON found in response');
            
            const analysis = JSON.parse(jsonMatch[0]);
            
            // Validate structure
            if (!analysis.functionalityGaps || !analysis.technologyProficiency || 
                !analysis.architecturalOpportunities || !analysis.codePatterns || 
                !analysis.performanceInsights) {
                throw new Error('Invalid analysis structure');
            }
            
            return analysis;
        } catch (error) {
            console.warn('Failed to parse analysis response:', error);
            throw error;
        }
    }

    private parseSearchStrategyResponse(response: string): LibrarySearchStrategy {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON found in response');
            
            const strategy = JSON.parse(jsonMatch[0]);
            
            if (!strategy.queries || !strategy.searchOptimization) {
                throw new Error('Invalid search strategy structure');
            }
            
            return strategy;
        } catch (error) {
            console.warn('Failed to parse search strategy response:', error);
            throw error;
        }
    }

    private parseLearningStrategyResponse(response: string): LearningPathStrategy {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON found in response');
            
            const strategy = JSON.parse(jsonMatch[0]);
            
            if (!strategy.learningGoals || !strategy.tutorialRequirements || !strategy.learningSequence) {
                throw new Error('Invalid learning strategy structure');
            }
            
            return strategy;
        } catch (error) {
            console.warn('Failed to parse learning strategy response:', error);
            throw error;
        }
    }

    // Minimal fallback methods
    private generateMinimalAnalysis(analysis: CodebaseAnalysis): DynamicCodeAnalysis {
        return {
            functionalityGaps: [{
                gap: 'Comprehensive analysis requires LLM access',
                priority: 'medium',
                description: 'Unable to perform deep analysis without LLM access',
                businessImpact: 'Limited insight into improvement opportunities',
                technicalComplexity: 'moderate'
            }],
            technologyProficiency: analysis.key_technologies.map(tech => ({
                technology: tech,
                currentLevel: 'intermediate',
                missingConcepts: ['Advanced patterns'],
                learningPriority: 'medium',
                businessRelevance: 'Important for career growth'
            })),
            architecturalOpportunities: [{
                opportunity: 'Code structure improvements',
                currentState: 'Current architecture analysis limited',
                desiredState: 'Comprehensive architectural insights',
                benefits: ['Better maintainability'],
                implementationPath: ['Enable LLM analysis'],
                riskLevel: 'low'
            }],
            codePatterns: [{
                pattern: 'Basic patterns detected',
                frequency: 'common',
                quality: 'acceptable',
                modernization: 'Requires detailed analysis',
                businessValue: 'Moderate'
            }],
            performanceInsights: [{
                area: 'General performance',
                currentState: 'Analysis limited without LLM',
                optimizationOpportunity: 'Enable comprehensive analysis',
                potentialImpact: 'moderate',
                implementationEffort: 'low'
            }]
        };
    }

    private generateBasicSearchStrategy(analysis: CodebaseAnalysis): LibrarySearchStrategy {
        const mainTech = analysis.key_technologies[0] || 'javascript';
        
        return {
            queries: [{
                searchTerms: [mainTech.toLowerCase(), 'library'],
                alternativeTerms: [mainTech.toLowerCase(), 'tool'],
                excludeTerms: ['deprecated'],
                priority: 'medium',
                rationale: 'Basic technology-focused search',
                expectedResults: 'General purpose libraries',
                searchStrategy: 'broad'
            }],
            searchOptimization: {
                platforms: ['github', 'npm'],
                filters: [{
                    type: 'stars',
                    criteria: '>1000'
                }],
                rankingFactors: ['popularity', 'recent activity', 'documentation quality']
            }
        };
    }

    private generateBasicLearningStrategy(analysis: CodebaseAnalysis): LearningPathStrategy {
        return {
            learningGoals: [{
                goal: 'Improve overall code quality',
                currentSkillGap: 'Analysis requires LLM access',
                targetSkillLevel: 'proficient',
                businessJustification: 'Better code quality improves maintainability',
                urgency: 'medium-term'
            }],
            tutorialRequirements: [{
                topic: 'Best practices',
                difficulty: 'intermediate',
                format: 'video',
                duration: 'moderate',
                prerequisites: ['Basic programming knowledge'],
                learningOutcomes: ['Improved code quality']
            }],
            learningSequence: {
                immediateNext: ['Code quality fundamentals'],
                followUp: ['Advanced patterns'],
                advanced: ['Architecture design'],
                specializationPaths: ['Technology-specific expertise']
            }
        };
    }
}