import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import ActionButton from "./ActionButton";
import { cn } from "../utils/classNames";

type AuthMode = "login" | "register";

type AuthPanelProps = {
  isOpen: boolean;
  mode: AuthMode;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSwitch: (mode: AuthMode) => void;
  onLogin: (payload: { username: string; password: string }) => void;
  onRegister: (payload: { username: string; password: string; email: string; inviteCode: string }) => void;
};

const AuthPanel = ({
  isOpen,
  mode,
  isLoading,
  error,
  onClose,
  onSwitch,
  onLogin,
  onRegister,
}: AuthPanelProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setInviteCode("");
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
      onRegister({ username, password, email, inviteCode });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-900/40 px-6 py-10 backdrop-blur">
      <div className="w-full max-w-md rounded-3xl border border-sky-100 bg-white p-6 shadow-glow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">
              {mode === "login" ? "Welcome back" : "Join AlphaFrog"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink-900">
              {mode === "login" ? "Sign in to your workspace" : "Create your account"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700"
          >
            Close
          </button>
        </div>

        <div className="mt-6 flex gap-2 rounded-full bg-sky-50 p-1 text-sm">
          {(["login", "register"] as const).map((item) => (
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
              {item === "login" ? "Login" : "Register"}
            </button>
          ))}
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-ink-700">
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-ink-900 focus:border-sky-300 focus:outline-none"
              placeholder="alpha_user"
              required
            />
          </label>
          {mode === "register" ? (
            <>
              <label className="block text-sm font-semibold text-ink-700">
                Email
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-ink-900 focus:border-sky-300 focus:outline-none"
                  placeholder="you@alphafrog.ai"
                  type="email"
                  required
                />
              </label>
              <label className="block text-sm font-semibold text-ink-700">
                Invite Code
                <input
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-ink-900 focus:border-sky-300 focus:outline-none"
                  placeholder="Enter your invite code"
                  required
                />
              </label>
            </>
          ) : null}
          <label className="block text-sm font-semibold text-ink-700">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-ink-900 focus:border-sky-300 focus:outline-none"
              placeholder={mode === "register" ? "At least 8 chars, upper/lower/digit" : "Your password"}
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
            {isLoading
              ? "Please wait..."
              : mode === "login"
              ? "Login"
              : "Create account"}
          </ActionButton>
        </form>

        <p className="mt-4 text-xs text-ink-600">
          Auth endpoints run on the AlphaFrog microservice gateway. Ensure the server allows
          CORS for this frontend origin.
        </p>
      </div>
    </div>
  );
};

export default AuthPanel;
