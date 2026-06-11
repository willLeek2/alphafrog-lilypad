import { useMemo, useState } from 'react';
import type { AgentRunStatus, Artifact } from '../../api/agent';
import { deriveIsTerminal } from '../adapter/convertRunToThreadMessages';
import { useExecutionState } from '../hooks/useExecutionState';
import { useRunSidecar } from '../hooks/useRunSidecar';
import { useAgentV2Store } from '../store/agentV2Store';
import type { AgentMessagePart } from '../types/messagePart';
import type { TodoPlanItem, TodoNodeStatus } from '../types/runTypes';
import { NodeEventCard } from '../components/execution/NodeEventCard';
import { artifactDownloadHref } from '../utils/artifacts';
import { buildNodeTimeline } from '../utils/mergeNodeTimeline';
import { useIsAdmin } from '../../hooks/useIsAdmin';

export type DetailPanelTab = 'run' | 'plan' | 'node' | 'artifacts';

interface RunDetailPanelProps {
  runId: string | null;
  parts: AgentMessagePart[];
  connected: boolean;
  lastSeq: number;
  repairInFlight: boolean;
  connectionNote: string | null;
  lastRepairApplied: number;
  controlError: string | null;
  restStatus: AgentRunStatus | null;
  restStatusError: string | null;
}

function findRunStatusPart(parts: AgentMessagePart[]) {
  return parts.find((p) => p.type === 'run_status');
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-[10px] font-medium ${
        active ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {label}
    </button>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return <p className="py-4 text-center text-xs text-slate-400">{label}</p>;
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-red-100 bg-red-50 px-2 py-2 text-xs text-red-700">
      {message}
    </p>
  );
}

function ArtifactRow({ artifact }: { artifact: Artifact }) {
  const href = artifact.url ?? artifactDownloadHref(artifact.artifactId);
  return (
    <li className="rounded-md border border-slate-100 bg-white px-2 py-2 text-xs">
      <p className="font-medium text-slate-900">{artifact.name}</p>
      <p className="text-slate-500">
        {artifact.type} · {artifact.contentType}
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-sky-600 hover:underline"
      >
        打开 / 下载
      </a>
    </li>
  );
}

