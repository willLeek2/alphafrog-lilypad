import { apiFetch } from "./client";
import type {
  AdminAgentRun,
  AdminAgentRunDetail,
  SystemConfigItem,
  CreditLedgerEntry,
  AdminUserDetail,
  AdminFetchTask,
  AdminFetchTaskDetail,
  AdminFetchTaskSummary,
  FetchTaskTemplateKey,
  AdminFetchCatalogResponse,
  AdminFetchJob,
  AdminFetchJobDetail,
  AdminFetchJobPreviewResponse,
  AdminFetchJobSpec,
  AdminFetchJobSummary,
} from "../types/admin";

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
export const getUsers = async (token: string, page = 1, size = 20, keyword?: string, status?: string) =>
  apiFetch<{ users: AdminUserDetail[]; total: number; page: number; pageSize: number }>(
    `/admin/users?page=${page}&pageSize=${size}${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ''}${status ? `&status=${status}` : ''}`, 
    { token }
  );

export const updateUserStatus = async (
  token: string, 
  userId: string, 
  targetStatus: string, 
  reason: string,
  options?: { revokeTokens?: boolean; blockNewRuns?: boolean; terminateRunningRuns?: boolean }
) =>
  apiFetch(`/admin/users/${userId}/status`, {
    method: "PUT",
    token,
    body: JSON.stringify({ 
      targetStatus, 
      reason,
      revokeTokens: options?.revokeTokens ?? true,
      blockNewRuns: options?.blockNewRuns ?? true,
      terminateRunningRuns: options?.terminateRunningRuns ?? false,
    }),
  });

export const adjustUserCredit = async (
  token: string, 
  userId: string, 
  delta: number, 
  reason: string,
  idempotencyKey: string
) =>
  apiFetch<{
    userId: string;
    creditBefore: number;
    creditAfter: number;
    delta: number;
    ledgerId: string;
    auditId: string;
    idempotentReplay: boolean;
    message: string;
  }>(`/admin/users/${userId}/credit-adjust`, {
    method: "POST",
    token,
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ delta, reason }),
  });

// Credit Approval
export const getCreditRequests = async (token: string, page = 1, size = 20, status?: string, userId?: string) =>
  apiFetch<{ applications: CreditApplication[]; total: number; page: number; pageSize: number }>(
    `/admin/credit-applications?page=${page}&pageSize=${size}${status ? `&status=${status}` : ''}${userId ? `&userId=${userId}` : ''}`, 
    { token }
  );

export interface CreditApplication {
  applicationId: string;
  userId: string;
  amount: number;
  status: string;
  reason: string;
  contact: string;
  createdAt: string;
  processedAt: string;
  processedBy: string;
  processReason: string;
  version: number;
}

export const getCreditRequestDetail = async (token: string, requestId: string) =>
  apiFetch<{ application: CreditApplication; auditTrail: CreditApplicationAudit[] }>(`/admin/credit-applications/${requestId}`, { token });

export interface CreditApplicationAudit {
  auditId: string;
  operatorId: string;
  action: string;
  reason: string;
  beforeJson: string;
  afterJson: string;
  createdAt: string;
}

export const approveCreditRequest = async (
  token: string, 
  requestId: string, 
  processReason: string, 
  expectedVersion: number,
  idempotencyKey: string
) =>
  apiFetch(`/admin/credit-applications/${requestId}/approve`, {
    method: "POST",
    token,
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ processReason, expectedVersion }),
  });

export const rejectCreditRequest = async (
  token: string, 
  requestId: string, 
  processReason: string, 
  expectedVersion: number,
  idempotencyKey: string
) =>
  apiFetch(`/admin/credit-applications/${requestId}/reject`, {
    method: "POST",
    token,
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ processReason, expectedVersion }),
  });

