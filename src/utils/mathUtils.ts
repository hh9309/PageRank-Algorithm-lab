import { GraphNode, GraphEdge, MatrixData, IterationStep, LouvainStep, GraphMetrics } from '../types/graph';

// Compute Adjacency, Transition, Google, and Laplacian matrices
export function computeMatrices(nodes: GraphNode[], edges: GraphEdge[], dampingFactor: number = 0.85): MatrixData {
  const N = nodes.length;
  const nodeIds = nodes.map(n => n.id);
  const nodeLabels = nodes.map(n => n.label);
  const idToIndex = new Map<string, number>();
  nodeIds.forEach((id, idx) => idToIndex.set(id, idx));

  // 1. Adjacency Matrix A (A[i][j] = 1 if edge i -> j)
  const adjMatrix: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
  edges.forEach(e => {
    const fromIdx = idToIndex.get(e.source);
    const toIdx = idToIndex.get(e.target);
    if (fromIdx !== undefined && toIdx !== undefined) {
      adjMatrix[fromIdx][toIdx] = e.weight || 1;
    }
  });

  // Out degrees and in degrees
  const outDegrees = Array(N).fill(0);
  const inDegrees = Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (adjMatrix[i][j] > 0) {
        outDegrees[i] += adjMatrix[i][j];
        inDegrees[j] += adjMatrix[i][j];
      }
    }
  }

  // 2. Column-Stochastic Transition Matrix M (M[i][j] = prob of moving from j to i)
  const transitionMatrix: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
  for (let j = 0; j < N; j++) {
    const outDeg = outDegrees[j];
    if (outDeg > 0) {
      for (let i = 0; i < N; i++) {
        transitionMatrix[i][j] = adjMatrix[j][i] / outDeg;
      }
    } else {
      // Dead End handling in transition matrix before damping: uniform 1/N
      for (let i = 0; i < N; i++) {
        transitionMatrix[i][j] = 1 / N;
      }
    }
  }

  // 3. Google Matrix G = d * M + (1 - d) / N * 1 * 1^T
  const googleMatrix: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
  const teleportProb = (1 - dampingFactor) / N;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      googleMatrix[i][j] = dampingFactor * transitionMatrix[i][j] + teleportProb;
    }
  }

  // 4. Laplacian Matrix L = D - A (Undirected or in-degree based)
  const laplacianMatrix: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i === j) {
        laplacianMatrix[i][j] = outDegrees[i];
      } else {
        laplacianMatrix[i][j] = -adjMatrix[i][j];
      }
    }
  }

  return {
    nodeIds,
    nodeLabels,
    adjMatrix,
    transitionMatrix,
    googleMatrix,
    laplacianMatrix,
  };
}

// Compute Power Iteration steps
export function computePowerIteration(
  matrix: number[][],
  maxSteps: number = 40,
  epsilon: number = 1e-6
): IterationStep[] {
  const N = matrix.length;
  if (N === 0) return [];

  const steps: IterationStep[] = [];
  let p = Array(N).fill(1 / N);

  steps.push({
    step: 0,
    pVector: [...p],
    delta: 1.0,
    maxDiff: 1.0,
  });

  for (let s = 1; s <= maxSteps; s++) {
    const nextP = Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      let sum = 0;
      for (let j = 0; j < N; j++) {
        sum += matrix[i][j] * p[j];
      }
      nextP[i] = sum;
    }

    // Measure delta
    let delta = 0;
    let maxDiff = 0;
    for (let i = 0; i < N; i++) {
      const diff = Math.abs(nextP[i] - p[i]);
      delta += diff;
      if (diff > maxDiff) maxDiff = diff;
    }

    steps.push({
      step: s,
      pVector: [...nextP],
      delta,
      maxDiff,
    });

    p = nextP;
    if (delta < epsilon) break;
  }

  return steps;
}

// Simulate Power Iteration with NO damping (raw adjacency normalized without teleportation)
// to clearly demonstrate dead end probability leak or spider trap absorption
export function computeRawIterationWithoutTeleport(
  nodes: GraphNode[],
  edges: GraphEdge[],
  maxSteps: number = 25
): IterationStep[] {
  const N = nodes.length;
  if (N === 0) return [];

  const idToIndex = new Map<string, number>();
  nodes.forEach((n, idx) => idToIndex.set(n.id, idx));

  const outDegrees = Array(N).fill(0);
  const rawM = Array.from({ length: N }, () => Array(N).fill(0));

  edges.forEach(e => {
    const u = idToIndex.get(e.source);
    const v = idToIndex.get(e.target);
    if (u !== undefined && v !== undefined) {
      rawM[v][u] = 1;
      outDegrees[u] += 1;
    }
  });

  for (let j = 0; j < N; j++) {
    if (outDegrees[j] > 0) {
      for (let i = 0; i < N; i++) {
        rawM[i][j] /= outDegrees[j];
      }
    }
    // If dead end (outDegree == 0), column stays 0!
  }

  const steps: IterationStep[] = [];
  let p = Array(N).fill(1 / N);
  steps.push({ step: 0, pVector: [...p], delta: 1, maxDiff: 1 });

  for (let s = 1; s <= maxSteps; s++) {
    const nextP = Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      let sum = 0;
      for (let j = 0; j < N; j++) {
        sum += rawM[i][j] * p[j];
      }
      nextP[i] = sum;
    }

    let delta = 0;
    let maxDiff = 0;
    for (let i = 0; i < N; i++) {
      const diff = Math.abs(nextP[i] - p[i]);
      delta += diff;
      if (diff > maxDiff) maxDiff = diff;
    }

    steps.push({
      step: s,
      pVector: [...nextP],
      delta,
      maxDiff,
    });
    p = nextP;
  }

  return steps;
}

