export interface GraphNode {
  id: string;
  label: string;
  category?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  pageRank?: number;
  hubScore?: number;
  authScore?: number;
  community?: number;
  inDegree?: number;
  outDegree?: number;
  isDeadEnd?: boolean;
  isSpiderTrap?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  name: string;
  description: string;
}

export interface IterationStep {
  step: number;
  pVector: number[];
  delta: number;
  maxDiff: number;
}

export interface MatrixData {
  nodeIds: string[];
  nodeLabels: string[];
  adjMatrix: number[][]; // A[i][j]: edge from i to j
  transitionMatrix: number[][]; // M[i][j]: prob from j to i (column stochastic)
  googleMatrix: number[][]; // G = d*M + (1-d)/N * 1*1^T
  laplacianMatrix: number[][]; // L = D - A
}

export interface LouvainStep {
  step: number;
  modularity: number;
  communities: { [nodeId: string]: number };
  description: string;
}

export interface GraphMetrics {
  nodeCount: number;
  edgeCount: number;
  density: number;
  deadEndCount: number;
  spiderTrapCount: number;
  modularity: number;
  communityCount: number;
  avgInDegree: number;
  maxInDegree: number;
  polarizationRatio: number;
  dampingFactor: number;
  iterationsToConverge: number;
  spectralGap: number;
}