// Credit Ledger
export const getCreditLedger = async (
  token: string, 
  page = 1, 
  size = 20, 
  filters?: { userId?: string; bizType?: string; from?: string; to?: string; sourceId?: string }
) => {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('pageSize', String(size));
  if (filters?.userId) params.append('userId', filters.userId);
  if (filters?.bizType) params.append('bizType', filters.bizType);
  if (filters?.from) params.append('from', filters.from);
  if (filters?.to) params.append('to', filters.to);
  if (filters?.sourceId) params.append('sourceId', filters.sourceId);
  return apiFetch<{ entries: CreditLedgerEntry[]; total: number; page: number; pageSize: number }>(`/admin/credit-ledger?${params.toString()}`, { token });
};

// ========== Agent 运行监控 ==========
export const listAgentRuns = async (
  token: string,
  page = 1,
  size = 20,
  filters?: { status?: string; userId?: string; days?: number }
) => {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('pageSize', String(size));
  if (filters?.status) params.append('status', filters.status);
  if (filters?.userId) params.append('userId', filters.userId);
  if (filters?.days) params.append('days', String(filters.days));
  return apiFetch<{ runs: AdminAgentRun[]; total: number; page: number; pageSize: number }>(`/admin/agent-runs?${params.toString()}`, { token });
};

export const getAgentRunDetail = async (token: string, runId: string) =>
  apiFetch<AdminAgentRunDetail>(`/admin/agent-runs/${runId}`, { token });

export const stopAgentRun = async (token: string, runId: string, reason: string) =>
  apiFetch<{ runId: string; newStatus: string; message: string }>(`/admin/agent-runs/${runId}/stop`, {
    method: "POST",
    token,
    body: JSON.stringify({ reason }),
  });

// ========== 系统配置管理 ==========
export const getSystemConfig = async (token: string) =>
  apiFetch<{ configs: SystemConfigItem[]; configJson: string }>("/admin/system-config", { token });

export const updateSystemConfig = async (token: string, key: string, value: string, reason: string) =>
  apiFetch<{ config: SystemConfigItem; message: string }>("/admin/system-config", {
    method: "PUT",
    token,
    body: JSON.stringify({ key, value, reason }),
  });

export type CreateFetchTaskPayload = {
  templateKey: FetchTaskTemplateKey;
  params: {
    startDate?: string;
    endDate?: string;
    offset?: number;
    limit?: number;
  };
};

export type ListFetchTasksFilters = {
  status?: string;
  templateKey?: FetchTaskTemplateKey;
  taskUuid?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  pageSize?: number;
};

export type RetryFetchTasksResult = {
  sourceTaskUuid: string;
  newTaskUuid: string;
  success: boolean;
  message: string;
};

export type ListFetchJobsFilters = {
  status?: string;
  mode?: string;
  jobUuid?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  pageSize?: number;
};

export type ListFetchTasksFiltersV2 = {
  jobUuid?: string;
  status?: string;
  taskName?: string;
  taskSubType?: number;
  sourceKind?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  pageSize?: number;
};

export const getFetchCatalog = async (token: string) =>
  apiFetch<AdminFetchCatalogResponse>("/admin/fetch-catalog", { token });

export const previewFetchJob = async (token: string, payload: AdminFetchJobSpec) =>
  apiFetch<AdminFetchJobPreviewResponse>("/admin/fetch-jobs:preview", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });

export const createFetchJob = async (token: string, payload: AdminFetchJobSpec) =>
  apiFetch<{ job: AdminFetchJob; itemsPreview: AdminFetchTask[]; message: string }>("/admin/fetch-jobs", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });

