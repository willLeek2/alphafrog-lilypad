import { useEffect, useState, useRef } from "react";
import type { FormEvent } from "react";
import ActionButton from "./ActionButton";

type AdminAuthPanelProps = {
  isOpen: boolean;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onLogin: (payload: { username: string; password: string }) => void;
};

const AdminAuthPanel = ({
  isOpen,
  isLoading,
  error,
  onClose,
  onLogin,
}: AdminAuthPanelProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
    }
  }, [isOpen]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onLogin({ username, password });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-900/40 px-6 py-10 backdrop-blur">
      <div ref={panelRef} className="w-full max-w-md rounded-3xl border border-amber-100 bg-white p-6 shadow-glow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
              管理员登录
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink-900">
              登录管理员后台
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
          >
            关闭
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-ink-700">
            用户名
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm text-ink-900 focus:border-amber-300 focus:outline-none"
              placeholder="请输入管理员用户名"
              required
            />
          </label>
          <label className="block text-sm font-semibold text-ink-700">
            密码
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm text-ink-900 focus:border-amber-300 focus:outline-none"
              placeholder="请输入密码"
              type="password"
              required
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <ActionButton
            type="submit"
            className="w-full justify-center"
            disabled={isLoading}
          >
            {isLoading ? "登录中..." : "登录"}
          </ActionButton>
        </form>
      </div>
    </div>
  );
};

export default AdminAuthPanel;
