import { create } from 'zustand';
import { connectAgentSse } from '../adapter/sseClient';
import {
  applyExecutionAgentEvent,
  applySnapshotPlan,
  createExecutionState,
  type ExecutionState,
} from '../adapter/executionReducer';
import { repairAgentEventsAfterSeq } from '../adapter/eventHistoryRepair';
import {
  applyResultFallback,
  applySseFrame,
  applyAgentEventPayload,
  createMessagePartReducerState,
  type MessagePartReducerState,
} from '../adapter/messagePartReducer';
import { isExecutionLifecycleEvent } from '../adapter/runAdapter';
import { getRunResult } from '../../api/agent';
import { extractRunResultText } from '../utils/extractRunResult';
import type { AgentMessagePart } from '../types/messagePart';
import type { AgentEventPayload, RawSseFrame } from '../types/sse';

const TERMINAL_STATUSES = new Set(['COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED', 'CANCELED', 'ERROR']);

export type AgentViewMode = 'chat' | 'process';

interface AgentV2StoreState extends MessagePartReducerState {
  execution: ExecutionState;
  userTurns: string[];
  viewMode: AgentViewMode;
  selectedTodoId: string | null;
  connected: boolean;
  streamError: string | null;
  controlError: string | null;
  connectionNote: string | null;
  lastRepairApplied: number;
  abortController: AbortController | null;
  repairInFlight: boolean;
}

interface AgentV2StoreActions {
  setUserTurns: (turns: string[]) => void;
  appendUserTurn: (text: string) => void;
  clearChatPartsForFollowUp: () => void;
  setConnectionNote: (note: string | null) => void;
  setControlError: (error: string | null) => void;
  setViewMode: (viewMode: AgentViewMode) => void;
  setSelectedTodoId: (todoId: string | null) => void;
  reset: (runId?: string | null) => void;
  applyFrame: (frame: RawSseFrame) => void;
  applyAgentEvent: (event: AgentEventPayload) => void;
  setConnected: (connected: boolean) => void;
  setStreamError: (error: string | null) => void;
  connectStream: (params: { runId: string; streamUrl?: string; afterSeq?: number }) => Promise<void>;
  disconnectStream: () => void;
  fetchResultFallback: (runId: string) => Promise<void>;
  repairEventGap: (runId: string) => Promise<void>;
}

export type AgentV2Store = AgentV2StoreState & AgentV2StoreActions;

function isTerminal(parts: AgentMessagePart[]): boolean {
  const statusPart = parts.find((p) => p.type === 'run_status');
  if (statusPart?.type === 'run_status' && statusPart.terminal) {
    return true;
  }
  if (statusPart?.type === 'run_status' && TERMINAL_STATUSES.has(statusPart.status.toUpperCase())) {
    return true;
  }
  return false;
}

function applyExecutionFromAgentEvent(
  execution: ExecutionState,
  event: AgentEventPayload
): ExecutionState {
  if (!isExecutionLifecycleEvent(event.eventType)) {
    return execution;
  }
  return applyExecutionAgentEvent(execution, event);
}

