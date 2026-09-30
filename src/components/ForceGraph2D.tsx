import React, { useEffect, useRef, useState } from 'react';
import { GraphNode, GraphEdge } from '../types/graph';
import { ZoomIn, ZoomOut, RotateCcw, Plus, Trash2, Eye, ShieldAlert, Sparkles } from 'lucide-react';

interface ForceGraph2DProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodesChange?: (nodes: GraphNode[]) => void;
  onEdgesChange?: (edges: GraphEdge[]) => void;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  colorMode?: 'community' | 'pagerank' | 'hubauth' | 'traps';
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

export const ForceGraph2D: React.FC<ForceGraph2DProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  selectedNodeId,
  onSelectNode,
  colorMode = 'community',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Simulation node positions
  const simNodesRef = useRef<{ id: string; x: number; y: number; vx: number; vy: number; radius: number }[]>([]);
  const isDraggingRef = useRef<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Quick interactive edit states
  const [isAddingEdge, setIsAddingEdge] = useState(false);
  const [edgeSource, setEdgeSource] = useState<string | null>(null);

  // Initialize/Sync simulation positions
  useEffect(() => {
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 550;

    const existingMap = new Map(simNodesRef.current.map(n => [n.id, n]));
    const maxPR = Math.max(...nodes.map(n => n.pageRank || 0.05), 0.05);

    simNodesRef.current = nodes.map((node, i) => {
      const existing = existingMap.get(node.id);
      const pr = node.pageRank || (1 / (nodes.length || 1));
      // Node radius reduced to 1/3 of previous (from 14~36 down to 5~12)
      const radius = 5 + (pr / maxPR) * 7;

      if (existing) {
        return { ...existing, radius };
      }

      // Initial layout spread widened (0.42 radius instead of 0.32)
      const angle = (i / (nodes.length || 1)) * 2 * Math.PI;
      const dist = Math.min(width, height) * 0.42;
      return {
        id: node.id,
        x: width / 2 + Math.cos(angle) * dist + (Math.random() - 0.5) * 50,
        y: height / 2 + Math.sin(angle) * dist + (Math.random() - 0.5) * 50,
        vx: 0,
        vy: 0,
        radius,
      };
    });
  }, [nodes]);

  // Force simulation loop
  useEffect(() => {
    let animId: number;

    const tick = () => {
      const width = containerRef.current?.clientWidth || 800;
      const height = containerRef.current?.clientHeight || 550;
      const simNodes = simNodesRef.current;
      const idToSim = new Map(simNodes.map(n => [n.id, n]));

      // 1. Repulsion between all node pairs (widened layout)
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const n1 = simNodes[i];
          const n2 = simNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);

          if (dist < 650) {
            const force = (3800 / distSq);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            n1.vx -= fx;
            n1.vy -= fy;
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }

      // 2. Spring attraction along edges (widen desiredDist from 110 to 180)
      edges.forEach(e => {
        const source = idToSim.get(e.source);
        const target = idToSim.get(e.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const desiredDist = 180;
          const force = (dist - desiredDist) * 0.022;

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          source.vx += fx;
          source.vy += fy;
          target.vx -= fx;
          target.vy -= fy;
        }
      });

      // 3. Center gravity pull (mild so nodes have breathing space)
      simNodes.forEach(n => {
        const cx = width / 2;
        const cy = height / 2;
        n.vx += (cx - n.x) * 0.003;
        n.vy += (cy - n.y) * 0.003;

        // Apply friction and position update (if not dragging)
        if (isDraggingRef.current !== n.id) {
          n.vx *= 0.85;
          n.vy *= 0.85;
          n.x += n.vx;
          n.y += n.vy;
        }

        // Boundary constraint
        const margin = n.radius + 15;
        n.x = Math.max(margin, Math.min(width - margin, n.x));
        n.y = Math.max(margin, Math.min(height - margin, n.y));
      });

      // Render to canvas
      draw();
      animId = requestAnimationFrame(tick);
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);
      ctx.save();

      // Pan & Zoom
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      const simNodes = simNodesRef.current;
      const idToSim = new Map(simNodes.map(n => [n.id, n]));
      const nodeObjMap = new Map(nodes.map(n => [n.id, n]));

      // Draw subtle background grid
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = -500; x < width + 500; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, -500);
        ctx.lineTo(x, height + 500);
        ctx.stroke();
      }
      for (let y = -500; y < height + 500; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(-500, y);
        ctx.lineTo(width + 500, y);
        ctx.stroke();
      }

      // Draw Edges (Directed arrows)
      edges.forEach(e => {
        const u = idToSim.get(e.source);
        const v = idToSim.get(e.target);
        if (!u || !v) return;

        const isHighlighted =
          (selectedNodeId && (e.source === selectedNodeId || e.target === selectedNodeId)) ||
          (hoveredNode && (e.source === hoveredNode.id || e.target === hoveredNode.id));

        const dx = v.x - u.x;
        const dy = v.y - u.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0) return;

        // Check for self loop
        if (e.source === e.target) {
          ctx.beginPath();
          ctx.arc(u.x, u.y - u.radius - 8, 12, 0, Math.PI * 2);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2.5;
          ctx.stroke();
          return;
        }

        // Endpoint at target node boundary
        const endX = v.x - (dx / dist) * (v.radius + 3);
        const endY = v.y - (dy / dist) * (v.radius + 3);
        const startX = u.x + (dx / dist) * u.radius;
        const startY = u.y + (dy / dist) * u.radius;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = isHighlighted ? '#4338ca' : '#94a3b8';
        ctx.lineWidth = isHighlighted ? 2.5 : 1.5;
        ctx.stroke();

        // Arrowhead
        const arrowAngle = Math.atan2(dy, dx);
        const arrowLen = isHighlighted ? 9 : 7;
        ctx.fillStyle = isHighlighted ? '#4338ca' : '#64748b';
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

      // Draw Nodes
      simNodes.forEach(simN => {
        const rawNode = nodeObjMap.get(simN.id);
        if (!rawNode) return;

        const isSelected = selectedNodeId === simN.id;
        const isHovered = hoveredNode?.id === simN.id;

        // Determine node color
        let fillColor = '#6366f1';
        if (colorMode === 'community') {
          const cIdx = rawNode.community !== undefined ? rawNode.community % COMMUNITY_COLORS.length : 0;
          fillColor = COMMUNITY_COLORS[cIdx];
        } else if (colorMode === 'pagerank') {
          const pr = rawNode.pageRank || 0.05;
          const maxPR = Math.max(...nodes.map(n => n.pageRank || 0.05), 0.05);
          const intensity = Math.min(1, Math.max(0.2, pr / maxPR));
          fillColor = `rgba(67, 56, 202, ${intensity.toFixed(2)})`;
        } else if (colorMode === 'hubauth') {
          const auth = rawNode.authScore || 0;
          const hub = rawNode.hubScore || 0;
          fillColor = auth > hub ? '#0d9488' : '#d97706';
        } else if (colorMode === 'traps') {
          if (rawNode.isSpiderTrap) fillColor = '#ef4444';
          else if (rawNode.isDeadEnd) fillColor = '#f97316';
          else fillColor = '#3b82f6';
        }

        // Outer glow on select/hover
        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(simN.x, simN.y, simN.radius + 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
          ctx.fill();
          ctx.strokeStyle = '#4338ca';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(simN.x, simN.y, simN.radius, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Node Label
        ctx.font = isSelected ? '600 11px "Noto Sans SC", sans-serif' : '500 10px "Noto Sans SC", sans-serif';
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw text below node with compact spacing
        const labelText = rawNode.label.length > 12 ? rawNode.label.slice(0, 11) + '…' : rawNode.label;
        ctx.fillText(labelText, simN.x, simN.y + simN.radius + 10);

        // Badge indicator on Dead End or Spider Trap
        if (rawNode.isDeadEnd || rawNode.isSpiderTrap) {
          ctx.beginPath();
          ctx.arc(simN.x + simN.radius * 0.7, simN.y - simN.radius * 0.7, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = rawNode.isSpiderTrap ? '#dc2626' : '#ea580c';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      ctx.restore();
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [edges, nodes, selectedNodeId, hoveredNode, colorMode, zoom, pan]);

  // Canvas mouse handlers for drag, pan, hover & edge creation
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    // Check if clicked a node
    const clickedSim = simNodesRef.current.find(n => {
      const dx = n.x - mouseX;
      const dy = n.y - mouseY;
      return dx * dx + dy * dy <= n.radius * n.radius;
    });

    if (clickedSim) {
      if (isAddingEdge) {
        if (!edgeSource) {
          setEdgeSource(clickedSim.id);
        } else {
          // Complete edge creation
          if (edgeSource !== clickedSim.id) {
            const newEdge: GraphEdge = {
              id: `edge_${Date.now()}`,
              source: edgeSource,
              target: clickedSim.id,
              weight: 1,
            };
            onEdgesChange?.([...edges, newEdge]);
          }
          setIsAddingEdge(false);
          setEdgeSource(null);
        }
        return;
      }

      isDraggingRef.current = clickedSim.id;
      dragOffsetRef.current = { x: clickedSim.x - mouseX, y: clickedSim.y - mouseY };
      onSelectNode?.(clickedSim.id);
    } else {
      // Start canvas panning
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      onSelectNode?.(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (isDraggingRef.current) {
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;
      const draggedNode = simNodesRef.current.find(n => n.id === isDraggingRef.current);
      if (draggedNode) {
        draggedNode.x = mouseX + dragOffsetRef.current.x;
        draggedNode.y = mouseY + dragOffsetRef.current.y;
        draggedNode.vx = 0;
        draggedNode.vy = 0;
      }
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    // Hover detection
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;
    const foundSim = simNodesRef.current.find(n => {
      const dx = n.x - mouseX;
      const dy = n.y - mouseY;
      return dx * dx + dy * dy <= n.radius * n.radius;
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
    setIsPanning(false);
  };

  // Resize canvas to parent container
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div ref={containerRef} className="relative w-full h-[580px] bg-slate-50/60 rounded-xl border border-slate-200 overflow-hidden select-none">
      {/* Top Floating Controls */}
      <div className="absolute top-3 left-3 z-10 flex items-center space-x-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-xs text-xs text-slate-600">
        <span className="font-medium text-slate-700">力导向拓扑引擎</span>
        <span className="text-slate-300">|</span>
        <span>节点: <strong className="text-indigo-600">{nodes.length}</strong></span>
        <span>边数: <strong className="text-indigo-600">{edges.length}</strong></span>
        {isAddingEdge && (
          <span className="ml-2 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-medium animate-pulse">
            {edgeSource ? `已选起点 [${edgeSource}]，请点击终点节点` : '点击选择连边起点'}
          </span>
        )}
      </div>

      {/* Right Top Zoom & Reset Buttons */}
      <div className="absolute top-3 right-3 z-10 flex items-center space-x-1 bg-white/90 backdrop-blur-md p-1 rounded-lg border border-slate-200/80 shadow-xs">
        <button
          onClick={() => setZoom(z => Math.min(z * 1.2, 2.5))}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors"
          title="放大拓扑"
        >
          <ZoomIn size={15} />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(z / 1.2, 0.4))}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors"
          title="缩小拓扑"
        >
          <ZoomOut size={15} />
        </button>
        <button
          onClick={handleResetView}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors"
          title="重置视图"
        >
          <RotateCcw size={15} />
        </button>
        <div className="w-[1px] h-4 bg-slate-200 mx-1" />
        <button
          onClick={() => {
            setIsAddingEdge(!isAddingEdge);
            setEdgeSource(null);
          }}
          className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
            isAddingEdge ? 'bg-amber-600 text-white' : 'hover:bg-slate-100 text-slate-700'
          }`}
          title="交互式添加有向边"
        >
          <Plus size={13} />
          <span>加边</span>
        </button>
      </div>

      {/* Node Inspector Floating Pill */}
      {hoveredNode && (
        <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-md p-3 rounded-lg border border-slate-200 shadow-md text-xs max-w-xs pointer-events-none transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-slate-800 text-sm">{hoveredNode.label}</span>
            {hoveredNode.isSpiderTrap && (
              <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded text-[10px]">
                蜘蛛陷阱
              </span>
            )}
            {hoveredNode.isDeadEnd && (
              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded text-[10px]">
                死胡同 (出度0)
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-600">
            <div>PageRank: <strong className="text-indigo-600 font-mono">{(hoveredNode.pageRank || 0).toFixed(4)}</strong></div>
            <div>社团编号: <strong className="text-teal-600 font-mono">#{hoveredNode.community ?? 0}</strong></div>
            <div>入度 (In): <strong className="text-slate-700 font-mono">{hoveredNode.inDegree || 0}</strong></div>
            <div>出度 (Out): <strong className="text-slate-700 font-mono">{hoveredNode.outDegree || 0}</strong></div>
            <div>Hub 得分: <strong className="text-amber-600 font-mono">{(hoveredNode.hubScore || 0).toFixed(3)}</strong></div>
            <div>Auth 得分: <strong className="text-emerald-600 font-mono">{(hoveredNode.authScore || 0).toFixed(3)}</strong></div>
          </div>
          {hoveredNode.category && (
            <div className="mt-1.5 pt-1 border-t border-slate-100 text-[11px] text-slate-400">
              属性类别: {hoveredNode.category}
            </div>
          )}
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />
    </div>
  );
};
