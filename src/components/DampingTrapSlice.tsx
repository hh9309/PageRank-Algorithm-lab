import React, { useState } from 'react';
import { GraphNode, GraphEdge } from '../types/graph';
import { computePowerIteration, computeRawIterationWithoutTeleport, computeMatrices } from '../utils/mathUtils';
import { Sliders, ShieldAlert, AlertOctagon, TrendingDown, Sparkles, Check, ArrowRight } from 'lucide-react';

interface DampingTrapSliceProps {
  dampingFactor: number;
  onDampingChange: (d: number) => void;
  nodes: GraphNode[];
  edges: GraphEdge[];
  onLoadPreset?: (presetKey: string) => void;
}

export const DampingTrapSlice: React.FC<DampingTrapSliceProps> = ({
  dampingFactor,
  onDampingChange,
  nodes,
  edges,
  onLoadPreset,
}) => {
  const [activeTrapTab, setActiveTrapTab] = useState<'spider_trap' | 'dead_end' | 'spectral_curve'>('spider_trap');

  // Compute normal iteration with current d
  const matrices = computeMatrices(nodes, edges, dampingFactor);
  const normalSteps = computePowerIteration(matrices.googleMatrix, 20);
  const finalNormalP = normalSteps.length > 0 ? normalSteps[normalSteps.length - 1].pVector : [];

  // Compute unpatched iteration (d=1, no teleport) to demonstrate leaks/absorption
  const rawSteps = computeRawIterationWithoutTeleport(nodes, edges, 20);
  const finalRawP = rawSteps.length > 0 ? rawSteps[rawSteps.length - 1].pVector : [];

  // Calculate sum of probabilities
  const sumNormal = finalNormalP.reduce((a, b) => a + b, 0);
  const sumRaw = finalRawP.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Top Damping Factor Control Deck */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Sliders size={18} className="text-indigo-600" />
              <h3 className="font-semibold text-slate-800 text-sm">
                阻尼系数 (Damping Factor d) 连续调节与解平滑切片
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              阻尼系数决定了网络随机游走者是“沿着超链接继续深入”还是“另起炉灶均匀瞬移”。
            </p>
          </div>

          {/* Quick presets buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onDampingChange(0.85)}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                dampingFactor === 0.85
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              d = 0.85 (工业标准值)
            </button>
            <button
              onClick={() => onDampingChange(1.0)}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                dampingFactor === 1.0
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              d = 1.00 (无瞬移·陷阱暴露)
            </button>
            <button
              onClick={() => onDampingChange(0.5)}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                dampingFactor === 0.5
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              d = 0.50 (强随机探索)
            </button>
            <button
              onClick={() => onDampingChange(0.0)}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                dampingFactor === 0.0
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              d = 0.00 (完全均匀退化 1/N)
            </button>
          </div>
        </div>

        {/* Large Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-mono">0.00 (100% 均匀随机跳转)</span>
            <span className="text-indigo-600 font-mono font-bold text-base bg-indigo-50 px-3 py-0.5 rounded border border-indigo-100">
              d = {dampingFactor.toFixed(2)}
            </span>
            <span className="text-slate-500 font-mono">1.00 (100% 严格链接流转)</span>
          </div>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={dampingFactor}
            onChange={e => onDampingChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />

          <div className="flex justify-between items-center text-[11px] text-slate-400">
            <span>随机游走保留权重: {(dampingFactor * 100).toFixed(0)}%</span>
            <span>全网瞬移补充概率: {((1 - dampingFactor) * 100).toFixed(0)}% (即 (1-d)/N 均分)</span>
            <span>谱半径收敛上界: |λ₂| ≤ {dampingFactor.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Traps Deep Slice Navigation */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveTrapTab('spider_trap')}
          className={`pb-2.5 text-xs font-medium border-b-2 flex items-center space-x-1.5 transition-all ${
            activeTrapTab === 'spider_trap'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert size={15} />
          <span>蜘蛛陷阱切片 (Spider Traps)</span>
        </button>

        <button
          onClick={() => setActiveTrapTab('dead_end')}
          className={`pb-2.5 text-xs font-medium border-b-2 flex items-center space-x-1.5 transition-all ${
            activeTrapTab === 'dead_end'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertOctagon size={15} />
          <span>死胡同切片 (Dead Ends)</span>
        </button>

        <button
          onClick={() => setActiveTrapTab('spectral_curve')}
          className={`pb-2.5 text-xs font-medium border-b-2 flex items-center space-x-1.5 transition-all ${
            activeTrapTab === 'spectral_curve'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingDown size={15} />
          <span>特征值谱隙与收敛速率曲线</span>
        </button>
      </div>

      {/* Slice 1: Spider Traps */}
      {activeTrapTab === 'spider_trap' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-800 text-sm flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span>蜘蛛陷阱 (Spider Traps) 破坏机制</span>
              </h4>
              {onLoadPreset && (
                <button
                  onClick={() => {
                    onLoadPreset('spider_trap_demo');
                    onDampingChange(1.0);
                  }}
                  className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1 rounded border border-rose-200 transition-colors"
                >
                  一键加载陷阱演示网络 (d=1.0)
                </button>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>定义</strong>：一组节点内部存在相互连边，但<strong>没有任何向外发出的超链接</strong>（例如垃圾站互链闭环、自循环死循环）。
            </p>

            <div className="bg-rose-50/60 p-3 rounded-lg border border-rose-200 text-xs text-rose-900 space-y-1.5">
              <div className="font-semibold">【致命后果：概率黑洞吞噬】</div>
              <div>
                若无随机瞬移（$d=1.0$），在迭代过程中，外界节点的所有概率将单向流入陷阱组，且“只进不出”。
                最终陷阱节点占有全网 100% 的 PageRank，其余所有正常节点全部归零！
              </div>
            </div>

            <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
              <div className="font-semibold">【Google 解平滑方案：Teleportation 随机跳转】</div>
              <div>
                引入阻尼项 {'$(1-d)/N$'} 后，陷入蜘蛛陷阱的游走者以 {'$1-d$'} 的概率瞬移跳出，重新注入全局网络，
                打破死循环垄断，恢复非偏置真实排序。
              </div>
            </div>
          </div>

          {/* Probability Distribution Contrast */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <h4 className="font-semibold text-slate-800 text-sm">
              当前图节点概率对比：原始未修补 (d=1.0) vs 阻尼平滑 (d={dampingFactor})
            </h4>

            <div className="space-y-3">
              {nodes.slice(0, 7).map((node, i) => {
                const rawVal = finalRawP[i] || 0;
                const normalVal = finalNormalP[i] || 0;
                return (
                  <div key={node.id} className="text-xs space-y-1">
                    <div className="flex justify-between text-slate-700">
                      <span className="font-medium truncate max-w-[150px]">{node.label}</span>
                      <div className="space-x-3 font-mono">
                        <span className="text-slate-400">无阻尼: {(rawVal * 100).toFixed(1)}%</span>
                        <span className="text-indigo-600 font-bold">平滑后: {(normalVal * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    {/* Comparative double bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2.5 flex overflow-hidden">
                      <div
                        className="bg-slate-400 h-full opacity-60"
                        style={{ width: `${Math.min(100, rawVal * 100)}%` }}
                        title="原始无阻尼概率"
                      />
                      <div
                        className="bg-indigo-600 h-full"
                        style={{ width: `${Math.min(100, normalVal * 100)}%` }}
                        title="阻尼平滑概率"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>全网总概率守恒审计:</span>
              <span className={`font-mono font-bold ${Math.abs(sumNormal - 1.0) < 1e-3 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ∑ p_i = {sumNormal.toFixed(4)} (100% 严格守恒)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Slice 2: Dead Ends */}
      {activeTrapTab === 'dead_end' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-800 text-sm flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span>死胡同 (Dead Ends 悬挂节点) 概率泄露</span>
              </h4>
              {onLoadPreset && (
                <button
                  onClick={() => {
                    onLoadPreset('dead_end_demo');
                    onDampingChange(1.0);
                  }}
                  className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 px-2.5 py-1 rounded border border-amber-200 transition-colors"
                >
                  一键加载死胡同演示网络
                </button>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>定义</strong>：出度为 0 的孤立悬挂网页（Dangling Nodes，如只收录引文的文献、PDF 文档下载页）。
            </p>

            <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <div className="font-semibold">【致命后果：全网概率蒸发泄漏至 0】</div>
              <div>
                若原始转移矩阵未对出度为 0 的列做补齐，该列所有元素为 0。
                根据矩阵乘法 {'$p^{(t+1)} = M p^{(t)}$'}，每经过一步，流向死胡同的概率被直接“丢弃”，
                经过数轮迭代后，全网向量 {'$\\mathbf{p} \\to \\mathbf{0}$'}，矩阵丧失列随机性（Column Stochasticity）！
              </div>
            </div>

            <div className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-200 text-xs text-indigo-900 space-y-1.5">
              <div className="font-semibold">【双阶补齐方案】</div>
              <div>
                1. <strong>首阶填充</strong>：将所有出度为 0 的列补齐为均匀向量 [1/N, ..., 1/N]ᵀ；<br/>
                2. <strong>次阶阻尼</strong>：再进行全网凸组合平滑 {'$G = d M_{补齐} + [(1-d)/N] E$'}。
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4">
            <div>
              <h4 className="font-semibold text-slate-800 text-sm mb-3">
                死胡同未补齐时的概率泄露模拟曲线
              </h4>
              <p className="text-xs text-slate-500 mb-3">
                观察未做补齐处理时，全网总概率质量随迭代轮数的指数衰减：
              </p>

              {/* Decay simulation chart bars */}
              <div className="space-y-2 font-mono text-xs">
                {rawSteps.slice(0, 6).map(s => {
                  const total = s.pVector.reduce((a, b) => a + b, 0);
                  return (
                    <div key={s.step} className="flex items-center space-x-3">
                      <span className="w-16 text-slate-400">Step {s.step}:</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-amber-500 h-full transition-all"
                          style={{ width: `${Math.min(100, total * 100)}%` }}
                        />
                      </div>
                      <span className="w-16 text-right text-slate-700 font-bold">
                        {(total * 100).toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
              经过 Google 矩阵修正后，每步迭代无论是否有死胡同，总概率严格恒为 <strong>1.0000 (100%)</strong>。
            </div>
          </div>
        </div>
      )}

      {/* Slice 3: Spectral Curve & Convergence */}
      {activeTrapTab === 'spectral_curve' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-800 text-sm">
              特征值谱隙（Spectral Gap）与收敛周期理论量化
            </h4>
            <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              谱隙 Δλ = 1 - d = {(1 - dampingFactor).toFixed(3)}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            根据 Perron-Frobenius 理论与谱图定理，Google 矩阵的最大特征值为 $\lambda_1 = 1$。
            其第二大特征值的绝对值满足严格上界：$|\lambda_2| \le d$。
            幂迭代的收敛速度完全取决于 $|\lambda_2 / \lambda_1| = |\lambda_2| \le d$。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-slate-500 mb-1">达到 ε=1e-6 所需理论迭代轮数</div>
              <div className="text-xl font-bold font-mono text-indigo-600">
                {dampingFactor > 0.05
                  ? Math.ceil(Math.log(1e-6) / Math.log(Math.max(0.01, dampingFactor)))
                  : 1}{' '}
                轮
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                公式: k ≈ log(ε) / log(d)
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-slate-500 mb-1">每轮迭代误差缩减率</div>
              <div className="text-xl font-bold font-mono text-emerald-600">
                {(100 - dampingFactor * 100).toFixed(0)}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                每轮残差至少萎缩至前一轮的 d 倍
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-slate-500 mb-1">图拓扑结构真实度保留比</div>
              <div className="text-xl font-bold font-mono text-amber-600">
                {(dampingFactor * 100).toFixed(0)}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                d 越接近 1，越忠实反映物理超链接关系
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
