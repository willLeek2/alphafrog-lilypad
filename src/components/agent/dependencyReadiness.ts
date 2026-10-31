export interface DependencyHint {
  todoId: string | null;
  toolName: string | null;
  dependencyId: string | null;
  dependencyLabel: string;
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'UNCHECKED';
  basis: 'REFERENCE_STATE' | 'CONFIG_PRESENT' | 'TOOL_AVAILABILITY' | 'NONE';
  reason: string;
}

export interface DependencyCheckReport {
  checkedAt: string;
  checkedPlanGeneration: number | null;
  hints: DependencyHint[];
  omittedCount: number;
  omittedTodoIds: string[];
  omittedTodoCount: number;
  truncated: boolean;
}

type DependencyResultSource = 'synchronous' | 'wait_member' | 'tool_job_anchor';

export interface DependencyToolResult {
  planGeneration: number | null;
  todoId: string | null;
  toolName: string;
  toolCallId: string | null;
  eventSeq: number;
  source: DependencyResultSource;
  businessSuccess: boolean | null;
  executed: boolean | null;
  errorCode: string | null;
  taskStatus: string | null;
  memberState: string | null;
  /** 安全快照已按此结果边界核对调用归属，不依赖页面保留完整开始事件。 */
  verifiedAfterSeq?: number;
}

interface CallStart {
  planGeneration: number;
  todoId: string;
  toolName: string;
  toolCallId: string;
  eventSeq: number;
}

export interface DependencyReadinessState {
  runId: string | null;
  report: DependencyCheckReport | null;
  planGeneration: number | null;
  checkEventSeq: number;
  resultAfterSeq: number;
  resumeEventSeq: number;
  restartEventSeq: number;
  requiresStartProof: boolean;
  prepared: boolean;
  frozenReuse: boolean;
  results: DependencyToolResult[];
  otherResults: DependencyToolResult[];
  starts: CallStart[];
  omittedCount: number;
  omittedTodoIds: string[];
}

export interface DependencyEvent {
  runId: string;
  seq: number;
  eventType: string;
  payload?: unknown;
  payloadJson?: string;
}

const MAX_RESULTS = 32;
const MAX_STARTS = 128;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function text(value: unknown, limit = 200): string | null {
  return typeof value === 'string' && value.trim() ? value.slice(0, limit) : null;
}

function identity(value: unknown): string | null {
  return typeof value === 'string' && value.trim() && value.length <= 256 ? value : null;
}

function integer(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function boolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.slice(0, MAX_RESULTS).map(identity).filter((item): item is string => item !== null)
    : [];
}

export function dependencyEventPayload(event: Pick<DependencyEvent, 'payload' | 'payloadJson'>): Record<string, unknown> {
  const payload = record(event.payload);
  if (payload) return payload;
  try {
    return record(JSON.parse(event.payloadJson ?? '{}')) ?? {};
  } catch {
    return {};
  }
}

export function createDependencyReadinessState(runId: string | null = null): DependencyReadinessState {
  return {
    runId, report: null, planGeneration: null, checkEventSeq: 0, resultAfterSeq: 0,
    resumeEventSeq: 0, restartEventSeq: 0, requiresStartProof: false,
    prepared: false, frozenReuse: false, results: [], otherResults: [], starts: [],
    omittedCount: 0, omittedTodoIds: [],
  };
}

function parseReport(value: unknown): DependencyCheckReport | null {
  const raw = record(value);
  if (!raw || raw.version !== 1 || !Array.isArray(raw.hints)) return null;
  const hints: DependencyHint[] = [];
  for (const item of raw.hints.slice(0, MAX_RESULTS)) {
    const hint = record(item);
    if (!hint) continue;
    const basis = hint.basis === 'REFERENCE_STATE' || hint.basis === 'CONFIG_PRESENT' || hint.basis === 'TOOL_AVAILABILITY'
      ? hint.basis : 'NONE';
    const todoId = hint.todoId === '' ? '' : identity(hint.todoId);
    const toolName = hint.toolName === '' ? '' : identity(hint.toolName);
    const dependencyId = identity(hint.dependencyId);
    const status = todoId !== null && toolName !== null && dependencyId !== null && basis !== 'NONE'
      && (hint.status === 'AVAILABLE' || hint.status === 'UNAVAILABLE') ? hint.status : 'UNCHECKED';
    hints.push({
      todoId, toolName, dependencyId, dependencyLabel: text(hint.dependencyLabel) ?? '检查对象未明确',
      status, basis, reason: text(hint.reason, 600) ?? '尚未取得检查依据',
    });
  }
  return {
    checkedAt: text(raw.checkedAt) ?? '', checkedPlanGeneration: integer(raw.checkedPlanGeneration), hints,
    omittedCount: (integer(raw.omittedCount) ?? 0) + Math.max(0, raw.hints.length - MAX_RESULTS),
    omittedTodoIds: strings(raw.omittedTodoIds), omittedTodoCount: integer(raw.omittedTodoCount) ?? 0,
    truncated: raw.truncated === true,
  };
}

