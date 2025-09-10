"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TutorAgent = void 0;
const DynamicAnalysisEngine_1 = require("../engines/DynamicAnalysisEngine");
const YouTubeSearchService_1 = require("../services/YouTubeSearchService");
class TutorAgent {
    constructor(llmProvider) {
        this.llmProvider = llmProvider;
        this.dynamicAnalysisEngine = llmProvider ? new DynamicAnalysisEngine_1.DynamicAnalysisEngine(llmProvider) : undefined;
    }
    async findTutorials(analysis, codeChunks, refactoring, architecture) {
        try {
            if (!this.dynamicAnalysisEngine) {
                console.warn('TutorAgent: No dynamic analysis engine available');
                return this.getFallbackTutorialResults(analysis, codeChunks);
            }
            // Step 1: Perform dynamic analysis of the codebase and skill gaps
            console.log('TutorAgent: Performing dynamic codebase analysis...');
            const dynamicAnalysis = await this.dynamicAnalysisEngine.analyzeCodebaseDynamically(analysis, codeChunks, refactoring, architecture);
            // Step 2: Generate intelligent learning path strategy based on analysis
            console.log('TutorAgent: Generating intelligent learning path strategy...');
            const learningStrategy = await this.dynamicAnalysisEngine.generateLearningPathStrategy(analysis, codeChunks, dynamicAnalysis);
            // Step 3: Create tutorial recommendations based on learning strategy
            const intelligentTutorials = this.createTutorialsFromStrategy(learningStrategy, dynamicAnalysis, analysis);
            console.log(`TutorAgent: Generated ${intelligentTutorials.length} intelligent tutorial recommendations`);
            return {
                tutorials: intelligentTutorials,
                summary: this.generateSummary(intelligentTutorials)
            };
        }
        catch (error) {
            console.error('Failed to find tutorials:', error);
            return this.getFallbackTutorialResults(analysis, codeChunks);
        }
    }
    createTutorialsFromStrategy(learningStrategy, dynamicAnalysis, analysis) {
        const tutorials = [];
        const searchTopics = [];
        // Collect all relevant topics from learning strategy
        if (learningStrategy.tutorialRequirements) {
            learningStrategy.tutorialRequirements.forEach((requirement) => {
                searchTopics.push(requirement.topic);
                // Add prerequisites as additional search terms
                if (requirement.prerequisites && requirement.prerequisites.length > 0) {
                    searchTopics.push(...requirement.prerequisites.slice(0, 2));
                }
            });
        }
        // Add immediate next steps to search topics
        if (learningStrategy.learningSequence && learningStrategy.learningSequence.immediateNext) {
            searchTopics.push(...learningStrategy.learningSequence.immediateNext);
        }
        // Use YouTubeSearchService to get real tutorials
        if (searchTopics.length > 0) {
            console.log('TutorAgent: Searching for real YouTube tutorials for topics:', searchTopics);
            const realTutorials = YouTubeSearchService_1.YouTubeSearchService.searchTutorials(searchTopics, 'intermediate', 6);
            tutorials.push(...realTutorials);
        }
        // If we still need more tutorials, get curated high-quality ones
        if (tutorials.length < 4) {
            const additionalTopics = [
                ...analysis.key_technologies.map(tech => tech.toLowerCase()),
                'best practices',
                'clean code',
                'performance optimization'
            ];
            const curatedTutorials = YouTubeSearchService_1.YouTubeSearchService.getCuratedTutorialsForTopics(additionalTopics);
            // Add tutorials that aren't already included
            curatedTutorials.forEach(tutorial => {
                if (!tutorials.find(t => t.id === tutorial.id) && tutorials.length < 8) {
                    tutorials.push(tutorial);
                }
            });
        }
        // Update relevance scores based on learning strategy context
        tutorials.forEach(tutorial => {
            if (learningStrategy.learningGoals) {
                const relatedGoal = learningStrategy.learningGoals.find((goal) => goal.goal.toLowerCase().includes(tutorial.topics[0]) ||
                    tutorial.title.toLowerCase().includes(goal.goal.toLowerCase().split(' ')[0]));
                if (relatedGoal) {
                    // Boost relevance for urgent or high-priority goals
                    if (relatedGoal.urgency === 'immediate') {
                        tutorial.relevanceScore = Math.min(0.95, tutorial.relevanceScore + 0.1);
                    }
                    // Set relation based on goal context
                    tutorial.relatedTo = this.mapTopicToRelation(tutorial.topics[0], analysis);
                }
            }
        });
        console.log(`TutorAgent: Generated ${tutorials.length} real YouTube tutorials with working URLs and thumbnails`);
        return tutorials.slice(0, 8); // Return top 8 most relevant tutorials
    }
    // All placeholder generation methods have been removed.
    // Real YouTube tutorial data is now provided by YouTubeSearchService.
    mapTopicToRelation(topic, analysis) {
        if (topic.toLowerCase().includes('refactor') || topic.toLowerCase().includes('clean') || topic.toLowerCase().includes('quality')) {
            return 'refactoring';
        }
        else if (topic.toLowerCase().includes('architecture') || topic.toLowerCase().includes('design') || topic.toLowerCase().includes('pattern')) {
            return 'architecture';
        }
        else {
            return 'general';
        }
    }
    getFallbackTutorialResults(analysis, codeChunks) {
        console.error('TutorAgent: Dynamic analysis unavailable, cannot generate tutorials');
        return {
            tutorials: [],
            summary: {
                totalTutorials: 0,
                byDifficulty: {},
                byPlatform: {},
                averageRelevance: 0
            }
        };
    }
    generateSummary(tutorials) {
        const byDifficulty = {};
        const byPlatform = {};
        let totalRelevance = 0;
        tutorials.forEach(tutorial => {
            byDifficulty[tutorial.difficulty] = (byDifficulty[tutorial.difficulty] || 0) + 1;
            byPlatform[tutorial.platform] = (byPlatform[tutorial.platform] || 0) + 1;
            totalRelevance += tutorial.relevanceScore;
        });
        return {
            totalTutorials: tutorials.length,
            byDifficulty,
            byPlatform,
            averageRelevance: tutorials.length > 0 ? Math.round((totalRelevance / tutorials.length) * 100) / 100 : 0
        };
    }
}
exports.TutorAgent = TutorAgent;
TutorAgent.YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
//# sourceMappingURL=TutorAgent.js.map