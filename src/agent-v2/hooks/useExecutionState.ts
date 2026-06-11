import { useAgentV2Store } from '../store/agentV2Store';

/** Execution plan + per-todo status for Linear stepper / DAG graph (Phase 1a). */
export function useExecutionState() {
  const execution = useAgentV2Store((s) => s.execution);
  const workflow = execution.workflow;
  const planItems = execution.planItems;
  const nodeStatus = execution.nodeStatus;
  const runningNodeIds = execution.runningNodeIds;
  const currentTodoId = execution.currentTodoId;
  const startedAtMs = execution.startedAtMs;
  const durationMs = execution.durationMs;

  const hasPlan = planItems.length > 0;

  return {
    execution,
    workflow,
    planItems,
    nodeStatus,
    runningNodeIds,
    currentTodoId,
    startedAtMs,
    durationMs,
    hasPlan,
    isDag: workflow === 'dag',
    isLinear: workflow === 'linear',
  };
}
