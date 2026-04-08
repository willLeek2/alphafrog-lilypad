import { useState } from 'react';
import { Wrench, ChevronDown, ChevronUp, CheckCircle2, XCircle } from 'lucide-react';
import type { AgentRunEvent, ParsedPayload } from './types';
import { parsePayload } from './types';

interface ToolResultProps {
  event: AgentRunEvent;
}

export function ToolResult({ event }: ToolResultProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const payload = parsePayload(event.payloadJson) as ParsedPayload;
  
  // 提取工具名称 - 支持不同事件类型的字段
  const toolName = (payload.tool_name as string) || 
                   (payload.toolName as string) || 
                   (payload.tool as string) ||
                   event.eventType;
  
  // 提取成功状态
  const success = payload.success as boolean;
  
  // 提取结果 - 支持不同事件类型的字段
  const result = payload.result_preview || 
                 payload.result || 
                 payload.output_preview ||
                 payload.output || 
                 payload.summary ||
                 {};
  
  // 提取耗时
  const duration = payload.duration_ms as number;

  // 格式化结果为字符串
  const formatResult = (data: unknown): string => {
    if (typeof data === 'string') {
      try {
        // 尝试解析并格式化 JSON 字符串
        const parsed = JSON.parse(data);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return data;
      }
    }
    return JSON.stringify(data, null, 2);
  };

  return (
    <div className="rounded-lg border border-amber-100 bg-amber-50/30 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-amber-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wrench size={14} className="text-amber-600" />
          <span className="text-xs font-medium text-ink-700">{toolName}</span>
          {success ? (
            <CheckCircle2 size={14} className="text-emerald-500" />
          ) : (
            <XCircle size={14} className="text-red-500" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {duration && (
            <span className="text-[10px] text-ink-400">{Math.round(duration)}ms</span>
          )}
          {isExpanded ? (
            <ChevronUp size={14} className="text-ink-400" />
          ) : (
            <ChevronDown size={14} className="text-ink-400" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3">
          <pre className="mt-2 max-h-48 overflow-auto rounded bg-white p-3 text-[11px] text-ink-600 border border-amber-100">
            <code>{formatResult(result)}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
