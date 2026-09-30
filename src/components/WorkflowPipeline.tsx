import React from 'react';
import { GraphMetrics, GraphNode, GraphEdge } from '../types/graph';
import { CheckCircle2, ArrowRight, Network, Layers, Users, FileText, Sparkles, ChevronRight } from 'lucide-react';

interface WorkflowPipelineProps {
  currentStage: number;
  onStageChange: (stage: number) => void;
  metrics: GraphMetrics;
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNavigateToTab: (tabId: string) => void;
}

const STAGES = [
  {
    step: 1,
    title: '构图与拓扑定义',
    subtitle: '节点/有向边交互定义与四大案例加载',
    icon: Network,
    tabTarget: 'topology',
  },
  {
    step: 2,
    title: '矩阵化与代数推导',
    subtitle: '出度归一化 M 与 Google 矩阵 G',
    icon: Layers,
    tabTarget: 'matrices',
  },
  {
    step: 3,
    title: '幂迭代与特征向量',
    subtitle: 'p^(t+1) = G p^(t) 2D 演播与收敛',
    icon: Sparkles,
    tabTarget: 'power_2d',
  },
  {
    step: 4,
    title: '社区分群与拓扑度量',
    subtitle: 'Louvain 模块度 Q 最大化凝聚',
    icon: Users,
    tabTarget: 'community',
  },
  {
    step: 5,
    title: '分析报告与知识导引',
    subtitle: '拓扑诊断评估与数据报告导出',
    icon: FileText,
    tabTarget: 'export_report',
  },
];

export const WorkflowPipeline: React.FC<WorkflowPipelineProps> = ({
  currentStage,
  onStageChange,
  metrics,
  nodes,
  edges,
  onNavigateToTab,
}) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
            <span>构图 → 矩阵化 → 迭代 → 社区分群 全流程实验室导引</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            按照图挖掘的标准学术工序，一步步推导图拓扑、代数状态矩阵、马尔可夫稳态与社区流形。
          </p>
        </div>

        <div className="text-xs text-slate-500 font-mono bg-slate-50 px-3 py-1 rounded border border-slate-200">
          工序进度: {currentStage} / 5
        </div>
      </div>

      {/* Step Horizontal Stepper Bar */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {STAGES.map((st) => {
          const isDone = st.step < currentStage;
          const isCurrent = st.step === currentStage;
          const Icon = st.icon;

          return (
            <div
              key={st.step}
              onClick={() => {
                onStageChange(st.step);
                onNavigateToTab(st.tabTarget);
              }}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                isCurrent
                  ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-200 shadow-xs'
                  : isDone
                  ? 'bg-slate-50/60 border-emerald-300 hover:border-emerald-400'
                  : 'bg-slate-50/40 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  isCurrent ? 'bg-indigo-600 text-white' : isDone ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  STEP 0{st.step}
                </span>
                {isDone ? (
                  <CheckCircle2 size={15} className="text-emerald-600" />
                ) : (
                  <Icon size={15} className={isCurrent ? 'text-indigo-600' : 'text-slate-400'} />
                )}
              </div>

              <div className="font-semibold text-slate-800 text-xs mb-0.5">
                {st.title}
              </div>
              <div className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                {st.subtitle}
              </div>
            </div>
          );
        })}
      </div>

      {/* Current Step Detailed Context Box */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/90 text-xs flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="font-semibold text-slate-800 flex items-center space-x-2">
            <span>当前工序阶段 #{currentStage}：{STAGES[currentStage - 1].title}</span>
            <ChevronRight size={14} className="text-slate-400" />
            <span className="text-indigo-600 font-normal">
              {currentStage === 1 && `已就绪 ${nodes.length} 个节点，${edges.length} 条有向连接`}
              {currentStage === 2 && `已构建 ${nodes.length}×${nodes.length} 阶转移矩阵 M 与 Google 矩阵 G (d=${metrics.dampingFactor})`}
              {currentStage === 3 && `完成 ${metrics.iterationsToConverge} 步幂迭代，极化度 ${(metrics.polarizationRatio).toFixed(2)}x`}
              {currentStage === 4 && `已凝聚出 ${metrics.communityCount} 个社区 (模块度 Q = ${metrics.modularity})`}
              {currentStage === 5 && `图拓扑各项指标均已测算完毕，可导出完整学术数据分析报告`}
            </span>
          </div>
          <div className="text-slate-500 text-[11px]">
            点击下方按钮可快速切换视图进入该工序的核心演播切片。
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {currentStage > 1 && (
            <button
              onClick={() => {
                const prev = currentStage - 1;
                onStageChange(prev);
                onNavigateToTab(STAGES[prev - 1].tabTarget);
              }}
              className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs transition-colors"
            >
              上一步工序
            </button>
          )}

          {currentStage < 5 && (
            <button
              onClick={() => {
                const next = currentStage + 1;
                onStageChange(next);
                onNavigateToTab(STAGES[next - 1].tabTarget);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <span>进入下一步</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
