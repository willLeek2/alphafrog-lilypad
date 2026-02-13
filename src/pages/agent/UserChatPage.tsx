import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { startAgentRun, listRuns, getRunArtifacts, getRun, AgentRun, Artifact } from '../../api/agent';
import { useAgentPolling, useRunData } from '../../hooks/useAgentPolling';
import { SessionList } from '../../components/chat/SessionList';
import { ChatArea } from '../../components/chat/ChatArea';
import { ArtifactsPanel } from '../../components/chat/ArtifactsPanel';
import { parseEventsToMessages, ChatMessage } from '../../utils/agent';
import { loadAuth } from '../../utils/storage';

// Configuration Mocks (Same as DemoChat)
const AVAILABLE_MODELS = [
  { id: 'accounts/fireworks/models/kimi-k2p5', name: 'Kimi K2.5 (Fireworks)', compositeId: 'accounts/fireworks/models/kimi-k2p5@fireworks' },
  { id: 'openai/gpt-5.2', name: 'GPT-5.2 (OpenRouter)', compositeId: 'openai/gpt-5.2@openrouter' },
  { id: 'openai/gpt-5.1', name: 'GPT-5.1 (OpenRouter)', compositeId: 'openai/gpt-5.1@openrouter' },
];

const SEARCH_SOURCES = [
  { id: 'ah_market', name: 'AH市场', desc: 'A股及港股相关资讯' },
  { id: 'us_market', name: '美国市场', desc: '美股及美股中概相关资讯' },
  { id: 'apac_market', name: '亚太市场', desc: '日韩东南亚等市场资讯' },
  { id: 'eu_market', name: '欧洲市场', desc: '欧洲主要市场资讯' },
];

const RETRIEVAL_SOURCES = [
  { id: 'news', name: '新闻资讯', cost: 2 },
  { id: 'announcement', name: '公告信息', cost: 5 },
  { id: 'report', name: '券商研报', cost: 10 },
];

