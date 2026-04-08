import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  Coins,
  Download,
  FileText,
  Globe,
  Loader2,
  Pause,
  Paperclip,
  PencilLine,
  Play,
  Search,
  Send,
  Sparkles,
  Square,
  Terminal,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import UserLayout from '../../layouts/UserLayout';
import {
  cancelRun,
  deleteRun,
  getAvailableModels,
  getCredits,
  getRun,
  getRunArtifacts,
  getRunEvents,
  getRunStatus,
  getRunTraces,
  getTraceDetail,
  listMessages,
  listRuns,
  pauseRun,
  resumeRun,
  sendMessage,
  startAgentRun,
  updateRunTitle,
  type AgentRun,
  type AgentRunEvent,
  type AgentRunMessageItem,
  type AgentRunStatus,
  type Artifact,
  type CreditInfo,
  type ModelInfo,
  type TraceDetail,
  type TraceSpanItem,
} from '../../api/agent';
import { EventList } from '../../components/agent/EventRenderer';
import type { AgentRunEvent as EventType } from '../../components/agent/types';
import { getApiBaseUrl } from '../../utils/api';
import { loadAuth } from '../../utils/storage';

const API_BASE = getApiBaseUrl();
const CACHE_TTL_MS = 60 * 1000;
const SESSIONS_CACHE_KEY = 'alphafrog_sessions_cache';
const EVENTS_CACHE_KEY_PREFIX = 'alphafrog_events_cache_';
const POLLING_INTERVAL_MS = 2000;
const TURN_START_EVENTS = new Set(['RUN_RECEIVED', 'FOLLOW_UP_RECEIVED', 'WORKFLOW_RESUMED']);
const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'CANCELED', 'CANCELLED']);
const RESUMABLE_STATUSES = new Set(['PAUSED', 'WAITING']);

interface Session {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  hasArtifacts?: boolean;
}

interface SearchSourceOption {
  id: string;
  name: string;
  desc: string;
}

interface RetrievalSourceOption {
  id: string;
  name: string;
  cost: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const searchSources: SearchSourceOption[] = [
  { id: 'ah_market', name: 'AH市场', desc: 'A股及港股相关资讯' },
  { id: 'us_market', name: '美国市场', desc: '美股及美股中概相关资讯' },
  { id: 'apac_market', name: '亚太市场', desc: '日韩东南亚等市场资讯' },
  { id: 'eu_market', name: '欧洲市场', desc: '欧洲主要市场资讯' },
  { id: 'emerging_market', name: '其他新兴市场', desc: '拉美、中东、非洲等市场' },
];

const retrievalSources: RetrievalSourceOption[] = [
  { id: 'news', name: '新闻资讯', cost: 2 },
  { id: 'announcement', name: '公告信息', cost: 5 },
  { id: 'report', name: '券商研报', cost: 10 },
];

const getCache = <T,>(key: string): T | null => {
  try {
    const cached = sessionStorage.getItem(key);
    if (!cached) {
      return null;
    }
    const entry: CacheEntry<T> = JSON.parse(cached);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
};

const setCache = <T,>(key: string, data: T) => {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore cache failures
  }
};

const clearEventsCache = (runId: string) => {
  try {
    sessionStorage.removeItem(EVENTS_CACHE_KEY_PREFIX + runId);
  } catch {
    // ignore cache failures
  }
};

const getLatestTurnStartSeq = (items: EventType[]): number => {
  let latest = 0;
  for (const item of items) {
    if (TURN_START_EVENTS.has(item.eventType)) {
      latest = Math.max(latest, item.seq);
    }
  }
  return latest;
};

const toEventItems = (items: AgentRunEvent[]): EventType[] =>
  items.map((event) => ({
    id: event.id,
    runId: event.runId,
    seq: event.seq,
    eventType: event.eventType,
    payloadJson: event.payloadJson,
    createdAt: event.createdAt,
  }));

const mergeEvents = (current: EventType[], incoming: EventType[]) => {
  if (incoming.length === 0) {
    return current;
  }
  const existingSeqs = new Set(current.map((item) => item.seq));
  const uniqueIncoming = incoming.filter((item) => !existingSeqs.has(item.seq));
  if (uniqueIncoming.length === 0) {
    return current;
  }
  return [...current, ...uniqueIncoming];
};

const isTerminalStatus = (status?: string | null) => TERMINAL_STATUSES.has(status ?? '');

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '--';
  }
  return new Date(value).toLocaleString('zh-CN');
};

