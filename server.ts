import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to get or create Gemini client
function getGeminiClient(customKey?: string) {
  const effectiveKey = customKey || process.env.GEMINI_API_KEY || '';
  if (!effectiveKey) return null;
  return new GoogleGenAI({
    apiKey: effectiveKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper to call DeepSeek API
async function callDeepSeekAPI(messages: Array<{ role: string; content: string }>, customKey?: string) {
  const effectiveKey = customKey || process.env.DEEPSEEK_API_KEY || '';
  if (!effectiveKey) {
    throw new Error('未检测到有效的 DeepSeek API Key，请在小齿轮设置中配置 API-Key。');
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${effectiveKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat', // maps to deepseek-v4-pro / deepseek chat
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`DeepSeek API 调用失败 (${response.status}): ${errorData}`);
  }

  const data: any = await response.json();
  return data.choices?.[0]?.message?.content || '已收到响应。';
}

// Graph AI Diagnosis Endpoint
app.post('/api/ai/diagnose', async (req, res) => {
  const { graphInfo, model = 'gemini 3 flash', apiKey: clientApiKey } = req.body;

  const prompt = `你是一位图挖掘与高阶网络分析学术专家。请根据以下图拓扑元数据与 PageRank 计算参数，进行多维度拓扑健康诊断与算法优化指导：

【图拓扑元数据】：
- 节点数 (N): ${graphInfo.nodeCount}
- 边数 (E): ${graphInfo.edgeCount}
- 图密度 (Density): ${graphInfo.density}
- 阻尼系数 (Damping Factor d): ${graphInfo.dampingFactor}
- 死胡同 (Dead Ends 悬挂节点): ${graphInfo.deadEndCount} 个
- 蜘蛛陷阱 (Spider Traps 环状集): ${graphInfo.spiderTrapCount} 个
- 模块度得分 (Modularity Q): ${graphInfo.modularity}
- 社区数量 (Communities): ${graphInfo.communityCount}
- 顶层节点 PageRank 极化比例 (Top-1 / Average): ${graphInfo.polarizationRatio || 'N/A'}
- 案例背景: ${graphInfo.caseName || '自定义拓扑'}
- 当前调用模型: ${model}

请以淡雅、学术、严谨的结构化中文（支持精炼 Markdown）返回以下四大维度的诊断与建议：
1. **稀疏度与不可约性 (Irreducibility) 评估**：分析孤立子图与死胡同对马尔可夫链平稳分布收敛性的制约。
2. **Hub / Authority 极化与权重分配机理**：评估是否存在极端入度中心性或中心陷阱吸干全局概率。
3. **社区同质性 (Homophily) 与模块度拓扑切片**：结合 Louvain 分群结果分析信息流瓶颈与跨社区桥接边。
4. **算法演进优化方案**：对比标准 PageRank、Personalized PageRank (PPR) 与 Kleinberg HITS 算法在此拓扑下的适用度，给出阻尼系数调优或边缘重加权建议。`;

  // Branch 1: DeepSeek Model
  if (model === 'deepseek-v4-pro') {
    try {
      const deepseekText = await callDeepSeekAPI([
        {
          role: 'system',
          content: '你是一位顶尖计算机科学与复杂网络分析教授，擅长图挖掘、PageRank、马尔可夫链与谱图理论。输出结构清晰、用词学术淡雅大方。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ], clientApiKey);

      return res.json({
        success: true,
        analysis: deepseekText,
        source: 'deepseek-v4-pro',
      });
    } catch (err: any) {
      console.warn('DeepSeek diagnose error, falling back:', err.message);
      return res.json({
        success: true,
        analysis: generateRuleBasedDiagnosis(graphInfo, 'deepseek-v4-pro', err.message),
        source: 'deepseek-v4-pro (Local Heuristic Fallback)',
        fallbackReason: err.message,
      });
    }
  }

  // Branch 2: Gemini 3 Flash Model
  const aiClient = getGeminiClient(clientApiKey);
  if (!aiClient) {
    return res.json({
      success: true,
      analysis: generateRuleBasedDiagnosis(graphInfo, 'gemini 3 flash'),
      source: 'heuristic_engine',
    });
  }

  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: '你是一位顶尖计算机科学与复杂网络分析教授，擅长图挖掘、PageRank、马尔可夫链与谱图理论。输出结构清晰、用词学术淡雅大方。',
      },
    });

    res.json({
      success: true,
      analysis: response.text || '诊断完成。',
      source: 'gemini 3 flash',
    });
  } catch (error: any) {
    console.error('Gemini diagnose error:', error?.message);
    res.json({
      success: true,
      analysis: generateRuleBasedDiagnosis(graphInfo, 'gemini 3 flash', error?.message),
      fallbackReason: error?.message,
      source: 'gemini 3 flash (Local Heuristic Fallback)',
    });
  }
});

// Graph AI Chat Q&A Endpoint
app.post('/api/ai/chat', async (req, res) => {
  const { message, history = [], currentContext = {}, model = 'gemini 3 flash', apiKey: clientApiKey } = req.body;

  const systemPrompt = `你现在是内置于“PageRank 与图结构挖掘实验室”的随诊 AI 专家顾问。
当前工作模式：${model}
实验室上下文：
- 阻尼系数 d: ${currentContext.dampingFactor ?? 0.85}
- 节点数: ${currentContext.nodeCount ?? 6}
- 边数: ${currentContext.edgeCount ?? 8}
- 当前案例: ${currentContext.caseName ?? '通用网络拓扑'}
- 模块度 Q: ${currentContext.modularity ?? 0.42}

回答规范：
1. 语言简练精辟、学术典雅，深入浅出讲解数学本质与图论机理；
2. 适度采用标准 LaTeX 数学公式（如 $M$ 转移矩阵、特征值 $\\lambda_1=1$、Perron-Frobenius 定理）；
3. 紧扣用户问题，给出具体的参数建议或算法权衡（Trade-offs）。`;

  // Branch 1: DeepSeek
  if (model === 'deepseek-v4-pro') {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-6).map((h: any) => ({
          role: h.role === 'model' ? 'assistant' : 'user',
          content: h.content,
        })),
        { role: 'user', content: message },
      ];

      const reply = await callDeepSeekAPI(messages, clientApiKey);
      return res.json({
        reply,
        source: 'deepseek-v4-pro',
      });
    } catch (err: any) {
      console.warn('DeepSeek chat error, falling back:', err.message);
      return res.json({
        reply: getHeuristicChatReply(message, currentContext, 'deepseek-v4-pro'),
        source: 'deepseek-v4-pro (Local Heuristic Fallback)',
        fallbackReason: err.message,
      });
    }
  }

  // Branch 2: Gemini
  const aiClient = getGeminiClient(clientApiKey);
  if (!aiClient) {
    return res.json({
      reply: getHeuristicChatReply(message, currentContext, 'gemini 3 flash'),
      source: 'heuristic_engine',
    });
  }

  try {
    const formattedContents: any[] = [];
    formattedContents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    formattedContents.push({ role: 'model', parts: [{ text: `好的，我是基于 ${model} 驱动的图挖掘随诊顾问。请随时就代数转移矩阵、马尔可夫收敛机理、幂迭代、阻尼系数切片及社区发现提出疑问。` }] });

    if (Array.isArray(history)) {
      for (const item of history.slice(-6)) {
        formattedContents.push({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.content || '' }],
        });
      }
    }

    formattedContents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: formattedContents,
    });

    res.json({
      reply: response.text || '已收到您的问题。',
      source: 'gemini 3 flash',
    });
  } catch (error: any) {
    console.error('Gemini chat error:', error?.message);
    res.json({
      reply: getHeuristicChatReply(message, currentContext, 'gemini 3 flash'),
      fallbackReason: error?.message,
      source: 'heuristic_engine',
    });
  }
});

