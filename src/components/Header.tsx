import { Link, useLocation } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import ActionButton from "./ActionButton";

type HeaderProps = {
  isAuthed: boolean;
  userName?: string;
  isAdminAuthed?: boolean;
  adminName?: string;
  onAdminNavigate: () => void;
  onLogin: () => void;
  onRegister: () => void;
  onLogout: () => void;
};

const Header = ({
  isAuthed,
  userName,
  isAdminAuthed,
  adminName,
  onAdminNavigate,
  onLogin,
  onRegister,
  onLogout,
}: HeaderProps) => {
  const location = useLocation();
  const isAgentPage = location.pathname.startsWith('/agent');

  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-600 text-lg font-bold text-white">
            AF
          </span>
          <div className="text-left">
            <p className="text-base font-semibold text-ink-900">AlphaFrog</p>
            <p className="text-xs text-ink-700">Microservice intelligence for A-share markets</p>
          </div>
        </Link>
        <div className="hidden items-center gap-4 text-sm font-medium text-ink-700 md:flex">
          <Link
            to="/"
            className={
              location.pathname === '/'
                ? "text-sky-700"
                : "transition hover:text-sky-700"
            }
          >
            Overview
          </Link>
          {isAuthed && (
            <Link
              to="/profile"
              className={
                location.pathname === '/profile'
                  ? "text-sky-700"
                  : "transition hover:text-sky-700"
              }
            >
              Profile
            </Link>
          )}
          {isAuthed && (
            <Link
              to="/agent/chat"
              className={
                isAgentPage
                  ? "text-violet-700 flex items-center gap-1"
                  : "transition hover:text-violet-700 flex items-center gap-1"
              }
            >
              <MessageSquare className="w-4 h-4" />
              Agent助手
            </Link>
          )}
          {isAdminAuthed && (
            <button
              type="button"
              onClick={onAdminNavigate}
              className={
                location.pathname === '/admin'
                  ? "text-amber-700"
                  : "transition hover:text-amber-700"
              }
            >
              管理员后台
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isAuthed ? (
            <>
              <div className="hidden rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-ink-700 md:block">
                {userName}
              </div>
              <ActionButton variant="outline" onClick={onLogout}>
                Logout
              </ActionButton>
            </>
          ) : (
            <>
              <ActionButton variant="ghost" onClick={onLogin}>
                Login
              </ActionButton>
              <ActionButton onClick={onRegister}>Register</ActionButton>
            </>
          )}
          {isAdminAuthed && (
            <div className="hidden rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 md:block">
              {adminName ? `Admin · ${adminName}` : "Admin"}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
