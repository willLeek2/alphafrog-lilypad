import { RefreshCw, Coins } from 'lucide-react';

interface Session {
  id: string;
  title: string;
  createdAt: string;
  active: boolean;
}

interface SessionListProps {
  sessions: Session[];
  credits: number;
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
  isLoading?: boolean;
}

export const SessionList = ({ 
  sessions, 
  credits, 
  onNewSession, 
  onSelectSession,
  isLoading 
}: SessionListProps) => {
  return (
    <div className="w-64 flex-shrink-0 flex flex-col rounded-lg border border-sky-100 bg-white shadow-sm h-full">
      <div className="border-b border-sky-50 p-4">
        <button 
          onClick={onNewSession}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={16} />
          新对话
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-ink-400">最近记录</h3>
        {sessions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-ink-400">
            暂无历史记录
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`w-full rounded-lg px-3 py-3 text-left transition-colors ${
                  session.active
                    ? 'bg-sky-50 text-sky-700 font-medium'
                    : 'text-ink-700 hover:bg-gray-50'
                }`}
              >
                <p className="truncate text-sm">{session.title || "未命名会话"}</p>
                <span className="text-xs text-ink-400">
                  {new Date(session.createdAt).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Credit Display */}
      <div className="border-t border-sky-50 p-3">
        <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
          <Coins size={14} className="text-emerald-600" />
          <span className="text-xs font-medium text-emerald-700">可用额度: {credits}</span>
        </div>
      </div>
    </div>
  );
};