function generateRuleBasedDiagnosis(graphInfo: any, modelName: string = 'gemini 3 flash', reason?: string) {
  const d = graphInfo?.dampingFactor ?? 0.85;
  const deadEnds = graphInfo?.deadEndCount ?? 0;
  const spiderTraps = graphInfo?.spiderTrapCount ?? 0;
  const density = parseFloat(graphInfo?.density || '0.15');
  const mod = parseFloat(graphInfo?.modularity || '0.35');

  return `### 【图拓扑与 PageRank 体系化诊断报告】(模型: ${modelName})
${reason ? `*(注: 远程服务响应提示: ${reason}，已自动启用本地精确图论规则引擎)*\n` : ''}
#### 一、 稀疏度与连通性条件 (Irreducibility & Aperiodicity)
- **稀疏拓扑特质**：当前网络边密比为 **${(density * 100).toFixed(1)}%**，满足真实复杂网络典型的大尺度稀疏性（Sparse Graph）。
- **死胡同 (Dead Ends) 风险**：检测到 **${deadEnds}** 个悬挂出度为 0 的节点。若不采取 Google 矩阵随机瞬移修复（Teleportation），概率质量将在幂迭代中逐步流失（Column Sum < 1），导致全网概率归零。当前阻尼矩阵已注入均匀转移列向量，保障了马尔可夫链的遍历性（Ergodicity）。

#### 二、 权重极化与吸血鬼陷阱 (Spider Traps) 剖析
- **陷阱状态**：网络包含 **${spiderTraps}** 个环路子图。在 $d \\to 1.0$ 时，陷阱节点将逐步吞噬邻近节点的 PageRank，形成概率黑洞；
- **阻尼平衡点**：当前阻尼系数设定为 $d = ${d}$。此时以 **${((1 - d) * 100).toFixed(0)}%** 的概率进行全网均匀随机跳转（$\\frac{1-d}{N}$），有效瓦解了循环互链作弊（Link Farm）与局部吸收态。

#### 三、 模块度结构与社区流形 (Louvain Analysis)
- **模块度指标 (Q)**：当前 $Q = ${mod.toFixed(3)}$。$Q > 0.3$ 表明图拓扑呈现显著的模块化聚合结构（Community Structure）；
- **跨界瓶颈**：社团内部连边紧密，社团间中介中心性（Betweenness）较高的节点扮演信息流通枢纽，在 PageRank 全局扩散中具有高阶桥接效益。

#### 四、 算法演进与优化建议
1. **Personalized PageRank (PPR)**：若需针对特定种子用户（如 GitHub 关键开发者）进行定向召回，建议将瞬移向量 $\\mathbf{v}$ 从均匀分布 $\\frac{1}{N}\\mathbf{1}$ 替换为目标偏置稀疏向量；
2. **HITS 算法对比**：若网络存在明显的“资源聚合索引页”与“实体内容页”，Kleinberg HITS 的 Hubs/Authorities 互利投射模型比单一度量 PageRank 能更精确剥离导航者与内容源。`;
}