// Compute HITS (Hubs and Authorities)
export function computeHITS(nodes: GraphNode[], edges: GraphEdge[], iterations: number = 20) {
  const N = nodes.length;
  if (N === 0) return { hubs: [], authorities: [] };

  const idToIndex = new Map<string, number>();
  nodes.forEach((n, idx) => idToIndex.set(n.id, idx));

  // Adjacency matrix A: A[i][j] = 1 if i -> j
  const A = Array.from({ length: N }, () => Array(N).fill(0));
  edges.forEach(e => {
    const u = idToIndex.get(e.source);
    const v = idToIndex.get(e.target);
    if (u !== undefined && v !== undefined) {
      A[u][v] = 1;
    }
  });

  let auth = Array(N).fill(1);
  let hub = Array(N).fill(1);

  for (let it = 0; it < iterations; it++) {
    // a = A^T * h
    const newAuth = Array(N).fill(0);
    for (let p = 0; p < N; p++) {
      for (let q = 0; q < N; q++) {
        if (A[q][p] > 0) {
          newAuth[p] += hub[q];
        }
      }
    }

    // normalize auth
    let authNorm = Math.sqrt(newAuth.reduce((sum, v) => sum + v * v, 0)) || 1;
    for (let i = 0; i < N; i++) newAuth[i] /= authNorm;

    // h = A * a
    const newHub = Array(N).fill(0);
    for (let p = 0; p < N; p++) {
      for (let q = 0; q < N; q++) {
        if (A[p][q] > 0) {
          newHub[p] += newAuth[q];
        }
      }
    }

    // normalize hub
    let hubNorm = Math.sqrt(newHub.reduce((sum, v) => sum + v * v, 0)) || 1;
    for (let i = 0; i < N; i++) newHub[i] /= hubNorm;

    auth = newAuth;
    hub = newHub;
  }

  return {
    authorities: auth,
    hubs: hub,
  };
}

// Compute Modularity Q for a given community partition
export function calculateModularity(nodes: GraphNode[], edges: GraphEdge[], communities: { [nodeId: string]: number }): number {
  const m = edges.length;
  if (m === 0) return 0;

  const degrees: { [id: string]: number } = {};
  nodes.forEach(n => degrees[n.id] = 0);
  edges.forEach(e => {
    degrees[e.source] = (degrees[e.source] || 0) + 1;
    degrees[e.target] = (degrees[e.target] || 0) + 1;
  });

  const twoM = 2 * m;
  let q = 0;

  // Build quick adjacency
  const edgeSet = new Set<string>();
  edges.forEach(e => {
    edgeSet.add(`${e.source}->${e.target}`);
    edgeSet.add(`${e.target}->${e.source}`);
  });

  for (let i = 0; i < nodes.length; i++) {
    for (let j = 0; j < nodes.length; j++) {
      const u = nodes[i].id;
      const v = nodes[j].id;
      if (communities[u] === communities[v]) {
        const A_uv = edgeSet.has(`${u}->${v}`) ? 1 : 0;
        const expected = (degrees[u] * degrees[v]) / twoM;
        q += (A_uv - expected);
      }
    }
  }

  return q / twoM;
}

