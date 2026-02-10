import { Link } from 'react-router-dom';
import { Plus, Clock, FileText, MoreHorizontal, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import DemoLayout from './DemoLayout';
import ActionButton from '../../components/ActionButton';

// Mock Data matching ALP-7
const mockRuns = [
  {
    id: 'run-1234',
    message: '分析上季度半导体 ETF (SMH, SOXX) 相对基准指数的超额收益归因',
    status: 'COMPLETED',
    createdAt: '2026-02-10T09:00:00Z',
    completedAt: '2026-02-10T09:05:23Z',
    hasArtifacts: true,
  },
  {
    id: 'run-1235',
    message: '筛选市盈率(PE)小于30且营收增长率大于20%的新能源车产业链个股',
    status: 'FAILED',
    createdAt: '2026-02-09T14:30:00Z',
    completedAt: '2026-02-09T14:32:10Z',
    hasArtifacts: false,
  },
  {
    id: 'run-1236',
    message: '生成客户 A 的 Q1 投资组合风险敞口分析报告',
    status: 'RUNNING',
    createdAt: '2026-02-10T10:15:00Z',
    completedAt: null,
    hasArtifacts: false,
  },
];

const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    FAILED: 'bg-red-50 text-red-700 border-red-100',
    RUNNING: 'bg-sky-50 text-sky-700 border-sky-100',
  };
  
  const icons = {
    COMPLETED: <CheckCircle2 size={14} />,
    FAILED: <AlertCircle size={14} />,
    RUNNING: <Loader2 size={14} className="animate-spin" />,
  };
  
  const labels = {
    COMPLETED: '已完成',
    FAILED: '失败',
    RUNNING: '运行中',
  };

  const key = status as keyof typeof styles;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium ${styles[key] || 'bg-gray-50 text-gray-700'}`}>
      {icons[key]}
      {labels[key as keyof typeof labels] || status}
    </span>
  );
};

const DemoDashboard = () => {
  return (
    <DemoLayout>
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">概览仪表盘</h1>
            <p className="text-ink-500">近期市场分析任务全景视图</p>
          </div>
          <Link to="/demo/chat">
            <ActionButton className="gap-2 shadow-sm">
              <Plus size={18} />
              新建分析任务
            </ActionButton>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            { label: '总运行任务', value: '1,284', change: '+12%', sub: '较上月' },
            { label: '平均分析耗时', value: '4m 12s', change: '-8%', sub: '提速' },
            { label: '生成报告/产物', value: '856', change: '+24%', sub: '份' },
          ].map((stat, i) => (
            <div key={i} className="rounded-lg border border-sky-100 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-ink-500">{stat.label}</p>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-3xl font-bold text-ink-900">{stat.value}</span>
                <span className={`text-xs font-medium ${stat.change.startsWith('+') ? 'text-emerald-600' : 'text-sky-600'}`}>
                  {stat.change} <span className="text-ink-400 font-normal">{stat.sub}</span>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity Table */}
        <div className="overflow-hidden rounded-lg border border-sky-100 bg-white shadow-sm">
          <div className="border-b border-sky-50 bg-sky-50/50 px-6 py-4">
            <h3 className="font-semibold text-ink-900">近期动态</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink-700">
              <thead className="bg-white text-xs font-medium uppercase text-ink-400">
                <tr>
                  <th className="px-6 py-4">状态</th>
                  <th className="px-6 py-4">分析目标</th>
                  <th className="px-6 py-4">创建时间</th>
                  <th className="px-6 py-4">产物</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50">
                {mockRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-sky-50/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-6 py-4 max-w-md">
                      <p className="truncate font-medium text-ink-900">{run.message}</p>
                      <span className="text-xs text-ink-400 font-mono">{run.id}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-ink-500">
                        <Clock size={14} />
                        {new Date(run.createdAt).toLocaleDateString('zh-CN')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {run.hasArtifacts ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600">
                          <FileText size={14} />
                          可用
                        </span>
                      ) : (
                        <span className="text-xs text-ink-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="rounded-lg p-2 text-ink-400 hover:bg-sky-50 hover:text-ink-900">
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-sky-50 bg-white px-6 py-4 text-center">
            <button className="text-sm font-medium text-sky-600 hover:text-sky-700 hover:underline">
              查看全部历史
            </button>
          </div>
        </div>
      </div>
    </DemoLayout>
  );
};

export default DemoDashboard;