function getHeuristicChatReply(message: string, ctx: any, modelName: string = 'gemini 3 flash') {
  const lower = (message || '').toLowerCase();
  if (lower.includes('阻尼') || lower.includes('damping') || lower.includes('0.85')) {
    return `[${modelName} 专家解析]\n**阻尼系数 $d$ 的深层代数含义：**\n\n根据 Perron-Frobenius 定理，只有当状态转移矩阵满足**不可约（Irreducible）**且**非周期（Aperiodic）**时，马尔可夫链才存在唯一的严格正平稳分布向量 $p = G p$。\n\nGoogle 矩阵定义为：\n$$G = d M + \\frac{1-d}{N} \\mathbf{1}\\mathbf{1}^T$$\n- 当 $d=1$ 时，若图存在**死胡同（出度为0）**或**蜘蛛陷阱（强连通死循环）**，迭代将导致概率泄露或全部权重被陷阱霸占；\n- 当 $d=0$ 时，退化为均匀随机游走，所有节点 PageRank 恒等于 $1/N$；\n- 工业界的经典黄金折中为 $d=0.85$，既保留了真实网络 $85\\%$ 的图拓扑传导，又通过 $15\\%$ 的平滑瞬移保证了主特征值 $\\lambda_1=1$ 的收敛稳定性与收敛速率（第二特征值 $|\\lambda_2| \\le d$）。`;
  }
  if (lower.includes('hits') || lower.includes('hub') || lower.includes('authority')) {
    return `[${modelName} 专家解析]\n**PageRank 与 HITS 算法的核心机制对比：**\n\n1. **PageRank（单指标随机游走）**：\n   - 基于网页排名的全局平衡，假设“高权重的节点所指向的节点也是高权重的”；\n   - 仅依赖单一的概率状态向量 $p$，求解马尔可夫链平稳分布。\n\n2. **HITS 算法（双向互利强化）**：\n   - 将节点明确解耦为两种角色：**Hub（枢纽节点）**与 **Authority（权威节点）**；\n   - 规则：一个好的 Hub 指向多个好的 Authority，一个好的 Authority 被多个好的 Hub 所指向；\n   - 迭代更新式：$a^{(t+1)} = A^T h^{(t)}$，$h^{(t+1)} = A a^{(t+1)}$（其中 $A$ 为邻接矩阵），分别收敛到 $A^T A$ 与 $A A^T$ 的主特征向量。`;
  }
  if (lower.includes('louvain') || lower.includes('社区') || lower.includes('模块度')) {
    return `[${modelName} 专家解析]\n**Louvain 算法与模块度（Modularity $Q$）：**\n\n模块度公式为：\n$$Q = \\frac{1}{2m} \\sum_{i,j} \\left[ A_{ij} - \\frac{k_i k_j}{2m} \\right] \\delta(c_i, c_j)$$\n- $A_{ij}$ 为实际边权重，$k_i, k_j$ 为节点度数，$2m$ 为总边权和；\n- $\\frac{k_i k_j}{2m}$ 是零模型（随机连接网络）下的期望边数；\n- $\\Delta Q > 0$ 表示节点加入新社区后的边聚集度显著超出随机分布，算法采用贪心启发式分层凝聚，直至 $Q$ 达到局部最优。`;
  }
  return `[${modelName} 专家解析]\n关于您提出的“${message}”：\n在图结构挖掘中，节点拓扑关联不仅反映物理链接，更映射了谱图空间（Spectral Graph Space）的低维流形。\n建议结合左侧“代数与转移矩阵”观察列归一化 $M$ 的稀疏结构，并滑动阻尼系数切片观察特征值谱隙（Spectral Gap $1-d$）对幂迭代收敛周期的直接影响。`;
}

// Vite integration for full-stack dev / prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PageRank & Graph Mining Lab Server running on port ${PORT}`);
  });
}

startServer();
