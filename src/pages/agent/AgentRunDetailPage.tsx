import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Loader2, 
  Pause, 
  Play, 
  X, 
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Bot,
} from 'lucide-react';
import { useAgentPolling, useRunData } from '../../hooks/useAgentPolling';

import { cancelRun, pauseRun, resumeRun } from '../../api/agent';
import WorkflowVisualization from '../../components/agent/WorkflowVisualization';

const AgentRunDetailPage = () => {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  
  // Get data from store
  const { events, status } = useRunData(runId || null);
  
  // Polling hook (updates store)
  const { isLoading, error, refetch } = useAgentPolling(runId || null);

  if (!runId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500">无效的 Run ID</div>
      </div>
    );
  }

  const handleCancel = async () => {
    setActionLoading('cancel');
    setActionError(null);
    try {
      await cancelRun(runId);
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '取消失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePause = async () => {
    setActionLoading('pause');
    setActionError(null);
    try {
      await pauseRun(runId);
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '暂停失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async () => {
    setActionLoading('resume');
    setActionError(null);
    try {
      await resumeRun(runId);
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '恢复失败');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusConfig = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return { 
          color: 'bg-green-100 text-green-700 border-green-200', 
          icon: CheckCircle2,
          label: '已完成'
        };
      case 'FAILED':
        return { 
          color: 'bg-red-100 text-red-700 border-red-200', 
          icon: AlertCircle,
          label: '失败'
        };
      case 'CANCELED':
        return { 
          color: 'bg-gray-100 text-gray-700 border-gray-200', 
          icon: X,
          label: '已取消'
        };
      case 'PAUSED':
        return { 
          color: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
          icon: Pause,
          label: '已暂停'
        };
      case 'RUNNING':
      default:
        return { 
          color: 'bg-blue-100 text-blue-700 border-blue-200', 
          icon: Loader2,
          label: '执行中'
        };
    }
  };

  const statusConfig = getStatusConfig(status?.status);
  const StatusIcon = statusConfig.icon;
  const isRunning = status?.status === 'RUNNING';
  const isPaused = status?.status === 'PAUSED';
  const isTerminal = ['COMPLETED', 'FAILED', 'CANCELED'].includes(status?.status || '');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/agent/chat')}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">执行详情</h1>
              <p className="text-xs text-slate-500 font-mono truncate max-w-[200px]">{runId}</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Status Badge */}
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium border flex items-center gap-1.5 ${statusConfig.color}`}>
              <StatusIcon className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              {statusConfig.label}
            </div>

            {/* Action Buttons */}
            {!isTerminal && (
              <>
                {isPaused ? (
                  <button
                    onClick={handleResume}
                    disabled={actionLoading === 'resume'}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {actionLoading === 'resume' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    恢复
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    disabled={actionLoading === 'pause' || !isRunning}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-600 text-white text-sm font-medium hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {actionLoading === 'pause' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Pause className="w-4 h-4" />
                    )}
                    暂停
                  </button>
                )}
                
                <button
                  onClick={handleCancel}
                  disabled={actionLoading === 'cancel'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === 'cancel' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  取消
                </button>
              </>
            )}

            {isTerminal && (
              <button
                onClick={() => navigate('/agent/chat')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-300 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                新对话
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Action Error */}
      {actionError && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            {actionError}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Workflow Visualization */}
        <div className="flex-1 overflow-hidden">
          <WorkflowVisualization 
            runId={runId} 
            events={events} 
            status={status} 
          />
        </div>

        {/* Right: Event Timeline */}
        <div className="w-96 border-l border-slate-200 bg-white flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-sm font-medium text-slate-700">事件时间线</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading && events.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-sm hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-400">#{event.seq}</span>
                    <span className="font-medium text-slate-700 text-xs">{event.eventType}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {new Date(event.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>

            {events.length === 0 && !isLoading && !error && (
              <div className="text-center py-12 text-slate-400 text-sm">
                暂无事件
              </div>
            )}
          </div>

          {/* Event Stats */}
          {events.length > 0 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>总事件数</span>
                <span className="font-mono font-medium">{events.length}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentRunDetailPage;
