import type { AgentMessagePart } from '../types/messagePart';
import type { AgentEventPayload, RawSseFrame, SnapshotEventRecord } from '../types/sse';
import { normalizeEventType } from './runAdapter';
import { toolCallKey } from './toolCallKey';

export interface MessagePartReducerState {
  runId: string | null;
  lastSeq: number;
  parts: AgentMessagePart[];
  seenSeqs: Set<number>;
}

export function createMessagePartReducerState(runId: string | null = null): MessagePartReducerState {
  return {
    runId,
    lastSeq: 0,
    parts: [],
    seenSeqs: new Set(),
  };
}

export function applySseFrame(
  state: MessagePartReducerState,
  frame: RawSseFrame
): MessagePartReducerState {
  switch (frame.event) {
    case 'snapshot':
      return applySnapshot(state, frame.data);
    case 'agent.event':
      return applyAgentEvent(state, frame.data);
    case 'run.status':
      return applyRunStatus(state, frame.data, false);
    case 'run.done':
      return applyRunStatus(state, { ...frame.data, type: 'run.done' }, true);
    case 'error':
      return {
        ...state,
        parts: upsertPart(state.parts, {
          type: 'error',
          code: frame.data.code,
          message: frame.data.message,
        }),
      };
    case 'heartbeat':
    default:
      return state;
  }
}

/** Apply durable agent.event (also used by event history repair). */
export function applyAgentEventPayload(
  state: MessagePartReducerState,
  event: AgentEventPayload
): MessagePartReducerState {
  return applyAgentEvent(state, event);
}

function applySnapshot(
  state: MessagePartReducerState,
  snapshot: RawSseFrame extends { event: 'snapshot' } ? RawSseFrame['data'] : never
): MessagePartReducerState {
  let next = {
    ...state,
    runId: snapshot.runId,
    lastSeq: Math.max(state.lastSeq, snapshot.lastSeq ?? 0),
  };
  if (snapshot.status) {
    next = applyRunStatus(
      next,
      {
        type: 'run.status',
        runId: snapshot.runId,
        status: snapshot.status,
        phase: snapshot.phase ?? undefined,
        lastSeq: snapshot.lastSeq,
      },
      false
    );
  }
  for (const event of snapshot.events ?? []) {
    next = applySnapshotEvent(next, event);
  }
  return next;
}

function applySnapshotEvent(state: MessagePartReducerState, event: SnapshotEventRecord): MessagePartReducerState {
  return applyAgentEvent(state, {
    type: 'agent.event',
    runId: event.runId,
    seq: event.seq,
    eventType: event.eventType,
    payload: event.payload ?? {},
    createdAt: event.createdAt,
  });
}

function applyAgentEvent(state: MessagePartReducerState, event: AgentEventPayload): MessagePartReducerState {
  if (state.seenSeqs.has(event.seq)) {
    return state;
  }
  const seenSeqs = new Set(state.seenSeqs);
  seenSeqs.add(event.seq);

  let parts = state.parts;
  const eventType = normalizeEventType(event.eventType);
  const payload = event.payload ?? {};

  if (eventType === 'TOOL_CALL_STARTED') {
    const id = toolCallKey(payload);
    parts = upsertPart(parts, {
      type: 'tool_call',
      id,
      name: String(payload.tool_name ?? payload.toolName ?? 'tool'),
      arguments: (payload.arguments as Record<string, unknown> | undefined) ?? undefined,
      status: 'pending',
      todoId: stringOrUndefined(payload.todo_id),
      todoSequence: numberOrUndefined(payload.todo_sequence),
      workflow: stringOrUndefined(payload.workflow),
      phase: stringOrUndefined(payload.phase),
    });
  } else if (eventType === 'TOOL_CALL_FINISHED') {
    const id = toolCallKey(payload);
    const success = payload.success === true;
    parts = upsertPart(parts, {
      type: 'tool_call',
      id,
      name: String(payload.tool_name ?? payload.toolName ?? 'tool'),
      resultPreview: typeof payload.result_preview === 'string' ? payload.result_preview : undefined,
      status: success ? 'success' : 'error',
      durationMs: numberOrUndefined(payload.duration_ms),
      todoId: stringOrUndefined(payload.todo_id),
      todoSequence: numberOrUndefined(payload.todo_sequence),
      workflow: stringOrUndefined(payload.workflow),
      phase: stringOrUndefined(payload.phase),
    });
  } else if (eventType === 'LLM_CALL_STARTED') {
    parts = upsertLlmPart(parts, payload, { status: 'running' });
  } else if (eventType === 'LLM_CALL_DELTA') {
    parts = upsertLlmPart(parts, payload, {
      status: 'running',
      estimatedOutputTokens: numberOrUndefined(payload.estimated_output_tokens),
      contentChars: numberOrUndefined(payload.content_chars),
      reasoningChars: numberOrUndefined(payload.reasoning_chars),
      chunkCount: numberOrUndefined(payload.chunk_count),
    });
  } else if (eventType === 'LLM_CALL_FINISHED') {
    parts = upsertLlmPart(parts, payload, {
      status: 'done',
      inputTokens: numberOrUndefined(payload.input_tokens),
      outputTokens: numberOrUndefined(payload.output_tokens),
      totalTokens: numberOrUndefined(payload.total_tokens),
      estimatedOutputTokens:
        numberOrUndefined(payload.output_tokens) ??
        numberOrUndefined(payload.total_tokens),
      durationMs: numberOrUndefined(payload.duration_ms),
    });
  } else if (eventType === 'WORKFLOW_COMPLETED' || eventType === 'MESSAGE_COMPLETED') {
    const answer = extractAnswer(payload);
    if (answer) {
      parts = upsertPart(parts, {
        type: 'text',
        content: answer,
        source: eventType === 'WORKFLOW_COMPLETED' ? 'workflow_completed' : 'message_completed',
      });
    }
  }

  return {
    ...state,
    runId: event.runId ?? state.runId,
    lastSeq: Math.max(state.lastSeq, event.seq),
    parts,
    seenSeqs,
  };
}

