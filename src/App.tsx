import { useEffect, useState } from "react";
import AuthPanel from "./components/AuthPanel";
import Header from "./components/Header";
import LandingPage from "./pages/LandingPage";
import ProfilePage from "./pages/ProfilePage";
import { getMe, login, logout, register } from "./api/auth";
import type { AuthProfile, AuthUser } from "./types/auth";
import { getTokenExpiryIso } from "./utils/jwt";
import { clearAuth, loadAuth, saveAuth } from "./utils/storage";

type ViewKey = "landing" | "profile";

const App = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [view, setView] = useState<ViewKey>("landing");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const stored = loadAuth();
    if (!stored) {
      return;
    }
    if (stored.tokenExpiresAt && Date.parse(stored.tokenExpiresAt) <= Date.now()) {
      clearAuth();
      return;
    }
    setUser(stored);
    setView("profile");
  }, []);

  const openAuthPanel = (mode: "login" | "register") => {
    setAuthMode(mode);
    setAuthError(null);
    setAuthOpen(true);
  };

  const handleAuthSwitch = (mode: "login" | "register") => {
    setAuthMode(mode);
    setAuthError(null);
  };

  const closeAuthPanel = () => {
    setAuthOpen(false);
    setAuthError(null);
  };

  const handleLogin = async (payload: { username: string; password: string }) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const token = await login(payload);
      const tokenValue = typeof token === "string" ? token : token?.token;
      if (!tokenValue) {
        throw new Error("Login succeeded but token is missing.");
      }
      let profileData: AuthProfile | null = null;
      try {
        profileData = (await getMe(tokenValue)) as AuthProfile;
      } catch {
        profileData = null;
      }
      const profile: AuthUser = {
        username: profileData?.username ?? payload.username,
        email: profileData?.email ?? user?.email ?? null,
        userId: profileData?.userId ?? null,
        userType: profileData?.userType ?? null,
        userLevel: profileData?.userLevel ?? null,
        credit: profileData?.credit ?? null,
        registerTime: profileData?.registerTime ?? null,
        token: tokenValue,
        tokenExpiresAt: getTokenExpiryIso(tokenValue),
      };
      saveAuth(profile);
      setUser(profile);
      setView("profile");
      setAuthOpen(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (payload: { username: string; password: string; email: string }) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await register(payload);
      const token = await login({ username: payload.username, password: payload.password });
      const tokenValue = typeof token === "string" ? token : token?.token;
      if (!tokenValue) {
        throw new Error("Registration succeeded but login token is missing.");
      }
      let profileData: AuthProfile | null = null;
      try {
        profileData = (await getMe(tokenValue)) as AuthProfile;
      } catch {
        profileData = null;
      }
      const profile: AuthUser = {
        username: profileData?.username ?? payload.username,
        email: profileData?.email ?? payload.email,
        userId: profileData?.userId ?? null,
        userType: profileData?.userType ?? null,
        userLevel: profileData?.userLevel ?? null,
        credit: profileData?.credit ?? null,
        registerTime: profileData?.registerTime ?? null,
        token: tokenValue,
        tokenExpiresAt: getTokenExpiryIso(tokenValue),
      };
      saveAuth(profile);
      setUser(profile);
      setView("profile");
      setAuthOpen(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Registration failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (user) {
      try {
        await logout({ username: user.username });
      } catch {
        // Ignore logout failures and clear local state.
      }
    }
    clearAuth();
    setUser(null);
    setView("landing");
  };

  const handleNavigate = (nextView: ViewKey) => {
    if (nextView === "profile" && !user) {
      openAuthPanel("login");
      return;
    }
    setView(nextView);
  };

  const handlePrimaryAction = () => {
    if (user) {
      setView("profile");
      return;
    }
    openAuthPanel("login");
  };

  const handleSecondaryAction = () => {
    openAuthPanel("register");
  };

  return (
    <div className="min-h-screen bg-atmos bg-grid animate-shimmer">
      <div className="min-h-screen bg-white/70">
        <Header
          activeView={view}
          isAuthed={Boolean(user)}
          userName={user?.username}
          onNavigate={handleNavigate}
          onLogin={() => openAuthPanel("login")}
          onRegister={() => openAuthPanel("register")}
          onLogout={handleLogout}
        />
        <main>
          {view === "landing" ? (
            <LandingPage
              onPrimaryAction={handlePrimaryAction}
              onSecondaryAction={handleSecondaryAction}
            />
          ) : user ? (
            <ProfilePage user={user} />
          ) : null}
        </main>
        <AuthPanel
          isOpen={authOpen}
          mode={authMode}
          isLoading={authLoading}
          error={authError}
          onClose={closeAuthPanel}
          onSwitch={handleAuthSwitch}
          onLogin={handleLogin}
          onRegister={handleRegister}
        />
      </div>
    </div>
  );
};

export default App;
