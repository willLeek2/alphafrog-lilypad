import { getApiBaseUrl } from '../utils/api';
import { loadAuth } from '../utils/storage';

const API_BASE = getApiBaseUrl();

// Types
export interface AgentRunEvent {
  id: number;
  runId: string;
  seq: number;
  eventType: string;
  payloadJson: string;
  createdAt: string;
}

export interface AgentRunStatus {
  id: string;
  status: string;
  phase: string;
  currentTool?: string;
  lastEventType: string;
  lastEventAt: string;
  lastEventPayload?: unknown;
  plan?: unknown;
  progress?: unknown;
  observability?: unknown;
  totalCreditsConsumed?: number;
}

export interface EventsResponse {
  items: AgentRunEvent[];
  total: number;
  hasMore: boolean;
  nextAfterSeq: number;
}

// Response wrapper from backend
interface ApiResponse<T> {
  code: number | string;
  data: T;
  message?: string;
}

// Helper function for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const auth = loadAuth();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  
  if (auth?.token) {
    headers['Authorization'] = `Bearer ${auth.token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP ${response.status}`);
  }

  // Handle empty response
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    const result: ApiResponse<T> = await response.json();
    // Backend wraps response in { code, data } format
    if (result.code !== undefined && result.data !== undefined) {
      // Backend returns code as string "200" or number 200
    const codeStr = String(result.code);
    if (codeStr !== '200' && codeStr !== '0') {
        throw new Error(result.message || `API Error: ${result.code}`);
      }
      return result.data;
    }
    return result as T;
  }
  return response.text() as Promise<T>;
}

export interface AgentRunResponse {
  id: string;
  status: string;
  currentStep: number;
  maxSteps: number;
}

// Start a new agent run
export async function startAgentRun(params: { 
  message: string;
  config?: {
    model?: string;
    provider?: string;
    searchSources?: string[];
    retrievalSources?: string[];
    codeIntensity?: number;
    useWebSearch?: boolean;
  }
}): Promise<string> {
  // Transform config to match backend API format
  const requestBody: Record<string, unknown> = {
    message: params.message,
  };
  
  if (params.config) {
    requestBody.config = params.config;
    // If provider is specified, add it at top level for backend compatibility
    if (params.config.provider) {
      requestBody.provider = params.config.provider;
    }
  }
  
  const response = await apiCall<AgentRunResponse>('/api/agent/runs', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });
  return response.id;
}

export interface AgentRun {
  id: string;
  userId?: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  message?: string; // Initial message
  completedAt?: string;
  durationMs?: number;
  totalTokens?: number;
  hasArtifacts?: boolean;
  toolCalls?: number;
}

export interface Artifact {
  artifactId: string;
  type: string;
  name: string;
  contentType: string;
  url?: string;
  metaJson?: string;
  createdAt: string;
  expiresAtMillis?: number;
}

export interface AgentRunListResponse {
  items: AgentRun[];
  total: number;
  hasMore: boolean;
}

// List runs
// Using max parameter for limiting results (backend priority: limit > max > size)
export async function listRuns(page: number = 0, max: number = 20): Promise<AgentRunListResponse> {
  return apiCall<AgentRunListResponse>(
    `/api/agent/runs?page=${page}&max=${max}`
  );
}

// Get run artifacts
export async function getRunArtifacts(runId: string): Promise<Artifact[]> {
  return apiCall<Artifact[]>(`/api/agent/runs/${runId}/artifacts`);
}

// Get run details
export async function getRun(runId: string): Promise<AgentRun> {
  return apiCall<AgentRun>(`/api/agent/runs/${runId}`);
}

export async function updateRunTitle(runId: string, title: string): Promise<AgentRun> {
  return apiCall<AgentRun>(`/api/agent/runs/${runId}`, {
    method: 'PUT',
    body: JSON.stringify({ title }),
  });
}

// Get run events
export async function getRunEvents(
  runId: string,
  afterSeq: number = 0,
  limit: number = 50
): Promise<EventsResponse> {
  return apiCall<EventsResponse>(
    `/api/agent/runs/${runId}/events?after_seq=${afterSeq}&limit=${limit}`
  );
}

// Get run status
export async function getRunStatus(runId: string): Promise<AgentRunStatus> {
  return apiCall<AgentRunStatus>(`/api/agent/runs/${runId}/status`);
}

// Get run result
export async function getRunResult(runId: string): Promise<unknown> {
  return apiCall<unknown>(`/api/agent/runs/${runId}/result`);
}

