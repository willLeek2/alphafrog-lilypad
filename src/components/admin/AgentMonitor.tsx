import { useState, useEffect, useCallback } from 'react';
import { listAgentRuns, getAgentRunDetail, stopAgentRun } from '../../api/admin';
import ActionButton from '../ActionButton';
import { 
  Play, Square, CheckCircle, XCircle, Clock, 
  Search, RefreshCw, Eye, Terminal, AlertTriangle,
  ChevronDown, ChevronUp, User, Calendar
} from 'lucide-react';
import type { AdminAgentRun, AdminAgentRunDetail } from '../../types/admin';

interface AgentMonitorProps {
  token: string;
}

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'RUNNING', label: '运行中' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'FAILED', label: '失败' },
  { value: 'CANCELLED', label: '已取消' },
  { value: 'PENDING', label: '等待中' },
];

const DAYS_OPTIONS = [
  { value: 1, label: '1天内' },
  { value: 7, label: '7天内' },
  { value: 30, label: '30天内' },
  { value: 90, label: '90天内' },
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'RUNNING': return <Play size={16} className="text-blue-500" />;
    case 'COMPLETED': return <CheckCircle size={16} className="text-green-500" />;
    case 'FAILED': return <XCircle size={16} className="text-red-500" />;
    case 'CANCELLED': return <Square size={16} className="text-gray-500" />;
    case 'PENDING': return <Clock size={16} className="text-amber-500" />;
    default: return <Clock size={16} className="text-gray-400" />;
  }
};

