import { apiFetch } from "./client";

export type AdminLoginPayload = {
  username: string;
  password: string;
};

export type AdminCreatePayload = {
  username: string;
  password: string;
  email: string;
  magicPassword: string;
};

export type AdminDeletePayload = {
  magicPassword: string;
};

export const adminLogin = async (payload: AdminLoginPayload) =>
  apiFetch("/admin/login", {
    method: "POST",
    body: JSON.stringify({
      username: payload.username,
      password: payload.password,
    }),
  });

export const adminCreate = async (payload: AdminCreatePayload) =>
  apiFetch("/admin/create", {
    method: "POST",
    body: JSON.stringify({
      username: payload.username,
      password: payload.password,
      email: payload.email,
      magic_password: payload.magicPassword,
    }),
  });

export const adminLogout = async (token: string) =>
  apiFetch("/admin/logout", {
    method: "POST",
    token,
    body: JSON.stringify({}),
  });

export const adminDelete = async (token: string, payload: AdminDeletePayload) =>
  apiFetch("/admin/delete", {
    method: "POST",
    token,
    body: JSON.stringify({
      magic_password: payload.magicPassword,
    }),
  });

export const adminOverall = async (token: string) =>
  apiFetch("/admin/overall", {
    token,
  });
