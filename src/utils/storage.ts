import type { AuthUser } from "../types/auth";

const AUTH_KEY = "alphafrog.auth";
const ADMIN_AUTH_KEY = "alphafrog.admin.auth";

export const saveAuth = (user: AuthUser) => {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
};

export const loadAuth = () => {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const clearAuth = () => {
  localStorage.removeItem(AUTH_KEY);
};

export const saveAdminAuth = (admin: { username: string; token: string; tokenExpiresAt?: string }) => {
  localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(admin));
};

export const loadAdminAuth = () => {
  const raw = localStorage.getItem(ADMIN_AUTH_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as { username: string; token: string; tokenExpiresAt?: string };
  } catch {
    return null;
  }
};

export const clearAdminAuth = () => {
  localStorage.removeItem(ADMIN_AUTH_KEY);
};
