import React from 'react';
import { GRAPH_PRESETS } from '../utils/presets';
import { Network, Database, Sliders, Layers, Activity, ShieldAlert, Users, Terminal, FileText, BookOpen, Compass, Bot } from 'lucide-react';

interface HeaderProps {
  currentPresetKey: string;
  onSelectPreset: (key: string) => void;
  dampingFactor: number;
  onDampingChange: (d: number) => void;
  activeMainTab: string;
  onTabChange: (tabId: string) => void;
  nodeCount: number;
  edgeCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentPresetKey,
  onSelectPreset,
  dampingFactor,
  onDampingChange,
  activeMainTab,
  onTabChange,
  nodeCount,
  edgeCount,
}) => {
  const tabs = [
    { id: 'topology', label: '拓扑图布局', icon: Network },
    { id: 'matrices', label: '代数与转移矩阵', icon: Layers },
    { id: 'power_2d', label: '幂迭代 2D 演播', icon: Activity },
    { id: 'damping_traps', label: '阻尼与陷阱切片', icon: ShieldAlert },
    { id: 'community', label: 'Louvain 社区发现', icon: Users },
    { id: 'code_engine', label: 'Python 代码引擎', icon: Terminal },
    { id: 'workflow', label: '全流程导引', icon: Compass },
    { id: 'export_report', label: '数据与报告导出', icon: FileText },
    { id: 'knowledge', label: '知识导引', icon: BookOpen },
    { id: 'ai_consultant', label: 'AI 随诊专家', icon: Bot, isSpecial: true },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      {/* Top Banner with Branding & Global Parameters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Network size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-slate-900 text-base tracking-tight font-sans">
                  PageRank 与图结构挖掘实验室
                </h1>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Lab v2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                马尔可夫链稳态分布 · 2D 向量幂迭代 · 社区拓扑流形 · 学术级交互仿真
              </p>
            </div>
          </div>

          {/* Preset Selector & Damping Quick Slider */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* 4 Classic Cases dropdown */}
            <div className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <Database size={14} className="text-slate-500" />
              <span className="text-slate-600 font-medium">实战案例:</span>
              <select
                value={currentPresetKey}
                onChange={e => onSelectPreset(e.target.value)}
                className="bg-transparent font-medium text-indigo-700 focus:outline-none cursor-pointer"
              >
                <option value="github">GitHub 开发者网络 (11节点)</option>
                <option value="academic">学术论文引用网络 (8节点)</option>
                <option value="twitter">Twitter 话题传播图 (8节点)</option>
                <option value="www">万维网网页链接拓扑 (8节点)</option>
                <option value="spider_trap_demo">蜘蛛陷阱切片演示 (4节点)</option>
                <option value="dead_end_demo">死胡同切片演示 (4节点)</option>
              </select>
            </div>

            {/* Global Damping Factor inline pill */}
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-600 font-medium">阻尼系数 d:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={dampingFactor}
                onChange={e => onDampingChange(parseFloat(e.target.value))}
                className="w-20 h-1.5 bg-slate-300 rounded appearance-none accent-indigo-600 cursor-pointer"
              />
              <span className="font-mono font-bold text-indigo-600 w-8 text-right">
                {dampingFactor.toFixed(2)}
              </span>
            </div>

            {/* Quick stats */}
            <div className="hidden lg:flex items-center space-x-2 text-slate-500 font-mono text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <span>N: <strong className="text-slate-800">{nodeCount}</strong></span>
              <span>E: <strong className="text-slate-800">{edgeCount}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Slice Tabs */}
      <div className="border-t border-slate-100 bg-slate-50/70 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex space-x-1 py-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeMainTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? tab.isSpecial
                      ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                      : 'bg-white text-indigo-700 shadow-2xs border border-slate-200/80 font-semibold'
                    : tab.isSpecial
                    ? 'text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon size={13} className={isActive ? (tab.isSpecial ? 'text-white' : 'text-indigo-600') : (tab.isSpecial ? 'text-indigo-600' : 'text-slate-400')} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
