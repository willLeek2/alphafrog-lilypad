import type { DataMessagePartProps, ToolCallMessagePartProps } from '@assistant-ui/react';
import { formatToolResultText } from '../../utils/eventDisplay';

export function AgentToolCallPart({ toolName, argsText, result, isError }: ToolCallMessagePartProps) {
  const formatted = result != null ? formatToolResultText(String(result)) : null;
  return (
    <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-3 text-sm">
      <div className="flex items-center gap-2 font-medium text-amber-900">
        <span>Tool: {toolName}</span>
        {isError ? (
          <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">error</span>
        ) : result != null ? (
          <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800">done</span>
        ) : (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">running</span>
        )}
      </div>
      {argsText ? (
        <pre className="mt-2 max-h-24 overflow-auto text-xs text-amber-950/80">{argsText}</pre>
      ) : null}
      {formatted ? (
        <div className="mt-2 text-xs text-amber-900">
          <p className="font-medium">{formatted.headline}</p>
          {formatted.subline ? (
            <p className="mt-1 line-clamp-3 text-amber-800/90">{formatted.subline}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface LlmProgressData {
  model?: string;
  phase?: string;
  estimatedTokens?: number;
  contentChars?: number;
  reasoningChars?: number;
  status?: string;
  todoId?: string;
}

export function AgentDataPart({ name, data }: DataMessagePartProps) {
  if (name !== 'llm_progress') {
    return null;
  }
  const d = data as LlmProgressData;
  return (
    <div className="rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2 text-xs text-violet-900">
      <span className="font-medium">LLM</span>
      {d.model ? ` · ${d.model}` : ''}
      {d.phase ? ` · ${d.phase}` : ''}
      {d.status ? ` · ${d.status}` : ''}
      {d.estimatedTokens != null ? ` · ~${d.estimatedTokens} out tokens` : ''}
      {d.contentChars != null ? ` · ${d.contentChars} chars` : ''}
    </div>
  );
}
