import { Link } from 'react-router-dom';
import type { AgentRun } from '../../../api/agent';

interface RunListSidebarProps {
  runs: AgentRun[];
  activeRunId: string | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

function statusColor(status: string): string {
  const s = status.toUpperCase();
  if (s === 'RUNNING' || s === 'IN_PROGRESS') {
    return 'bg-sky-100 text-sky-800';
  }
  if (s === 'COMPLETED') {
    return 'bg-green-100 text-green-800';
  }
  if (s === 'PARTIAL') {
    return 'bg-amber-100 text-amber-800';
  }
  if (s === 'FAILED' || s === 'ERROR') {
    return 'bg-red-100 text-red-800';
  }
  if (s === 'CANCELLED' || s === 'CANCELED') {
    return 'bg-slate-100 text-slate-600';
  }
  return 'bg-slate-100 text-slate-600';
}

export function RunListSidebar({
  runs,
  activeRunId,
  loading,
  error,
  onRefresh,
}: RunListSidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Runs</p>
        <button
          type="button"
          onClick={onRefresh}
          className="text-[10px] text-sky-600 hover:underline"
          disabled={loading}
        >
          刷新
        </button>
      </div>

      {error ? <p className="mb-2 text-xs text-red-600">{error}</p> : null}

      <ul className="agent-v2-scroll min-h-0 flex-1 space-y-1">
        {loading && runs.length === 0 ? (
          <li className="text-xs text-slate-400">加载中…</li>
        ) : runs.length === 0 ? (
          <li className="text-xs text-slate-400">暂无历史 run</li>
        ) : (
          runs.map((run) => {
            const active = run.id === activeRunId;
            const preview = run.message?.trim() || run.id.slice(0, 8);
            return (
              <li key={run.id}>
                <Link
                  to={`/app/chat/v2/${run.id}`}
                  className={`block rounded-lg px-2 py-2 text-xs transition-colors ${
                    active
                      ? 'bg-sky-50 ring-1 ring-sky-200'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <p className="line-clamp-2 font-medium text-slate-800">{preview}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`rounded px-1 py-0.5 text-[10px] ${statusColor(run.status)}`}>
                      {run.status}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(run.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
