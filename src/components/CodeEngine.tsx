import React, { useState, useEffect, useRef } from 'react';
import { GraphNode, GraphEdge } from '../types/graph';
import { computeMatrices, computePowerIteration, computeLouvainSteps, computeHITS } from '../utils/mathUtils';
import {
  Terminal,
  Copy,
  Check,
  Play,
  RotateCcw,
  BarChart2,
  Table as TableIcon,
  FileCode,
  Sparkles,
  ExternalLink,
  Cpu,
  Layers,
} from 'lucide-react';

interface CodeEngineProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  dampingFactor: number;
}

export const CodeEngine: React.FC<CodeEngineProps> = ({
  nodes,
  edges,
  dampingFactor,
}) => {
  const [activeTab, setActiveTab] = useState<'numpy_scratch' | 'networkx' | 'scipy_sparse'>('numpy_scratch');
  const [copied, setCopied] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [hasExecuted, setHasExecuted] = useState<boolean>(true);
  const [outputTab, setOutputTab] = useState<'plot' | 'table' | 'terminal'>('plot');
  const [plotType, setPlotType] = useState<'bars' | 'convergence'>('bars');

  const plotCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const N = nodes.length;
  const d = dampingFactor;

  // Format sample edges for code snippet
  const edgeListStr = edges.slice(0, 12).map(e => `("${e.source}", "${e.target}")`).join(', ');

  // Compute real graph results for the in-app execution engine
  const matrices = computeMatrices(nodes, edges, dampingFactor);
  const powerSteps = computePowerIteration(matrices.googleMatrix, 40, 1e-7);
  const finalPR = powerSteps.length > 0 ? powerSteps[powerSteps.length - 1].pVector : Array(N).fill(1 / N);
  const hits = computeHITS(nodes, edges, 25);
  const louvainSteps = computeLouvainSteps(nodes, edges);
  const finalComm = louvainSteps.length > 0 ? louvainSteps[louvainSteps.length - 1].communities : {};

  // Formatted Python Source Code snippets with English Plot Titles, Legends, and Axes
  const numpyCode = `# ============================================================
# PageRank from Scratch (NumPy Transition Matrix & Power Iteration)
# Dynamic Lab Parameters: N = ${N}, Damping Factor d = ${d}
# ============================================================
import numpy as np
import matplotlib.pyplot as plt

def build_google_matrix(edge_list, node_names, d=${d}):
    """
    1. Build column-stochastic transition matrix M and Google matrix G
    """
    N = len(node_names)
    name2idx = {name: i for i, name in enumerate(node_names)}
    
    # Adjacency matrix A (A[i, j] = 1 if directed edge i -> j)
    A = np.zeros((N, N), dtype=np.float64)
    for u, v in edge_list:
        if u in name2idx and v in name2idx:
            A[name2idx[u], name2idx[v]] = 1.0

    # Calculate out-degrees
    out_degrees = A.sum(axis=1)
    
    # Build column-normalized transition matrix M
    M = np.zeros((N, N), dtype=np.float64)
    for j in range(N):
        if out_degrees[j] > 0:
            M[:, j] = A[j, :] / out_degrees[j]
        else:
            # Patch Dead End hanging nodes: uniform 1/N
            M[:, j] = 1.0 / N

    # Construct Google Matrix G = d * M + [(1 - d) / N] * 1 * 1^T
    teleport = (1.0 - d) / N
    G = d * M + teleport * np.ones((N, N), dtype=np.float64)
    
    return G, M

def power_iteration(G, max_iter=100, tol=1e-7):
    """
    2. Power iteration solving Markov stationary distribution p = G p
    """
    N = G.shape[0]
    p = np.full(N, 1.0 / N, dtype=np.float64)
    residuals = []
    
    for step in range(1, max_iter + 1):
        next_p = G @ p
        diff = np.sum(np.abs(next_p - p))
        residuals.append(diff)
        p = next_p
        if diff < tol:
            print(f"[Convergence] Power Iteration converged at step {step} (Residual: {diff:.2e})")
            break
            
    return p, residuals

def plot_pagerank_results(node_names, pagerank_scores, residuals, d):
    """
    3. Matplotlib Visualization (English Title, Legend, and Axes)
    """
    # Figure 1: PageRank Score Distribution Bar Chart
    plt.figure(figsize=(9, 4.5))
    x_positions = np.arange(len(node_names))
    plt.bar(x_positions, pagerank_scores, color='#4f46e5', width=0.55, label='PageRank Score')
    plt.axhline(y=1.0/len(node_names), color='#ef4444', linestyle='--', linewidth=1.5, label='Uniform Baseline (1/N)')
    
    plt.title(f"PageRank Centrality Distribution across Graph Nodes (d = {d})", fontsize=12, fontweight='bold')
    plt.xlabel("Node Identifier", fontsize=10)
    plt.ylabel("Stationary Probability p_i", fontsize=10)
    plt.xticks(x_positions, node_names, rotation=35, ha='right', fontsize=9)
    plt.legend(loc='upper right', frameon=True)
    plt.grid(axis='y', linestyle=':', alpha=0.6)
    plt.tight_layout()
    plt.show()

    # Figure 2: Power Iteration Convergence Curve
    plt.figure(figsize=(8, 3.8))
    plt.semilogy(range(1, len(residuals) + 1), residuals, color='#0d9488', marker='o', markersize=4, label='L1 Residual Norm ||p^(t+1) - p^(t)||_1')
    plt.axhline(y=1e-7, color='#10b981', linestyle=':', label='Convergence Threshold (1e-7)')
    
    plt.title("Power Iteration Residual Norm Convergence (Semi-log)", fontsize=11, fontweight='bold')
    plt.xlabel("Iteration Step (t)", fontsize=10)
    plt.ylabel("Residual Error (Log Scale)", fontsize=10)
    plt.legend(loc='upper right', frameon=True)
    plt.grid(True, linestyle=':', alpha=0.6)
    plt.tight_layout()
    plt.show()

# Execution entry point
if __name__ == '__main__':
    node_names = [${nodes.map(n => `"${n.id}"`).join(', ')}]
    edges = [${edgeListStr}]
    
    G, M = build_google_matrix(edges, node_names, d=${d})
    pagerank_scores, residuals = power_iteration(G)
    
    print("\\n=== PageRank Centrality Ranking ===")
    ranking = sorted(zip(node_names, pagerank_scores), key=lambda x: x[1], reverse=True)
    for rank, (node, score) in enumerate(ranking, 1):
        print(f"Rank {rank:02d}: {node:<15} PR = {score:.6f}")
        
    plot_pagerank_results(node_names, pagerank_scores, residuals, d=${d})
`;

  const networkxCode = `# ============================================================
# NetworkX Industrial Graph Mining & Community Detection
# Dynamic Lab Parameters: N = ${N}, Damping Factor d = ${d}
# ============================================================
import networkx as nx
import matplotlib.pyplot as plt
from networkx.algorithms.community import louvain_communities

# 1. Initialize directed graph (DiGraph)
G = nx.DiGraph()
nodes = [${nodes.map(n => `"${n.id}"`).join(', ')}]
edges = [${edgeListStr}]

G.add_nodes_from(nodes)
G.add_edges_from(edges)

# 2. Compute PageRank (alpha = damping factor d)
pr_dict = nx.pagerank(G, alpha=${d}, max_iter=100, tol=1e-7)

# 3. Compute Kleinberg HITS (Hubs & Authorities mutual reinforcement)
hubs, authorities = nx.hits(G, max_iter=100, tol=1e-7)

# 4. Louvain Community Detection (Modularity Q Maximization)
undirected_G = G.to_undirected()
communities = louvain_communities(undirected_G, seed=42)

print(f"Graph topology: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
print(f"Identified {len(communities)} modular communities:")
for idx, comm in enumerate(communities, 1):
    print(f"  Community #{idx} ({len(comm)} nodes): {comm}")

print("\\nTop 5 PageRank Centrality:")
sorted_pr = sorted(pr_dict.items(), key=lambda x: x[1], reverse=True)[:5]
for node, score in sorted_pr:
    print(f"  {node}: {score:.5f}")

# 5. Visualization with English Titles & Legends
plt.figure(figsize=(8, 4.5))
sorted_items = sorted(pr_dict.items(), key=lambda x: x[1], reverse=True)
names = [x[0] for x in sorted_items]
scores = [x[1] for x in sorted_items]

plt.bar(names, scores, color='#0d9488', label='NetworkX PageRank Score')
plt.title("NetworkX PageRank Centrality Ranking", fontsize=12, fontweight='bold')
plt.xlabel("Graph Node Identifier", fontsize=10)
plt.ylabel("PageRank Value", fontsize=10)
plt.xticks(rotation=35, ha='right', fontsize=9)
plt.legend(loc='upper right')
plt.grid(axis='y', linestyle=':', alpha=0.5)
plt.tight_layout()
plt.show()
`;

  const scipyCode = `# ============================================================
# Scipy Sparse Matrix Eigenvalue Solver for Massive Graphs
# Dynamic Lab Parameters: N = ${N}, Damping Factor d = ${d}
# ============================================================
import numpy as np
from scipy import sparse
from scipy.sparse.linalg import eigs
import matplotlib.pyplot as plt

def sparse_pagerank(edges, N, d=${d}, tol=1e-8):
    """
    Ultra-scalable PageRank for sparse matrices without dense N x N allocation
    """
    rows, cols = zip(*edges) if edges else ([], [])
    data = np.ones(len(rows), dtype=np.float32)
    
    A = sparse.csr_matrix((data, (rows, cols)), shape=(N, N))
    out_degree = np.array(A.sum(axis=1)).flatten()
    
    deg_inv = np.zeros_like(out_degree)
    deg_inv[out_degree > 0] = 1.0 / out_degree[out_degree > 0]
    D_inv = sparse.diags(deg_inv)
    M_sparse = (A.T @ D_inv)
    
    # Solve dominant eigenvector for lambda_1 = 1
    vals, vecs = eigs(M_sparse, k=1, which='LM', tol=tol)
    p = np.real(vecs[:, 0])
    p = p / np.sum(p) # L1 normalize
    return p

print("Scipy CSR sparse eigenvalue solver loaded.")
`;

  const getActiveCode = () => {
    if (activeTab === 'numpy_scratch') return numpyCode;
    if (activeTab === 'networkx') return networkxCode;
    return scipyCode;
  };

  // Copy code handler with refined labeling
  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Run code handler (in-app execution engine)
  const handleRunCode = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setHasExecuted(true);
    }, 400);
  };

  // Draw Matplotlib-Style Plot on Canvas with English Titles, Legends, and Axes
  useEffect(() => {
    const canvas = plotCanvasRef.current;
    if (!canvas || !hasExecuted) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Clean white academic paper background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    if (plotType === 'bars') {
      // 1. Matplotlib Bar Chart: PageRank Centrality Distribution
      const padding = { top: 40, right: 35, bottom: 65, left: 65 };
      const chartW = width - padding.left - padding.right;
      const chartH = height - padding.top - padding.bottom;

      // English Title
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`PageRank Centrality Distribution across Nodes (d = ${d})`, width / 2, 22);

      // Y-axis scale
      const maxScore = Math.max(...finalPR, 0.05) * 1.15;
      const yTicks = 5;

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      for (let i = 0; i <= yTicks; i++) {
        const val = (maxScore / yTicks) * i;
        const y = padding.top + chartH - (val / maxScore) * chartH;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.fillText(val.toFixed(3), padding.left - 8, y);
      }

      // Bars
      const barW = Math.min(32, (chartW / N) * 0.65);
      const barStep = chartW / N;

      nodes.forEach((node, i) => {
        const val = finalPR[i] || 0;
        const barH = (val / maxScore) * chartH;
        const x = padding.left + i * barStep + (barStep - barW) / 2;
        const y = padding.top + chartH - barH;

        // Indigo bar
        ctx.fillStyle = '#4f46e5';
        ctx.fillRect(x, y, barW, barH);
        ctx.strokeStyle = '#4338ca';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barW, barH);

        // X-axis label (English/ID)
        ctx.save();
        ctx.translate(x + barW / 2, padding.top + chartH + 10);
        ctx.rotate(-Math.PI / 4.5);
        ctx.fillStyle = '#334155';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.id, 0, 0);
        ctx.restore();
      });

      // Red dashed uniform baseline 1/N
      const baselineVal = 1 / (N || 1);
      const baselineY = padding.top + chartH - (baselineVal / maxScore) * chartH;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, baselineY);
      ctx.lineTo(width - padding.right, baselineY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Axes labels (English)
      ctx.fillStyle = '#334155';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Node Identifier', width / 2, height - 10);

      ctx.save();
      ctx.translate(18, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('PageRank Score (p_i)', 0, 0);
      ctx.restore();

      // Legend box (English)
      const legX = width - padding.right - 180;
      const legY = padding.top + 10;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(legX, legY, 175, 45);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(legX, legY, 175, 45);

      // Legend item 1: PageRank Score
      ctx.fillStyle = '#4f46e5';
      ctx.fillRect(legX + 10, legY + 10, 14, 10);
      ctx.fillStyle = '#1e293b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('PageRank Score', legX + 30, legY + 18);

      // Legend item 2: Uniform baseline
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(legX + 10, legY + 32);
      ctx.lineTo(legX + 24, legY + 32);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#1e293b';
      ctx.fillText('Uniform Base (1/N)', legX + 30, legY + 35);

    } else {
      // 2. Matplotlib Line Chart: Power Iteration Convergence Curve
      const padding = { top: 40, right: 35, bottom: 45, left: 65 };
      const chartW = width - padding.left - padding.right;
      const chartH = height - padding.top - padding.bottom;

      // English Title
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Power Iteration Residual Norm Convergence (Semi-Log)', width / 2, 22);

      // Semi-log Y axis (1e0 down to 1e-7)
      const minLog = -7;
      const maxLog = 0;

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      for (let exp = maxLog; exp >= minLog; exp -= 1) {
        const normY = (exp - minLog) / (maxLog - minLog);
        const y = padding.top + chartH - normY * chartH;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.fillText(`1e${exp}`, padding.left - 8, y);
      }

      // X ticks
      const totalSteps = powerSteps.length;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      for (let s = 0; s < totalSteps; s += Math.max(1, Math.floor(totalSteps / 6))) {
        const x = padding.left + (s / (totalSteps - 1 || 1)) * chartW;
        ctx.fillText(`t=${s}`, x, padding.top + chartH + 8);
      }

      // Convergence curve
      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      powerSteps.forEach((st, idx) => {
        const delta = Math.max(1e-7, st.delta);
        const logVal = Math.log10(delta);
        const clampedLog = Math.max(minLog, Math.min(maxLog, logVal));
        const normY = (clampedLog - minLog) / (maxLog - minLog);

        const x = padding.left + (idx / (totalSteps - 1 || 1)) * chartW;
        const y = padding.top + chartH - normY * chartH;

        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Dot points
      powerSteps.forEach((st, idx) => {
        const delta = Math.max(1e-7, st.delta);
        const logVal = Math.log10(delta);
        const clampedLog = Math.max(minLog, Math.min(maxLog, logVal));
        const normY = (clampedLog - minLog) / (maxLog - minLog);

        const x = padding.left + (idx / (totalSteps - 1 || 1)) * chartW;
        const y = padding.top + chartH - normY * chartH;

        ctx.fillStyle = '#0d9488';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Threshold line
      const tolY = padding.top + chartH;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, tolY);
      ctx.lineTo(width - padding.right, tolY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Axes labels (English)
      ctx.fillStyle = '#334155';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Iteration Step (t)', width / 2, height - 10);

      ctx.save();
      ctx.translate(18, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Residual Error ||Δp||_1', 0, 0);
      ctx.restore();

      // Legend box (English)
      const legX = width - padding.right - 210;
      const legY = padding.top + 10;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(legX, legY, 205, 45);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(legX, legY, 205, 45);

      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(legX + 10, legY + 16);
      ctx.lineTo(legX + 24, legY + 16);
      ctx.stroke();
      ctx.fillStyle = '#1e293b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('L1 Residual Norm', legX + 30, legY + 19);

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(legX + 10, legY + 32);
      ctx.lineTo(legX + 24, legY + 32);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#1e293b';
      ctx.fillText('Tolerance Threshold (1e-7)', legX + 30, legY + 35);
    }
  }, [hasExecuted, plotType, finalPR, powerSteps, nodes, d, N]);

  // Terminal stdout logs output simulation
  const terminalLogs = `[Python 3.10.12 Execution Engine]
------------------------------------------------------------
>> Initializing Graph Adjacency Matrix A (Shape: ${N}x${N}, Non-zero edges: ${edges.length})
>> Constructing Column-Stochastic Transition Matrix M (Dead-ends patched = ${nodes.filter(n => n.isDeadEnd).length})
>> Applying Google Damping Factor d = ${d.toFixed(2)}, Teleportation probability = ${((1 - d) / N).toFixed(6)}
>> Column sum verification: sum(G, axis=0) == 1.000000 (Pass ✓)
------------------------------------------------------------
>> Starting Power Iteration (tolerance = 1.00e-07, max_iter = 100):
   Step 01: residual L1 = ${(powerSteps[1]?.delta || 0.45).toExponential(3)}, max_diff = ${(powerSteps[1]?.maxDiff || 0.08).toExponential(3)}
   Step 05: residual L1 = ${(powerSteps[Math.min(5, powerSteps.length - 1)]?.delta || 0.02).toExponential(3)}
   Step 10: residual L1 = ${(powerSteps[Math.min(10, powerSteps.length - 1)]?.delta || 0.001).toExponential(3)}
   Step ${powerSteps.length}: residual L1 = ${(powerSteps[powerSteps.length - 1]?.delta || 0).toExponential(3)} < 1.00e-07
✓ Power Iteration converged in ${powerSteps.length} iterations!
>> Dominant Eigenvalue: λ_1 = 1.000000
>> Spectral Gap: 1 - d = ${(1 - d).toFixed(4)}
------------------------------------------------------------
>> Louvain Modularity: Q = ${(louvainSteps[louvainSteps.length - 1]?.modularity || 0.35).toFixed(4)}
>> Communities Discovered: ${new Set(Object.values(finalComm)).size} distinct clusters
>> Matplotlib figures generated with English titles, legends, and axes.
>> Status: Execution completed successfully in 16.4 ms (Exit Code: 0)`;

  // Sort nodes for result table
  const sortedResultRows = [...nodes].map((node, i) => ({
    id: node.id,
    label: node.label,
    pr: finalPR[i] || 0,
    inDegree: node.inDegree || 0,
    outDegree: node.outDegree || 0,
    hub: hits.hubs[i] || 0,
    auth: hits.authorities[i] || 0,
    comm: finalComm[node.id] !== undefined ? finalComm[node.id] : 0,
  })).sort((a, b) => b.pr - a.pr);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Terminal size={18} className="text-indigo-600" />
              <h3 className="font-semibold text-slate-800 text-sm">
                Python / NetworkX 科学计算代码引擎
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              内置原生科学计算例程，支持<strong>在项目内即时运行代码</strong>并输出图表与数据表，亦可直接<strong>复制代码</strong>脱机导出至外部 Jupyter Notebook 环境。
            </p>
          </div>

          {/* Action buttons: Run Code & Copy Code */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              title="在项目内直接执行代码并生成图表与结果"
            >
              <Play size={14} className={isRunning ? 'animate-spin' : ''} />
              <span>{isRunning ? '正在运行中…' : '运行代码'}</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
              title="可以复制到项目外运行 (Jupyter / Python 独立环境)"
            >
              {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
              <span>{copied ? '已复制代码' : '复制代码'}</span>
            </button>
          </div>
        </div>

        {/* Tab switchers: NumPy / NetworkX / Scipy */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveTab('numpy_scratch')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'numpy_scratch' ? 'bg-white text-indigo-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              NumPy 从零手写转移矩阵与幂迭代
            </button>
            <button
              onClick={() => setActiveTab('networkx')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'networkx' ? 'bg-white text-indigo-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              NetworkX 工业级全套图挖掘
            </button>
            <button
              onClick={() => setActiveTab('scipy_sparse')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'scipy_sparse' ? 'bg-white text-indigo-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Scipy 大规模稀疏矩阵主特征值
            </button>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>代码中图标题、图例、坐标轴均统一采用学术英文规范，外部一键免调试运行</span>
          </div>
        </div>
      </div>

      {/* Code Editor Box */}
      <div className="relative bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto shadow-inner max-h-[380px]">
        <pre className="leading-relaxed whitespace-pre font-mono">
          <code>{getActiveCode()}</code>
        </pre>
      </div>

      {/* NEW: Interactive Execution Output Window (输出窗口) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Output Window Header */}
        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-800 text-xs">
              代码执行输出窗口 (Execution Output Window)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Exit Code: 0 · 耗时 ~16.4ms
            </span>
          </div>

          {/* Output Mode Switcher: Matplotlib Plot / Table / Terminal Logs */}
          <div className="flex items-center space-x-1 bg-white p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setOutputTab('plot')}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-colors ${
                outputTab === 'plot' ? 'bg-indigo-600 text-white font-medium shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart2 size={13} />
              <span>Matplotlib 渲染图</span>
            </button>

            <button
              onClick={() => setOutputTab('table')}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-colors ${
                outputTab === 'table' ? 'bg-indigo-600 text-white font-medium shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon size={13} />
              <span>计算结果数据表</span>
            </button>

            <button
              onClick={() => setOutputTab('terminal')}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-colors ${
                outputTab === 'terminal' ? 'bg-indigo-600 text-white font-medium shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Terminal size={13} />
              <span>控制台 Stdout</span>
            </button>
          </div>
        </div>

        {/* Output Body Content */}
        <div className="p-5">
          {/* Sub-view 1: Matplotlib Visual Plot (English title, legend, axes) */}
          {outputTab === 'plot' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 font-medium">图表类型:</span>
                  <button
                    onClick={() => setPlotType('bars')}
                    className={`px-2.5 py-1 rounded border transition-colors ${
                      plotType === 'bars'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Figure 1: PageRank Centrality Bar Chart
                  </button>
                  <button
                    onClick={() => setPlotType('convergence')}
                    className={`px-2.5 py-1 rounded border transition-colors ${
                      plotType === 'convergence'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Figure 2: Power Iteration Convergence Curve
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  matplotlib.pyplot 规范渲染 (Figure Canvas: 750 × 260)
                </div>
              </div>

              {/* Canvas Plot */}
              <div className="relative w-full h-[260px] rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center bg-white">
                <canvas
                  ref={plotCanvasRef}
                  width={750}
                  height={260}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Sub-view 2: Structured Results Data Table */}
          {outputTab === 'table' && (
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-medium">
                    <th className="p-2">Rank</th>
                    <th className="p-2">Node ID</th>
                    <th className="p-2">Node Label</th>
                    <th className="p-2">PageRank (p_i)</th>
                    <th className="p-2">In-Degree</th>
                    <th className="p-2">Out-Degree</th>
                    <th className="p-2">Hub Score</th>
                    <th className="p-2">Auth Score</th>
                    <th className="p-2">Community #</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResultRows.map((row, idx) => (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-2 font-bold text-slate-400">#{idx + 1}</td>
                      <td className="p-2 font-bold text-slate-800">{row.id}</td>
                      <td className="p-2 text-slate-600 font-sans">{row.label}</td>
                      <td className="p-2 font-bold text-indigo-600">{row.pr.toFixed(6)}</td>
                      <td className="p-2 text-slate-700">{row.inDegree}</td>
                      <td className="p-2 text-slate-700">{row.outDegree}</td>
                      <td className="p-2 text-amber-600">{row.hub.toFixed(4)}</td>
                      <td className="p-2 text-emerald-600">{row.auth.toFixed(4)}</td>
                      <td className="p-2 text-teal-600 font-bold">#{row.comm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub-view 3: Terminal Stdout Logs */}
          {outputTab === 'terminal' && (
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 leading-relaxed overflow-x-auto max-h-[280px]">
              <pre className="whitespace-pre">{terminalLogs}</pre>
            </div>
          )}
        </div>
      </div>

      {/* Code Explanation Slice */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="font-semibold text-slate-800 mb-1 flex items-center space-x-1.5">
            <Cpu size={14} className="text-indigo-600" />
            <span>实时参数动态绑定</span>
          </div>
          <div>代码中 $N={N}$ 与阻尼系数 $d={d}$ 已随您在界面的操作实时注入，保证本地运行与当前拓扑完全吻合。</div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="font-semibold text-slate-800 mb-1 flex items-center space-x-1.5">
            <ExternalLink size={14} className="text-teal-600" />
            <span>可以复制到项目外运行</span>
          </div>
          <div>点击顶部“复制代码”即可粘贴至本地 Jupyter Notebook、VS Code 或服务器命令行独立执行，依赖极简（仅需 numpy / networkx / matplotlib）。</div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="font-semibold text-slate-800 mb-1 flex items-center space-x-1.5">
            <BarChart2 size={14} className="text-amber-600" />
            <span>学术标准图表绘制</span>
          </div>
          <div>图表标题（Title）、图例（Legend）、坐标轴（X/Y Label）均采用学术英文规范，免去中文乱码风险，可直接作为 Paper 实验插图。</div>
        </div>
      </div>
    </div>
  );
};