export interface TraceSpanItem {
  seq: number;
  type: 'llm' | 'tool' | string;
  traceId: string;
  time?: string;
  phase?: string;
  todoId?: string | null;
  durationMs?: number | null;
  model?: string;
  toolName?: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  hasError?: boolean;
  hasInputMessages?: boolean;
  hasReasoning?: boolean;
  success?: boolean;
  cacheHit?: boolean;
  decisionLlmTraceId?: string | null;
  outputSummary?: string;
}

export interface TraceListSummary {
  totalLlmCalls: number;
  totalToolCalls: number;
  totalDurationMs: number;
  totalTokens: number;
}

export interface TraceListResponse {
  spans: TraceSpanItem[];
  summary: TraceListSummary;
}

export interface TraceDetail {
  type: 'llm' | 'tool' | string;
  traceId: string;
  phase?: string;
  todoId?: string | null;
  todoSequence?: number | null;
  time?: string;
  durationMs?: number | null;
  model?: string;
  endpoint?: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  cachedTokens?: number | null;
  actualCost?: number | null;
  inputMessages?: unknown;
  outputText?: string;
  reasoningText?: string;
  hasError?: boolean;
  error?: string | null;
  toolName?: string;
  params?: Record<string, unknown> | null;
  output?: string;
  success?: boolean;
  cacheHit?: boolean;
  cacheKey?: string | null;
  decisionLlmTraceId?: string | null;
  decisionExcerpt?: string | null;
}

export async function getRunTraces(runId: string): Promise<TraceListResponse> {
  return apiCall<TraceListResponse>(`/api/agent/runs/${runId}/traces`);
}

export async function getTraceDetail(runId: string, traceId: string): Promise<TraceDetail> {
  return apiCall<TraceDetail>(`/api/agent/runs/${runId}/traces/${traceId}`);
}

// Cancel run
export async function cancelRun(runId: string): Promise<void> {
  await apiCall(`/api/agent/runs/${runId}:cancel`, { method: 'POST' });
}

// Pause run
export async function pauseRun(runId: string): Promise<void> {
  await apiCall(`/api/agent/runs/${runId}:pause`, { method: 'POST' });
}

// Resume run
export async function resumeRun(runId: string, planOverrideJson?: string): Promise<void> {
  await apiCall(`/api/agent/runs/${runId}:resume`, {
    method: 'POST',
    body: planOverrideJson ? JSON.stringify({ planOverrideJson }) : undefined,
  });
}

// Delete run
// 错误码：401（未登录）、404（不存在）、409（运行中）
export async function deleteRun(runId: string): Promise<void> {
  await apiCall(`/api/agent/runs/${runId}`, {
    method: 'DELETE',
  });
}

// ============ Model APIs ============

export interface ModelInfo {
  id: string;
  displayName: string;
  endpoint: string;
  compositeId: string;
  baseRate: number;
  features?: string[];
  validProviders?: string[];  // For OpenRouter provider routing
}

export interface ModelListResponse {
  models: ModelInfo[];
}

// Get available models
export async function getAvailableModels(): Promise<ModelListResponse> {
  return apiCall<ModelListResponse>('/api/agent/models');
}

// ============ Credit APIs ============

export interface CreditInfo {
  totalCredits: number;
  remainingCredits: number;
  usedCredits: number;
  resetCycle: string;
  nextResetAt: string;
}

// Get user credit info
export async function getCredits(): Promise<CreditInfo> {
  return apiCall<CreditInfo>('/api/agent/credits');
}

// Apply for credits
export async function applyForCredits(params: {
  amount: number;
  reason?: string;
  contact?: string;
}): Promise<void> {
  await apiCall('/api/agent/credits/apply', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ============ Multi-turn Conversation APIs ============

export interface AgentRunMessageItem {
  id: number;
  seq: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  msgType: 'initial' | 'follow_up' | 'summary';
  metaJson?: string;
  createdAt: string;
}

export interface AgentMessageListResponse {
  items: AgentRunMessageItem[];
  total: number;
  hasMore: boolean;
}

export interface AgentMessageSendResponse {
  messageId: number;
  seq: number;
  status: 'accepted' | 'rejected';
  runStatus?: string;
  rejectReason?: string;
}

// Get run message history
export async function listMessages(
  runId: string, 
  limit: number = 50, 
  offset: number = 0, 
  includeInitial: boolean = true
): Promise<AgentMessageListResponse> {
  return apiCall<AgentMessageListResponse>(
    `/api/agent/runs/${runId}/messages?limit=${limit}&offset=${offset}&include_initial=${includeInitial}`
  );
}

// Send follow-up message
export async function sendMessage(
  runId: string, 
  content: string
): Promise<AgentMessageSendResponse> {
  return apiCall<AgentMessageSendResponse>(`/api/agent/runs/${runId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}