function mergeReport(current: DependencyCheckReport | null, incoming: DependencyCheckReport | null): DependencyCheckReport | null {
  if (!incoming) return current;
  if (!current) return incoming;
  if ((incoming.checkedPlanGeneration ?? -1) < (current.checkedPlanGeneration ?? -1)) return current;
  if (incoming.checkedAt === current.checkedAt && incoming.checkedPlanGeneration === current.checkedPlanGeneration) {
    if ((!current.truncated && incoming.truncated) || current.hints.length > incoming.hints.length) return current;
  }
  return incoming;
}

function resultKey(result: DependencyToolResult): string {
  return result.planGeneration !== null && result.todoId && result.toolCallId
    ? JSON.stringify([result.planGeneration, result.todoId, result.toolName, result.toolCallId])
    : `event:${result.eventSeq}`;
}

function mergeResults(results: DependencyToolResult[]): DependencyToolResult[] {
  const merged = new Map<string, DependencyToolResult>();
  for (const result of results) {
    const key = resultKey(result);
    const previous = merged.get(key);
    const rank = (item: DependencyToolResult) => item.businessSuccess === null ? 0 : item.source === 'synchronous' ? 1 : 2;
    if (!previous || rank(result) > rank(previous)
      || (rank(result) === rank(previous) && result.eventSeq >= previous.eventSeq)) {
      merged.set(key, result);
    }
  }
  return [...merged.values()].sort((a, b) => b.eventSeq - a.eventSeq);
}

function reconcile(state: DependencyReadinessState, incoming: DependencyToolResult[] = []): DependencyReadinessState {
  const current: DependencyToolResult[] = [];
  const other: DependencyToolResult[] = [];
  const all = [...state.otherResults, ...state.results, ...incoming];
  const verifiedCalls = new Set(all.filter((result) => result.verifiedAfterSeq === state.resultAfterSeq).map(resultKey));
  for (const original of all) {
    let result = original;
    if (result.planGeneration === null && result.source === 'synchronous' && result.toolCallId) {
      const start = state.starts.find((item) => item.toolCallId === result.toolCallId && item.toolName === result.toolName
        && (!result.todoId || item.todoId === result.todoId) && item.eventSeq <= result.eventSeq
        && item.eventSeq > state.resultAfterSeq && item.planGeneration === state.planGeneration);
      if (start) result = { ...result, planGeneration: start.planGeneration, todoId: result.todoId ?? start.todoId };
    }
    const verified = verifiedCalls.has(resultKey(result));
    if (verified) result = { ...result, verifiedAfterSeq: state.resultAfterSeq };
    const started = state.starts.some((item) => item.toolCallId === result.toolCallId && item.toolName === result.toolName
      && item.todoId === result.todoId && item.planGeneration === result.planGeneration
      && item.eventSeq > state.resultAfterSeq && item.eventSeq <= result.eventSeq);
    const isCurrent = state.prepared && state.planGeneration !== null && result.planGeneration === state.planGeneration
      && result.eventSeq > state.resultAfterSeq && !!result.todoId && !!result.toolCallId
      && (!state.requiresStartProof || verified || started)
      && (result.source !== 'wait_member' || result.memberState === 'SUCCEEDED' || result.memberState === 'FAILED');
    (isCurrent ? current : other).push(result);
  }
  const results = mergeResults(current);
  const omitted = results.slice(MAX_RESULTS);
  return {
    ...state, results: results.slice(0, MAX_RESULTS), otherResults: mergeResults(other).slice(0, MAX_RESULTS),
    // 实时窗口只提供省略数量下限，重复或补拉旧事件不累加数量。
    omittedCount: Math.max(state.omittedCount, omitted.length),
    omittedTodoIds: [...new Set([...state.omittedTodoIds, ...omitted.flatMap((item) => item.todoId ? [item.todoId] : [])])].slice(0, MAX_RESULTS),
  };
}

