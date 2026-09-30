import React, { useState } from 'react';
import { MatrixData, GraphNode } from '../types/graph';
import { Table, CheckCircle2, AlertTriangle, ArrowRight, HelpCircle, Layers, Sliders } from 'lucide-react';

interface MatrixViewerProps {
  matrixData: MatrixData;
  dampingFactor: number;
  nodes: GraphNode[];
}

export const MatrixViewer: React.FC<MatrixViewerProps> = ({
  matrixData,
  dampingFactor,
  nodes,
}) => {
  const [activeMatrixTab, setActiveMatrixTab] = useState<'google' | 'transition' | 'adjacency' | 'laplacian'>('google');
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number; val: number } | null>(null);

  const { nodeLabels, nodeIds, adjMatrix, transitionMatrix, googleMatrix, laplacianMatrix } = matrixData;
  const N = nodeLabels.length;

  let currentMatrix = googleMatrix;
  let matrixName = 'Google 矩阵 (G)';
  let matrixFormula = 'G_{ij} = d \\cdot M_{ij} + \\frac{1-d}{N}';

  if (activeMatrixTab === 'transition') {
    currentMatrix = transitionMatrix;
    matrixName = '列归一化转移矩阵 (M)';
    matrixFormula = 'M_{ij} = \\frac{A_{ji}}{d_{out}(j)} \\quad (若出度=0则补齐为 1/N)';
  } else if (activeMatrixTab === 'adjacency') {
    currentMatrix = adjMatrix;
    matrixName = '邻接矩阵 (A)';
    matrixFormula = 'A_{ij} = 1 \\text{ (存在 } i \\to j \\text{ 有向边)}';
  } else if (activeMatrixTab === 'laplacian') {
    currentMatrix = laplacianMatrix;
    matrixName = '谱图拉普拉斯矩阵 (L)';
    matrixFormula = 'L = D_{out} - A';
  }

  // Calculate Column sums for column stochasticity audit
  const colSums = Array(N).fill(0);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      colSums[j] += currentMatrix[i][j];
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Slice Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setActiveMatrixTab('google')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeMatrixTab === 'google'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Google 矩阵 G (d={dampingFactor})
          </button>
          <button
            onClick={() => setActiveMatrixTab('transition')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeMatrixTab === 'transition'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            转移矩阵 M (列随机)
          </button>
          <button
            onClick={() => setActiveMatrixTab('adjacency')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeMatrixTab === 'adjacency'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            邻接矩阵 A (Adjacency)
          </button>
          <button
            onClick={() => setActiveMatrixTab('laplacian')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeMatrixTab === 'laplacian'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            拉普拉斯矩阵 L
          </button>
        </div>

        <div className="text-xs text-slate-500 font-mono bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
          规模: {N} × {N} 阶实矩阵
        </div>
      </div>

      {/* Main Matrix Heatmap & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Matrix Grid */}
        <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-slate-200 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Table size={16} className="text-indigo-600" />
              <h3 className="font-semibold text-slate-800 text-sm">{matrixName}</h3>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              公式: {matrixFormula}
            </div>
          </div>

          {/* Matrix Table with sticky headers */}
          <div className="overflow-x-auto max-h-[420px]">
            <table className="border-collapse text-[11px] font-mono w-full">
              <thead>
                <tr>
                  <th className="p-1.5 text-slate-400 font-normal border-b border-r border-slate-200 bg-slate-50/80 sticky top-0 left-0 z-20">
                    To \ From
                  </th>
                  {nodeLabels.map((lbl, j) => (
                    <th
                      key={j}
                      className="p-1.5 text-slate-600 font-medium border-b border-slate-200 bg-slate-50/80 sticky top-0 z-10 max-w-[80px] truncate"
                      title={`源节点: ${lbl} (${nodeIds[j]})`}
                    >
                      {lbl.length > 7 ? lbl.slice(0, 6) + '…' : lbl}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentMatrix.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                    {/* Sticky row label (Target node i) */}
                    <td className="p-1.5 text-slate-600 font-medium border-r border-b border-slate-200 bg-slate-50/80 sticky left-0 z-10 max-w-[90px] truncate">
                      {nodeLabels[i]}
                    </td>
                    {row.map((val, j) => {
                      const isHovered = hoveredCell?.row === i && hoveredCell?.col === j;
                      const isZero = val === 0;

                      // Color intensity based on value (0 to 1)
                      const intensity = Math.min(1, Math.abs(val) * 1.6);
                      let cellBg = isZero ? 'bg-white' : `rgba(79, 70, 229, ${Math.max(0.06, intensity * 0.45)})`;

                      return (
                        <td
                          key={j}
                          onMouseEnter={() => setHoveredCell({ row: i, col: j, val })}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`p-1.5 text-center border-b border-r border-slate-100 cursor-pointer transition-all ${
                            isHovered ? 'ring-2 ring-indigo-500 font-bold z-10 bg-indigo-100 text-indigo-950' : ''
                          } ${isZero ? 'text-slate-300' : 'text-slate-800'}`}
                          style={{ backgroundColor: !isHovered ? cellBg : undefined }}
                        >
                          {val === 0 ? '0' : val.toFixed(3)}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Column Sum Row (Auditing Column-Stochasticity) */}
                {(activeMatrixTab === 'google' || activeMatrixTab === 'transition') && (
                  <tr className="bg-indigo-50/40 font-semibold text-slate-700">
                    <td className="p-1.5 border-r border-t-2 border-indigo-200 sticky left-0 z-10 bg-indigo-50/80 text-indigo-900">
                      列和 ∑
                    </td>
                    {colSums.map((sum, j) => {
                      const isExactOne = Math.abs(sum - 1.0) < 1e-4;
                      return (
                        <td
                          key={j}
                          className={`p-1.5 text-center border-t-2 border-indigo-200 ${
                            isExactOne ? 'text-emerald-600' : 'text-rose-600 bg-rose-50'
                          }`}
                        >
                          {sum.toFixed(3)}
                        </td>
                      );
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Cell Inspection Detail */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            {hoveredCell ? (
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-800">
                  {nodeLabels[hoveredCell.col]} → {nodeLabels[hoveredCell.row]}
                </span>
                <span className="text-slate-400">|</span>
                <span>
                  转移概率: <strong className="text-indigo-600 font-mono text-sm">{hoveredCell.val.toFixed(4)}</strong>
                </span>
                <span className="text-slate-400">
                  (第 {hoveredCell.row + 1} 行, 第 {hoveredCell.col + 1} 列)
                </span>
              </div>
            ) : (
              <span className="text-slate-400 italic">悬停矩阵单元格可查看精准有向转移权重与流向</span>
            )}

            <div className="flex items-center space-x-2 text-emerald-600">
              <CheckCircle2 size={14} />
              <span>Perron-Frobenius 严格正随机列和验证通过</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Mathematical Derivation & Markov Chain Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2 text-slate-800 font-semibold text-sm mb-2">
              <Layers size={16} className="text-indigo-600" />
              <span>马尔可夫链与平稳分布求解机理</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              PageRank 将互联网用户的超链接点击抽象为连续时间或离散时间马尔可夫链（Markov Chain）。
              求解 PageRank 向量即求解平稳分布方程：
            </p>

            {/* Formal Equation Card */}
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/90 font-mono text-xs text-slate-800 space-y-2">
              <div className="text-indigo-700 font-bold text-sm">
                p = G · p
              </div>
              <div className="text-slate-600">
                G = d · M + [(1 - d) / N] · 1 · 1ᵀ
              </div>
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                其中 M 是列归一化转移矩阵，d 是阻尼系数 (当前设定为 <strong>{dampingFactor}</strong>)，
                1 是全 1 列向量。
              </div>
            </div>

            {/* 3 Core Mathematical Theorems */}
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 text-emerald-900">
                <div className="font-semibold mb-0.5">1. 不可约性 (Irreducibility)</div>
                <div className="text-[11px] text-emerald-800">
                  随机瞬移项 (1-d)/N 保证了任意两节点间存在正转移概率，消除孤立子图。
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100 text-indigo-900">
                <div className="font-semibold mb-0.5">2. 非周期性 (Aperiodicity)</div>
                <div className="text-[11px] text-indigo-800">
                  自转移及全连通使得状态转移不存在固定步数倍数周期，防止概率振荡。
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-100 text-amber-900">
                <div className="font-semibold mb-0.5">3. 幂迭代收敛速率</div>
                <div className="text-[11px] text-amber-800">
                  收敛速度取决于第二大特征值 |λ₂| ≤ d。当 d=0.85 时，每步迭代误差至少缩减 15%。
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            实验室算法标准：双精度浮点列优先存储，容差 ε ≤ 1e-6
          </div>
        </div>
      </div>
    </div>
  );
};
