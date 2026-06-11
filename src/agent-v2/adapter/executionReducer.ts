import {
  createExecutionState,
  type DagRecoveryDecision,
  type ExecutionState,
  type TodoNodeSkippedReason,
  type TodoNodeStatus,
  type TodoPlanItem,
  type WorkflowKind,
} from '../types/runTypes';
import { normalizeEventType } from './runAdapter';

export type { ExecutionState, TodoNodeStatus, TodoNodeSkippedReason, DagRecoveryDecision };

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function parsePlanItems(plan: unknown): TodoPlanItem[] {
  if (!plan || typeof plan !== 'object') {
    return [];
  }
  const raw = plan as Record<string, unknown>;
  const items = raw.items;
  if (!Array.isArray(items)) {
    return [];
  }
  const result: TodoPlanItem[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const o = item as Record<string, unknown>;
    const id = asString(o.id);
    if (!id) {
      continue;
    }
    const sequence = asNumber(o.sequence) ?? result.length + 1;
    const description = asString(o.description) ?? '';
    const dependsOn = Array.isArray(o.dependsOn)
      ? o.dependsOn.filter((d): d is string => typeof d === 'string')
      : [];
    result.push({
      id,
      sequence,
      description,
      dependsOn,
      suggested_tool: asString(o.suggested_tool ?? o.suggestedTool),
    });
  }
  return result.sort((a, b) => a.sequence - b.sequence);
}

function initNodeStatuses(planItems: TodoPlanItem[]): Record<string, TodoNodeStatus> {
  const nodeStatus: Record<string, TodoNodeStatus> = {};
  for (const item of planItems) {
    nodeStatus[item.id] = 'pending';
  }
  return nodeStatus;
}

function recomputeRunning(state: ExecutionState): string[] {
  return Object.entries(state.nodeStatus)
    .filter(([, s]) => s === 'running')
    .map(([id]) => id);
}

function setNodeStatus(
  state: ExecutionState,
  todoId: string,
  status: TodoNodeStatus
): ExecutionState {
  const nodeStatus = { ...state.nodeStatus, [todoId]: status };
  const runningNodeIds = recomputeRunning({ ...state, nodeStatus });
  const currentTodoId =
    status === 'running' ? todoId : runningNodeIds[0] ?? state.currentTodoId;
  return { ...state, nodeStatus, runningNodeIds, currentTodoId };
}

export function applyPlanToExecution(
  state: ExecutionState,
  plan: unknown,
  workflow?: WorkflowKind,
  executionMode?: string
): ExecutionState {
  const planItems = parsePlanItems(plan);
  const nodeStatus = initNodeStatuses(planItems);
  return {
    ...state,
    workflow: workflow ?? state.workflow,
    executionMode: executionMode ?? state.executionMode,
    planItems,
    nodeStatus,
    runningNodeIds: [],
    currentTodoId: undefined,
  };
}

export function applySnapshotPlan(
  state: ExecutionState,
  snapshotPlan: unknown
): ExecutionState {
  if (!snapshotPlan) {
    return state;
  }
  return applyPlanToExecution(state, snapshotPlan);
}

