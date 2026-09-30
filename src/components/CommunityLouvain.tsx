import React, { useState, useEffect, useRef } from 'react';
import { GraphNode, GraphEdge, LouvainStep } from '../types/graph';
import { computeLouvainSteps } from '../utils/mathUtils';
import {
  Users,
  Sparkles,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Layers,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  Share2,
} from 'lucide-react';

interface CommunityLouvainProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectCommunity?: (communityId: number | null) => void;
}

const COMMUNITY_COLORS = [
  '#4f46e5', // indigo-600
  '#0d9488', // teal-600
  '#d97706', // amber-600
  '#e11d48', // rose-600
  '#7c3aed', // violet-600
  '#059669', // emerald-600
  '#0284c7', // sky-600
  '#db2777', // pink-600
];

export const CommunityLouvain: React.FC<CommunityLouvainProps> = ({
  nodes,
  edges,
  onSelectCommunity,
}) => {
  const steps: LouvainStep[] = computeLouvainSteps(nodes, edges);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(steps.length - 1);
  const [selectedComm, setSelectedComm] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [animSpeed, setAnimSpeed] = useState<number>(1800); // ms per step

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Simulation node positions for community clustering animation
  const simNodesRef = useRef<{
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
  }[]>([]);
  const isDraggingRef = useRef<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  const activeStep = steps[currentStepIdx] || steps[0] || {
    step: 0,
    modularity: 0,
    communities: {},
    description: '',
  };

  const commMap = activeStep.communities;

  // Auto-play timer through Louvain steps
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentStepIdx(idx => (idx >= steps.length - 1 ? 0 : idx + 1));
    }, animSpeed);
    return () => clearInterval(timer);
  }, [isPlaying, steps.length, animSpeed]);

  // Group nodes by community
  const communityGroups: { [cId: number]: GraphNode[] } = {};
  nodes.forEach(n => {
    const c = commMap[n.id] ?? 0;
    if (!communityGroups[c]) communityGroups[c] = [];
    communityGroups[c].push(n);
  });
  const uniqueCommIds = Object.keys(communityGroups).map(Number).sort((a, b) => a - b);

  // Compute Intra-community vs Inter-community edge counts
  let intraEdges = 0;
  let interEdges = 0;
  edges.forEach(e => {
    const c1 = commMap[e.source];
    const c2 = commMap[e.target];
    if (c1 !== undefined && c2 !== undefined) {
      if (c1 === c2) intraEdges++;
      else interEdges++;
    }
  });

  // Calculate modularity delta from previous step
  const prevQ = currentStepIdx > 0 ? steps[currentStepIdx - 1].modularity : 0;
  const deltaQ = activeStep.modularity - prevQ;

  // Initialize simulation positions
  useEffect(() => {
    const width = containerRef.current?.clientWidth || 800;
    const height = 480;

    const existingMap = new Map(simNodesRef.current.map(n => [n.id, n]));
    const maxPR = Math.max(...nodes.map(n => n.pageRank || 0.05), 0.05);

    simNodesRef.current = nodes.map((node, i) => {
      const existing = existingMap.get(node.id);
      const pr = node.pageRank || (1 / (nodes.length || 1));
      const radius = 6 + (pr / maxPR) * 6; // refined compact radius

      if (existing) {
        return { ...existing, radius };
      }

      // Initial ring layout
      const angle = (i / (nodes.length || 1)) * 2 * Math.PI;
      const dist = Math.min(width, height) * 0.38;
      return {
        id: node.id,
        x: width / 2 + Math.cos(angle) * dist + (Math.random() - 0.5) * 30,
        y: height / 2 + Math.sin(angle) * dist + (Math.random() - 0.5) * 30,
        vx: 0,
        vy: 0,
        radius,
      };
    });
  }, [nodes]);

  // Louvain Physics loop: Pulls nodes of the same community toward their designated cluster center!
  useEffect(() => {
    let animId: number;
    let particleOffset = 0;

    const tick = () => {
      particleOffset = (particleOffset + 0.04) % 1.0;
      const width = containerRef.current?.clientWidth || 800;
      const height = 480;
      const simNodes = simNodesRef.current;
      const idToSim = new Map(simNodes.map(n => [n.id, n]));

      // Calculate community target anchor points spread around canvas center
      const commCenters: { [cId: number]: { x: number; y: number } } = {};
      const numComms = Math.max(1, uniqueCommIds.length);
      const clusterRingRadius = currentStepIdx === 0 ? 0 : Math.min(width, height) * 0.30;

      uniqueCommIds.forEach((cId, idx) => {
        if (currentStepIdx === 0) {
          commCenters[cId] = { x: width / 2, y: height / 2 };
        } else {
          const angle = (idx / numComms) * Math.PI * 2 - Math.PI / 2;
          commCenters[cId] = {
            x: width / 2 + Math.cos(angle) * clusterRingRadius,
            y: height / 2 + Math.sin(angle) * clusterRingRadius,
          };
        }
      });

      // 1. Community Clustering Attraction:
      // In Step > 0, nodes in the same community are drawn toward their community center
      simNodes.forEach(n => {
        const cId = commMap[n.id] ?? 0;
        const target = commCenters[cId];
        if (target && currentStepIdx > 0) {
          const pullStrength = 0.045;
          n.vx += (target.x - n.x) * pullStrength;
          n.vy += (target.y - n.y) * pullStrength;
        }
      });

      // 2. Intra-community spring attraction & node repulsion
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const n1 = simNodes[i];
          const n2 = simNodes[j];
          const c1 = commMap[n1.id];
          const c2 = commMap[n2.id];

          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);

          // Repulsion
          const minDist = n1.radius + n2.radius + 16;
          if (dist < minDist) {
            const push = (minDist - dist) * 0.15;
            n1.vx -= (dx / dist) * push;
            n1.vy -= (dy / dist) * push;
            n2.vx += (dx / dist) * push;
            n2.vy += (dy / dist) * push;
          } else if (dist < 260) {
            // Stronger repulsion between DIFFERENT communities to physically segregate clusters!
            const repFactor = c1 !== c2 ? 2200 : 700;
            const force = repFactor / distSq;
            n1.vx -= (dx / dist) * force;
            n1.vy -= (dy / dist) * force;
            n2.vx += (dx / dist) * force;
            n2.vy += (dy / dist) * force;
          }
        }
      }

      // 3. Edges spring
      edges.forEach(e => {
        const u = idToSim.get(e.source);
        const v = idToSim.get(e.target);
        if (u && v) {
          const c1 = commMap[e.source];
          const c2 = commMap[e.target];
          const dx = v.x - u.x;
          const dy = v.y - u.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          if (c1 === c2) {
            // Tightly bind internal community edges
            const desiredDist = 55;
            const force = (dist - desiredDist) * 0.04;
            u.vx += (dx / dist) * force;
            u.vy += (dy / dist) * force;
            v.vx -= (dx / dist) * force;
            v.vy -= (dy / dist) * force;
          } else {
            // Inter-community edges are looser
            const desiredDist = 160;
            const force = (dist - desiredDist) * 0.01;
            u.vx += (dx / dist) * force;
            u.vy += (dy / dist) * force;
            v.vx -= (dx / dist) * force;
            v.vy -= (dy / dist) * force;
          }
        }
      });

      // 4. Center pull and damping
      simNodes.forEach(n => {
        const cx = width / 2;
        const cy = height / 2;
        n.vx += (cx - n.x) * 0.002;
        n.vy += (cy - n.y) * 0.002;

        if (isDraggingRef.current !== n.id) {
          n.vx *= 0.82;
          n.vy *= 0.82;
          n.x += n.vx;
          n.y += n.vy;
        }

        const margin = n.radius + 15;
        n.x = Math.max(margin, Math.min(width - margin, n.x));
        n.y = Math.max(margin, Math.min(height - margin, n.y));
      });

      // Render Canvas
      draw(particleOffset, commCenters);
      animId = requestAnimationFrame(tick);
    };

    const draw = (particleOffset: number, commCenters: { [cId: number]: { x: number; y: number } }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const simNodes = simNodesRef.current;
      const idToSim = new Map(simNodes.map(n => [n.id, n]));
      const nodeObjMap = new Map(nodes.map(n => [n.id, n]));

      // 1. Draw Community Enveloping Auras / Convex Clusters
      if (currentStepIdx > 0) {
        uniqueCommIds.forEach(cId => {
          const members = simNodes.filter(n => commMap[n.id] === cId);
          if (members.length === 0) return;

          const color = COMMUNITY_COLORS[cId % COMMUNITY_COLORS.length];
          const isSelected = selectedComm === cId;

          // Compute bounding radius around cluster centroid
          let avgX = 0;
          let avgY = 0;
          members.forEach(m => {
            avgX += m.x;
            avgY += m.y;
          });
          avgX /= members.length;
          avgY /= members.length;

          let maxR = 25;
          members.forEach(m => {
            const dist = Math.hypot(m.x - avgX, m.y - avgY);
            if (dist + m.radius > maxR) maxR = dist + m.radius;
          });
          maxR += 18; // breathing padding

          // Draw soft radial aura
          const grad = ctx.createRadialGradient(avgX, avgY, 10, avgX, avgY, maxR);
          grad.addColorStop(0, `${color}28`);
          grad.addColorStop(0.85, `${color}10`);
          grad.addColorStop(1, `${color}00`);

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(avgX, avgY, maxR, 0, Math.PI * 2);
          ctx.fill();

          // Border ring around cluster
          ctx.strokeStyle = `${color}40`;
          ctx.lineWidth = isSelected ? 2 : 1;
          ctx.setLineDash(isSelected ? [] : [5, 4]);
          ctx.beginPath();
          ctx.arc(avgX, avgY, maxR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Cluster Centroid Label Pill
          ctx.fillStyle = color;
          ctx.font = '600 11px "Noto Sans SC", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const label = `社团 #${cId} (${members.length}节点)`;
          const textMetrics = ctx.measureText(label);
          const badgeW = textMetrics.width + 16;
          const badgeH = 20;
          const badgeY = avgY - maxR - 10;

          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(0,0,0,0.06)';
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.roundRect(avgX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 6);
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.strokeStyle = `${color}60`;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = color;
          ctx.fillText(label, avgX, badgeY);
        });
      }

      // 2. Draw Edges: Intra-community edges glow & flow; Inter-community edges are dashed
      edges.forEach(e => {
        const u = idToSim.get(e.source);
        const v = idToSim.get(e.target);
        if (!u || !v) return;

        const c1 = commMap[e.source];
        const c2 = commMap[e.target];
        const isIntra = c1 !== undefined && c1 === c2;
        const color = isIntra ? COMMUNITY_COLORS[c1 % COMMUNITY_COLORS.length] : '#94a3b8';

        const dx = v.x - u.x;
        const dy = v.y - u.y;
        const dist = Math.hypot(dx, dy);
        if (dist === 0) return;

        const startX = u.x + (dx / dist) * u.radius;
        const startY = u.y + (dy / dist) * u.radius;
        const endX = v.x - (dx / dist) * (v.radius + 3);
        const endY = v.y - (dy / dist) * (v.radius + 3);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);

        if (isIntra) {
          // Intra-community edge: vibrant solid line with high cohesion
          ctx.strokeStyle = `${color}cc`;
          ctx.lineWidth = 2.2;
          ctx.setLineDash([]);
          ctx.stroke();

          // Flowing energy particle along intra-edge
          const t = (particleOffset + (u.x * 0.01)) % 1.0;
          const px = startX + (endX - startX) * t;
          const py = startY + (endY - startY) * t;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(px, py, 1.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Inter-community cross-cluster edge: subtle dashed bridge
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Small arrow head
        const arrowAngle = Math.atan2(dy, dx);
        const arrowLen = isIntra ? 6 : 5;
        ctx.fillStyle = isIntra ? color : '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - arrowLen * Math.cos(arrowAngle - Math.PI / 6),
          endY - arrowLen * Math.sin(arrowAngle - Math.PI / 6)
        );
        ctx.lineTo(
          endX - arrowLen * Math.cos(arrowAngle + Math.PI / 6),
          endY - arrowLen * Math.sin(arrowAngle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      });

      // 3. Draw Nodes
      simNodes.forEach(simN => {
        const rawNode = nodeObjMap.get(simN.id);
        if (!rawNode) return;

        const cId = commMap[simN.id] ?? 0;
        const color = COMMUNITY_COLORS[cId % COMMUNITY_COLORS.length];
        const isHovered = hoveredNode?.id === simN.id;

        // Outer pulse ring on hover
        if (isHovered) {
          ctx.beginPath();
          ctx.arc(simN.x, simN.y, simN.radius + 4, 0, Math.PI * 2);
          ctx.fillStyle = `${color}40`;
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(simN.x, simN.y, simN.radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Node Label
        ctx.font = isHovered ? '600 11px "Noto Sans SC", sans-serif' : '500 10px "Noto Sans SC", sans-serif';
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const labelText = rawNode.label.length > 10 ? rawNode.label.slice(0, 9) + '…' : rawNode.label;
        ctx.fillText(labelText, simN.x, simN.y + simN.radius + 6);
      });
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [nodes, edges, commMap, currentStepIdx, uniqueCommIds, selectedComm, hoveredNode]);

  // Handle Canvas mouse drag & hover
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const clickedSim = simNodesRef.current.find(n => {
      const dx = n.x - mouseX;
      const dy = n.y - mouseY;
      return dx * dx + dy * dy <= (n.radius + 8) * (n.radius + 8);
    });

    if (clickedSim) {
      isDraggingRef.current = clickedSim.id;
      dragOffsetRef.current = { x: clickedSim.x - mouseX, y: clickedSim.y - mouseY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDraggingRef.current) {
      const draggedNode = simNodesRef.current.find(n => n.id === isDraggingRef.current);
      if (draggedNode) {
        draggedNode.x = mouseX + dragOffsetRef.current.x;
        draggedNode.y = mouseY + dragOffsetRef.current.y;
        draggedNode.vx = 0;
        draggedNode.vy = 0;
      }
      return;
    }

    const foundSim = simNodesRef.current.find(n => {
      const dx = n.x - mouseX;
      const dy = n.y - mouseY;
      return dx * dx + dy * dy <= (n.radius + 8) * (n.radius + 8);
    });

    if (foundSim) {
      const raw = nodes.find(n => n.id === foundSim.id) || null;
      setHoveredNode(raw);
    } else {
      setHoveredNode(null);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = null;
  };

  // Sync canvas size
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = 480;
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div className="space-y-6">
      {/* Louvain Stepper Header Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Users size={18} className="text-teal-600" />
              <h3 className="font-semibold text-slate-800 text-sm">
                Louvain 社区发现与模块度 (Modularity Q) 最大化演播
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              通过贪心凝聚算法最大化目标函数 $Q$，下方动态动画模块将直观展示高内聚节点自动聚合至所属社区岛屿、同质边高亮加固、异质跨界边剥离弱化的物理过程。
            </p>
          </div>

          {/* Stepper Controls */}
          <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setCurrentStepIdx(0)}
              className="p-1 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="初始单节点状态 (Step 0)"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center space-x-1 px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              <span>{isPlaying ? '暂停' : '演播凝聚'}</span>
            </button>
            <div className="text-xs font-mono px-2 text-slate-700">
              阶段: <strong>{activeStep.step}</strong> / {steps.length - 1}
            </div>
            <button
              onClick={() => setCurrentStepIdx(idx => Math.min(steps.length - 1, idx + 1))}
              disabled={currentStepIdx >= steps.length - 1}
              className="p-1 hover:bg-white disabled:opacity-40 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="下一步贪心凝聚"
            >
              <SkipForward size={14} />
            </button>
          </div>
        </div>

        {/* Phase Description Banner with Delta Q Callout */}
        <div className="bg-teal-50/70 p-3 rounded-lg border border-teal-100 flex flex-wrap items-center justify-between gap-2 text-xs text-teal-900">
          <div className="flex items-center space-x-2">
            <Sparkles size={15} className="text-teal-600 shrink-0" />
            <span className="font-medium">{activeStep.description}</span>
          </div>

          <div className="flex items-center space-x-3 font-mono">
            {currentStepIdx > 0 && (
              <span className="text-[11px] text-teal-600 font-semibold bg-white/80 px-2 py-0.5 rounded border border-teal-200">
                ΔQ 增益: +{Math.max(0, deltaQ).toFixed(4)}
              </span>
            )}
            <div className="font-bold text-teal-700 bg-white px-2.5 py-0.5 rounded border border-teal-200 shadow-2xs">
              当前 Q = {activeStep.modularity.toFixed(4)}
            </div>
          </div>
        </div>

        {/* Modularity Trajectory Curve across steps */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-500 mb-2 flex items-center justify-between">
            <span>模块度优化收敛轨迹 (Modularity Ascent):</span>
            <span>Q &gt; 0.3 表明显著模块化社区结构</span>
          </div>
          <div className="flex items-end space-x-3 h-12 bg-slate-50 p-2 rounded-lg border border-slate-200">
            {steps.map((st, idx) => {
              const maxQ = Math.max(...steps.map(s => s.modularity), 0.1);
              const heightPct = Math.max(15, (st.modularity / maxQ) * 85);
              const isActive = idx === currentStepIdx;

              return (
                <div
                  key={st.step}
                  onClick={() => setCurrentStepIdx(idx)}
                  className="flex-1 flex flex-col items-center cursor-pointer group h-full justify-end"
                >
                  <div
                    className={`w-full rounded-t transition-all ${
                      isActive ? 'bg-teal-600 ring-2 ring-teal-400' : 'bg-slate-300 group-hover:bg-slate-400'
                    }`}
                    style={{ height: `${heightPct}%` }}
                    title={`阶段 ${st.step}: Q = ${st.modularity.toFixed(4)}`}
                  />
                  <span className="text-[10px] font-mono text-slate-400 mt-1">阶段 {st.step}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* NEW: Dedicated Interactive Louvain Clustering Animation Module */}
      <div
        ref={containerRef}
        className="relative w-full h-[480px] bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-md select-none"
      >
        {/* Top Floating Controls on Animation Canvas */}
        <div className="absolute top-3 left-3 z-10 flex items-center space-x-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-200">
          <Activity size={14} className="text-teal-400" />
          <span className="font-medium">Louvain 物理力导向分群凝聚动画</span>
          <span className="text-slate-600">|</span>
          <span className="text-teal-300 font-mono">阶段 {activeStep.step}: 凝聚为 {uniqueCommIds.length} 社区</span>
        </div>

        {/* Right Top Status & Drag Hint */}
        <div className="absolute top-3 right-3 z-10 flex items-center space-x-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] text-slate-400">
          <span>拖拽节点可观测社区引力弹性回拉</span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 font-mono">Q = {activeStep.modularity.toFixed(4)}</span>
        </div>

        {/* Hover Inspector inside Animation Canvas */}
        {hoveredNode && (
          <div className="absolute bottom-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md p-3 rounded-lg border border-slate-700 text-xs text-slate-200 pointer-events-none min-w-[200px] shadow-lg">
            <div className="font-semibold text-white mb-1">{hoveredNode.label}</div>
            <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400 font-mono">
              <div>所属社团: <strong className="text-teal-400">#{commMap[hoveredNode.id] ?? 0}</strong></div>
              <div>PageRank: <strong className="text-indigo-400">{(hoveredNode.pageRank || 0).toFixed(4)}</strong></div>
              <div>入度: <strong className="text-slate-300">{hoveredNode.inDegree || 0}</strong></div>
              <div>出度: <strong className="text-slate-300">{hoveredNode.outDegree || 0}</strong></div>
            </div>
          </div>
        )}

        {/* Animation Canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        />
      </div>

      {/* Community Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {uniqueCommIds.map(cId => {
          const members = communityGroups[cId];
          const color = COMMUNITY_COLORS[cId % COMMUNITY_COLORS.length];
          const isSelected = selectedComm === cId;

          return (
            <div
              key={cId}
              onClick={() => {
                const next = isSelected ? null : cId;
                setSelectedComm(next);
                onSelectCommunity?.(next);
              }}
              className={`p-4 rounded-xl border bg-white cursor-pointer transition-all ${
                isSelected
                  ? 'border-indigo-600 ring-2 ring-indigo-100 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="font-semibold text-slate-800 text-xs">社区 #{cId}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  {members.length} 成员
                </span>
              </div>

              <div className="space-y-1.5 my-3">
                <div className="text-[11px] text-slate-400">核心节点分布:</div>
                <div className="flex flex-wrap gap-1">
                  {members.map(m => (
                    <span
                      key={m.id}
                      className="px-2 py-0.5 bg-slate-50 text-slate-700 rounded text-[11px] border border-slate-200/80"
                      title={m.label}
                    >
                      {m.label.length > 8 ? m.label.slice(0, 7) + '…' : m.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>最高 PageRank:</span>
                <span className="font-bold text-slate-800">
                  {Math.max(...members.map(m => m.pageRank || 0)).toFixed(4)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Intra vs Inter Edges Physical Metrics */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
          <div>
            <div className="font-medium text-slate-700">社区内连边 (Intra-Community Edges)</div>
            <div className="text-[11px] text-slate-400 mt-0.5">高密度协同流，在动画中以同色实线与能量粒子流动高亮</div>
          </div>
          <span className="text-lg font-bold font-mono text-teal-600">{intraEdges} 条</span>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
          <div>
            <div className="font-medium text-slate-700">跨社区桥接边 (Inter-Community Edges)</div>
            <div className="text-[11px] text-slate-400 mt-0.5">中介中枢连边，在动画中以虚线解耦呈现</div>
          </div>
          <span className="text-lg font-bold font-mono text-indigo-600">{interEdges} 条</span>
        </div>
      </div>
    </div>
  );
};
