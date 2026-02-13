import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import ActionButton from "../../components/ActionButton";
import { login, getMe } from "../../api/auth";
import { saveAuth } from "../../utils/storage";

const LoginPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 1. Login to get token
      // Backend may return plain text token or JSON { token: "..." }
      const loginResult = await login({ username, password });
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
