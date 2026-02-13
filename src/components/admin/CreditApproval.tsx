import { useState, useEffect } from 'react';
import { getCreditRequests, approveCreditRequest, rejectCreditRequest } from '../../api/admin';
import ActionButton from '../ActionButton';
import { Check, X, Clock } from 'lucide-react';

interface CreditRequest {
  id: string;
  userId: string;
  username: string;
  amount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

interface CreditApprovalProps {
  token: string;
}

export const CreditApproval = ({ token }: CreditApprovalProps) => {
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, [token]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await getCreditRequests(token);
      setRequests(res.items || res);
    } catch (err) {
      console.error("加载额度申请失败", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm("确定通过此申请吗？")) return;
    try {
      await approveCreditRequest(token, id);
      fetchRequests();
    } catch (err) {
      alert("通过申请失败");
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("请输入拒绝理由:");
    if (reason === null) return;
    try {
      await rejectCreditRequest(token, id, reason);
      fetchRequests();
    } catch (err) {
      alert("拒绝申请失败");
    }
  };

  if (loading) return <div>加载申请列表中...</div>;

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-ink-900">额度审批</h2>
        <ActionButton onClick={fetchRequests} variant="ghost">刷新</ActionButton>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {requests.length === 0 && (
          <div className="col-span-full text-center py-10 text-ink-400 bg-white rounded-2xl border border-sky-50">
            暂无待处理申请
          </div>
        )}
        {requests.map((req) => (
          <div key={req.id} className="bg-white rounded-2xl border border-sky-100 p-6 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-ink-900">{req.username}</h3>
                <p className="text-xs text-ink-500">{new Date(req.createdAt).toLocaleString()}</p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                req.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {req.status === 'PENDING' ? '待审核' : req.status === 'APPROVED' ? '已通过' : '已拒绝'}
              </div>
            </div>
            
            <div className="flex-1 space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                 <span className="text-ink-600">申请金额:</span>
                 <span className="font-mono font-bold text-emerald-600">+{req.amount.toLocaleString()}</span>
              </div>
              <div className="text-sm text-ink-600">
                <span className="block mb-1 font-medium">理由:</span>
                <p className="bg-slate-50 p-2 rounded-lg text-ink-700 italic text-xs">
                  {req.reason || "未提供理由"}
                </p>
              </div>
            </div>

            {req.status === 'PENDING' && (
              <div className="flex gap-2 mt-auto">
                <button 
                  onClick={() => handleReject(req.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 transition font-medium text-sm"
                >
                  <X size={16} /> 拒绝
                </button>
                <button 
                  onClick={() => handleApprove(req.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition font-medium text-sm shadow-md shadow-emerald-200"
                >
                  <Check size={16} /> 通过
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
