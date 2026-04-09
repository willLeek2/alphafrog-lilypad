import type { AuthUser } from "../types/auth";

const AUTH_KEY = "alphafrog.auth";
const ADMIN_AUTH_KEY = "alphafrog.admin.auth";
const AUTH_CHANGE_EVENT = "alphafrog-auth-changed";

export type AdminAuthUser = {
  username: string;
  token: string;
  tokenExpiresAt?: string;
};

const emitAuthChange = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
};

export const AUTH_STORAGE_EVENT = AUTH_CHANGE_EVENT;

export const saveAuth = (user: AuthUser) => {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  emitAuthChange();
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
  emitAuthChange();
};

export const saveAdminAuth = (admin: AdminAuthUser) => {
  localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(admin));
  emitAuthChange();
};

export const loadAdminAuth = () => {
  const raw = localStorage.getItem(ADMIN_AUTH_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AdminAuthUser;
  } catch {
    return null;
  }
};

export const clearAdminAuth = () => {
  localStorage.removeItem(ADMIN_AUTH_KEY);
  emitAuthChange();
};
