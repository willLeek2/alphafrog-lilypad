import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMarkdownProps {
  text: string;
}

/** Assistant thread text — GFM markdown (tables, lists, code). */
export function ChatMarkdown({ text }: ChatMarkdownProps) {
  if (!text.trim()) {
    return null;
  }
  return (
    <div className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-p:my-2 prose-p:text-slate-800 prose-strong:text-slate-900 prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:text-pink-700 prose-pre:overflow-x-auto prose-pre:bg-slate-50 prose-pre:text-xs prose-table:w-full prose-table:border-collapse prose-th:border prose-th:border-slate-200 prose-th:bg-slate-50 prose-th:p-2 prose-th:text-left prose-td:border prose-td:border-slate-200 prose-td:p-2 prose-ul:my-2 prose-ol:my-2">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
