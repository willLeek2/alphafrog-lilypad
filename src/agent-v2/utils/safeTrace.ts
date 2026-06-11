import type { TraceSpanItem } from '../../api/agent';

/** User-safe trace fields only — no endpoint, raw I/O, or reasoning bodies. */
export interface SafeTraceSpan {
  traceId: string;
  type: string;
  phase?: string;
  time?: string;
  todoId?: string | null;
  durationMs?: number | null;
  model?: string;
  toolName?: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  hasError?: boolean;
  success?: boolean;
  outputSummary?: string;
}

const MAX_SUMMARY_LEN = 280;

function truncate(text: string, max = MAX_SUMMARY_LEN): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}…`;
}

export function toSafeTraceSpan(span: TraceSpanItem): SafeTraceSpan {
  const safe: SafeTraceSpan = {
    traceId: span.traceId,
    type: span.type,
    phase: span.phase,
    time: span.time,
    todoId: span.todoId,
    durationMs: span.durationMs,
    model: span.model,
    toolName: span.toolName,
    inputTokens: span.inputTokens,
    outputTokens: span.outputTokens,
    hasError: span.hasError,
    success: span.success,
  };
  if (span.outputSummary?.trim()) {
    safe.outputSummary = truncate(span.outputSummary.trim());
  }
  return safe;
}

export function filterSafeTracesForTodo(
  spans: TraceSpanItem[],
  todoId: string | null
): SafeTraceSpan[] {
  if (!todoId) {
    return [];
  }
  return spans
    .filter((s) => s.todoId === todoId)
    .map(toSafeTraceSpan)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
}
