import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Clock, FileText, MoreHorizontal, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import UserLayout from '../../layouts/UserLayout';
import ActionButton from '../../components/ActionButton';
import { listRuns, type AgentRun, type AgentRunListResponse } from '../../api/agent';
import { loadAuth } from '../../utils/storage';

interface RunItem {
  id: string;
  message: string;
  status: 'COMPLETED' | 'FAILED' | 'RUNNING' | 'PENDING' | 'PAUSED';
  createdAt: string;
  completedAt?: string;
  hasArtifacts: boolean;
  durationMs?: number;
  totalTokens?: number;
}

const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    FAILED: 'bg-red-50 text-red-700 border-red-100',
    RUNNING: 'bg-sky-50 text-sky-700 border-sky-100',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
    PAUSED: 'bg-gray-50 text-gray-700 border-gray-100',
  };
  
  const icons = {
    COMPLETED: <CheckCircle2 size={14} />,
    FAILED: <AlertCircle size={14} />,
    RUNNING: <Loader2 size={14} className="animate-spin" />,
    PENDING: <Clock size={14} />,
    PAUSED: <Clock size={14} />,
  };
  
  const labels = {
    COMPLETED: '已完成',
    FAILED: '失败',
    RUNNING: '运行中',
    PENDING: '等待中',
    PAUSED: '已暂停',
  };

  const key = status as keyof typeof styles;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium ${styles[key] || 'bg-gray-50 text-gray-700'}`}>
      {icons[key]}
      {labels[key as keyof typeof labels] || status}
    </span>
  );
};

const UserDashboard = () => {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ username: string; credit: number } | null>(null);
  const [stats, setStats] = useState({
    totalRuns: 0,
    completedRuns: 0,
    failedRuns: 0,
    totalArtifacts: 0,
  });
  // Cache for runs data with timestamp
  const [runsCache, setRunsCache] = useState<{
    data: RunItem[];
    timestamp: number;
    stats: typeof stats;
  } | null>(null);

  useEffect(() => {
    const auth = loadAuth();
    if (auth?.user) {
      setUser(auth.user);
    }
    loadRuns();
  }, []);

  const CACHE_DURATION_MS = 20000; // 20 seconds

  const loadRuns = async (forceRefresh: boolean = false) => {
    // Check cache first (unless force refresh)
    if (!forceRefresh && runsCache) {
      const now = Date.now();
      const age = now - runsCache.timestamp;
      if (age < CACHE_DURATION_MS) {
        // Use cached data
        setRuns(runsCache.data);
        setStats(runsCache.stats);
        setIsLoading(false);
        console.log(`Using cached runs data (age: ${Math.round(age / 1000)}s)`);
        return;
      }
    }

    setIsLoading(true);
    try {
      const response = await listRuns(0, 3);
      const runsData: RunItem[] = response.items.map((run: AgentRun) => ({
        id: run.id,
        message: run.message || '未命名分析任务',
        status: (run.status as RunItem['status']) || 'PENDING',
        createdAt: run.createdAt,
        completedAt: run.completedAt,
        hasArtifacts: false,
        durationMs: run.durationMs,
        totalTokens: run.totalTokens,
      }));
      
      const newStats = {
        totalRuns: response.total,
        completedRuns: runsData.filter(r => r.status === 'COMPLETED').length,
        failedRuns: runsData.filter(r => r.status === 'FAILED').length,
        totalArtifacts: 0,
      };
      
      setRuns(runsData);
      setStats(newStats);
      
      // Update cache
      setRunsCache({
        data: runsData,
        timestamp: Date.now(),
        stats: newStats,
      });
    } catch (error) {
      console.error('Failed to load runs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  return (
    <UserLayout>
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">概览仪表盘</h1>
            <p className="text-ink-500">近期市场分析任务全景视图</p>
          </div>
          <Link to="/app/chat">
            <ActionButton className="gap-2 shadow-sm">
              <Plus size={18} />
              新建分析任务
            </ActionButton>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {[
            { label: '总任务数', value: stats.totalRuns.toString(), change: '', sub: '个' },
            { label: '已完成', value: stats.completedRuns.toString(), change: '', sub: '个' },
            { label: '失败', value: stats.failedRuns.toString(), change: '', sub: '个' },
            { label: '剩余额度', value: user?.credit?.toString() || '0', change: '', sub: 'credits' },
          ].map((stat, i) => (
            <div key={i} className="rounded-lg border border-sky-100 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-ink-500">{stat.label}</p>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-3xl font-bold text-ink-900">{stat.value}</span>
                <span className="text-xs text-ink-400 font-normal">{stat.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity Table */}
        <div className="overflow-hidden rounded-lg border border-sky-100 bg-white shadow-sm">
          <div className="border-b border-sky-50 bg-sky-50/50 px-6 py-4 flex items-center justify-between">
            <h3 className="font-semibold text-ink-900">近期分析任务</h3>
            <button 
              onClick={() => loadRuns(true)}
              className="text-sm text-sky-600 hover:text-sky-700"
              disabled={isLoading}
            >
              {isLoading ? '加载中...' : '刷新'}
            </button>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
            </div>
          ) : runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-ink-300 mb-4" />
              <h3 className="text-lg font-medium text-ink-900 mb-2">还没有分析任务</h3>
              <p className="text-sm text-ink-500 mb-4">开始您的第一次 AI 分析吧</p>
              <Link
                to="/app/chat"
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
              >
                <Plus size={18} />
                新建分析
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-ink-700">
                <thead className="bg-white text-xs font-medium uppercase text-ink-400">
                  <tr>
                    <th className="px-6 py-4">状态</th>
                    <th className="px-6 py-4">分析目标</th>
                    <th className="px-6 py-4">创建时间</th>
                    <th className="px-6 py-4">耗时</th>
                    <th className="px-6 py-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-50">
                  {runs.map((run) => (
                    <tr key={run.id} className="hover:bg-sky-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={run.status} />
                      </td>
                      <td className="px-6 py-4 max-w-md">
                        <p className="truncate font-medium text-ink-900">{run.message}</p>
                        <span className="text-xs text-ink-400 font-mono">{run.id?.slice(0, 8)}...</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-ink-500">
                          <Clock size={14} />
                          {new Date(run.createdAt).toLocaleDateString('zh-CN')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-ink-500">
                        {formatDuration(run.durationMs)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => navigate(`/app/chat/${run.id}`)}
                          className="rounded-lg p-2 text-sky-600 hover:bg-sky-50 hover:text-sky-700 font-medium text-sm"
                        >
                          查看详情
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {runs.length > 0 && (
            <div className="border-t border-sky-50 bg-white px-6 py-4 text-center">
              <Link 
                to="/app/chat"
                className="text-sm font-medium text-sky-600 hover:text-sky-700 hover:underline"
              >
                查看全部历史 →
              </Link>
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default UserDashboard;
