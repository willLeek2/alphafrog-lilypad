/** Plan + execution view models — aligned with backend-contract-spec §2.1 / §4 */

export type WorkflowKind = 'unknown' | 'linear' | 'dag';

export type TodoNodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/** TODO_NODE_SKIPPED payload reason — frontend must not invent new values. */
export type TodoNodeSkippedReason = 'judge_recovery' | 'dependency_unresolved';

/** DAG_RECOVERY_JUDGE_FINISHED decision — enum matches backend schema. */
export type DagRecoveryDecision = 'YES' | 'NO';

export interface DagRecoveryJudgeState {
  phase: 'running' | 'finished' | null;
  decision: DagRecoveryDecision | null;
  /** Populated on STARTED or FINISHED; may grow if backend re-emits. */
  skipTodoIds: string[];
  /** API-capped to 500 chars; never trust the SSE payload length here. */
  rationale: string | null;
  /**
   * Judge decision id (UUID). Renamed from `judgeCallTraceId` to make clear it
   * is NOT a real LLM traceId. Actual judge LLM trace is locatable in
   * observability via phase=`dag_recovery_judge`.
   */
  recoveryJudgeDecisionId: string | null;
  startedAtMs?: number;
  finishedAtMs?: number;
}

export interface TodoPlanItem {
  id: string;
  sequence: number;
  description: string;
  dependsOn: string[];
  suggested_tool?: string;
}

export interface DagEdge {
  source: string;
  target: string;
}

export interface PlanPayload {
  items: TodoPlanItem[];
  edges?: DagEdge[];
}

export interface ExecutionState {
  workflow: WorkflowKind;
  executionMode?: string;
  planItems: TodoPlanItem[];
  nodeStatus: Record<string, TodoNodeStatus>;
  /** running wall-clock start per todo (from TODO_NODE_STARTED.started_at) */
  startedAtMs: Record<string, number>;
  /** terminal duration from TODO_NODE_COMPLETED / FAILED */
  durationMs: Record<string, number>;
  runningNodeIds: string[];
  currentTodoId?: string;
  /** per-todo skip reason — only set when status === 'skipped' */
  skippedReasons: Record<string, TodoNodeSkippedReason>;
  /** DAG recovery judge state — null until DAG_RECOVERY_JUDGE_STARTED arrives */
  dagRecoveryJudge: DagRecoveryJudgeState;
}

export function createExecutionState(): ExecutionState {
  return {
    workflow: 'unknown',
    planItems: [],
    nodeStatus: {},
    startedAtMs: {},
    durationMs: {},
    runningNodeIds: [],
    skippedReasons: {},
    dagRecoveryJudge: {
      phase: null,
      decision: null,
      skipTodoIds: [],
      rationale: null,
      recoveryJudgeDecisionId: null,
    },
  };
}
