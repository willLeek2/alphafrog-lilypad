import { Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIMessageProps {
  content: string;
  timestamp?: Date;
  isMarkdown?: boolean;
}

export function AIMessage({ content, timestamp, isMarkdown = true }: AIMessageProps) {
  return (
    <div className="flex gap-4 justify-start">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
        <Bot size={18} />
      </div>
      <div className="flex max-w-[80%] flex-col gap-2 items-start">
        <div className="rounded-lg px-5 py-3.5 text-sm leading-relaxed shadow-sm bg-white border border-sky-100 text-ink-900 rounded-bl-none">
          {isMarkdown ? (
            <div className="prose prose-sm max-w-none prose-headings:text-ink-900 prose-p:text-ink-700 prose-strong:text-ink-900 prose-code:text-pink-600 prose-pre:bg-gray-50 prose-table:w-full prose-table:border-collapse prose-table:my-2 prose-th:border prose-th:border-gray-300 prose-th:bg-gray-100 prose-th:p-2 prose-th:text-left prose-th:text-xs prose-th:font-semibold prose-td:border prose-td:border-gray-300 prose-td:p-2 prose-td:text-xs">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{content}</p>
          )}
        </div>
        {timestamp && (
          <span className="text-[10px] text-ink-400">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}
