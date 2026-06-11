import type { TodoNodeStatus, TodoPlanItem } from '../../types/runTypes';

const STATUS_STYLES: Record<TodoNodeStatus, string> = {
  pending: 'border-slate-200 bg-slate-50 text-slate-500',
  running: 'border-sky-400 bg-sky-50 text-sky-800 ring-2 ring-sky-200',
  completed: 'border-green-300 bg-green-50 text-green-800',
  failed: 'border-red-300 bg-red-50 text-red-800',
  skipped: 'border-slate-200 bg-slate-100 text-slate-400 line-through',
};

interface LinearStepperProps {
  planItems: TodoPlanItem[];
  nodeStatus: Record<string, TodoNodeStatus>;
  currentTodoId?: string;
  selectedTodoId?: string | null;
  durationMs: Record<string, number>;
  onSelectTodo?: (todoId: string) => void;
}

export function LinearStepper({
  planItems,
  nodeStatus,
  currentTodoId,
  selectedTodoId,
  durationMs,
  onSelectTodo,
}: LinearStepperProps) {
  if (planItems.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-slate-400">
        等待 PLAN_READY…
      </p>
    );
  }

  return (
    <div className="overflow-y-auto p-6">
      <ol className="mx-auto flex max-w-lg flex-col gap-0">
        {planItems.map((item, index) => {
          const status = nodeStatus[item.id] ?? 'pending';
          const isCurrent = item.id === currentTodoId;
          const isSelected = item.id === (selectedTodoId ?? currentTodoId);
          const duration = durationMs[item.id];
          return (
            <li key={item.id} className="flex flex-col items-stretch">
              <button
                type="button"
                onClick={() => onSelectTodo?.(item.id)}
                className={`flex gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
                  isSelected ? 'border-sky-400 bg-sky-50/80' : 'border-slate-100 bg-white hover:bg-slate-50'
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold ${STATUS_STYLES[status]} ${isCurrent ? 'scale-105' : ''}`}
                >
                  {item.sequence}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{item.description}</p>
                  {item.suggested_tool ? (
                    <p className="mt-0.5 text-xs text-slate-500">{item.suggested_tool}</p>
                  ) : null}
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">{status}</p>
                  {duration != null ? (
                    <p className="text-[10px] text-slate-500">{duration} ms</p>
                  ) : null}
                </div>
              </button>
              {index < planItems.length - 1 ? (
                <div className="ml-5 h-4 w-0.5 bg-slate-200" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
