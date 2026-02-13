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
  phase: 'PLANNING' | 'EXECUTING' | 'EXECUTING_TOOL' | 'SUMMARIZING' | 'PAUSED' | 'COMPLETED';
  currentTool?: string;
  lastEventType: string;
  lastEventAt: string;
  lastEventPayloadJson: string;
  planJson: string;
  progressJson: string;
}

export interface EventsResponse {
  items: AgentRunEvent[];
  total: number;
  hasMore: boolean;
  nextAfterSeq: number;
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
    return response.json();
  }
  return response.text() as Promise<T>;
}

// Start a new agent run
export async function startAgentRun(params: { 
  message: string;
  config?: {
    model?: string;
    searchSources?: string[];
    retrievalSources?: string[];
    codeIntensity?: number;
    useWebSearch?: boolean;
  }
}): Promise<string> {
  const response = await apiCall<{ runId: string }>('/api/agent/runs', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return response.runId;
}

export interface AgentRun {
  runId: string;
  userId: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  message?: string; // Initial message
}

export interface Artifact {
  id: string;
  runId: string;
  name: string;
  type: string;
  path: string;
  size?: number;
  createdAt: string;
}

// List runs
export async function listRuns(page: number = 0, size: number = 20): Promise<{ content: AgentRun[]; totalElements: number }> {
  return apiCall<{ content: AgentRun[]; totalElements: number }>(
    `/api/agent/runs?page=${page}&size=${size}`
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