// Dynamic Louvain Community Detection Stepper
export function computeLouvainSteps(nodes: GraphNode[], edges: GraphEdge[]): LouvainStep[] {
  const steps: LouvainStep[] = [];
  if (nodes.length === 0) return steps;

  // Step 0: each node in its own community
  let comms: { [nodeId: string]: number } = {};
  nodes.forEach((n, idx) => comms[n.id] = idx);

  let q = calculateModularity(nodes, edges, comms);
  steps.push({
    step: 0,
    modularity: q,
    communities: { ...comms },
    description: '初始状态：每个节点归属于独立独立单节点社区 (N 个社区)',
  });

  // Step 1: greedy local moves
  let changed = true;
  let currentStep = 1;
  const maxIterations = 4;

  while (changed && currentStep <= maxIterations) {
    changed = false;
    for (const node of nodes) {
      const currentComm = comms[node.id];
      // Find neighbor communities
      const neighborComms = new Set<number>();
      edges.forEach(e => {
        if (e.source === node.id) neighborComms.add(comms[e.target]);
        if (e.target === node.id) neighborComms.add(comms[e.source]);
      });

      let bestComm = currentComm;
      let bestQ = calculateModularity(nodes, edges, comms);

      for (const targetComm of neighborComms) {
        if (targetComm === currentComm) continue;
        const testComms = { ...comms, [node.id]: targetComm };
        const testQ = calculateModularity(nodes, edges, testComms);
        if (testQ > bestQ + 1e-4) {
          bestQ = testQ;
          bestComm = targetComm;
        }
      }

      if (bestComm !== currentComm) {
        comms[node.id] = bestComm;
        changed = true;
      }
    }

    // Remap community IDs to 0, 1, 2...
    const uniqueComms = Array.from(new Set(Object.values(comms)));
    const remapped: { [nodeId: string]: number } = {};
    nodes.forEach(n => {
      remapped[n.id] = uniqueComms.indexOf(comms[n.id]);
    });
    comms = remapped;

    const newQ = calculateModularity(nodes, edges, comms);
    steps.push({
      step: currentStep,
      modularity: newQ,
      communities: { ...comms },
      description: `阶段 ${currentStep}：局部模块度增益贪心迭代，凝聚为 ${uniqueComms.length} 个高内聚社区 (Q = ${newQ.toFixed(4)})`,
    });

    currentStep++;
  }

  return steps;
}

// Compute comprehensive Graph Metrics
export function analyzeGraphTopology(
  nodes: GraphNode[],
  edges: GraphEdge[],
  dampingFactor: number = 0.85
): { metrics: GraphMetrics; decoratedNodes: GraphNode[] } {
  const N = nodes.length;
  const E = edges.length;
  const idToIndex = new Map<string, number>();
  nodes.forEach((n, idx) => idToIndex.set(n.id, idx));

  const inDegrees = Array(N).fill(0);
  const outDegrees = Array(N).fill(0);

  edges.forEach(e => {
    const u = idToIndex.get(e.source);
    const v = idToIndex.get(e.target);
    if (u !== undefined && v !== undefined) {
      outDegrees[u]++;
      inDegrees[v]++;
    }
  });

  // Matrices & PageRank
  const matrices = computeMatrices(nodes, edges, dampingFactor);
  const powerSteps = computePowerIteration(matrices.googleMatrix, 45, 1e-6);
  const finalPR = powerSteps.length > 0 ? powerSteps[powerSteps.length - 1].pVector : Array(N).fill(1 / N);
  const hits = computeHITS(nodes, edges, 25);
  const louvainSteps = computeLouvainSteps(nodes, edges);
  const finalComm = louvainSteps.length > 0 ? louvainSteps[louvainSteps.length - 1].communities : {};

  // Detect Dead Ends (outDegree === 0)
  let deadEndCount = 0;
  // Detect Spider Traps (nodes in small loop with no outward transitions)
  let spiderTrapCount = 0;

  const decoratedNodes: GraphNode[] = nodes.map((node, i) => {
    const isDead = outDegrees[i] === 0;
    if (isDead) deadEndCount++;

    // Check if self-loop only or outgoing is 0 to other nodes
    const hasOnlySelfLoop = edges.filter(e => e.source === node.id).every(e => e.target === node.id) && edges.some(e => e.source === node.id);
    const isTrap = hasOnlySelfLoop;
    if (isTrap) spiderTrapCount++;

    return {
      ...node,
      pageRank: finalPR[i],
      hubScore: hits.hubs[i],
      authScore: hits.authorities[i],
      inDegree: inDegrees[i],
      outDegree: outDegrees[i],
      community: finalComm[node.id] !== undefined ? finalComm[node.id] : 0,
      isDeadEnd: isDead,
      isSpiderTrap: isTrap,
    };
  });

  const density = N > 1 ? E / (N * (N - 1)) : 0;
  const avgInDeg = N > 0 ? E / N : 0;
  const maxInDeg = Math.max(...inDegrees, 0);
  const maxPR = Math.max(...finalPR, 0.001);
  const avgPR = 1 / (N || 1);
  const polarizationRatio = maxPR / avgPR;
  const uniqueCommunities = new Set(Object.values(finalComm)).size || 1;
  const finalQ = louvainSteps.length > 0 ? louvainSteps[louvainSteps.length - 1].modularity : 0;

  return {
    metrics: {
      nodeCount: N,
      edgeCount: E,
      density: parseFloat(density.toFixed(4)),
      deadEndCount,
      spiderTrapCount,
      modularity: parseFloat(finalQ.toFixed(4)),
      communityCount: uniqueCommunities,
      avgInDegree: parseFloat(avgInDeg.toFixed(2)),
      maxInDegree: maxInDeg,
      polarizationRatio: parseFloat(polarizationRatio.toFixed(2)),
      dampingFactor,
      iterationsToConverge: powerSteps.length,
      spectralGap: parseFloat((1 - dampingFactor).toFixed(4)),
    },
    decoratedNodes,
  };
}
