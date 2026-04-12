/**
 * 任务参数工具函数
 */

import type { AdminFetchCatalogParamField } from "../../../../types/admin";
import { toInputValue } from "./formatters";

export const normalizeTaskParamFieldName = (fieldName: string) =>
  fieldName.startsWith("task_params.") ? fieldName.slice("task_params.".length) : fieldName;

export const readTaskFieldValue = (params: Record<string, unknown>, key: string) => {
  const value = params[key];
  return value == null || value === "" ? "未填写" : String(value);
};

export const buildParamsRecord = (
  paramsSchema?: AdminFetchCatalogParamField[],
  defaultParams?: Record<string, unknown>,
  overrides?: Record<string, unknown>
) => {
  const record: Record<string, string> = {};
  const knownKeys = new Set<string>();
  (paramsSchema ?? []).forEach((field) => {
    knownKeys.add(field.name);
    const candidate = overrides?.[field.name] ?? defaultParams?.[field.name] ?? field.defaultValue;
    record[field.name] = toInputValue(candidate, field.name);
  });

  Object.entries(defaultParams ?? {}).forEach(([key, value]) => {
    if (!knownKeys.has(key)) {
      record[key] = toInputValue(value, key);
    }
  });

  Object.entries(overrides ?? {}).forEach(([key, value]) => {
    if (!knownKeys.has(key)) {
      record[key] = toInputValue(value, key);
    }
  });

  return record;
};

export const normalizeTaskSubType = (value: unknown, fallback = "1") => {
  if (value == null || value === "") return fallback;
  return String(value);
};
