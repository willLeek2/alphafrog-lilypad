import { useState } from 'react';
import { useSafeCallDetail } from '../../hooks/useSafeCallDetail';
import {
  formatDetailBody,
  formatToolResultText,
  formatTraceOutputSummary,
} from '../../utils/eventDisplay';
import { useIsAdmin } from '../../../hooks/useIsAdmin';
import { useAgentV2Store } from '../../store/agentV2Store';
import type { NodeTimelineItem } from '../../utils/mergeNodeTimeline';
import { formatSafeCallDetailBody } from '../../utils/safeTraceDetail';

interface NodeEventCardProps {
  item: NodeTimelineItem;
  runId: string | null;
}

function localExpandBody(item: NodeTimelineItem): string {
  if (item.kind === 'tool') {
    const line = formatToolResultText(item.preview);
    const chunks = [line.headline, line.subline].filter(Boolean);
    if (item.part?.type === 'tool_call' && item.part.status === 'error') {
      chunks.push('状态：失败');
    }
    return chunks.join('\n') || '（无工具输出摘要）';
  }
  const line = formatTraceOutputSummary(item.preview);
  const chunks = [line.headline, line.subline].filter(Boolean);
  if (item.part?.type === 'llm_progress') {
    const p = item.part;
    if (p.model) {
      chunks.unshift(`模型：${p.model}`);
    }
    if (p.phase) {
      chunks.push(`阶段：${p.phase}`);
    }
  }
  return chunks.join('\n') || '（无 LLM 输出摘要）';
}

function SkippedCardBody({ item }: { item: NodeTimelineItem }) {
  const isAdmin = useIsAdmin();
  const recoveryJudgeDecisionId = useAgentV2Store(
    (s) => s.execution.dagRecoveryJudge.recoveryJudgeDecisionId
  );
  const rationale = useAgentV2Store((s) => s.execution.dagRecoveryJudge.rationale);

  const reason = item.skippedReason;
  const reasonLabel =
    reason === 'judge_recovery'
      ? '由 DAG 恢复判定器跳过（节点有失败但仍可输出部分结论）'
      : reason === 'dependency_unresolved'
        ? '因依赖节点未满足而自动跳过'
        : '已跳过';

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-slate-700">{reasonLabel}</p>
      {reason === 'judge_recovery' && rationale ? (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">判定说明</p>
          <p className="mt-0.5 whitespace-pre-wrap rounded bg-white/80 p-2 text-[11px] text-slate-700">
            {rationale}
          </p>
        </div>
      ) : null}
      {reason === 'judge_recovery' && isAdmin && recoveryJudgeDecisionId ? (
        <p className="text-[10px] text-slate-500">
          judge decisionId:{' '}
          <span className="break-all font-mono text-slate-700">
            {recoveryJudgeDecisionId}
          </span>
          <span className="ml-1 text-slate-400">
            （非 LLM trace；通过 phase=dag_recovery_judge 过滤定位 LLM 调用）
          </span>
        </p>
      ) : null}
    </div>
  );
}

export function NodeEventCard({ item, runId }: NodeEventCardProps) {
  const [open, setOpen] = useState(false);
  const safeDetail = useSafeCallDetail(runId);
  const entry = open ? safeDetail.getEntry(item.kind, item.eventId) : undefined;

  // Skipped nodes have no detail to load — render the body inline.
  if (item.kind === 'skipped') {
    return (
      <li className="rounded-md border border-slate-200 bg-slate-50/60 text-xs">
        <div className="w-full px-2 py-2 text-left">
          <p className="font-medium text-slate-700">{item.title}</p>
          <p className="text-slate-500">{item.statusLine}</p>
          <div className="mt-1">
            <SkippedCardBody item={item} />
          </div>
        </div>
      </li>
    );
  }

  const previewLine =
    item.kind === 'tool'
      ? formatToolResultText(item.preview)
      : formatTraceOutputSummary(item.preview);

  const expandText = (() => {
    if (entry?.loading) {
      return null;
    }
    if (entry?.error) {
      return `加载失败：${entry.error}\n\n${localExpandBody(item)}`;
    }
    if (entry?.detail && safeDetail.enabled) {
      return formatSafeCallDetailBody(entry.detail);
    }
    return localExpandBody(item);
  })();

  const isUnavailable =
    entry?.detail?.unavailable === true || entry?.detail?.callDetailKind === 'unavailable';
  const isTruncated =
    entry?.detail?.callDetailKind === 'truncated' || entry?.detail?.structured?.truncated === true;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && runId) {
      void safeDetail.load(item.kind, item.eventId);
    }
  };

  const border =
    item.kind === 'tool'
      ? 'border-amber-100 bg-amber-50/50'
      : 'border-violet-100 bg-violet-50/50';
  const titleColor = item.kind === 'tool' ? 'text-amber-900' : 'text-violet-900';
  const metaColor = item.kind === 'tool' ? 'text-amber-800/80' : 'text-violet-800/80';

  return (
    <li className={`rounded-md border ${border} text-xs`}>
      <button
        type="button"
        onClick={toggle}
        className="w-full px-2 py-2 text-left hover:opacity-90"
        aria-expanded={open}
      >
        <p className={`font-medium ${titleColor}`}>{item.title}</p>
        <p className={metaColor}>{item.statusLine}</p>
        <p className={`mt-1 line-clamp-2 ${metaColor}`}>{previewLine.headline}</p>
        {previewLine.subline ? (
          <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-500">{previewLine.subline}</p>
        ) : null}
        <p className="mt-1 text-[10px] text-slate-400">{open ? '收起 ▲' : '展开摘要 ▼'}</p>
      </button>
      {open ? (
        <div className="border-t border-slate-100/80 px-2 py-2">
          {entry?.loading ? (
            <p className="text-slate-400">加载详情…</p>
          ) : isUnavailable ? (
            <p className="rounded bg-slate-50 p-2 text-slate-600">
              {entry?.detail?.message ?? '该调用详情暂不可用'}
            </p>
          ) : (
            <>
              {isTruncated ? (
                <p className="mb-1 text-[10px] text-amber-700">
                  {entry?.detail?.message ?? '内容已截断显示'}
                </p>
              ) : null}
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-white/80 p-2 text-[10px] text-slate-700">
                {formatDetailBody(expandText ?? localExpandBody(item))}
              </pre>
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}
