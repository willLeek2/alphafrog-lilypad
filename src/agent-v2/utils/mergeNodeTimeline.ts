import type { TraceSpanItem } from '../../api/agent';
import type { ExecutionState, TodoNodeSkippedReason } from '../types/runTypes';
import type { AgentMessagePart } from '../types/messagePart';
import { filterPartsByTodoId } from './filterPartsByTodo';

export type NodeTimelineKind = 'tool' | 'llm' | 'skipped';

export interface NodeTimelineItem {
  key: string;
  kind: NodeTimelineKind;
  /** Stable id for expand / dedupe (tool_call id or llm_call_id / traceId). */
  eventId: string;
  traceId?: string;
  title: string;
  statusLine: string;
  preview?: string;
  fromSse: boolean;
  part?: AgentMessagePart;
  trace?: TraceSpanItem;
  /** For kind=skipped — why this todo was skipped. */
  skippedReason?: TodoNodeSkippedReason;
}

function toolTitle(name: string): string {
  return `Tool · ${name}`;
}

function llmTitle(model?: string, phase?: string): string {
  if (model && phase) {
    return `LLM · ${model} · ${phase}`;
  }
  if (model) {
    return `LLM · ${model}`;
  }
  return 'LLM 调用';
}

function skippedTitle(reason?: TodoNodeSkippedReason): string {
  if (reason === 'judge_recovery') {
    return '节点 · 被 judge 跳过';
  }
  if (reason === 'dependency_unresolved') {
    return '节点 · 依赖未满足自动跳过';
  }
  return '节点 · 已跳过';
}

function statusFromPart(part: AgentMessagePart): string {
  if (part.type === 'tool_call') {
    const dur = part.durationMs != null ? ` · ${part.durationMs}ms` : '';
    return `${part.status}${dur}`;
  }
  if (part.type === 'llm_progress') {
    const tok =
      part.inputTokens != null || part.outputTokens != null
        ? ` · ${part.inputTokens ?? 0}/${part.outputTokens ?? 0} tok`
        : '';
    const dur = part.durationMs != null ? ` · ${part.durationMs}ms` : '';
    return `${part.status}${dur}${tok}`;
  }
  return '—';
}

function statusFromTrace(span: TraceSpanItem): string {
  const dur = span.durationMs != null ? `${span.durationMs}ms` : '—';
  const tok =
    span.inputTokens != null || span.outputTokens != null
      ? ` · ${span.inputTokens ?? 0}/${span.outputTokens ?? 0} tok`
      : '';
  const err = span.hasError ? ' · error' : '';
  return `${dur}${tok}${err}`.trim();
}

/** Merge SSE parts and trace spans for one todo, deduped by tool id / llm trace id. */
export function buildNodeTimeline(
  parts: AgentMessagePart[],
  traceSpans: TraceSpanItem[],
  todoId: string | null,
  execution?: Pick<ExecutionState, 'nodeStatus' | 'skippedReasons'>
): NodeTimelineItem[] {
  const nodeParts = filterPartsByTodoId(parts, todoId);
  const nodeTraces =
    todoId != null ? traceSpans.filter((s) => s.todoId === todoId) : [];

  const byKey = new Map<string, NodeTimelineItem>();

  for (const part of nodeParts) {
    if (part.type === 'tool_call') {
      const key = `tool:${part.id}`;
      byKey.set(key, {
        key,
        kind: 'tool',
        eventId: part.id,
        traceId: part.id,
        title: toolTitle(part.name),
        statusLine: statusFromPart(part),
        preview: part.resultPreview,
        fromSse: true,
        part,
      });
    } else if (part.type === 'llm_progress') {
      const eventId = part.traceId ?? part.llmCallId;
      const key = `llm:${eventId}`;
      byKey.set(key, {
        key,
        kind: 'llm',
        eventId,
        traceId: part.traceId ?? part.llmCallId,
        title: llmTitle(part.model, part.phase),
        statusLine: statusFromPart(part),
        fromSse: true,
        part,
      });
    }
  }

  for (const span of nodeTraces) {
    const isTool = span.type === 'tool';
    const isLlm = span.type === 'llm';
    if (!isTool && !isLlm) {
      continue;
    }
    const eventId = span.traceId;
    const key = `${isTool ? 'tool' : 'llm'}:${eventId}`;
    if (byKey.has(key)) {
      const existing = byKey.get(key)!;
      if (!existing.preview && span.outputSummary) {
        existing.preview = span.outputSummary;
      }
      existing.trace = span;
      continue;
    }
    byKey.set(key, {
      key,
      kind: isTool ? 'tool' : 'llm',
      eventId,
      traceId: span.traceId,
      title: isTool
        ? toolTitle(span.toolName ?? 'tool')
        : llmTitle(span.model, span.phase),
      statusLine: statusFromTrace(span),
      preview: span.outputSummary,
      fromSse: false,
      trace: span,
    });
  }

  // Emitted only for the selected todo (matches the per-node tab scope).
  if (todoId != null && execution) {
    const status = execution.nodeStatus[todoId];
    if (status === 'skipped') {
      const reason = execution.skippedReasons[todoId];
      byKey.set(`skipped:${todoId}`, {
        key: `skipped:${todoId}`,
        kind: 'skipped',
        eventId: `skipped:${todoId}`,
        title: skippedTitle(reason),
        statusLine: reason ?? 'skipped',
        fromSse: true,
        skippedReason: reason,
      });
    }
  }

  return [...byKey.values()];
}
