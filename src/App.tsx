import { useEffect, useState, useCallback } from "react";
import { RouterProvider } from 'react-router-dom';
import AuthPanel from "./components/AuthPanel";
import AdminAuthPanel from "./components/AdminAuthPanel";
import { createAppRouter } from "./router";
import { getMe, login, logout, register } from "./api/auth";
import { adminLogin } from "./api/admin";
import type { AuthProfile, AuthUser } from "./types/auth";
import type { AdminUser } from "./types/admin";
import { getTokenExpiryIso } from "./utils/jwt";
import { clearAdminAuth, clearAuth, loadAdminAuth, loadAuth, saveAdminAuth, saveAuth } from "./utils/storage";
import { setUnauthorizedListener } from "./api/client";

type ViewKey = "profile" | "admin";

const App = () => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = loadAuth();
    if (stored && stored.tokenExpiresAt && Date.parse(stored.tokenExpiresAt) <= Date.now()) {
      clearAuth();
      return null;
    }
    return stored;
  });

  const [admin, setAdmin] = useState<AdminUser | null>(() => {
    const stored = loadAdminAuth();
    if (stored && stored.tokenExpiresAt && Date.parse(stored.tokenExpiresAt) <= Date.now()) {
      clearAdminAuth();
      return null;
    }
    return stored;
  });

  const [view, setView] = useState<ViewKey | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [adminAuthOpen, setAdminAuthOpen] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [adminAuthLoading, setAdminAuthLoading] = useState(false);

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

  const openAdminPanel = () => {
    setAdminAuthError(null);
    setAdminAuthOpen(true);
  };

  const closeAdminPanel = () => {
    setAdminAuthOpen(false);
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
      setAuthOpen(false);
      // Navigate to authenticated area
      window.location.href = "/app/profile";
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (payload: { username: string; password: string; email: string; inviteCode: string }) => {
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
      setAuthOpen(false);
      // Navigate to authenticated area
      window.location.href = "/app/profile";
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
    // Redirect to home
    window.location.href = "/";
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
      setAdminAuthOpen(false);
      // Navigate to admin area
      window.location.href = "/app/admin";
    } catch (error) {
      setAdminAuthError(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setAdminAuthLoading(false);
    }
  };



  const handleAdminLogout = () => {
    clearAdminAuth();
    setAdmin(null);
    // Redirect to home
    window.location.href = "/";
  };

  const handleNavigate = useCallback((nextView: ViewKey) => {
    const path = nextView === "profile" ? "/app/profile" : "/app/admin";
    window.location.href = path;
  }, []);

  const handleAdminNavigate = useCallback(() => {
    if (admin) {
      window.location.href = "/app/admin";
    } else {
      openAdminPanel();
    }
  }, [admin]);

  // 设置全局 401 未授权监听器
  useEffect(() => {
    setUnauthorizedListener(() => {
      // 清除用户状态
      setUser(null);
      setAdmin(null);
      // 跳转到登录页
      window.location.href = "/login";
    });
    
    // 清理函数
    return () => {
      setUnauthorizedListener(null);
    };
  }, []);

  // Create router with current state
  const router = createAppRouter(
    user,
    admin,
    (v) => handleNavigate(v as ViewKey),
    () => openAuthPanel("login"),
    () => openAuthPanel("register"),
    handleLogout,
    handleAdminNavigate,
    handleAdminLogout,
    openAdminPanel
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
        isLoading={adminAuthLoading}
        error={adminAuthError}
        onClose={closeAdminPanel}
        onLogin={handleAdminLogin}
      />
    </>
  );
};

export default App;
