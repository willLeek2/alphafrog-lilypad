import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Send, Paperclip, Bot, User, FileText, Download, RefreshCw, X, Globe, Terminal, ChevronDown, Sparkles, Coins, Search, Loader2, Trash2 } from 'lucide-react';
import UserLayout from '../../layouts/UserLayout';
import { 
  startAgentRun, 
  getRunEvents, 
  getRunArtifacts, 
  listRuns,
  getAvailableModels,
  getCredits,
  deleteRun,
  listMessages,
  sendMessage,
  type AgentRunEvent,
  type Artifact,
  type ModelInfo,
  type CreditInfo,
  type AgentRunMessageItem
} from '../../api/agent';
import { loadAuth } from '../../utils/storage';
import { getApiBaseUrl } from '../../utils/api';
import { EventRenderer, EventList } from '../../components/agent/EventRenderer';
import { StatusIndicator } from '../../components/agent/StatusIndicator';
import type { AgentRunEvent as EventType } from '../../components/agent/types';

const API_BASE = getApiBaseUrl();

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

interface Session {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  hasArtifacts?: boolean;
}

// Market search sources
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

// Cache constants
const CACHE_TTL_MS = 60 * 1000; // 1 minute
const SESSIONS_CACHE_KEY = 'alphafrog_sessions_cache';
const EVENTS_CACHE_KEY_PREFIX = 'alphafrog_events_cache_';
const TURN_START_EVENTS = new Set(['RUN_RECEIVED', 'FOLLOW_UP_RECEIVED', 'WORKFLOW_RESUMED']);

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Cache helper functions
const getCache = <T,>(key: string): T | null => {
  try {
    const cached = sessionStorage.getItem(key);
    if (!cached) return null;
    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();
    if (now - entry.timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
};

const setCache = <T,>(key: string, data: T): void => {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore cache errors
  }
};

const clearEventsCache = (runId: string): void => {
  try {
    sessionStorage.removeItem(EVENTS_CACHE_KEY_PREFIX + runId);
  } catch {
    // Ignore
  }
};

const getLatestTurnStartSeq = (items: EventType[]): number => {
  if (!items || items.length === 0) {
    return 0;
  }
  let latest = 0;
  for (const event of items) {
    if (TURN_START_EVENTS.has(event.eventType)) {
      latest = Math.max(latest, event.seq);
    }
  }
  return latest;
};

const UserChat = () => {
  const navigate = useNavigate();
  const { runId: urlRunId } = useParams<{ runId?: string }>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Auth state
  const [user, setUser] = useState<{ username: string; credit: number } | null>(null);
  
  // Credit state from API
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  
  // Chat state
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showArtifacts, setShowArtifacts] = useState(true);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  
  // Events state
  const [events, setEvents] = useState<EventType[]>([]);
  const [lastSeq, setLastSeq] = useState(0);
  const [turnStartSeq, setTurnStartSeq] = useState(0);
  const [isRunCompleted, setIsRunCompleted] = useState(false);
  const [isRunSucceeded, setIsRunSucceeded] = useState(false); // Only true for WORKFLOW_COMPLETED
  
  // Multi-turn conversation state
  const [messageHistory, setMessageHistory] = useState<AgentRunMessageItem[]>([]);
  const [followUpInput, setFollowUpInput] = useState('');
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  
  // Models State
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [useWebSearch, setUseWebSearch] = useState(true);
  const [webSearchDropdownOpen, setWebSearchDropdownOpen] = useState(false);
  const [selectedSearchSources, setSelectedSearchSources] = useState<string[]>(['ah_market']);
  const [codeIntensityOpen, setCodeIntensityOpen] = useState(false);
  const [codeIntensity, setCodeIntensity] = useState(500);
  const [sliderValue, setSliderValue] = useState(50);
  const [retrievalOpen, setRetrievalOpen] = useState(false);
  const [selectedRetrieval, setSelectedRetrieval] = useState<string[]>(['news']);

  // Load auth info, models and credits
  useEffect(() => {
    const auth = loadAuth();
    if (auth) {
      setUser({
        username: auth.username,
        credit: auth.credit ?? 0,
      });
    }
    
    // Fetch available models
    const loadModels = async () => {
      try {
        setModelsLoading(true);
        const response = await getAvailableModels();
        if (response.models && response.models.length > 0) {
          setModels(response.models);
          setSelectedModel(response.models[0]);
          // If first model has validProviders, select the first one
          if (response.models[0].validProviders && response.models[0].validProviders.length > 0) {
            setSelectedProvider(response.models[0].validProviders[0]);
          }
        }
      } catch (error) {
        console.error('Failed to load models:', error);
      } finally {
        setModelsLoading(false);
      }
    };
    
    // Fetch credits
    const loadCredits = async () => {
      try {
        const credits = await getCredits();
        setCreditInfo(credits);
      } catch (error) {
        console.error('Failed to load credits:', error);
      }
    };
    
    loadModels();
    loadCredits();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events, messages, messageHistory]);

  // Load sessions list with cache
  const loadSessions = useCallback(async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh) {
      const cached = getCache<Session[]>(SESSIONS_CACHE_KEY);
      if (cached) {
        setSessions(cached);
        return;
      }
    }
    
    try {
      const response = await listRuns(0, 20);
      const sessionsData = response.items.map(run => ({
        id: run.id,
        title: run.message || '未命名会话',
        status: run.status,
        createdAt: run.createdAt,
      }));
      setSessions(sessionsData);
      setCache(SESSIONS_CACHE_KEY, sessionsData);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Load specific run if urlRunId is present
  useEffect(() => {
    if (urlRunId) {
      setCurrentRunId(urlRunId);
      setIsRunCompleted(false);
      setIsRunSucceeded(false);
      setShowFollowUp(false);
      setMessageHistory([]);
      setTurnStartSeq(0);
      // Check events cache first
      const cachedEvents = getCache<EventType[]>(EVENTS_CACHE_KEY_PREFIX + urlRunId);
      if (cachedEvents && cachedEvents.length > 0) {
        setEvents(cachedEvents);
        const maxSeq = Math.max(...cachedEvents.map(e => e.seq));
        const cachedStartSeq = getLatestTurnStartSeq(cachedEvents);
        if (cachedStartSeq > 0) {
          setTurnStartSeq(cachedStartSeq);
        }
        setLastSeq(maxSeq);
        // Check for terminal states (completed or failed)
        const hasCompleted = cachedEvents.some(e => e.eventType === 'WORKFLOW_COMPLETED');
        const hasFailed = cachedEvents.some(e => e.eventType === 'WORKFLOW_FAILED');
        const hasTerminalEvent = hasCompleted || hasFailed;
        setIsRunCompleted(hasTerminalEvent);
        setIsRunSucceeded(hasCompleted);
        // Load message history only for successfully completed runs
        if (hasCompleted) {
          loadMessageHistory(urlRunId);
        }
        // Still load artifacts and check for new events (in case cache is stale)
        loadRunArtifacts(urlRunId);
        // If run is not in terminal state, fetch new events from lastSeq
        if (!hasTerminalEvent) {
          loadRunEvents(urlRunId, maxSeq);
        }
      } else {
        setLastSeq(0);
        setEvents([]);
        setTurnStartSeq(0);
        loadRunEvents(urlRunId, 0);
        loadRunArtifacts(urlRunId);
      }
    }
  }, [urlRunId]);

  // Load message history for multi-turn conversation
  const loadMessageHistory = async (runId: string) => {
    try {
      const response = await listMessages(runId, 50, 0, true);
      setMessageHistory(response.items);
      // Show follow-up input for completed runs (regardless of history)
      // Backend may not store initial message, but follow-up should still work
      setShowFollowUp(true);
    } catch (error) {
      console.error('Failed to load message history:', error);
    }
  };

  // Polling for events - fixed: track lastSeq properly, with cache
  const loadRunEvents = async (runId: string, afterSeq: number = 0) => {
    try {
      const response = await getRunEvents(runId, afterSeq, 50);
      
      if (response.items.length > 0) {
        // Convert to EventType format
        const newEvents: EventType[] = response.items.map((event: AgentRunEvent) => ({
          id: event.id,
          runId: event.runId,
          seq: event.seq,
          eventType: event.eventType,
          payloadJson: event.payloadJson,
          createdAt: event.createdAt,
        }));
        
        // Calculate merged events first
        let mergedEvents: EventType[] = [];
        setEvents(prev => {
          const existingSeqs = new Set(prev.map(e => e.seq));
          const uniqueNew = newEvents.filter(e => !existingSeqs.has(e.seq));
          mergedEvents = [...prev, ...uniqueNew];
          return mergedEvents;
        });
        
        // Update cache after state update (use the calculated merged events)
        if (mergedEvents.length > 0) {
          setCache(EVENTS_CACHE_KEY_PREFIX + runId, mergedEvents);
        }

        const newStartSeq = getLatestTurnStartSeq(newEvents);
        if (newStartSeq > 0) {
          setTurnStartSeq(prev => Math.max(prev, newStartSeq));
        }
        
        // Update lastSeq
        const maxSeq = Math.max(...newEvents.map(e => e.seq));
        setLastSeq(maxSeq);
        
        // Check if run is completed or failed (terminal states)
        const hasCompleted = newEvents.some(e => e.eventType === 'WORKFLOW_COMPLETED');
        const hasFailed = newEvents.some(e => e.eventType === 'WORKFLOW_FAILED');
        const hasTerminalEvent = hasCompleted || hasFailed;
        if (hasTerminalEvent) {
          setIsRunCompleted(true);
          setIsRunSucceeded(hasCompleted && !hasFailed); // Only succeeded if completed without failure
          // Load message history immediately when run completes
          if (hasCompleted && !hasFailed) {
            loadMessageHistory(runId);
          }
        }
      }
      
      return response;
    } catch (error) {
      console.error('Failed to load events:', error);
      return null;
    }
  };

  const loadRunArtifacts = async (runId: string) => {
    try {
      const arts = await getRunArtifacts(runId);
      setArtifacts(arts);
    } catch (error) {
      console.error('Failed to load artifacts:', error);
    }
  };

  // Start polling when a run is active - fixed: use lastSeq
  useEffect(() => {
    if (currentRunId && !isRunCompleted) {
      pollingRef.current = setInterval(async () => {
        const response = await loadRunEvents(currentRunId, lastSeq);
        // Check if run just completed
        if (isRunCompleted && currentRunId) {
          // Load message history when run completes
          loadMessageHistory(currentRunId);
          // Clear polling
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      }, 2000);
    }
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [currentRunId, lastSeq, isRunCompleted]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !selectedModel) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Reset events and state for new run
    setEvents([]);
    setLastSeq(0);
    setTurnStartSeq(0);
    setIsRunCompleted(false);
    setIsRunSucceeded(false);

    try {
      const runId = await startAgentRun({
        message: userMessage.content,
        config: {
          model: selectedModel.compositeId,
          provider: selectedProvider || undefined,
          searchSources: useWebSearch ? selectedSearchSources : [],
          retrievalSources: selectedRetrieval,
          codeIntensity,
          useWebSearch,
        }
      });
      
      setCurrentRunId(runId);
      navigate(`/app/chat/${runId}`, { replace: true });
      
      // Clear cache for new run and refresh sessions
      clearEventsCache(runId);
      setCache<Session[]>(SESSIONS_CACHE_KEY, []); // Clear sessions cache to force refresh
      loadSessions(true); // Force refresh sessions
      
    } catch (error) {
      console.error('Failed to start run:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'agent',
        content: '启动分析任务失败，请稍后重试',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    // Clear current run's events cache
    if (currentRunId) {
      clearEventsCache(currentRunId);
    }
    setCurrentRunId(null);
    setMessages([]);
    setEvents([]);
    setArtifacts([]);
    setLastSeq(0);
    setTurnStartSeq(0);
    setIsRunCompleted(false);
    setIsRunSucceeded(false);
    setShowFollowUp(false);
    setMessageHistory([]);
    navigate('/app/chat', { replace: true });
  };

  const handleSessionClick = (sessionId: string) => {
    navigate(`/app/chat/${sessionId}`);
  };

  // Delete session handler
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering session click
    
    // Confirm deletion
    if (!confirm('确定要删除这个会话吗？')) {
      return;
    }
    
    try {
      await deleteRun(sessionId);
      
      // Remove from local state and update cache atomically
      setSessions(prev => {
        const updated = prev.filter(s => s.id !== sessionId);
        // Update cache with the filtered list
        setCache(SESSIONS_CACHE_KEY, updated);
        return updated;
      });
      
      // Clear events cache for this run
      clearEventsCache(sessionId);
      
      // If current run is deleted, navigate to new chat
      if (currentRunId === sessionId) {
        handleNewChat();
      }
    } catch (error: any) {
      // Handle specific error codes
      const errorMsg = error?.message || '';
      if (errorMsg.includes('409') || errorMsg.includes('运行中')) {
        alert('该会话正在运行中，请先取消或暂停后再删除');
      } else if (errorMsg.includes('404')) {
        alert('会话不存在或已被删除');
        // Refresh sessions list to sync with server
        loadSessions(true);
      } else {
        alert('删除失败：' + errorMsg);
      }
    }
  };

  // Handle follow-up message send
  const handleFollowUpSend = async () => {
    if (!followUpInput.trim() || isFollowUpLoading || !currentRunId) return;
    
    setIsFollowUpLoading(true);
    const startSeq = lastSeq;
    
    try {
      const response = await sendMessage(currentRunId, followUpInput.trim());
      
      if (response.status === 'accepted') {
        // Clear input
        setFollowUpInput('');
        // Reload message history to show new messages
        await loadMessageHistory(currentRunId);
        // Refresh events to get new processing events
        setIsRunCompleted(false);
        setIsRunSucceeded(false);
        setTurnStartSeq(startSeq);
        loadRunEvents(currentRunId, startSeq);
      } else {
        alert('消息发送被拒绝：' + (response.rejectReason || '未知原因'));
      }
    } catch (error: any) {
      console.error('Failed to send follow-up:', error);
      alert('发送失败：' + (error?.message || '请稍后重试'));
    } finally {
      setIsFollowUpLoading(false);
    }
  };

  const getIntensityLabel = (val: number) => {
    if (val >= 1000) return '无限制';
    return `${val} Credits`;
  };

  const handleSliderChange = (visualValue: number) => {
    setSliderValue(visualValue);
    if (visualValue <= 50) {
      const actualValue = Math.round(10 + (visualValue / 50) * 490);
      setCodeIntensity(actualValue);
    } else if (visualValue >= 70) {
      setCodeIntensity(1000);
    }
  };

  // Fixed download function: use token query parameter
  const handleDownload = (artifactId: string) => {
    const auth = loadAuth();
    const token = auth?.token;
    if (!token) {
      console.error('No auth token available');
      return;
    }
    
    const url = `${API_BASE}/api/agent/artifacts/${artifactId}/download?token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
  };

  const showHistory = messageHistory.length > 0;
  const baseEvents = showHistory
    // 避免“对话历史”与事件区重复显示用户/助手消息
    ? events.filter(event => event.eventType !== 'RUN_RECEIVED' && event.eventType !== 'WORKFLOW_COMPLETED')
    : events;
  const displayEvents = showHistory
    ? baseEvents.filter(event => event.seq > turnStartSeq)
    : baseEvents;

  const renderMessageBubble = (msg: AgentRunMessageItem) => (
    <div 
      key={msg.id} 
      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div 
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          msg.role === 'user' 
            ? 'bg-sky-600 text-white rounded-br-md' 
            : 'bg-white border border-sky-100 text-ink-700 rounded-bl-md'
        }`}
      >
        <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
        <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-sky-200' : 'text-ink-400'}`}>
          {msg.msgType === 'follow_up' && '追问'}
          {msg.msgType === 'initial' && '初始问题'}
          {msg.msgType === 'summary' && '总结'}
        </div>
      </div>
    </div>
  );

  const lastUserIndex = showHistory
    ? (() => {
        for (let i = messageHistory.length - 1; i >= 0; i--) {
          if (messageHistory[i]?.role === 'user') {
            return i;
          }
        }
        return -1;
      })()
    : -1;
  const historyBefore = showHistory && lastUserIndex > 0
    ? messageHistory.slice(0, lastUserIndex)
    : [];
  const currentTurnMessages = showHistory && lastUserIndex >= 0
    ? messageHistory.slice(lastUserIndex)
    : [];

  return (
    <UserLayout>
      <div className="flex h-full gap-6 overflow-hidden">
        {/* Sessions Sidebar */}
        <div className="w-64 flex-shrink-0 flex flex-col rounded-lg border border-sky-100 bg-white shadow-sm">
          <div className="border-b border-sky-50 p-4">
            <button 
              onClick={handleNewChat}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors"
            >
              <RefreshCw size={16} />
              新对话
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-ink-400">最近记录</h3>
            <div className="space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSessionClick(session.id)}
                  className={`group relative w-full rounded-lg px-3 py-3 text-left transition-colors cursor-pointer ${
                    currentRunId === session.id
                      ? 'bg-sky-50 text-sky-700'
                      : 'text-ink-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="pr-7">
                    <p className={`truncate text-sm ${currentRunId === session.id ? 'font-medium' : ''}`}>
                      {session.title}
                    </p>
                    <span className="text-xs text-ink-400">
                      {new Date(session.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  {/* Delete button - visible on hover or for active session */}
                  <button
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all ${
                      currentRunId === session.id
                        ? 'text-sky-400 hover:text-red-600 hover:bg-red-50 opacity-100'
                        : 'text-ink-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100'
                    }`}
                    title="删除会话"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          {/* Credit Display */}
          <div className="border-t border-sky-50 p-3">
            <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
              <Coins size={14} className="text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700">
                可用额度: {creditInfo?.remainingCredits ?? user?.credit ?? 0}
              </span>
            </div>
            {creditInfo && (
              <div className="mt-1 text-center text-[10px] text-ink-400">
                总计: {creditInfo.totalCredits} · 已用: {creditInfo.usedCredits}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex flex-1 flex-col rounded-lg border border-sky-100 bg-white shadow-sm overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 pb-20">
            {events.length === 0 && messages.length === 0 ? (
              /* Welcome Screen */
              <div className="flex flex-col items-center justify-center h-full space-y-8">
                <div className="text-center space-y-4">
                  <h2 className="text-3xl font-bold text-ink-900">有什么可以帮您的？</h2>
                  <p className="text-ink-500">我可以帮您分析金融数据、查询市场信息</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                  {[
                    '计算沪深300近一年的波动率',
                    '分析中证500的市盈率分布',
                    '筛选ROE大于15%的消费股',
                    '查询最近一周的热门板块',
                  ].map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(prompt)}
                      className="p-4 text-left rounded-xl border border-sky-100 bg-white hover:bg-sky-50 hover:border-sky-300 transition-all text-sm text-ink-600"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Render events for runs without history */}
                {!showHistory && <EventList events={displayEvents} />}
                
                {/* Render history and current turn when history exists */}
                {showHistory && (
                  <>
                    {historyBefore.length > 0 && (
                      <div className="space-y-4 mt-6 pt-6 border-t border-sky-100">
                        <div className="flex items-center gap-2 text-xs font-medium text-ink-400 uppercase tracking-wider">
                          <Sparkles size={12} />
                          对话历史
                        </div>
                        {historyBefore.map(renderMessageBubble)}
                      </div>
                    )}

                    {currentTurnMessages.length > 0 && (
                      <div className="space-y-4 mt-6 pt-6 border-t border-sky-100">
                        <div className="flex items-center gap-2 text-xs font-medium text-ink-400 uppercase tracking-wider">
                          <Sparkles size={12} />
                          本轮对话
                        </div>
                        {renderMessageBubble(currentTurnMessages[0])}
                        {displayEvents.length > 0 && (
                          <div className="space-y-4 mt-4">
                            <div className="flex items-center gap-2 text-xs font-medium text-ink-400 uppercase tracking-wider">
                              <Terminal size={12} />
                              执行过程
                            </div>
                            <EventList events={displayEvents} />
                          </div>
                        )}
                        {currentTurnMessages.slice(1).map(renderMessageBubble)}
                      </div>
                    )}
                  </>
                )}
                
                {/* Show loading indicator when run is active */}
                {currentRunId && !isRunCompleted && (
                  <div className="flex items-center gap-2 text-xs text-ink-400 py-2">
                    <Loader2 size={14} className="animate-spin" />
                    <span>处理中...</span>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-sky-100 bg-white p-4">
            {/* Controls Bar */}
            <div className="flex items-center justify-between mb-3 px-1">
              {/* Left: Model Selector */}
              <div className="flex items-center gap-2">
                {/* Model Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                    disabled={modelsLoading}
                    className="flex items-center gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 transition-colors disabled:opacity-50"
                  >
                    <Bot size={14} />
                    {modelsLoading ? '加载中...' : selectedModel?.displayName || '选择模型'}
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
                            // Reset provider when model changes
                            if (model.validProviders && model.validProviders.length > 0) {
                              setSelectedProvider(model.validProviders[0]);
                            } else {
                              setSelectedProvider('');
                            }
                          }}
                          className={`w-full px-4 py-2 text-left text-xs hover:bg-sky-50 ${selectedModel?.compositeId === model.compositeId ? 'text-sky-700 font-medium bg-sky-50' : 'text-ink-700'}`}
                        >
                          <div className="flex flex-col">
                            <span>{model.displayName}</span>
                            <span className="text-[10px] text-ink-400">{model.endpoint} · 倍率: {model.baseRate}x</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Provider Selector - Only show for OpenRouter models with validProviders */}
                {selectedModel?.validProviders && selectedModel.validProviders.length > 0 && (
                  <div className="relative">
                    <button 
                      onClick={() => setProviderDropdownOpen(!providerDropdownOpen)}
                      className="flex items-center gap-1.5 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      <span className="text-[10px] text-amber-600">Provider:</span>
                      {selectedProvider}
                      <ChevronDown size={10} />
                    </button>
                    
                    {providerDropdownOpen && (
                      <div className="absolute bottom-full left-0 mb-2 w-40 rounded-lg border border-amber-100 bg-white shadow-lg py-1 z-30">
                        {selectedModel.validProviders.map(provider => (
                          <button
                            key={provider}
                            onClick={() => {
                              setSelectedProvider(provider);
                              setProviderDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-xs hover:bg-amber-50 ${selectedProvider === provider ? 'text-amber-700 font-medium bg-amber-50' : 'text-ink-700'}`}
                          >
                            {provider}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Right: Feature Toggles */}
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

                {/* Code Intensity */}
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
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                      <div className="flex justify-between text-[10px] text-ink-400 mt-1">
                        <span>10</span>
                        <span>500</span>
                        <span className="text-amber-600 font-medium">无限制</span>
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
            
            {/* Input Box - Show follow-up input for successfully completed runs */}
            {currentRunId && isRunSucceeded && showFollowUp ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Sparkles size={14} className="text-violet-500" />
                  <span className="text-xs font-medium text-violet-700">可以继续追问</span>
                </div>
                <div className="relative flex items-center rounded-lg border border-violet-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-violet-100 focus-within:border-violet-400 transition-all">
                  <input
                    type="text"
                    value={followUpInput}
                    onChange={(e) => setFollowUpInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFollowUpSend()}
                    placeholder="继续追问..."
                    className="flex-1 bg-transparent py-3 px-4 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
                    disabled={isFollowUpLoading}
                  />
                  <button 
                    onClick={handleFollowUpSend}
                    className="m-1 rounded-lg bg-violet-600 p-2 text-white hover:bg-violet-700 transition-colors disabled:opacity-50"
                    disabled={!followUpInput.trim() || isFollowUpLoading}
                  >
                    {isFollowUpLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-ink-400">
                    基于当前对话继续提问
                  </div>
                  <button 
                    onClick={handleNewChat}
                    className="text-[10px] text-sky-600 hover:text-sky-700 font-medium"
                  >
                    开启新对话 →
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                    disabled={isLoading}
                  />
                  <button 
                    onClick={handleSend}
                    className="m-1 rounded-lg bg-sky-600 p-2 text-white hover:bg-sky-700 transition-colors disabled:opacity-50"
                    disabled={!input.trim() || isLoading}
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
                <div className="mt-2 text-center text-[10px] text-ink-400">
                  AlphaFrog 可能生成错误信息。请核实重要财务数据。
                </div>
              </>
            )}
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
              {artifacts.length === 0 ? (
                <div className="text-center text-ink-400 text-sm py-8">
                  暂无产物
                </div>
              ) : (
                artifacts.map(art => (
                  <div key={art.artifactId} className="rounded-lg border border-sky-50 bg-sky-50/50 p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-sky-600" />
                        <div>
                          <p className="text-sm font-medium text-ink-900 truncate max-w-[120px]">{art.name}</p>
                          <p className="text-xs text-ink-400">{art.type}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDownload(art.artifactId)}
                        className="text-ink-400 hover:text-sky-600"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default UserChat;
