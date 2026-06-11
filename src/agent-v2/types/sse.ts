/** Backend SSE v1 fact stream — see agent-ui-refactoring-plan-backend-v1-aligned-20260529.md §二 */

export interface AgentEventPayload {
  type: 'agent.event';
  runId: string;
  seq: number;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt?: string;
  ts?: number;
}

export interface SnapshotEventRecord {
  id: number | string;
  runId: string;
  seq: number;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt?: string;
}

export interface SnapshotPayload {
  type: 'snapshot';
  runId: string;
  status?: string | null;
  phase?: string | null;
  lastSeq: number;
  eventCount?: number;
  /** Plan JSON object when run has planned (backend v1p0+) */
  plan?: Record<string, unknown> | null;
  events: SnapshotEventRecord[];
  ts?: number;
}

export interface RunStatusPayload {
  type: 'run.status' | 'run.done';
  runId: string;
  status?: string | null;
  phase?: string | null;
  lastSeq?: number;
  ts?: number;
}

export interface HeartbeatPayload {
  type: 'heartbeat';
  runId: string;
  ts?: number;
}

export interface SseErrorPayload {
  type: 'error';
  code: string;
  message: string;
  ts?: number;
}

export type RawSseFrame =
  | { event: 'snapshot'; data: SnapshotPayload }
  | { event: 'agent.event'; id?: string; data: AgentEventPayload }
  | { event: 'run.status'; data: RunStatusPayload }
  | { event: 'run.done'; data: RunStatusPayload }
  | { event: 'heartbeat'; data: HeartbeatPayload }
  | { event: 'error'; data: SseErrorPayload };
