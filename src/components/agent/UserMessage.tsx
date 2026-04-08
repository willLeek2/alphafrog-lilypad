import { User } from 'lucide-react';

interface UserMessageProps {
  content: string;
  timestamp?: Date;
}

export function UserMessage({ content, timestamp }: UserMessageProps) {
  return (
    <div className="flex gap-4 justify-end">
      <div className="flex max-w-[80%] flex-col gap-2 items-end">
        <div className="rounded-lg px-5 py-3.5 text-sm leading-relaxed shadow-sm bg-sky-600 text-white rounded-br-none">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
        {timestamp && (
          <span className="text-[10px] text-ink-400">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
        <User size={18} />
      </div>
    </div>
  );
}
