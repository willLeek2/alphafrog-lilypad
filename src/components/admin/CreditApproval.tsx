import { useState, useEffect } from 'react';
import { getCreditRequests, approveCreditRequest, rejectCreditRequest, getCreditRequestDetail } from '../../api/admin';
import ActionButton from '../ActionButton';
import { Check, X, Clock, RefreshCw, Search, Eye, History, User, Loader2 } from 'lucide-react';
import type { CreditApplication, CreditApplicationAudit } from '../../api/admin';

interface CreditApprovalProps {
  token: string;
}

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'PENDING', label: '待审核' },
  { value: 'APPROVED', label: '已通过' },
  { value: 'REJECTED', label: '已拒绝' },
];

export const CreditApproval = ({ token }: CreditApprovalProps) => {
  const [requests, setRequests] = useState<CreditApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CreditApplication | null>(null);
  const [auditTrail, setAuditTrail] = useState<CreditApplicationAudit[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Approval/Rejection modal state
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processAction, setProcessAction] = useState<'approve' | 'reject'>('approve');
  const [processReason, setProcessReason] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [token, page, statusFilter, userIdFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await getCreditRequests(token, page, pageSize, statusFilter || undefined, userIdFilter || undefined);
      setRequests(res.applications || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error("加载额度申请失败", err);
      alert("加载失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (request: CreditApplication) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
    setDetailLoading(true);
    try {
      const res = await getCreditRequestDetail(token, request.applicationId);
      setAuditTrail(res.auditTrail || []);
    } catch (err) {
      console.error("加载详情失败", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const openProcessModal = (request: CreditApplication, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setProcessAction(action);
    setProcessReason('');
    setShowProcessModal(true);
  };

  const handleProcess = async () => {
    if (!selectedRequest) return;
    
    if (!processReason.trim() || processReason.trim().length < 5) {
      alert('请提供处理原因（至少5个字符）');
      return;
    }

    setProcessingId(selectedRequest.applicationId);
    setShowProcessModal(false);

    // Generate idempotency key
    const idempotencyKey = `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      if (processAction === 'approve') {
        await approveCreditRequest(
          token, 
          selectedRequest.applicationId, 
          processReason, 
          selectedRequest.version,
          idempotencyKey
        );
      } else {
        await rejectCreditRequest(
          token, 
          selectedRequest.applicationId, 
          processReason, 
          selectedRequest.version,
          idempotencyKey
        );
      }
      alert(processAction === 'approve' ? '已通过申请' : '已拒绝申请');
      fetchRequests();
    } catch (err: any) {
      console.error("处理申请失败", err);
      const errorMsg = err?.message || '';
      if (errorMsg.includes('409') || errorMsg.includes('CONFLICT')) {
        alert('该申请已被其他管理员处理或版本冲突，请刷新查看最新状态');
        fetchRequests();
      } else {
        alert('处理失败: ' + errorMsg);
      }
    } finally {
      setProcessingId(null);
      setSelectedRequest(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1"><Clock size={12} /> 待审核</span>;
      case 'APPROVED':
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 flex items-center gap-1"><Check size={12} /> 已通过</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 flex items-center gap-1"><X size={12} /> 已拒绝</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const totalPages = Math.ceil(total / pageSize);
  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink-900">额度审批</h2>
          <p className="text-sm text-ink-500 mt-1">
            待处理: <span className="text-amber-600 font-semibold">{pendingCount}</span> 条申请
          </p>
        </div>
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
              placeholder="用户ID搜索"
              value={userIdFilter}
              onChange={(e) => { setUserIdFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-sky-500 focus:outline-none w-32"
            />
          </div>

          <ActionButton onClick={fetchRequests} variant="ghost" className="flex items-center gap-2">
            <RefreshCw size={16} /> 刷新
          </ActionButton>
        </div>
      </div>

      {/* Requests Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-sky-600" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-sky-100">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-ink-400">暂无额度申请</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {requests.map((req) => (
            <div key={req.applicationId} className="bg-white rounded-2xl border border-sky-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
                    <User size={20} className="text-sky-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-ink-900">用户 #{req.userId}</p>
                    <p className="text-xs text-ink-400">{formatDate(req.createdAt)}</p>
                  </div>
                </div>
                {getStatusBadge(req.status)}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">申请额度:</span>
                  <span className="font-mono font-bold text-emerald-600">+{req.amount.toLocaleString()}</span>
                </div>
                <div className="text-sm">
                  <span className="text-ink-500">申请理由:</span>
                  <p className="mt-1 text-ink-700 bg-slate-50 p-2 rounded-lg text-xs line-clamp-2">
                    {req.reason || "未提供理由"}
                  </p>
                </div>
                {req.contact && (
                  <div className="text-sm">
                    <span className="text-ink-500">联系方式:</span>
                    <span className="ml-2 text-ink-700">{req.contact}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleViewDetail(req)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition text-sm"
                >
                  <Eye size={14} /> 详情
                </button>
                
                {req.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => openProcessModal(req, 'reject')}
                      disabled={processingId === req.applicationId}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 transition text-sm disabled:opacity-50"
                    >
                      {processingId === req.applicationId ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                      拒绝
                    </button>
                    <button
                      onClick={() => openProcessModal(req, 'approve')}
                      disabled={processingId === req.applicationId}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition text-sm disabled:opacity-50 shadow-md shadow-emerald-200"
                    >
                      {processingId === req.applicationId ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      通过
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
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

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-ink-900 flex items-center gap-2">
                <History size={20} className="text-sky-600" />
                申请详情
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Application Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">申请ID</p>
                  <p className="text-sm font-mono text-ink-900">{selectedRequest.applicationId}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">用户ID</p>
                  <p className="text-sm font-mono text-ink-900">{selectedRequest.userId}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">申请金额</p>
                  <p className="text-lg font-bold text-emerald-600">+{selectedRequest.amount.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">版本号</p>
                  <p className="text-sm font-mono text-ink-900">v{selectedRequest.version}</p>
                </div>
              </div>

              <div className="bg-sky-50 rounded-xl p-4">
                <p className="text-sm font-medium text-sky-900 mb-2">申请理由</p>
                <p className="text-sm text-sky-800">{selectedRequest.reason || "未提供理由"}</p>
              </div>

              {selectedRequest.contact && (
                <div>
                  <p className="text-sm font-medium text-ink-900 mb-2">联系方式</p>
                  <p className="text-sm text-ink-600">{selectedRequest.contact}</p>
                </div>
              )}

              {/* Audit Trail */}
              <div>
                <h4 className="text-sm font-medium text-ink-900 mb-3 flex items-center gap-2">
                  <History size={16} />
                  审计记录
                </h4>
                {detailLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-sky-600" />
                  </div>
                ) : auditTrail.length === 0 ? (
                  <p className="text-sm text-ink-400 py-4">暂无审计记录</p>
                ) : (
                  <div className="space-y-3">
                    {auditTrail.map((audit) => (
                      <div key={audit.auditId} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            audit.action === 'APPROVE' ? 'bg-green-100 text-green-700' :
                            audit.action === 'REJECT' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {audit.action === 'APPROVE' ? '审批通过' : 
                             audit.action === 'REJECT' ? '审批拒绝' : audit.action}
                          </span>
                          <span className="text-xs text-ink-400">{formatDate(audit.createdAt)}</span>
                        </div>
                        <p className="text-xs text-ink-500 mb-1">操作人: {audit.operatorId}</p>
                        <p className="text-sm text-ink-700">{audit.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <ActionButton onClick={() => setShowDetailModal(false)}>
                关闭
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Process Modal */}
      {showProcessModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-ink-900 mb-4">
              {processAction === 'approve' ? '通过额度申请' : '拒绝额度申请'}
            </h3>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-ink-500">申请用户:</span>
                <span className="font-medium">#{selectedRequest.userId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-500">申请额度:</span>
                <span className="font-bold text-emerald-600">+{selectedRequest.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-ink-700">
                {processAction === 'approve' ? '通过原因' : '拒绝原因'}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                value={processReason}
                onChange={(e) => setProcessReason(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none resize-y min-h-[100px]"
                placeholder={`请输入${processAction === 'approve' ? '通过' : '拒绝'}原因（至少5个字符）...`}
              />
              <p className="text-xs text-ink-400">
                此操作将被记录在审计日志中，且不可撤销
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowProcessModal(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-ink-600 hover:bg-gray-50 transition"
              >
                取消
              </button>
              <button
                onClick={handleProcess}
                disabled={!processReason.trim() || processReason.trim().length < 5}
                className={`flex-1 px-4 py-2 rounded-xl text-white transition disabled:opacity-50 ${
                  processAction === 'approve' 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                确认{processAction === 'approve' ? '通过' : '拒绝'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