export function RunDetailPanel({
  runId,
  parts,
  connected,
  lastSeq,
  repairInFlight,
  connectionNote,
  lastRepairApplied,
  controlError,
  restStatus,
  restStatusError,
}: RunDetailPanelProps) {
  const [tab, setTab] = useState<DetailPanelTab>('run');
  const selectedTodoId = useAgentV2Store((s) => s.selectedTodoId);
  const isTerminal = useMemo(() => deriveIsTerminal(parts), [parts]);
  const {
    execution,
    planItems,
    nodeStatus,
    currentTodoId,
    durationMs,
    startedAtMs,
    hasPlan,
    isDag,
    isLinear,
  } = useExecutionState();

  const runStatusPart = findRunStatusPart(parts);
  const effectiveTodoId = selectedTodoId ?? currentTodoId ?? null;
  const sidecar = useRunSidecar(
    runId,
    isTerminal,
    isTerminal || Boolean(effectiveTodoId)
  );
  const isAdmin = useIsAdmin();
  const selectedItem: TodoPlanItem | undefined = effectiveTodoId
    ? planItems.find((p) => p.id === effectiveTodoId)
    : undefined;
  const selectedStatus: TodoNodeStatus | undefined = effectiveTodoId
    ? nodeStatus[effectiveTodoId]
    : undefined;

  const nodeTimeline = useMemo(
    () =>
      buildNodeTimeline(parts, sidecar.traceSpans, effectiveTodoId, {
        nodeStatus: execution.nodeStatus,
        skippedReasons: execution.skippedReasons,
      }),
    [parts, sidecar.traceSpans, effectiveTodoId, execution.nodeStatus, execution.skippedReasons]
  );

  const sseStatus = runStatusPart?.type === 'run_status' ? runStatusPart.status : '—';
  const ssePhase = runStatusPart?.type === 'run_status' ? runStatusPart.phase : undefined;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-3 flex flex-wrap gap-1">
        <TabButton active={tab === 'run'} label="Run" onClick={() => setTab('run')} />
        <TabButton active={tab === 'plan'} label="Plan" onClick={() => setTab('plan')} />
        <TabButton active={tab === 'node'} label="Node" onClick={() => setTab('node')} />
        <TabButton active={tab === 'artifacts'} label="Artifacts" onClick={() => setTab('artifacts')} />
      </div>

      <div className="agent-v2-scroll min-h-0 flex-1 text-sm">
        {tab === 'run' ? (
          <dl className="space-y-1.5 text-xs text-slate-700">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">SSE</dt>
              <dd>{connected ? 'connected' : 'disconnected'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Status</dt>
              <dd className="font-medium">{sseStatus}</dd>
            </div>
            {ssePhase ? (
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Phase</dt>
                <dd>{ssePhase}</dd>
              </div>
            ) : null}
            {restStatus ? (
              <>
                <div className="flex justify-between gap-2 border-t border-slate-100 pt-1.5">
                  <dt className="text-slate-500">REST status</dt>
                  <dd>{restStatus.status}</dd>
                </div>
                {restStatus.phase ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">REST phase</dt>
                    <dd>{restStatus.phase}</dd>
                  </div>
                ) : null}
                {restStatus.currentTool ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Tool</dt>
                    <dd className="truncate">{restStatus.currentTool}</dd>
                  </div>
                ) : null}
              </>
            ) : null}
            {restStatusError ? <ErrorBlock message={`REST: ${restStatusError}`} /> : null}
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">lastSeq</dt>
              <dd>{lastSeq}</dd>
            </div>
            {connectionNote ? (
              <p className="text-[10px] text-sky-800">{connectionNote}</p>
            ) : null}
            {repairInFlight ? (
              <p className="text-[10px] text-sky-700">正在补拉 events…</p>
            ) : null}
            {lastRepairApplied > 0 && !repairInFlight ? (
              <p className="text-[10px] text-slate-500">上次补洞 +{lastRepairApplied} 条</p>
            ) : null}
            {controlError ? <ErrorBlock message={controlError} /> : null}
            {runId ? (
              <p className="break-all text-[10px] text-slate-400">{runId}</p>
            ) : null}
          </dl>
        ) : null}

        {tab === 'plan' ? (
          !hasPlan ? (
            <p className="text-xs text-slate-400">等待 PLAN_READY…</p>
          ) : (
            <dl className="space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Workflow</dt>
                <dd>{isDag ? 'DAG' : isLinear ? 'Linear' : execution.workflow}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Todos</dt>
                <dd>{planItems.length}</dd>
              </div>
              <ul className="mt-2 space-y-1">
                {planItems.map((item) => (
                  <li
                    key={item.id}
                    className={`rounded px-1.5 py-1 text-[10px] ${
                      item.id === effectiveTodoId ? 'bg-sky-50 text-sky-900' : 'text-slate-600'
                    }`}
                  >
                    #{item.sequence} {item.description.slice(0, 56)}
                    {item.description.length > 56 ? '…' : ''}
                  </li>
                ))}
              </ul>
            </dl>
          )
        ) : null}

        {tab === 'node' ? (
          !selectedItem ? (
            <p className="text-xs text-slate-400">在 Process 视图点击节点查看摘要</p>
          ) : (
            <div className="space-y-4">
              <dl className="space-y-1.5 text-xs text-slate-700">
                <div>
                  <dt className="text-slate-500">Description</dt>
                  <dd>{selectedItem.description}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Status</dt>
                  <dd className="font-medium">{selectedStatus ?? 'pending'}</dd>
                </div>
                {selectedItem.suggested_tool ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Suggested</dt>
                    <dd>{selectedItem.suggested_tool}</dd>
                  </div>
                ) : null}
                {durationMs[selectedItem.id] != null ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Duration</dt>
                    <dd>{durationMs[selectedItem.id]} ms</dd>
                  </div>
                ) : null}
                {startedAtMs[selectedItem.id] != null && durationMs[selectedItem.id] == null ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Started</dt>
                    <dd>{new Date(startedAtMs[selectedItem.id]).toLocaleTimeString()}</dd>
                  </div>
                ) : null}
              </dl>

              <section>
                <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Tool / LLM 时间线
                </h4>
                {sidecar.tracesLoading && nodeTimeline.length === 0 ? (
                  <LoadingBlock label="加载事件…" />
                ) : sidecar.tracesError && nodeTimeline.length === 0 ? (
                  <ErrorBlock message={sidecar.tracesError} />
                ) : nodeTimeline.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    该节点暂无 tool/LLM 记录（若 run 仍在进行，请稍后或确认事件是否带 todo_id）
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {nodeTimeline.map((item) => (
                      <NodeEventCard key={item.key} item={item} runId={runId} />
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )
        ) : null}

        {tab === 'artifacts' ? (
          <div className="space-y-4">
            <section>
              <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Result
              </h4>
              {!runId ? (
                <p className="text-xs text-slate-400">选择或开始 run</p>
              ) : !isTerminal ? (
                <p className="text-xs text-slate-400">run 结束后加载最终结果</p>
              ) : sidecar.resultLoading ? (
                <LoadingBlock label="加载结果…" />
              ) : sidecar.resultError && !sidecar.resultText ? (
                <ErrorBlock message={sidecar.resultError} />
              ) : sidecar.runResult?.partial ? (
                <PartialResultBlock
                  runResult={sidecar.runResult}
                  isAdmin={isAdmin}
                />
              ) : sidecar.resultText ? (
                <p className="whitespace-pre-wrap rounded-md border border-slate-100 bg-slate-50 p-2 text-xs text-slate-800">
                  {sidecar.resultText}
                </p>
              ) : (
                <p className="text-xs text-slate-400">暂无结果文本</p>
              )}
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h4 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Artifacts
                </h4>
                {isTerminal && runId ? (
                  <button
                    type="button"
                    onClick={() => void sidecar.refresh()}
                    className="text-[10px] text-sky-600 hover:underline"
                  >
                    刷新
                  </button>
                ) : null}
              </div>
              {!runId ? (
                <p className="text-xs text-slate-400">—</p>
              ) : !isTerminal ? (
                <p className="text-xs text-slate-400">run 结束后加载产物列表</p>
              ) : sidecar.artifactsLoading ? (
                <LoadingBlock label="加载产物…" />
              ) : sidecar.artifactsError ? (
                <ErrorBlock message={sidecar.artifactsError} />
              ) : sidecar.artifacts.length === 0 ? (
                <p className="text-xs text-slate-400">暂无产物</p>
              ) : (
                <ul className="space-y-2">
                  {sidecar.artifacts.map((artifact) => (
                    <ArtifactRow key={artifact.artifactId} artifact={artifact} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PartialResultBlock({
  runResult,
  isAdmin,
}: {
  runResult: import('../../api/agent').AgentRunResult;
  isAdmin: boolean;
}) {
  const skipped = runResult.skippedTodoIds ?? [];
  const rationale = runResult.recoveryRationale ?? null;
  const recoveryJudgeDecisionId = runResult.recoveryJudgeDecisionId ?? null;
  // Backend already caps rationale at 500 chars; defensive cap again for safety.
  const rationaleText = rationale
    ? rationale.length > 500
      ? `${rationale.slice(0, 500)}…`
      : rationale
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800">
          PARTIAL
        </span>
        <span className="text-[10px] text-slate-500">
          跳过 {skipped.length} 个节点
          {skipped.length > 0 ? `（${skipped.join(', ')}）` : ''}
        </span>
      </div>

      {rationaleText ? (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">判定说明</p>
          <p className="mt-0.5 whitespace-pre-wrap rounded border border-amber-100 bg-amber-50/60 p-2 text-[11px] text-amber-900">
            {rationaleText}
          </p>
        </div>
      ) : null}

      {isAdmin && recoveryJudgeDecisionId ? (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">judge decisionId</p>
          <p className="mt-0.5 break-all font-mono text-[10px] text-slate-700">
            {recoveryJudgeDecisionId}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            非 LLM trace；定位对应 LLM 调用需按 phase=dag_recovery_judge 过滤。
          </p>
        </div>
      ) : null}
    </div>
  );
}