function parseResult(raw: Record<string, unknown>, eventSeq: number, mode: 'snapshot' | 'recorded' | 'synchronous' = 'snapshot'): DependencyToolResult | null {
  const sync = mode === 'synchronous';
  const source = sync ? 'synchronous' : raw.source;
  if (source !== 'wait_member' && source !== 'tool_job_anchor' && !(source === 'synchronous' && mode !== 'recorded')) return null;
  const toolName = identity(raw.tool_name ?? raw.toolName);
  if (!toolName || eventSeq <= 0) return null;
  const memberState = text(raw.member_state, 80);
  const terminalMember = source !== 'wait_member' || memberState === 'SUCCEEDED' || memberState === 'FAILED';
  // 旧后台完成事件的 success 表示任务进程终态，业务结论由独立结果通知提供。
  const legacyTask = sync && (raw.operation_id != null || raw.task_id != null || raw.status != null);
  return {
    planGeneration: integer(raw.plan_generation), todoId: identity(raw.todo_id ?? raw.todoId), toolName,
    toolCallId: identity(raw.tool_call_id ?? raw.toolCallId), eventSeq, source,
    businessSuccess: !terminalMember ? null : sync ? (legacyTask ? null : boolean(raw.success)) : boolean(raw.business_success),
    executed: boolean(raw.executed), errorCode: text(raw.error_code, 100),
    taskStatus: text(raw.task_status ?? (legacyTask ? raw.status : null), 80), memberState,
  };
}

export function applyDependencySnapshot(
  previous: DependencyReadinessState, plan: unknown, runId: string | null = previous.runId,
): DependencyReadinessState {
  const state = runId !== previous.runId ? createDependencyReadinessState(runId) : previous;
  const raw = record(plan);
  if (!raw) return state;
  const report = mergeReport(state.report, parseReport(raw.dependencyCheck));
  const view = record(raw.dependencyExecution);
  if (!view) return { ...state, report };
  const generation = integer(view.plan_generation);
  const checkSeq = integer(view.check_event_seq) ?? 0;
  const resultAfterSeq = integer(view.result_after_seq) ?? checkSeq;
  const resumeSeq = integer(view.resume_event_seq) ?? 0;
  if (generation === null || (state.planGeneration !== null && generation < state.planGeneration)) return state;
  if (generation === state.planGeneration && (resultAfterSeq < state.resultAfterSeq
    || Math.max(checkSeq, resumeSeq) < Math.max(state.checkEventSeq, state.resumeEventSeq))) {
    return { ...state, report };
  }
  const changed = generation !== state.planGeneration || resultAfterSeq > state.resultAfterSeq;
  const keepBoundary = state.prepared && !changed;
  const next: DependencyReadinessState = {
    ...state, report, planGeneration: generation,
    checkEventSeq: generation === state.planGeneration ? Math.max(state.checkEventSeq, checkSeq) : checkSeq,
    resultAfterSeq,
    resumeEventSeq: Math.max(state.resumeEventSeq, resumeSeq),
    // 是否重新执行采用明确的后端事实或已收到的重启事件，不从普通恢复序号推断。
    requiresStartProof: state.requiresStartProof || view.requires_start_proof === true,
    prepared: keepBoundary || (view.prepared === true && checkSeq > 0),
    frozenReuse: !keepBoundary || checkSeq >= state.checkEventSeq ? view.frozen_reuse === true : state.frozenReuse,
    starts: state.starts.filter((item) => item.planGeneration === generation && item.eventSeq > resultAfterSeq),
    omittedCount: Math.max(changed ? 0 : state.omittedCount, integer(view.omitted_count) ?? 0),
    omittedTodoIds: strings(view.omitted_todo_ids),
  };
  const results = Array.isArray(view.results) ? view.results.slice(0, MAX_RESULTS).flatMap((item) => {
    const value = record(item);
    const result = value ? parseResult(value, integer(value.event_seq) ?? 0) : null;
    return result ? [{ ...result, verifiedAfterSeq: resultAfterSeq }] : [];
  }) : [];
  return reconcile(next, results);
}

