// Strategic Code Companion - Frontend Logic

(function() {
    const vscode = acquireVsCodeApi();
    let currentResults = null;

    // DOM Elements
    const views = {
        onboarding: document.getElementById('onboarding'),
        main: document.getElementById('main'),
        loading: document.getElementById('loading'),
        results: document.getElementById('results')
    };

    // Initialize event listeners
    function initializeEventListeners() {
        // Onboarding form
        const saveKeyBtn = document.getElementById('save-key-btn');
        const providerSelect = document.getElementById('provider-select');
        const apiKeyInput = document.getElementById('api-key-input');

        if (saveKeyBtn) {
            saveKeyBtn.addEventListener('click', () => {
                const provider = providerSelect.value;
                const apiKey = apiKeyInput.value.trim();

                if (!apiKey) {
                    showError('Please enter an API key');
                    return;
                }

                vscode.postMessage({
                    type: 'saveApiKey',
                    provider: provider,
                    apiKey: apiKey
                });
            });
        }

        // Main view buttons
        const analyzeBtn = document.getElementById('analyze-btn');
        const settingsBtn = document.getElementById('settings-btn');
        const clearKeyBtn = document.getElementById('clear-key-btn');

        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => {
                vscode.postMessage({ type: 'analyzeWorkspace' });
            });
        }

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                vscode.postMessage({ type: 'openSettings' });
            });
        }

        if (clearKeyBtn) {
            clearKeyBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear your API key?')) {
                    vscode.postMessage({ type: 'clearApiKey' });
                }
            });
        }

        // Results view
        const backToMainBtn = document.getElementById('back-to-main-btn');
        if (backToMainBtn) {
            backToMainBtn.addEventListener('click', () => {
                showView('main');
            });
        }

        // Tab navigation
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                switchTab(tabId);
            });
        });

        // Enter key support for API key input
        if (apiKeyInput) {
            apiKeyInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveKeyBtn.click();
                }
            });
        }
    }

    // View management
    function showView(viewName) {
        Object.keys(views).forEach(key => {
            if (views[key]) {
                views[key].style.display = key === viewName ? 'block' : 'none';
            }
        });
    }

    // Tab management
    function switchTab(tabId) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

        // Update tab panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`${tabId}-tab`).classList.add('active');
    }

    // Message handlers from extension
    window.addEventListener('message', event => {
        const message = event.data;

        switch (message.type) {
            case 'showOnboarding':
                showView('onboarding');
                break;

            case 'showMain':
                showView('main');
                break;

            case 'showLoading':
                showView('loading');
                updateLoadingMessage(message.message || 'Analyzing...');
                break;

            case 'updateLoading':
                updateLoadingMessage(message.message);
                break;

            case 'showResults':
                currentResults = message.results;
                renderResults(message.results);
                showView('results');
                break;
        }
    });

    // Loading message update
    function updateLoadingMessage(message) {
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.textContent = message;
        }
    }

    // Results rendering
    function renderResults(results) {
        if (!results) return;

        renderOverview(results.analysis);
        renderRefactoring(results.refactoring);
        renderArchitecture(results.architecture);
        renderLibraries(results.libraries);
        renderTutorials(results.tutorials);
    }

    function renderOverview(analysis) {
        const overviewTab = document.getElementById('overview-tab');
        if (!overviewTab || !analysis) return;

        const html = `
            <div class="overview-grid">
                <div class="metric-card">
                    <h4>Project Summary</h4>
                    <p>${analysis.overall_summary}</p>
                </div>
                
                <div class="metric-card">
                    <h4>Project Type</h4>
                    <div class="metric-value">${analysis.project_type}</div>
                </div>
                
                <div class="metric-card">
                    <h4>Complexity Score</h4>
                    <div class="metric-value">${analysis.complexity_score}/10</div>
                </div>
                
                <div class="metric-card">
                    <h4>Technologies</h4>
                    <div class="tech-list">
                        ${analysis.key_technologies.map(tech => 
                            `<span class="tech-tag">${tech}</span>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="metric-card">
                    <h4>Code Quality Metrics</h4>
                    <div style="margin-top: 10px;">
                        <div>Maintainability: <strong>${analysis.code_quality_metrics.maintainability}/10</strong></div>
                        <div>Readability: <strong>${analysis.code_quality_metrics.readability}/10</strong></div>
                        <div>Testability: <strong>${analysis.code_quality_metrics.testability}/10</strong></div>
                    </div>
                </div>
                
                <div class="metric-card">
                    <h4>Architectural Patterns</h4>
                    <ul style="margin-top: 10px;">
                        ${analysis.architectural_patterns.map(pattern => 
                            `<li>${pattern}</li>`
                        ).join('')}
                    </ul>
                </div>
            </div>
        `;
        
        overviewTab.innerHTML = html;
    }

    function renderRefactoring(refactoring) {
        const refactoringTab = document.getElementById('refactoring-tab');
        if (!refactoringTab || !refactoring) return;

        const html = `
            <div class="refactoring-summary">
                <h3>Refactoring Summary</h3>
                <p>Found <strong>${refactoring.summary.totalSuggestions}</strong> suggestions:
                   <span class="priority-high">${refactoring.summary.highPriority} high</span>,
                   <span class="priority-medium">${refactoring.summary.mediumPriority} medium</span>,
                   <span class="priority-low">${refactoring.summary.lowPriority} low</span> priority
                </p>
            </div>
            
            <div class="suggestions-list">
                ${refactoring.suggestions.map(suggestion => `
                    <div class="suggestion-card">
                        <div class="suggestion-header">
                            <div>
                                <div class="suggestion-title">${suggestion.title}</div>
                                <span class="priority-badge priority-${suggestion.priority}">
                                    ${suggestion.priority} priority
                                </span>
                            </div>
                        </div>
                        
                        <div class="suggestion-description">${suggestion.description}</div>
                        
                        <div class="code-comparison">
                            <h5>Before:</h5>
                            <div class="code-block">
                                <pre>${escapeHtml(suggestion.beforeCode)}</pre>
                            </div>
                            
                            <h5>After:</h5>
                            <div class="code-block">
                                <pre>${escapeHtml(suggestion.afterCode)}</pre>
                            </div>
                        </div>
                        
                        <div class="suggestion-meta">
                            <span><strong>Category:</strong> ${suggestion.category}</span>
                            <span><strong>Effort:</strong> ${suggestion.estimatedEffort}</span>
                        </div>
                        
                        <ul class="benefits-list">
                            ${suggestion.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
        `;
        
        refactoringTab.innerHTML = html;
    }

    function renderArchitecture(architecture) {
        const architectureTab = document.getElementById('architecture-tab');
        if (!architectureTab || !architecture) return;

        const html = `
            <div class="architecture-summary">
                <h3>Architecture Suggestions</h3>
                <p>Recommended next steps: ${architecture.summary.recommendedNext.join(', ')}</p>
            </div>
            
            <div class="features-list">
                ${architecture.features.map(feature => `
                    <div class="suggestion-card">
                        <div class="suggestion-header">
                            <div>
                                <div class="suggestion-title">${feature.title}</div>
                                <span class="priority-badge priority-${feature.priority}">
                                    ${feature.priority} priority
                                </span>
                            </div>
                        </div>
                        
                        <div class="suggestion-description">${feature.description}</div>
                        
                        <div class="feature-meta">
                            <span><strong>Category:</strong> ${feature.category}</span>
                            <span><strong>Complexity:</strong> ${feature.complexity}</span>
                            <span><strong>Estimated Time:</strong> ${feature.estimatedTimeWeeks} weeks</span>
                        </div>
                        
                        <div style="margin-top: 15px;">
                            <h5>Implementation Steps:</h5>
                            <ol>
                                ${feature.implementationOverview.steps.map(step => `<li>${step}</li>`).join('')}
                            </ol>
                        </div>
                        
                        <div style="margin-top: 15px;">
                            <h5>Technologies Needed:</h5>
                            <div class="tech-list">
                                ${feature.implementationOverview.technologies.map(tech => 
                                    `<span class="tech-tag">${tech}</span>`
                                ).join('')}
                            </div>
                        </div>
                        
                        <ul class="benefits-list">
                            ${feature.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
        `;
        
        architectureTab.innerHTML = html;
    }

    function renderLibraries(libraries) {
        const librariesTab = document.getElementById('libraries-tab');
        if (!librariesTab || !libraries) return;

        const html = `
            <div class="libraries-summary">
                <h3>Library Recommendations</h3>
                <p>Found ${libraries.summary.totalRecommendations} relevant libraries 
                   (${libraries.summary.highRelevance} high relevance, ${libraries.summary.easyIntegration} easy integration)</p>
            </div>
            
            <div class="libraries-list">
                ${libraries.recommendations.map(lib => `
                    <div class="library-card">
                        <div class="library-header">
                            <div>
                                <a href="#" class="library-name" onclick="openUrl('${lib.githubUrl}')">${lib.name}</a>
                                <div class="suggestion-description">${lib.description}</div>
                            </div>
                            <div>
                                <span class="priority-badge priority-${lib.integrationEffort === 'low' ? 'low' : lib.integrationEffort === 'medium' ? 'medium' : 'high'}">
                                    ${lib.integrationEffort} effort
                                </span>
                            </div>
                        </div>
                        
                        <div class="library-stats">
                            <div class="stat-item">
                                <span>⭐</span>
                                <span>${lib.stars.toLocaleString()} stars</span>
                            </div>
                            <div class="stat-item">
                                <span>🍴</span>
                                <span>${lib.forks.toLocaleString()} forks</span>
                            </div>
                            <div class="stat-item">
                                <span>📅</span>
                                <span>Updated ${formatDate(lib.lastUpdated)}</span>
                            </div>
                            <div class="stat-item">
                                <span>📝</span>
                                <span>${lib.license}</span>
                            </div>
                        </div>
                        
                        <div style="margin-top: 15px;">
                            <h5>Use Cases:</h5>
                            <ul>
                                ${lib.useCases.map(useCase => `<li>${useCase}</li>`).join('')}
                            </ul>
                        </div>
                        
                        <ul class="benefits-list">
                            ${lib.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
        `;
        
        librariesTab.innerHTML = html;
    }

    function renderTutorials(tutorials) {
        const tutorialsTab = document.getElementById('tutorials-tab');
        if (!tutorialsTab || !tutorials) return;

        const html = `
            <div class="tutorials-summary">
                <h3>Learning Resources</h3>
                <p>Found ${tutorials.summary.totalTutorials} relevant tutorials 
                   (avg. relevance: ${(tutorials.summary.averageRelevance * 100).toFixed(0)}%)</p>
            </div>
            
            <div class="tutorials-list">
                ${tutorials.tutorials.map(tutorial => `
                    <div class="tutorial-card">
                        <a href="#" class="tutorial-title" onclick="openUrl('${tutorial.url}')">${tutorial.title}</a>
                        
                        <div class="suggestion-description">${tutorial.description}</div>
                        
                        <div class="tutorial-meta">
                            <span class="difficulty-badge difficulty-${tutorial.difficulty}">
                                ${tutorial.difficulty}
                            </span>
                            ${tutorial.duration ? `<span>⏱️ ${tutorial.duration}</span>` : ''}
                            ${tutorial.views ? `<span>👁️ ${tutorial.views.toLocaleString()} views</span>` : ''}
                            ${tutorial.rating ? `<span>⭐ ${tutorial.rating.toFixed(1)}</span>` : ''}
                            <span>👤 ${tutorial.author}</span>
                            <span>📅 ${formatDate(tutorial.publishedDate)}</span>
                        </div>
                        
                        <div style="margin-top: 10px;">
                            <strong>Topics:</strong> ${tutorial.topics.join(', ')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        tutorialsTab.innerHTML = html;
    }

    // Utility functions
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 30) {
            return `${diffDays} days ago`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months} month${months > 1 ? 's' : ''} ago`;
        } else {
            const years = Math.floor(diffDays / 365);
            return `${years} year${years > 1 ? 's' : ''} ago`;
        }
    }

    function showError(message) {
        // Simple error display - could be enhanced with proper notifications
        alert(message);
    }

    // Global function for opening URLs
    window.openUrl = function(url) {
        vscode.postMessage({
            type: 'openUrl',
            url: url
        });
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEventListeners);
    } else {
        initializeEventListeners();
    }
})();