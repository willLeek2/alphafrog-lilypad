import { apiFetch } from "./client";

type LoginParams = {
  username: string;
  password: string;
};

type RegisterParams = LoginParams & {
  email: string;
  inviteCode: string;
};

export const login = async ({ username, password }: LoginParams) =>
  apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const register = async ({ username, password, email, inviteCode }: RegisterParams) =>
  apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password, email, inviteCode }),
  });

export const logout = async ({ username }: { username: string }) =>
  apiFetch("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ username }),
  });

export const getMe = async (token: string) =>
  apiFetch("/auth/me", {
    method: "GET",
    token,
  });

export const forgotPassword = async (email: string) =>
  apiFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const verifyResetToken = async (token: string) =>
  apiFetch(`/auth/verify-reset-token?token=${token}`, {
    method: "GET",
  });

export const resetPassword = async (token: string, password: string) =>
  apiFetch("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });

export const changePassword = async (token: string, currentPassword: string, newPassword: string) =>
  apiFetch("/auth/change-password", {
    method: "POST",
    token,
    body: JSON.stringify({ currentPassword, newPassword }),
  });