export function applyDependencyEvent(previous: DependencyReadinessState, event: DependencyEvent): DependencyReadinessState {
  if (previous.runId && event.runId !== previous.runId) return previous;
  const state = previous.runId ? previous : { ...previous, runId: event.runId };
  const seq = integer(event.seq) ?? 0;
  if (seq <= 0) return state;
  const payload = dependencyEventPayload(event);
  const generation = integer(payload.plan_generation);
  if (event.eventType === 'WORKFLOW_RESUMED') {
    if (seq <= state.resumeEventSeq || (generation !== null && state.planGeneration !== null && generation < state.planGeneration)) return state;
    return { ...state, resumeEventSeq: seq };
  }
  if (event.eventType === 'WORKFLOW_RESTARTED') {
    if (seq <= state.restartEventSeq) return state;
    if (seq <= state.resultAfterSeq) {
      // 历史事件补拉只补全已知边界的性质，不清除安全快照中的新轮结果。
      return reconcile({ ...state, restartEventSeq: seq, requiresStartProof: true });
    }
    return reconcile({
      ...state, restartEventSeq: seq, resumeEventSeq: Math.max(state.resumeEventSeq, seq),
      resultAfterSeq: seq, prepared: false, frozenReuse: false, requiresStartProof: true,
      starts: state.starts.filter((item) => item.eventSeq > seq), omittedCount: 0, omittedTodoIds: [],
    });
  }
  if (event.eventType === 'DEPENDENCIES_CHECKED') {
    if (state.prepared && seq === state.checkEventSeq && generation === state.planGeneration) {
      return { ...state, report: mergeReport(state.report, parseReport(payload.report)) };
    }
    if (seq <= Math.max(state.checkEventSeq, state.restartEventSeq)
      || (generation !== null && state.planGeneration !== null && generation < state.planGeneration)) return state;
    const report = mergeReport(state.report, parseReport(payload.report));
    if (generation === null) return { ...state, report };
    // 同一准备阶段的重复通知补充报告，不移动已生效的边界或清除调用结果。
    if (state.prepared && state.planGeneration === generation) {
      return { ...state, report, checkEventSeq: seq, frozenReuse: payload.frozen_reuse === true };
    }
    const changed = generation !== state.planGeneration;
    return reconcile({
      ...state, report, planGeneration: generation, checkEventSeq: seq, resultAfterSeq: seq, prepared: true,
      frozenReuse: payload.frozen_reuse === true, starts: changed ? [] : state.starts,
      results: changed ? [] : state.results,
      otherResults: changed ? mergeResults([...state.otherResults, ...state.results]).slice(0, MAX_RESULTS) : state.otherResults,
      omittedCount: changed ? 0 : state.omittedCount, omittedTodoIds: changed ? [] : state.omittedTodoIds,
    });
  }
  if (event.eventType === 'TOOL_CALL_STARTED') {
    if (state.planGeneration === null || seq <= state.resultAfterSeq
      || (generation !== null && generation !== state.planGeneration)) return state;
    const toolCallId = identity(payload.tool_call_id ?? payload.toolCallId);
    const toolName = identity(payload.tool_name ?? payload.toolName);
    const todoId = identity(payload.todo_id ?? payload.todoId);
    if (!toolCallId || !toolName || !todoId) return state;
    const start = { toolCallId, toolName, todoId, planGeneration: generation ?? state.planGeneration, eventSeq: seq };
    const previousStart = state.starts.find((item) => item.toolCallId === toolCallId && item.toolName === toolName && item.todoId === todoId);
    if (previousStart && previousStart.eventSeq >= seq) return state;
    const starts = [start, ...state.starts.filter((item) => item.toolCallId !== toolCallId || item.toolName !== toolName || item.todoId !== todoId)]
      .sort((a, b) => b.eventSeq - a.eventSeq).slice(0, MAX_STARTS);
    return reconcile({ ...state, starts });
  }
  if (event.eventType === 'TOOL_CALL_FINISHED' || event.eventType === 'TOOL_RESULT_RECORDED') {
    const result = parseResult(payload, seq, event.eventType === 'TOOL_CALL_FINISHED' ? 'synchronous' : 'recorded');
    return result ? reconcile(state, [result]) : state;
  }
  return state;
}

export function buildDependencyReadiness(plan: unknown, events: DependencyEvent[], runId: string | null): DependencyReadinessState {
  return [...events].sort((a, b) => a.seq - b.seq).reduce(
    applyDependencyEvent, applyDependencySnapshot(createDependencyReadinessState(runId), plan, runId),
  );
}
