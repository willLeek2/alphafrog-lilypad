import type { AuthUser } from "../types/auth";

const AUTH_KEY = "alphafrog.auth";

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
