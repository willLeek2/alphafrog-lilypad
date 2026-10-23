import { AlertCircle, CheckCircle2, ChevronDown, CircleHelp, XCircle } from 'lucide-react';
import type { DependencyReadinessState, DependencyToolResult } from './dependencyReadiness';

const statusStyles = {
  AVAILABLE: { label: '可用', className: 'text-emerald-700', Icon: CheckCircle2 },
  UNAVAILABLE: { label: '不可用', className: 'text-red-700', Icon: XCircle },
  UNCHECKED: { label: '未检查', className: 'text-amber-700', Icon: CircleHelp },
};

const basisLabels = {
  REFERENCE_STATE: '服务引用状态',
  CONFIG_PRESENT: '本地配置',
  TOOL_AVAILABILITY: '本次工具开放情况',
  NONE: '尚无检查依据',
};

function checkTime(value: string): string {
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? '检查时间未知' : `检查于 ${time.toLocaleString('zh-CN')}`;
}

function ResultLine({ result, covered, historical = false }: {
  result: DependencyToolResult;
  covered: boolean;
  historical?: boolean;
}) {
  const known = result.businessSuccess !== null;
  const Icon = !known ? CircleHelp : result.businessSuccess ? CheckCircle2 : XCircle;
  const className = !known ? 'text-slate-600' : result.businessSuccess ? 'text-emerald-700' : 'text-red-700';
  return (
    <li className="space-y-1 break-words rounded border border-slate-100 bg-white px-2 py-1.5">
      <div className="flex items-start gap-1.5">
        <Icon size={14} className={`mt-0.5 shrink-0 ${className}`} />
        <span className="min-w-0 flex-1">
          {result.todoId ? `步骤 ${result.todoId} · ` : ''}{result.toolName}
          <span className={`ml-2 ${className}`}>
            {historical ? '业务结果：' : '本次调用：'}{!known ? '尚未核实' : result.businessSuccess ? '成功' : '失败'}
          </span>
        </span>
      </div>
      {result.executed === false && <p className="text-red-700">工作区拒绝，工具未执行。</p>}
      {result.errorCode && <p className="text-slate-500">原因代码：{result.errorCode}</p>}
      {!known && (result.taskStatus || result.memberState) && (
        <p className="text-slate-500">任务状态：{result.taskStatus ?? result.memberState}，业务成败尚未核实。</p>
      )}
      {!historical && !covered && <p className="text-amber-700">该工具未被本次预检覆盖。</p>}
      {historical && <p className="text-slate-500">历史或步骤归属未核实，未计入本次调用结果。</p>}
    </li>
  );
}

export function DependencyReadinessNotice({ state }: { state: DependencyReadinessState }) {
  const { report, results } = state;
  const reused = state.frozenReuse || (report?.checkedPlanGeneration != null && state.planGeneration != null
    && report.checkedPlanGeneration !== state.planGeneration);
  const counts = { AVAILABLE: 0, UNAVAILABLE: 0, UNCHECKED: 0 };
  for (const hint of report?.hints ?? []) counts[hint.status] += 1;
  const covered = (result: DependencyToolResult) => report?.hints.some(
    (hint) => hint.todoId === result.todoId && hint.toolName === result.toolName,
  ) ?? false;

  return (
    <section aria-label="依赖检查与工具业务结果" className="space-y-2 rounded-lg border border-sky-100 bg-sky-50/40 p-3 text-xs text-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <span className="font-medium text-slate-800">依赖检查</span>
        {report && <time dateTime={report.checkedAt || undefined} className="text-[11px] text-slate-500">{checkTime(report.checkedAt)}</time>}
      </div>
      {report ? (
        <p>可用 {counts.AVAILABLE} · 不可用 {counts.UNAVAILABLE} · 未检查 {counts.UNCHECKED}</p>
      ) : <p className="text-slate-500">尚无检查报告。</p>}
      {report && (report.truncated || report.omittedCount > 0) && <p className="text-amber-700">报告有省略，未检查范围见详情。</p>}
      {reused && <p className="text-amber-700">沿用原检查，恢复后未重查。</p>}
      {!state.prepared && <p className="text-amber-700">本轮尚未完成准备，当前调用结果待核实。</p>}
      {results.length > 0 ? (
        <div className="space-y-1.5">
          <p className="font-medium">该工具本次调用结果</p>
          <ul className="max-h-40 space-y-1.5 overflow-y-auto">
            {results.map((result) => <ResultLine key={JSON.stringify([result.planGeneration, result.todoId, result.toolName, result.toolCallId])}
              result={result} covered={covered(result)} />)}
          </ul>
        </div>
      ) : state.prepared && <p className="text-slate-500">尚未取得本轮工具业务结果。</p>}
      {report && (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sky-700">
            <ChevronDown size={14} className="shrink-0 transition-transform group-open:rotate-180" />查看检查对象与依据
          </summary>
          <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto">
            {report.hints.map((hint, index) => {
              const { Icon, className, label } = statusStyles[hint.status];
              return (
                <li key={`${hint.todoId}-${hint.toolName}-${hint.dependencyId}-${index}`} className="space-y-1 break-words rounded border border-slate-100 bg-white p-2">
                  <div className="flex items-start gap-1.5">
                    <Icon size={14} className={`mt-0.5 shrink-0 ${className}`} />
                    <span className="min-w-0 flex-1">{hint.todoId ? `步骤 ${hint.todoId} · ` : ''}{hint.toolName} · {hint.dependencyLabel}
                      <span className={`ml-2 ${className}`}>{label}</span>
                    </span>
                  </div>
                  <p className="text-slate-500">依据：{basisLabels[hint.basis]}</p>
                  <p>{hint.reason}</p>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-slate-500">预检事实按依据显示；业务结果另列，数据覆盖未检查。</p>
          {(report.omittedCount > 0 || report.truncated) && (
            <p className="mt-1 flex items-start gap-1 text-amber-700"><AlertCircle size={14} className="shrink-0" />
              <span>报告有省略，{report.omittedCount > 0 ? `${report.omittedCount} 项` : '部分项目'}未检查。
                {report.omittedTodoIds.length > 0 && `影响步骤：${report.omittedTodoIds.join('、')}。`}
                {report.omittedTodoCount > report.omittedTodoIds.length && `共影响 ${report.omittedTodoCount} 个步骤。`}
              </span>
            </p>
          )}
        </details>
      )}
      {state.omittedCount > 0 && <p className="text-amber-700">至少 {state.omittedCount} 项调用结果未展示。
        {state.omittedTodoIds.length > 0 && `影响步骤：${state.omittedTodoIds.join('、')}。`}</p>}
      {state.otherResults.length > 0 && (
        <details>
          <summary className="cursor-pointer text-slate-500">历史或归属待核实的任务事实（{state.otherResults.length}）</summary>
          <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
            {state.otherResults.map((result) => <ResultLine key={`${result.eventSeq}-${result.toolCallId}`}
              result={result} covered={false} historical />)}
          </ul>
        </details>
      )}
    </section>
  );
}