const getStatusClass = (status: string) => {
  switch (status) {
    case 'RUNNING': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'COMPLETED': return 'bg-green-50 text-green-700 border-green-200';
    case 'FAILED': return 'bg-red-50 text-red-700 border-red-200';
    case 'CANCELLED': return 'bg-gray-50 text-gray-700 border-gray-200';
    case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

export const AgentMonitor = ({ token }: AgentMonitorProps) => {
  const [runs, setRuns] = useState<AdminAgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [daysFilter, setDaysFilter] = useState(30);
  const [userIdFilter, setUserIdFilter] = useState('');
  const [selectedRun, setSelectedRun] = useState<AdminAgentRunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [stoppingRunId, setStoppingRunId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAgentRuns(token, page, pageSize, {
        status: statusFilter || undefined,
        userId: userIdFilter || undefined,
        days: daysFilter,
      });
      setRuns(res.runs || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error("加载Agent运行列表失败", err);
      alert("加载失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [token, page, pageSize, statusFilter, daysFilter, userIdFilter]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const handleViewDetail = async (runId: string) => {
    setDetailLoading(true);
    try {
      const res = await getAgentRunDetail(token, runId);
      setSelectedRun(res);
      setShowDetailModal(true);
    } catch (err) {
      console.error("加载详情失败", err);
      alert("加载详情失败");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStopRun = async (runId: string) => {
    if (!confirm('确定要停止这个运行中的任务吗？')) return;
    
    const reason = prompt('请输入停止原因（可选）:');
    if (reason === null) return;

    setStoppingRunId(runId);
    try {
      await stopAgentRun(token, runId, reason);
      alert('任务已停止');
      fetchRuns();
    } catch (err) {
      console.error("停止任务失败", err);
      alert("停止任务失败");
    } finally {
      setStoppingRunId(null);
    }
  };

  const formatDuration = (ms: number) => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN');
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <h2 className="text-xl font-bold text-ink-900">Agent 运行监控</h2>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          
          <select
            value={daysFilter}
            onChange={(e) => { setDaysFilter(Number(e.target.value)); setPage(1); }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
          >
            {DAYS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="用户ID搜索"
              value={userIdFilter}
              onChange={(e) => { setUserIdFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-sky-500 focus:outline-none w-32"
            />
          </div>

          <ActionButton onClick={fetchRuns} variant="ghost" className="flex items-center gap-2">
            <RefreshCw size={16} /> 刷新
          </ActionButton>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '运行中', count: runs.filter(r => r.status === 'RUNNING').length, color: 'blue' },
          { label: '今日完成', count: runs.filter(r => r.status === 'COMPLETED').length, color: 'green' },
          { label: '今日失败', count: runs.filter(r => r.status === 'FAILED').length, color: 'red' },
          { label: '总计', count: total, color: 'gray' },
        ].map(stat => (
          <div key={stat.label} className={`rounded-xl border border-${stat.color}-100 bg-${stat.color}-50/50 p-4`}>
            <p className={`text-xs uppercase tracking-wider text-${stat.color}-600`}>{stat.label}</p>
            <p className="mt-2 text-2xl font-bold text-ink-900">{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Runs Table */}
      <div className="rounded-2xl border border-sky-100 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-ink-400">加载中...</div>
        ) : runs.length === 0 ? (
          <div className="p-8 text-center text-ink-400">暂无运行记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-sky-100">
              <thead className="bg-sky-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-sky-700 uppercase">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-sky-700 uppercase">用户</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-sky-700 uppercase">进度</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-sky-700 uppercase">耗时</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-sky-700 uppercase">Token</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-sky-700 uppercase">开始时间</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-sky-700 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-sky-100">
                {runs.map((run) => (
                  <tr key={run.runId} className="hover:bg-sky-50/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusClass(run.status)}`}>
                        {getStatusIcon(run.status)}
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-ink-900">{run.username}</div>
                      <div className="text-xs text-ink-400">ID: {run.userId}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-sky-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (run.currentStep / Math.max(1, run.maxSteps)) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-ink-500">{run.currentStep}/{run.maxSteps}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-ink-600">
                      {formatDuration(run.durationMs)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-ink-600">
                      {run.totalTokens?.toLocaleString() || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-ink-500">
                      {formatDate(run.startedAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleViewDetail(run.runId)}
                          className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition"
                          title="查看详情"
                        >
                          <Eye size={16} />
                        </button>
                        {run.status === 'RUNNING' && (
                          <button
                            onClick={() => handleStopRun(run.runId)}
                            disabled={stoppingRunId === run.runId}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                            title="停止任务"
                          >
                            <Square size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-sky-100">
            <div className="text-sm text-ink-500">
              共 {total} 条，第 {page}/{totalPages} 页
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusClass(selectedRun.run.status)}`}>
                  {getStatusIcon(selectedRun.run.status)}
                  {selectedRun.run.status}
                </span>
                <h3 className="text-lg font-bold text-ink-900">运行详情</h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">运行ID</p>
                  <p className="text-sm font-mono text-ink-900 truncate">{selectedRun.run.runId}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">用户</p>
                  <p className="text-sm font-medium text-ink-900">{selectedRun.run.username}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">耗时</p>
                  <p className="text-sm font-medium text-ink-900">{formatDuration(selectedRun.run.durationMs)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Token 消耗</p>
                  <p className="text-sm font-medium text-ink-900">{selectedRun.run.totalTokens?.toLocaleString() || '-'}</p>
                </div>
              </div>

              {/* Progress */}
              <div className="bg-sky-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-sky-900">执行进度</span>
                  <span className="text-sm text-sky-700">{selectedRun.run.currentStep} / {selectedRun.run.maxSteps} 步骤</span>
                </div>
                <div className="w-full h-3 bg-sky-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-sky-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (selectedRun.run.currentStep / Math.max(1, selectedRun.run.maxSteps)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Error Message */}
              {selectedRun.lastError && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-red-700 mb-2">
                    <AlertTriangle size={16} />
                    <span className="font-medium">错误信息</span>
                  </div>
                  <pre className="text-sm text-red-600 whitespace-pre-wrap font-mono bg-red-100/50 rounded-lg p-3 overflow-x-auto">
                    {selectedRun.lastError}
                  </pre>
                </div>
              )}

              {/* Plan JSON */}
              {selectedRun.planJson && (
                <div>
                  <h4 className="text-sm font-medium text-ink-900 mb-2 flex items-center gap-2">
                    <Terminal size={16} />
                    执行计划
                  </h4>
                  <pre className="text-xs text-ink-600 bg-gray-50 rounded-xl p-4 overflow-x-auto max-h-60">
                    {JSON.stringify(JSON.parse(selectedRun.planJson), null, 2)}
                  </pre>
                </div>
              )}

              {/* Snapshot JSON */}
              {selectedRun.snapshotJson && (
                <div>
                  <h4 className="text-sm font-medium text-ink-900 mb-2 flex items-center gap-2">
                    <Calendar size={16} />
                    执行快照
                  </h4>
                  <pre className="text-xs text-ink-600 bg-gray-50 rounded-xl p-4 overflow-x-auto max-h-60">
                    {JSON.stringify(JSON.parse(selectedRun.snapshotJson), null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              {selectedRun.run.status === 'RUNNING' && (
                <ActionButton
                  variant="danger"
                  onClick={() => {
                    setShowDetailModal(false);
                    handleStopRun(selectedRun.run.runId);
                  }}
                >
                  停止任务
                </ActionButton>
              )}
              <ActionButton onClick={() => setShowDetailModal(false)}>
                关闭
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
