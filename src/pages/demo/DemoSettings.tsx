import { useState } from 'react';
import DemoLayout from './DemoLayout';
import ActionButton from '../../components/ActionButton';
import { Shield, Key, Coins, CreditCard } from 'lucide-react';

const DemoSettings = () => {
  const [requestAmount, setRequestAmount] = useState<number>(500);

  return (
    <DemoLayout>
      <div className="mx-auto max-w-4xl space-y-8">
        <h1 className="text-2xl font-bold text-ink-900">账户设置</h1>

        {/* Account Info */}
        <div className="rounded-lg border border-sky-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
              <Shield size={20} />
            </div>
            <h2 className="text-lg font-semibold text-ink-900">账户信息</h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">用户名</label>
              <input 
                type="text" 
                value="demo_user" 
                disabled 
                className="w-full rounded-lg border border-sky-200 bg-slate-50 px-3 py-2 text-ink-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">邮箱</label>
              <input 
                type="text" 
                value="demo@alphafrog.ai" 
                disabled 
                className="w-full rounded-lg border border-sky-200 bg-slate-50 px-3 py-2 text-ink-500"
              />
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="rounded-lg border border-sky-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
             <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <Key size={20} />
            </div>
            <h2 className="text-lg font-semibold text-ink-900">安全设置</h2>
          </div>

          <div className="space-y-4 max-w-md">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">旧密码</label>
              <input 
                type="password" 
                className="w-full rounded-lg border border-sky-200 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">新密码</label>
              <input 
                type="password" 
                className="w-full rounded-lg border border-sky-200 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
             <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">确认新密码</label>
              <input 
                type="password" 
                className="w-full rounded-lg border border-sky-200 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div className="pt-2">
              <ActionButton>修改密码</ActionButton>
            </div>
          </div>
        </div>

        {/* Credit Management */}
        <div className="rounded-lg border border-sky-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <Coins size={20} />
              </div>
              <h2 className="text-lg font-semibold text-ink-900">额度管理</h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-ink-500">当前可用额度</p>
              <p className="text-2xl font-bold text-emerald-600">2,450 <span className="text-sm font-normal text-ink-400">Credits</span></p>
            </div>
          </div>

          <div className="rounded-lg border border-sky-100 bg-sky-50 p-4">
            <h3 className="font-medium text-ink-900 mb-2 flex items-center gap-2">
              <CreditCard size={16} />
              申请额度充值
            </h3>
            <p className="text-sm text-ink-600 mb-4">
              演示环境下，您可以直接向系统管理员申请测试额度。额度将用于支付高级 Agent 推理、深度搜索及代码执行费用。
            </p>
            
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2">
                  <span className="text-sm text-ink-500">申请金额:</span>
                  <input 
                    type="number" 
                    value={requestAmount}
                    onChange={(e) => setRequestAmount(Number(e.target.value))}
                    className="w-20 text-right font-medium text-ink-900 focus:outline-none"
                    step={100}
                    min={100}
                  />
                  <span className="text-sm text-ink-500">Credits</span>
               </div>
               <ActionButton variant="outline" className="bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200">
                 提交申请
               </ActionButton>
            </div>
          </div>
        </div>
      </div>
    </DemoLayout>
  );
};

export default DemoSettings;