export const useAgentV2Store = create<AgentV2Store>((set, get) => ({
  ...createMessagePartReducerState(),
  execution: createExecutionState(),
  userTurns: [],
  viewMode: 'chat',
  selectedTodoId: null,
  connected: false,
  streamError: null,
  controlError: null,
  connectionNote: null,
  lastRepairApplied: 0,
  abortController: null,
  repairInFlight: false,

  setUserTurns: (userTurns) => set({ userTurns }),
  appendUserTurn: (text) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    set((state) => ({ userTurns: [...state.userTurns, trimmed] }));
  },
  clearChatPartsForFollowUp: () =>
    set((state) => ({
      parts: state.parts.filter((p) => p.type === 'run_status'),
    })),
  setConnectionNote: (connectionNote) => set({ connectionNote }),
  setControlError: (controlError) => set({ controlError }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSelectedTodoId: (selectedTodoId) => set({ selectedTodoId }),

  reset: (runId = null) => {
    get().disconnectStream();
    set({
      ...createMessagePartReducerState(runId),
      execution: createExecutionState(),
      userTurns: [],
      viewMode: 'chat',
      selectedTodoId: null,
      connected: false,
      streamError: null,
      controlError: null,
      connectionNote: null,
      lastRepairApplied: 0,
      abortController: null,
      repairInFlight: false,
    });
  },

  applyAgentEvent: (event) => {
    set((state) => {
      if (state.runId && state.runId !== event.runId) return state;
      const partsState = applyAgentEventPayload(state, event);
      const execution = applyExecutionFromAgentEvent(state.execution, event);
      return { ...partsState, execution };
    });
  },

  applyFrame: (frame) => {
    if ('runId' in frame.data && get().runId && frame.data.runId !== get().runId) return;
    if (frame.event === 'snapshot' && frame.data.plan) {
      set((state) => ({
        execution: applySnapshotPlan(state.execution, frame.data.plan, frame.data.runId),
      }));
    }

    set((state) => {
      const partsState = applySseFrame(state, frame);
      let execution = state.execution;

      if (frame.event === 'agent.event') {
        execution = applyExecutionFromAgentEvent(execution, frame.data);
      } else if (frame.event === 'snapshot') {
        for (const ev of [...(frame.data.events ?? [])].sort((a, b) => a.seq - b.seq)) {
          execution = applyExecutionFromAgentEvent(execution, { ...ev, type: 'agent.event' });
        }
      }

      return { ...partsState, execution };
    });

    const { parts, runId } = get();
    if (runId && isTerminal(parts)) {
      void get().fetchResultFallback(runId);
    }
  },

  setConnected: (connected) => set({ connected }),
  setStreamError: (streamError) => set({ streamError }),

  disconnectStream: () => {
    const controller = get().abortController;
    if (controller) {
      controller.abort();
    }
    set({ abortController: null, connected: false });
  },

  repairEventGap: async (runId) => {
    if (get().repairInFlight) {
      return;
    }
    set({ repairInFlight: true, connectionNote: '正在从 events API 补洞…' });
    try {
      const afterSeq = get().lastSeq;
      let appliedCount = 0;
      await repairAgentEventsAfterSeq(runId, afterSeq, (event) => {
        get().applyAgentEvent(event);
        appliedCount += 1;
      });
      set({
        lastRepairApplied: appliedCount,
        connectionNote:
          appliedCount > 0
            ? `已补拉 ${appliedCount} 条事件（after_seq=${afterSeq}）`
            : '补洞完成，无新事件',
      });
    } catch {
      set({ connectionNote: 'events 补洞失败（可点重连重试）' });
    } finally {
      set({ repairInFlight: false });
    }
  },

  connectStream: async ({ runId, streamUrl, afterSeq }) => {
    get().disconnectStream();
    const userTurns = get().userTurns;
    const resumeNote =
      afterSeq != null && afterSeq > 0
        ? `SSE 重连中（after_seq=${afterSeq}）…`
        : 'SSE 连接中…';
    set({
      ...createMessagePartReducerState(runId),
      execution: createExecutionState(),
      userTurns,
      connected: false,
      streamError: null,
      connectionNote: resumeNote,
    });

    const abortController = new AbortController();
    set({ abortController });

    try {
      await connectAgentSse({
        runId,
        streamUrl,
        afterSeq,
        signal: abortController.signal,
        onConnected: () => {
          get().setConnected(true);
          const seq = get().lastSeq;
          get().setConnectionNote(seq > 0 ? `SSE 已连接 · seq ${seq}` : 'SSE 已连接');
        },
        onDisconnected: (reason) => {
          if (abortController.signal.aborted) {
            return;
          }
          get().setConnected(false);
          get().setStreamError(reason);
        },
        onFrame: (frame) => get().applyFrame(frame),
      });
    } catch (err) {
      if (!abortController.signal.aborted) {
        get().setStreamError(err instanceof Error ? err.message : 'SSE connection failed');
      }
    } finally {
      get().setConnected(false);
      if (!abortController.signal.aborted) {
        await get().repairEventGap(runId);
      }
    }
  },

  fetchResultFallback: async (runId) => {
    const state = get();
    const hasText = state.parts.some((p) => p.type === 'text');
    if (hasText) {
      return;
    }
    try {
      const result = await getRunResult(runId);
      const answer = extractRunResultText(result);
      if (answer) {
        set((s) => applyResultFallback(s, answer));
      }
    } catch {
      // GET /result is best-effort fallback
    }
  },
}));
