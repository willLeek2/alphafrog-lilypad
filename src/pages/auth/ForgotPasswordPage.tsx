import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import ActionButton from "../../components/ActionButton";
import { forgotPassword } from "../../api/auth";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await forgotPassword(email);
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || "发送重置邮件失败");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <AuthLayout title="请检查您的邮箱" subtitle="密码重置链接已发送">
        <div className="text-center">
          <p className="text-sm text-ink-600 mb-6">
            我们已发送密码重置链接至 <span className="font-semibold">{email}</span>。
            请检查您的收件箱（包括垃圾邮件文件夹），并按照说明重置密码。
          </p>
          
          <Link to="/login">
            <ActionButton className="w-full justify-center">
              返回登录
            </ActionButton>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="重置密码" subtitle="输入您的邮箱以接收重置链接">
      <form className="space-y-6" onSubmit={handleSubmit}>
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

        {error && (
          <div className="rounded-xl bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">请求失败</h3>
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
            {isLoading ? "发送中..." : "发送重置链接"}
          </ActionButton>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-ink-600">
          记起密码了？{" "}
          <Link to="/login" className="font-medium text-sky-600 hover:text-sky-500">
            立即登录
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
