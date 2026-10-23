import '../agent-v2.css';
import { useMemo } from 'react';
import { ComposerPrimitive } from '@assistant-ui/react';
import { Link } from 'react-router-dom';
import { deriveIsRunning } from '../adapter/convertRunToThreadMessages';
import { ChatShell } from '../components/chat/ChatShell';
import { DagFlowGraph } from '../components/execution/DagFlowGraph';
import { LinearStepper } from '../components/execution/LinearStepper';
import { RunListSidebar } from '../components/sidebar/RunListSidebar';
import { useExecutionState } from '../hooks/useExecutionState';
import { useRunStatusPoll } from '../hooks/useRunStatusPoll';
import { useAgentV2Store, type AgentViewMode } from '../store/agentV2Store';
import { RunDetailPanel } from './RunDetailPanel';

import type { AgentRun } from '../../api/agent';
import { DependencyReadinessNotice } from '../../components/agent/DependencyReadinessNotice';

interface AgentV2LayoutProps {
  runId: string | null;
  connected: boolean;
  streamError: string | null;
  lastSeq: number;
  runs: AgentRun[];
  runsLoading: boolean;
  runsError: string | null;
  onRefreshRuns: () => void;
  onReconnect?: () => void;
}

export function AgentV2Layout({
  runId,
  connected,
  streamError,
  lastSeq,
  runs,
  runsLoading,
  runsError,
  onRefreshRuns,
  onReconnect,
}: AgentV2LayoutProps) {
  const viewMode = useAgentV2Store((s) => s.viewMode);
  const setViewMode = useAgentV2Store((s) => s.setViewMode);
  const parts = useAgentV2Store((s) => s.parts);
  const repairInFlight = useAgentV2Store((s) => s.repairInFlight);
  const connectionNote = useAgentV2Store((s) => s.connectionNote);
  const lastRepairApplied = useAgentV2Store((s) => s.lastRepairApplied);
  const controlError = useAgentV2Store((s) => s.controlError);
  const selectedTodoId = useAgentV2Store((s) => s.selectedTodoId);
  const setSelectedTodoId = useAgentV2Store((s) => s.setSelectedTodoId);
  const {
    execution,
    planItems,
    nodeStatus,
    currentTodoId,
    durationMs,
    hasPlan,
    isDag,
    isLinear,
  } = useExecutionState();

  const isRunning = useMemo(() => deriveIsRunning(parts, connected), [parts, connected]);
  const { status: restStatus, error: restStatusError } = useRunStatusPoll(
    runId,
    Boolean(runId) && isRunning
  );

  const tab = (mode: AgentViewMode, label: string) => (
    <button
      type="button"
      onClick={() => setViewMode(mode)}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        viewMode === mode
          ? 'bg-sky-600 text-white'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-base font-semibold text-slate-900">Agent Chat v2</h1>
            <p className="text-xs text-slate-500">Phase 2c · result / artifacts / node</p>
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {tab('chat', 'Chat')}
            {tab('process', 'Process')}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2 py-0.5 ${connected ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}
          >
            {connected ? 'SSE' : 'offline'}
          </span>
          {repairInFlight ? (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-800">repairing</span>
          ) : null}
          {connectionNote ? (
            <span className="max-w-[200px] truncate text-slate-500" title={connectionNote}>
              {connectionNote}
            </span>
          ) : null}
          {hasPlan ? (
            <span className="text-slate-500">{isDag ? 'DAG' : isLinear ? 'Linear' : execution.workflow}</span>
          ) : null}
          {runId ? <span className="max-w-[140px] truncate text-slate-500">{runId}</span> : null}
          {lastSeq > 0 ? <span className="text-slate-400">seq {lastSeq}</span> : null}
          {runId && onReconnect ? (
            <button type="button" onClick={onReconnect} className="text-sky-600 hover:underline">
              重连
            </button>
          ) : null}
          <Link to="/app/chat" className="text-sky-600 hover:underline">
            v1
          </Link>
        </div>
      </header>

      {controlError ? (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {controlError}
        </div>
      ) : null}

      {streamError ? (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {streamError}
          {runId && onReconnect ? (
            <button
              type="button"
              onClick={onReconnect}
              className="ml-2 font-medium text-red-800 underline"
            >
              重连并补洞
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside className="hidden h-full min-h-0 w-52 shrink-0 flex-col border-r border-slate-200 bg-white p-3 lg:flex">
          <RunListSidebar
            runs={runs}
            activeRunId={runId}
            loading={runsLoading}
            error={runsError}
            onRefresh={onRefreshRuns}
          />
        </aside>

        <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {runId && (!execution.dependencyReadiness.runId || execution.dependencyReadiness.runId === runId) && (
            <div className="max-h-80 shrink-0 overflow-y-auto border-b border-slate-100 p-3">
              <DependencyReadinessNotice state={execution.dependencyReadiness} />
            </div>
          )}
          {viewMode === 'chat' ? (
            <ChatShell />
          ) : (
            <div className="agent-v2-scroll h-full min-h-0 flex-1">
              {isDag ? (
                <DagFlowGraph
                  execution={execution}
                  selectedTodoId={selectedTodoId}
                  onSelectTodo={setSelectedTodoId}
                />
              ) : (
                <LinearStepper
                  planItems={planItems}
                  nodeStatus={nodeStatus}
                  currentTodoId={currentTodoId}
                  selectedTodoId={selectedTodoId}
                  durationMs={durationMs}
                  onSelectTodo={setSelectedTodoId}
                />
              )}
            </div>
          )}
        </main>

        <aside className="hidden h-full min-h-0 w-80 shrink-0 flex-col border-l border-slate-200 bg-white p-3 md:flex lg:w-96 xl:min-w-[24rem]">
          <RunDetailPanel
            runId={runId}
            parts={parts}
            connected={connected}
            lastSeq={lastSeq}
            repairInFlight={repairInFlight}
            connectionNote={connectionNote}
            lastRepairApplied={lastRepairApplied}
            controlError={controlError}
            restStatus={restStatus}
            restStatusError={restStatusError}
          />
        </aside>
      </div>

      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
        <ComposerPrimitive.Root className="mx-auto flex max-w-3xl gap-2">
          <ComposerPrimitive.Input
            placeholder={runId ? '追问或继续对话…' : '输入问题开始新 run…'}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 disabled:bg-slate-50"
          />
          <ComposerPrimitive.Send className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {runId ? '发送' : '新 run'}
          </ComposerPrimitive.Send>
          <ComposerPrimitive.Cancel className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">
            取消
          </ComposerPrimitive.Cancel>
        </ComposerPrimitive.Root>
      </footer>
    </div>
  );
}
