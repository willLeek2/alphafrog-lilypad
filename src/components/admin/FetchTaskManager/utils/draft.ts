/**
 * 草稿创建工具函数
 */

import type {
  AdminFetchCatalogResponse,
  AdminFetchInfoSpec,
  AdminFetchTaskSetMode,
  AdminFetchTaskSetSpec,
  AdminFetchTaskSpec,
} from "../../../../types/admin";
import type { FetchInfoDraftEntry, TaskDraft, TaskSetDraft } from "../types";
import { createDraftId } from "../utils";
import { buildParamsRecord, normalizeTaskSubType } from "./taskParams";
import { getTaskCatalog, getTaskFieldSchema, getSupportedSubTypes } from "./catalog";
import { toInputValue, expandDate } from "./formatters";

export const createTaskDraft = (
  catalog: AdminFetchCatalogResponse | null,
  preferredTaskName?: string,
  source?: AdminFetchTaskSpec
): TaskDraft => {
  const catalogTask =
    getTaskCatalog(catalog, preferredTaskName || source?.task_name || "") ?? catalog?.taskCatalog[0];

  return {
    id: createDraftId(),
    task_name: catalogTask?.taskName ?? preferredTaskName ?? String(source?.task_name ?? ""),
    task_sub_type: normalizeTaskSubType(source?.task_sub_type, String(getSupportedSubTypes(catalogTask)[0] ?? 1)),
    task_params: buildParamsRecord(
      getTaskFieldSchema(catalogTask, source?.task_sub_type),
      catalogTask?.defaultParams,
      source?.task_params
    ),
  };
};

export const createTaskSetDraft = (
  catalog: AdminFetchCatalogResponse | null,
  preferredTaskName?: string,
  source?: AdminFetchTaskSetSpec
): TaskSetDraft => {
  const firstTaskSetCatalog =
    catalog?.taskCatalog.find((item) => (item.taskSetModes?.length ?? 0) > 0) ?? catalog?.taskCatalog[0];
  const catalogTask =
    getTaskCatalog(catalog, preferredTaskName || source?.task_name || "") ?? firstTaskSetCatalog;
  const defaultMode = source?.task_set_mode
    ? String(source.task_set_mode)
    : catalogTask?.taskSetModes?.[0] ?? "trade_dates";

  return {
    id: createDraftId(),
    task_name: catalogTask?.taskName ?? preferredTaskName ?? String(source?.task_name ?? ""),
    task_sub_type: normalizeTaskSubType(
      source?.task_sub_type,
      String(
        defaultMode === "date_range_with_offsets"
          ? 3
          : getSupportedSubTypes(catalogTask)[0] ?? 1
      )
    ),
    task_params: buildParamsRecord(
      getTaskFieldSchema(catalogTask, source?.task_sub_type),
      catalogTask?.defaultParams,
      source?.task_params
    ),
    task_set_mode: (defaultMode as AdminFetchTaskSetMode) ?? "trade_dates",
    trade_dates: {
      start_timestamp: expandDate(source?.trade_dates?.start_timestamp as string | number | undefined),
      end_timestamp: expandDate(source?.trade_dates?.end_timestamp as string | number | undefined),
    },
    date_range: {
      start_date: expandDate(source?.date_range?.start_date as string | number | undefined),
      end_date: expandDate(source?.date_range?.end_date as string | number | undefined),
    },
    offset_range: {
      start: toInputValue(
        (source?.offset_range?.start as unknown) ?? source?.offset_start,
        "offset_start"
      ),
      end: toInputValue(
        (source?.offset_range?.end as unknown) ?? source?.offset_end,
        "offset_end"
      ),
      step: toInputValue(
        (source?.offset_range?.step as unknown) ?? source?.offset_step,
        "offset_step"
      ),
    },
  };
};

export const buildFetchInfoDraft = (
  catalog: AdminFetchCatalogResponse | null,
  source?: AdminFetchInfoSpec
): Record<"fund" | "stock" | "index", FetchInfoDraftEntry> => {
  const createEntry = (key: "fund" | "stock" | "index", entry?: AdminFetchInfoCatalogEntry) => ({
    enabled: Boolean(source?.[key]?.enabled),
    params: buildParamsRecord(entry?.paramsSchema, entry?.defaultParams, source?.[key]),
  });

  return {
    fund: createEntry("fund", catalog?.fetchInfoCatalog.fund),
    stock: createEntry("stock", catalog?.fetchInfoCatalog.stock),
    index: createEntry("index", catalog?.fetchInfoCatalog.index),
  };
};
