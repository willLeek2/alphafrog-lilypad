import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Send, Loader2, Bot, User, Clock } from 'lucide-react';
import { useAgentStore } from '../../store/agentStore';
import { startAgentRun } from '../../api/agent';

const AgentChatPage = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get messages from store
  const messages = useAgentStore((state) => state.messages);
  const addMessage = useAgentStore((state) => state.addMessage);
  const updateMessage = useAgentStore((state) => state.updateMessage);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input.trim(),
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInput('');
    setIsLoading(true);
    setError(null);

    const agentMessage = {
      id: (Date.now() + 1).toString(),
      role: 'agent' as const,
      content: '',
      status: 'sending' as const,
      timestamp: new Date(),
    };

    addMessage(agentMessage);

    try {
      const runId = await startAgentRun({ message: userMessage.content });
      
      // Update agent message with runId
      updateMessage(agentMessage.id, { 
        runId, 
        status: 'running' 
      });

      // Navigate to detail page after a short delay
      setTimeout(() => {
        navigate(`/agent/runs/${runId}`);
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '启动 Agent 失败');
      updateMessage(agentMessage.id, { 
        status: 'error', 
        content: '启动失败，请重试' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const examplePrompts = [
    '计算沪深300近一年的波动率',
    '分析中证500的市盈率分布',
    '编写Python代码计算MACD指标',
    '查询最近一周的热门股票',
  ];

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 px-6 py-4 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">AlphaFrog Agent</h1>
            <p className="text-sm text-slate-500">智能金融数据分析助手</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 ? (
            /* Welcome Screen */
            <div className="space-y-8 pt-12">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-slate-800">
                  有什么可以帮您的？
                </h2>
                <p className="text-slate-600">
                  我可以帮您分析金融数据、编写 Python 脚本、查询市场信息等
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {examplePrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(prompt)}
                    className="p-4 text-left rounded-xl border border-slate-200 bg-white/60 hover:bg-white hover:border-violet-300 hover:shadow-md transition-all duration-200 text-sm text-slate-600"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message List */
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    message.role === 'user'
                      ? 'bg-slate-200'
                      : 'bg-gradient-to-br from-violet-500 to-blue-600'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-5 h-5 text-slate-600" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>

                {/* Content */}
                <div
                  className={`max-w-[80%] space-y-1 ${
                    message.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`inline-block px-4 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-violet-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-800'
                    }`}
                  >
                    {message.role === 'agent' && message.status === 'sending' ? (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>正在启动 Agent...</span>
                      </div>
                    ) : message.role === 'agent' && message.status === 'running' ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Clock className="w-4 h-4" />
                          <span>Agent 正在执行中...</span>
                        </div>
                        {message.runId && (
                          <button
                            onClick={() => navigate(`/agent/runs/${message.runId}`)}
                            className="text-violet-600 hover:text-violet-700 text-sm font-medium"
                          >
                            查看执行详情 →
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 px-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200/60 bg-white/80 backdrop-blur-sm px-6 py-4 shrink-0">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative flex items-end gap-2 p-3 rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="输入您的问题..."
                rows={1}
                className="flex-1 resize-none max-h-32 px-3 py-2 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400"
                style={{ minHeight: '44px' }}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-violet-500/30 transition-all duration-200"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-center text-slate-400">
              按 Enter 发送，Shift + Enter 换行
            </p>
          </form>

          {error && (
            <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentChatPage;
