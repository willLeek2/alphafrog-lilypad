import ActionButton from "./ActionButton";

type ViewKey = "landing" | "profile";

type HeaderProps = {
  activeView: ViewKey;
  isAuthed: boolean;
  userName?: string;
  onNavigate: (view: ViewKey) => void;
  onLogin: () => void;
  onRegister: () => void;
  onLogout: () => void;
};

const Header = ({
  activeView,
  isAuthed,
  userName,
  onNavigate,
  onLogin,
  onRegister,
  onLogout,
}: HeaderProps) => (
  <header className="sticky top-0 z-50 border-b border-white/60 bg-white/70 backdrop-blur">
    <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
      <button
        type="button"
        onClick={() => onNavigate("landing")}
        className="flex items-center gap-3"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-600 text-lg font-bold text-white">
          AF
        </span>
        <div className="text-left">
          <p className="text-base font-semibold text-ink-900">AlphaFrog</p>
          <p className="text-xs text-ink-700">Microservice intelligence for A-share markets</p>
        </div>
      </button>
      <div className="hidden items-center gap-4 text-sm font-medium text-ink-700 md:flex">
        <button
          type="button"
          onClick={() => onNavigate("landing")}
          className={
            activeView === "landing"
              ? "text-sky-700"
              : "transition hover:text-sky-700"
          }
        >
          Overview
        </button>
        {isAuthed ? (
          <button
            type="button"
            onClick={() => onNavigate("profile")}
            className={
              activeView === "profile"
                ? "text-sky-700"
                : "transition hover:text-sky-700"
            }
          >
            Profile
          </button>
        ) : null}
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
      </div>
    </div>
  </header>
);

export default Header;
