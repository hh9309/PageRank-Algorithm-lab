import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GraphNode, GraphEdge, IterationStep } from '../types/graph';
import { Play, Pause, SkipForward, RotateCcw, Activity, Layers, Compass, Sparkles } from 'lucide-react';

interface PowerIteration3DProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  iterationSteps: IterationStep[];
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  dampingFactor: number;
}

export const PowerIteration3D: React.FC<PowerIteration3DProps> = ({
  nodes,
  edges,
  iterationSteps,
  currentStepIndex,
  onStepChange,
  dampingFactor,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000); // ms per step

  // Three.js scene refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const barsRef = useRef<{ mesh: THREE.Mesh; topLight: THREE.Mesh; targetHeight: number; currentHeight: number }[]>([]);
  const curvesRef = useRef<THREE.Line[]>([]);

  // Camera Orbit state for 3D gesture interaction
  const isDraggingRef = useRef(false);
  const prevMousePos = useRef({ x: 0, y: 0 });
  const sphericalRef = useRef({ radius: 24, theta: Math.PI / 4, phi: Math.PI / 3.2 });

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      onStepChange(currentStepIndex >= iterationSteps.length - 1 ? 0 : currentStepIndex + 1);
    }, playbackSpeed);
    return () => clearInterval(interval);
  }, [isPlaying, currentStepIndex, iterationSteps.length, playbackSpeed, onStepChange]);

  // Setup Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 700;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Subtle Ground Grid
    const gridHelper = new THREE.GridHelper(30, 30, 0xcbd5e1, 0xe2e8f0);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Circular base platform
    const platformGeo = new THREE.CylinderGeometry(11, 11, 0.4, 48);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
      metalness: 0.1,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = -0.2;
    platform.receiveShadow = true;
    scene.add(platform);

    // Subtle ambient & directional lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(15, 25, 18);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x6366f1, 1.2, 30);
    pointLight.position.set(0, 8, 0);
    scene.add(pointLight);

    // Initial camera position update
    const updateCameraPos = () => {
      const { radius, theta, phi } = sphericalRef.current;
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi);
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0, 2, 0);
    };
    updateCameraPos();

    // Render loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Smoothly interpolate heights of vector pillars
      barsRef.current.forEach(bar => {
        bar.currentHeight += (bar.targetHeight - bar.currentHeight) * 0.12;
        bar.mesh.scale.y = Math.max(0.01, bar.currentHeight);
        bar.mesh.position.y = bar.currentHeight / 2;
        bar.topLight.position.y = bar.currentHeight + 0.3;
      });

      renderer.render(scene, camera);
    };
    animate();

    // Window resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update 3D nodes & bars when graph or step changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear old bars & curves
    barsRef.current.forEach(b => {
      scene.remove(b.mesh);
      scene.remove(b.topLight);
    });
    barsRef.current = [];

    curvesRef.current.forEach(c => scene.remove(c));
    curvesRef.current = [];

    const N = nodes.length;
    if (N === 0) return;

    const ringRadius = 7.5;
    const nodeCoords: THREE.Vector3[] = [];

    // Colors for nodes
    const barGeo = new THREE.CylinderGeometry(0.35, 0.45, 1, 24);
    const topSphereGeo = new THREE.SphereGeometry(0.35, 16, 16);

    nodes.forEach((node, i) => {
      const angle = (i / N) * Math.PI * 2;
      const x = Math.cos(angle) * ringRadius;
      const z = Math.sin(angle) * ringRadius;
      nodeCoords.push(new THREE.Vector3(x, 0, z));

      // Bar material with gradient-like indigo hue
      const hue = 0.6 + (i / N) * 0.15;
      const barColor = new THREE.Color().setHSL(hue, 0.75, 0.55);

      const barMat = new THREE.MeshStandardMaterial({
        color: barColor,
        roughness: 0.3,
        metalness: 0.2,
      });

      const mesh = new THREE.Mesh(barGeo, barMat);
      mesh.position.set(x, 0.5, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      // Top glowing indicator sphere
      const sphereMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: barColor,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      });
      const topLight = new THREE.Mesh(topSphereGeo, sphereMat);
      topLight.position.set(x, 1, z);
      scene.add(topLight);

      barsRef.current.push({
        mesh,
        topLight,
        targetHeight: 1,
        currentHeight: 0.1,
      });
    });

    // Draw 3D curved transition arcs for edges
    edges.forEach(e => {
      const uIdx = nodes.findIndex(n => n.id === e.source);
      const vIdx = nodes.findIndex(n => n.id === e.target);
      if (uIdx !== -1 && vIdx !== -1) {
        const p1 = nodeCoords[uIdx];
        const p2 = nodeCoords[vIdx];

        // Midpoint raised into 3D arc
        const mid = new THREE.Vector3()
          .addVectors(p1, p2)
          .multiplyScalar(0.5);
        mid.y += Math.min(5, p1.distanceTo(p2) * 0.45);

        const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
        const points = curve.getPoints(24);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({
          color: 0x94a3b8,
          transparent: true,
          opacity: 0.45,
          linewidth: 1,
        });
        const line = new THREE.Line(lineGeo, lineMat);
        scene.add(line);
        curvesRef.current.push(line);
      }
    });
  }, [nodes, edges]);

  // Sync heights to current iteration step pVector
  useEffect(() => {
    const currentStep = iterationSteps[currentStepIndex];
    if (!currentStep || !barsRef.current.length) return;

    const pVec = currentStep.pVector;
    const maxVal = Math.max(...pVec, 0.05);

    pVec.forEach((val, i) => {
      if (barsRef.current[i]) {
        // Height scale between 0.5 and 9.0 in 3D scene
        const h = (val / maxVal) * 8.0 + 0.4;
        barsRef.current[i].targetHeight = h;
      }
    });
  }, [currentStepIndex, iterationSteps]);

  // Mouse drag handlers for 3D gesture rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    prevMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !cameraRef.current) return;
    const deltaX = e.clientX - prevMousePos.current.x;
    const deltaY = e.clientY - prevMousePos.current.y;
    prevMousePos.current = { x: e.clientX, y: e.clientY };

    const sph = sphericalRef.current;
    sph.theta -= deltaX * 0.008;
    sph.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, sph.phi - deltaY * 0.008));

    const camera = cameraRef.current;
    camera.position.x = sph.radius * Math.sin(sph.phi) * Math.sin(sph.theta);
    camera.position.y = sph.radius * Math.cos(sph.phi);
    camera.position.z = sph.radius * Math.sin(sph.phi) * Math.cos(sph.theta);
    camera.lookAt(0, 2, 0);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!cameraRef.current) return;
    const sph = sphericalRef.current;
    sph.radius = Math.max(12, Math.min(45, sph.radius + e.deltaY * 0.025));

    const camera = cameraRef.current;
    camera.position.x = sph.radius * Math.sin(sph.phi) * Math.sin(sph.theta);
    camera.position.y = sph.radius * Math.cos(sph.phi);
    camera.position.z = sph.radius * Math.sin(sph.phi) * Math.cos(sph.theta);
    camera.lookAt(0, 2, 0);
  };

  const curStep = iterationSteps[currentStepIndex] || {
    step: 0,
    delta: 1.0,
    maxDiff: 1.0,
    pVector: [],
  };

  return (
    <div className="relative w-full h-[520px] bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-md">
      {/* 3D Canvas Mount */}
      <div
        ref={mountRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Top Floating Badge & Mathematical Info */}
      <div className="absolute top-3 left-3 z-10 bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-lg border border-slate-700 text-xs text-slate-200">
        <div className="flex items-center space-x-2 font-medium">
          <Activity size={15} className="text-indigo-400" />
          <span>转移矩阵幂迭代 3D 几何演播</span>
          <span className="text-slate-500">|</span>
          <span className="font-mono text-indigo-300">p^(t+1) = G · p^(t)</span>
        </div>
        <div className="mt-1 flex items-center space-x-3 text-[11px] text-slate-400">
          <span>拖拽鼠标：任意 3D 旋转视角</span>
          <span>滚轮：缩放高度</span>
          <span>阻尼 d: <strong className="text-amber-400 font-mono">{dampingFactor}</strong></span>
        </div>
      </div>

      {/* Convergence Gauge on Top Right */}
      <div className="absolute top-3 right-3 z-10 bg-slate-900/85 backdrop-blur-md p-3 rounded-lg border border-slate-700 text-xs text-slate-300 min-w-[210px]">
        <div className="flex justify-between items-center mb-1">
          <span className="text-slate-400">当前迭代步 (Step t):</span>
          <strong className="text-indigo-400 font-mono text-sm">
            {curStep.step} / {Math.max(0, iterationSteps.length - 1)}
          </strong>
        </div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-slate-400">残差范数 ||Δp||₁:</span>
          <strong className="text-emerald-400 font-mono">
            {curStep.delta.toExponential(3)}
          </strong>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-400">最大单分量偏移:</span>
          <strong className="text-sky-400 font-mono">
            {curStep.maxDiff.toExponential(3)}
          </strong>
        </div>

        {/* Progress Bar of Residual */}
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-indigo-500 h-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(5, (1 - Math.min(1, curStep.delta)) * 100))}%` }}
          />
        </div>
        <div className="text-[10px] text-right mt-1 text-slate-500">
          {curStep.delta < 1e-5 ? '✓ 已平稳收敛至主特征向量 (λ₁=1)' : '⟳ 正在通过主特征值空间投影收敛…'}
        </div>
      </div>

      {/* Bottom Timeline Controls */}
      <div className="absolute bottom-4 left-4 right-4 z-10 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
        {/* Playback Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onStepChange(0)}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
            title="重置到 Step 0 (均匀初始向量 1/N)"
          >
            <RotateCcw size={15} />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium transition-colors"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? '暂停' : '连续演播'}</span>
          </button>
          <button
            onClick={() => onStepChange(Math.min(iterationSteps.length - 1, currentStepIndex + 1))}
            disabled={currentStepIndex >= iterationSteps.length - 1}
            className="p-1.5 hover:bg-slate-800 disabled:opacity-40 rounded text-slate-300 hover:text-white transition-colors"
            title="单步推进 (Step Forward)"
          >
            <SkipForward size={15} />
          </button>
        </div>

        {/* Timeline Slider */}
        <div className="flex-1 max-w-md flex items-center space-x-2">
          <span className="font-mono text-slate-400 text-[11px]">0</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, iterationSteps.length - 1)}
            value={currentStepIndex}
            onChange={e => onStepChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <span className="font-mono text-slate-400 text-[11px]">{Math.max(0, iterationSteps.length - 1)}</span>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center space-x-2 text-slate-400">
          <span>演播步频:</span>
          <select
            value={playbackSpeed}
            onChange={e => setPlaybackSpeed(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-slate-200 px-2 py-1 rounded text-xs focus:outline-none"
          >
            <option value={1500}>0.5x 缓速</option>
            <option value={800}>1.0x 标准</option>
            <option value={300}>2.5x 极速</option>
          </select>
        </div>
      </div>
    </div>
  );
};
