import { useState } from 'react';
import { Send, Paperclip, Bot, User, FileText, Download, RefreshCw, X, Globe, Terminal, ChevronDown, Sparkles, Coins, Search } from 'lucide-react';
import DemoLayout from './DemoLayout';

// Types
interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  isThinking?: boolean;
  artifacts?: Artifact[];
  cost?: number;
}

interface Artifact {
  id: string;
  name: string;
  type: 'pdf' | 'csv' | 'py';
  size: string;
}

// Mock Data - A股市场主题
const MOCK_SESSIONS = [
  { id: 1, title: '沪深300成分股估值分析', time: '2 分钟前', active: true },
  { id: 2, title: '新能源产业链调研报告', time: '昨天', active: false },
  { id: 3, title: 'Q1 投资组合再平衡建议', time: '2 天前', active: false },
];

const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'user',
    content: '请帮我分析一下沪深300指数最近一个月的估值变化情况，以及主要行业的PE/PB分布。',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: '2',
    role: 'agent',
    content: '好的，我将为您分析沪深300指数最近一个月的估值变化。首先获取指数成分股的最新数据，然后计算各主要行业的估值指标分布。',
    timestamp: new Date(Date.now() - 1000 * 60 * 4),
    isThinking: true,
  },
  {
    id: '3',
    role: 'agent',
    content: `这是沪深300指数最近一个月的估值分析报告。

截至最新交易日，沪深300指数PE(TTM)为 12.35 倍，较上月下降 3.2%；PB(LF)为 1.28 倍，处于近五年 35% 分位。

行业估值分布方面：
• 金融板块：PE 6.8x（低估）
• 消费板块：PE 24.5x（合理偏高）
• 医药板块：PE 28.3x（偏高）
• 新能源：PE 18.2x（合理）`,
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
    cost: 18,
    artifacts: [
      { id: 'a1', name: 'hs300_valuation_analysis.csv', type: 'csv', size: '28KB' },
      { id: 'a2', name: 'sector_pe_pb_distribution.pdf', type: 'pdf', size: '3.2MB' },
    ]
  }
];

// 从后端 agent-llm.local.json 配置映射的模型列表
// 多个 endpoint 可以 serve 同一个模型时，在显示名称后加上 endpoint 标识
// 使用 compositeId 作为唯一标识: "modelId@endpoint"
const models = [
  { id: 'accounts/fireworks/models/kimi-k2p5', name: 'Kimi K2.5 (Fireworks)', endpoint: 'fireworks', compositeId: 'accounts/fireworks/models/kimi-k2p5@fireworks' },
  { id: 'openai/gpt-5.2', name: 'GPT-5.2 (OpenRouter)', endpoint: 'openrouter', compositeId: 'openai/gpt-5.2@openrouter' },
  { id: 'openai/gpt-5.1', name: 'GPT-5.1 (OpenRouter)', endpoint: 'openrouter', compositeId: 'openai/gpt-5.1@openrouter' },
  { id: 'openai/gpt-5.2', name: 'GPT-5.2 (OpenAI)', endpoint: 'openai', compositeId: 'openai/gpt-5.2@openai' },
  { id: 'openai/gpt-5.1', name: 'GPT-5.1 (OpenAI)', endpoint: 'openai', compositeId: 'openai/gpt-5.1@openai' },
];

// 市场区域搜索源
const searchSources = [
  { id: 'ah_market', name: 'AH市场', desc: 'A股及港股相关资讯' },
  { id: 'us_market', name: '美国市场', desc: '美股及美股中概相关资讯' },
  { id: 'apac_market', name: '亚太市场', desc: '日韩东南亚等市场资讯' },
  { id: 'eu_market', name: '欧洲市场', desc: '欧洲主要市场资讯' },
  { id: 'emerging_market', name: '其他新兴市场', desc: '拉美、中东、非洲等市场' },
];

