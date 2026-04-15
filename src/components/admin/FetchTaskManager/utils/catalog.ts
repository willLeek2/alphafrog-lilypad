/**
 * 目录查询工具函数
 */

import type {
  AdminFetchCatalogResponse,
  AdminFetchCatalogTask,
  AdminFetchCatalogTaskVariant,
  AdminFetchTaskSetMode,
} from "../../../../types/admin";
import { TASK_SET_MODE_OPTIONS } from "../constants";

export const getTaskCatalog = (catalog: AdminFetchCatalogResponse | null, taskName: string) =>
  catalog?.taskCatalog.find((item) => item.taskName === taskName);

export const getTaskSetCatalog = (catalog: AdminFetchCatalogResponse | null, taskName: string) =>
  catalog?.taskSetCatalog.find((item) => item.taskName === taskName);

export const getTaskVariant = (
  task: AdminFetchCatalogTask | undefined,
  taskSubType: string | number | undefined
): AdminFetchCatalogTaskVariant | undefined =>
  task?.variants?.find((variant) => String(variant.taskSubType) === String(taskSubType));

export const getTaskSetVariant = (
  task: AdminFetchCatalogTask | undefined,
  taskSetSubType: string | number | undefined
): AdminFetchCatalogTaskVariant | undefined =>
  task?.variants?.find((variant) =>
    String(variant.taskSetSubType ?? variant.taskSubType) === String(taskSetSubType)
  );

export const getTaskFieldSchema = (
  task: AdminFetchCatalogTask | undefined,
  taskSubType: string | number | undefined
) => {
  const variant = getTaskVariant(task, taskSubType) ?? getTaskSetVariant(task, taskSubType);
  if (variant?.fields) return variant.fields;
  // 如果指定的variant不存在，fallback到第一个variant的fields
  if (task?.variants?.[0]?.fields) return task.variants[0].fields;
  return task?.paramsSchema ?? [];
};

export const getSupportedSubTypes = (task: AdminFetchCatalogTask | undefined) => {
  const variantTypes = task?.variants
    ?.filter((variant) => variant.taskSubType !== undefined)
    .map((variant) => variant.taskSubType!) ?? [];
  return variantTypes.length > 0 ? variantTypes : task?.supportedSubTypes ?? [1];
};

export const getSupportedTaskSetSubTypes = (task: AdminFetchCatalogTask | undefined) => {
  const variantTypes = task?.variants
    ?.filter((variant) => (variant.taskSetSubType ?? variant.taskSubType) !== undefined)
    .map((variant) => variant.taskSetSubType ?? variant.taskSubType!) ?? [];
  return variantTypes.length > 0 ? variantTypes : task?.supportedSubTypes ?? [1];
};

export const getAllowedTaskSetModes = (
  task: AdminFetchCatalogTask | undefined,
  subType: string | number | undefined
): AdminFetchTaskSetMode[] => {
  const variantModes =
    getTaskVariant(task, subType)?.allowedTaskSetModes ??
    getTaskSetVariant(task, subType)?.allowedTaskSetModes;
  if (variantModes?.length) return variantModes;
  if (task?.taskSetModes?.length) return task.taskSetModes;
  return TASK_SET_MODE_OPTIONS.map((item) => item.value);
};
