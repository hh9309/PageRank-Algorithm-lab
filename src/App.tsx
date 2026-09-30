import React, { useState, useMemo } from 'react';
import { GRAPH_PRESETS } from './utils/presets';
import { GraphNode, GraphEdge, GraphData } from './types/graph';
import {
  computeMatrices,
  computePowerIteration,
  analyzeGraphTopology,
} from './utils/mathUtils';
import { Header } from './components/Header';
import { ForceGraph2D } from './components/ForceGraph2D';
import { PowerIteration2D } from './components/PowerIteration2D';
import { MatrixViewer } from './components/MatrixViewer';
import { DampingTrapSlice } from './components/DampingTrapSlice';
import { CommunityLouvain } from './components/CommunityLouvain';
import { CodeEngine } from './components/CodeEngine';
import { WorkflowPipeline } from './components/WorkflowPipeline';
import { ExportEngine } from './components/ExportEngine';
import { KnowledgeSlices } from './components/KnowledgeSlices';
import { AiConsultantView } from './components/AiConsultantView';
import {
  Network,
  Layers,
  Sparkles,
  ShieldAlert,
  Users,
  Terminal,
  FileText,
  BookOpen,
  ChevronRight,
  TrendingUp,
  Activity,
  Award,
  Plus,
  RefreshCw,
} from 'lucide-react';

