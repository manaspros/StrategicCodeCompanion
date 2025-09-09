"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTMLReportGenerator = void 0;
class HTMLReportGenerator {
    async generate(results, options) {
        const styles = this.generateCSS();
        const header = this.generateHeader(results);
        const body = await this.generateBody(results, options);
        const scripts = this.generateScripts();
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Strategic Code Companion - Analysis Report</title>
    ${styles}
</head>
<body>
    ${header}
    ${body}
    ${scripts}
</body>
</html>`;
    }
    generateCSS() {
        return `<style>
        :root {
            --primary-color: #667eea;
            --secondary-color: #764ba2;
            --accent-color: #f093fb;
            --success-color: #4facfe;
            --warning-color: #ff9a9e;
            --error-color: #ff6b6b;
            --text-primary: #2d3748;
            --text-secondary: #4a5568;
            --bg-primary: #ffffff;
            --bg-secondary: #f7fafc;
            --border-color: #e2e8f0;
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            line-height: 1.6;
            color: var(--text-primary);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .report-header {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 40px;
            margin-bottom: 30px;
            box-shadow: var(--shadow-lg);
            text-align: center;
        }

        .report-title {
            font-size: 2.5rem;
            font-weight: 800;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 10px;
        }

        .report-subtitle {
            color: var(--text-secondary);
            font-size: 1.1rem;
            margin-bottom: 20px;
        }

        .report-meta {
            display: flex;
            justify-content: center;
            gap: 30px;
            flex-wrap: wrap;
        }

        .meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
        }

        .content-grid {
            display: grid;
            gap: 30px;
        }

        .section {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 30px;
            box-shadow: var(--shadow);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .section-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid var(--border-color);
        }

        .section-icon {
            font-size: 2rem;
            background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .section-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary);
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }

        .metric-card {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            border: 1px solid var(--border-color);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .metric-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }

        .metric-label {
            font-size: 0.9rem;
            color: var(--text-secondary);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }

