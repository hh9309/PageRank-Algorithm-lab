import React, { useState } from 'react';
import { GraphMetrics, GraphNode, GraphEdge } from '../types/graph';
import { Sparkles, MessageSquare, Bot, Send, X, RefreshCw, ChevronRight, Activity, HelpCircle } from 'lucide-react';

interface AiChatDrawerProps {
  metrics: GraphMetrics;
  nodes: GraphNode[];
  edges: GraphEdge[];
  caseName: string;
}

export const AiChatDrawer: React.FC<AiChatDrawerProps> = ({
  metrics,
  nodes,
  edges,
  caseName,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'diagnose' | 'chat'>('diagnose');
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [diagnosisResult, setDiagnosisResult] = useState<string | null>(null);

  // Chat states
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'model'; content: string }>>([
    {
      role: 'model',
      content: '您好！我是图挖掘实验室随诊 AI 专家顾问。您可以让我诊断当前图拓扑的稀疏度与不可约性，或就马尔可夫链、阻尼系数切片、HITS 算法与 Louvain 社区发现提出疑问。',
    },
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  // Trigger Diagnosis
  const handleRunDiagnosis = async () => {
    setIsDiagnosing(true);
    try {
      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graphInfo: {
            ...metrics,
            caseName,
          },
        }),
      });
      const data = await res.json();
      setDiagnosisResult(data.analysis || '诊断完成。');
    } catch (e: any) {
      setDiagnosisResult(`诊断请求出错: ${e.message}`);
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Send Chat Message
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isSending) return;

    const newHistory = [...chatMessages, { role: 'user' as const, content: text }];
    setChatMessages(newHistory);
    if (!textToSend) setInputMessage('');
    setIsSending(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: newHistory,
          currentContext: {
            dampingFactor: metrics.dampingFactor,
            nodeCount: metrics.nodeCount,
            edgeCount: metrics.edgeCount,
            caseName,
            modularity: metrics.modularity,
          },
        }),
      });
      const data = await res.json();
      setChatMessages([...newHistory, { role: 'model', content: data.reply || '已收到。' }]);
    } catch (e: any) {
      setChatMessages([
        ...newHistory,
        { role: 'model', content: `回答时遇到网络问题: ${e.message}` },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const quickPrompts = [
    '为什么工业界阻尼系数通常取 0.85？',
    '蜘蛛陷阱 (Spider Traps) 与死胡同 (Dead Ends) 的区别？',
    'PageRank 与 Kleinberg HITS 算法核心差异？',
    '当前图的模块度 Q 说明了什么？',
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-indigo-500/25 transition-all text-xs font-medium group cursor-pointer"
      >
        <Sparkles size={16} className="animate-spin-slow group-hover:scale-110 transition-transform" />
        <span>AI 随诊专家</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
      </button>

      {/* Slide-over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Content */}
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">
                    AI 图结构挖掘随诊顾问
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    基于 Gemini 3.8 Flash · 拓扑健康度与代数机理诊断
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab switch */}
            <div className="flex border-b border-slate-200 bg-white">
              <button
                onClick={() => setActiveTab('diagnose')}
                className={`flex-1 py-2.5 text-xs font-medium border-b-2 flex items-center justify-center space-x-1.5 transition-colors ${
                  activeTab === 'diagnose'
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Activity size={14} />
                <span>拓扑综合随诊报告</span>
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2.5 text-xs font-medium border-b-2 flex items-center justify-center space-x-1.5 transition-colors ${
                  activeTab === 'chat'
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare size={14} />
                <span>理论专家互动 Q&A</span>
              </button>
            </div>

            {/* Tab 1: Instant Topology Diagnosis */}
            {activeTab === 'diagnose' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {/* Real-time topology capsule */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-slate-600 font-mono text-[11px]">
                  <div>节点数 N: <strong className="text-slate-900">{metrics.nodeCount}</strong></div>
                  <div>边数 E: <strong className="text-slate-900">{metrics.edgeCount}</strong></div>
                  <div>阻尼系数 d: <strong className="text-indigo-600">{metrics.dampingFactor}</strong></div>
                  <div>死胡同数: <strong className="text-amber-600">{metrics.deadEndCount}</strong></div>
                  <div>蜘蛛陷阱: <strong className="text-rose-600">{metrics.spiderTrapCount}</strong></div>
                  <div>模块度 Q: <strong className="text-teal-600">{metrics.modularity}</strong></div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-500 font-medium">当前分析对象：{caseName}</span>
                  <button
                    onClick={handleRunDiagnosis}
                    disabled={isDiagnosing}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    <RefreshCw size={13} className={isDiagnosing ? 'animate-spin' : ''} />
                    <span>{isDiagnosing ? '正在诊断拓扑…' : '生成 AI 诊断报告'}</span>
                  </button>
                </div>

                {/* Diagnosis Output Card */}
                {diagnosisResult ? (
                  <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-wrap font-sans text-xs">
                    {diagnosisResult}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <Sparkles size={28} className="mx-auto text-indigo-400 opacity-60" />
                    <div>点击右上角“生成 AI 诊断报告”</div>
                    <div className="text-[11px] text-slate-400">
                      AI 将从稀疏性、不可约性、Hub极化度与同质性四大维度给出深度学术评估。
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Interactive Q&A Chat */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Chat History */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-3 rounded-xl leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/80'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isSending && (
                    <div className="flex items-center space-x-2 text-slate-400 italic text-[11px]">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                      <span>随诊专家正在深入思考推导…</span>
                    </div>
                  )}
                </div>

                {/* Quick Prompts */}
                <div className="p-2 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-1.5">
                  {quickPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(p)}
                      className="text-[10px] bg-white hover:bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 transition-colors truncate max-w-[220px]"
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Input Area */}
                <div className="p-3 border-t border-slate-200 bg-white flex items-center space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={e => setInputMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    placeholder="输入图论、马尔可夫链或算法疑问..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={isSending || !inputMessage.trim()}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