export default function App() {
  const [currentPresetKey, setCurrentPresetKey] = useState<string>('github');
  const [activeTab, setActiveTab] = useState<string>('topology');
  const [dampingFactor, setDampingFactor] = useState<number>(0.85);

  // Graph data state
  const [graphData, setGraphData] = useState<GraphData>(() => GRAPH_PRESETS['github']);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [colorMode, setColorMode] = useState<'community' | 'pagerank' | 'hubauth' | 'traps'>('community');

  // Iteration step for 3D player
  const [iterationStepIdx, setIterationStepIdx] = useState<number>(0);

  // Workflow pipeline step
  const [workflowStage, setWorkflowStage] = useState<number>(1);

  // Load preset handler
  const handleSelectPreset = (key: string) => {
    setCurrentPresetKey(key);
    if (GRAPH_PRESETS[key]) {
      setGraphData(GRAPH_PRESETS[key]);
      setSelectedNodeId(null);
      setIterationStepIdx(0);
    }
  };

  // Import custom graph handler
  const handleImportGraph = (newNodes: GraphNode[], newEdges: GraphEdge[], name: string) => {
    setCurrentPresetKey('custom');
    setGraphData({
      nodes: newNodes,
      edges: newEdges,
      name,
      description: '用户自定义导入数据集',
    });
    setSelectedNodeId(null);
    setIterationStepIdx(0);
  };

  // Recalculate full graph metrics, decorated nodes, matrices, and power iterations
  const { metrics, decoratedNodes, matrixData, iterationSteps } = useMemo(() => {
    const { metrics: m, decoratedNodes: dNodes } = analyzeGraphTopology(
      graphData.nodes,
      graphData.edges,
      dampingFactor
    );
    const mData = computeMatrices(dNodes, graphData.edges, dampingFactor);
    const itSteps = computePowerIteration(mData.googleMatrix, 40, 1e-6);

    return {
      metrics: m,
      decoratedNodes: dNodes,
      matrixData: mData,
      iterationSteps: itSteps,
    };
  }, [graphData.nodes, graphData.edges, dampingFactor]);

  // Selected node object
  const selectedNode = decoratedNodes.find(n => n.id === selectedNodeId) || null;

  // Sorted nodes by PageRank for ranking table
  const sortedNodes = useMemo(() => {
    return [...decoratedNodes].sort((a, b) => (b.pageRank || 0) - (a.pageRank || 0));
  }, [decoratedNodes]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      {/* Header with Preset Selector, Damping Slider & Tabs */}
      <Header
        currentPresetKey={currentPresetKey}
        onSelectPreset={handleSelectPreset}
        dampingFactor={dampingFactor}
        onDampingChange={setDampingFactor}
        activeMainTab={activeTab}
        onTabChange={setActiveTab}
        nodeCount={graphData.nodes.length}
        edgeCount={graphData.edges.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-6">
        {/* Top Metric Bar with Clean Scholarly Aesthetic */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="text-[11px] text-slate-400 font-medium">图规模 (N / E)</div>
            <div className="text-base font-bold font-mono text-slate-800 mt-0.5">
              {metrics.nodeCount} <span className="text-slate-400 font-normal">/</span> {metrics.edgeCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">密度: {(metrics.density * 100).toFixed(1)}%</div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="text-[11px] text-slate-400 font-medium">阻尼系数 d</div>
            <div className="text-base font-bold font-mono text-indigo-600 mt-0.5">
              {metrics.dampingFactor.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">瞬移: {((1 - metrics.dampingFactor) * 100).toFixed(0)}%</div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="text-[11px] text-slate-400 font-medium">死胡同 (Dead Ends)</div>
            <div className={`text-base font-bold font-mono mt-0.5 ${metrics.deadEndCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {metrics.deadEndCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">出度为 0 悬挂</div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="text-[11px] text-slate-400 font-medium">蜘蛛陷阱 (Traps)</div>
            <div className={`text-base font-bold font-mono mt-0.5 ${metrics.spiderTrapCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {metrics.spiderTrapCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">闭环自吸收</div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="text-[11px] text-slate-400 font-medium">模块度 (Modularity Q)</div>
            <div className="text-base font-bold font-mono text-teal-600 mt-0.5">
              {metrics.modularity.toFixed(3)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{metrics.communityCount} 社区凝聚</div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="text-[11px] text-slate-400 font-medium">幂迭代收敛步数</div>
            <div className="text-base font-bold font-mono text-slate-800 mt-0.5">
              {metrics.iterationsToConverge} 步
            </div>
            <div className="text-[10px] text-emerald-600 mt-0.5 font-mono">容差 ε &lt; 1e-6</div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="text-[11px] text-slate-400 font-medium">Top-1 极化倍比</div>
            <div className="text-base font-bold font-mono text-indigo-700 mt-0.5">
              {metrics.polarizationRatio.toFixed(1)}x
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">vs 全网平均权重</div>
          </div>
        </div>

        {/* Tab 1: Topology & Force Graph */}
        {activeTab === 'topology' && (
          <div className="space-y-6">
            {/* Top preset description & visual color mode switch */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-semibold text-slate-800">{graphData.name}</span>
                <span className="text-slate-400 mx-2">|</span>
                <span className="text-slate-500">{graphData.description}</span>
              </div>

              {/* Color Mode Pill */}
              <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                <span className="text-slate-500 px-2">节点着色:</span>
                <button
                  onClick={() => setColorMode('community')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    colorMode === 'community' ? 'bg-white text-indigo-700 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  社区归属
                </button>
                <button
                  onClick={() => setColorMode('pagerank')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    colorMode === 'pagerank' ? 'bg-white text-indigo-700 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  PageRank 权重
                </button>
                <button
                  onClick={() => setColorMode('hubauth')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    colorMode === 'hubauth' ? 'bg-white text-indigo-700 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hub/Auth 属性
                </button>
                <button
                  onClick={() => setColorMode('traps')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    colorMode === 'traps' ? 'bg-white text-indigo-700 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  陷阱/死胡同标记
                </button>
              </div>
            </div>

            {/* Force Graph Interactive Visualizer */}
            <ForceGraph2D
              nodes={decoratedNodes}
              edges={graphData.edges}
              onNodesChange={nodes => setGraphData(prev => ({ ...prev, nodes }))}
              onEdgesChange={edges => setGraphData(prev => ({ ...prev, edges }))}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              colorMode={colorMode}
            />

            {/* Ranking Table & Node Inspector Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Ranking Table (2 Cols) */}
              <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Award size={16} className="text-indigo-600" />
                    <h3 className="font-semibold text-slate-800 text-sm">
                      节点 PageRank 与中心性全量排序表
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    排序准则: PageRank 降序
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[360px]">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-normal bg-slate-50/70">
                        <th className="p-2">排名</th>
                        <th className="p-2">节点标识</th>
                        <th className="p-2">PageRank</th>
                        <th className="p-2">入度 (In)</th>
                        <th className="p-2">出度 (Out)</th>
                        <th className="p-2">Hub得分</th>
                        <th className="p-2">Auth得分</th>
                        <th className="p-2">所属社区</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedNodes.map((n, idx) => {
                        const isSelected = n.id === selectedNodeId;
                        return (
                          <tr
                            key={n.id}
                            onClick={() => setSelectedNodeId(isSelected ? null : n.id)}
                            className={`border-b border-slate-100 hover:bg-indigo-50/40 cursor-pointer transition-colors ${
                              isSelected ? 'bg-indigo-50/80 font-semibold text-indigo-900' : 'text-slate-700'
                            }`}
                          >
                            <td className="p-2 font-bold text-slate-400">
                              #{idx + 1}
                            </td>
                            <td className="p-2 font-medium font-sans">
                              {n.label}
                            </td>
                            <td className="p-2 font-bold text-indigo-600">
                              {(n.pageRank || 0).toFixed(5)}
                            </td>
                            <td className="p-2">{n.inDegree}</td>
                            <td className="p-2">{n.outDegree}</td>
                            <td className="p-2 text-amber-600">{(n.hubScore || 0).toFixed(3)}</td>
                            <td className="p-2 text-emerald-600">{(n.authScore || 0).toFixed(3)}</td>
                            <td className="p-2 text-teal-600">#{n.community ?? 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Node Inspector Card (1 Col) */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm mb-3">
                    选中节点特征深度剖析
                  </h4>

                  {selectedNode ? (
                    <div className="space-y-3 text-xs text-slate-600">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="font-bold text-slate-900 text-sm">{selectedNode.label}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {selectedNode.id}</div>
                        {selectedNode.category && (
                          <div className="text-[11px] text-indigo-600 mt-1">
                            类别: {selectedNode.category}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 font-mono">
                        <div className="p-2 bg-indigo-50/50 rounded border border-indigo-100">
                          <span className="text-slate-400 block text-[10px]">PageRank:</span>
                          <strong className="text-indigo-700 text-sm">{(selectedNode.pageRank || 0).toFixed(5)}</strong>
                        </div>
                        <div className="p-2 bg-teal-50/50 rounded border border-teal-100">
                          <span className="text-slate-400 block text-[10px]">所属社区:</span>
                          <strong className="text-teal-700 text-sm">#{selectedNode.community ?? 0}</strong>
                        </div>
                        <div className="p-2 bg-amber-50/50 rounded border border-amber-100">
                          <span className="text-slate-400 block text-[10px]">Hub Score:</span>
                          <strong className="text-amber-700 text-sm">{(selectedNode.hubScore || 0).toFixed(4)}</strong>
                        </div>
                        <div className="p-2 bg-emerald-50/50 rounded border border-emerald-100">
                          <span className="text-slate-400 block text-[10px]">Auth Score:</span>
                          <strong className="text-emerald-700 text-sm">{(selectedNode.authScore || 0).toFixed(4)}</strong>
                        </div>
                      </div>

                      {/* Warnings if trap/dead end */}
                      {selectedNode.isSpiderTrap && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[11px]">
                          <strong>⚠ 蜘蛛陷阱警示：</strong>此节点位于封闭循环回路，在无阻尼瞬移时将完全吞噬外界概率！
                        </div>
                      )}
                      {selectedNode.isDeadEnd && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[11px]">
                          <strong>⚠ 死胡同警示：</strong>出度为 0，若未做列补齐将导致全网概率泄露为 0。
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      在左侧图拓扑中点击或在排序表中选中任一节点，查看代数贡献机理。
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                  可拖拽节点自定义拓扑，或点击顶部“加边”交互新增连接
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Algebraic Modeling & Transition Matrix */}
        {activeTab === 'matrices' && (
          <MatrixViewer
            matrixData={matrixData}
            dampingFactor={dampingFactor}
            nodes={decoratedNodes}
          />
        )}

        {/* Tab 3: 2D Power Iteration Visualization */}
        {activeTab === 'power_2d' && (
          <PowerIteration2D
            nodes={decoratedNodes}
            edges={graphData.edges}
            iterationSteps={iterationSteps}
            currentStepIndex={iterationStepIdx}
            onStepChange={setIterationStepIdx}
            dampingFactor={dampingFactor}
          />
        )}

        {/* Tab 4: Damping Factor & Traps Slice */}
        {activeTab === 'damping_traps' && (
          <DampingTrapSlice
            dampingFactor={dampingFactor}
            onDampingChange={setDampingFactor}
            nodes={decoratedNodes}
            edges={graphData.edges}
            onLoadPreset={handleSelectPreset}
          />
        )}

        {/* Tab 5: Community Louvain */}
        {activeTab === 'community' && (
          <CommunityLouvain
            nodes={decoratedNodes}
            edges={graphData.edges}
          />
        )}

        {/* Tab 6: Python / NetworkX Code Engine */}
        {activeTab === 'code_engine' && (
          <CodeEngine
            nodes={decoratedNodes}
            edges={graphData.edges}
            dampingFactor={dampingFactor}
          />
        )}

        {/* Tab 7: 5-Stage Interactive Workflow Guide */}
        {activeTab === 'workflow' && (
          <div className="space-y-6">
            <WorkflowPipeline
              currentStage={workflowStage}
              onStageChange={setWorkflowStage}
              metrics={metrics}
              nodes={decoratedNodes}
              edges={graphData.edges}
              onNavigateToTab={setActiveTab}
            />

            {/* Quick Embedded Preview based on Workflow Stage */}
            {workflowStage === 1 && (
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="font-semibold text-slate-800 text-sm mb-3">当前图拓扑画布</div>
                <ForceGraph2D
                  nodes={decoratedNodes}
                  edges={graphData.edges}
                  onNodesChange={nodes => setGraphData(prev => ({ ...prev, nodes }))}
                  onEdgesChange={edges => setGraphData(prev => ({ ...prev, edges }))}
                  colorMode={colorMode}
                />
              </div>
            )}
            {workflowStage === 2 && (
              <MatrixViewer
                matrixData={matrixData}
                dampingFactor={dampingFactor}
                nodes={decoratedNodes}
              />
            )}
            {workflowStage === 3 && (
              <PowerIteration2D
                nodes={decoratedNodes}
                edges={graphData.edges}
                iterationSteps={iterationSteps}
                currentStepIndex={iterationStepIdx}
                onStepChange={setIterationStepIdx}
                dampingFactor={dampingFactor}
              />
            )}
            {workflowStage === 4 && (
              <CommunityLouvain
                nodes={decoratedNodes}
                edges={graphData.edges}
              />
            )}
            {workflowStage === 5 && (
              <ExportEngine
                nodes={decoratedNodes}
                edges={graphData.edges}
                metrics={metrics}
                matrixData={matrixData}
                caseName={graphData.name}
                onImportGraph={handleImportGraph}
              />
            )}
          </div>
        )}

        {/* Tab 8: Dataset Download & Report Export Engine */}
        {activeTab === 'export_report' && (
          <ExportEngine
            nodes={decoratedNodes}
            edges={graphData.edges}
            metrics={metrics}
            matrixData={matrixData}
            caseName={graphData.name}
            onImportGraph={handleImportGraph}
          />
        )}

        {/* Tab 9: Knowledge Slices & Pitfall Alerts */}
        {activeTab === 'knowledge' && (
          <KnowledgeSlices />
        )}

        {/* Tab 10: AI 随诊专家 (Full-Width High-Legibility Module) */}
        {activeTab === 'ai_consultant' && (
          <AiConsultantView
            metrics={metrics}
            nodes={decoratedNodes}
            edges={graphData.edges}
            caseName={graphData.name}
          />
        )}
      </main>
    </div>
  );
}
