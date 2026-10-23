/**
 * Normalize legacy / alias eventType names to canonical contract types.
 */

const LEGACY_TO_CANONICAL: Record<string, string> = {
  DAG_NODE_COMPLETED: 'TODO_NODE_COMPLETED',
  DAG_NODE_FAILED: 'TODO_NODE_FAILED',
  DAG_NODE_SKIPPED: 'TODO_NODE_SKIPPED',
  DAG_RECOVERY_JUDGE_STARTED: 'DAG_RECOVERY_JUDGE_STARTED',
  DAG_RECOVERY_JUDGE_FINISHED: 'DAG_RECOVERY_JUDGE_FINISHED',
  DAG_RECOVERY_JUDGE_FAILED: 'DAG_RECOVERY_JUDGE_FAILED',
};

/** Returns canonical eventType; legacy DAG_* maps to TODO_NODE_* when not already canonical. */
export function normalizeEventType(eventType: string): string {
  return LEGACY_TO_CANONICAL[eventType] ?? eventType;
}

export function isExecutionLifecycleEvent(eventType: string): boolean {
  const t = normalizeEventType(eventType);
  return (
    t === 'PLAN_READY' ||
    t === 'DEPENDENCIES_CHECKED' ||
    t === 'TOOL_RESULT_RECORDED' ||
    t === 'TOOL_CALL_STARTED' ||
    t === 'TOOL_CALL_FINISHED' ||
    t === 'WORKFLOW_RESUMED' ||
    t === 'EXECUTION_STARTED' ||
    t === 'DAG_EXECUTION_STARTED' ||
    t === 'DAG_EXECUTION_COMPLETED' ||
    t.startsWith('TODO_NODE_') ||
    t.startsWith('DAG_RECOVERY_')
  );
}

export function isChatPartEvent(eventType: string): boolean {
  const t = normalizeEventType(eventType);
  return (
    t.startsWith('TOOL_CALL_') ||
    t.startsWith('LLM_CALL_') ||
    t === 'WORKFLOW_COMPLETED' ||
    t === 'MESSAGE_COMPLETED'
  );
}
