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

// User Management
export const getUsers = async (token: string, page = 0, size = 20) =>
  apiFetch(`/admin/users?page=${page}&size=${size}`, { token });

export const updateUserStatus = async (token: string, userId: string, status: number) =>
  apiFetch(`/admin/users/${userId}/status`, {
    method: "PUT",
    token,
    body: JSON.stringify({ status }),
  });

export const adjustUserCredit = async (token: string, userId: string, amount: number, reason: string) =>
  apiFetch(`/admin/users/${userId}/credit`, {
    method: "PUT",
    token,
    body: JSON.stringify({ amount, reason }),
  });

// Credit Approval
export const getCreditRequests = async (token: string, page = 0, size = 20) =>
  apiFetch(`/admin/credit-requests?page=${page}&size=${size}`, { token });

export const approveCreditRequest = async (token: string, requestId: string) =>
  apiFetch(`/admin/credit-requests/${requestId}/approve`, {
    method: "POST",
    token,
  });

export const rejectCreditRequest = async (token: string, requestId: string, reason: string) =>
  apiFetch(`/admin/credit-requests/${requestId}/reject`, {
    method: "POST",
    token,
    body: JSON.stringify({ reason }),
  });
