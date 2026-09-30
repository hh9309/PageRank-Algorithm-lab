import React, { useState, useEffect } from 'react';
import { GraphMetrics, GraphNode, GraphEdge } from '../types/graph';
import {
  Bot,
  Sparkles,
  RefreshCw,
  Send,
  Activity,
  MessageSquare,
  ShieldCheck,
  HelpCircle,
  CheckCircle2,
  Settings,
  Key,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  X,
  Cpu,
} from 'lucide-react';

interface AiConsultantViewProps {
  metrics: GraphMetrics;
  nodes: GraphNode[];
  edges: GraphEdge[];
  caseName: string;
}

export const AiConsultantView: React.FC<AiConsultantViewProps> = ({
  metrics,
  nodes,
  edges,
  caseName,
}) => {
  // Local storage state for Model & API-Key
  const [selectedModel, setSelectedModel] = useState<'gemini 3 flash' | 'deepseek-v4-pro'>(() => {
    return (localStorage.getItem('ai_selected_model') as any) || 'gemini 3 flash';
  });

  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('ai_user_api_key') || '';
  });

  // Settings modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [tempModel, setTempModel] = useState<'gemini 3 flash' | 'deepseek-v4-pro'>(selectedModel);
  const [tempApiKey, setTempApiKey] = useState<string>(apiKey);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [settingsSavedToast, setSettingsSavedToast] = useState<boolean>(false);
  const [keyWarning, setKeyWarning] = useState<boolean>(false);

  // Execution states
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [diagnosisResult, setDiagnosisResult] = useState<string | null>(null);

  // Chat states
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'model'; content: string }>>([
    {
      role: 'model',
      content: `您好！我是“PageRank 与图结构挖掘实验室”的 AI 随诊学术专家顾问。\n当前大模型：【${selectedModel}】。\n已同步接入当前实验室拓扑（案例：${caseName}，N=${metrics.nodeCount}，E=${metrics.edgeCount}，阻尼系数 d=${metrics.dampingFactor}，模块度 Q=${metrics.modularity}）。\n\n📌 部署说明：若项目部署到 GitHub 或在浏览器独立调用，请先点击右上角小齿轮 ⚙ 设置大模型并输入 API-Key 后再发起调用。`,
    },
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  // Open settings modal
  const handleOpenSettings = () => {
    setTempModel(selectedModel);
    setTempApiKey(apiKey);
    setIsSettingsOpen(true);
    setKeyWarning(false);
  };

  // Confirm Model & API Key
  const handleSaveSettings = () => {
    if (!tempApiKey.trim()) {
      setKeyWarning(true);
      return;
    }

    setSelectedModel(tempModel);
    setApiKey(tempApiKey.trim());
    localStorage.setItem('ai_selected_model', tempModel);
    localStorage.setItem('ai_user_api_key', tempApiKey.trim());

    setSettingsSavedToast(true);
    setKeyWarning(false);
    setTimeout(() => {
      setSettingsSavedToast(false);
      setIsSettingsOpen(false);
    }, 900);
  };

  // Direct client call fallback for static GitHub Pages
  const callDirectClientLLM = async (promptText: string, modelToUse: string, keyToUse: string) => {
    if (modelToUse === 'deepseek-v4-pro') {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keyToUse}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: '你是一位顶尖计算机科学与复杂网络分析教授，擅长图挖掘、PageRank与谱图理论。' },
            { role: 'user', content: promptText },
          ],
          temperature: 0.7,
        }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '已收到响应。';
    } else {
      // Gemini direct REST endpoint
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyToUse}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
        }),
      });
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '已收到响应。';
    }
  };

  // Trigger Diagnosis
  const handleRunDiagnosis = async () => {
    if (!apiKey.trim()) {
      setKeyWarning(true);
      setIsSettingsOpen(true);
      return;
    }

    setIsDiagnosing(true);
    const prompt = `请诊断图拓扑元数据与 PageRank：节点数 N=${metrics.nodeCount}, 边数 E=${metrics.edgeCount}, 密度=${metrics.density}, 阻尼d=${metrics.dampingFactor}, 死胡同=${metrics.deadEndCount}, 蜘蛛陷阱=${metrics.spiderTrapCount}, 模块度Q=${metrics.modularity}, 社区数=${metrics.communityCount}。请从稀疏不可约性、Hub极化、Louvain同质性与算法优化四方面诊断。`;

    try {
      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graphInfo: { ...metrics, caseName },
          model: selectedModel,
          apiKey: apiKey.trim(),
        }),
      });

      if (!res.ok) {
        // Fallback for static GitHub Pages deployment
        const directText = await callDirectClientLLM(prompt, selectedModel, apiKey);
        setDiagnosisResult(directText);
      } else {
        const data = await res.json();
        setDiagnosisResult(data.analysis || '诊断完成。');
      }
    } catch (e: any) {
      try {
        const directText = await callDirectClientLLM(prompt, selectedModel, apiKey);
        setDiagnosisResult(directText);
      } catch (directErr: any) {
        setDiagnosisResult(`调用失败: ${directErr.message}。请检查 API-Key 是否正确。`);
      }
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Send Chat Message
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isSending) return;

    if (!apiKey.trim()) {
      setKeyWarning(true);
      setIsSettingsOpen(true);
      return;
    }

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
          model: selectedModel,
          apiKey: apiKey.trim(),
        }),
      });

      if (!res.ok) {
        const directText = await callDirectClientLLM(text, selectedModel, apiKey);
        setChatMessages([...newHistory, { role: 'model', content: directText }]);
      } else {
        const data = await res.json();
        setChatMessages([...newHistory, { role: 'model', content: data.reply || '已收到。' }]);
      }
    } catch (e: any) {
      try {
        const directText = await callDirectClientLLM(text, selectedModel, apiKey);
        setChatMessages([...newHistory, { role: 'model', content: directText }]);
      } catch (directErr: any) {
        setChatMessages([
          ...newHistory,
          { role: 'model', content: `调用失败: ${directErr.message}。请点击右上角小齿轮 ⚙ 检查 API-Key。` },
        ]);
      }
    } finally {
      setIsSending(false);
    }
  };

  const quickPrompts = [
    '为什么工业界阻尼系数通常取 0.85？',
    '蜘蛛陷阱 (Spider Traps) 与死胡同 (Dead Ends) 的区别？',
    'PageRank 与 Kleinberg HITS 算法核心差异？',
    '当前图的模块度 Q 说明了什么？',
    'Personalized PageRank (PPR) 适用于哪些场景？',
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Title and Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Bot size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 text-base">
                  AI 随诊专家 (AI Diagnostic & Q&A Consultant)
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                  {selectedModel === 'gemini 3 flash' ? 'Gemini 3 Flash' : 'DeepSeek-V4-Pro'}
                </span>
                {apiKey ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Key 已配置 ✓
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                    待配置 API-Key
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                实时把脉当前拓扑稀疏度、不可约性收敛条件与 Hub 极化度，支持双大模型切换与 GitHub 独立部署。
              </p>
            </div>
          </div>

          {/* Right Action: Small Gear Icon Setting (小齿轮设置大模型) */}
          <div className="flex items-center space-x-3">
            {/* Topology summary pill */}
            <div className="hidden sm:flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono">
              <span className="text-slate-500">{caseName}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">N: <strong>{metrics.nodeCount}</strong></span>
              <span className="text-slate-500">d: <strong className="text-indigo-600">{metrics.dampingFactor}</strong></span>
            </div>

            {/* Gear Button */}
            <button
              onClick={handleOpenSettings}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg border border-slate-200 hover:border-indigo-300 text-xs font-medium transition-colors shadow-2xs cursor-pointer group"
              title="设置大模型 (gemini 3 flash / deepseek-v4-pro) 与 API-Key"
            >
              <Settings size={15} className="group-hover:rotate-45 transition-transform duration-300 text-slate-600 group-hover:text-indigo-600" />
              <span>设置大模型</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global API Key Warning Banner if not configured */}
      {!apiKey && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center space-x-2">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <span>
              <strong>提示：</strong>项目要部署到 GitHub 上供浏览器调用，<strong>所有大模型调用必须输入 API-Key 后方可调用</strong>。
            </span>
          </div>
          <button
            onClick={handleOpenSettings}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            立即输入 API-Key
          </button>
        </div>
      )}

      {/* Main 2-Column Split: Left Diagnostic Report, Right Interactive Q&A */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (6 Cols): Diagnostic Report */}
        <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Activity size={17} className="text-indigo-600" />
                <h4 className="font-semibold text-slate-800 text-sm">
                  图拓扑综合学术随诊报告
                </h4>
              </div>

              <button
                onClick={handleRunDiagnosis}
                disabled={isDiagnosing}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
              >
                <RefreshCw size={13} className={isDiagnosing ? 'animate-spin' : ''} />
                <span>{isDiagnosing ? '正在推导诊断…' : '生成 / 刷新 AI 报告'}</span>
              </button>
            </div>

            {/* Quick parameter grid for high legibility */}
            <div className="grid grid-cols-3 gap-2.5 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono mb-4">
              <div>
                <div className="text-[10px] text-slate-400 font-sans">图稀疏密度</div>
                <strong className="text-slate-800">{(metrics.density * 100).toFixed(1)}%</strong>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-sans">死胡同悬挂</div>
                <strong className={metrics.deadEndCount > 0 ? 'text-amber-600' : 'text-slate-800'}>
                  {metrics.deadEndCount} 个
                </strong>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-sans">蜘蛛陷阱回路</div>
                <strong className={metrics.spiderTrapCount > 0 ? 'text-rose-600' : 'text-slate-800'}>
                  {metrics.spiderTrapCount} 个
                </strong>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-sans">模块度 Q</div>
                <strong className="text-teal-600">{metrics.modularity}</strong>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-sans">凝聚社区数</div>
                <strong className="text-slate-800">{metrics.communityCount} 个</strong>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-sans">Top-1 极化倍比</div>
                <strong className="text-indigo-700">{metrics.polarizationRatio}x</strong>
              </div>
            </div>

            {/* Report Content Box */}
            {diagnosisResult ? (
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-wrap font-sans text-xs max-h-[480px] overflow-y-auto">
                {diagnosisResult}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 space-y-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <Sparkles size={32} className="mx-auto text-indigo-400 opacity-60" />
                <div className="font-medium text-slate-600 text-sm">
                  点击上方“生成 / 刷新 AI 报告”
                </div>
                <div className="text-xs text-slate-400 max-w-sm mx-auto">
                  当前启用大模型：<strong>{selectedModel}</strong>。AI 随诊专家将从稀疏性与不可约性、权重极化与死循环陷阱、模块度结构以及算法调优四大维度进行全面评估。
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center space-x-1 text-emerald-600">
              <CheckCircle2 size={13} />
              <span>调用引擎: {selectedModel}</span>
            </span>
            <span>API-Key 状态: {apiKey ? '已就绪' : '未配置'}</span>
          </div>
        </div>

        {/* Right Column (6 Cols): Interactive Academic Q&A Chat */}
        <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <MessageSquare size={17} className="text-indigo-600" />
              <h4 className="font-semibold text-slate-800 text-sm">
                理论专家互动 Q&A (模型: {selectedModel})
              </h4>
            </div>

            {/* Chat History Box */}
            <div className="space-y-3 max-h-[420px] min-h-[340px] overflow-y-auto pr-1">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[90%] p-3.5 rounded-xl leading-relaxed whitespace-pre-wrap text-xs ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none shadow-xs'
                        : 'bg-slate-50 text-slate-800 rounded-bl-none border border-slate-200/90 shadow-2xs'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex items-center space-x-2 text-slate-400 italic text-xs p-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span>{selectedModel} 随诊专家正在深入推导数学机理…</span>
                </div>
              )}
            </div>

            {/* Quick prompt chips */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p)}
                  className="text-[11px] bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200 transition-colors cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Message Input Box */}
          <div className="pt-3 border-t border-slate-200 flex items-center space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              placeholder={apiKey ? `向 ${selectedModel} 咨询图论、马尔可夫链、Louvain 算法...` : '请先点击右上角小齿轮 ⚙ 输入 API-Key...'}
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isSending || !inputMessage.trim()}
              className="flex items-center space-x-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            >
              <Send size={14} />
              <span>发送</span>
            </button>
          </div>
        </div>
      </div>

      {/* Model & API-Key Configuration Modal (小齿轮设置大模型弹窗) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Settings size={18} className="text-indigo-600" />
                <span>大模型设置 (Model & API-Key Settings)</span>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={17} />
              </button>
            </div>

            {/* GitHub Deployment Requirement Notice */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 leading-relaxed">
              <strong>GitHub 独立部署与调用规范：</strong><br />
              项目部署到 GitHub 上供浏览器直接使用，<strong>所有大模型调用必须输入 API-Key 后方可调用</strong>。凭证将持久化保存在您本地浏览器的安全存储区中。
            </div>

            {/* Step 1: Model Selection (两个大模型) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-800 flex items-center space-x-1.5">
                <Cpu size={14} className="text-indigo-600" />
                <span>1. 选择大模型 (Select Model)</span>
              </label>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Option 1: gemini 3 flash */}
                <div
                  onClick={() => setTempModel('gemini 3 flash')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    tempModel === 'gemini 3 flash'
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-200'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-slate-800">gemini 3 flash</span>
                    {tempModel === 'gemini 3 flash' && <Check size={14} className="text-indigo-600" />}
                  </div>
                  <div className="text-[10px] text-slate-500">Google Gemini 3.8 Flash</div>
                </div>

                {/* Option 2: deepseek-v4-pro */}
                <div
                  onClick={() => setTempModel('deepseek-v4-pro')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    tempModel === 'deepseek-v4-pro'
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-200'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-slate-800">deepseek-v4-pro</span>
                    {tempModel === 'deepseek-v4-pro' && <Check size={14} className="text-indigo-600" />}
                  </div>
                  <div className="text-[10px] text-slate-500">DeepSeek 深度图挖掘专家</div>
                </div>
              </div>
            </div>

            {/* Step 2: Manual API-Key Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Key size={14} className="text-indigo-600" />
                  <span>2. 手工输入 API-Key (Input API-Key)</span>
                </span>
                <span className="text-[10px] text-rose-500 font-normal">* 必须输入后调用</span>
              </label>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={tempApiKey}
                  onChange={e => {
                    setTempApiKey(e.target.value);
                    if (keyWarning && e.target.value.trim()) setKeyWarning(false);
                  }}
                  placeholder={
                    tempModel === 'gemini 3 flash'
                      ? '请输入 Gemini API-Key (如 AIzaSy...)'
                      : '请输入 DeepSeek API-Key (如 sk-...)'
                  }
                  className={`w-full pr-10 pl-3 py-2.5 text-xs bg-slate-50 border rounded-lg font-mono focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                    keyWarning && !tempApiKey.trim()
                      ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/30'
                      : 'border-slate-200 focus:ring-indigo-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {keyWarning && !tempApiKey.trim() && (
                <div className="text-[11px] text-rose-600 flex items-center space-x-1 mt-1">
                  <AlertCircle size={12} />
                  <span>请输入有效的 API-Key 后方可保存并调用大模型</span>
                </div>
              )}
            </div>

            {/* Step 3: Confirmation Button */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="text-[11px] text-slate-400 font-mono">
                {tempApiKey ? 'Key 长度: ' + tempApiKey.length + ' 字符' : '未输入'}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  取消
                </button>

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                >
                  {settingsSavedToast ? (
                    <>
                      <Check size={14} className="text-emerald-300" />
                      <span>配置已生效!</span>
                    </>
                  ) : (
                    <span>确认大模型</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
