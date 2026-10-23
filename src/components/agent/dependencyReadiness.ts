export interface DependencyHint {
  todoId: string;
  toolName: string;
  dependencyId: string;
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

export interface DependencyToolResult {
  planGeneration: number | null;
  todoId: string | null;
  toolName: string;
  toolCallId: string | null;
  eventSeq: number;
  source: string;
  businessSuccess: boolean | null;
  executed: boolean | null;
  errorCode: string | null;
  taskStatus: string | null;
  memberState: string | null;
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
  resumeEventSeq: number;
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

function integer(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function boolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.slice(0, MAX_RESULTS).map((item) => text(item)).filter((item): item is string => item !== null)
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
    runId, report: null, planGeneration: null, checkEventSeq: 0, resumeEventSeq: 0,
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
    const status = basis !== 'NONE' && (hint.status === 'AVAILABLE' || hint.status === 'UNAVAILABLE') ? hint.status : 'UNCHECKED';
    hints.push({
      todoId: text(hint.todoId) ?? '', toolName: text(hint.toolName) ?? '未指定工具',
      dependencyId: text(hint.dependencyId) ?? '', dependencyLabel: text(hint.dependencyLabel) ?? '检查对象未明确',
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
    if (previous && previous.businessSuccess !== null && result.businessSuccess === null) continue;
    if (!previous || result.eventSeq >= previous.eventSeq || (previous.businessSuccess === null && result.businessSuccess !== null)) {
      merged.set(key, result);
    }
  }
  return [...merged.values()].sort((a, b) => b.eventSeq - a.eventSeq);
}

function reconcile(state: DependencyReadinessState, incoming: DependencyToolResult[] = []): DependencyReadinessState {
  const current: DependencyToolResult[] = [];
  const other: DependencyToolResult[] = [];
  for (const original of mergeResults([...state.otherResults, ...state.results, ...incoming])) {
    let result = original;
    if (result.planGeneration === null && result.source === 'synchronous' && result.toolCallId) {
      const start = state.starts.find((item) => item.toolCallId === result.toolCallId && item.toolName === result.toolName
        && (!result.todoId || item.todoId === result.todoId) && item.eventSeq <= result.eventSeq);
      if (start) result = { ...result, planGeneration: start.planGeneration, todoId: result.todoId ?? start.todoId };
    }
    const isCurrent = state.prepared && state.planGeneration !== null && result.planGeneration === state.planGeneration
      && result.eventSeq > state.checkEventSeq && result.eventSeq > state.resumeEventSeq && !!result.todoId && !!result.toolCallId;
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

function parseResult(raw: Record<string, unknown>, eventSeq: number, sync = false): DependencyToolResult | null {
  const toolName = text(raw.tool_name ?? raw.toolName);
  if (!toolName || eventSeq <= 0) return null;
  // 旧后台完成事件的 success 表示任务进程终态，业务结论由独立结果通知提供。
  const legacyTask = sync && (raw.operation_id != null || raw.task_id != null || raw.status != null);
  return {
    planGeneration: integer(raw.plan_generation), todoId: text(raw.todo_id ?? raw.todoId), toolName,
    toolCallId: text(raw.tool_call_id ?? raw.toolCallId, 500), eventSeq,
    source: sync ? 'synchronous' : text(raw.source) ?? 'recorded',
    businessSuccess: sync ? (legacyTask ? null : boolean(raw.success)) : boolean(raw.business_success),
    executed: boolean(raw.executed), errorCode: text(raw.error_code, 100),
    taskStatus: text(raw.task_status ?? (legacyTask ? raw.status : null), 80), memberState: text(raw.member_state, 80),
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
  const resumeSeq = integer(view.resume_event_seq) ?? 0;
  if (generation === null || (state.planGeneration !== null && generation < state.planGeneration)) return state;
  if (generation === state.planGeneration && Math.max(checkSeq, resumeSeq) < Math.max(state.checkEventSeq, state.resumeEventSeq)) {
    return { ...state, report };
  }
  const changed = generation !== state.planGeneration || resumeSeq > state.resumeEventSeq;
  const keepBoundary = state.prepared && !changed;
  const next: DependencyReadinessState = {
    ...state, report, planGeneration: generation,
    checkEventSeq: keepBoundary ? state.checkEventSeq : checkSeq,
    resumeEventSeq: Math.max(state.resumeEventSeq, resumeSeq),
    prepared: keepBoundary || (view.prepared === true && checkSeq > resumeSeq && checkSeq > 0),
    frozenReuse: keepBoundary ? state.frozenReuse : view.frozen_reuse === true,
    results: changed ? [] : state.results, starts: changed ? [] : state.starts,
    otherResults: changed ? mergeResults([...state.otherResults, ...state.results]).slice(0, MAX_RESULTS) : state.otherResults,
    omittedCount: Math.max(changed ? 0 : state.omittedCount, integer(view.omitted_count) ?? 0),
    omittedTodoIds: strings(view.omitted_todo_ids),
  };
  const results = Array.isArray(view.results) ? view.results.slice(0, MAX_RESULTS).flatMap((item) => {
    const value = record(item);
    const result = value ? parseResult(value, integer(value.event_seq) ?? 0) : null;
    return result ? [result] : [];
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
    if (seq <= Math.max(state.resumeEventSeq, state.checkEventSeq)
      || (generation !== null && state.planGeneration !== null && (generation < state.planGeneration
        || (state.prepared && generation === state.planGeneration)))) return state;
    return {
      ...state, planGeneration: generation ?? state.planGeneration, resumeEventSeq: seq,
      prepared: false, frozenReuse: false, results: [], starts: [], omittedCount: 0, omittedTodoIds: [],
      otherResults: mergeResults([...state.otherResults, ...state.results]).slice(0, MAX_RESULTS),
    };
  }
  if (event.eventType === 'DEPENDENCIES_CHECKED') {
    if (state.prepared && seq === state.checkEventSeq && generation === state.planGeneration) {
      return { ...state, report: mergeReport(state.report, parseReport(payload.report)) };
    }
    if (seq <= Math.max(state.checkEventSeq, state.resumeEventSeq)
      || (generation !== null && state.planGeneration !== null && generation < state.planGeneration)) return state;
    const report = mergeReport(state.report, parseReport(payload.report));
    if (generation === null) return { ...state, report };
    // 同一准备阶段的重复通知补充报告，不移动已生效的边界或清除调用结果。
    if (state.prepared && state.planGeneration === generation) return { ...state, report };
    const changed = generation !== state.planGeneration;
    return reconcile({
      ...state, report, planGeneration: generation, checkEventSeq: seq, prepared: true,
      frozenReuse: payload.frozen_reuse === true, starts: changed ? [] : state.starts,
      results: changed ? [] : state.results,
      otherResults: changed ? mergeResults([...state.otherResults, ...state.results]).slice(0, MAX_RESULTS) : state.otherResults,
      omittedCount: changed ? 0 : state.omittedCount, omittedTodoIds: changed ? [] : state.omittedTodoIds,
    });
  }
  if (event.eventType === 'TOOL_CALL_STARTED') {
    if (!state.prepared || state.planGeneration === null || seq <= Math.max(state.checkEventSeq, state.resumeEventSeq)
      || (generation !== null && generation !== state.planGeneration)) return state;
    const toolCallId = text(payload.tool_call_id ?? payload.toolCallId, 500);
    const toolName = text(payload.tool_name ?? payload.toolName);
    const todoId = text(payload.todo_id ?? payload.todoId);
    if (!toolCallId || !toolName || !todoId) return state;
    const start = { toolCallId, toolName, todoId, planGeneration: generation ?? state.planGeneration, eventSeq: seq };
    const starts = [start, ...state.starts.filter((item) => item.toolCallId !== toolCallId || item.toolName !== toolName || item.todoId !== todoId)]
      .sort((a, b) => b.eventSeq - a.eventSeq).slice(0, MAX_STARTS);
    return reconcile({ ...state, starts });
  }
  if (event.eventType === 'TOOL_CALL_FINISHED' || event.eventType === 'TOOL_RESULT_RECORDED') {
    const result = parseResult(payload, seq, event.eventType === 'TOOL_CALL_FINISHED');
    return result ? reconcile(state, [result]) : state;
  }
  return state;
}

export function buildDependencyReadiness(plan: unknown, events: DependencyEvent[], runId: string | null): DependencyReadinessState {
  return [...events].sort((a, b) => a.seq - b.seq).reduce(
    applyDependencyEvent, applyDependencySnapshot(createDependencyReadinessState(runId), plan, runId),
  );
}
