import { useState, FormEvent, useEffect } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import ActionButton from "../../components/ActionButton";
import { register, login, getMe } from "../../api/auth";
import { saveAuth, loadAuth } from "../../utils/storage";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 检查是否已登录
  useEffect(() => {
    const auth = loadAuth();
    // 只要有 token 且未过期（或没有过期时间字段，兼容旧数据）
    if (auth && auth.token) {
      const isExpired = auth.tokenExpiresAt && Date.parse(auth.tokenExpiresAt) <= Date.now();
      if (!isExpired) {
        setIsLoggedIn(true);
      }
    }
  }, []);

  // 已登录用户重定向到工作台
  if (isLoggedIn) {
    return <Navigate to="/app/profile" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError("您必须同意服务条款和隐私政策。");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }
    
    setError(null);
    setIsLoading(true);

    try {
      // 1. Register
      await register({ username, password, email, inviteCode });

      // 2. Auto Login
      const { token } = await login({ username, password });

      // 3. Get user profile
      const userProfile = await getMe(token);
      
      // 4. Save auth
      saveAuth({
        ...userProfile,
        token,
        username
      });

      // 5. Redirect
      navigate("/app/profile");
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "注册失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="创建账户" subtitle="立即加入 AlphaFrog">
      <form className="space-y-6" onSubmit={handleSubmit}>
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
              onChange={(e) => setUsername(e.target.value)}
              className="block w-full rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3 text-ink-900 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm outline-none transition-colors"
              placeholder="请输入用户名"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink-700">
            电子邮箱
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3 text-ink-900 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm outline-none transition-colors"
              placeholder="you@alphafrog.ai"
            />
          </div>
        </div>

        <div>
          <label htmlFor="inviteCode" className="block text-sm font-medium text-ink-700">
            邀请码
          </label>
          <div className="mt-1">
            <input
              id="inviteCode"
              name="inviteCode"
              type="text"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="block w-full rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3 text-ink-900 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm outline-none transition-colors"
              placeholder="请输入邀请码"
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
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3 text-ink-900 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm outline-none transition-colors"
              placeholder="至少 8 个字符"
            />
          </div>
          <p className="mt-1 text-xs text-ink-500">
            必须包含至少 8 个字符，包括大小写字母和数字。
          </p>
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
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="block w-full rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3 text-ink-900 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm outline-none transition-colors"
              placeholder="请再次输入密码"
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
          />
          <label htmlFor="terms" className="ml-2 block text-sm text-ink-600">
            我同意{" "}
            <a href="#" className="font-medium text-sky-600 hover:text-sky-500">
              服务条款
            </a>{" "}
            和{" "}
            <a href="#" className="font-medium text-sky-600 hover:text-sky-500">
              隐私政策
            </a>
          </label>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">注册失败</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <ActionButton
            type="submit"
            className="w-full justify-center"
            disabled={isLoading}
          >
            {isLoading ? "创建账户中..." : "创建账户"}
          </ActionButton>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-ink-600">
          已有账户？{" "}
          <Link to="/login" className="font-medium text-sky-600 hover:text-sky-500">
            立即登录
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default RegisterPage;
