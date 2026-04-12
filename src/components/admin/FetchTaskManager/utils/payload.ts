/**
 * 载荷构建工具函数
 */

import type {
  AdminFetchCatalogParamField,
  AdminFetchCatalogResponse,
  AdminFetchCatalogTask,
  AdminFetchJobSpec,
  AdminFetchTaskSetSpec,
  AdminFetchTaskSpec,
} from "../../../../types/admin";
import type { EditorMode, ExecutionOptionsDraft, FetchInfoDraftEntry, TaskDraft, TaskSetDraft } from "../types";
import { getTaskCatalog, getTaskFieldSchema } from "./catalog";
import { normalizeTaskParamFieldName } from "./taskParams";
import { compactDate, parseDateInput } from "./dates";

export const parseNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const serializeFieldValue = (
  field: AdminFetchCatalogParamField | undefined,
  rawValue: string,
  fieldName: string,
  task?: AdminFetchCatalogTask
) => {
  const trimmed = rawValue.trim();
  if (!trimmed) return undefined;
  const fieldType = (field?.inputType ?? field?.type ?? "").toLowerCase();

  if (fieldType === "number" || fieldType === "integer") {
    return parseNumber(trimmed);
  }

  if (fieldType === "boolean") {
    return trimmed === "true";
  }

  if (fieldType === "json") {
    return JSON.parse(trimmed);
  }

  if (fieldType === "date" || fieldName.toLowerCase().includes("date")) {
    if (fieldName.toLowerCase().includes("timestamp")) {
      const normalized = compactDate(trimmed);
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : trimmed;
    }
    if (task?.dateStyle === "yyyyMMdd") {
      return compactDate(trimmed);
    }
    return trimmed;
  }

  return trimmed;
};

export const buildTaskParams = (draft: TaskDraft | TaskSetDraft, task: AdminFetchCatalogTask | undefined) => {
  const params: Record<string, unknown> = {};
  const fieldSchema = getTaskFieldSchema(task, draft.task_sub_type);
  Object.entries(draft.task_params).forEach(([key, value]) => {
    const field = fieldSchema.find((item) => item.name === key);
    const normalizedKey = normalizeTaskParamFieldName(key);
    const parsed = serializeFieldValue(field, value, normalizedKey, task);
    if (parsed !== undefined) {
      params[normalizedKey] = parsed;
    }
  });
  return params;
};

export const buildTaskSpec = (draft: TaskDraft, task: AdminFetchCatalogTask | undefined): AdminFetchTaskSpec => {
  const params = buildTaskParams(draft, task);
  return {
    task_name: draft.task_name,
    task_sub_type: Number(draft.task_sub_type || task?.supportedSubTypes?.[0] || 1),
    task_params: Object.keys(params).length > 0 || task?.acceptsEmptyTaskParams ? params : {},
  };
};

export const buildTaskSetSpec = (draft: TaskSetDraft, task: AdminFetchCatalogTask | undefined): AdminFetchTaskSetSpec => {
  const spec: AdminFetchTaskSetSpec = {
    task_name: draft.task_name,
    task_sub_type: Number(draft.task_sub_type || task?.supportedSubTypes?.[0] || 1),
    task_set_mode: draft.task_set_mode,
    task_params: buildTaskParams(draft, task),
  };

  if (draft.task_set_mode === "trade_dates" || draft.task_set_mode === "trade_dates_with_offsets") {
    spec.trade_dates = {
      start_timestamp: Number(compactDate(draft.trade_dates.start_timestamp)),
      end_timestamp: Number(compactDate(draft.trade_dates.end_timestamp)),
    };
  }

  if (draft.task_set_mode === "date_range_with_offsets") {
    spec.date_range = {
      start_date: compactDate(draft.date_range.start_date),
      end_date: compactDate(draft.date_range.end_date),
    };
  }

  if (
    draft.task_set_mode === "offsets" ||
    draft.task_set_mode === "trade_dates_with_offsets" ||
    draft.task_set_mode === "date_range_with_offsets"
  ) {
    spec.offset_range = {
      start: Number(draft.offset_range.start || 0),
      end: Number(draft.offset_range.end || 0),
      step: Number(draft.offset_range.step || 0),
    };
  }

  return spec;
};

export const buildPayloadFromDrafts = (
  mode: EditorMode,
  label: string,
  tasks: TaskDraft[],
  taskSets: TaskSetDraft[],
  fetchInfo: Record<"fund" | "stock" | "index", FetchInfoDraftEntry>,
  executionOptions: ExecutionOptionsDraft,
  catalog: AdminFetchCatalogResponse | null,
  jsonSpec: string
): AdminFetchJobSpec => {
  if (mode === "json") {
    const parsed = JSON.parse(jsonSpec) as AdminFetchJobSpec;
    parsed.execution_options = {
      worker_threads: parseNumber(executionOptions.worker_threads),
      task_interval_ms: parseNumber(executionOptions.task_interval_ms),
    };
    return parsed;
  }

  const payload: AdminFetchJobSpec = {
    mode,
  };

  if (label.trim()) {
    payload.label = label.trim();
  }

  payload.execution_options = {
    worker_threads: parseNumber(executionOptions.worker_threads),
    task_interval_ms: parseNumber(executionOptions.task_interval_ms),
  };

  if (mode === "tasks" || mode === "all") {
    payload.tasks = tasks.map((draft) => buildTaskSpec(draft, getTaskCatalog(catalog, draft.task_name)));
  }

  if (mode === "task_sets" || mode === "all") {
    payload.task_sets = taskSets.map((draft) =>
      buildTaskSetSpec(draft, getTaskCatalog(catalog, draft.task_name))
    );
  }

  if (mode === "fetch_info" || mode === "all") {
    payload.fetch_info = {
      fund: {
        enabled: fetchInfo.fund.enabled,
        ...buildParamsRecord(
          catalog?.fetchInfoCatalog.fund?.paramsSchema,
          catalog?.fetchInfoCatalog.fund?.defaultParams,
          fetchInfo.fund.params
        ),
      },
      stock: {
        enabled: fetchInfo.stock.enabled,
        ...buildParamsRecord(
          catalog?.fetchInfoCatalog.stock?.paramsSchema,
          catalog?.fetchInfoCatalog.stock?.defaultParams,
          fetchInfo.stock.params
        ),
      },
      index: {
        enabled: fetchInfo.index.enabled,
        ...buildParamsRecord(
          catalog?.fetchInfoCatalog.index?.paramsSchema,
          catalog?.fetchInfoCatalog.index?.defaultParams,
          fetchInfo.index.params
        ),
      },
    };
  }

  return payload;
};

import { buildParamsRecord } from "./taskParams";