export const listFetchJobs = async (token: string, filters: ListFetchJobsFilters = {}) => {
  const params = new URLSearchParams();
  params.append("page", String(filters.page ?? 1));
  params.append("pageSize", String(filters.pageSize ?? 10));
  if (filters.status) params.append("status", filters.status);
  if (filters.mode) params.append("mode", filters.mode);
  if (filters.jobUuid) params.append("jobUuid", filters.jobUuid);
  if (filters.createdFrom) params.append("createdFrom", filters.createdFrom);
  if (filters.createdTo) params.append("createdTo", filters.createdTo);

  return apiFetch<{
    items: AdminFetchJob[];
    total: number;
    page: number;
    pageSize: number;
    summary: AdminFetchJobSummary;
  }>(`/admin/fetch-jobs?${params.toString()}`, { token });
};

export const getFetchJobDetail = async (token: string, jobUuid: string) =>
  apiFetch<AdminFetchJobDetail>(`/admin/fetch-jobs/${jobUuid}`, { token });

export const cancelFetchJob = async (token: string, jobUuid: string) =>
  apiFetch(`/admin/fetch-jobs/${jobUuid}:cancel`, {
    method: "POST",
    token,
    body: JSON.stringify({}),
  });

export const deleteFetchJob = async (token: string, jobUuid: string) =>
  apiFetch(`/admin/fetch-jobs/${jobUuid}`, {
    method: "DELETE",
    token,
  });

export const createFetchTask = async (token: string, payload: CreateFetchTaskPayload) =>
  apiFetch<{ task: AdminFetchTask; message: string }>("/admin/fetch-tasks", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });

export const listFetchTasks = async (token: string, filters: ListFetchTasksFilters = {}) => {
  const params = new URLSearchParams();
  params.append("page", String(filters.page ?? 1));
  params.append("pageSize", String(filters.pageSize ?? 20));
  if (filters.status) params.append("status", filters.status);
  if (filters.templateKey) params.append("templateKey", filters.templateKey);
  if (filters.taskUuid) params.append("taskUuid", filters.taskUuid);
  if (filters.createdFrom) params.append("createdFrom", filters.createdFrom);
  if (filters.createdTo) params.append("createdTo", filters.createdTo);

  return apiFetch<{
    items: AdminFetchTask[];
    total: number;
    page: number;
    pageSize: number;
    summary: AdminFetchTaskSummary;
  }>(`/admin/fetch-tasks?${params.toString()}`, { token });
};

export const listFetchTasksV2 = async (token: string, filters: ListFetchTasksFiltersV2 = {}) => {
  const params = new URLSearchParams();
  params.append("page", String(filters.page ?? 1));
  params.append("pageSize", String(filters.pageSize ?? 20));
  if (filters.jobUuid) params.append("jobUuid", filters.jobUuid);
  if (filters.status) params.append("status", filters.status);
  if (filters.taskName) params.append("taskName", filters.taskName);
  if (typeof filters.taskSubType === "number") params.append("taskSubType", String(filters.taskSubType));
  if (filters.sourceKind) params.append("sourceKind", filters.sourceKind);
  if (filters.createdFrom) params.append("createdFrom", filters.createdFrom);
  if (filters.createdTo) params.append("createdTo", filters.createdTo);

  return apiFetch<{
    items: AdminFetchTask[];
    total: number;
    page: number;
    pageSize: number;
  }>(`/admin/fetch-tasks?${params.toString()}`, { token });
};

export const getFetchTaskDetail = async (token: string, taskUuid: string) =>
  apiFetch<AdminFetchTaskDetail>(`/admin/fetch-tasks/${taskUuid}`, { token });

export const retryFetchTasks = async (token: string, taskUuids: string[]) =>
  apiFetch<{ results: RetryFetchTasksResult[] }>("/admin/fetch-tasks:retry", {
    method: "POST",
    token,
    body: JSON.stringify({ taskUuids }),
  });

export const retryFailedTasksInJob = async (token: string, jobUuid: string, filters?: Record<string, unknown>) =>
  apiFetch<{ results: RetryFetchTasksResult[] }>(`/admin/fetch-jobs/${jobUuid}:retry-failures`, {
    method: "POST",
    token,
    body: JSON.stringify(filters ?? {}),
  });
