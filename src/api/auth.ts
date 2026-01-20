import { apiFetch } from "./client";

type LoginParams = {
  username: string;
  password: string;
};

type RegisterParams = LoginParams & {
  email: string;
};

export const login = async ({ username, password }: LoginParams) =>
  apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const register = async ({ username, password, email }: RegisterParams) =>
  apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password, email }),
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