export function applyExecutionAgentEvent(
  state: ExecutionState,
  eventType: string,
  payload: Record<string, unknown>
): ExecutionState {
  const type = normalizeEventType(eventType);

  if (type === 'PLAN_READY') {
    const workflowRaw = asString(payload.workflow);
    const workflow: WorkflowKind =
      workflowRaw === 'dag' ? 'dag' : workflowRaw === 'linear' ? 'linear' : state.workflow;
    const executionMode = asString(payload.execution_mode ?? payload.executionMode);
    const plan = payload.plan ?? payload;
    return applyPlanToExecution(state, plan, workflow, executionMode);
  }

  if (type === 'EXECUTION_STARTED' || type === 'DAG_EXECUTION_STARTED') {
    return { ...state, workflow: state.workflow === 'unknown' ? 'linear' : state.workflow };
  }

  if (type === 'DAG_EXECUTION_COMPLETED') {
    return state;
  }

  const todoId = asString(payload.todo_id ?? payload.todoId);
  if (!todoId) {
    return state;
  }

  if (type === 'TODO_NODE_STARTED') {
    const startedAt = asNumber(payload.started_at ?? payload.startedAt) ?? Date.now();
    const startedAtMs = { ...state.startedAtMs, [todoId]: startedAt };
    return setNodeStatus({ ...state, startedAtMs }, todoId, 'running');
  }

  if (type === 'TODO_NODE_COMPLETED') {
    const duration = asNumber(payload.duration_ms ?? payload.durationMs);
    const durationMs =
      duration != null ? { ...state.durationMs, [todoId]: duration } : state.durationMs;
    return setNodeStatus({ ...state, durationMs }, todoId, 'completed');
  }

  if (type === 'TODO_NODE_FAILED') {
    const duration = asNumber(payload.duration_ms ?? payload.durationMs);
    const durationMs =
      duration != null ? { ...state.durationMs, [todoId]: duration } : state.durationMs;
    return setNodeStatus({ ...state, durationMs }, todoId, 'failed');
  }

  if (type === 'TODO_NODE_SKIPPED') {
    const reasonRaw = asString(payload.reason);
    const reason: TodoNodeSkippedReason | undefined =
      reasonRaw === 'judge_recovery' || reasonRaw === 'dependency_unresolved'
        ? reasonRaw
        : undefined;
    const skippedReasons = reason
      ? { ...state.skippedReasons, [todoId]: reason }
      : state.skippedReasons;
    return setNodeStatus({ ...state, skippedReasons }, todoId, 'skipped');
  }

  if (
    type === 'DAG_RECOVERY_JUDGE_STARTED' ||
    type === 'DAG_RECOVERY_JUDGE_FINISHED' ||
    type === 'DAG_RECOVERY_JUDGE_FAILED'
  ) {
    return applyDagRecoveryJudgeEvent(state, type, payload);
  }

  return state;
}

function applyDagRecoveryJudgeEvent(
  state: ExecutionState,
  type: 'DAG_RECOVERY_JUDGE_STARTED' | 'DAG_RECOVERY_JUDGE_FINISHED' | 'DAG_RECOVERY_JUDGE_FAILED',
  payload: Record<string, unknown>
): ExecutionState {
  if (type === 'DAG_RECOVERY_JUDGE_STARTED') {
    return {
      ...state,
      dagRecoveryJudge: {
        ...state.dagRecoveryJudge,
        phase: 'running',
        startedAtMs: asNumber(payload.started_at ?? payload.startedAt) ?? Date.now(),
      },
    };
  }

  const decisionRaw = asString(payload.decision);
  const decision: DagRecoveryDecision | null =
    decisionRaw === 'YES' || decisionRaw === 'NO' ? decisionRaw : null;
  const skipTodoIds = Array.isArray(payload.skipTodoIds)
    ? payload.skipTodoIds.filter((id): id is string => typeof id === 'string')
    : Array.isArray(payload.skip_todo_ids)
      ? payload.skip_todo_ids.filter((id): id is string => typeof id === 'string')
      : state.dagRecoveryJudge.skipTodoIds;
  const rationale = asString(payload.rationale) ?? state.dagRecoveryJudge.rationale;
  // b5c4452 renamed the SSE key from judgeCallTraceId / judge_call_trace_id
  // → recoveryJudgeDecisionId / recovery_judge_decision_id. Accept both the
  // new and old keys so replays of historical events still hydrate the UI.
  const recoveryJudgeDecisionId =
    asString(
      payload.recoveryJudgeDecisionId ??
        payload.recovery_judge_decision_id ??
        payload.judgeCallTraceId ??
        payload.judge_call_trace_id ??
        payload.traceId
    ) ?? state.dagRecoveryJudge.recoveryJudgeDecisionId;

  return {
    ...state,
    dagRecoveryJudge: {
      ...state.dagRecoveryJudge,
      phase: type === 'DAG_RECOVERY_JUDGE_FAILED' ? 'running' : 'finished',
      decision: decision ?? state.dagRecoveryJudge.decision,
      skipTodoIds,
      rationale,
      recoveryJudgeDecisionId,
      finishedAtMs:
        type === 'DAG_RECOVERY_JUDGE_FINISHED'
          ? (asNumber(payload.finished_at ?? payload.finishedAt) ?? Date.now())
          : state.dagRecoveryJudge.finishedAtMs,
    },
  };
}

export { createExecutionState };
