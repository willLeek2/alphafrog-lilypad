import { apiFetch } from "./client";

export type CreditBalance = {
  balance: number;
  currency: string;
};

export const getCreditBalance = async (token: string) =>
  apiFetch("/credit/balance", {
    method: "GET",
    token,
  });

export const requestCredit = async (token: string, amount: number, reason?: string) =>
  apiFetch("/credit/request", {
    method: "POST",
    token,
    body: JSON.stringify({ amount, reason }),
  });