function llmCallIdFromPayload(payload: Record<string, unknown>): string {
  return String(payload.llm_call_id ?? payload.trace_id ?? 'unknown-llm');
}

function upsertLlmPart(
  parts: AgentMessagePart[],
  payload: Record<string, unknown>,
  patch: Partial<Extract<AgentMessagePart, { type: 'llm_progress' }>>
): AgentMessagePart[] {
  const llmCallId = llmCallIdFromPayload(payload);
  const idx = parts.findIndex((p) => p.type === 'llm_progress' && p.llmCallId === llmCallId);
  const base: Extract<AgentMessagePart, { type: 'llm_progress' }> =
    idx >= 0 && parts[idx].type === 'llm_progress'
      ? parts[idx]
      : {
          type: 'llm_progress',
          llmCallId,
          status: 'running',
        };

  const merged: Extract<AgentMessagePart, { type: 'llm_progress' }> = {
    ...base,
    llmCallId,
    traceId: stringOrUndefined(payload.trace_id) ?? base.traceId,
    model: stringOrUndefined(payload.model) ?? base.model,
    stage: stringOrUndefined(payload.stage) ?? base.stage,
    phase: stringOrUndefined(payload.phase) ?? base.phase,
    todoId: stringOrUndefined(payload.todo_id) ?? base.todoId,
    todoSequence: numberOrUndefined(payload.todo_sequence) ?? base.todoSequence,
    workflow: stringOrUndefined(payload.workflow) ?? base.workflow,
    estimatedOutputTokens: patch.estimatedOutputTokens ?? base.estimatedOutputTokens,
    inputTokens: patch.inputTokens ?? base.inputTokens,
    outputTokens: patch.outputTokens ?? base.outputTokens,
    totalTokens: patch.totalTokens ?? base.totalTokens,
    contentChars: patch.contentChars ?? base.contentChars,
    reasoningChars: patch.reasoningChars ?? base.reasoningChars,
    chunkCount: patch.chunkCount ?? base.chunkCount,
    durationMs: patch.durationMs ?? base.durationMs,
    status: patch.status ?? base.status,
  };

  return upsertPart(parts, merged);
}

function applyRunStatus(
  state: MessagePartReducerState,
  payload: { runId: string; status?: string | null; phase?: string | null; lastSeq?: number; type?: string },
  terminal: boolean
): MessagePartReducerState {
  if (!payload.status) {
    return state;
  }
  return {
    ...state,
    runId: payload.runId ?? state.runId,
    lastSeq: Math.max(state.lastSeq, payload.lastSeq ?? 0),
    parts: upsertPart(state.parts, {
      type: 'run_status',
      status: payload.status,
      phase: payload.phase ?? undefined,
      lastSeq: payload.lastSeq,
      terminal,
    }),
  };
}

function extractAnswer(payload: Record<string, unknown>): string | null {
  const candidates = [payload.answer, payload.content, payload.message, payload.text];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

export function applyResultFallback(
  state: MessagePartReducerState,
  answer: string
): MessagePartReducerState {
  if (!answer.trim()) {
    return state;
  }
  const hasText = state.parts.some((p) => p.type === 'text');
  if (hasText) {
    return state;
  }
  return {
    ...state,
    parts: [
      ...state.parts,
      {
        type: 'text',
        content: answer,
        source: 'result',
      },
    ],
  };
}

function stringOrUndefined(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function numberOrUndefined(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function upsertPart(parts: AgentMessagePart[], part: AgentMessagePart): AgentMessagePart[] {
  if (part.type === 'tool_call') {
    const idx = parts.findIndex((p) => p.type === 'tool_call' && p.id === part.id);
    if (idx >= 0) {
      const next = [...parts];
      next[idx] = { ...next[idx], ...part } as AgentMessagePart;
      return next;
    }
  }
  if (part.type === 'llm_progress') {
    const idx = parts.findIndex((p) => p.type === 'llm_progress' && p.llmCallId === part.llmCallId);
    if (idx >= 0) {
      const next = [...parts];
      next[idx] = { ...next[idx], ...part } as AgentMessagePart;
      return next;
    }
  }
  if (part.type === 'run_status') {
    const idx = parts.findIndex((p) => p.type === 'run_status');
    if (idx >= 0) {
      const next = [...parts];
      next[idx] = part;
      return next;
    }
  }
  if (part.type === 'text') {
    const idx = parts.findIndex((p) => p.type === 'text');
    if (idx >= 0) {
      const next = [...parts];
      next[idx] = part;
      return next;
    }
  }
  if (part.type === 'error') {
    const idx = parts.findIndex((p) => p.type === 'error' && p.code === part.code);
    if (idx >= 0) {
      const next = [...parts];
      next[idx] = part;
      return next;
    }
  }
  return [...parts, part];
}
