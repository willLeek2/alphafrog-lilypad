import { useState, useEffect } from 'react';
import { getUsers, updateUserStatus, adjustUserCredit, getCreditLedger } from '../../api/admin';
import ActionButton from '../ActionButton';
import { Shield, Ban, CheckCircle, Coins, RefreshCw, Search, History, Loader2, X } from 'lucide-react';
import type { AdminUserDetail, CreditLedgerEntry } from '../../types/admin';

interface UserManagementProps {
  token: string;
}

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'ACTIVE', label: '正常' },
  { value: 'DISABLED', label: '已禁用' },
];

export const UserManagement = ({ token }: UserManagementProps) => {
  const [users, setUsers] = useState<AdminUserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Credit adjustment modal
  const [adjustingUser, setAdjustingUser] = useState<AdminUserDetail | null>(null);
  const [creditAmount, setCreditAmount] = useState(100);
  const [creditReason, setCreditReason] = useState('');
  const [adjustingLoading, setAdjustingLoading] = useState(false);
  
  // User status modal
  const [statusUser, setStatusUser] = useState<AdminUserDetail | null>(null);
  const [statusAction, setStatusAction] = useState<'enable' | 'disable'>('disable');
  const [statusReason, setStatusReason] = useState('');
  const [statusOptions, setStatusOptions] = useState({
    revokeTokens: true,
    blockNewRuns: true,
    terminateRunningRuns: false,
  });
  const [statusLoading, setStatusLoading] = useState(false);
  
  // Credit ledger modal
  const [ledgerUser, setLedgerUser] = useState<AdminUserDetail | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<CreditLedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTotal, setLedgerTotal] = useState(0);

  useEffect(() => {
    fetchUsers();
  }, [token, page, statusFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers(token, page, pageSize, keyword || undefined, statusFilter || undefined);
      setUsers(res.users || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error("加载用户失败", err);
      alert("加载用户列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchUsers();
  };

  const handleCreditAdjust = async () => {
    if (!adjustingUser) return;
    
    if (!creditReason.trim() || creditReason.trim().length < 5) {
      alert('请提供调整原因（至少5个字符）');
      return;
    }

    setAdjustingLoading(true);
    const idempotencyKey = `admin-credit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const res = await adjustUserCredit(token, adjustingUser.userId, creditAmount, creditReason, idempotencyKey);
      alert(`额度调整成功！当前额度: ${res.creditAfter}`);
      setAdjustingUser(null);
      setCreditAmount(100);
      setCreditReason('');
      fetchUsers();
    } catch (err: any) {
      console.error("调整额度失败", err);
      alert('调整失败: ' + (err?.message || '未知错误'));
    } finally {
      setAdjustingLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!statusUser) return;
    
    if (!statusReason.trim() || statusReason.trim().length < 5) {
      alert('请提供状态变更原因（至少5个字符）');
      return;
    }

    setStatusLoading(true);
    const targetStatus = statusAction === 'enable' ? 'ACTIVE' : 'DISABLED';

    try {
      const res = await updateUserStatus(token, statusUser.userId, targetStatus, statusReason, statusOptions);
      const actions = res.effectiveActions;
      let msg = `用户状态已更新为 ${targetStatus}`;
      if (actions.tokensRevokedCount > 0) msg += `，已撤销 ${actions.tokensRevokedCount} 个登录令牌`;
      if (actions.newRunsBlocked) msg += '，已阻止新运行';
      if (actions.runningRunsTerminatedCount > 0) msg += `，已终止 ${actions.runningRunsTerminatedCount} 个运行中任务`;
      alert(msg);
      setStatusUser(null);
      setStatusReason('');
      fetchUsers();
    } catch (err: any) {
      console.error("更新状态失败", err);
      alert('更新失败: ' + (err?.message || '未知错误'));
    } finally {
      setStatusLoading(false);
    }
  };

  const viewCreditLedger = async (user: AdminUserDetail) => {
    setLedgerUser(user);
    setLedgerPage(1);
    await fetchLedger(user.userId, 1);
  };

  const fetchLedger = async (userId: string, pageNum: number) => {
    setLedgerLoading(true);
    try {
      const res = await getCreditLedger(token, pageNum, 10, { userId });
      setLedgerEntries(res.entries || []);
      setLedgerTotal(res.total || 0);
      setLedgerPage(pageNum);
    } catch (err) {
      console.error("加载额度流水失败", err);
    } finally {
      setLedgerLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">正常</span>;
      case 'DISABLED':
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">已禁用</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const totalPages = Math.ceil(total / pageSize);
  const ledgerTotalPages = Math.ceil(ledgerTotal / 10);

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <h2 className="text-xl font-bold text-ink-900">用户管理</h2>
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

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索用户名/邮箱"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-sky-500 focus:outline-none w-40"
            />
          </div>

          <ActionButton onClick={handleSearch} variant="ghost" className="flex items-center gap-2">
            <Search size={16} />
          </ActionButton>
          <ActionButton onClick={fetchUsers} variant="ghost" className="flex items-center gap-2">
            <RefreshCw size={16} />
          </ActionButton>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-sky-100 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={32} className="animate-spin text-sky-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-sky-100">
              <thead className="bg-sky-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-sky-700 uppercase">用户</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-sky-700 uppercase">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-sky-700 uppercase">额度</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-sky-700 uppercase">注册时间</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-sky-700 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-sky-100">
                {users.map((user) => (
                  <tr key={user.userId} className="hover:bg-sky-50/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-ink-900">{user.username}</div>
                          <div className="text-xs text-ink-400">{user.email}</div>
                          <div className="text-xs text-gray-400 font-mono">ID: {user.userId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(user.status)}
                      {user.disabledAt && (
                        <div className="text-xs text-red-500 mt-1">
                          于 {formatDate(Date.parse(user.disabledAt))} 禁用
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-mono font-medium text-ink-900">{user.credit.toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-ink-500">
                      {formatDate(user.registerTime)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => viewCreditLedger(user)}
                          className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition"
                          title="查看额度流水"
                        >
                          <History size={16} />
                        </button>
                        <button 
                          onClick={() => { setAdjustingUser(user); setCreditAmount(100); setCreditReason(''); }}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="调整额度"
                        >
                          <Coins size={16} />
                        </button>
                        {user.status === 'ACTIVE' ? (
                          <button 
                            onClick={() => { 
                              setStatusUser(user); 
                              setStatusAction('disable'); 
                              setStatusReason('');
                              setStatusOptions({ revokeTokens: true, blockNewRuns: true, terminateRunningRuns: false });
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="禁用用户"
                          >
                            <Ban size={16} />
                          </button>
                        ) : (
                          <button 
                            onClick={() => { 
                              setStatusUser(user); 
                              setStatusAction('enable'); 
                              setStatusReason('');
                            }}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="启用用户"
                          >
                            <CheckCircle size={16} />
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
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-sky-100">
            <div className="text-sm text-ink-500">
              共 {total} 条，第 {page}/{totalPages} 页
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Credit Adjustment Modal */}
      {adjustingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-ink-900">调整用户额度</h3>
              <button onClick={() => setAdjustingUser(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-ink-500">用户:</span>
                <span className="font-medium">{adjustingUser.username}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-500">当前额度:</span>
                <span className="font-mono font-medium">{adjustingUser.credit.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">
                  调整金额 (正数增加，负数减少)
                </label>
                <input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-sky-500 focus:outline-none"
                  placeholder="输入金额"
                />
                <p className="text-xs text-ink-400 mt-1">
                  调整后额度: {(adjustingUser.credit + creditAmount).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">
                  调整原因 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-sky-500 focus:outline-none resize-y min-h-[80px]"
                  placeholder="请输入调整原因（至少5个字符）..."
                />
              </div>

              <p className="text-xs text-ink-400">
                此操作将被记录在审计日志中
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setAdjustingUser(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-ink-600 hover:bg-gray-50 transition"
              >
                取消
              </button>
              <ActionButton
                onClick={handleCreditAdjust}
                disabled={adjustingLoading || !creditReason.trim() || creditReason.trim().length < 5}
                className="flex-1"
              >
                {adjustingLoading ? <Loader2 size={16} className="animate-spin" /> : '确认调整'}
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {statusUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-ink-900">
                {statusAction === 'enable' ? '启用用户' : '禁用用户'}
              </h3>
              <button onClick={() => setStatusUser(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-ink-500">用户:</span>
                <span className="font-medium">{statusUser.username}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-500">当前状态:</span>
                <span>{getStatusBadge(statusUser.status)}</span>
              </div>
            </div>

            {statusAction === 'disable' && (
              <div className="space-y-3 mb-4">
                <label className="flex items-center gap-2 p-3 bg-red-50 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={statusOptions.revokeTokens}
                    onChange={(e) => setStatusOptions(p => ({ ...p, revokeTokens: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <div>
                    <p className="text-sm font-medium text-red-900">撤销所有登录令牌</p>
                    <p className="text-xs text-red-600">用户将被强制登出</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={statusOptions.blockNewRuns}
                    onChange={(e) => setStatusOptions(p => ({ ...p, blockNewRuns: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <div>
                    <p className="text-sm font-medium text-amber-900">阻止新的 Agent 运行</p>
                    <p className="text-xs text-amber-600">用户将无法启动新的任务</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-3 bg-orange-50 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={statusOptions.terminateRunningRuns}
                    onChange={(e) => setStatusOptions(p => ({ ...p, terminateRunningRuns: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <div>
                    <p className="text-sm font-medium text-orange-900">终止运行中的任务</p>
                    <p className="text-xs text-orange-600">强制停止用户正在运行的 Agent 任务</p>
                  </div>
                </label>
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-sm font-medium text-ink-700">
                {statusAction === 'enable' ? '启用原因' : '禁用原因'} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-sky-500 focus:outline-none resize-y min-h-[80px]"
                placeholder={`请输入${statusAction === 'enable' ? '启用' : '禁用'}原因（至少5个字符）...`}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStatusUser(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-ink-600 hover:bg-gray-50 transition"
              >
                取消
              </button>
              <button
                onClick={handleStatusChange}
                disabled={statusLoading || !statusReason.trim() || statusReason.trim().length < 5}
                className={`flex-1 px-4 py-2 rounded-xl text-white transition disabled:opacity-50 ${
                  statusAction === 'enable' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {statusLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : `确认${statusAction === 'enable' ? '启用' : '禁用'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Ledger Modal */}
      {ledgerUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-ink-900">额度流水</h3>
                <p className="text-sm text-ink-500">用户: {ledgerUser.username}</p>
              </div>
              <button onClick={() => setLedgerUser(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {ledgerLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-sky-600" />
                </div>
              ) : ledgerEntries.length === 0 ? (
                <p className="text-center text-ink-400 py-8">暂无额度变动记录</p>
              ) : (
                <div className="space-y-3">
                  {ledgerEntries.map((entry) => (
                    <div key={entry.ledgerId} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${entry.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {entry.delta >= 0 ? '+' : ''}{entry.delta.toLocaleString()}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white text-gray-600">
                            {entry.bizType}
                          </span>
                        </div>
                        <span className="text-xs text-ink-400">{new Date(entry.createdAt).toLocaleString('zh-CN')}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-ink-500">
                          余额: {entry.balanceBefore.toLocaleString()} → {entry.balanceAfter.toLocaleString()}
                        </span>
                        {entry.operatorId && (
                          <span className="text-xs text-ink-400">操作人: {entry.operatorId}</span>
                        )}
                      </div>
                      {entry.sourceType && (
                        <div className="text-xs text-ink-400 mt-1">
                          来源: {entry.sourceType} {entry.sourceId}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {ledgerTotalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <div className="text-sm text-ink-500">
                  共 {ledgerTotal} 条
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchLedger(ledgerUser.userId, ledgerPage - 1)}
                    disabled={ledgerPage === 1 || ledgerLoading}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => fetchLedger(ledgerUser.userId, ledgerPage + 1)}
                    disabled={ledgerPage === ledgerTotalPages || ledgerLoading}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
