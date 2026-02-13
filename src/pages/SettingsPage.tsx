import { useState, useEffect } from 'react';
import ActionButton from '../components/ActionButton';
import { Shield, Key, Coins, CreditCard } from 'lucide-react';
import { AuthUser } from '../types/auth';
import { changePassword } from '../api/auth';
import { getCreditBalance, requestCredit } from '../api/credit';
import { loadAuth } from '../utils/storage';

interface SettingsPageProps {
  user: AuthUser;
}

const SettingsPage = ({ user }: SettingsPageProps) => {
  const [requestAmount, setRequestAmount] = useState<number>(500);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  
  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isPwdLoading, setIsPwdLoading] = useState(false);

  // Credit Request State
  const [creditMsg, setCreditMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isCreditLoading, setIsCreditLoading] = useState(false);

  useEffect(() => {
    fetchCreditBalance();
  }, []);

  const fetchCreditBalance = async () => {
    try {
      const auth = loadAuth();
      if (auth?.token) {
        const data = await getCreditBalance(auth.token);
        setCreditBalance(typeof data === 'number' ? data : data?.balance || 0);
      }
    } catch (err) {
      console.error("获取额度失败", err);
    }
  };

  const handleChangePassword = async () => {
    setPwdMsg(null);
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: "新密码输入不一致" });
      return;
    }
    if (newPassword.length < 8) {
      setPwdMsg({ type: 'error', text: "密码长度不能少于8位" });
      return;
    }

    setIsPwdLoading(true);
    try {
      const auth = loadAuth();
      if (!auth?.token) throw new Error("未登录");
      
      await changePassword(auth.token, currentPassword, newPassword);
      setPwdMsg({ type: 'success', text: "密码修改成功" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwdMsg({ type: 'error', text: err.message || "修改密码失败" });
    } finally {
      setIsPwdLoading(false);
    }
  };

  const handleRequestCredit = async () => {
    setCreditMsg(null);
    setIsCreditLoading(true);
    try {
      const auth = loadAuth();
      if (!auth?.token) throw new Error("未登录");

      await requestCredit(auth.token, requestAmount, "User requested from settings");
      setCreditMsg({ type: 'success', text: "额度申请提交成功" });
      // Optionally refresh balance if auto-approved
      fetchCreditBalance();
    } catch (err: any) {
      setCreditMsg({ type: 'error', text: err.message || "申请额度失败" });
    } finally {
      setIsCreditLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">
      <h1 className="text-2xl font-bold text-ink-900">账户设置</h1>

      {/* Account Info */}
      <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
            <Shield size={20} />
          </div>
          <h2 className="text-lg font-semibold text-ink-900">个人信息</h2>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">用户名</label>
            <input 
              type="text" 
              value={user.username} 
              disabled 
              className="w-full rounded-xl border border-sky-200 bg-slate-50 px-3 py-2 text-ink-500 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
            <Key size={20} />
          </div>
          <h2 className="text-lg font-semibold text-ink-900">安全设置</h2>
        </div>

        <div className="space-y-4 max-w-md">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">当前密码</label>
            <input 
              type="password" 
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-sky-200 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">新密码</label>
            <input 
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-sky-200 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
            <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">确认新密码</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-sky-200 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          
          {pwdMsg && (
            <div className={`text-sm ${pwdMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {pwdMsg.text}
            </div>
          )}

          <div className="pt-2">
            <ActionButton 
              onClick={handleChangePassword} 
              disabled={isPwdLoading}
            >
              {isPwdLoading ? "修改中..." : "修改密码"}
            </ActionButton>
          </div>
        </div>
      </div>

      {/* Credit Management */}
      <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <Coins size={20} />
            </div>
            <h2 className="text-lg font-semibold text-ink-900">额度管理</h2>
          </div>
          <div className="text-right">
            <p className="text-sm text-ink-500">可用余额</p>
            <p className="text-2xl font-bold text-emerald-600">{creditBalance.toLocaleString()} <span className="text-sm font-normal text-ink-400">Credits</span></p>
          </div>
        </div>

        <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
          <h3 className="font-medium text-ink-900 mb-2 flex items-center gap-2">
            <CreditCard size={16} />
            申请额度充值
          </h3>
          <p className="text-sm text-ink-600 mb-4">
            您可以申请额外的额度用于测试和使用。额度将用于支付 AI 推理和高级工具调用费用。
          </p>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-2">
                <span className="text-sm text-ink-500">金额:</span>
                <input 
                  type="number" 
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(Number(e.target.value))}
                  className="w-24 text-right font-medium text-ink-900 focus:outline-none"
                  step={100}
                  min={100}
                />
                <span className="text-sm text-ink-500">Credits</span>
              </div>
              <ActionButton 
                variant="outline" 
                className="bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                onClick={handleRequestCredit}
                disabled={isCreditLoading}
              >
                {isCreditLoading ? "提交中..." : "提交申请"}
              </ActionButton>
          </div>
          {creditMsg && (
            <div className={`mt-2 text-sm ${creditMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {creditMsg.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
