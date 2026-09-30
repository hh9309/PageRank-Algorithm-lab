import React, { useState } from 'react';
import { GraphNode, GraphEdge, GraphMetrics, MatrixData } from '../types/graph';
import { GRAPH_PRESETS } from '../utils/presets';
import {
  Download,
  Upload,
  FileText,
  Table,
  Check,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  Code,
  Copy,
  FolderDown,
  Layers,
  Database,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Compass,
} from 'lucide-react';

interface ExportEngineProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metrics: GraphMetrics;
  matrixData: MatrixData;
  caseName: string;
  onImportGraph?: (newNodes: GraphNode[], newEdges: GraphEdge[], name: string) => void;
}

export const ExportEngine: React.FC<ExportEngineProps> = ({
  nodes,
  edges,
  metrics,
  matrixData,
  caseName,
  onImportGraph,
}) => {
  const [importText, setImportText] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Preview Mode: 'rendered' (Formatted paper preview) | 'source' (Markdown source)
  const [previewMode, setPreviewMode] = useState<'rendered' | 'source'>('rendered');
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // Helper to trigger file download
  const triggerDownload = (filename: string, content: string, mimeType: string = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Download EdgeList CSV for a specific preset
  const handleDownloadPresetEdgeList = (presetKey: string) => {
    const preset = GRAPH_PRESETS[presetKey];
    if (!preset) return;

    const headers = ['source', 'target', 'weight'];
    const rows = preset.edges.map(e => `"${e.source}","${e.target}",${e.weight || 1}`);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    triggerDownload(`${presetKey}_edgelist.csv`, csvContent, 'text/csv;charset=utf-8');
  };

  // 2. Download JSON Raw Graph for a specific preset
  const handleDownloadPresetJSON = (presetKey: string) => {
    const preset = GRAPH_PRESETS[presetKey];
    if (!preset) return;

    const jsonContent = JSON.stringify(preset, null, 2);
    triggerDownload(`${presetKey}_graph_data.json`, jsonContent, 'application/json');
  };

  // 3. Export Current Graph PageRank CSV
  const handleExportPageRankCSV = () => {
    const headers = ['node_id', 'label', 'pagerank', 'in_degree', 'out_degree', 'hub_score', 'auth_score', 'community'];
    const rows = nodes.map(n => [
      `"${n.id}"`,
      `"${n.label.replace(/"/g, '""')}"`,
      (n.pageRank || 0).toFixed(6),
      n.inDegree || 0,
      n.outDegree || 0,
      (n.hubScore || 0).toFixed(4),
      (n.authScore || 0).toFixed(4),
      n.community !== undefined ? n.community : 0,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    triggerDownload(`pagerank_ranking_${Date.now()}.csv`, csvContent, 'text/csv;charset=utf-8');
  };

  // 4. Export Current Adjacency Matrix CSV
  const handleExportMatrixCSV = () => {
    const headers = ['target_node', ...matrixData.nodeIds];
    const rows = matrixData.adjMatrix.map((row, i) => [
      `"${matrixData.nodeIds[i]}"`,
      ...row.map(v => v.toString()),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    triggerDownload(`adjacency_matrix_${Date.now()}.csv`, csvContent, 'text/csv;charset=utf-8');
  };

  // 5. Generate Full 6-Part Workflow Pipeline Markdown Report
  const generateMarkdownReport = () => {
    const dateStr = new Date().toLocaleString();
    const sortedNodes = [...nodes].sort((a, b) => (b.pageRank || 0) - (a.pageRank || 0));

    const maxOut = Math.max(...nodes.map(n => n.outDegree || 0), 0);

    return `# PageRank 与图结构挖掘体系化学术实验报告
- **实验时间**: ${dateStr}
- **案例拓扑**: ${caseName}
- **计算核心**: 马尔可夫稳态链 · 幂迭代 · Perron-Frobenius 谱分解 · Louvain 模块度

---

## 第一部分：图拓扑定义与原始数据结构 (Graph Topology & Raw Data)
- **节点集合规模 ($|V|$)**: ${metrics.nodeCount} 个实体节点
- **有向连边规模 ($|E|$)**: ${metrics.edgeCount} 条有向关系边
- **网络图稀疏密度 (Density)**: ${(metrics.density * 100).toFixed(2)}% (符合真实大尺度稀疏拓扑特征)
- **度数极值分布**: 最大入度为 ${metrics.maxInDegree}，最大出度为 ${maxOut}
- **拓扑结构描述**: 原始有向边代表网页超链接、学术引用或开发者代码依赖，入度反映直接引流，出度反映权威向外投射能力。

---

## 第二部分：代数建模与列随机转移矩阵 (Algebraic Modeling & Stochastic Matrix)
- **邻接矩阵映射 ($A$)**: 采用 $N \\times N$ 阶方阵表征连接关系，$A_{i,j}=1$ 代表节点 $i$ 指向节点 $j$。
- **列随机转移矩阵 ($M$)**: 
  - 对每个节点 $j$，其出度为 $k_j^{\\text{out}}$。若 $k_j^{\\text{out}} > 0$，则转移列向量元素为 $M_{i,j} = \\frac{A_{j,i}}{k_j^{\\text{out}}}$；
  - **死胡同 (Dead Ends) 悬挂节点补齐**: 检测到当前拓扑存在 **${metrics.deadEndCount}** 个出度为 0 的节点。为防止矩阵乘法过程中总概率衰减泄漏，系统自动对其列向量实施均匀填补：$M_{*,j} = \\frac{1}{N}\\mathbf{1}$；
  - **列和守恒性**: 矩阵满足严格列随机性，即对任意列 $j$，均有 $\\sum_{i=1}^N M_{i,j} = 1.000$。

---

## 第三部分：Google 阻尼矩阵与谱隙分析 (Google Matrix & Spectral Gap)
- **阻尼矩阵构造方程**:
  $$G = d M + \\frac{1-d}{N} \\mathbf{1}\\mathbf{1}^T$$
  其中阻尼系数设定为 **$d = ${metrics.dampingFactor}**，瞬移跳转概率为 **${((1 - metrics.dampingFactor) * 100).toFixed(1)}%**（即 $\\frac{1-d}{N} = {((1 - metrics.dampingFactor) / (nodes.length || 1)).toFixed(6)}$）。
- **Perron-Frobenius 定理满足度**: 
  - 矩阵 $G$ 的所有元素严格正定（$G_{ij} > 0$），保证转移系统满足**不可约性（Irreducibility）**与**非周期性（Aperiodicity）**；
  - 存在唯一实数主特征值 $\\lambda_1 = 1.000$，且对应的稳态特征向量 $p^*$ 严格正定。
- **谱图特征隙 (Spectral Gap)**:
  - 第二特征值模长上界: $|\\lambda_2| \\le d = ${metrics.dampingFactor}；
  - 谱隙: $\\Delta\\lambda = 1 - d = ${(1 - metrics.dampingFactor).toFixed(3)}，该值直接决定了幂迭代的指数级几何收敛速率。

---

## 第四部分：幂迭代 2D 演播与稳态分布收敛 (Power Iteration & Convergence Dynamics)
- **迭代递推公式**: $p^{(t+1)} = G p^{(t)}$，初始概率向量采用均匀基准 $p^{(0)} = \\frac{1}{N}\\mathbf{1}$；
- **收敛终止准则**: 采用 L1-范数残差判据 $\\|p^{(t+1)} - p^{(t)}\\|_1 < \\epsilon = 10^{-6}$；
- **实际收敛轮数**: 历经 **${metrics.iterationsToConverge}** 轮平滑投影迭代达成全网稳态；
- **动态轨迹表征**: 各节点概率从初始值 $1/N = ${(1 / (nodes.length || 1)).toFixed(4)} 开始分化，高入度与高质量上游节点稳步上升，边缘悬挂节点自适应回落至水平渐近稳态。

---

## 第五部分：Louvain 模块度最大化与社区分群拓扑 (Louvain Modularity & Community)
- **模块度得分 (Modularity Q)**: **$Q = ${metrics.modularity}**
  - 根据复杂网络拓扑理论，$Q > 0.3$ 表明该图具备显著的非随机社区聚集流形结构；
- **社区划分结构**: 全网共识别凝聚出 **${metrics.communityCount}** 个高内聚模块社团；
- **连边分布剖析**:
  - 社区内部紧密连边（Intra-Community Edges）占据主导，构成了领域内的高频交互与协同流；
  - 跨社区桥接边（Inter-Community Edges）承载弱连接通道，扮演跨领域的关键信息扩散枢纽。

---

## 第六部分：权威度中心性全景排序与综合拓扑诊断 (Centrality Ranking & Diagnosis)
- **中心性极化倍比**: Top-1 节点相比全网均匀均值达到 **${metrics.polarizationRatio}x** 权重倍比；
- **蜘蛛陷阱与黑洞风险**: 拓扑内检测到 **${metrics.spiderTrapCount}** 处强连通环路陷阱，阻尼瞬移项成功瓦解了概率黑洞，使外界节点 PageRank 免于归零；
- **全节点多维指标排名表**:

| 排名 | 节点标识 (ID) | 节点名称 | PageRank (p_i) | 入度 | 出度 | Hub得分 | Auth得分 | 所属社区 |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
${sortedNodes.map((n, idx) => `| ${idx + 1} | \`${n.id}\` | ${n.label} | **${(n.pageRank || 0).toFixed(5)}** | ${n.inDegree || 0} | ${n.outDegree || 0} | ${(n.hubScore || 0).toFixed(3)} | ${(n.authScore || 0).toFixed(3)} | #${n.community ?? 0} |`).join('\n')}

- **综合学术诊断建议**:
  1. 当前拓扑满足大规模网络幂律分布特征，建议在个性化召回场景下升级为 **Personalized PageRank (PPR)**；
  2. 对于含有明显索引枢纽页的子拓扑，可协同 **Kleinberg HITS** 算法进行 Hub/Authority 双向互利强化。
`;
  };

  const markdownContent = generateMarkdownReport();

  // Export Markdown file
  const handleExportMarkdown = () => {
    triggerDownload(`graph_mining_full_report_${Date.now()}.md`, markdownContent, 'text/markdown;charset=utf-8');
  };

  // Copy Markdown Report to Clipboard
  const handleCopyReport = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  // Handle Custom CSV / Edgelist Import
  const handleParseCustomImport = () => {
    try {
      const lines = importText.trim().split('\n');
      if (lines.length === 0 || !importText.trim()) {
        setImportStatus('请输入至少一行数据！');
        return;
      }

      const nodeSet = new Set<string>();
      const parsedEdges: GraphEdge[] = [];

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        let parts = trimmed.split(/,|\t|\s+|->/);
        parts = parts.map(p => p.trim()).filter(Boolean);

        if (parts.length >= 2) {
          const u = parts[0];
          const v = parts[1];
          const w = parts[2] ? parseFloat(parts[2]) : 1;
          nodeSet.add(u);
          nodeSet.add(v);
          parsedEdges.push({
            id: `imported_edge_${idx}`,
            source: u,
            target: v,
            weight: isNaN(w) ? 1 : w,
          });
        }
      });

      if (nodeSet.size === 0 || parsedEdges.length === 0) {
        setImportStatus('未能解析到有效的边！请使用格式: source,target (每行一条)');
        return;
      }

      const parsedNodes: GraphNode[] = Array.from(nodeSet).map(id => ({
        id,
        label: id,
        category: '自定义导入节点',
      }));

      onImportGraph?.(parsedNodes, parsedEdges, `自定义导入拓扑 (${nodeSet.size} 节点)`);
      setImportStatus(`✓ 成功导入 ${nodeSet.size} 个节点, ${parsedEdges.length} 条连边！`);
      setImportText('');
    } catch (e: any) {
      setImportStatus(`解析失败: ${e.message}`);
    }
  };

  const caseKeys = Object.keys(GRAPH_PRESETS);
  const sortedNodes = [...nodes].sort((a, b) => (b.pageRank || 0) - (a.pageRank || 0));

  return (
    <div className="space-y-6">
      {/* 1. Practical Cases Raw Dataset Download Hub (实战案例原始数据下载区) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Database size={18} className="text-indigo-600" />
              <h3 className="font-semibold text-slate-800 text-sm">
                实战案例库原始数据下载专区 (Raw Datasets Download Hub)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              提供实验室全量经典实战案例的原生数据下载，涵盖真实开源开发者网络、引文网络、社交传播与陷阱切片，支持 <strong>EdgeList CSV</strong> 与 <strong>Graph JSON</strong> 双格式。
            </p>
          </div>

          {/* Quick active case download badge */}
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="text-slate-400">当前载入案例:</span>
            <strong className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-sans">
              {caseName}
            </strong>
          </div>
        </div>

        {/* Dataset Cards Grid for each preset */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
          {caseKeys.map(key => {
            const preset = GRAPH_PRESETS[key];
            const isCurrentCase = preset.name.includes(caseName) || caseName.includes(preset.name.split(' ')[0]);

            return (
              <div
                key={key}
                className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                  isCurrentCase
                    ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-100 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-slate-800 truncate max-w-[200px]" title={preset.name}>
                      {preset.name.split(' (')[0]}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                      {preset.nodes.length}点 · {preset.edges.length}边
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                </div>

                {/* Download Buttons */}
                <div className="pt-2 border-t border-slate-200/80 flex items-center space-x-2">
                  <button
                    onClick={() => handleDownloadPresetEdgeList(key)}
                    className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 text-slate-700 rounded-lg text-[11px] font-medium border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                    title={`下载 ${preset.name} 的 CSV 边列表 (source, target, weight)`}
                  >
                    <FileSpreadsheet size={13} className="text-emerald-600" />
                    <span>边列表 CSV</span>
                  </button>

                  <button
                    onClick={() => handleDownloadPresetJSON(key)}
                    className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 text-slate-700 rounded-lg text-[11px] font-medium border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                    title={`下载 ${preset.name} 的完整 JSON 拓扑数据`}
                  >
                    <FolderDown size={13} className="text-indigo-600" />
                    <span>拓扑 JSON</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Structured Report Preview & Export Engine (按全流程导引组织的6大部分报告) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        {/* Header & Report Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <FileText size={18} className="text-indigo-600" />
              <h3 className="font-semibold text-slate-800 text-sm">
                全流程导引学术实验报告 (6-Part Pipeline Mining Report)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              报告严格遵循全流程导引的六大递进步骤系统组织（构图 $\to$ 矩阵化 $\to$ 阻尼切片 $\to$ 幂迭代 $\to$ 社区分群 $\to$ 权威诊断），支持在线排版预览、Markdown 下载与一键打印 PDF。
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setPreviewMode('rendered')}
                className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-colors ${
                  previewMode === 'rendered' ? 'bg-white text-indigo-700 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye size={13} />
                <span>排版预览</span>
              </button>

              <button
                onClick={() => setPreviewMode('source')}
                className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-colors ${
                  previewMode === 'source' ? 'bg-white text-indigo-700 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code size={13} />
                <span>Markdown 源码</span>
              </button>
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopyReport}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            >
              {copiedReport ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              <span>{copiedReport ? '已复制' : '复制全文'}</span>
            </button>

            {/* Download .MD */}
            <button
              onClick={handleExportMarkdown}
              className="flex items-center space-x-1 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            >
              <Download size={13} />
              <span>下载 .MD 报告</span>
            </button>

            {/* Print / Save PDF */}
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            >
              <Printer size={13} />
              <span>打印 / 另存为 PDF</span>
            </button>
          </div>
        </div>

        {/* Report Preview Container */}
        <div className="bg-slate-50/60 rounded-xl border border-slate-200 p-5 max-h-[560px] overflow-y-auto">
          {previewMode === 'rendered' ? (
            /* Formatted Document View (6 Parts strictly organized) */
            <div className="max-w-4xl mx-auto bg-white p-7 rounded-xl border border-slate-200 shadow-xs space-y-6 text-slate-800 font-sans text-xs leading-relaxed">
              {/* Document Header */}
              <div className="text-center pb-4 border-b border-slate-200 space-y-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  PageRank 与图结构挖掘体系化学术实验报告
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500 font-mono">
                  <span>案例: <strong>{caseName}</strong></span>
                  <span>•</span>
                  <span>节点数: <strong>{metrics.nodeCount}</strong></span>
                  <span>•</span>
                  <span>边数: <strong>{metrics.edgeCount}</strong></span>
                  <span>•</span>
                  <span>阻尼系数: <strong>{metrics.dampingFactor}</strong></span>
                  <span>•</span>
                  <span>生成时间: {new Date().toLocaleDateString()}</span>
                </div>
              </div>

              {/* Part 1: Graph Topology & Raw Data Definition */}
              <div className="space-y-2.5">
                <div className="flex items-center space-x-2 text-indigo-700 font-bold text-sm">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-mono">1</span>
                  <h4>第一部分：图拓扑定义与原始数据结构 (Graph Topology & Raw Data)</h4>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">节点规模 (|V|)</span>
                      <strong className="text-slate-800 text-xs">{metrics.nodeCount} 实体</strong>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">连边规模 (|E|)</span>
                      <strong className="text-slate-800 text-xs">{metrics.edgeCount} 有向边</strong>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">图稀疏密度</span>
                      <strong className="text-teal-600 text-xs">{(metrics.density * 100).toFixed(2)}%</strong>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">最大入度</span>
                      <strong className="text-indigo-600 text-xs">{metrics.maxInDegree} 关联</strong>
                    </div>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    有向网络实体与连边反映物理拓扑超链接关系，网络呈现典型大尺度非均质稀疏性。
                  </p>
                </div>
              </div>

              {/* Part 2: Algebraic Modeling & Stochastic Matrix */}
              <div className="space-y-2.5">
                <div className="flex items-center space-x-2 text-teal-700 font-bold text-sm">
                  <span className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-mono">2</span>
                  <h4>第二部分：代数建模与列随机转移矩阵 (Algebraic Modeling & Stochastic Matrix)</h4>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <p className="text-slate-600">
                    图拓扑首先投影为 N×N 阶布尔邻接矩阵 A，经由每个节点出度 k_j(out) 进行列向归一化构建转移概率矩阵 M：
                  </p>
                  <div className="bg-white p-2.5 rounded border border-slate-200 font-mono text-[11px] text-slate-700">
                    {'M[i, j] = A[j, i] / k_j(out) (当 k_j(out) > 0) ； 若 k_j(out) = 0 则列补齐为 1/N'}
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <span>检测到死胡同悬挂节点: <strong>{metrics.deadEndCount}</strong> 个，已通过均匀列补偿保持列和守恒性 ∑ M[i, j] = 1.000。</span>
                  </div>
                </div>
              </div>

              {/* Part 3: Google Damping Matrix & Spectral Gap Analysis */}
              <div className="space-y-2.5">
                <div className="flex items-center space-x-2 text-amber-700 font-bold text-sm">
                  <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-mono">3</span>
                  <h4>第三部分：Google 阻尼矩阵与谱隙分析 (Google Matrix & Spectral Gap)</h4>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <p className="text-slate-600">
                    引入随机游走瞬移因子构建完整的 Google 矩阵 G = d·M + [(1-d)/N]·1·1ᵀ：
                  </p>
                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">阻尼系数 d</span>
                      <strong className="text-indigo-600 text-xs">{metrics.dampingFactor}</strong>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">瞬移跳转概率 (1-d)</span>
                      <strong className="text-amber-600 text-xs">{((1 - metrics.dampingFactor) * 100).toFixed(1)}%</strong>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">谱隙 (Spectral Gap 1-d)</span>
                      <strong className="text-emerald-600 text-xs">{(1 - metrics.dampingFactor).toFixed(3)}</strong>
                    </div>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    根据 Perron-Frobenius 理论，G_{'ij'} &gt; 0 保证马尔可夫链不可约且非周期，第二特征值上界 |λ₂| ≤ d 决定收敛几何速率。
                  </p>
                </div>
              </div>

              {/* Part 4: Power Iteration & Convergence Dynamics */}
              <div className="space-y-2.5">
                <div className="flex items-center space-x-2 text-rose-700 font-bold text-sm">
                  <span className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 text-xs font-mono">4</span>
                  <h4>第四部分：幂迭代 2D 演播与稳态分布收敛 (Power Iteration & Dynamics)</h4>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <p className="text-slate-600">
                    概率向量自均匀初始态 p⁽⁰⁾ = (1/N)·1 展开幂迭代投影：p⁽ᵗ⁺¹⁾ = G·p⁽ᵗ⁾：
                  </p>
                  <div className="flex items-center justify-between p-2.5 bg-white rounded border border-slate-200 font-mono text-[11px]">
                    <div>
                      收敛终止轮数: <strong className="text-indigo-700">{metrics.iterationsToConverge} 步</strong>
                    </div>
                    <div>
                      残差阈值: <strong className="text-emerald-600">||Δp||₁ &lt; 1e-6</strong>
                    </div>
                    <div>
                      主特征值: <strong className="text-slate-800">λ₁ = 1.00000</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Part 5: Louvain Modularity & Community Detection */}
              <div className="space-y-2.5">
                <div className="flex items-center space-x-2 text-purple-700 font-bold text-sm">
                  <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-mono">5</span>
                  <h4>第五部分：Louvain 模块度最大化与社区分群拓扑 (Louvain Modularity & Community)</h4>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">模块度指标值:</span>
                    <strong className="text-teal-700 font-mono text-sm bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      Q = {metrics.modularity} ({metrics.modularity > 0.3 ? '显著模块化结构' : '均匀连通分布'})
                    </strong>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    全网共凝聚划分出 <strong>{metrics.communityCount}</strong> 个高内聚社区，社团内部密集边流与社团间解耦桥接边经由贪心优化达到最佳结构分割。
                  </div>
                </div>
              </div>

              {/* Part 6: Centrality Ranking & Topology Diagnosis */}
              <div className="space-y-2.5">
                <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
                  <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-800 text-xs font-mono">6</span>
                  <h4>第六部分：权威度中心性全景排序与综合拓扑诊断 (Centrality Ranking & Diagnosis)</h4>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                  <div className="text-[11px] text-slate-600 flex items-center justify-between">
                    <span>极化倍比: <strong className="text-indigo-600 font-mono">{metrics.polarizationRatio}x</strong></span>
                    <span>强连通蜘蛛陷阱: <strong className="text-rose-600 font-mono">{metrics.spiderTrapCount} 处</strong></span>
                  </div>

                  {/* Nodes ranking table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-[11px] border-collapse bg-white rounded border border-slate-200">
                      <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600">
                          <th className="p-1.5">Rank</th>
                          <th className="p-1.5">Node ID</th>
                          <th className="p-1.5">名称</th>
                          <th className="p-1.5">PageRank</th>
                          <th className="p-1.5">入度</th>
                          <th className="p-1.5">出度</th>
                          <th className="p-1.5">Hub</th>
                          <th className="p-1.5">Auth</th>
                          <th className="p-1.5">社团</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedNodes.map((n, idx) => (
                          <tr key={n.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-1.5 font-bold text-slate-400">#{idx + 1}</td>
                            <td className="p-1.5 font-bold text-slate-800">{n.id}</td>
                            <td className="p-1.5 text-slate-700 font-sans">{n.label}</td>
                            <td className="p-1.5 font-bold text-indigo-600">{(n.pageRank || 0).toFixed(5)}</td>
                            <td className="p-1.5">{n.inDegree || 0}</td>
                            <td className="p-1.5">{n.outDegree || 0}</td>
                            <td className="p-1.5 text-amber-600">{(n.hubScore || 0).toFixed(3)}</td>
                            <td className="p-1.5 text-emerald-600">{(n.authScore || 0).toFixed(3)}</td>
                            <td className="p-1.5 text-teal-600 font-bold">#{n.community ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Markdown Source View */
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-200 font-mono text-xs leading-relaxed overflow-x-auto shadow-inner">
              <pre className="whitespace-pre font-mono">{markdownContent}</pre>
            </div>
          )}
        </div>
      </div>

      {/* 3. CSV / Edgelist Custom Import Engine */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center space-x-2">
          <Upload size={18} className="text-indigo-600" />
          <h3 className="font-semibold text-slate-800 text-sm">
            自定义图数据集导入 (CSV / 边列表格式)
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          支持直接粘贴外部数据（每行一个有向连边 <code>source,target</code> 或 <code>source -&gt; target</code>），系统将自动重置矩阵并执行全流程图挖掘演播。
        </p>

        <div className="space-y-2">
          <textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            rows={3}
            placeholder={`示例数据格式 (直接粘贴)：\nNodeA,NodeB\nNodeB,NodeC\nNodeC,NodeA\nNodeA,NodeD`}
            className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {importStatus && (
                <span className={importStatus.includes('✓') ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                  {importStatus}
                </span>
              )}
            </div>

            <button
              onClick={handleParseCustomImport}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            >
              解析并导入拓扑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
