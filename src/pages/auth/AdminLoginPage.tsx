import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import ActionButton from '../../components/ActionButton';
import { adminLogin } from '../../api/admin';
import { getTokenExpiryIso } from '../../utils/jwt';
import { loadAdminAuth, saveAdminAuth } from '../../utils/storage';

const AdminLoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    setError(null);
    setIsLoading(true);

    try {
      const loginResult = await adminLogin({ username, password });
      const token = typeof loginResult === 'string'
        ? loginResult.replace(/^"|"$/g, '')
        : loginResult?.token;

      if (!token) {
        throw new Error('登录响应中未找到 token');
      }

      saveAdminAuth({
        username,
        token,
        tokenExpiresAt: getTokenExpiryIso(token),
      });

      window.location.href = '/app/admin';
    } catch (err: any) {
      setError(err.message || '管理员登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="管理员登录" subtitle="进入 AlphaFrog 管理后台">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-xs font-medium text-amber-700">
          仅限平台管理员使用
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

        {error && (
          <div className="rounded-xl bg-red-50 p-4">
            <h3 className="text-sm font-medium text-red-800">登录失败</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        )}

        <ActionButton type="submit" className="w-full justify-center" disabled={isLoading}>
          {isLoading ? '登录中...' : '登录管理员后台'}
        </ActionButton>
      </form>

      <div className="mt-6 text-center text-sm text-ink-600">
        还没有管理员账号？
        <Link to="/admin/register" className="ml-1 font-medium text-amber-600 hover:text-amber-500">
          创建管理员
        </Link>
      </div>
    </AuthLayout>
  );
};

export default AdminLoginPage;
