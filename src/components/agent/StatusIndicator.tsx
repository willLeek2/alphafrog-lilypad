import { Loader2, CheckCircle2, AlertCircle, Sparkles, Play, Square } from 'lucide-react';

interface StatusIndicatorProps {
  type: string;
  label?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  PLANNING_STARTED: <Sparkles size={14} className="text-violet-500" />,
  PLANNING_COMPLETED: <CheckCircle2 size={14} className="text-emerald-500" />,
  EXECUTION_STARTED: <Play size={14} className="text-sky-500" />,
  TODO_STARTED: <Loader2 size={14} className="animate-spin text-amber-500" />,
  TODO_FINISHED: <CheckCircle2 size={14} className="text-emerald-500" />,
  TODO_RETRY: <AlertCircle size={14} className="text-amber-500" />,
  FINAL_ANSWER_GENERATING: <Loader2 size={14} className="animate-spin text-sky-500" />,
  WORKFLOW_COMPLETED: <Square size={14} className="text-gray-500" />,
};

const labelMap: Record<string, string> = {
  PLANNING_STARTED: '正在规划分析步骤...',
  PLANNING_COMPLETED: '规划完成',
  EXECUTION_STARTED: '开始执行计划',
  TODO_STARTED: '正在执行...',
  TODO_FINISHED: '步骤完成',
  TODO_RETRY: '正在重试...',
  FINAL_ANSWER_GENERATING: '正在整理分析结果...',
  WORKFLOW_COMPLETED: '执行完成',
};

export function StatusIndicator({ type, label }: StatusIndicatorProps) {
  const icon = iconMap[type];
  const displayLabel = label || labelMap[type] || type;

  if (!icon) {
    return (
      <div className="flex items-center gap-2 text-xs text-ink-400 py-1">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
        {displayLabel}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-ink-500 py-1">
      {icon}
      <span>{displayLabel}</span>
    </div>
  );
}

// 简化的状态点（用于紧凑展示）
export function StatusDot({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    PLANNING_STARTED: 'bg-violet-400',
    PLANNING_COMPLETED: 'bg-emerald-400',
    EXECUTION_STARTED: 'bg-sky-400',
    TODO_STARTED: 'bg-amber-400 animate-pulse',
    TODO_FINISHED: 'bg-emerald-400',
    TODO_RETRY: 'bg-amber-400',
    FINAL_ANSWER_GENERATING: 'bg-sky-400 animate-pulse',
    WORKFLOW_COMPLETED: 'bg-gray-400',
  };

  const color = colorMap[type] || 'bg-gray-300';

  return (
    <div className={`w-2 h-2 rounded-full ${color}`} title={labelMap[type] || type} />
  );
}
