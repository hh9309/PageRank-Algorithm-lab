import React, { useState } from 'react';
import {
  Split,
  Compass,
  AlertTriangle,
  ShieldX,
  Activity,
  Layers,
  Sparkles,
  GitBranch,
  ShieldCheck,
  CheckCircle,
  Network,
  Share2,
  Cpu,
  BookOpen,
  Search,
  Code,
  DollarSign,
  Dna,
} from 'lucide-react';

export const KnowledgeSlices: React.FC = () => {
  const [activeSlice, setActiveSlice] = useState<number>(1);

  return (
    <div className="space-y-6">
      {/* 6 Slice Tab Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Slice 1 */}
        <button
          onClick={() => setActiveSlice(1)}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeSlice === 1
              ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center space-x-1.5 text-indigo-700 font-semibold text-xs mb-1">
            <Split size={14} />
            <span>【切片一】算法机理</span>
          </div>
          <div className="text-[11px] text-slate-500 line-clamp-1">
            PageRank vs HITS 投射
          </div>
        </button>

        {/* Slice 2 */}
        <button
          onClick={() => setActiveSlice(2)}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeSlice === 2
              ? 'bg-teal-50 border-teal-400 ring-2 ring-teal-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center space-x-1.5 text-teal-700 font-semibold text-xs mb-1">
            <Compass size={14} />
            <span>【切片二】空间表示</span>
          </div>
          <div className="text-[11px] text-slate-500 line-clamp-1">
            非欧几里得流形与谱图
          </div>
        </button>

        {/* Slice 3 */}
        <button
          onClick={() => setActiveSlice(3)}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeSlice === 3
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center space-x-1.5 text-amber-700 font-semibold text-xs mb-1">
            <AlertTriangle size={14} />
            <span>【切片三】三大陷阱</span>
          </div>
          <div className="text-[11px] text-slate-500 line-clamp-1">
            阻尼吸干与不可约失效
          </div>
        </button>

        {/* Slice 4 */}
        <button
          onClick={() => setActiveSlice(4)}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeSlice === 4
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center space-x-1.5 text-rose-700 font-semibold text-xs mb-1">
            <ShieldX size={14} />
            <span>【切片四】误区警示</span>
          </div>
          <div className="text-[11px] text-slate-500 line-clamp-1">
            高入度 ≠ 高权威与作弊
          </div>
        </button>

        {/* Slice 5 (NEW) */}
        <button
          onClick={() => setActiveSlice(5)}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeSlice === 5
              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center space-x-1.5 text-blue-700 font-semibold text-xs mb-1">
            <Activity size={14} />
            <span>【切片五】马尔可夫链</span>
          </div>
          <div className="text-[11px] text-slate-500 line-clamp-1">
            转移矩阵与稳态收敛
          </div>
        </button>

        {/* Slice 6 (NEW) */}
        <button
          onClick={() => setActiveSlice(6)}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeSlice === 6
              ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center space-x-1.5 text-purple-700 font-semibold text-xs mb-1">
            <Sparkles size={14} />
            <span>【切片六】应用场景</span>
          </div>
          <div className="text-[11px] text-slate-500 line-clamp-1">
            搜索、开源、科研与风控
          </div>
        </button>
      </div>

      {/* Slice 1 Details */}
      {activeSlice === 1 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
            <h3 className="font-semibold text-slate-800 text-sm">
              【切片一：两大图挖掘算法机理差异深度剖析】
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 leading-relaxed">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="font-bold text-indigo-700 text-sm flex items-center space-x-2">
                <span>PageRank 算法 (Brin & Page, 1998)</span>
              </div>
              <ul className="space-y-2 list-disc pl-4">
                <li><strong>建模思想</strong>：基于全网无监督随机游走（Random Surfer），将节点重要性看作一种在网络中流动的“流动资金”；</li>
                <li><strong>状态空间</strong>：单一稳态分布向量 $p$，满足平稳方程 $p = G p$；</li>
                <li><strong>传播机制</strong>：入度传导机制——一个网页的排名由所有指向它的网页的排名均分加权决定；</li>
                <li><strong>适用场景</strong>：静态通用大尺度网络排序（如通用搜索引擎、GitHub 开源生态核心项目影响力评估）。</li>
              </ul>
              <div className="p-2.5 bg-white rounded border border-slate-200 font-mono text-[11px] text-indigo-900">
                G = d M + [(1-d)/N] 1 1ᵀ
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="font-bold text-teal-700 text-sm flex items-center space-x-2">
                <span>Kleinberg HITS 算法 (Jon Kleinberg, 1999)</span>
              </div>
              <ul className="space-y-2 list-disc pl-4">
                <li><strong>建模思想</strong>：将节点解耦为两种对偶属性——<strong>Hubs (枢纽节点)</strong> 与 <strong>Authorities (权威节点)</strong>；</li>
                <li><strong>状态空间</strong>：双向量相互投射更新：{'$a^{(t+1)} = A^T h^{(t)}$'}，以及 {'$h^{(t+1)} = A a^{(t+1)}$'}；</li>
                <li><strong>互利强化</strong>：一个优秀的 Hub 指向许多权威网页；一个优秀的 Authority 被许多优质枢纽所指向；</li>
                <li><strong>适用场景</strong>：主题敏感检索（Topic-Specific）、文献引文分析（综述文献是 Hub，原始理论是 Authority）。</li>
              </ul>
              <div className="p-2.5 bg-white rounded border border-slate-200 font-mono text-[11px] text-teal-900">
                a* ∈ 主特征向量(Aᵀ A),  h* ∈ 主特征向量(A Aᵀ)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slice 2 Details */}
      {activeSlice === 2 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />
            <h3 className="font-semibold text-slate-800 text-sm">
              【切片二：适用条件与非欧空间表示学习】
            </h3>
          </div>

          <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
            <p>
              传统机器学习与统计物理通常假设数据分布于平坦的欧几里得空间（如网格图像、序列文本），具备固定平移不变性。
              然而现实世界的复杂关系（学术引用、社交转推、蛋白质相互作用、代码依赖）呈现出<strong>非欧几里得结构（Non-Euclidean Structure）</strong>，
              具有度数分布长尾性、无标度（Scale-Free）与高聚类性。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-800 text-xs">1. 拓扑向马尔可夫链映射</div>
                <div className="text-[11px] text-slate-500">
                  将离散的网络连通图通过列出度归一化，抽象为离散状态空间上的马尔可夫决策过程，将图路径搜索转化为矩阵特征值求解。
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-800 text-xs">2. 谱图低维投影</div>
                <div className="text-[11px] text-slate-500">
                  图拉普拉斯矩阵 $L = D - A$ 及其特征值谱空间构成了图信号处理的傅里叶基，揭示了节点在全局流形上的潜在流向与瓶颈割集。
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-800 text-xs">3. 连续平稳收敛条件</div>
                <div className="text-[11px] text-slate-500">
                  严格依赖<strong>不可约（Irreducible）</strong>与<strong>非周期（Aperiodic）</strong>双重充分条件，保障马尔可夫链遍历定理成立。
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slice 3 Details */}
      {activeSlice === 3 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
            <h3 className="font-semibold text-slate-800 text-sm">
              【切片三：工业级图分析三大致命陷阱】
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2 text-amber-950">
              <div className="font-bold flex items-center space-x-1.5 text-amber-800">
                <AlertTriangle size={15} />
                <span>陷阱一：阻尼系数 d 过高吸干全局</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                若阻尼系数盲目设为 $d \ge 0.99$ 或 $1.0$，一旦图中包含局部的微小回路（如子图互链），
                经过数十轮幂迭代后，该小团伙将像黑洞一般吸干全网绝大部分权重，导致其余正常节点的权重接近于零。
              </p>
            </div>

            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2 text-amber-950">
              <div className="font-bold flex items-center space-x-1.5 text-amber-800">
                <AlertTriangle size={15} />
                <span>陷阱二：忽略边权重混淆强弱关联</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                在科研论文合作或社交传播中，一次偶然点击与数百次实质学术合作如果被等同为无权边 $w=1$，
                会导致噪声噪音被大幅放大。现代图挖掘必须采用加权转移矩阵 {'$M_{ij} = w_{ji} / \\sum_k w_{jk}$'}。
              </p>
            </div>

            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2 text-amber-950">
              <div className="font-bold flex items-center space-x-1.5 text-amber-800">
                <AlertTriangle size={15} />
                <span>陷阱三：连通性差导致不可约失效</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                若图存在多个互不连通的孤立子图，转移矩阵将退化为块对角矩阵，导致主特征值 $\lambda_1=1$ 的重数大于 1，
                稳态向量不再唯一，迭代结果完全取决于初始向量的微小扰动！
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Slice 4 Details */}
      {activeSlice === 4 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
            <h3 className="font-semibold text-slate-800 text-sm">
              【切片四：常见误区警示与图结构诊断盲区】
            </h3>
          </div>

          <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
            <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200 space-y-2 text-rose-950">
              <div className="font-bold text-rose-800 text-xs flex items-center space-x-2">
                <ShieldX size={15} />
                <span>误区 1：高入度 (In-Degree) 盲目等同于高权威 (High Authority)</span>
              </div>
              <p className="text-[11px]">
                黑帽 SEO（作弊农场 Link Farm）可以通过自动化脚本制造数万个虚假博客互相单向指向作弊网页。
                简单的度数中心性（Degree Centrality）会将其误判为超级核心；
                而 PageRank 之所以伟大，正是因为垃圾节点自身的 PageRank 极低，其单向传递的权重 {'$\\frac{PR_{spam}}{OutDeg}$'} 近乎于零，从而在数学根基上免疫了低质量刷量！
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 text-xs flex items-center space-x-2">
                <CheckCircle size={15} className="text-teal-600" />
                <span>误区 2：社区发现过度分割破坏跨图全局信息流传导</span>
              </div>
              <p className="text-[11px] text-slate-500">
                如果仅依据局部的 Louvain 分群结果将网络粗暴拆解为孤立子系统，
                将会切断连接不同领域的关键“弱连接”（Granovetter 弱关系优势理论）。
                在跨学科引用和开源协作中，跨界节点的 PageRank 传导往往是技术范式扩散的决定性咽喉。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Slice 5 (NEW): 马尔科夫链与转移矩阵 */}
      {activeSlice === 5 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            <h3 className="font-semibold text-slate-800 text-sm">
              【切片五：马尔科夫链与转移矩阵 (Markov Chains & Transition Matrices)】
            </h3>
          </div>

          <div className="space-y-5 text-xs text-slate-600 leading-relaxed">
            {/* Core definition cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-2.5">
                <div className="font-bold text-blue-800 text-xs flex items-center space-x-1.5">
                  <Activity size={15} />
                  <span>1. 离散时间马尔可夫链 (DTMC) 与无后效性</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  马尔可夫性质（Markov Property）指出：系统的“未来”状态仅取决于“当前”状态，而与过去的转移历史条件独立：
                </p>
                <div className="p-2.5 bg-white rounded border border-blue-200 font-mono text-[11px] text-blue-900">
                  P(X_{'{t+1}'} = i | X_t = j, X_{'{t-1}'}, ...) = P(X_{'{t+1}'} = i | X_t = j) = M_{'{ij}'}
                </div>
                <p className="text-[11px] text-slate-500">
                  在图挖掘中，随机冲浪者位于节点 $j$ 时，下一步跳转至邻居节点 $i$ 的转移概率完全由 $j$ 的出度决定。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                  <Layers size={15} className="text-indigo-600" />
                  <span>2. 列随机转移矩阵 (Column-Stochastic Matrix)</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  转移矩阵 $M$ 的每一列代表从特定源节点出发向全网所有目标节点的跳转概率分布，必须严格满足<strong>全概率列和守恒</strong>：
                </p>
                <div className="p-2.5 bg-white rounded border border-slate-200 font-mono text-[11px] text-slate-800">
                  ∑_{'{i=1}'}^N M_{'{ij}'} = 1.000000 ,  ∀ j ∈ V
                </div>
                <p className="text-[11px] text-slate-500">
                  对于出度为 0 的悬挂死胡同，必须通过均匀虚拟跳转修补为 M[*, j] = (1/N)·1，彻底阻断概率质量耗散泄漏。
                </p>
              </div>
            </div>

            {/* Perron-Frobenius & Google Matrix mechanism */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                <ShieldCheck size={15} className="text-teal-600" />
                <span>3. Perron-Frobenius 定理与 Google 阻尼矩阵构造</span>
              </div>
              <p className="text-[11px] text-slate-600">
                普通转移矩阵 $M$ 往往因图中的孤立子图或死循环而<strong>非不可约</strong>。Google 阻尼矩阵通过引入全网均匀瞬移修正：
              </p>
              <div className="p-3 bg-white rounded border border-slate-200 font-mono text-xs text-indigo-950 flex flex-wrap items-center justify-between gap-2">
                <span>G = d · M + [(1 - d) / N] · 1 · 1ᵀ</span>
                <span className="text-[11px] text-emerald-600 font-sans font-semibold">保证 G_{'{ij}'} &gt; 0 (严格全正定正矩阵)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-2.5 bg-white rounded border border-slate-200 space-y-1">
                  <div className="font-semibold text-slate-800 text-[11px]">不可约性 (Irreducibility)</div>
                  <div className="text-[10px] text-slate-500">
                    任意两个节点间存在非零概率在有限步内互达，保证平稳分布向量在全图全局连通。
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded border border-slate-200 space-y-1">
                  <div className="font-semibold text-slate-800 text-[11px]">非周期性 (Aperiodicity)</div>
                  <div className="text-[10px] text-slate-500">
                    步长公约数 gcd=1，杜绝了二分图或单纯环路震荡，保证幂迭代轨道极限必收敛。
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded border border-slate-200 space-y-1">
                  <div className="font-semibold text-slate-800 text-[11px]">唯一主特征值 λ₁ = 1</div>
                  <div className="text-[10px] text-slate-500">
                    主特征值唯一且简单，谱隙 $\Delta\lambda = 1 - d$，残差按 $O(d^t)$ 指数几何衰减。
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slice 6 (NEW): 应用场景 */}
      {activeSlice === 6 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
            <h3 className="font-semibold text-slate-800 text-sm">
              【切片六：PageRank 与图结构挖掘现代工业应用场景】
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-slate-600 leading-relaxed">
            {/* Scenario 1 */}
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200/80 space-y-2">
              <div className="font-bold text-purple-900 text-xs flex items-center space-x-1.5">
                <Search size={15} className="text-purple-600" />
                <span>1. 搜索引擎与全网网页排序</span>
              </div>
              <p className="text-[11px] text-slate-600">
                <strong>Google 网页检索核心</strong>：从千亿级互联网超链接中剥离垃圾网站与农场链接（Link Farm），量化网页全球威望值；
              </p>
              <div className="text-[10px] text-purple-700 font-mono bg-white p-2 rounded border border-purple-100">
                应用：权威度加权检索、爬虫抓取调度优先队列 (Crawl Queue)
              </div>
            </div>

            {/* Scenario 2 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                <Code size={15} className="text-indigo-600" />
                <span>2. 开源生态与软件供应链排查</span>
              </div>
              <p className="text-[11px] text-slate-600">
                <strong>开源影响力与安全审查</strong>：在 npm / PyPI / GitHub 依赖有向图中，发现底层最关键但鲜有关注的单点故障库（SPOF）；
              </p>
              <div className="text-[10px] text-indigo-700 font-mono bg-white p-2 rounded border border-slate-200">
                应用：核心开发者识别、传递依赖漏洞爆发半径测算
              </div>
            </div>

            {/* Scenario 3 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                <BookOpen size={15} className="text-teal-600" />
                <span>3. 学术文献计量与科学学评价</span>
              </div>
              <p className="text-[11px] text-slate-600">
                <strong>超越简单引用频次（Citation Count）</strong>：克服学者自我互引刷量，高权重的顶级期刊引用赋予数倍于普通引文的学术势能；
              </p>
              <div className="text-[10px] text-teal-700 font-mono bg-white p-2 rounded border border-slate-200">
                应用：Eigenfactor 因子计算、经典理论突破溯源、学者同行评议
              </div>
            </div>

            {/* Scenario 4 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                <Share2 size={15} className="text-rose-600" />
                <span>4. 社交网络 KOL 与虚假刷量鉴别</span>
              </div>
              <p className="text-[11px] text-slate-600">
                <strong>意见领袖挖掘与信任图谱</strong>：利用 TrustRank（基于已知白名单种子节点的高斯偏置 PageRank）高效识别水军号与刷赞僵尸；
              </p>
              <div className="text-[10px] text-rose-700 font-mono bg-white p-2 rounded border border-slate-200">
                应用：病毒式传播源头追溯、反洗号欺诈、关键传播节点定位
              </div>
            </div>

            {/* Scenario 5 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                <DollarSign size={15} className="text-amber-600" />
                <span>5. 金融风控与反洗钱 (AML) 关联图谱</span>
              </div>
              <p className="text-[11px] text-slate-600">
                <strong>异常洗钱流水溯源</strong>：资金在多层空壳账户间高速分拆流转时，形成微小闭环与汇聚池，利用阻尼吸收探测洗钱团伙；
              </p>
              <div className="text-[10px] text-amber-700 font-mono bg-white p-2 rounded border border-slate-200">
                应用：反洗钱洗钱环探测、非法集资资金池定位、信贷欺诈排查
              </div>
            </div>

            {/* Scenario 6 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                <Dna size={15} className="text-emerald-600" />
                <span>6. 生物信息学与蛋白质相互作用 (PPI)</span>
              </div>
              <p className="text-[11px] text-slate-600">
                <strong>分子网络致病靶点筛选</strong>：在人类蛋白质网络中，PageRank 分数极高的枢纽蛋白往往控制关键代谢通路与疾病靶标；
              </p>
              <div className="text-[10px] text-emerald-700 font-mono bg-white p-2 rounded border border-slate-200">
                应用：药物重定向 (Drug Repurposing)、致病基因排序、生物通路挖掘
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