        .metric-value {
            font-size: 2.5rem;
            font-weight: 800;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .metric-status {
            margin-top: 8px;
            font-size: 0.9rem;
            font-weight: 600;
        }

        .status-excellent { color: #10b981; }
        .status-good { color: #f59e0b; }
        .status-needs-improvement { color: #ef4444; }

        .tech-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 15px 0;
        }

        .tech-tag {
            background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            box-shadow: var(--shadow);
        }

        .recommendations-grid {
            display: grid;
            gap: 20px;
        }

        .recommendation-card {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 12px;
            padding: 25px;
            border-left: 4px solid var(--primary-color);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .recommendation-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }

        .recommendation-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
        }

        .recommendation-title {
            font-size: 1.2rem;
            font-weight: 700;
            color: var(--text-primary);
        }

        .priority-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .priority-high { background: #fecaca; color: #dc2626; }
        .priority-medium { background: #fed7aa; color: #ea580c; }
        .priority-low { background: #bbf7d0; color: #16a34a; }

        .code-block {
            background: #1f2937;
            color: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 15px 0;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9rem;
            line-height: 1.5;
        }

        .code-before-after {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }

        @media (max-width: 768px) {
            .code-before-after {
                grid-template-columns: 1fr;
            }
        }

        .library-card {
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border-radius: 12px;
            padding: 25px;
            border: 1px solid var(--border-color);
            margin-bottom: 20px;
        }

        .library-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
        }

        .library-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
            gap: 15px;
            margin: 20px 0;
            padding: 15px;
            background: rgba(102, 126, 234, 0.05);
            border-radius: 8px;
        }

        .stat-item {
            text-align: center;
        }

        .stat-icon {
            font-size: 1.2rem;
            margin-bottom: 4px;
        }

        .stat-value {
            font-weight: 700;
            font-size: 1rem;
            color: var(--text-primary);
        }

        .stat-label {
            font-size: 0.75rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .tutorial-card {
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border-radius: 12px;
            padding: 20px;
            border: 1px solid var(--border-color);
            margin-bottom: 15px;
        }

        .tutorial-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 10px 0;
            font-size: 0.9rem;
            color: var(--text-secondary);
        }

        .difficulty-badge {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
        }

        .difficulty-beginner { background: #bbf7d0; color: #166534; }
        .difficulty-intermediate { background: #fed7aa; color: #9a3412; }
        .difficulty-advanced { background: #fecaca; color: #991b1b; }

        .rating-stars {
            color: #f59e0b;
        }

        .strategic-insights {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 16px;
            padding: 30px;
            margin-top: 30px;
        }

        .strategic-insights .section-title {
            color: white;
        }

        .business-impact-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }

        .impact-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .impact-bar {
            background: rgba(255, 255, 255, 0.2);
            height: 8px;
            border-radius: 4px;
            margin: 10px 0;
            overflow: hidden;
        }

        .impact-fill {
            background: linear-gradient(90deg, #4facfe, #00f2fe);
            height: 100%;
            border-radius: 4px;
            transition: width 0.5s ease;
        }

        .footer {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 30px;
            margin-top: 30px;
            text-align: center;
            color: var(--text-secondary);
        }

        .navbar {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            position: sticky;
            top: 0;
            z-index: 100;
            border-radius: 12px;
            margin: 20px 0;
            padding: 15px 20px;
        }

        .navbar-nav {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
        }

        .nav-link {
            color: var(--text-primary);
            text-decoration: none;
            font-weight: 600;
            padding: 8px 16px;
            border-radius: 8px;
            transition: background 0.2s ease;
        }

        .nav-link:hover {
            background: var(--bg-secondary);
        }

        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .report-header {
                padding: 20px;
            }
            
            .report-title {
                font-size: 2rem;
            }
            
            .section {
                padding: 20px;
            }
            
            .metrics-grid {
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            }
        }
        </style>`;
    }
    generateHeader(results) {
        const date = new Date().toLocaleString();
        return `
        <div class="container">
            <div class="report-header">
                <div class="report-title">🤖 Strategic Code Companion</div>
                <div class="report-subtitle">AI-Powered Code Analysis Report</div>
                <div class="report-meta">
                    <div class="meta-item">
                        <span>📅</span>
                        <span>Generated: ${date}</span>
                    </div>
                    <div class="meta-item">
                        <span>🎯</span>
                        <span>Project Type: ${results.analysis.project_type}</span>
                    </div>
                    <div class="meta-item">
                        <span>⚡</span>
                        <span>Complexity: ${results.analysis.complexity_score}/10</span>
                    </div>
                </div>
            </div>

            <div class="navbar">
                <nav class="navbar-nav">
                    <a href="#executive-summary" class="nav-link">📊 Executive Summary</a>
                    <a href="#metrics" class="nav-link">📈 Metrics</a>
                    <a href="#refactoring" class="nav-link">🔧 Refactoring</a>
                    <a href="#architecture" class="nav-link">🏗️ Architecture</a>
                    <a href="#libraries" class="nav-link">📚 Libraries</a>
                    <a href="#tutorials" class="nav-link">🎓 Learning</a>
                    ${results.enhanced ? '<a href="#strategic" class="nav-link">🚀 Strategic</a>' : ''}
                </nav>
            </div>`;
    }
    async generateBody(results, options) {
        const sections = [];
        if (options.includeExecutiveSummary) {
            sections.push(this.generateExecutiveSummary(results));
        }
        if (options.includeMetrics) {
            sections.push(this.generateMetricsDashboard(results));
        }
        if (options.includeRecommendations) {
            sections.push(this.generateRefactoringSection(results));
            sections.push(this.generateArchitectureSection(results));
            sections.push(this.generateLibrariesSection(results));
            sections.push(this.generateTutorialsSection(results));
        }
        if (results.enhanced) {
            sections.push(this.generateStrategicInsights(results));
        }
        sections.push(this.generateFooter());
        return `<div class="content-grid">${sections.join('')}</div></div>`;
    }
    generateExecutiveSummary(results) {
        const quality = results.analysis.code_quality_metrics;
        return `
        <div id="executive-summary" class="section">
            <div class="section-header">
                <span class="section-icon">📊</span>
                <h2 class="section-title">Executive Summary</h2>
            </div>
            
            <div class="summary-content">
                <h3>Project Overview</h3>
                <p>${results.analysis.overall_summary}</p>
                
                <h3>Key Technologies</h3>
                <div class="tech-tags">
                    ${results.analysis.key_technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
                </div>
                
                <h3>Architecture Patterns</h3>
                <div class="tech-tags">
                    ${results.analysis.architectural_patterns.map(pattern => `<span class="tech-tag">${pattern}</span>`).join('')}
                </div>
                
                <h3>Priority Areas for Improvement</h3>
                <ul>
                    ${results.analysis.potential_areas_for_refactoring.map(area => `<li>${area}</li>`).join('')}
                </ul>
            </div>
        </div>`;
    }
    generateMetricsDashboard(results) {
        const metrics = results.analysis.code_quality_metrics;
        const complexity = results.analysis.complexity_score;
        const getStatusClass = (score) => {
            if (score >= 8)
                return 'status-excellent';
            if (score >= 6)
                return 'status-good';
            return 'status-needs-improvement';
        };
        const getStatusText = (score) => {
            if (score >= 8)
                return '✅ Excellent';
            if (score >= 6)
                return '⚠️ Good';
            return '❌ Needs Improvement';
        };
        return `
        <div id="metrics" class="section">
            <div class="section-header">
                <span class="section-icon">📈</span>
                <h2 class="section-title">Quality Metrics Dashboard</h2>
            </div>
            
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">Maintainability</div>
                    <div class="metric-value">${metrics.maintainability}<span style="font-size: 1rem;">/10</span></div>
                    <div class="metric-status ${getStatusClass(metrics.maintainability)}">${getStatusText(metrics.maintainability)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Readability</div>
                    <div class="metric-value">${metrics.readability}<span style="font-size: 1rem;">/10</span></div>
                    <div class="metric-status ${getStatusClass(metrics.readability)}">${getStatusText(metrics.readability)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Testability</div>
                    <div class="metric-value">${metrics.testability}<span style="font-size: 1rem;">/10</span></div>
                    <div class="metric-status ${getStatusClass(metrics.testability)}">${getStatusText(metrics.testability)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Complexity</div>
                    <div class="metric-value">${complexity}<span style="font-size: 1rem;">/10</span></div>
                    <div class="metric-status ${getStatusClass(10 - complexity)}">${this.getComplexityText(complexity)}</div>
                </div>
            </div>
        </div>`;
    }
    generateRefactoringSection(results) {
        if (!results.refactoring?.suggestions || results.refactoring.suggestions.length === 0) {
            return `
            <div id="refactoring" class="section">
                <div class="section-header">
                    <span class="section-icon">🔧</span>
                    <h2 class="section-title">Refactoring Recommendations</h2>
                </div>
                <p>No specific refactoring suggestions generated.</p>
            </div>`;
        }
        const suggestions = results.refactoring.suggestions.map((suggestion) => `
            <div class="recommendation-card">
                <div class="recommendation-header">
                    <h3 class="recommendation-title">${suggestion.title}</h3>
                    <span class="priority-badge priority-${suggestion.priority}">${suggestion.priority}</span>
                </div>
                <p>${suggestion.description}</p>
                
                <div class="code-before-after">
                    <div>
                        <h4>❌ Before:</h4>
                        <div class="code-block">${this.escapeHtml(suggestion.beforeCode)}</div>
                    </div>
                    <div>
                        <h4>✅ After:</h4>
                        <div class="code-block">${this.escapeHtml(suggestion.afterCode)}</div>
                    </div>
                </div>
                
                <div>
                    <strong>Category:</strong> ${suggestion.category} |
                    <strong>Effort:</strong> ${suggestion.estimatedEffort}
                </div>
                
                <div style="margin-top: 15px;">
                    <strong>Benefits:</strong>
                    <ul>
                        ${suggestion.benefits.map((benefit) => `<li>${benefit}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `).join('');
        return `
        <div id="refactoring" class="section">
            <div class="section-header">
                <span class="section-icon">🔧</span>
                <h2 class="section-title">Refactoring Recommendations</h2>
            </div>
            <div class="recommendations-grid">
                ${suggestions}
            </div>
        </div>`;
    }
    generateArchitectureSection(results) {
        if (!results.architecture?.features || results.architecture.features.length === 0) {
            return `
            <div id="architecture" class="section">
                <div class="section-header">
                    <span class="section-icon">🏗️</span>
                    <h2 class="section-title">Architecture Suggestions</h2>
                </div>
                <p>No specific architecture suggestions generated.</p>
            </div>`;
        }
        const features = results.architecture.features.map((feature) => `
            <div class="recommendation-card">
                <div class="recommendation-header">
                    <h3 class="recommendation-title">${feature.title}</h3>
                    <span class="priority-badge priority-${feature.priority}">${feature.priority}</span>
                </div>
                <p>${feature.description}</p>
                
                <div style="margin: 15px 0;">
                    <strong>Complexity:</strong> ${feature.complexity} |
                    <strong>Estimated Time:</strong> ${feature.estimatedTimeWeeks} weeks
                </div>
                
                <div>
                    <h4>Technologies Required:</h4>
                    <div class="tech-tags">
                        ${feature.implementationOverview.technologies.map((tech) => `<span class="tech-tag">${tech}</span>`).join('')}
                    </div>
                </div>
                
                <div>
                    <h4>Benefits:</h4>
                    <ul>
                        ${feature.benefits.map((benefit) => `<li>${benefit}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `).join('');
        return `
        <div id="architecture" class="section">
            <div class="section-header">
                <span class="section-icon">🏗️</span>
                <h2 class="section-title">Architecture Suggestions</h2>
            </div>
            <div class="recommendations-grid">
                ${features}
            </div>
        </div>`;
    }
    generateLibrariesSection(results) {
        if (!results.libraries?.recommendations || results.libraries.recommendations.length === 0) {
            return `
            <div id="libraries" class="section">
                <div class="section-header">
                    <span class="section-icon">📚</span>
                    <h2 class="section-title">Library Recommendations</h2>
                </div>
                <p>No specific library recommendations generated.</p>
            </div>`;
        }
        const libraries = results.libraries.recommendations.map((lib) => `
            <div class="library-card">
                <div class="library-header">
                    <div>
                        <h3>${lib.name}</h3>
                        <p><strong>${lib.category}</strong> | ${lib.language} | ${Math.round(lib.relevanceScore * 100)}% match</p>
                    </div>
                </div>
                
                <p>${lib.description}</p>
                
                <div class="library-stats">
                    <div class="stat-item">
                        <div class="stat-icon">⭐</div>
                        <div class="stat-value">${lib.stars.toLocaleString()}</div>
                        <div class="stat-label">stars</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon">🍴</div>
                        <div class="stat-value">${lib.forks.toLocaleString()}</div>
                        <div class="stat-label">forks</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon">📅</div>
                        <div class="stat-value">${new Date(lib.lastUpdated).toLocaleDateString()}</div>
                        <div class="stat-label">updated</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon">⚡</div>
                        <div class="stat-value">${lib.integrationEffort}</div>
                        <div class="stat-label">effort</div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                    <div>
                        <h4>💡 Key Benefits:</h4>
                        <ul>
                            ${lib.benefits.slice(0, 3).map((benefit) => `<li>${benefit}</li>`).join('')}
                        </ul>
                    </div>
                    <div>
                        <h4>🎯 Use Cases:</h4>
                        <ul>
                            ${lib.useCases.slice(0, 3).map((useCase) => `<li>${useCase}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                
                <div style="margin-top: 20px;">
                    <a href="${lib.githubUrl}" target="_blank" class="tech-tag" style="text-decoration: none;">📱 GitHub</a>
                    ${lib.npmUrl ? `<a href="${lib.npmUrl}" target="_blank" class="tech-tag" style="text-decoration: none;">📦 NPM</a>` : ''}
                </div>
            </div>
        `).join('');
        return `
        <div id="libraries" class="section">
            <div class="section-header">
                <span class="section-icon">📚</span>
                <h2 class="section-title">Library Recommendations</h2>
            </div>
            ${libraries}
        </div>`;
    }
    generateTutorialsSection(results) {
        if (!results.tutorials?.tutorials || results.tutorials.tutorials.length === 0) {
            return `
            <div id="tutorials" class="section">
                <div class="section-header">
                    <span class="section-icon">🎓</span>
                    <h2 class="section-title">Learning Resources</h2>
                </div>
                <p>No specific tutorials found.</p>
            </div>`;
        }
        const tutorials = results.tutorials.tutorials.map((tutorial) => {
            const stars = '★'.repeat(Math.floor(tutorial.rating)) + '☆'.repeat(5 - Math.floor(tutorial.rating));
            return `
            <div class="tutorial-card">
                <h3>${tutorial.title}</h3>
                <p>${tutorial.description}</p>
                
                <div class="tutorial-meta">
                    <span>👤 ${tutorial.author} | 📺 ${tutorial.platform}</span>
                    <span class="difficulty-badge difficulty-${tutorial.difficulty}">${tutorial.difficulty}</span>
                </div>
                
                <div class="tutorial-meta">
                    <span>⏱️ ${tutorial.duration}</span>
                    <span class="rating-stars">${stars} (${tutorial.rating.toFixed(1)})</span>
                    <span>👥 ${tutorial.views.toLocaleString()} views</span>
                </div>
                
                <div class="tech-tags" style="margin: 10px 0;">
                    ${tutorial.topics.map((topic) => `<span class="tech-tag">${topic}</span>`).join('')}
                </div>
                
                <div style="margin-top: 15px;">
                    <a href="${tutorial.url}" target="_blank" class="tech-tag" style="text-decoration: none;">🔗 Watch Tutorial</a>
                </div>
            </div>
        `;
        }).join('');
        return `
        <div id="tutorials" class="section">
            <div class="section-header">
                <span class="section-icon">🎓</span>
                <h2 class="section-title">Learning Resources</h2>
            </div>
            ${tutorials}
        </div>`;
    }
    generateStrategicInsights(results) {
        if (!results.enhanced)
            return '';
        return `
        <div id="strategic" class="strategic-insights">
            <div class="section-header">
                <span class="section-icon">🚀</span>
                <h2 class="section-title">Strategic Insights</h2>
            </div>
            
            ${results.enhanced.uniqueRecommendations ? this.generateUniqueRecommendations(results.enhanced.uniqueRecommendations) : ''}
            ${results.enhanced.competitiveAnalysis ? this.generateCompetitiveAnalysis(results.enhanced.competitiveAnalysis) : ''}
            ${results.enhanced.businessStrategy ? this.generateBusinessStrategy(results.enhanced.businessStrategy) : ''}
        </div>`;
    }
    generateUniqueRecommendations(recommendations) {
        const cards = recommendations.map(rec => `
            <div class="impact-card">
                <h3>${rec.title}</h3>
                <p>${rec.description}</p>
                
                <div class="business-impact-grid" style="margin: 15px 0;">
                    <div>
                        <strong>User Experience</strong>
                        <div class="impact-bar">
                            <div class="impact-fill" style="width: ${rec.businessImpact.userExperience * 10}%"></div>
                        </div>
                        <span>${rec.businessImpact.userExperience}/10</span>
                    </div>
                    <div>
                        <strong>Market Differentiation</strong>
                        <div class="impact-bar">
                            <div class="impact-fill" style="width: ${rec.businessImpact.marketDifferentiation * 10}%"></div>
                        </div>
                        <span>${rec.businessImpact.marketDifferentiation}/10</span>
                    </div>
                    <div>
                        <strong>Business Value</strong>
                        <div class="impact-bar">
                            <div class="impact-fill" style="width: ${rec.businessImpact.businessValue * 10}%"></div>
                        </div>
                        <span>${rec.businessImpact.businessValue}/10</span>
                    </div>
                </div>
                
                <div style="margin-top: 15px;">
                    <strong>Market Gap:</strong> ${rec.justification.marketGap}
                </div>
                
                <div style="margin-top: 10px;">
                    <strong>Implementation:</strong> ${rec.implementationPlan.effort} effort | ${rec.implementationPlan.timeframe}
                </div>
            </div>
        `).join('');
        return `
        <div>
            <h3>🎯 Unique Value Propositions</h3>
            <div class="business-impact-grid">
                ${cards}
            </div>
        </div>`;
    }
    generateCompetitiveAnalysis(analysis) {
        const opportunities = analysis.innovationOpportunities.map((opp) => `
            <div class="impact-card">
                <h4>${opp.opportunity}</h4>
                <p>${opp.description}</p>
                <div><strong>Impact:</strong> ${opp.potentialImpact}</div>
                <div><strong>Market Gap:</strong> ${opp.marketGap}</div>
                <div><strong>Trend Analysis:</strong> ${opp.trendAnalysis}</div>
            </div>
        `).join('');
        return `
        <div>
            <h3>🏆 Innovation Opportunities</h3>
            <div class="business-impact-grid">
                ${opportunities}
            </div>
        </div>`;
    }
    generateBusinessStrategy(strategy) {
        const growthOps = strategy.growthOpportunities.map((opp) => `
            <div class="impact-card">
                <h4>${opp.opportunity}</h4>
                <p>${opp.strategy}</p>
                <div><strong>Potential:</strong> ${opp.potential}</div>
            </div>
        `).join('');
        return `
        <div>
            <h3>📈 Strategic Positioning</h3>
            <p><strong>Current Position:</strong> ${strategy.marketPositioning.currentPosition}</p>
            <p><strong>Target Position:</strong> ${strategy.marketPositioning.targetPosition}</p>
            
            <h4>Key Differentiators:</h4>
            <ul>
                ${strategy.marketPositioning.differentiators.map((diff) => `<li>${diff}</li>`).join('')}
            </ul>
            
            <h4>Growth Opportunities:</h4>
            <div class="business-impact-grid">
                ${growthOps}
            </div>
        </div>`;
    }
    generateFooter() {
        return `
        <div class="footer">
            <h3>📞 Next Steps</h3>
            <ol>
                <li><strong>Immediate Actions:</strong> Focus on high-priority refactoring items</li>
                <li><strong>Short-term Goals:</strong> Implement quick wins to improve code quality</li>
                <li><strong>Long-term Vision:</strong> Consider architectural improvements and strategic features</li>
                <li><strong>Continuous Improvement:</strong> Regular code reviews and quality monitoring</li>
            </ol>
            
            <hr style="margin: 20px 0; border: none; height: 1px; background: #e2e8f0;">
            
            <p><em>Report generated by Strategic Code Companion v1.0.0</em></p>
            <p>🤖 Powered by AI-driven code analysis</p>
        </div>`;
    }
    generateScripts() {
        return `
        <script>
            // Smooth scrolling for navigation links
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const targetId = this.getAttribute('href').substring(1);
                    const targetElement = document.getElementById(targetId);
                    if (targetElement) {
                        targetElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            });

            // Animate metric cards on scroll
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
            }, observerOptions);

            // Observe all cards for animation
            document.querySelectorAll('.metric-card, .recommendation-card, .library-card, .tutorial-card, .impact-card').forEach(card => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                observer.observe(card);
            });

            // Add print styles
            const printStyles = \`
                @media print {
                    body { background: white !important; }
                    .navbar { display: none; }
                    .section { break-inside: avoid; margin-bottom: 30px; }
                    .code-before-after { break-inside: avoid; }
                }
            \`;
            
            const styleSheet = document.createElement('style');
            styleSheet.textContent = printStyles;
            document.head.appendChild(styleSheet);
        </script>`;
    }
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    getComplexityText(complexity) {
        if (complexity <= 3)
            return '🟢 Low Complexity';
        if (complexity <= 6)
            return '🟡 Medium Complexity';
        return '🔴 High Complexity';
    }
}
exports.HTMLReportGenerator = HTMLReportGenerator;
//# sourceMappingURL=HTMLReportGenerator.js.map