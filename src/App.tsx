import { useEffect, useState, useCallback } from "react";
import { RouterProvider } from 'react-router-dom';
import AuthPanel from "./components/AuthPanel";
import AdminAuthPanel from "./components/AdminAuthPanel";
import { createAppRouter } from "./router";
import { getMe, login, logout, register } from "./api/auth";
import { adminCreate, adminLogin } from "./api/admin";
import type { AuthProfile, AuthUser } from "./types/auth";
import type { AdminUser } from "./types/admin";
import { getTokenExpiryIso } from "./utils/jwt";
import { clearAdminAuth, clearAuth, loadAdminAuth, loadAuth, saveAdminAuth, saveAuth } from "./utils/storage";

type ViewKey = "landing" | "profile" | "admin";

const App = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [view, setView] = useState<ViewKey>("landing");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [adminAuthOpen, setAdminAuthOpen] = useState(false);
  const [adminAuthMode, setAdminAuthMode] = useState<"login" | "create">("login");
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [adminAuthLoading, setAdminAuthLoading] = useState(false);

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

  useEffect(() => {
    const stored = loadAdminAuth();
    if (!stored) {
      return;
    }
    if (stored.tokenExpiresAt && Date.parse(stored.tokenExpiresAt) <= Date.now()) {
      clearAdminAuth();
      return;
    }
    setAdmin(stored);
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

  const openAdminPanel = (mode: "login" | "create") => {
    setAdminAuthMode(mode);
    setAdminAuthError(null);
    setAdminAuthOpen(true);
  };

  const closeAdminPanel = () => {
    setAdminAuthOpen(false);
    setAdminAuthError(null);
  };

  const handleAdminSwitch = (mode: "login" | "create") => {
    setAdminAuthMode(mode);
    setAdminAuthError(null);
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

  const handleAdminLogin = async (payload: { username: string; password: string }) => {
    setAdminAuthLoading(true);
    setAdminAuthError(null);
    try {
      const token = await adminLogin(payload);
      const tokenValue = typeof token === "string" ? token : token?.token;
      if (!tokenValue) {
        throw new Error("Login succeeded but token is missing.");
      }
      const adminUser: AdminUser = {
        username: payload.username,
        token: tokenValue,
        tokenExpiresAt: getTokenExpiryIso(tokenValue),
      };
      saveAdminAuth(adminUser);
      setAdmin(adminUser);
      setView("admin");
      setAdminAuthOpen(false);
    } catch (error) {
      setAdminAuthError(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setAdminAuthLoading(false);
    }
  };

  const handleAdminCreate = async (payload: {
    username: string;
    password: string;
    email: string;
    magicPassword: string;
  }) => {
    setAdminAuthLoading(true);
    setAdminAuthError(null);
    try {
      await adminCreate(payload);
      const token = await adminLogin({ username: payload.username, password: payload.password });
      const tokenValue = typeof token === "string" ? token : token?.token;
      if (!tokenValue) {
        throw new Error("Admin created but login token is missing.");
      }
      const adminUser: AdminUser = {
        username: payload.username,
        token: tokenValue,
        tokenExpiresAt: getTokenExpiryIso(tokenValue),
      };
      saveAdminAuth(adminUser);
      setAdmin(adminUser);
      setView("admin");
      setAdminAuthOpen(false);
    } catch (error) {
      setAdminAuthError(error instanceof Error ? error.message : "Create failed.");
    } finally {
      setAdminAuthLoading(false);
    }
  };

  const handleAdminLogout = () => {
    clearAdminAuth();
    setAdmin(null);
    if (view === "admin") {
      setView("landing");
    }
  };

  const handleNavigate = useCallback((nextView: ViewKey) => {
    setView(nextView);
  }, []);

  const handleAdminNavigate = useCallback(() => {
    if (admin) {
      setView("admin");
    } else {
      openAdminPanel("login");
    }
  }, [admin]);

  // Create router with current state
  const router = createAppRouter(
    user,
    admin,
    (v) => handleNavigate(v as ViewKey),
    () => openAuthPanel("login"),
    () => openAuthPanel("register"),
    handleLogout,
    handleAdminNavigate,
    handleAdminLogout
  );

  return (
    <>
      <RouterProvider router={router} />
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
      <AdminAuthPanel
        isOpen={adminAuthOpen}
        mode={adminAuthMode}
        isLoading={adminAuthLoading}
        error={adminAuthError}
        onClose={closeAdminPanel}
        onSwitch={handleAdminSwitch}
        onLogin={handleAdminLogin}
        onCreate={handleAdminCreate}
      />
    </>
  );
};

export default App;
