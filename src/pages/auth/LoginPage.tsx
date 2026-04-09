import { useState, FormEvent, useEffect } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import ActionButton from "../../components/ActionButton";
import { login, getMe, logout } from "../../api/auth";
import { saveAuth, loadAuth } from "../../utils/storage";

const LoginPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 检查是否已登录
  useEffect(() => {
    const auth = loadAuth();
    console.log('[LoginPage] Checking auth:', auth);
    // 只要有 token 且未过期（或没有过期时间字段，兼容旧数据）
    if (auth && auth.token) {
      const isExpired = auth.tokenExpiresAt && Date.parse(auth.tokenExpiresAt) <= Date.now();
      if (!isExpired) {
        console.log('[LoginPage] Already logged in, will redirect');
        setIsLoggedIn(true);
      } else {
        console.log('[LoginPage] Token expired');
      }
    } else {
      console.log('[LoginPage] Not logged in');
    }
  }, []);

  // 已登录用户重定向到工作台
  if (isLoggedIn) {
    return <Navigate to="/app/profile" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 1. Login to get token
      // Backend may return plain text token or JSON { token: "..." }
      let loginResult;
      try {
        loginResult = await login({ username, password });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "";
        if (message.includes("User already logged in")) {
          await logout({ username });
          loginResult = await login({ username, password });
        } else {
          throw err;
        }
      }
      const token = typeof loginResult === 'string' 
        ? loginResult.replace(/^"|"$/g, '') // Strip surrounding quotes if any
        : loginResult.token;
      
      if (!token) {
        throw new Error("登录响应中未找到 token");
      }
      
      // 2. Get user profile
      const userProfile = await getMe(token);
      
      // 3. Save combined auth data
      saveAuth({
        ...userProfile,
        token,
        username // Ensure username is present if not in profile
      });

      // 4. Redirect
      navigate("/app/profile");
      // Force reload to update app state
      window.location.reload(); 
    } catch (err: any) {
      setError(err.message || "登录失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="欢迎回来" subtitle="登录您的账户">
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
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-ink-700">
              密码
            </label>
            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-sky-600 hover:text-sky-500"
              >
                忘记密码？
              </Link>
            </div>
          </div>
          <div className="mt-1">
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3 text-ink-900 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">登录失败</h3>
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
            {isLoading ? "登录中..." : "登录"}
          </ActionButton>
        </div>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-ink-500">或者</span>
          </div>
        </div>

        <div className="mt-6 text-center">
            <p className="text-sm text-ink-600">
            还没有账户？{" "}
            <Link to="/register" className="font-medium text-sky-600 hover:text-sky-500">
                立即注册
            </Link>
            </p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
