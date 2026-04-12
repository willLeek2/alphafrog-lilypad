/**
 * 格式化工具函数
 */

import { EDITOR_MODE_OPTIONS, MODE_OPTIONS, TASK_KIND_LABELS, TASK_SET_MODE_OPTIONS } from "../constants";
import { expandDate } from "./dates";

export const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN");
};

export const formatJson = (value: unknown) => {
  if (value == null) return "-";
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export const toInputValue = (value: unknown, key?: string) => {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (key && key.toLowerCase().includes("date")) {
      return expandDate(value);
    }
    return String(value);
  }
  const raw = String(value);
  if (key && key.toLowerCase().includes("date")) {
    return expandDate(raw);
  }
  return raw;
};

export const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "RUNNING":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "CANCELLED":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "SUCCESS":
      return "border-green-200 bg-green-50 text-green-700";
    case "FAILURE":
      return "border-red-200 bg-red-50 text-red-700";
    case "PARTIAL_FAILURE":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
};

export const getModeLabel = (mode: string) =>
  MODE_OPTIONS.find((item) => item.value === mode)?.label ?? mode;

export const getTaskKindLabel = (taskName: string) => TASK_KIND_LABELS[taskName] ?? taskName;

export const getTaskSetModeLabel = (mode: string) =>
  TASK_SET_MODE_OPTIONS.find((item) => item.value === mode)?.label ?? mode;