const formatDuration = (value?: number | null) => {
  if (!value || value <= 0) {
    return '--';
  }
  if (value < 1000) {
    return `${value} ms`;
  }
  const seconds = Math.floor(value / 1000);
  if (seconds < 60) {
    return `${seconds} s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} 分 ${seconds % 60} 秒`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours} 小时 ${minutes % 60} 分`;
};

const stringifyBlock = (value: unknown) => {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const getTraceSubtitle = (trace: TraceSpanItem) => {
  if (trace.type === 'llm') {
    const input = trace.inputTokens ?? 0;
    const output = trace.outputTokens ?? 0;
    return `${trace.model || 'LLM'} · ${input + output} tokens`;
  }
  if (trace.type === 'tool') {
    if (trace.cacheHit) {
      return `${trace.toolName || 'Tool'} · cache hit`;
    }
    return `${trace.toolName || 'Tool'} · ${trace.success ? '成功' : '执行中/失败'}`;
  }
  return trace.phase || '--';
};

const getStatusUi = (status?: string | null) => {
  switch (status) {
    case 'COMPLETED':
      return { label: '已完成', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'FAILED':
      return { label: '失败', className: 'bg-red-50 text-red-700 border-red-200' };
    case 'CANCELED':
    case 'CANCELLED':
      return { label: '已取消', className: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'PAUSED':
      return { label: '已暂停', className: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'WAITING':
      return { label: '等待继续', className: 'bg-violet-50 text-violet-700 border-violet-200' };
    case 'RUNNING':
      return { label: '运行中', className: 'bg-sky-50 text-sky-700 border-sky-200' };
    default:
      return { label: status || '处理中', className: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
};

const UserChat = () => {
  const navigate = useNavigate();
  const { runId: urlRunId } = useParams<{ runId?: string }>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSeqRef = useRef(0);

  const [user, setUser] = useState<{ username: string; credit: number } | null>(null);
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [currentRun, setCurrentRun] = useState<AgentRun | null>(null);
  const [currentStatus, setCurrentStatus] = useState<AgentRunStatus | null>(null);
  const [events, setEvents] = useState<EventType[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [messageHistory, setMessageHistory] = useState<AgentRunMessageItem[]>([]);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpInput, setFollowUpInput] = useState('');
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  const [input, setInput] = useState('');
  const [isCreatingRun, setIsCreatingRun] = useState(false);
  const [lastSeq, setLastSeq] = useState(0);
  const [turnStartSeq, setTurnStartSeq] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [railTab, setRailTab] = useState<'artifacts' | 'traces'>('artifacts');
  const [traceItems, setTraceItems] = useState<TraceSpanItem[]>([]);
  const [traceSummary, setTraceSummary] = useState({
    totalLlmCalls: 0,
    totalToolCalls: 0,
    totalDurationMs: 0,
    totalTokens: 0,
  });
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<TraceDetail | null>(null);
  const [tracesLoading, setTracesLoading] = useState(false);
  const [traceDetailLoading, setTraceDetailLoading] = useState(false);
  const [traceError, setTraceError] = useState<string | null>(null);

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [useWebSearch, setUseWebSearch] = useState(true);
  const [webSearchDropdownOpen, setWebSearchDropdownOpen] = useState(false);
  const [selectedSearchSources, setSelectedSearchSources] = useState<string[]>(['ah_market']);
  const [codeIntensityOpen, setCodeIntensityOpen] = useState(false);
  const [codeIntensity, setCodeIntensity] = useState(500);
  const [sliderValue, setSliderValue] = useState(50);
  const [retrievalOpen, setRetrievalOpen] = useState(false);
  const [selectedRetrieval, setSelectedRetrieval] = useState<string[]>(['news']);

  const runStatus = currentStatus?.status || currentRun?.status || null;
  const runTitle = currentRun?.message || sessions.find((item) => item.id === currentRunId)?.title || '未命名会话';
  const showHistory = messageHistory.length > 0;
  const canPause = runStatus === 'RUNNING';
  const canResume = RESUMABLE_STATUSES.has(runStatus || '');
  const canCancel = ['RUNNING', 'PAUSED', 'WAITING'].includes(runStatus || '');
  const isRunSucceeded = runStatus === 'COMPLETED';

  const syncSessionEntry = useCallback((run: AgentRun) => {
    setSessions((prev) => {
      const next = [...prev];
      const index = next.findIndex((item) => item.id === run.id);
      const updated: Session = {
        id: run.id,
        title: run.message || '未命名会话',
        status: run.status,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        hasArtifacts: run.hasArtifacts,
      };

      if (index >= 0) {
        next[index] = updated;
      } else {
        next.unshift(updated);
      }

      setCache(SESSIONS_CACHE_KEY, next);
      return next;
    });
  }, []);

  const resetRunState = useCallback(() => {
    setCurrentRunId(null);
    setCurrentRun(null);
    setCurrentStatus(null);
    setEvents([]);
    setArtifacts([]);
    setMessageHistory([]);
    setShowFollowUp(false);
    setFollowUpInput('');
    setActionError(null);
    setTurnStartSeq(0);
    setLastSeq(0);
    lastSeqRef.current = 0;
    setIsEditingTitle(false);
    setTitleDraft('');
    setTraceItems([]);
    setTraceSummary({
      totalLlmCalls: 0,
      totalToolCalls: 0,
      totalDurationMs: 0,
      totalTokens: 0,
    });
    setSelectedTraceId(null);
    setSelectedTrace(null);
    setTraceError(null);
  }, []);

  const loadSessions = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getCache<Session[]>(SESSIONS_CACHE_KEY);
      if (cached) {
        setSessions(cached);
      }
    }

    try {
      const response = await listRuns(0, 20);
      const nextSessions = response.items.map((run) => ({
        id: run.id,
        title: run.message || '未命名会话',
        status: run.status,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        hasArtifacts: run.hasArtifacts,
      }));
      setSessions(nextSessions);
      setCache(SESSIONS_CACHE_KEY, nextSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }, []);

  const loadRunSummary = useCallback(async (runId: string) => {
    try {
      const run = await getRun(runId);
      setCurrentRun(run);
      setTitleDraft(run.message || '未命名会话');
      syncSessionEntry(run);
      return run;
    } catch (error) {
      console.error('Failed to load run summary:', error);
      return null;
    }
  }, [syncSessionEntry]);

  const loadRunArtifacts = useCallback(async (runId: string) => {
    try {
      const items = await getRunArtifacts(runId);
      setArtifacts(items);
      return items;
    } catch (error) {
      console.error('Failed to load artifacts:', error);
      return [];
    }
  }, []);

  const loadMessageHistory = useCallback(async (runId: string) => {
    try {
      const response = await listMessages(runId, 50, 0, true);
      setMessageHistory(response.items);
      setShowFollowUp(true);
      return response.items;
    } catch (error) {
      console.error('Failed to load message history:', error);
      return [];
    }
  }, []);

  const loadRunStatusSafely = useCallback(async (runId: string) => {
    try {
      const status = await getRunStatus(runId);
      setCurrentStatus(status);

      if (status.status === 'COMPLETED') {
        await loadMessageHistory(runId);
      } else if (status.status !== 'COMPLETED') {
        setShowFollowUp(false);
      }

      return status;
    } catch (error) {
      console.error('Failed to load status:', error);
      return null;
    }
  }, [loadMessageHistory]);

  const loadRunEventsSafely = useCallback(async (runId: string, afterSeq: number, replace = false) => {
    try {
      const response = await getRunEvents(runId, afterSeq, 50);
      const incoming = toEventItems(response.items);

      let mergedEvents: EventType[] = [];
      setEvents((prev) => {
        mergedEvents = replace ? incoming : mergeEvents(prev, incoming);
        return mergedEvents;
      });

      const nextSeq = response.items.length > 0
        ? Math.max(...response.items.map((item) => item.seq))
        : afterSeq;
      lastSeqRef.current = nextSeq;
      setLastSeq(nextSeq);

      if (replace) {
        setTurnStartSeq(getLatestTurnStartSeq(incoming));
      } else {
        const latestTurnStart = getLatestTurnStartSeq(incoming);
        if (latestTurnStart > 0) {
          setTurnStartSeq((prev) => Math.max(prev, latestTurnStart));
        }
      }

      if (mergedEvents.length > 0) {
        setCache(EVENTS_CACHE_KEY_PREFIX + runId, mergedEvents);
      }

      return incoming.length;
    } catch (error) {
      console.error('Failed to load events:', error);
      return 0;
    }
  }, []);

  const refreshRun = useCallback(async (runId: string, options?: { resetEvents?: boolean; refreshArtifacts?: boolean }) => {
    const resetEvents = options?.resetEvents ?? false;
    const refreshArtifacts = options?.refreshArtifacts ?? false;

    const nextAfterSeq = resetEvents ? 0 : lastSeqRef.current;
    const eventCount = await loadRunEventsSafely(runId, nextAfterSeq, resetEvents);
    const status = await loadRunStatusSafely(runId);
    await loadRunSummary(runId);

    if (refreshArtifacts || eventCount > 0 || isTerminalStatus(status?.status)) {
      await loadRunArtifacts(runId);
    }

    if (isTerminalStatus(status?.status) && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [loadRunArtifacts, loadRunEventsSafely, loadRunStatusSafely, loadRunSummary]);

  const loadTraceList = useCallback(async (runId: string) => {
    setTracesLoading(true);
    setTraceError(null);
    try {
      const response = await getRunTraces(runId);
      setTraceItems(response.spans || []);
      setTraceSummary(response.summary || {
        totalLlmCalls: 0,
        totalToolCalls: 0,
        totalDurationMs: 0,
        totalTokens: 0,
      });

      if (response.spans?.length) {
        setSelectedTraceId((prev) => prev && response.spans.some((item) => item.traceId === prev) ? prev : response.spans[0].traceId);
      } else {
        setSelectedTraceId(null);
        setSelectedTrace(null);
      }
    } catch (error: any) {
      setTraceError(error?.message || '加载 traces 失败');
    } finally {
      setTracesLoading(false);
    }
  }, []);

  const loadSelectedTraceDetail = useCallback(async (runId: string, traceId: string) => {
    setTraceDetailLoading(true);
    setTraceError(null);
    try {
      const detail = await getTraceDetail(runId, traceId);
      setSelectedTrace(detail);
    } catch (error: any) {
      setTraceError(error?.message || '加载 trace 详情失败');
      setSelectedTrace(null);
    } finally {
      setTraceDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const auth = loadAuth();
    if (auth) {
      setUser({
        username: auth.username,
        credit: auth.credit ?? 0,
      });
    }

    const loadModels = async () => {
      try {
        setModelsLoading(true);
        const response = await getAvailableModels();
        if (response.models.length > 0) {
          setModels(response.models);
          setSelectedModel(response.models[0]);
          if (response.models[0].validProviders?.length) {
            setSelectedProvider(response.models[0].validProviders[0]);
          }
        }
      } catch (error) {
        console.error('Failed to load models:', error);
      } finally {
        setModelsLoading(false);
      }
    };

    const loadCredits = async () => {
      try {
        const nextCredits = await getCredits();
        setCreditInfo(nextCredits);
      } catch (error) {
        console.error('Failed to load credits:', error);
      }
    };

    void loadModels();
    void loadCredits();
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events, messageHistory]);

  useEffect(() => {
    if (!urlRunId) {
      resetRunState();
      return;
    }

    setCurrentRunId(urlRunId);
    setActionError(null);
    setRailTab('artifacts');
    setTraceItems([]);
    setSelectedTrace(null);
    setSelectedTraceId(null);
    setTraceError(null);
    setShowFollowUp(false);
    setMessageHistory([]);
    setArtifacts([]);

    const cachedEvents = getCache<EventType[]>(EVENTS_CACHE_KEY_PREFIX + urlRunId);
    if (cachedEvents?.length) {
      setEvents(cachedEvents);
      const cachedLastSeq = Math.max(...cachedEvents.map((item) => item.seq));
      lastSeqRef.current = cachedLastSeq;
      setLastSeq(cachedLastSeq);
      setTurnStartSeq(getLatestTurnStartSeq(cachedEvents));
    } else {
      setEvents([]);
      setTurnStartSeq(0);
      setLastSeq(0);
      lastSeqRef.current = 0;
    }

    void refreshRun(urlRunId, { resetEvents: !cachedEvents?.length, refreshArtifacts: true });
  }, [refreshRun, resetRunState, urlRunId]);

  useEffect(() => {
    if (!currentRunId) {
      return;
    }

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(() => {
      void refreshRun(currentRunId);
    }, POLLING_INTERVAL_MS);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [currentRunId, refreshRun]);

  useEffect(() => {
    if (railTab === 'traces' && currentRunId) {
      void loadTraceList(currentRunId);
    }
  }, [currentRunId, loadTraceList, railTab]);

  useEffect(() => {
    if (railTab === 'traces' && currentRunId && selectedTraceId) {
      void loadSelectedTraceDetail(currentRunId, selectedTraceId);
    }
  }, [currentRunId, loadSelectedTraceDetail, railTab, selectedTraceId]);

  useEffect(() => {
    if (!isEditingTitle) {
      setTitleDraft(runTitle);
    }
  }, [isEditingTitle, runTitle]);

  const handleNewChat = () => {
    if (currentRunId) {
      clearEventsCache(currentRunId);
    }
    resetRunState();
    navigate('/app/chat', { replace: true });
  };

  const handleSessionClick = (sessionId: string) => {
    navigate(`/app/chat/${sessionId}`);
  };

  const handleDeleteSession = async (sessionId: string, event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (!confirm('确定要删除这个会话吗？')) {
      return;
    }

    try {
      await deleteRun(sessionId);

      setSessions((prev) => {
        const next = prev.filter((item) => item.id !== sessionId);
        setCache(SESSIONS_CACHE_KEY, next);
        return next;
      });
      clearEventsCache(sessionId);

      if (sessionId === currentRunId) {
        handleNewChat();
      }
    } catch (error: any) {
      const message = error?.message || '';
      if (message.includes('409') || message.includes('运行中')) {
        alert('该会话正在运行中，请先暂停或取消后再删除');
        return;
      }
      if (message.includes('404')) {
        alert('会话不存在或已被删除');
        void loadSessions(true);
        return;
      }
      alert(`删除失败：${message || '未知错误'}`);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isCreatingRun || !selectedModel) {
      return;
    }

    setIsCreatingRun(true);
    setActionError(null);

    try {
      const runId = await startAgentRun({
        message: input.trim(),
        config: {
          model: selectedModel.compositeId,
          provider: selectedProvider || undefined,
          searchSources: useWebSearch ? selectedSearchSources : [],
          retrievalSources: selectedRetrieval,
          codeIntensity,
          useWebSearch,
        },
      });

      setInput('');
      clearEventsCache(runId);
      navigate(`/app/chat/${runId}`, { replace: true });
      await loadSessions(true);
    } catch (error: any) {
      setActionError(error?.message || '启动分析任务失败，请稍后重试');
    } finally {
      setIsCreatingRun(false);
    }
  };

  const handleFollowUpSend = async () => {
    if (!followUpInput.trim() || isFollowUpLoading || !currentRunId) {
      return;
    }

    setIsFollowUpLoading(true);
    setActionError(null);

    try {
      const response = await sendMessage(currentRunId, followUpInput.trim());
      if (response.status !== 'accepted') {
        throw new Error(response.rejectReason || '追问请求被拒绝');
      }

      setFollowUpInput('');
      await loadMessageHistory(currentRunId);
      await refreshRun(currentRunId, { refreshArtifacts: false });
    } catch (error: any) {
      setActionError(error?.message || '发送追问失败');
    } finally {
      setIsFollowUpLoading(false);
    }
  };

  const handlePause = async () => {
    if (!currentRunId) {
      return;
    }
    setActionLoading('pause');
    setActionError(null);
    try {
      await pauseRun(currentRunId);
      await refreshRun(currentRunId, { refreshArtifacts: true });
    } catch (error: any) {
      setActionError(error?.message || '暂停失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async () => {
    if (!currentRunId) {
      return;
    }
    setActionLoading('resume');
    setActionError(null);
    try {
      await resumeRun(currentRunId);
      await refreshRun(currentRunId, { refreshArtifacts: true });
    } catch (error: any) {
      setActionError(error?.message || '恢复失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelRun = async () => {
    if (!currentRunId) {
      return;
    }
    setActionLoading('cancel');
    setActionError(null);
    try {
      await cancelRun(currentRunId);
      await refreshRun(currentRunId, { refreshArtifacts: true });
    } catch (error: any) {
      setActionError(error?.message || '取消失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTitleSave = async () => {
    if (!currentRunId || !titleDraft.trim()) {
      setIsEditingTitle(false);
      setTitleDraft(runTitle);
      return;
    }

    setIsSavingTitle(true);
    setActionError(null);
    try {
      const updatedRun = await updateRunTitle(currentRunId, titleDraft.trim());
      setCurrentRun(updatedRun);
      syncSessionEntry(updatedRun);
      setIsEditingTitle(false);
    } catch (error: any) {
      setActionError(error?.message || '重命名失败');
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleDownload = (artifactId: string) => {
    const auth = loadAuth();
    const token = auth?.token;
    if (!token) {
      return;
    }
    const url = `${API_BASE}/api/agent/artifacts/${artifactId}/download?token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
  };

  const getIntensityLabel = (value: number) => {
    if (value >= 1000) {
      return '无限制';
    }
    return `${value} Credits`;
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

  const historyBefore = (() => {
    if (!showHistory) {
      return [];
    }
    let lastUserIndex = -1;
    for (let index = messageHistory.length - 1; index >= 0; index -= 1) {
      if (messageHistory[index]?.role === 'user') {
        lastUserIndex = index;
        break;
      }
    }
    if (lastUserIndex <= 0) {
      return [];
    }
    return messageHistory.slice(0, lastUserIndex);
  })();

  const currentTurnMessages = (() => {
    if (!showHistory) {
      return [];
    }
    let lastUserIndex = -1;
    for (let index = messageHistory.length - 1; index >= 0; index -= 1) {
      if (messageHistory[index]?.role === 'user') {
        lastUserIndex = index;
        break;
      }
    }
    if (lastUserIndex < 0) {
      return [];
    }
    return messageHistory.slice(lastUserIndex);
  })();

  const displayEvents = (() => {
    if (!showHistory) {
      return events;
    }
    return events
      .filter((event) => !['RUN_RECEIVED', 'FOLLOW_UP_RECEIVED', 'WORKFLOW_COMPLETED'].includes(event.eventType))
      .filter((event) => event.seq > turnStartSeq);
  })();

  const statusUi = getStatusUi(runStatus);

  return (
    <UserLayout>
      <div className="flex h-full gap-6 overflow-hidden">
        <div className="flex w-64 flex-shrink-0 flex-col rounded-lg border border-sky-100 bg-white shadow-sm">
          <div className="border-b border-sky-50 p-4">
            <button
              onClick={handleNewChat}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
            >
              <Sparkles size={16} />
              新对话
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-ink-400">最近记录</h3>
            <div className="space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSessionClick(session.id)}
                  className={`group relative cursor-pointer rounded-lg px-3 py-3 transition-colors ${
                    currentRunId === session.id ? 'bg-sky-50 text-sky-700' : 'text-ink-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="pr-7">
                    <p className={`truncate text-sm ${currentRunId === session.id ? 'font-medium' : ''}`}>{session.title}</p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-400">
                      <span>{new Date(session.createdAt).toLocaleDateString('zh-CN')}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5">{session.status}</span>
                    </div>
                  </div>
                  <button
                    onClick={(event) => handleDeleteSession(session.id, event)}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition-all ${
                      currentRunId === session.id
                        ? 'opacity-100 text-sky-400 hover:bg-red-50 hover:text-red-600'
                        : 'opacity-0 text-ink-300 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600'
                    }`}
                    title="删除会话"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-sky-50 p-3">
            <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
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

        <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-sky-100 bg-white shadow-sm">
          {currentRunId ? (
            <div className="border-b border-sky-100 px-6 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusUi.className}`}>
                      {statusUi.label}
                    </span>
                    <span className="text-xs text-ink-400">
                      更新时间: {formatDateTime(currentStatus?.lastEventAt || currentRun?.updatedAt || currentRun?.createdAt)}
                    </span>
                  </div>

                  {isEditingTitle ? (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        value={titleDraft}
                        onChange={(event) => setTitleDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            void handleTitleSave();
                          }
                          if (event.key === 'Escape') {
                            setIsEditingTitle(false);
                            setTitleDraft(runTitle);
                          }
                        }}
                        className="w-full max-w-xl rounded-xl border border-sky-200 px-3 py-2 text-sm text-ink-900 outline-none focus:border-sky-400"
                        placeholder="输入新的会话标题"
                        autoFocus
                      />
                      <button
                        onClick={() => void handleTitleSave()}
                        disabled={isSavingTitle}
                        className="rounded-lg bg-sky-600 p-2 text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
                      >
                        {isSavingTitle ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingTitle(false);
                          setTitleDraft(runTitle);
                        }}
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingTitle(true)}
                      className="mt-3 flex max-w-xl items-center gap-2 text-left"
                    >
                      <h2 className="truncate text-2xl font-semibold text-ink-900">{runTitle}</h2>
                      <PencilLine size={16} className="text-ink-300" />
                    </button>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                    <span>Run ID: {currentRunId}</span>
                    <span>阶段: {currentStatus?.phase || '--'}</span>
                    <span>当前工具: {currentStatus?.currentTool || '--'}</span>
                    <span>累计消耗: {currentStatus?.totalCreditsConsumed ?? 0}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => void handlePause()}
                    disabled={!canPause || actionLoading === 'pause'}
                    className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === 'pause' ? <Loader2 size={16} className="animate-spin" /> : <Pause size={16} />}
                    暂停
                  </button>
                  <button
                    onClick={() => void handleResume()}
                    disabled={!canResume || actionLoading === 'resume'}
                    className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === 'resume' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                    恢复
                  </button>
                  <button
                    onClick={() => void handleCancelRun()}
                    disabled={!canCancel || actionLoading === 'cancel'}
                    className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === 'cancel' ? <Loader2 size={16} className="animate-spin" /> : <Square size={16} />}
                    取消
                  </button>
                </div>
              </div>

              {actionError && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {actionError}
                </div>
              )}
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto bg-slate-50/30 p-6 pb-20">
              {!currentRunId && !showHistory && events.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center space-y-8">
                  <div className="space-y-4 text-center">
                    <h2 className="text-3xl font-bold text-ink-900">有什么可以帮您的？</h2>
                    <p className="text-ink-500">我可以帮您分析金融数据、查询市场信息</p>
                  </div>
                  <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      '计算沪深300近一年的波动率',
                      '分析中证500的市盈率分布',
                      '筛选ROE大于15%的消费股',
                      '查询最近一周的热门板块',
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => setInput(prompt)}
                        className="rounded-xl border border-sky-100 bg-white p-4 text-left text-sm text-ink-600 transition-all hover:border-sky-300 hover:bg-sky-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {!showHistory && <EventList events={events} />}

                  {showHistory && (
                    <>
                      {historyBefore.length > 0 && (
                        <div className="mt-6 space-y-4 border-t border-sky-100 pt-6">
                          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-ink-400">
                            <Sparkles size={12} />
                            对话历史
                          </div>
                          {historyBefore.map((message) => (
                            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                message.role === 'user'
                                  ? 'rounded-br-md bg-sky-600 text-white'
                                  : 'rounded-bl-md border border-sky-100 bg-white text-ink-700'
                              }`}>
                                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                                <div className={`mt-1 text-[10px] ${message.role === 'user' ? 'text-sky-200' : 'text-ink-400'}`}>
                                  {message.msgType === 'follow_up' && '追问'}
                                  {message.msgType === 'initial' && '初始问题'}
                                  {message.msgType === 'summary' && '总结'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {currentTurnMessages.length > 0 && (
                        <div className="mt-6 space-y-4 border-t border-sky-100 pt-6">
                          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-ink-400">
                            <Sparkles size={12} />
                            本轮对话
                          </div>

                          <div className={`flex ${currentTurnMessages[0].role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className="max-w-[80%] rounded-2xl rounded-br-md bg-sky-600 px-4 py-3 text-white">
                              <div className="whitespace-pre-wrap text-sm">{currentTurnMessages[0].content}</div>
                              <div className="mt-1 text-[10px] text-sky-200">
                                {currentTurnMessages[0].msgType === 'follow_up' ? '追问' : '初始问题'}
                              </div>
                            </div>
                          </div>

                          {displayEvents.length > 0 && (
                            <div className="mt-4 space-y-4">
                              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-ink-400">
                                <Terminal size={12} />
                                执行过程
                              </div>
                              <EventList events={displayEvents} />
                            </div>
                          )}

                          {currentTurnMessages.slice(1).map((message) => (
                            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                message.role === 'user'
                                  ? 'rounded-br-md bg-sky-600 text-white'
                                  : 'rounded-bl-md border border-sky-100 bg-white text-ink-700'
                              }`}>
                                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                                <div className={`mt-1 text-[10px] ${message.role === 'user' ? 'text-sky-200' : 'text-ink-400'}`}>
                                  {message.msgType === 'follow_up' && '追问'}
                                  {message.msgType === 'initial' && '初始问题'}
                                  {message.msgType === 'summary' && '总结'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {currentRunId && !isTerminalStatus(runStatus) && (
                    <div className="mt-4 flex items-center gap-2 py-2 text-xs text-ink-400">
                      <Loader2 size={14} className="animate-spin" />
                      <span>处理中...</span>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-sky-100 bg-white p-4">
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setModelDropdownOpen((prev) => !prev)}
                      disabled={modelsLoading}
                      className="flex items-center gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-100 disabled:opacity-50"
                    >
                      <Bot size={14} />
                      {modelsLoading ? '加载中...' : selectedModel?.displayName || '选择模型'}
                      <ChevronDown size={12} />
                    </button>

                    {modelDropdownOpen && (
                      <div className="absolute bottom-full left-0 z-30 mb-2 w-56 rounded-lg border border-sky-100 bg-white py-1 shadow-lg">
                        {models.map((model) => (
                          <button
                            key={model.compositeId}
                            onClick={() => {
                              setSelectedModel(model);
                              setModelDropdownOpen(false);
                              if (model.validProviders?.length) {
                                setSelectedProvider(model.validProviders[0]);
                              } else {
                                setSelectedProvider('');
                              }
                            }}
                            className={`w-full px-4 py-2 text-left text-xs hover:bg-sky-50 ${
                              selectedModel?.compositeId === model.compositeId ? 'bg-sky-50 font-medium text-sky-700' : 'text-ink-700'
                            }`}
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

                  {selectedModel?.validProviders?.length ? (
                    <div className="relative">
                      <button
                        onClick={() => setProviderDropdownOpen((prev) => !prev)}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
                      >
                        <span className="text-[10px] text-amber-600">Provider:</span>
                        {selectedProvider}
                        <ChevronDown size={10} />
                      </button>

                      {providerDropdownOpen && (
                        <div className="absolute bottom-full left-0 z-30 mb-2 w-40 rounded-lg border border-amber-100 bg-white py-1 shadow-lg">
                          {selectedModel.validProviders.map((provider) => (
                            <button
                              key={provider}
                              onClick={() => {
                                setSelectedProvider(provider);
                                setProviderDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-xs hover:bg-amber-50 ${
                                selectedProvider === provider ? 'bg-amber-50 font-medium text-amber-700' : 'text-ink-700'
                              }`}
                            >
                              {provider}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button
                      onClick={() => setWebSearchDropdownOpen((prev) => !prev)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                        useWebSearch ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-transparent bg-white text-ink-400 hover:bg-gray-50'
                      }`}
                    >
                      <Globe size={12} />
                      {useWebSearch
                        ? (selectedSearchSources.length === 1
                          ? searchSources.find((item) => item.id === selectedSearchSources[0])?.name
                          : `已选 ${selectedSearchSources.length} 个市场`)
                        : '联网搜索'}
                      {useWebSearch ? <ChevronDown size={10} /> : null}
                    </button>

                    {webSearchDropdownOpen && (
                      <div className="absolute bottom-full right-0 z-30 mb-2 w-56 rounded-lg border border-sky-100 bg-white py-1 shadow-lg">
                        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-400">选择市场区域（可多选）</div>
                        <button
                          onClick={() => {
                            setUseWebSearch((prev) => !prev);
                            if (!useWebSearch) {
                              setSelectedSearchSources(['ah_market']);
                            }
                            setWebSearchDropdownOpen(false);
                          }}
                          className="w-full border-b border-gray-50 px-4 py-2 text-left text-xs text-ink-700 hover:bg-gray-50"
                        >
                          {useWebSearch ? '关闭搜索' : '开启搜索'}
                        </button>
                        {useWebSearch && searchSources.map((source) => {
                          const selected = selectedSearchSources.includes(source.id);
                          return (
                            <button
                              key={source.id}
                              onClick={() => {
                                if (selected) {
                                  if (selectedSearchSources.length > 1) {
                                    setSelectedSearchSources((prev) => prev.filter((item) => item !== source.id));
                                  }
                                } else {
                                  setSelectedSearchSources((prev) => [...prev, source.id]);
                                }
                              }}
                              className={`flex w-full items-start gap-2 px-4 py-2 text-left hover:bg-sky-50 ${selected ? 'bg-sky-50/50' : ''}`}
                            >
                              <div className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                                selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                              }`}>
                                {selected ? <Search size={9} className="text-white" /> : null}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className={`text-xs font-medium ${selected ? 'text-blue-700' : 'text-ink-700'}`}>{source.name}</div>
                                <div className="truncate text-[10px] text-ink-400">{source.desc}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setCodeIntensityOpen((prev) => !prev)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                        codeIntensity > 10 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-transparent bg-white text-ink-400 hover:bg-gray-50'
                      }`}
                    >
                      <Terminal size={12} />
                      编程计算: {getIntensityLabel(codeIntensity)}
                    </button>

                    {codeIntensityOpen && (
                      <div className="absolute bottom-full right-0 z-30 mb-2 w-72 rounded-lg border border-sky-100 bg-white p-4 shadow-lg">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold text-ink-700">计算强度上限</span>
                          <span className="text-xs font-mono text-amber-600">{getIntensityLabel(codeIntensity)}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={sliderValue}
                          onChange={(event) => handleSliderChange(Number(event.target.value))}
                          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-amber-500"
                        />
                        <div className="mt-1 flex justify-between text-[10px] text-ink-400">
                          <span>10</span>
                          <span>500</span>
                          <span className="font-medium text-amber-600">无限制</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setRetrievalOpen((prev) => !prev)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                        selectedRetrieval.length > 0 ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-transparent bg-white text-ink-400 hover:bg-gray-50'
                      }`}
                    >
                      <Sparkles size={12} />
                      智能检索
                      {selectedRetrieval.length > 0 ? (
                        <span className="ml-1 rounded-full bg-violet-200 px-1.5 text-[9px]">{selectedRetrieval.length}</span>
                      ) : null}
                    </button>

                    {retrievalOpen && (
                      <div className="absolute bottom-full right-0 z-30 mb-2 w-56 rounded-lg border border-sky-100 bg-white py-1 shadow-lg">
                        <div className="flex justify-between px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                          <span>检索范围</span>
                          <span>消耗</span>
                        </div>
                        {retrievalSources.map((source) => {
                          const selected = selectedRetrieval.includes(source.id);
                          return (
                            <button
                              key={source.id}
                              onClick={() => {
                                if (selected) {
                                  setSelectedRetrieval((prev) => prev.filter((item) => item !== source.id));
                                } else {
                                  setSelectedRetrieval((prev) => [...prev, source.id]);
                                }
                              }}
                              className={`flex w-full items-center justify-between px-4 py-2 text-xs hover:bg-violet-50 ${
                                selected ? 'bg-violet-50/50 text-violet-700' : 'text-ink-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`flex h-3 w-3 items-center justify-center rounded border ${
                                  selected ? 'border-violet-500 bg-violet-500' : 'border-gray-300'
                                }`}>
                                  {selected ? <Search size={8} className="text-white" /> : null}
                                </div>
                                {source.name}
                              </div>
                              <span className="font-mono text-[10px] text-ink-400">-{source.cost}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {currentRunId && isRunSucceeded && showFollowUp ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <Sparkles size={14} className="text-violet-500" />
                    <span className="text-xs font-medium text-violet-700">可以继续追问</span>
                  </div>
                  <div className="relative flex items-center rounded-lg border border-violet-200 bg-white shadow-sm transition-all focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
                    <input
                      type="text"
                      value={followUpInput}
                      onChange={(event) => setFollowUpInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          void handleFollowUpSend();
                        }
                      }}
                      placeholder="继续追问..."
                      className="flex-1 bg-transparent px-4 py-3 text-sm text-ink-900 outline-none placeholder:text-ink-400"
                      disabled={isFollowUpLoading}
                    />
                    <button
                      onClick={() => void handleFollowUpSend()}
                      className="m-1 rounded-lg bg-violet-600 p-2 text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
                      disabled={!followUpInput.trim() || isFollowUpLoading}
                    >
                      {isFollowUpLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-ink-400">基于当前对话继续提问</div>
                    <button onClick={handleNewChat} className="text-[10px] font-medium text-sky-600 hover:text-sky-700">
                      开启新对话 →
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative flex items-center rounded-lg border border-sky-200 bg-white shadow-sm transition-all focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100">
                    <button className="p-3 text-ink-400 hover:text-sky-600">
                      <Paperclip size={20} />
                    </button>
                    <input
                      type="text"
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          void handleSend();
                        }
                      }}
                      placeholder="让 AlphaFrog 帮您分析市场..."
                      className="flex-1 bg-transparent py-3 text-sm text-ink-900 outline-none placeholder:text-ink-400"
                      disabled={isCreatingRun}
                    />
                    <button
                      onClick={() => void handleSend()}
                      className="m-1 rounded-lg bg-sky-600 p-2 text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
                      disabled={!input.trim() || isCreatingRun}
                    >
                      {isCreatingRun ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  </div>
                  <div className="mt-2 text-center text-[10px] text-ink-400">
                    AlphaFrog 可能生成错误信息。请核实重要财务数据。
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex w-80 flex-shrink-0 flex-col rounded-lg border border-sky-100 bg-white shadow-sm">
          <div className="border-b border-sky-50 p-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setRailTab('artifacts')}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  railTab === 'artifacts' ? 'bg-sky-50 text-sky-700' : 'text-ink-500 hover:bg-slate-50'
                }`}
              >
                产物
              </button>
              <button
                onClick={() => setRailTab('traces')}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  railTab === 'traces' ? 'bg-sky-50 text-sky-700' : 'text-ink-500 hover:bg-slate-50'
                }`}
              >
                Traces
              </button>
            </div>
          </div>

          {!currentRunId ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-ink-400">
              选择一个会话后，这里会展示生成产物与调用链路。
            </div>
          ) : railTab === 'artifacts' ? (
            <>
              <div className="border-b border-sky-50 px-4 py-3">
                <h3 className="text-sm font-semibold text-ink-900">生成产物</h3>
                <p className="mt-1 text-xs text-ink-400">当前 run 可下载文件与中间产物</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {artifacts.length === 0 ? (
                  <div className="py-8 text-center text-sm text-ink-400">暂无产物</div>
                ) : (
                  artifacts.map((artifact) => (
                    <div key={artifact.artifactId} className="rounded-lg border border-sky-50 bg-sky-50/50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-sky-600" />
                          <div>
                            <p className="max-w-[170px] truncate text-sm font-medium text-ink-900">{artifact.name}</p>
                            <p className="text-xs text-ink-400">{artifact.type}</p>
                          </div>
                        </div>
                        <button onClick={() => handleDownload(artifact.artifactId)} className="text-ink-400 hover:text-sky-600">
                          <Download size={16} />
                        </button>
                      </div>
                      <div className="mt-3 text-[11px] text-ink-400">
                        创建时间: {formatDateTime(artifact.createdAt)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="border-b border-sky-50 px-4 py-3">
                <h3 className="text-sm font-semibold text-ink-900">Traces 观测面板</h3>
                <p className="mt-1 text-xs text-ink-400">查看 LLM 与工具调用链路、耗时与 token</p>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b border-sky-50 p-4">
                <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-sky-700">
                    <BrainCircuit size={12} />
                    LLM Calls
                  </div>
                  <div className="mt-1 text-lg font-semibold text-ink-900">{traceSummary.totalLlmCalls}</div>
                </div>
                <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-sky-700">
                    <Wrench size={12} />
                    Tool Calls
                  </div>
                  <div className="mt-1 text-lg font-semibold text-ink-900">{traceSummary.totalToolCalls}</div>
                </div>
                <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-sky-700">
                    <Terminal size={12} />
                    Total Tokens
                  </div>
                  <div className="mt-1 text-lg font-semibold text-ink-900">{traceSummary.totalTokens}</div>
                </div>
                <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-sky-700">
                    <Sparkles size={12} />
                    Duration
                  </div>
                  <div className="mt-1 text-lg font-semibold text-ink-900">{formatDuration(traceSummary.totalDurationMs)}</div>
                </div>
              </div>

              {traceError ? (
                <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {traceError}
                </div>
              ) : null}

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 overflow-y-auto border-b border-sky-50 p-4">
                  {tracesLoading ? (
                    <div className="flex items-center justify-center py-10 text-sm text-ink-400">
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      正在加载 traces...
                    </div>
                  ) : traceItems.length === 0 ? (
                    <div className="py-8 text-center text-sm text-ink-400">暂无可用 traces</div>
                  ) : (
                    <div className="space-y-2">
                      {traceItems.map((trace) => (
                        <button
                          key={trace.traceId}
                          onClick={() => setSelectedTraceId(trace.traceId)}
                          className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                            selectedTraceId === trace.traceId
                              ? 'border-sky-200 bg-sky-50'
                              : 'border-slate-100 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-ink-900">
                              {trace.type === 'llm' ? <BrainCircuit size={14} className="text-sky-600" /> : <Wrench size={14} className="text-violet-600" />}
                              <span>{trace.phase || trace.type.toUpperCase()}</span>
                            </div>
                            <span className="text-[11px] text-ink-400">{formatDuration(trace.durationMs)}</span>
                          </div>
                          <div className="mt-1 text-xs text-ink-500">{getTraceSubtitle(trace)}</div>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-ink-400">
                            <span>{formatDateTime(trace.time)}</span>
                            {trace.hasError ? <span className="text-red-600">error</span> : null}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="min-h-[220px] overflow-y-auto p-4">
                  {traceDetailLoading ? (
                    <div className="flex items-center justify-center py-10 text-sm text-ink-400">
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      正在加载详情...
                    </div>
                  ) : !selectedTrace ? (
                    <div className="py-8 text-center text-sm text-ink-400">选择一条 trace 查看详情</div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-ink-900">Trace 详情</h4>
                        <div className="mt-1 text-xs text-ink-400">{selectedTrace.traceId}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <div className="text-ink-400">类型</div>
                          <div className="mt-1 font-medium text-ink-900">{selectedTrace.type}</div>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <div className="text-ink-400">耗时</div>
                          <div className="mt-1 font-medium text-ink-900">{formatDuration(selectedTrace.durationMs)}</div>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <div className="text-ink-400">阶段</div>
                          <div className="mt-1 font-medium text-ink-900">{selectedTrace.phase || '--'}</div>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <div className="text-ink-400">时间</div>
                          <div className="mt-1 font-medium text-ink-900">{formatDateTime(selectedTrace.time)}</div>
                        </div>
                      </div>

                      {selectedTrace.type === 'llm' ? (
                        <>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                              <div className="text-ink-400">模型</div>
                              <div className="mt-1 font-medium text-ink-900">{selectedTrace.model || '--'}</div>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                              <div className="text-ink-400">Endpoint</div>
                              <div className="mt-1 font-medium text-ink-900">{selectedTrace.endpoint || '--'}</div>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                              <div className="text-ink-400">Input Tokens</div>
                              <div className="mt-1 font-medium text-ink-900">{selectedTrace.inputTokens ?? '--'}</div>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                              <div className="text-ink-400">Output Tokens</div>
                              <div className="mt-1 font-medium text-ink-900">{selectedTrace.outputTokens ?? '--'}</div>
                            </div>
                          </div>

                          {selectedTrace.reasoningText ? (
                            <div>
                              <div className="mb-1 text-xs font-medium text-ink-600">Reasoning</div>
                              <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-ink-700">{selectedTrace.reasoningText}</pre>
                            </div>
                          ) : null}

                          {selectedTrace.outputText ? (
                            <div>
                              <div className="mb-1 text-xs font-medium text-ink-600">Output</div>
                              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-ink-700">{selectedTrace.outputText}</pre>
                            </div>
                          ) : null}

                          {selectedTrace.inputMessages ? (
                            <div>
                              <div className="mb-1 text-xs font-medium text-ink-600">Input Messages</div>
                              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-ink-700">{stringifyBlock(selectedTrace.inputMessages)}</pre>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                              <div className="text-ink-400">工具</div>
                              <div className="mt-1 font-medium text-ink-900">{selectedTrace.toolName || '--'}</div>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                              <div className="text-ink-400">缓存</div>
                              <div className="mt-1 font-medium text-ink-900">{selectedTrace.cacheHit ? '命中' : '未命中'}</div>
                            </div>
                          </div>

                          {selectedTrace.params ? (
                            <div>
                              <div className="mb-1 text-xs font-medium text-ink-600">Params</div>
                              <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-ink-700">{stringifyBlock(selectedTrace.params)}</pre>
                            </div>
                          ) : null}

                          {selectedTrace.output ? (
                            <div>
                              <div className="mb-1 text-xs font-medium text-ink-600">Output</div>
                              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-ink-700">{selectedTrace.output}</pre>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default UserChat;