const UserChatPage = () => {
  const navigate = useNavigate();
  const { runId: urlRunId } = useParams();
  
  // State: Sessions
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionLoading, setSessionLoading] = useState(true);
  
  // State: Current Run
  const [currentRunId, setCurrentRunId] = useState<string | null>(urlRunId || null);
  const [currentRun, setCurrentRun] = useState<AgentRun | null>(null);
  
  // State: Inputs & Controls
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0]);
  const [useWebSearch, setUseWebSearch] = useState(true);
  const [selectedSearchSources, setSelectedSearchSources] = useState<string[]>(['ah_market']);
  const [codeIntensity, setCodeIntensity] = useState(500);
  const [selectedRetrieval, setSelectedRetrieval] = useState<string[]>(['news']);
  
  // State: Artifacts
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [showArtifacts, setShowArtifacts] = useState(true);

  // User Profile for Credits
  const auth = loadAuth();
  const credits = auth?.credit || 0;

  // Hooks
  const { isLoading: isPolling } = useAgentPolling(currentRunId);
  const { events, status } = useRunData(currentRunId);

  // Derived State
  const eventMessages = useMemo(() => parseEventsToMessages(events), [events]);
  const isAgentThinking = status?.status === 'PLANNING' || status?.status === 'EXECUTING' || status?.status === 'EXECUTING_TOOL';

  // Combine initial message with event messages
  const messages: ChatMessage[] = useMemo(() => {
    const list: ChatMessage[] = [];
    if (currentRun && currentRun.message) {
      list.push({
        id: 'initial-' + currentRun.runId,
        role: 'user',
        content: currentRun.message,
        timestamp: new Date(currentRun.createdAt),
      });
    }
    return [...list, ...eventMessages];
  }, [currentRun, eventMessages]);

  // 1. Load Sessions on Mount
  useEffect(() => {
    fetchSessions();
  }, []);

  // 2. Sync URL with State
  useEffect(() => {
    if (urlRunId && urlRunId !== currentRunId) {
      setCurrentRunId(urlRunId);
    }
  }, [urlRunId]);

  // 3. Fetch Run Details & Artifacts
  useEffect(() => {
    if (currentRunId) {
      fetchRunDetails(currentRunId);
      fetchArtifacts(currentRunId);
    } else {
      setCurrentRun(null);
      setArtifacts([]);
    }
  }, [currentRunId]);

  // Re-fetch artifacts when status changes (e.g. completion)
  useEffect(() => {
    if (currentRunId && status?.status === 'COMPLETED') {
       fetchArtifacts(currentRunId);
    }
  }, [status?.status]);

  const fetchSessions = async () => {
    setSessionLoading(true);
    try {
      const res = await listRuns(0, 50);
      setSessions(res.content.map((run: AgentRun) => ({
        id: run.runId,
        title: run.message || '新对话',
        createdAt: run.createdAt,
        active: run.runId === currentRunId
      })));
    } catch (err) {
      console.error("加载会话失败", err);
    } finally {
      setSessionLoading(false);
    }
  };

  const fetchRunDetails = async (id: string) => {
    try {
      const run = await getRun(id);
      setCurrentRun(run);
    } catch (err) {
      console.error("加载会话详情失败", err);
    }
  };

  const fetchArtifacts = async (id: string) => {
    try {
      const items = await getRunArtifacts(id);
      setArtifacts(items);
      if (items.length > 0) setShowArtifacts(true);
    } catch (err) {
      console.error("加载产物失败", err);
    }
  };

  const handleNewSession = () => {
    setCurrentRunId(null);
    setCurrentRun(null);
    navigate('/app/chat');
  };

  const handleSelectSession = (id: string) => {
    setCurrentRunId(id);
    navigate(`/app/chat/${id}`);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    // Create Config Payload
    const config = {
      model: selectedModel.compositeId,
      searchSources: selectedSearchSources,
      retrievalSources: selectedRetrieval,
      codeIntensity: codeIntensity,
      useWebSearch: useWebSearch
    };

    try {
      const newRunId = await startAgentRun({ 
        message: input,
        config
      });
      
      setInput('');
      setCurrentRunId(newRunId);
      navigate(`/app/chat/${newRunId}`);
      
      // Refresh sessions to show the new one
      setTimeout(fetchSessions, 1000);
      
    } catch (err) {
      alert("启动 Agent 失败: " + (err as Error).message);
    }
  };

  const handleDownloadArtifact = (artifact: Artifact) => {
    window.open(`/api/agent/runs/${currentRunId}/artifacts/${artifact.id}/download`, '_blank');
  };

  return (
    <div className="flex h-[calc(100vh-64px)] gap-6 overflow-hidden p-6 bg-slate-50">
      
      {/* Left: Sessions */}
      <SessionList 
        sessions={sessions.map(s => ({ ...s, active: s.id === currentRunId }))}
        credits={credits}
        onNewSession={handleNewSession}
        onSelectSession={handleSelectSession}
        isLoading={sessionLoading}
      />

      {/* Middle: Chat */}
      <ChatArea 
        messages={messages}
        input={input}
        setInput={setInput}
        onSend={handleSend}
        isLoading={isPolling && isAgentThinking} 
        
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        availableModels={AVAILABLE_MODELS}
        
        useWebSearch={useWebSearch}
        setUseWebSearch={setUseWebSearch}
        selectedSearchSources={selectedSearchSources}
        setSelectedSearchSources={setSelectedSearchSources}
        availableSearchSources={SEARCH_SOURCES}
        
        codeIntensity={codeIntensity}
        setCodeIntensity={setCodeIntensity}
        
        selectedRetrieval={selectedRetrieval}
        setSelectedRetrieval={setSelectedRetrieval}
        availableRetrievalSources={RETRIEVAL_SOURCES}
      />

      {/* Right: Artifacts */}
      {showArtifacts && (
        <ArtifactsPanel 
          artifacts={artifacts}
          onClose={() => setShowArtifacts(false)}
          onDownload={handleDownloadArtifact}
        />
      )}
    </div>
  );
};

export default UserChatPage;
