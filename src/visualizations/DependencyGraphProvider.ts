import * as vscode from 'vscode';
import * as path from 'path';
import { CodeIngestion, CodeChunk } from '../rag/ingestion';

export interface DependencyNode {
    id: string;
    label: string;
    filePath: string;
    type: 'file' | 'module' | 'function' | 'class' | 'interface';
    dependencies: string[];
    dependents: string[];
    complexity: number;
    size: number;
}

export interface DependencyEdge {
    from: string;
    to: string;
    type: 'import' | 'function_call' | 'inheritance' | 'composition';
    weight: number;
}

export interface DependencyGraph {
    nodes: DependencyNode[];
    edges: DependencyEdge[];
    circularDependencies: string[][];
    metrics: {
        totalFiles: number;
        totalDependencies: number;
        averageComplexity: number;
        couplingScore: number;
        cohesionScore: number;
    };
}

export class DependencyGraphProvider {
    private panel: vscode.WebviewPanel | undefined;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async showDependencyGraph(workspacePath: string): Promise<void> {
        // Create webview panel
        this.panel = vscode.window.createWebviewPanel(
            'dependencyGraph',
            'Code Dependencies - Strategic Code Companion',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
                ]
            }
        );

        // Show loading state
        this.panel.webview.html = this.getLoadingHtml();

        try {
            // Analyze dependencies
            const graph = await this.analyzeDependencies(workspacePath);
            
            // Update webview with results
            this.panel.webview.html = this.getDependencyGraphHtml(graph);
            
            // Handle webview messages
            this.panel.webview.onDidReceiveMessage(
                message => this.handleWebviewMessage(message, graph),
                undefined,
                this.context.subscriptions
            );

        } catch (error) {
            this.panel.webview.html = this.getErrorHtml(error as Error);
        }
    }

    private async analyzeDependencies(workspacePath: string): Promise<DependencyGraph> {
        const ingestion = new CodeIngestion(workspacePath);
        const chunks = await ingestion.ingestWorkspace();

        const nodes = new Map<string, DependencyNode>();
        const edges: DependencyEdge[] = [];
        const fileImports = new Map<string, Set<string>>();

        // Process each code chunk to build dependency graph
        for (const chunk of chunks) {
            const nodeId = this.getNodeId(chunk);
            
            if (!nodes.has(nodeId)) {
                nodes.set(nodeId, {
                    id: nodeId,
                    label: path.basename(chunk.filePath),
                    filePath: chunk.filePath,
                    type: this.determineNodeType(chunk),
                    dependencies: [],
                    dependents: [],
                    complexity: this.calculateComplexity(chunk),
                    size: chunk.content.length
                });
            }

            // Extract dependencies from code content
            const dependencies = this.extractDependencies(chunk);
            const imports = fileImports.get(chunk.filePath) || new Set();
            
            for (const dep of dependencies) {
                imports.add(dep);
                
                // Create edge if dependency exists as a node
                const depId = this.findDependencyNodeId(dep, nodes);
                if (depId && depId !== nodeId) {
                    edges.push({
                        from: nodeId,
                        to: depId,
                        type: this.determineEdgeType(chunk, dep),
                        weight: 1
                    });

                    // Update node relationships
                    const node = nodes.get(nodeId)!;
                    const depNode = nodes.get(depId)!;
                    
                    if (!node.dependencies.includes(depId)) {
                        node.dependencies.push(depId);
                    }
                    if (!depNode.dependents.includes(nodeId)) {
                        depNode.dependents.push(nodeId);
                    }
                }
            }

            fileImports.set(chunk.filePath, imports);
        }

        // Detect circular dependencies
        const circularDependencies = this.detectCircularDependencies(nodes, edges);

        // Calculate metrics
        const metrics = this.calculateMetrics(Array.from(nodes.values()), edges);

        return {
            nodes: Array.from(nodes.values()),
            edges,
            circularDependencies,
            metrics
        };
    }

    private getNodeId(chunk: CodeChunk): string {
        if (chunk.type === 'function' || chunk.type === 'class') {
            return `${chunk.filePath}:${chunk.metadata.name || 'anonymous'}`;
        }
        return chunk.filePath;
    }

    private determineNodeType(chunk: CodeChunk): DependencyNode['type'] {
        switch (chunk.type) {
            case 'function': return 'function';
            case 'class': return 'class';
            case 'interface': return 'interface';
            default: return 'file';
        }
    }

    private calculateComplexity(chunk: CodeChunk): number {
        // Simple complexity calculation based on code patterns
        let complexity = 1;
        const content = chunk.content.toLowerCase();
        
        // Control structures add complexity
        complexity += (content.match(/\b(if|else|while|for|switch|case|catch|try)\b/g) || []).length;
        complexity += (content.match(/&&|\|\|/g) || []).length;
        complexity += (content.match(/\?.*:/g) || []).length; // Ternary operators
        
        return Math.min(complexity, 10); // Cap at 10
    }

    private extractDependencies(chunk: CodeChunk): string[] {
        const dependencies: string[] = [];
        const content = chunk.content;

        // Extract imports/requires
        const importPatterns = [
            /import\s+(?:.*\s+from\s+)?['"]([^'"]+)['"]/g,
            /require\(['"]([^'"]+)['"]\)/g,
            /from\s+['"]([^'"]+)['"]/g,
            /#include\s*<([^>]+)>/g,
            /#include\s*"([^"]+)"/g
        ];

        for (const pattern of importPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                dependencies.push(match[1]);
            }
        }

        return dependencies;
    }

    private findDependencyNodeId(dependency: string, nodes: Map<string, DependencyNode>): string | null {
        // Try to match dependency to existing nodes
        for (const [nodeId, node] of nodes) {
            if (node.filePath.includes(dependency) || 
                node.label === dependency ||
                nodeId.includes(dependency)) {
                return nodeId;
            }
        }
        return null;
    }

    private determineEdgeType(chunk: CodeChunk, dependency: string): DependencyEdge['type'] {
        const content = chunk.content.toLowerCase();
        
        if (content.includes(`extends ${dependency}`) || content.includes(`implements ${dependency}`)) {
            return 'inheritance';
        }
        if (content.includes(`new ${dependency}`) || content.includes(`${dependency}(`)) {
            return 'composition';
        }
        if (content.includes(`${dependency}(`)) {
            return 'function_call';
        }
        return 'import';
    }

    private detectCircularDependencies(nodes: Map<string, DependencyNode>, edges: DependencyEdge[]): string[][] {
        const cycles: string[][] = [];
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const dfs = (nodeId: string, path: string[]): void => {
            if (recursionStack.has(nodeId)) {
                // Found a cycle
                const cycleStart = path.indexOf(nodeId);
                if (cycleStart !== -1) {
                    cycles.push(path.slice(cycleStart).concat([nodeId]));
                }
                return;
            }

            if (visited.has(nodeId)) return;

            visited.add(nodeId);
            recursionStack.add(nodeId);

            // Follow outgoing edges
            const outgoingEdges = edges.filter(edge => edge.from === nodeId);
            for (const edge of outgoingEdges) {
                dfs(edge.to, [...path, nodeId]);
            }

            recursionStack.delete(nodeId);
        };

        for (const nodeId of nodes.keys()) {
            if (!visited.has(nodeId)) {
                dfs(nodeId, []);
            }
        }

        return cycles;
    }

    private calculateMetrics(nodes: DependencyNode[], edges: DependencyEdge[]) {
        const totalFiles = nodes.filter(n => n.type === 'file').length;
        const totalDependencies = edges.length;
        const averageComplexity = nodes.reduce((sum, n) => sum + n.complexity, 0) / nodes.length;
        
        // Coupling: average number of dependencies per node
        const couplingScore = nodes.reduce((sum, n) => sum + n.dependencies.length, 0) / nodes.length;
        
        // Cohesion: measure of how related components are within modules
        const cohesionScore = this.calculateCohesion(nodes, edges);

        return {
            totalFiles,
            totalDependencies,
            averageComplexity: Math.round(averageComplexity * 10) / 10,
            couplingScore: Math.round(couplingScore * 10) / 10,
            cohesionScore: Math.round(cohesionScore * 10) / 10
        };
    }

    private calculateCohesion(nodes: DependencyNode[], edges: DependencyEdge[]): number {
        // Simple cohesion metric: ratio of internal connections to total connections
        let internalConnections = 0;
        let totalConnections = edges.length;

        if (totalConnections === 0) return 1;

        for (const edge of edges) {
            const fromNode = nodes.find(n => n.id === edge.from);
            const toNode = nodes.find(n => n.id === edge.to);
            
            if (fromNode && toNode) {
                // Consider connections within the same directory as internal
                const fromDir = path.dirname(fromNode.filePath);
                const toDir = path.dirname(toNode.filePath);
                
                if (fromDir === toDir) {
                    internalConnections++;
                }
            }
        }

        return internalConnections / totalConnections;
    }

    private handleWebviewMessage(message: any, graph: DependencyGraph): void {
        switch (message.type) {
            case 'nodeClicked':
                this.handleNodeClick(message.nodeId, graph);
                break;
            case 'exportGraph':
                this.exportGraph(graph, message.format);
                break;
            case 'filterGraph':
                this.filterGraph(graph, message.filters);
                break;
            case 'showCircularDependencies':
                this.showCircularDependencies(graph.circularDependencies);
                break;
        }
    }

    private async handleNodeClick(nodeId: string, graph: DependencyGraph): Promise<void> {
        const node = graph.nodes.find(n => n.id === nodeId);
        if (node && node.filePath) {
            try {
                const document = await vscode.workspace.openTextDocument(node.filePath);
                await vscode.window.showTextDocument(document);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to open file: ${node.filePath}`);
            }
        }
    }

    private async exportGraph(graph: DependencyGraph, format: 'json' | 'csv' | 'graphml'): Promise<void> {
        const saveUri = await vscode.window.showSaveDialog({
            filters: {
                'JSON': ['json'],
                'CSV': ['csv'],
                'GraphML': ['graphml']
            }
        });

        if (!saveUri) return;

        try {
            let content: string;
            
            switch (format) {
                case 'json':
                    content = JSON.stringify(graph, null, 2);
                    break;
                case 'csv':
                    content = this.graphToCsv(graph);
                    break;
                case 'graphml':
                    content = this.graphToGraphML(graph);
                    break;
                default:
                    return;
            }

            await vscode.workspace.fs.writeFile(saveUri, Buffer.from(content, 'utf8'));
            vscode.window.showInformationMessage(`Graph exported to ${saveUri.fsPath}`);
            
        } catch (error) {
            vscode.window.showErrorMessage(`Export failed: ${error}`);
        }
    }

    private graphToCsv(graph: DependencyGraph): string {
        const header = 'From,To,Type,Weight\n';
        const rows = graph.edges.map(edge => 
            `${edge.from},${edge.to},${edge.type},${edge.weight}`
        ).join('\n');
        return header + rows;
    }

    private graphToGraphML(graph: DependencyGraph): string {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n';
        xml += '  <key id="label" for="node" attr.name="label" attr.type="string"/>\n';
        xml += '  <key id="type" for="node" attr.name="type" attr.type="string"/>\n';
        xml += '  <key id="complexity" for="node" attr.name="complexity" attr.type="int"/>\n';
        xml += '  <key id="edgeType" for="edge" attr.name="type" attr.type="string"/>\n';
        xml += '  <graph id="dependency-graph" edgedefault="directed">\n';
        
        // Add nodes
        for (const node of graph.nodes) {
            xml += `    <node id="${node.id}">\n`;
            xml += `      <data key="label">${node.label}</data>\n`;
            xml += `      <data key="type">${node.type}</data>\n`;
            xml += `      <data key="complexity">${node.complexity}</data>\n`;
            xml += `    </node>\n`;
        }
        
        // Add edges
        for (const edge of graph.edges) {
            xml += `    <edge source="${edge.from}" target="${edge.to}">\n`;
            xml += `      <data key="edgeType">${edge.type}</data>\n`;
            xml += `    </edge>\n`;
        }
        
        xml += '  </graph>\n';
        xml += '</graphml>';
        
        return xml;
    }

    private filterGraph(graph: DependencyGraph, filters: any): void {
        // Apply filters and update webview
        // This would involve regenerating the HTML with filtered data
        if (this.panel) {
            this.panel.webview.html = this.getDependencyGraphHtml(graph, filters);
        }
    }

    private async showCircularDependencies(cycles: string[][]): Promise<void> {
        if (cycles.length === 0) {
            vscode.window.showInformationMessage('✅ No circular dependencies found!');
            return;
        }

        const items = cycles.map((cycle, index) => ({
            label: `Cycle ${index + 1}`,
            detail: cycle.join(' → '),
            cycle
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: `Found ${cycles.length} circular dependencies. Select one to investigate:`
        });

        if (selected) {
            // Show detailed information about the selected cycle
            const message = `Circular Dependency Detected:\n\n${selected.cycle.join(' →\n')}\n\nThis creates a tight coupling that can make the code harder to maintain and test.`;
            
            vscode.window.showWarningMessage(
                `Circular dependency: ${selected.cycle.length} files involved`,
                'View Details',
                'Fix Suggestions'
            ).then(choice => {
                if (choice === 'View Details') {
                    vscode.window.showInformationMessage(message, { modal: true });
                } else if (choice === 'Fix Suggestions') {
                    this.showCircularDependencyFixes();
                }
            });
        }
    }

    private showCircularDependencyFixes(): void {
        const suggestions = [
            '• Extract common functionality into a shared module',
            '• Use dependency injection to break direct dependencies',
            '• Introduce interfaces or abstract classes',
            '• Move shared code to a parent directory',
            '• Use event-driven architecture for loose coupling'
        ];

        vscode.window.showInformationMessage(
            `Suggestions to fix circular dependencies:\n\n${suggestions.join('\n')}`,
            { modal: true }
        );
    }

    private getLoadingHtml(): string {
        return `<!DOCTYPE html>
        <html>
        <head>
            <style>
                body { 
                    font-family: var(--vscode-font-family); 
                    background: var(--vscode-editor-background);
                    color: var(--vscode-foreground);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .loader { text-align: center; }
                .spinner { 
                    border: 4px solid #f3f3f3; 
                    border-top: 4px solid #667eea; 
                    border-radius: 50%; 
                    width: 50px; 
                    height: 50px; 
                    animation: spin 2s linear infinite;
                    margin: 0 auto 20px;
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        </head>
        <body>
            <div class="loader">
                <div class="spinner"></div>
                <h2>Analyzing Dependencies</h2>
                <p>Building dependency graph for your codebase...</p>
            </div>
        </body>
        </html>`;
    }

    private getErrorHtml(error: Error): string {
        return `<!DOCTYPE html>
        <html>
        <head>
            <style>
                body { 
                    font-family: var(--vscode-font-family); 
                    background: var(--vscode-editor-background);
                    color: var(--vscode-foreground);
                    padding: 20px;
                }
                .error { 
                    background: var(--vscode-inputValidation-errorBackground);
                    border: 1px solid var(--vscode-inputValidation-errorBorder);
                    padding: 20px;
                    border-radius: 8px;
                }
            </style>
        </head>
        <body>
            <div class="error">
                <h2>❌ Failed to Analyze Dependencies</h2>
                <p><strong>Error:</strong> ${error.message}</p>
                <p>Please ensure your workspace contains valid source code files.</p>
            </div>
        </body>
        </html>`;
    }

    private getDependencyGraphHtml(graph: DependencyGraph, filters?: any): string {
        // This would return a complex HTML with D3.js visualization
        // For brevity, I'm showing the structure
        return `<!DOCTYPE html>
        <html>
        <head>
            <title>Dependency Graph</title>
            <script src="https://d3js.org/d3.v7.min.js"></script>
            <style>
                body { 
                    font-family: var(--vscode-font-family); 
                    background: var(--vscode-editor-background);
                    color: var(--vscode-foreground);
                    margin: 0;
                    padding: 0;
                }
                .controls {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    background: var(--vscode-sideBar-background);
                    border: 1px solid var(--vscode-sideBar-border);
                    padding: 10px;
                    border-radius: 8px;
                    z-index: 1000;
                }
                .metrics {
                    position: fixed;
                    top: 10px;
                    left: 10px;
                    background: var(--vscode-sideBar-background);
                    border: 1px solid var(--vscode-sideBar-border);
                    padding: 10px;
                    border-radius: 8px;
                    z-index: 1000;
                    min-width: 200px;
                }
                .metric {
                    margin: 5px 0;
                    padding: 5px;
                    background: var(--vscode-input-background);
                    border-radius: 4px;
                }
                #graph {
                    width: 100vw;
                    height: 100vh;
                }
                .node {
                    cursor: pointer;
                    stroke-width: 2;
                }
                .node.file { fill: #4facfe; }
                .node.function { fill: #667eea; }
                .node.class { fill: #764ba2; }
                .node.module { fill: #f093fb; }
                .node.circular { fill: #ff6b6b; }
                .link {
                    stroke: var(--vscode-foreground);
                    stroke-opacity: 0.6;
                    marker-end: url(#arrowhead);
                }
                .link.import { stroke-dasharray: 5,5; }
                .link.inheritance { stroke-width: 3; }
                .tooltip {
                    position: absolute;
                    padding: 8px;
                    background: var(--vscode-hover-background);
                    border: 1px solid var(--vscode-hover-border);
                    border-radius: 4px;
                    pointer-events: none;
                    z-index: 1001;
                }
                button {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 5px 10px;
                    margin: 2px;
                    border-radius: 4px;
                    cursor: pointer;
                }
                button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                .filter-section {
                    margin: 10px 0;
                    padding: 10px;
                    border-top: 1px solid var(--vscode-sideBar-border);
                }
            </style>
        </head>
        <body>
            <div class="metrics">
                <h3>📊 Metrics</h3>
                <div class="metric">
                    <strong>Files:</strong> ${graph.metrics.totalFiles}
                </div>
                <div class="metric">
                    <strong>Dependencies:</strong> ${graph.metrics.totalDependencies}
                </div>
                <div class="metric">
                    <strong>Avg Complexity:</strong> ${graph.metrics.averageComplexity}
                </div>
                <div class="metric">
                    <strong>Coupling Score:</strong> ${graph.metrics.couplingScore}
                </div>
                <div class="metric">
                    <strong>Cohesion Score:</strong> ${graph.metrics.cohesionScore}
                </div>
                ${graph.circularDependencies.length > 0 ? `
                <div class="metric" style="background: var(--vscode-errorBackground);">
                    <strong>⚠️ Circular Dependencies:</strong> ${graph.circularDependencies.length}
                </div>
                ` : `
                <div class="metric" style="background: var(--vscode-testing-iconPassed);">
                    <strong>✅ No Circular Dependencies</strong>
                </div>
                `}
            </div>

            <div class="controls">
                <h3>🎛️ Controls</h3>
                <button onclick="resetZoom()">Reset View</button>
                <button onclick="exportGraph('json')">Export JSON</button>
                <button onclick="exportGraph('csv')">Export CSV</button>
                ${graph.circularDependencies.length > 0 ? `
                <button onclick="showCircularDependencies()" style="background: var(--vscode-errorForeground);">
                    Show Cycles
                </button>
                ` : ''}
                
                <div class="filter-section">
                    <h4>Filters</h4>
                    <label>
                        <input type="checkbox" id="showFiles" checked onchange="updateFilters()">
                        Files
                    </label><br>
                    <label>
                        <input type="checkbox" id="showFunctions" checked onchange="updateFilters()">
                        Functions
                    </label><br>
                    <label>
                        <input type="checkbox" id="showClasses" checked onchange="updateFilters()">
                        Classes
                    </label><br>
                    <label>
                        <input type="range" id="complexityFilter" min="1" max="10" value="1" onchange="updateFilters()">
                        Min Complexity: <span id="complexityValue">1</span>
                    </label>
                </div>
            </div>

            <svg id="graph"></svg>

            <script>
                const vscode = acquireVsCodeApi();
                const graphData = ${JSON.stringify(graph)};
                
                // D3.js visualization code would go here
                // This would create an interactive force-directed graph
                
                function initializeGraph() {
                    const width = window.innerWidth;
                    const height = window.innerHeight;
                    
                    const svg = d3.select("#graph")
                        .attr("width", width)
                        .attr("height", height);
                    
                    // Add arrow markers for directed edges
                    svg.append("defs").append("marker")
                        .attr("id", "arrowhead")
                        .attr("viewBox", "-0 -5 10 10")
                        .attr("refX", 15)
                        .attr("refY", 0)
                        .attr("orient", "auto")
                        .attr("markerWidth", 8)
                        .attr("markerHeight", 8)
                        .attr("xoverflow", "visible")
                        .append("svg:path")
                        .attr("d", "M 0,-5 L 10 ,0 L 0,5")
                        .attr("fill", "var(--vscode-foreground)")
                        .style("stroke", "none");
                    
                    // Create force simulation
                    const simulation = d3.forceSimulation(graphData.nodes)
                        .force("link", d3.forceLink(graphData.edges).id(d => d.id).distance(100))
                        .force("charge", d3.forceManyBody().strength(-300))
                        .force("center", d3.forceCenter(width / 2, height / 2))
                        .force("collision", d3.forceCollide().radius(30));
                    
                    // Draw the graph
                    drawGraph(svg, simulation);
                }
                
                function drawGraph(svg, simulation) {
                    // Links
                    const link = svg.selectAll(".link")
                        .data(graphData.edges)
                        .enter().append("line")
                        .attr("class", d => \`link \${d.type}\`)
                        .attr("stroke-width", d => Math.sqrt(d.weight) * 2);
                    
                    // Nodes
                    const node = svg.selectAll(".node")
                        .data(graphData.nodes)
                        .enter().append("circle")
                        .attr("class", d => \`node \${d.type}\`)
                        .attr("r", d => Math.max(8, Math.min(20, d.size / 100)))
                        .on("click", handleNodeClick)
                        .on("mouseover", handleMouseOver)
                        .on("mouseout", handleMouseOut)
                        .call(d3.drag()
                            .on("start", dragstarted)
                            .on("drag", dragged)
                            .on("end", dragended));
                    
                    // Labels
                    const label = svg.selectAll(".label")
                        .data(graphData.nodes)
                        .enter().append("text")
                        .attr("class", "label")
                        .attr("dx", 12)
                        .attr("dy", 4)
                        .style("font-size", "12px")
                        .style("fill", "var(--vscode-foreground)")
                        .text(d => d.label);
                    
                    // Update positions on simulation tick
                    simulation.on("tick", () => {
                        link.attr("x1", d => d.source.x)
                            .attr("y1", d => d.source.y)
                            .attr("x2", d => d.target.x)
                            .attr("y2", d => d.target.y);
                        
                        node.attr("cx", d => d.x)
                            .attr("cy", d => d.y);
                        
                        label.attr("x", d => d.x)
                             .attr("y", d => d.y);
                    });
                }
                
                function handleNodeClick(event, d) {
                    vscode.postMessage({
                        type: 'nodeClicked',
                        nodeId: d.id
                    });
                }
                
                function handleMouseOver(event, d) {
                    // Create tooltip
                    const tooltip = d3.select("body").append("div")
                        .attr("class", "tooltip")
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px")
                        .html(\`
                            <strong>\${d.label}</strong><br>
                            Type: \${d.type}<br>
                            Complexity: \${d.complexity}<br>
                            Dependencies: \${d.dependencies.length}<br>
                            Dependents: \${d.dependents.length}
                        \`);
                }
                
                function handleMouseOut() {
                    d3.selectAll(".tooltip").remove();
                }
                
                function dragstarted(event, d) {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                }
                
                function dragged(event, d) {
                    d.fx = event.x;
                    d.fy = event.y;
                }
                
                function dragended(event, d) {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                }
                
                function resetZoom() {
                    // Reset zoom and pan
                    location.reload();
                }
                
                function exportGraph(format) {
                    vscode.postMessage({
                        type: 'exportGraph',
                        format: format
                    });
                }
                
                function showCircularDependencies() {
                    vscode.postMessage({
                        type: 'showCircularDependencies'
                    });
                }
                
                function updateFilters() {
                    const filters = {
                        showFiles: document.getElementById('showFiles').checked,
                        showFunctions: document.getElementById('showFunctions').checked,
                        showClasses: document.getElementById('showClasses').checked,
                        minComplexity: document.getElementById('complexityFilter').value
                    };
                    
                    document.getElementById('complexityValue').textContent = filters.minComplexity;
                    
                    vscode.postMessage({
                        type: 'filterGraph',
                        filters: filters
                    });
                }
                
                // Initialize the graph when page loads
                window.addEventListener('load', initializeGraph);
                window.addEventListener('resize', () => {
                    // Handle window resize
                    initializeGraph();
                });
            </script>
        </body>
        </html>`;
    }

    dispose(): void {
        if (this.panel) {
            this.panel.dispose();
        }
    }
}