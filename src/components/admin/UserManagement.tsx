import { useState, useEffect } from 'react';
import { getUsers, updateUserStatus, adjustUserCredit } from '../../api/admin';
import ActionButton from '../ActionButton';
import { Shield, Ban, CheckCircle, Coins } from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
  status: number; // 0: Disabled, 1: Enabled (Assuming)
  credit: number;
  createdAt: string;
}

interface UserManagementProps {
  token: string;
}

export const UserManagement = ({ token }: UserManagementProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustingUser, setAdjustingUser] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState(100);

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers(token);
      setUsers(res.items || res); // Adapt to API response structure
    } catch (err) {
      console.error("加载用户失败", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: number) => {
    try {
      await updateUserStatus(token, userId, newStatus);
      fetchUsers();
    } catch (err) {
      alert("更新状态失败");
    }
  };

  const handleCreditAdjust = async (userId: string) => {
    try {
      await adjustUserCredit(token, userId, creditAmount, "Admin adjustment");
      setAdjustingUser(null);
      fetchUsers();
    } catch (err) {
      alert("调整额度失败");
    }
  };

  if (loading) return <div>加载用户列表...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-ink-900">用户管理</h2>
        <ActionButton onClick={fetchUsers} variant="ghost">刷新</ActionButton>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-sky-100">
          <thead className="bg-sky-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-sky-700 uppercase tracking-wider">用户</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-sky-700 uppercase tracking-wider">状态</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-sky-700 uppercase tracking-wider">额度</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-sky-700 uppercase tracking-wider">注册时间</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-sky-700 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-sky-100">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-ink-900">{user.username}</div>
                      <div className="text-sm text-ink-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.status === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.status === 1 ? '正常' : '禁用'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-900 font-mono">
                  {user.credit.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setAdjustingUser(user.id === adjustingUser ? null : user.id)}
                      className="text-amber-600 hover:text-amber-900"
                      title="调整额度"
                    >
                      <Coins size={18} />
                    </button>
                    {user.status === 1 ? (
                      <button 
                        onClick={() => handleStatusChange(user.id, 0)}
                        className="text-red-600 hover:text-red-900"
                        title="禁用用户"
                      >
                        <Ban size={18} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleStatusChange(user.id, 1)}
                        className="text-green-600 hover:text-green-900"
                        title="启用用户"
                      >
                        <CheckCircle size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adjustingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold text-ink-900 mb-4">调整额度</h3>
            <p className="text-sm text-ink-600 mb-4">
              为用户增加或减少额度。使用负数减少额度。
            </p>
            <input
              type="number"
              value={creditAmount}
              onChange={(e) => setCreditAmount(Number(e.target.value))}
              className="w-full rounded-xl border border-sky-200 px-4 py-2 mb-4 focus:ring-2 focus:ring-sky-500 outline-none"
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setAdjustingUser(null)}
                className="px-4 py-2 text-ink-600 hover:bg-gray-100 rounded-xl transition"
              >
                取消
              </button>
              <ActionButton onClick={() => handleCreditAdjust(adjustingUser)}>
                确认
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