const retrievalSources = [
  { id: 'news', name: '新闻资讯', cost: 2 },
  { id: 'announcement', name: '公告信息', cost: 5 },
  { id: 'report', name: '券商研报', cost: 10 },
];

const DemoChat = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [showArtifacts, setShowArtifacts] = useState(true);
  const [credits, setCredits] = useState(2450);
  
  // Controls State
  const [selectedModel, setSelectedModel] = useState(models[0]); // 默认选择第一个模型
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  
  const [useWebSearch, setUseWebSearch] = useState(true);
  const [webSearchDropdownOpen, setWebSearchDropdownOpen] = useState(false);
  const [selectedSearchSources, setSelectedSearchSources] = useState<string[]>(['ah_market']);

  const [codeIntensityOpen, setCodeIntensityOpen] = useState(false);
  const [codeIntensity, setCodeIntensity] = useState(500); // 10 - 500, 或 unlimited (1000)
  const [sliderValue, setSliderValue] = useState(50); // 滑动条视觉值 0-100，用于控制非线性映射
  
  const [retrievalOpen, setRetrievalOpen] = useState(false);
  const [selectedRetrieval, setSelectedRetrieval] = useState<string[]>(['news']);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages([...messages, newMsg]);
    setInput('');
    
    // Simulate thinking
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: '正在处理您的请求...',
        timestamp: new Date(),
        isThinking: true
      }]);
    }, 600);
    
    // Simulate cost
    setTimeout(() => {
       setCredits(prev => prev - 12);
    }, 2000);
  };

  const getIntensityLabel = (val: number) => {
    if (val >= 1000) return '无限制';
    return `${val} Credits`;
  };

  // 将滑动条视觉值 (0-100) 映射到实际 credit 值
  // 0-50 -> 10-500 (正常区域)
  // 50-100 -> 死区，释放后如果 > 70 则跳到 1000 (无限制)
  const handleSliderChange = (visualValue: number) => {
    setSliderValue(visualValue);
    if (visualValue <= 50) {
      // 0-50 映射到 10-500
      const actualValue = Math.round(10 + (visualValue / 50) * 490);
      setCodeIntensity(actualValue);
    } else if (visualValue >= 70) {
      // 70-100 区域直接跳到无限制
      setCodeIntensity(1000);
    }
    // 50-70 是死区，保持当前值不变
  };

  // 根据实际值计算视觉值（用于初始化）
  const getVisualValueFromActual = (actual: number): number => {
    if (actual >= 1000) return 100;
    // 10-500 映射到 0-50
    return ((actual - 10) / 490) * 50;
  };

  return (
    <DemoLayout>
      <div className="flex h-[calc(100vh-8rem)] gap-6 overflow-hidden">
        
        {/* Sessions Sidebar */}
        <div className="w-64 flex-shrink-0 flex flex-col rounded-lg border border-sky-100 bg-white shadow-sm">
          <div className="border-b border-sky-50 p-4">
            <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors">
              <RefreshCw size={16} />
              新对话
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-ink-400">最近记录</h3>
            <div className="space-y-1">
              {MOCK_SESSIONS.map((session) => (
                <button
                  key={session.id}
                  className={`w-full rounded-lg px-3 py-3 text-left transition-colors ${
                    session.active
                      ? 'bg-sky-50 text-sky-700 font-medium'
                      : 'text-ink-700 hover:bg-gray-50'
                  }`}
                >
                  <p className="truncate text-sm">{session.title}</p>
                  <span className="text-xs text-ink-400">{session.time}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Credit Display - at bottom of sidebar */}
          <div className="border-t border-sky-50 p-3">
            <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
              <Coins size={14} className="text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700">可用额度: {credits}</span>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex flex-1 flex-col rounded-lg border border-sky-100 bg-white shadow-sm overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 pb-20">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'agent' && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                    <Bot size={18} />
                  </div>
                )}
                
                <div className={`flex max-w-[80%] flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Thinking Block */}
                  {msg.isThinking && (
                    <div className="flex items-center gap-2 rounded-lg border border-sky-100 bg-white px-3 py-2 text-xs text-ink-500 shadow-sm animate-pulse">
                      <div className="h-2 w-2 rounded-full bg-sky-400 animate-bounce" />
                      思考中...
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`rounded-lg px-5 py-3.5 text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-sky-600 text-white rounded-br-none'
                        : 'bg-white border border-sky-100 text-ink-900 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {/* Artifacts Preview in Chat */}
                  {msg.artifacts && msg.artifacts.length > 0 && (
                     <div className="flex flex-wrap gap-2 mt-1">
                        {msg.artifacts.map(art => (
                           <div key={art.id} className="flex items-center gap-2 rounded-lg border border-sky-100 bg-white px-3 py-2 text-xs text-ink-700 hover:border-sky-300 cursor-pointer transition-colors shadow-sm">
                              <FileText size={14} className="text-sky-500" />
                              <span className="font-medium">{art.name}</span>
                              <span className="text-ink-400">({art.size})</span>
                           </div>
                        ))}
                     </div>
                  )}

                  {/* Meta Info */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-ink-400">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.cost && (
                      <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
                        消耗: {msg.cost} Credits
                      </span>
                    )}
                  </div>
                </div>

                {msg.role === 'user' && (
                   <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <User size={18} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="border-t border-sky-100 bg-white p-4">
            {/* Controls Bar */}
            <div className="flex items-center justify-between mb-3 px-1 z-20 relative">
              {/* Left: Model Selector */}
              <div className="relative">
                <button 
                  onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                  className="flex items-center gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 transition-colors"
                >
                  <Bot size={14} />
                  {selectedModel.name}
                  <ChevronDown size={12} />
                </button>
                
                {modelDropdownOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-56 rounded-lg border border-sky-100 bg-white shadow-lg py-1 z-30">
                    {models.map(model => (
                      <button
                        key={model.compositeId}
                        onClick={() => {
                          setSelectedModel(model);
                          setModelDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-xs hover:bg-sky-50 ${selectedModel.compositeId === model.compositeId ? 'text-sky-700 font-medium bg-sky-50' : 'text-ink-700'}`}
                      >
                        {model.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Right: Feature Toggles */}
              <div className="flex items-center gap-3">
                 {/* 1. Web Search with Multi-Source Selection */}
                 <div className="relative">
                    <button 
                      onClick={() => setWebSearchDropdownOpen(!webSearchDropdownOpen)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border transition-colors ${useWebSearch ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-ink-400 border-transparent hover:bg-gray-50'}`}
                    >
                      <Globe size={12} />
                      {useWebSearch 
                        ? (selectedSearchSources.length === 1 
                            ? searchSources.find(s => s.id === selectedSearchSources[0])?.name 
                            : `已选 ${selectedSearchSources.length} 个市场`)
                        : '联网搜索'}
                      {useWebSearch && <ChevronDown size={10} />}
                    </button>
                    
                    {webSearchDropdownOpen && (
                      <div className="absolute bottom-full right-0 mb-2 w-56 rounded-lg border border-sky-100 bg-white shadow-lg py-1 z-30">
                        <div className="px-3 py-2 text-[10px] font-semibold text-ink-400 uppercase tracking-wider">选择市场区域（可多选）</div>
                        <button
                          onClick={() => { 
                            setUseWebSearch(!useWebSearch); 
                            if (!useWebSearch) setSelectedSearchSources(['ah_market']);
                            setWebSearchDropdownOpen(false); 
                          }}
                          className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 text-ink-700 border-b border-gray-50"
                        >
                           {useWebSearch ? '关闭搜索' : '开启搜索'}
                        </button>
                        {useWebSearch && searchSources.map(source => {
                          const isSelected = selectedSearchSources.includes(source.id);
                          return (
                            <button
                              key={source.id}
                              onClick={() => {
                                if (isSelected) {
                                  // 至少保留一个选中
                                  if (selectedSearchSources.length > 1) {
                                    setSelectedSearchSources(prev => prev.filter(id => id !== source.id));
                                  }
                                } else {
                                  setSelectedSearchSources(prev => [...prev, source.id]);
                                }
                              }}
                              className={`w-full px-4 py-2 flex items-start gap-2 text-left hover:bg-sky-50 ${isSelected ? 'bg-sky-50/50' : ''}`}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center mt-0.5 flex-shrink-0 ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                {isSelected && <Search size={9} className="text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-xs font-medium ${isSelected ? 'text-blue-700' : 'text-ink-700'}`}>
                                  {source.name}
                                </div>
                                <div className="text-[10px] text-ink-400 truncate">
                                  {source.desc}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                 </div>

                 {/* 2. Programming Intensity Slider - 非线性映射，500-1000 是死区 */}
                 <div className="relative">
                    <button 
                      onClick={() => setCodeIntensityOpen(!codeIntensityOpen)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border transition-colors ${codeIntensity > 10 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-ink-400 border-transparent hover:bg-gray-50'}`}
                    >
                      <Terminal size={12} />
                      编程计算: {getIntensityLabel(codeIntensity)}
                    </button>
                    
                    {codeIntensityOpen && (
                      <div className="absolute bottom-full right-0 mb-2 w-72 rounded-lg border border-sky-100 bg-white shadow-lg p-4 z-30">
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-semibold text-ink-700">计算强度上限</span>
                            <span className="text-xs font-mono text-amber-600">{getIntensityLabel(codeIntensity)}</span>
                         </div>
                         <input 
                           type="range" 
                           min="0" 
                           max="100" 
                           step="1"
                           value={sliderValue}
                           onChange={(e) => handleSliderChange(Number(e.target.value))}
                           onMouseUp={() => {
                             // 释放时，如果在死区(50-70)，回弹到 500
                             if (sliderValue > 50 && sliderValue < 70) {
                               setSliderValue(50);
                               setCodeIntensity(500);
                             }
                           }}
                           onTouchEnd={() => {
                             // 触摸结束时同样处理
                             if (sliderValue > 50 && sliderValue < 70) {
                               setSliderValue(50);
                               setCodeIntensity(500);
                             }
                           }}
                           className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                           style={{
                             background: `linear-gradient(to right, 
                               #f59e0b 0%, 
                               #f59e0b ${sliderValue <= 50 ? sliderValue : 50}%, 
                               ${sliderValue > 50 && sliderValue < 70 ? '#fee2e2' : '#e5e7eb'} ${sliderValue <= 50 ? 50 : sliderValue < 70 ? sliderValue : 50}%, 
                               ${sliderValue > 50 && sliderValue < 70 ? '#fee2e2' : '#e5e7eb'} ${sliderValue >= 70 ? sliderValue : 70}%, 
                               ${sliderValue >= 70 ? '#f59e0b' : '#e5e7eb'} ${sliderValue >= 70 ? sliderValue : 70}%, 
                               #e5e7eb 100%)`
                           }}
                         />
                         <div className="flex justify-between text-[10px] text-ink-400 mt-1 relative">
                            <span>10</span>
                            <span className="absolute left-[50%] -translate-x-1/2">500</span>
                            <span className="text-amber-600 font-medium">无限制</span>
                         </div>
                         <div className="mt-2 text-[10px] text-ink-400">
                            {codeIntensity >= 1000 ? (
                              <span className="text-amber-600">⚠️ 无限制模式可能消耗大量 Credits</span>
                            ) : (
                              <span>拖动到最右侧可启用无限制模式</span>
                            )}
                         </div>
                      </div>
                    )}
                 </div>

                 {/* 3. Intelligent Retrieval */}
                 <div className="relative">
                    <button 
                      onClick={() => setRetrievalOpen(!retrievalOpen)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border transition-colors ${selectedRetrieval.length > 0 ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-white text-ink-400 border-transparent hover:bg-gray-50'}`}
                    >
                      <Sparkles size={12} />
                      智能检索
                      {selectedRetrieval.length > 0 && <span className="ml-1 rounded-full bg-violet-200 px-1.5 text-[9px]">{selectedRetrieval.length}</span>}
                    </button>
                    
                    {retrievalOpen && (
                      <div className="absolute bottom-full right-0 mb-2 w-56 rounded-lg border border-sky-100 bg-white shadow-lg py-1 z-30">
                        <div className="px-3 py-2 text-[10px] font-semibold text-ink-400 uppercase tracking-wider flex justify-between">
                           <span>检索范围</span>
                           <span>消耗</span>
                        </div>
                        {retrievalSources.map(source => {
                          const isSelected = selectedRetrieval.includes(source.id);
                          return (
                            <button
                              key={source.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedRetrieval(prev => prev.filter(id => id !== source.id));
                                } else {
                                  setSelectedRetrieval(prev => [...prev, source.id]);
                                }
                              }}
                              className={`w-full px-4 py-2 flex items-center justify-between text-xs hover:bg-violet-50 ${isSelected ? 'text-violet-700 bg-violet-50/50' : 'text-ink-700'}`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded border flex items-center justify-center ${isSelected ? 'bg-violet-500 border-violet-500' : 'border-gray-300'}`}>
                                   {isSelected && <Search size={8} className="text-white" />}
                                </div>
                                {source.name}
                              </div>
                              <span className="text-[10px] text-ink-400 font-mono">-{source.cost}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                 </div>
              </div>
            </div>
            
            <div className="relative flex items-center rounded-lg border border-sky-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-sky-100 focus-within:border-sky-400 transition-all">
              <button className="p-3 text-ink-400 hover:text-sky-600">
                <Paperclip size={20} />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="让 AlphaFrog 帮您分析市场..."
                className="flex-1 bg-transparent py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
              />
              <button 
                onClick={handleSend}
                className="m-1 rounded-lg bg-sky-600 p-2 text-white hover:bg-sky-700 transition-colors disabled:opacity-50"
                disabled={!input.trim()}
              >
                <Send size={18} />
              </button>
            </div>
            <div className="mt-2 text-center text-[10px] text-ink-400">
              AlphaFrog 可能生成错误信息。请核实重要财务数据。
            </div>
          </div>
        </div>

        {/* Artifacts Panel (Right Sidebar) */}
        {showArtifacts && (
          <div className="w-72 flex-shrink-0 flex flex-col rounded-lg border border-sky-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-sky-50 p-4">
              <h3 className="font-semibold text-ink-900 text-sm">生成产物</h3>
              <button onClick={() => setShowArtifacts(false)} className="text-ink-400 hover:text-ink-900">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="rounded-lg border border-sky-50 bg-sky-50/50 p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-sky-600" />
                    <div>
                      <p className="text-sm font-medium text-ink-900">沪深300估值分析报告.pdf</p>
                      <p className="text-xs text-ink-400">3.2 MB • 2分钟前</p>
                    </div>
                  </div>
                  <button className="text-ink-400 hover:text-sky-600">
                    <Download size={16} />
                  </button>
                </div>
              </div>
              <div className="rounded-lg border border-sky-50 bg-sky-50/50 p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-emerald-600" />
                    <div>
                      <p className="text-sm font-medium text-ink-900">行业PE_PB数据.csv</p>
                      <p className="text-xs text-ink-400">28 KB • 2分钟前</p>
                    </div>
                  </div>
                  <button className="text-ink-400 hover:text-sky-600">
                    <Download size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DemoLayout>
  );
};

export default DemoChat;
