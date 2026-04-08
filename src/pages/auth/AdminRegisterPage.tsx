import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import ActionButton from '../../components/ActionButton';
import { adminCreate, adminLogin } from '../../api/admin';
import { getTokenExpiryIso } from '../../utils/jwt';
import { loadAdminAuth, saveAdminAuth } from '../../utils/storage';

const AdminRegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [magicPassword, setMagicPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const auth = loadAdminAuth();
    if (auth?.token) {
      const isExpired = auth.tokenExpiresAt && Date.parse(auth.tokenExpiresAt) <= Date.now();
      if (!isExpired) {
        setIsLoggedIn(true);
      }
    }
  }, []);

  if (isLoggedIn) {
    return <Navigate to="/app/admin" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致。');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await adminCreate({
        username,
        password,
        email,
        magicPassword,
      });

      const loginResult = await adminLogin({ username, password });
      const token = typeof loginResult === 'string'
        ? loginResult.replace(/^"|"$/g, '')
        : loginResult?.token;

      if (!token) {
        throw new Error('注册后自动登录失败，未获取到 token');
      }

      saveAdminAuth({
        username,
        token,
        tokenExpiresAt: getTokenExpiryIso(token),
      });

      window.location.href = '/app/admin';
    } catch (err: any) {
      setError(err.message || '管理员注册失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="创建管理员" subtitle="使用 Magic Password 开通后台账号">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-xs font-medium text-amber-700">
          该页面会直接调用 `/admin/create` 创建管理员账号
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-ink-700">
            用户名
          </label>
          <div className="mt-1">
            <input
              id="username"
              name="username"
              type="text"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="block w-full rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3 text-ink-900 shadow-sm outline-none transition-colors focus:border-amber-400"
              placeholder="请输入管理员用户名"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink-700">
            邮箱
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="block w-full rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3 text-ink-900 shadow-sm outline-none transition-colors focus:border-amber-400"
              placeholder="admin@alphafrog.ai"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-ink-700">
            密码
          </label>
          <div className="mt-1">
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="block w-full rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3 text-ink-900 shadow-sm outline-none transition-colors focus:border-amber-400"
              placeholder="请输入密码"
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-700">
            确认密码
          </label>
          <div className="mt-1">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="block w-full rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3 text-ink-900 shadow-sm outline-none transition-colors focus:border-amber-400"
              placeholder="请再次输入密码"
            />
          </div>
        </div>

        <div>
          <label htmlFor="magicPassword" className="block text-sm font-medium text-ink-700">
            Magic Password
          </label>
          <div className="mt-1">
            <input
              id="magicPassword"
              name="magicPassword"
              type="password"
              required
              value={magicPassword}
              onChange={(event) => setMagicPassword(event.target.value)}
              className="block w-full rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3 text-ink-900 shadow-sm outline-none transition-colors focus:border-amber-400"
              placeholder="请输入管理员创建口令"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-4">
            <h3 className="text-sm font-medium text-red-800">注册失败</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        )}

        <ActionButton type="submit" className="w-full justify-center" disabled={isLoading}>
          {isLoading ? '创建中...' : '创建管理员并登录'}
        </ActionButton>
      </form>

      <div className="mt-6 text-center text-sm text-ink-600">
        已有管理员账号？
        <Link to="/admin/login" className="ml-1 font-medium text-amber-600 hover:text-amber-500">
          返回登录
        </Link>
      </div>
    </AuthLayout>
  );
};

export default AdminRegisterPage;
