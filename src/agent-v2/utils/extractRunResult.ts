import type { AgentRunResult } from '../../api/agent';

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function asBoolean(v: unknown): boolean {
  return v === true;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) {
    return [];
  }
  return v.filter((x): x is string => typeof x === 'string');
}

/**
 * Parse GET /api/agent/runs/{runId}/result into a typed {@link AgentRunResult}.
 * Tolerates backend shapes from before PARTIAL support (no `partial` field, etc.).
 * Never throws; missing/garbage values fall through to the documented defaults.
 */
export function parseAgentRunResult(raw: unknown): AgentRunResult {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const obj = raw as Record<string, unknown>;
  return {
    answer: asString(obj.answer ?? obj.content ?? obj.message ?? obj.text ?? obj.result),
    partial: asBoolean(obj.partial),
    skippedTodoIds: asStringArray(obj.skippedTodoIds ?? obj.skip_todo_ids),
    // Prefer the post-rename key; accept the pre-rename traceId aliases so
    // rows written by e0447a8 (and earlier) still parse correctly.
    recoveryJudgeDecisionId: asString(
      obj.recoveryJudgeDecisionId ??
        obj.recovery_judge_decision_id ??
        obj.recoveryJudgeTraceId ??
        obj.recovery_judge_trace_id ??
        obj.judgeCallTraceId ??
        obj.judge_call_trace_id
    ),
    recoveryRationale: asString(obj.recoveryRationale ?? obj.recovery_rationale),
    status: asString(obj.status),
  };
}

/** Extract user-visible answer text from GET /result payload. */
export function extractRunResultText(result: unknown): string | null {
  if (typeof result === 'string' && result.trim()) {
    return result.trim();
  }
  if (result && typeof result === 'object') {
    const obj = result as Record<string, unknown>;
    for (const key of ['answer', 'content', 'message', 'text', 'result']) {
      const value = obj[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }
  return null;
}
