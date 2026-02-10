import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import ActionButton from "./ActionButton";
import { cn } from "../utils/classNames";

type AdminMode = "login" | "create";

type AdminAuthPanelProps = {
  isOpen: boolean;
  mode: AdminMode;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSwitch: (mode: AdminMode) => void;
  onLogin: (payload: { username: string; password: string }) => void;
  onCreate: (payload: { username: string; password: string; email: string; magicPassword: string }) => void;
};

const AdminAuthPanel = ({
  isOpen,
  mode,
  isLoading,
  error,
  onClose,
  onSwitch,
  onLogin,
  onCreate,
}: AdminAuthPanelProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [magicPassword, setMagicPassword] = useState("");

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setMagicPassword("");
    }
  }, [isOpen, mode]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === "login") {
      onLogin({ username, password });
    } else {
      onCreate({ username, password, email, magicPassword });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-900/40 px-6 py-10 backdrop-blur">
      <div className="w-full max-w-md rounded-3xl border border-amber-100 bg-white p-6 shadow-glow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
              {mode === "login" ? "Admin Access" : "Create Admin"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink-900">
              {mode === "login" ? "Sign in to the admin console" : "Provision a new admin"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
          >
            Close
          </button>
        </div>

        <div className="mt-6 flex gap-2 rounded-full bg-amber-50 p-1 text-sm">
          {(["login", "create"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onSwitch(item)}
              className={cn(
                "flex-1 rounded-full px-4 py-2 font-semibold transition",
                mode === item
                  ? "bg-white text-ink-900 shadow"
                  : "text-ink-600 hover:text-ink-900"
              )}
            >
              {item === "login" ? "Login" : "Create"}
            </button>
          ))}
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-ink-700">
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm text-ink-900 focus:border-amber-300 focus:outline-none"
              placeholder="admin_user"
              required
            />
          </label>
          {mode === "create" ? (
            <label className="block text-sm font-semibold text-ink-700">
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm text-ink-900 focus:border-amber-300 focus:outline-none"
                placeholder="admin@alphafrog.ai"
                type="email"
                required
              />
            </label>
          ) : null}
          <label className="block text-sm font-semibold text-ink-700">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm text-ink-900 focus:border-amber-300 focus:outline-none"
              placeholder={mode === "create" ? "At least 8 chars, upper/lower/digit" : "Admin password"}
              type="password"
              required
            />
          </label>
          {mode === "create" ? (
            <label className="block text-sm font-semibold text-ink-700">
              Magic Password
              <input
                value={magicPassword}
                onChange={(event) => setMagicPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm text-ink-900 focus:border-amber-300 focus:outline-none"
                placeholder="frog20191127StartFromBelieving"
                type="password"
                required
              />
            </label>
          ) : null}

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
            {isLoading ? "Please wait..." : mode === "login" ? "Login" : "Create admin"}
          </ActionButton>
        </form>

        <p className="mt-4 text-xs text-ink-600">
          Admin endpoints are restricted and require the magic password for provisioning or deletion.
        </p>
      </div>
    </div>
  );
};

export default AdminAuthPanel;
