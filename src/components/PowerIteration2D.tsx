import React, { useState, useEffect, useRef } from 'react';
import { GraphNode, GraphEdge, IterationStep } from '../types/graph';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Activity, TrendingDown, Layers, BarChart2, CheckCircle2, Sparkles } from 'lucide-react';

interface PowerIteration2DProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  iterationSteps: IterationStep[];
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  dampingFactor: number;
}

export const PowerIteration2D: React.FC<PowerIteration2DProps> = ({
  nodes,
  edges,
  iterationSteps,
  currentStepIndex,
  onStepChange,
  dampingFactor,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(800); // ms per step
  const trajectoryCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const residualCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const N = nodes.length;
  const maxStep = Math.max(0, iterationSteps.length - 1);
  const currentStep = iterationSteps[currentStepIndex] || {
    step: 0,
    delta: 1.0,
    maxDiff: 1.0,
    pVector: Array(N).fill(1 / (N || 1)),
  };

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      onStepChange(currentStepIndex >= maxStep ? 0 : currentStepIndex + 1);
    }, playbackSpeed);
    return () => clearInterval(timer);
  }, [isPlaying, currentStepIndex, maxStep, playbackSpeed, onStepChange]);

  // Color palette for nodes in line charts
  const NODE_COLORS = [
    '#4f46e5', '#0d9488', '#d97706', '#e11d48', '#7c3aed',
    '#059669', '#0284c7', '#db2777', '#ca8a04', '#ea580c', '#475569'
  ];

  // Draw 2D Trajectory Line Canvas (p_i^(0) -> p_i^(t))
  useEffect(() => {
    const canvas = trajectoryCanvasRef.current;
    if (!canvas || iterationSteps.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 25, right: 30, bottom: 35, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Find max probability across all steps
    let maxP = 0.05;
    iterationSteps.forEach(st => {
      st.pVector.forEach(v => {
        if (v > maxP) maxP = v;
      });
    });
    maxP = Math.min(1.0, maxP * 1.15);

    // Draw background grid lines
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;

    // Horizontal Y grid lines
    const yTicks = 5;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= yTicks; i++) {
      const val = (maxP / yTicks) * i;
      const y = padding.top + chartH - (val / maxP) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(val.toFixed(3), padding.left - 8, y);
    }

    // Vertical X grid lines
    const totalSteps = iterationSteps.length;
    const xStep = Math.max(1, Math.floor(totalSteps / 6));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let s = 0; s < totalSteps; s += xStep) {
      const x = padding.left + (s / (totalSteps - 1 || 1)) * chartW;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
      ctx.fillText(`t=${s}`, x, height - padding.bottom + 8);
    }

    // Highlight current step vertical cursor line
    const curX = padding.left + (currentStepIndex / (totalSteps - 1 || 1)) * chartW;
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(curX, padding.top);
    ctx.lineTo(curX, height - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw lines for each node's probability evolution up to currentStepIndex
    nodes.forEach((node, nodeIdx) => {
      const color = NODE_COLORS[nodeIdx % NODE_COLORS.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let s = 0; s <= currentStepIndex; s++) {
        const val = iterationSteps[s].pVector[nodeIdx] || 0;
        const x = padding.left + (s / (totalSteps - 1 || 1)) * chartW;
        const y = padding.top + chartH - (val / maxP) * chartH;

        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Dot on current value
      const curVal = iterationSteps[currentStepIndex].pVector[nodeIdx] || 0;
      const dotX = curX;
      const dotY = padding.top + chartH - (curVal / maxP) * chartH;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

  }, [iterationSteps, currentStepIndex, nodes]);

  // Draw 2D Residual Error Convergence Canvas (||Δp|| vs step t)
  useEffect(() => {
    const canvas = residualCanvasRef.current;
    if (!canvas || iterationSteps.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 20, right: 25, bottom: 30, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Log-scale for residual delta (1.0 to 1e-6)
    const minLog = -6;
    const maxLog = 0;

    // Draw background grid lines
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let exp = maxLog; exp >= minLog; exp -= 2) {
      const normY = (exp - minLog) / (maxLog - minLog);
      const y = padding.top + chartH - normY * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(`1e${exp}`, padding.left - 8, y);
    }

    // Residual line
    const totalSteps = iterationSteps.length;
    ctx.strokeStyle = '#0d9488'; // teal-600
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    for (let s = 0; s <= currentStepIndex; s++) {
      const delta = Math.max(1e-6, iterationSteps[s].delta);
      const logVal = Math.log10(delta);
      const clampedLog = Math.max(minLog, Math.min(maxLog, logVal));
      const normY = (clampedLog - minLog) / (maxLog - minLog);

      const x = padding.left + (s / (totalSteps - 1 || 1)) * chartW;
      const y = padding.top + chartH - normY * chartH;

      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Convergence threshold line at 1e-6
    const tolY = padding.top + chartH;
    ctx.strokeStyle = '#10b981';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padding.left, tolY);
    ctx.lineTo(width - padding.right, tolY);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [iterationSteps, currentStepIndex]);

  // Max value in current step for bar chart scaling
  const maxCurrentP = Math.max(...currentStep.pVector, 0.001);

  return (
    <div className="space-y-6">
      {/* Top Banner and Mathematical Derivation Pill */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Activity size={18} className="text-indigo-600" />
              <h3 className="font-semibold text-slate-800 text-sm">
                转移矩阵幂迭代 2D 演播室 (Power Iteration 2D Studio)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              通过二维动态柱状分布与时序收敛折线，直观观测全网概率向量经由矩阵乘法{' '}
              <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono">p^(t+1) = G · p^(t)</code>{' '}
              平滑投影并收敛至主特征向量的过程。
            </p>
          </div>

          {/* Convergence status badge */}
          <div className="flex items-center space-x-3 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-mono">
            <div>
              <span className="text-slate-400">当前轮数:</span>{' '}
              <strong className="text-indigo-700 text-sm">{currentStep.step}</strong>
              <span className="text-slate-400">/{maxStep}</span>
            </div>
            <div className="w-[1px] h-4 bg-slate-200" />
            <div>
              <span className="text-slate-400">残差 ||Δp||₁:</span>{' '}
              <strong className={currentStep.delta < 1e-5 ? 'text-emerald-600 text-sm' : 'text-amber-600 text-sm'}>
                {currentStep.delta.toExponential(3)}
              </strong>
            </div>
            <div className="w-[1px] h-4 bg-slate-200" />
            <div className="flex items-center space-x-1 text-slate-700">
              {currentStep.delta < 1e-5 ? (
                <span className="text-emerald-600 flex items-center space-x-1">
                  <CheckCircle2 size={13} />
                  <span>已达平稳态 (λ₁=1)</span>
                </span>
              ) : (
                <span className="text-indigo-600 flex items-center space-x-1">
                  <Sparkles size={13} className="animate-spin" />
                  <span>谱投影迭代中…</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Timeline Player Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onStepChange(0)}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              title="重置到 Step 0 (均匀初始向量 1/N)"
            >
              <RotateCcw size={15} />
            </button>
            <button
              onClick={() => onStepChange(Math.max(0, currentStepIndex - 1))}
              disabled={currentStepIndex <= 0}
              className="p-1.5 hover:bg-slate-100 disabled:opacity-40 rounded text-slate-600 transition-colors cursor-pointer"
              title="上一步"
            >
              <SkipBack size={15} />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              <span>{isPlaying ? '暂停演播' : '连续演播'}</span>
            </button>
            <button
              onClick={() => onStepChange(Math.min(maxStep, currentStepIndex + 1))}
              disabled={currentStepIndex >= maxStep}
              className="p-1.5 hover:bg-slate-100 disabled:opacity-40 rounded text-slate-600 transition-colors cursor-pointer"
              title="下一步"
            >
              <SkipForward size={15} />
            </button>
          </div>

          {/* Scrubber Range Slider */}
          <div className="flex-1 max-w-md flex items-center space-x-2 text-xs font-mono">
            <span className="text-slate-400">Step 0</span>
            <input
              type="range"
              min={0}
              max={maxStep}
              value={currentStepIndex}
              onChange={e => onStepChange(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-slate-600 font-bold">Step {maxStep}</span>
          </div>

          {/* Speed selector */}
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span>演播速率:</span>
            <select
              value={playbackSpeed}
              onChange={e => setPlaybackSpeed(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1 rounded text-xs focus:outline-none cursor-pointer"
            >
              <option value={1500}>0.5x 缓速</option>
              <option value={800}>1.0x 标准</option>
              <option value={300}>2.5x 极速</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main 2D Convergence Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Real-time Probability Vector 2D Bar Meter */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart2 size={16} className="text-indigo-600" />
              <h4 className="font-semibold text-slate-800 text-sm">
                当前轮数概率分布向量 p^({currentStep.step})
              </h4>
            </div>
            <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
              ∑ p_i = {currentStep.pVector.reduce((a, b) => a + b, 0).toFixed(4)}
            </span>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {nodes.map((node, idx) => {
              const val = currentStep.pVector[idx] || 0;
              const prevVal = currentStepIndex > 0 ? iterationSteps[currentStepIndex - 1].pVector[idx] : (1 / N);
              const diff = val - prevVal;
              const barPercent = Math.min(100, (val / maxCurrentP) * 100);
              const color = NODE_COLORS[idx % NODE_COLORS.length];

              return (
                <div key={node.id} className="text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 truncate max-w-[200px]">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-medium text-slate-700 truncate" title={node.label}>
                        {node.label}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 font-mono">
                      {currentStepIndex > 0 && (
                        <span className={`text-[10px] ${diff > 0.0001 ? 'text-emerald-600' : diff < -0.0001 ? 'text-rose-500' : 'text-slate-400'}`}>
                          {diff > 0 ? `+${diff.toFixed(4)}` : diff.toFixed(4)}
                        </span>
                      )}
                      <strong className="text-indigo-700 text-xs w-16 text-right">
                        {val.toFixed(5)}
                      </strong>
                    </div>
                  </div>

                  {/* 2D Bar Track */}
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{
                        width: `${barPercent}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>初始均匀基准: 1/N = {(1 / (N || 1)).toFixed(4)}</span>
            <span>随迭代自动重标度</span>
          </div>
        </div>

        {/* Right Column (7 Cols): Trajectory Line Chart & Residual Decay Chart */}
        <div className="lg:col-span-7 space-y-6">
          {/* Top Chart: Node Probability Trajectory Curves */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers size={16} className="text-indigo-600" />
                <h4 className="font-semibold text-slate-800 text-sm">
                  各节点概率收敛轨迹 (0 → {currentStep.step} 步)
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                纵轴: 概率权重 p_i | 横轴: 迭代轮数 t
              </span>
            </div>

            <div className="relative w-full h-[210px] bg-slate-50/50 rounded-lg border border-slate-100 overflow-hidden">
              <canvas
                ref={trajectoryCanvasRef}
                width={650}
                height={210}
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Bottom Chart: Residual Error Log Decay Curve */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingDown size={16} className="text-teal-600" />
                <h4 className="font-semibold text-slate-800 text-sm">
                  残差范数对数衰减曲线 (Residual L1-Norm ||Δp||₁)
                </h4>
              </div>
              <span className="text-[11px] text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                对数下界 ε = 1e-6
              </span>
            </div>

            <div className="relative w-full h-[150px] bg-slate-50/50 rounded-lg border border-slate-100 overflow-hidden">
              <canvas
                ref={residualCanvasRef}
                width={650}
                height={150}
                className="w-full h-full"
              />
            </div>

            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
              <span>根据谱定理，残差收敛斜率由谱隙 1 - d = {(1 - dampingFactor).toFixed(3)} 严格决定</span>
              <span>主特征值收敛率: |λ₂| ≤ {dampingFactor}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
