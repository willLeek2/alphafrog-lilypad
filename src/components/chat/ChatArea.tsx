import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Bot, User, ChevronDown, Globe, Terminal, Sparkles, Search } from 'lucide-react';
import { AgentRunEvent } from '../../api/agent';

interface ChatAreaProps {
  messages: AgentRunEvent[]; 
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  isLoading: boolean;
  
  // Controls
  selectedModel: any;
  setSelectedModel: (model: any) => void;
  availableModels: any[];
  
  useWebSearch: boolean;
  setUseWebSearch: (val: boolean) => void;
  selectedSearchSources: string[];
  setSelectedSearchSources: (val: string[]) => void;
  availableSearchSources: any[];
  
  codeIntensity: number;
  setCodeIntensity: (val: number) => void;
  
  selectedRetrieval: string[];
  setSelectedRetrieval: (val: string[]) => void;
  availableRetrievalSources: any[];
}

export const ChatArea = ({
  messages,
  input,
  setInput,
  onSend,
  isLoading,
  selectedModel,
  setSelectedModel,
  availableModels,
  useWebSearch,
  setUseWebSearch,
  selectedSearchSources,
  setSelectedSearchSources,
  availableSearchSources,
  codeIntensity,
  setCodeIntensity,
  selectedRetrieval,
  setSelectedRetrieval,
  availableRetrievalSources
}: ChatAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Dropdown states
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [webSearchDropdownOpen, setWebSearchDropdownOpen] = useState(false);
  const [codeIntensityOpen, setCodeIntensityOpen] = useState(false);
  const [retrievalOpen, setRetrievalOpen] = useState(false);
  
  // Slider state for visual representation
  const [sliderValue, setSliderValue] = useState(50);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Helper for slider visual value
  const handleSliderChange = (visualValue: number) => {
    setSliderValue(visualValue);
    if (visualValue <= 50) {
      // 0-50 -> 10-500
      const actualValue = Math.round(10 + (visualValue / 50) * 490);
      setCodeIntensity(actualValue);
    } else if (visualValue >= 70) {
      // 70-100 -> 1000
      setCodeIntensity(1000);
    }
  };

  const getIntensityLabel = (val: number) => {
    if (val >= 1000) return '无限制';
    return `${val} Credits`;
  };

  return (
    <div className="flex flex-1 flex-col rounded-lg border border-sky-100 bg-white shadow-sm overflow-hidden h-full">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 pb-20">
        {messages.length === 0 && (
           <div className="flex h-full items-center justify-center text-ink-400">
             开始对话...
           </div>
        )}
        
        {messages.map((msg: any) => (
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
              {/* Thinking Indicator */}
              {msg.isThinking && (
                <div className="flex items-center gap-2 rounded-lg border border-sky-100 bg-white px-3 py-2 text-xs text-ink-500 shadow-sm animate-pulse">
                  <div className="h-2 w-2 rounded-full bg-sky-400 animate-bounce" />
                  思考中...
                </div>
              )}

              {/* Message Content */}
              <div
                className={`rounded-lg px-5 py-3.5 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-sky-600 text-white rounded-br-none'
                    : 'bg-white border border-sky-100 text-ink-900 rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>

              {/* Meta Info */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-ink-400">
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            </div>

            {msg.role === 'user' && (
               <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <User size={18} />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input & Controls */}
      <div className="border-t border-sky-100 bg-white p-4">
        {/* Controls Bar */}
        <div className="flex items-center justify-between mb-3 px-1 z-20 relative">
          {/* Model Selector */}
          <div className="relative">
            <button 
              onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
              className="flex items-center gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 transition-colors"
            >
              <Bot size={14} />
              {selectedModel?.name || '选择模型'}
              <ChevronDown size={12} />
            </button>
            
            {modelDropdownOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-64 rounded-lg border border-sky-100 bg-white shadow-lg py-1 z-30 max-h-60 overflow-y-auto">
                {availableModels.map((model: any) => (
                  <button
                    key={model.compositeId}
                    onClick={() => {
                      setSelectedModel(model);
                      setModelDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-xs hover:bg-sky-50 ${selectedModel?.compositeId === model.compositeId ? 'text-sky-700 font-medium bg-sky-50' : 'text-ink-700'}`}
                  >
                    {model.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Feature Toggles */}
          <div className="flex items-center gap-3">
             {/* Web Search */}
             <div className="relative">
                <button 
                  onClick={() => setWebSearchDropdownOpen(!webSearchDropdownOpen)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border transition-colors ${useWebSearch ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-ink-400 border-transparent hover:bg-gray-50'}`}
                >
                  <Globe size={12} />
                  {useWebSearch 
                    ? (selectedSearchSources.length === 1 
                        ? availableSearchSources.find(s => s.id === selectedSearchSources[0])?.name 
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
                        if (!useWebSearch) setSelectedSearchSources(['ah_market']); // Default
                        setWebSearchDropdownOpen(false); 
                      }}
                      className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 text-ink-700 border-b border-gray-50"
                    >
                       {useWebSearch ? '关闭搜索' : '开启搜索'}
                    </button>
                    {useWebSearch && availableSearchSources.map((source: any) => {
                      const isSelected = selectedSearchSources.includes(source.id);
                      return (
                        <button
                          key={source.id}
                          onClick={() => {
                            if (isSelected) {
                              if (selectedSearchSources.length > 1) {
                                setSelectedSearchSources(selectedSearchSources.filter(id => id !== source.id));
                              }
                            } else {
                              setSelectedSearchSources([...selectedSearchSources, source.id]);
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
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
             </div>

             {/* Code Intensity */}
             <div className="relative">
                <button 
                  onClick={() => setCodeIntensityOpen(!codeIntensityOpen)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border transition-colors ${codeIntensity > 10 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-ink-400 border-transparent hover:bg-gray-50'}`}
                >
                  <Terminal size={12} />
                  编程: {getIntensityLabel(codeIntensity)}
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
                       className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                     />
                     <div className="flex justify-between text-[10px] text-ink-400 mt-1 relative">
                        <span>10</span>
                        <span className="absolute left-[50%] -translate-x-1/2">500</span>
                        <span className="text-amber-600 font-medium">∞</span>
                     </div>
                  </div>
                )}
             </div>

             {/* Retrieval */}
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
                       <span>数据源</span>
                       <span>消耗</span>
                    </div>
                    {availableRetrievalSources.map((source: any) => {
                      const isSelected = selectedRetrieval.includes(source.id);
                      return (
                        <button
                          key={source.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedRetrieval(selectedRetrieval.filter(id => id !== source.id));
                            } else {
                              setSelectedRetrieval([...selectedRetrieval, source.id]);
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
        
        {/* Input Field */}
        <div className="relative flex items-center rounded-lg border border-sky-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-sky-100 focus-within:border-sky-400 transition-all">
          <button className="p-3 text-ink-400 hover:text-sky-600" disabled>
            <Paperclip size={20} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSend()}
            placeholder="让 AlphaFrog 帮您分析市场..."
            className="flex-1 bg-transparent py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
            disabled={isLoading}
          />
          <button 
            onClick={onSend}
            className="m-1 rounded-lg bg-sky-600 p-2 text-white hover:bg-sky-700 transition-colors disabled:opacity-50"
            disabled={!input.trim() || isLoading}
          >
            <Send size={18} />
          </button>
        </div>
        <div className="mt-2 text-center text-[10px] text-ink-400">
          AlphaFrog 可能生成错误信息。请核实重要财务数据。
        </div>
      </div>
    </div>
  );
};
