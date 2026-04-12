import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cancelFetchJob,
  createFetchJob,
  deleteFetchJob,
  getFetchCatalog,
  getFetchJobDetail,
  getFetchTaskDetail,
  listFetchJobs,
  listFetchTasksV2,
  previewFetchJob,
  retryFailedTasksInJob,
  retryFetchTasks,
} from "../../api/admin";
import type {
  AdminFetchBehaviorSummary,
  AdminFetchCatalogParamField,
  AdminFetchCatalogResponse,
  AdminFetchCatalogTask,
  AdminFetchCatalogTaskVariant,
  AdminFetchExecutionPlan,
  AdminFetchInfoCatalogEntry,
  AdminFetchInfoSpec,
  AdminFetchJob,
  AdminFetchJobDetail,
  AdminFetchJobPreviewResponse,
  AdminFetchJobSpec,
  AdminFetchJobSummary,
  AdminFetchMode,
  AdminFetchParameterAnalysis,
  AdminFetchPreviewIssue,
  AdminFetchQuickPreset,
  AdminFetchTask,
  AdminFetchTaskDetail,
  AdminFetchTaskSetMode,
  AdminFetchTaskSetSpec,
  AdminFetchTaskSpec,
} from "../../types/admin";
import ActionButton from "../ActionButton";
import { cn } from "../../utils/classNames";
import {
  Blocks,
  Braces,
  Calendar,
  ChevronRight,
  Database,
  Eye,
  Filter,
  Layers3,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Users,
  Workflow,
  X,
} from "lucide-react";

// 从拆分后的模块导入类型、常量和工具函数
import {
  // 类型
  type FetchTaskManagerProps,
  type EditorMode,
  type TaskDraft,
  type TaskSetDraft,
  type FetchInfoDraftEntry,
  type TextPreviewBlock,
  type ExecutionOptionsDraft,
  type ParameterStatusKind,
  type ParameterStatusItem,
  type ParameterScopeCard,
  type FieldStatusInfo,
  // 常量（EMPTY_JOB_SUMMARY 在 types.ts 中定义）
  EMPTY_JOB_SUMMARY,
} from "./FetchTaskManager/types";

import {
  // 常量
  JOB_STATUS_OPTIONS,
  MODE_OPTIONS,
  EDITOR_MODE_OPTIONS,
  TASK_SOURCE_OPTIONS,
  TASK_SET_MODE_OPTIONS,
  PARAM_HELP_TEXT,
  TASK_KIND_LABELS,
  TASK_SET_STRUCTURAL_PARAM_KEYS,
  PARAMETER_STATUS_META,
} from "./FetchTaskManager/constants";

import {
  // 日期工具函数
  compactDate,
  expandDate,
  formatDisplayDate,
  parseDateInput,
  formatDateAsCompact,
  formatDateAsDashed,
  enumerateDates,
  toDateTimeFilter,
} from "./FetchTaskManager/utils/dates";

const normalizeTaskParamFieldName = (fieldName: string) =>
  fieldName.startsWith("task_params.") ? fieldName.slice("task_params.".length) : fieldName;

const isOffsetExpandingTaskSetMode = (mode: AdminFetchTaskSetMode) =>
  mode === "offsets" || mode === "trade_dates_with_offsets" || mode === "date_range_with_offsets";

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN");
};

const formatJson = (value: unknown) => {
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

const toInputValue = (value: unknown, key?: string) => {
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

const getStatusBadgeClass = (status: string) => {
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

const getModeLabel = (mode: string) =>
  MODE_OPTIONS.find((item) => item.value === mode)?.label ?? mode;

const getTaskKindLabel = (taskName: string) => TASK_KIND_LABELS[taskName] ?? taskName;

const getTaskSetModeLabel = (mode: string) =>
  TASK_SET_MODE_OPTIONS.find((item) => item.value === mode)?.label ?? mode;

const readTaskFieldValue = (params: Record<string, unknown>, key: string) => {
  const value = params[key];
  return value == null || value === "" ? "未填写" : String(value);
};

const enumerateOffsets = (startValue: string, endValue: string, stepValue: string) => {
  const start = parseNumber(startValue);
  const end = parseNumber(endValue);
  const step = parseNumber(stepValue);
  if (start == null || end == null || step == null || step <= 0 || end < start) {
    return [];
  }
  const result: number[] = [];
  for (let current = start; current <= end; current += step) {
    result.push(current);
  }
  return result;
};

const summarizeTaskBehavior = (taskName: string, taskSubType: number) => {
  switch (taskName) {
    case "stock_daily":
      if (taskSubType === 1) {
        return "按单个交易日抓取全市场股票日线。";
      }
      if (taskSubType === 3) {
        return "按日期范围批量抓取全市场股票日线，偏历史初始化。";
      }
      break;
    case "index_daily_basic":
      if (taskSubType === 1) {
        return "按指数代码加日期范围抓取指数估值指标。";
      }
      if (taskSubType === 2) {
        return "按单个交易日抓取当日全部指数估值指标。";
      }
      if (taskSubType === 3) {
        return "按日期范围批量抓取全部指数估值指标，偏历史初始化。";
      }
      break;
    case "sw_industry_daily":
      if (taskSubType === 1) {
        return "按单个交易日抓取当日全部申万行业日线。";
      }
      if (taskSubType === 2) {
        return "按行业指数代码加日期范围抓取申万行业日线。";
      }
      if (taskSubType === 3) {
        return "按日期范围批量抓取全部申万行业日线，偏历史初始化。";
      }
      break;
    case "fund_nav":
      return "按单个交易日抓取全部基金净值。";
    case "fund_manager":
      return "按过滤条件抓取基金经理信息，也可以不加业务过滤直接分页扫全量。";
    case "fund_share":
      return taskSubType === 3
        ? "按日期范围批量抓取基金份额。"
        : "按单个交易日或筛选条件抓取基金份额。";
    case "etf_share_size":
      return taskSubType === 3
        ? "按日期范围批量抓取 ETF 份额规模。"
        : "按单个交易日或筛选条件抓取 ETF 份额规模。";
    case "sw_industry_classify":
      return "抓取申万行业分类，不填条件时走默认分类体系。";
    case "sw_industry_member":
      return "按行业编码、成分代码等过滤抓取申万行业成分，也可直接分页扫全量。";
    case "ci_index_member":
      return "按行业编码、成分代码等过滤抓取中信行业成分，也可直接分页扫全量。";
    default:
      return `抓取 ${getTaskKindLabel(taskName)} 数据。`;
  }
  return `抓取 ${getTaskKindLabel(taskName)} 数据。`;
};

const describeLeafRequest = (taskName: string, taskSubType: number, params: Record<string, unknown>) => {
  const offset = readTaskFieldValue(params, "offset");
  const limit = readTaskFieldValue(params, "limit");

  switch (taskName) {
    case "stock_daily":
      if (taskSubType === 1) {
        return `按交易日 ${readTaskFieldValue(params, "trade_date_timestamp")} 抓取全市场股票日线，分页参数为 offset=${offset}、limit=${limit}。`;
      }
      if (taskSubType === 3) {
        return `按日期范围 ${readTaskFieldValue(params, "start_date")} 到 ${readTaskFieldValue(params, "end_date")} 抓取全市场股票日线，分页参数为 offset=${offset}、limit=${limit}。`;
      }
      break;
    case "index_daily_basic":
      if (taskSubType === 1) {
        return `按指数代码 ${readTaskFieldValue(params, "ts_code")} 抓取 ${readTaskFieldValue(params, "start_date")} 到 ${readTaskFieldValue(params, "end_date")} 的指数估值指标，分页参数为 offset=${offset}、limit=${limit}。`;
      }
      if (taskSubType === 2) {
        return `按交易日 ${readTaskFieldValue(params, "trade_date")} 抓取当日全部指数估值指标，分页参数为 offset=${offset}、limit=${limit}。`;
      }
      if (taskSubType === 3) {
        return `按日期范围 ${readTaskFieldValue(params, "start_date")} 到 ${readTaskFieldValue(params, "end_date")} 抓取全部指数估值指标，分页参数为 offset=${offset}、limit=${limit}。`;
      }
      break;
    case "sw_industry_daily":
      if (taskSubType === 1) {
        return `按交易日 ${readTaskFieldValue(params, "trade_date")} 抓取当日全部申万行业日线，分页参数为 offset=${offset}、limit=${limit}。`;
      }
      if (taskSubType === 2) {
        return `按行业指数代码 ${readTaskFieldValue(params, "ts_code")} 抓取 ${readTaskFieldValue(params, "start_date")} 到 ${readTaskFieldValue(params, "end_date")} 的申万行业日线，分页参数为 offset=${offset}、limit=${limit}。`;
      }
      if (taskSubType === 3) {
        return `按日期范围 ${readTaskFieldValue(params, "start_date")} 到 ${readTaskFieldValue(params, "end_date")} 抓取全部申万行业日线，分页参数为 offset=${offset}、limit=${limit}。`;
      }
      break;
    case "fund_nav":
      return `按交易日 ${readTaskFieldValue(params, "trade_date_timestamp")} 抓取全部基金净值，分页参数为 offset=${offset}、limit=${limit}。`;
    case "fund_share":
      if (taskSubType === 3) {
        return `按日期范围 ${readTaskFieldValue(params, "start_date")} 到 ${readTaskFieldValue(params, "end_date")} 抓取基金份额，分页参数为 offset=${offset}、limit=${limit}。`;
      }
      return `按 trade_date=${readTaskFieldValue(params, "trade_date")}、ts_code=${readTaskFieldValue(params, "ts_code")}、market=${readTaskFieldValue(params, "market")} 等条件抓取基金份额，分页参数为 offset=${offset}、limit=${limit}。`;
    case "etf_share_size":
      if (taskSubType === 3) {
        return `按日期范围 ${readTaskFieldValue(params, "start_date")} 到 ${readTaskFieldValue(params, "end_date")} 抓取 ETF 份额规模，分页参数为 offset=${offset}、limit=${limit}。`;
      }
      return `按 trade_date=${readTaskFieldValue(params, "trade_date")}、ts_code=${readTaskFieldValue(params, "ts_code")}、exchange=${readTaskFieldValue(params, "exchange")} 等条件抓取 ETF 份额规模，分页参数为 offset=${offset}、limit=${limit}。`;
    case "fund_manager":
      return `按 ts_code=${readTaskFieldValue(params, "ts_code")}、ann_date=${readTaskFieldValue(params, "ann_date")}、name=${readTaskFieldValue(params, "name")} 等条件抓取基金经理，分页参数为 offset=${offset}、limit=${limit}。`;
    case "sw_industry_member":
      return `按 l1/l2/l3/ts_code/is_new 等条件抓取申万行业成分，当前参数为 l1_code=${readTaskFieldValue(params, "l1_code")}、l2_code=${readTaskFieldValue(params, "l2_code")}、l3_code=${readTaskFieldValue(params, "l3_code")}、ts_code=${readTaskFieldValue(params, "ts_code")}、is_new=${readTaskFieldValue(params, "is_new")}，分页参数为 offset=${offset}、limit=${limit}。`;
    case "ci_index_member":
      return `按 l1/l2/l3/ts_code/is_new 等条件抓取中信行业成分，当前参数为 l1_code=${readTaskFieldValue(params, "l1_code")}、l2_code=${readTaskFieldValue(params, "l2_code")}、l3_code=${readTaskFieldValue(params, "l3_code")}、ts_code=${readTaskFieldValue(params, "ts_code")}、is_new=${readTaskFieldValue(params, "is_new")}，分页参数为 offset=${offset}、limit=${limit}。`;
    case "sw_industry_classify":
      return `抓取申万行业分类，当前参数为 level=${readTaskFieldValue(params, "level")}、src=${readTaskFieldValue(params, "src")}。`;
    default:
      return `抓取 ${getTaskKindLabel(taskName)}，请求参数为 ${formatJson(params)}。`;
  }
  return `抓取 ${getTaskKindLabel(taskName)}，请求参数为 ${formatJson(params)}。`;
};

const getFieldHelpText = (fieldName: string) => PARAM_HELP_TEXT[fieldName] ?? "该字段由后端 catalog 定义，当前前端没有更细的内置说明。";

const buildParamsRecord = (
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

const normalizeTaskSubType = (value: unknown, fallback = "1") => {
  if (value == null || value === "") return fallback;
  return String(value);
};

const getTaskCatalog = (catalog: AdminFetchCatalogResponse | null, taskName: string) =>
  catalog?.taskCatalog.find((item) => item.taskName === taskName);

const getTaskVariant = (
  task: AdminFetchCatalogTask | undefined,
  taskSubType: string | number | undefined
): AdminFetchCatalogTaskVariant | undefined =>
  task?.variants?.find((variant) => String(variant.taskSubType) === String(taskSubType));

const getTaskFieldSchema = (
  task: AdminFetchCatalogTask | undefined,
  taskSubType: string | number | undefined
) => {
  const variant = getTaskVariant(task, taskSubType);
  if (variant?.fields) return variant.fields;
  // 如果指定的variant不存在，fallback到第一个variant的fields
  if (task?.variants?.[0]?.fields) return task.variants[0].fields;
  return task?.paramsSchema ?? [];
};

const getSupportedSubTypes = (task: AdminFetchCatalogTask | undefined) => {
  const variantTypes = task?.variants?.map((variant) => variant.taskSubType) ?? [];
  return variantTypes.length > 0 ? variantTypes : task?.supportedSubTypes ?? [1];
};

const getAllowedTaskSetModes = (
  task: AdminFetchCatalogTask | undefined,
  taskSubType: string | number | undefined
) => {
  const variantModes = getTaskVariant(task, taskSubType)?.allowedTaskSetModes;
  if (variantModes?.length) return variantModes;
  if (task?.taskSetModes?.length) return task.taskSetModes;
  return TASK_SET_MODE_OPTIONS.map((item) => item.value);
};

const normalizePreviewPath = (
  scope: string,
  rawPath: string,
  taskDrafts: TaskDraft[],
  taskSetDrafts: TaskSetDraft[],
  taskCatalogMap: Map<string, AdminFetchCatalogTask>
) => {
  if (rawPath.startsWith(scope)) {
    return rawPath;
  }

  const normalizeTaskScope = (draft: TaskDraft | TaskSetDraft | undefined, fieldPath: string) => {
    if (!draft) return `${scope}.${fieldPath}`;
    const task = taskCatalogMap.get(draft.task_name);
    const fieldNames = new Set(getTaskFieldSchema(task, draft.task_sub_type).map((item) => item.name));
    if (
      fieldPath === "task_name" ||
      fieldPath === "task_sub_type" ||
      fieldPath === "task_set_mode" ||
      fieldPath.startsWith("task_params.") ||
      fieldPath.startsWith("trade_dates.") ||
      fieldPath.startsWith("date_range.") ||
      fieldPath.startsWith("offset_range.")
    ) {
      return `${scope}.${fieldPath}`;
    }
    if (fieldNames.has(fieldPath)) {
      return `${scope}.task_params.${fieldPath}`;
    }
    return `${scope}.${fieldPath}`;
  };

  if (scope.startsWith("tasks[")) {
    const index = Number(scope.match(/^tasks\[(\d+)\]$/)?.[1] ?? -1);
    return normalizeTaskScope(taskDrafts[index], rawPath);
  }

  if (scope.startsWith("task_sets[")) {
    const index = Number(scope.match(/^task_sets\[(\d+)\]$/)?.[1] ?? -1);
    return normalizeTaskScope(taskSetDrafts[index], rawPath);
  }

  if (scope.startsWith("fetch_info.") || scope === "execution_options") {
    return `${scope}.${rawPath}`;
  }

  return `${scope}.${rawPath}`;
};

const createTaskDraft = (
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

const createTaskSetDraft = (
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

const buildFetchInfoDraft = (
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

const parseNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const serializeFieldValue = (
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

const buildTaskParams = (draft: TaskDraft | TaskSetDraft, task: AdminFetchCatalogTask | undefined) => {
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

const buildTaskSpec = (draft: TaskDraft, task: AdminFetchCatalogTask | undefined): AdminFetchTaskSpec => {
  const params = buildTaskParams(draft, task);
  return {
    task_name: draft.task_name,
    task_sub_type: Number(draft.task_sub_type || task?.supportedSubTypes?.[0] || 1),
    task_params: Object.keys(params).length > 0 || task?.acceptsEmptyTaskParams ? params : {},
  };
};

const buildTaskSetSpec = (draft: TaskSetDraft, task: AdminFetchCatalogTask | undefined): AdminFetchTaskSetSpec => {
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

const buildPayloadFromDrafts = (
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
          undefined,
          Object.fromEntries(
            Object.entries(fetchInfo.fund.params).map(([key, value]) => [key, value.trim()])
          )
        ),
      },
      stock: {
        enabled: fetchInfo.stock.enabled,
        ...buildParamsRecord(
          catalog?.fetchInfoCatalog.stock?.paramsSchema,
          undefined,
          Object.fromEntries(
            Object.entries(fetchInfo.stock.params).map(([key, value]) => [key, value.trim()])
          )
        ),
      },
      index: {
        enabled: fetchInfo.index.enabled,
        ...buildParamsRecord(
          catalog?.fetchInfoCatalog.index?.paramsSchema,
          undefined,
          Object.fromEntries(
            Object.entries(fetchInfo.index.params).map(([key, value]) => [key, value.trim()])
          )
        ),
      },
    };

    (["fund", "stock", "index"] as const).forEach((key) => {
      const entry = payload.fetch_info?.[key];
      if (!entry) return;
      Object.entries(entry).forEach(([paramKey, rawValue]) => {
        if (paramKey === "enabled" || rawValue === "") return;
        const field = catalog?.fetchInfoCatalog[key]?.paramsSchema?.find((item) => item.name === paramKey);
        const parsed = serializeFieldValue(field, String(rawValue), paramKey);
        if (parsed === undefined) {
          delete entry[paramKey];
        } else {
          entry[paramKey] = parsed;
        }
      });
    });
  }

  return payload;
};

const buildTaskPreviewBlock = (draft: TaskDraft, task: AdminFetchCatalogTask | undefined, index: number): TextPreviewBlock => {
  const spec = buildTaskSpec(draft, task);
  const params = (spec.task_params ?? {}) as Record<string, unknown>;
  return {
    key: draft.id,
    title: `普通任务 #${index + 1} · ${getTaskKindLabel(draft.task_name)}`,
    summary: summarizeTaskBehavior(draft.task_name, Number(spec.task_sub_type ?? 1)),
    requestCount: 1,
    requestLines: [`请求 1：${describeLeafRequest(draft.task_name, Number(spec.task_sub_type ?? 1), params)}`],
    parameterLines: [
      `task_name：${getFieldHelpText("task_name")}`,
      `task_sub_type：${getFieldHelpText("task_sub_type")}`,
      ...Object.keys(draft.task_params).map((fieldName) => `${fieldName}：${getFieldHelpText(fieldName)}`),
    ],
  };
};

const buildTaskSetPreviewBlock = (
  draft: TaskSetDraft,
  task: AdminFetchCatalogTask | undefined,
  index: number
): TextPreviewBlock => {
  const spec = buildTaskSetSpec(draft, task);
  const baseParams = { ...((spec.task_params ?? {}) as Record<string, unknown>) };
  const requestLines: string[] = [];

  if (draft.task_set_mode === "trade_dates") {
    const dates = enumerateDates(draft.trade_dates.start_timestamp, draft.trade_dates.end_timestamp);
    dates.forEach((date, dateIndex) => {
      const leafParams = {
        ...baseParams,
        trade_date: task?.dateStyle === "yyyyMMdd" ? formatDateAsCompact(date) : undefined,
        trade_date_timestamp: task?.dateStyle === "yyyyMMdd" ? undefined : Number(formatDateAsCompact(date)),
      };
      requestLines.push(
        `请求 ${dateIndex + 1}：${describeLeafRequest(draft.task_name, Number(spec.task_sub_type ?? 1), leafParams)}`
      );
    });
  } else if (draft.task_set_mode === "offsets") {
    const offsets = enumerateOffsets(draft.offset_range.start, draft.offset_range.end, draft.offset_range.step);
    offsets.forEach((offset, offsetIndex) => {
      requestLines.push(
        `请求 ${offsetIndex + 1}：${describeLeafRequest(draft.task_name, Number(spec.task_sub_type ?? 1), {
          ...baseParams,
          offset,
        })}`
      );
    });
  } else if (draft.task_set_mode === "trade_dates_with_offsets") {
    const dates = enumerateDates(draft.trade_dates.start_timestamp, draft.trade_dates.end_timestamp);
    const offsets = enumerateOffsets(draft.offset_range.start, draft.offset_range.end, draft.offset_range.step);
    dates.forEach((date) => {
      offsets.forEach((offset) => {
        requestLines.push(
          `请求 ${requestLines.length + 1}：${describeLeafRequest(draft.task_name, Number(spec.task_sub_type ?? 1), {
            ...baseParams,
            trade_date: task?.dateStyle === "yyyyMMdd" ? formatDateAsCompact(date) : undefined,
            trade_date_timestamp: task?.dateStyle === "yyyyMMdd" ? undefined : Number(formatDateAsCompact(date)),
            offset,
          })}`
        );
      });
    });
  } else if (draft.task_set_mode === "date_range_with_offsets") {
    const offsets = enumerateOffsets(draft.offset_range.start, draft.offset_range.end, draft.offset_range.step);
    offsets.forEach((offset, offsetIndex) => {
      requestLines.push(
        `请求 ${offsetIndex + 1}：${describeLeafRequest(draft.task_name, Number(spec.task_sub_type ?? 1), {
          ...baseParams,
          start_date: compactDate(draft.date_range.start_date),
          end_date: compactDate(draft.date_range.end_date),
          offset,
        })}`
      );
    });
  }

  const visibleLines = requestLines.slice(0, 12);
  if (requestLines.length > 12) {
    visibleLines.push(`其余 ${requestLines.length - 12} 个请求已省略，但会按同样模式继续展开。`);
  }
  if (visibleLines.length === 0) {
    visibleLines.push("当前日期范围或 offset 范围还不完整，暂时无法推导出展开后的叶子请求。");
  }

  const parameterLines = [
    `task_name：${getFieldHelpText("task_name")}`,
    `task_sub_type：${getFieldHelpText("task_sub_type")}`,
    `task_set_mode：${getFieldHelpText("task_set_mode")}`,
  ];

  if (draft.task_set_mode === "trade_dates" || draft.task_set_mode === "trade_dates_with_offsets") {
    parameterLines.push(
      `trade_dates.start_timestamp：${getFieldHelpText("trade_dates_start_timestamp")}`,
      `trade_dates.end_timestamp：${getFieldHelpText("trade_dates_end_timestamp")}`
    );
  }
  if (draft.task_set_mode === "date_range_with_offsets") {
    parameterLines.push(
      `date_range.start_date：${getFieldHelpText("date_range_start_date")}`,
      `date_range.end_date：${getFieldHelpText("date_range_end_date")}`
    );
  }
  if (
    draft.task_set_mode === "offsets" ||
    draft.task_set_mode === "trade_dates_with_offsets" ||
    draft.task_set_mode === "date_range_with_offsets"
  ) {
    parameterLines.push(
      `offset_range.start：${getFieldHelpText("offset_range_start")}`,
      `offset_range.end：${getFieldHelpText("offset_range_end")}`,
      `offset_range.step：${getFieldHelpText("offset_range_step")}`
    );
  }
  parameterLines.push(...Object.keys(draft.task_params).map((fieldName) => `${fieldName}：${getFieldHelpText(fieldName)}`));

  return {
    key: draft.id,
    title: `任务集合 #${index + 1} · ${getTaskKindLabel(draft.task_name)}`,
    summary: `当前会先按“${getTaskSetModeLabel(draft.task_set_mode)}”展开，再把每个叶子请求按 task_sub_type=${spec.task_sub_type} 派发到后端。${summarizeTaskBehavior(
      draft.task_name,
      Number(spec.task_sub_type ?? 1)
    )}`,
    requestCount: requestLines.length,
    requestLines: visibleLines,
    parameterLines,
  };
};

const buildFetchInfoPreviewBlocks = (
  fetchInfoDraft: Record<"fund" | "stock" | "index", FetchInfoDraftEntry>
): TextPreviewBlock[] =>
  (["fund", "stock", "index"] as const)
    .filter((key) => fetchInfoDraft[key].enabled)
    .map((key) => ({
      key,
      title: `基础信息 · ${getTaskKindLabel(`${key}_info`)}`,
      summary: `会创建一条 ${key}_info 类型的抓取任务，用于拉取 ${key === "fund" ? "基金" : key === "stock" ? "股票" : "指数"}基础信息。`,
      requestCount: 1,
      requestLines: [
        `请求 1：抓取 ${key === "fund" ? "基金" : key === "stock" ? "股票" : "指数"}基础信息，筛选参数为 ${formatJson(fetchInfoDraft[key].params)}。`,
      ],
      parameterLines: Object.keys(fetchInfoDraft[key].params).map(
        (fieldName) => `${fieldName}：${getFieldHelpText(fieldName)}`
      ),
    }));

const applyPresetSpec = (
  preset: AdminFetchQuickPreset,
  catalog: AdminFetchCatalogResponse | null,
  setMode: (value: EditorMode) => void,
  setLabel: (value: string) => void,
  setTasks: (value: TaskDraft[]) => void,
  setTaskSets: (value: TaskSetDraft[]) => void,
  setFetchInfo: (value: Record<"fund" | "stock" | "index", FetchInfoDraftEntry>) => void,
  setExecutionOptions: (value: ExecutionOptionsDraft) => void,
  setJsonSpec: (value: string) => void
) => {
  if (!preset.spec) {
    alert("该快捷预设未返回 spec，请联系后端同学补全 fetch-catalog。");
    return;
  }

  const spec = preset.spec;
  setMode(spec.mode);
  setLabel(spec.label ?? "");
  setTasks((spec.tasks ?? []).map((item) => createTaskDraft(catalog, item.task_name, item)));
  setTaskSets((spec.task_sets ?? []).map((item) => createTaskSetDraft(catalog, item.task_name, item)));
  setFetchInfo(buildFetchInfoDraft(catalog, spec.fetch_info));
  setExecutionOptions({
    worker_threads: toInputValue(spec.execution_options?.worker_threads, "worker_threads") || "4",
    task_interval_ms: toInputValue(spec.execution_options?.task_interval_ms, "task_interval_ms") || "200",
  });
  setJsonSpec(JSON.stringify(spec, null, 2));
};

const getScopeTitle = (scope: string) => {
  if (scope.startsWith("tasks[")) {
    const index = Number(scope.match(/^tasks\[(\d+)\]$/)?.[1] ?? 0);
    return `普通任务 #${index + 1}`;
  }
  if (scope.startsWith("task_sets[")) {
    const index = Number(scope.match(/^task_sets\[(\d+)\]$/)?.[1] ?? 0);
    return `任务集合 #${index + 1}`;
  }
  if (scope.startsWith("fetch_info.")) {
    const key = scope.split(".")[1];
    return `基础信息 · ${key === "fund" ? "基金" : key === "stock" ? "股票" : "指数"}`;
  }
  if (scope === "execution_options") {
    return "执行编排设置";
  }
  return scope;
};

const addIssueMessage = (
  bucket: Map<string, { errors: string[]; warnings: string[] }>,
  issue: AdminFetchPreviewIssue,
  kind: "errors" | "warnings"
) => {
  const current = bucket.get(issue.path) ?? { errors: [], warnings: [] };
  current[kind].push(issue.message);
  bucket.set(issue.path, current);
};

const getIssueReason = (
  path: string,
  issueMap: Map<string, { errors: string[]; warnings: string[] }>,
  fallback: string
) => {
  const issue = issueMap.get(path);
  if (issue?.errors?.length) return issue.errors[0];
  if (issue?.warnings?.length) return issue.warnings[0];
  return fallback;
};

const DynamicField = ({
  field,
  value,
  onChange,
  helperText,
  statusInfo,
}: {
  field: AdminFetchCatalogParamField;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  statusInfo?: FieldStatusInfo;
}) => {
  const lowerType = (field.inputType ?? field.type ?? "text").toLowerCase();
  const statusMeta = statusInfo ? PARAMETER_STATUS_META[statusInfo.kind] : null;
  const baseInputClass = cn(
    "w-full rounded-xl border bg-white px-3 py-2 text-sm text-ink-900 focus:outline-none",
    statusMeta?.fieldClass ?? "border-gray-200 focus:border-sky-500"
  );
  const helper = statusInfo?.message ?? helperText;

  if (lowerType === "boolean") {
    return (
      <label className="block">
        <span className="mb-2 block text-xs font-medium text-ink-600">{field.label}</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={baseInputClass}
        >
          <option value="">未设置</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
        {statusInfo ? (
          <span className={cn("mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium", statusMeta?.badgeClass)}>
            {statusInfo.label}
          </span>
        ) : null}
        {helper ? <p className="mt-2 text-[11px] leading-5 text-ink-400">{helper}</p> : null}
      </label>
    );
  }

  if (lowerType === "select" && field.options?.length) {
    return (
      <label className="block">
        <span className="mb-2 block text-xs font-medium text-ink-600">{field.label}</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={baseInputClass}
        >
          <option value="">请选择</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {statusInfo ? (
          <span className={cn("mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium", statusMeta?.badgeClass)}>
            {statusInfo.label}
          </span>
        ) : null}
        {helper ? <p className="mt-2 text-[11px] leading-5 text-ink-400">{helper}</p> : null}
      </label>
    );
  }

  if (lowerType === "textarea" || lowerType === "json") {
    return (
      <label className="block">
        <span className="mb-2 block text-xs font-medium text-ink-600">{field.label}</span>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          placeholder={field.placeholder}
          className={cn(
            "w-full rounded-xl border bg-white px-3 py-2 text-sm text-ink-900 focus:outline-none",
            statusMeta?.fieldClass ?? "border-gray-200 focus:border-sky-500"
          )}
        />
        {statusInfo ? (
          <span className={cn("mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium", statusMeta?.badgeClass)}>
            {statusInfo.label}
          </span>
        ) : null}
        {helper ? <p className="mt-2 text-[11px] leading-5 text-ink-400">{helper}</p> : null}
      </label>
    );
  }

  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-ink-600">{field.label}</span>
      <input
        type={lowerType === "number" || lowerType === "integer" ? "number" : lowerType === "date" ? "date" : "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        min={field.validation?.min}
        max={field.validation?.max}
        placeholder={field.placeholder}
        className={baseInputClass}
      />
      {statusInfo ? (
        <span className={cn("mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium", statusMeta?.badgeClass)}>
          {statusInfo.label}
        </span>
      ) : null}
      {helper ? <p className="mt-2 text-[11px] leading-5 text-ink-400">{helper}</p> : null}
    </label>
  );
};

export const FetchTaskManager = ({ token }: FetchTaskManagerProps) => {
  const [catalog, setCatalog] = useState<AdminFetchCatalogResponse | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [jobs, setJobs] = useState<AdminFetchJob[]>([]);
  const [jobsSummary, setJobsSummary] = useState<AdminFetchJobSummary>(EMPTY_JOB_SUMMARY);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsPageSize] = useState(10);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [jobsReloadKey, setJobsReloadKey] = useState(0);

  const [jobStatusInput, setJobStatusInput] = useState("");
  const [jobModeInput, setJobModeInput] = useState("");
  const [jobUuidInput, setJobUuidInput] = useState("");
  const [jobCreatedFromInput, setJobCreatedFromInput] = useState("");
  const [jobCreatedToInput, setJobCreatedToInput] = useState("");

  const [jobStatusFilter, setJobStatusFilter] = useState("");
  const [jobModeFilter, setJobModeFilter] = useState("");
  const [jobUuidFilter, setJobUuidFilter] = useState("");
  const [jobCreatedFromFilter, setJobCreatedFromFilter] = useState("");
  const [jobCreatedToFilter, setJobCreatedToFilter] = useState("");

  const [selectedJobUuid, setSelectedJobUuid] = useState<string | null>(null);
  const [selectedJobDetail, setSelectedJobDetail] = useState<AdminFetchJobDetail | null>(null);
  const [jobDetailLoading, setJobDetailLoading] = useState(false);

  const [tasks, setTasks] = useState<AdminFetchTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksPage, setTasksPage] = useState(1);
  const [tasksPageSize] = useState(20);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [tasksReloadKey, setTasksReloadKey] = useState(0);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const [taskStatusInput, setTaskStatusInput] = useState("");
  const [taskNameInput, setTaskNameInput] = useState("");
  const [taskSourceKindInput, setTaskSourceKindInput] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState("");
  const [taskNameFilter, setTaskNameFilter] = useState("");
  const [taskSourceKindFilter, setTaskSourceKindFilter] = useState("");

  const [selectedTask, setSelectedTask] = useState<AdminFetchTaskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [editorMode, setEditorMode] = useState<EditorMode>("tasks");
  const [jobLabel, setJobLabel] = useState("");
  const [taskDrafts, setTaskDrafts] = useState<TaskDraft[]>([]);
  const [taskSetDrafts, setTaskSetDrafts] = useState<TaskSetDraft[]>([]);
  const [fetchInfoDraft, setFetchInfoDraft] = useState<Record<"fund" | "stock" | "index", FetchInfoDraftEntry>>({
    fund: { enabled: false, params: {} },
    stock: { enabled: false, params: {} },
    index: { enabled: false, params: {} },
  });
  const [executionOptions, setExecutionOptions] = useState<ExecutionOptionsDraft>({
    worker_threads: "4",
    task_interval_ms: "200",
  });
  const [jsonSpec, setJsonSpec] = useState("{\n  \"mode\": \"tasks\"\n}");
  const [creating, setCreating] = useState(false);
  const [retryingTasks, setRetryingTasks] = useState(false);
  const [retryingJobFailures, setRetryingJobFailures] = useState(false);
  const [jobActionState, setJobActionState] = useState<{
    jobUuid: string;
    action: "cancel" | "delete";
  } | null>(null);
  const [previewResult, setPreviewResult] = useState<AdminFetchJobPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const taskCatalogMap = useMemo(
    () =>
      new Map((catalog?.taskCatalog ?? []).map((item) => [item.taskName, item])),
    [catalog]
  );

  const previewBuildResult = useMemo(() => {
    try {
      return {
        payload: buildPayloadFromDrafts(
          editorMode,
          jobLabel,
          taskDrafts,
          taskSetDrafts,
          fetchInfoDraft,
          executionOptions,
          catalog,
          jsonSpec
        ),
        error: null as string | null,
      };
    } catch (error) {
      return {
        payload: null,
        error: error instanceof Error ? error.message : "当前配置无法构建预览请求体",
      };
    }
  }, [catalog, editorMode, executionOptions, fetchInfoDraft, jobLabel, jsonSpec, taskDrafts, taskSetDrafts]);

  const localPreviewIssues = useMemo<AdminFetchPreviewIssue[]>(() => {
    const issues: AdminFetchPreviewIssue[] = [];

    const workerThreads = parseNumber(executionOptions.worker_threads);
    const taskIntervalMs = parseNumber(executionOptions.task_interval_ms);

    if (executionOptions.worker_threads.trim() && (!workerThreads || workerThreads <= 0)) {
      issues.push({
        path: "execution_options.worker_threads",
        code: "INVALID_WORKER_THREADS",
        message: "worker_threads 必须大于 0，表示服务端异步派发的并发度。",
      });
    }

    if (executionOptions.task_interval_ms.trim() && (taskIntervalMs == null || taskIntervalMs < 0)) {
      issues.push({
        path: "execution_options.task_interval_ms",
        code: "INVALID_TASK_INTERVAL",
        message: "task_interval_ms 不能小于 0，表示服务端叶子请求的派发间隔。",
      });
    }

    taskSetDrafts.forEach((draft, index) => {
      if (
        draft.task_set_mode === "offsets" ||
        draft.task_set_mode === "trade_dates_with_offsets" ||
        draft.task_set_mode === "date_range_with_offsets"
      ) {
        const rawStep = draft.offset_range.step.trim();
        if (!rawStep) {
          return;
        }
        const step = parseNumber(rawStep);
        if (step == null || step <= 0) {
          issues.push({
            path: `task_sets[${index}].offset_range.step`,
            code: "INVALID_RANGE_STEP",
            message: "offset_range.step 必须大于 0，否则无法按 offset 正常展开叶子请求。",
          });
        }
      }
    });

    return issues;
  }, [executionOptions, taskSetDrafts]);

  const previewPayloadJson = useMemo(
    () => (previewBuildResult.payload ? JSON.stringify(previewBuildResult.payload) : ""),
    [previewBuildResult.payload]
  );

  useEffect(() => {
    if (!previewPayloadJson) {
      setPreviewResult(null);
      setPreviewLoading(false);
      setPreviewError(previewBuildResult.error);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const response = await previewFetchJob(token, JSON.parse(previewPayloadJson) as AdminFetchJobSpec);
        if (!cancelled) {
          setPreviewResult(response);
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewResult(null);
          setPreviewError(error instanceof Error ? error.message : "抓取批次预览失败");
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [previewBuildResult.error, previewPayloadJson, token]);

  const previewIssueMap = useMemo(() => {
    const bucket = new Map<string, { errors: string[]; warnings: string[] }>();
    localPreviewIssues.forEach((issue) => addIssueMessage(bucket, issue, "errors"));
    (previewResult?.errors ?? []).forEach((issue) => addIssueMessage(bucket, issue, "errors"));
    (previewResult?.warnings ?? []).forEach((issue) => addIssueMessage(bucket, issue, "warnings"));
    return bucket;
  }, [localPreviewIssues, previewResult?.errors, previewResult?.warnings]);

  const getPathValue = useCallback(
    (path: string) => {
      if (path.startsWith("tasks[")) {
        const match = path.match(/^tasks\[(\d+)\]\.(.+)$/);
        if (!match) return "未填写";
        const draft = taskDrafts[Number(match[1])];
        const fieldPath = match[2];
        if (!draft) return "未填写";
        if (fieldPath === "task_name") return getTaskKindLabel(draft.task_name);
        if (fieldPath === "task_sub_type") return draft.task_sub_type || "未填写";
        if (fieldPath.startsWith("task_params.")) {
          const key = fieldPath.slice("task_params.".length);
          return draft.task_params[`task_params.${key}`]?.trim() || draft.task_params[key]?.trim() || "未填写";
        }
      }

      if (path.startsWith("task_sets[")) {
        const match = path.match(/^task_sets\[(\d+)\]\.(.+)$/);
        if (!match) return "未填写";
        const draft = taskSetDrafts[Number(match[1])];
        const fieldPath = match[2];
        if (!draft) return "未填写";
        if (fieldPath === "task_name") return getTaskKindLabel(draft.task_name);
        if (fieldPath === "task_sub_type") return draft.task_sub_type || "未填写";
        if (fieldPath === "task_set_mode") return getTaskSetModeLabel(draft.task_set_mode);
        if (fieldPath.startsWith("task_params.")) {
          const key = fieldPath.slice("task_params.".length);
          return draft.task_params[`task_params.${key}`]?.trim() || draft.task_params[key]?.trim() || "未填写";
        }
        if (fieldPath === "trade_dates.start_timestamp") return draft.trade_dates.start_timestamp || "未填写";
        if (fieldPath === "trade_dates.end_timestamp") return draft.trade_dates.end_timestamp || "未填写";
        if (fieldPath === "date_range.start_date") return draft.date_range.start_date || "未填写";
        if (fieldPath === "date_range.end_date") return draft.date_range.end_date || "未填写";
        if (fieldPath === "offset_range.start") return draft.offset_range.start || "未填写";
        if (fieldPath === "offset_range.end") return draft.offset_range.end || "未填写";
        if (fieldPath === "offset_range.step") return draft.offset_range.step || "未填写";
      }

      if (path.startsWith("fetch_info.")) {
        const match = path.match(/^fetch_info\.(fund|stock|index)\.(.+)$/);
        if (!match) return "未填写";
        const entry = fetchInfoDraft[match[1] as "fund" | "stock" | "index"];
        if (!entry) return "未填写";
        if (match[2] === "enabled") return entry.enabled ? "已启用" : "未启用";
        return entry.params[match[2]]?.trim() || "未填写";
      }

      if (path === "execution_options.worker_threads") return executionOptions.worker_threads || "未填写";
      if (path === "execution_options.task_interval_ms") return executionOptions.task_interval_ms || "未填写";

      return "未填写";
    },
    [executionOptions, fetchInfoDraft, taskDrafts, taskSetDrafts]
  );

  const getPathLabel = useCallback(
    (path: string) => {
      if (path.startsWith("tasks[")) {
        const match = path.match(/^tasks\[(\d+)\]\.(.+)$/);
        if (!match) return path;
        const draft = taskDrafts[Number(match[1])];
        const task = draft ? taskCatalogMap.get(draft.task_name) : undefined;
        const fieldPath = match[2];
        if (fieldPath === "task_name") return "任务类型";
        if (fieldPath === "task_sub_type") return "执行分支";
        if (fieldPath.startsWith("task_params.")) {
          const fieldName = fieldPath.slice("task_params.".length);
          return (
            getTaskFieldSchema(task, draft?.task_sub_type).find(
              (item) => item.name === fieldName || item.name === `task_params.${fieldName}`
            )?.label ?? fieldName
          );
        }
      }

      if (path.startsWith("task_sets[")) {
        const match = path.match(/^task_sets\[(\d+)\]\.(.+)$/);
        if (!match) return path;
        const draft = taskSetDrafts[Number(match[1])];
        const task = draft ? taskCatalogMap.get(draft.task_name) : undefined;
        const fieldPath = match[2];
        if (fieldPath === "task_name") return "任务类型";
        if (fieldPath === "task_sub_type") return "执行分支";
        if (fieldPath === "task_set_mode") return "展开方式";
        if (fieldPath === "trade_dates.start_timestamp") return "展开开始日期";
        if (fieldPath === "trade_dates.end_timestamp") return "展开结束日期";
        if (fieldPath === "date_range.start_date") return "固定范围开始日期";
        if (fieldPath === "date_range.end_date") return "固定范围结束日期";
        if (fieldPath === "offset_range.start") return "offset 起点";
        if (fieldPath === "offset_range.end") return "offset 终点";
        if (fieldPath === "offset_range.step") return "offset 步长";
        if (fieldPath.startsWith("task_params.")) {
          const fieldName = fieldPath.slice("task_params.".length);
          return (
            getTaskFieldSchema(task, draft?.task_sub_type).find(
              (item) => item.name === fieldName || item.name === `task_params.${fieldName}`
            )?.label ?? fieldName
          );
        }
      }

      if (path.startsWith("fetch_info.")) {
        const match = path.match(/^fetch_info\.(fund|stock|index)\.(.+)$/);
        if (!match) return path;
        if (match[2] === "enabled") return `${match[1]} 基础信息开关`;
        return catalog?.fetchInfoCatalog[match[1]]?.paramsSchema?.find((item) => item.name === match[2])?.label ?? match[2];
      }

      if (path === "execution_options.worker_threads") return "服务端并发度";
      if (path === "execution_options.task_interval_ms") return "派发间隔";

      return path;
    },
    [catalog?.fetchInfoCatalog, taskCatalogMap, taskDrafts, taskSetDrafts]
  );

  const parameterScopeCards = useMemo<ParameterScopeCard[]>(() => {
    const analyses = previewResult?.parameterAnalysis ?? [];
    const scopes = new Map<string, ParameterScopeCard>();
    const priority: Record<ParameterStatusKind, number> = {
      invalid: 5,
      requiredMissing: 4,
      ignored: 3,
      optionalEffectiveEmpty: 2,
      effective: 1,
    };

    const ensureScope = (scope: string) => {
      const existing = scopes.get(scope);
      if (existing) return existing;
      const card: ParameterScopeCard = {
        scope,
        title: getScopeTitle(scope),
        groups: {
          requiredMissing: [],
          effective: [],
          optionalEffectiveEmpty: [],
          ignored: [],
          invalid: [],
        },
      };
      scopes.set(scope, card);
      return card;
    };

    const upsertItem = (card: ParameterScopeCard, item: ParameterStatusItem) => {
      const existingKind = (Object.keys(card.groups) as ParameterStatusKind[]).find((kind) =>
        card.groups[kind].some((current) => current.path === item.path)
      );

      if (!existingKind) {
        card.groups[item.kind].push(item);
        return;
      }

      if (priority[item.kind] > priority[existingKind]) {
        card.groups[existingKind] = card.groups[existingKind].filter((current) => current.path !== item.path);
        card.groups[item.kind].push(item);
      }
    };

    analyses.forEach((analysis) => {
      const card = ensureScope(analysis.scope);
      ([
        ["requiredMissing", analysis.requiredMissing, "当前必须填写后才能生成有效请求。"],
        ["effective", analysis.effective, "当前会参与实际叶子请求构造。"],
        ["optionalEffectiveEmpty", analysis.optionalEffectiveEmpty, "当前可生效，但保持为空时将走后端默认规则。"],
        ["ignored", analysis.ignored, "当前 setting 下该字段不会传给实际叶子请求。"],
        ["invalid", analysis.invalid, "当前字段取值非法，必须先修正。"],
      ] as Array<[ParameterStatusKind, string[] | undefined, string]>).forEach(([kind, paths, fallbackReason]) => {
        (paths ?? []).forEach((path) => {
          const normalizedPath = normalizePreviewPath(
            analysis.scope,
            path,
            taskDrafts,
            taskSetDrafts,
            taskCatalogMap
          );
          upsertItem(card, {
            path: normalizedPath,
            label: getPathLabel(normalizedPath),
            value: getPathValue(normalizedPath),
            reason: getIssueReason(normalizedPath, previewIssueMap, fallbackReason),
            kind,
          });
        });
      });
    });

    localPreviewIssues.forEach((issue) => {
      const scope = issue.path.startsWith("task_sets[")
        ? issue.path.replace(/\..+$/, "")
        : issue.path.startsWith("tasks[")
          ? issue.path.replace(/\..+$/, "")
          : issue.path.startsWith("fetch_info.")
            ? issue.path.split(".").slice(0, 2).join(".")
            : "execution_options";
      const card = ensureScope(scope);
      if (!card.groups.invalid.some((item) => item.path === issue.path)) {
        upsertItem(card, {
          path: issue.path,
          label: getPathLabel(issue.path),
          value: getPathValue(issue.path),
          reason: issue.message,
          kind: "invalid",
        });
      }
    });

    taskSetDrafts.forEach((draft, index) => {
      const scope = `task_sets[${index}]`;
      const card = ensureScope(scope);
      const hiddenTaskParamKeys = new Set<string>(
        [...TASK_SET_STRUCTURAL_PARAM_KEYS].map((key) => `${scope}.task_params.${key}`)
      );

      hiddenTaskParamKeys.forEach((path) => {
        const existingKind = (Object.keys(card.groups) as ParameterStatusKind[]).find((kind) =>
          card.groups[kind].some((current) => current.path === path)
        );
        if (!existingKind) {
          return;
        }
        upsertItem(card, {
          path,
          label: getPathLabel(path),
          value: getPathValue(path),
          reason: "当前字段由 task_set 的结构化控件或展开规则生成，不建议再通过 task_params 重复填写。",
          kind: "ignored",
        });
      });
    });

    return [...scopes.values()];
  }, [
    getPathLabel,
    getPathValue,
    localPreviewIssues,
    previewIssueMap,
    previewResult?.parameterAnalysis,
    taskCatalogMap,
    taskDrafts,
    taskSetDrafts,
  ]);

  const fieldStatusMap = useMemo(() => {
    const map = new Map<string, FieldStatusInfo>();
    parameterScopeCards.forEach((card) => {
      (Object.keys(card.groups) as ParameterStatusKind[]).forEach((kind) => {
        card.groups[kind].forEach((item) => {
          if (!map.has(item.path)) {
            map.set(item.path, {
              kind,
              label: PARAMETER_STATUS_META[kind].label,
              message: item.reason,
            });
          }
        });
      });
    });
    return map;
  }, [parameterScopeCards]);

  const fetchCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const response = await getFetchCatalog(token);
      setCatalog(response);
      setFetchInfoDraft(buildFetchInfoDraft(response));
      setTaskDrafts((current) => (current.length > 0 ? current : [createTaskDraft(response)]));
      setTaskSetDrafts((current) => (current.length > 0 ? current : [createTaskSetDraft(response)]));
    } catch (error) {
      console.error("加载抓取目录失败", error);
      alert(error instanceof Error ? `加载抓取目录失败：${error.message}` : "加载抓取目录失败");
    } finally {
      setCatalogLoading(false);
    }
  }, [token]);

  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const response = await listFetchJobs(token, {
        status: jobStatusFilter || undefined,
        mode: jobModeFilter || undefined,
        jobUuid: jobUuidFilter || undefined,
        createdFrom: toDateTimeFilter(jobCreatedFromFilter, false),
        createdTo: toDateTimeFilter(jobCreatedToFilter, true),
        page: jobsPage,
        pageSize: jobsPageSize,
      });
      setJobs(response.items ?? []);
      setJobsSummary(response.summary ?? EMPTY_JOB_SUMMARY);
      setJobsTotal(response.total ?? 0);
      setSelectedJobUuid((current) => {
        if (current && response.items?.some((item) => item.jobUuid === current)) {
          return current;
        }
        return response.items?.[0]?.jobUuid ?? null;
      });
    } catch (error) {
      console.error("加载抓取批次失败", error);
      alert(error instanceof Error ? `加载抓取批次失败：${error.message}` : "加载抓取批次失败");
    } finally {
      setJobsLoading(false);
    }
  }, [
    token,
    jobStatusFilter,
    jobModeFilter,
    jobUuidFilter,
    jobCreatedFromFilter,
    jobCreatedToFilter,
    jobsPage,
    jobsPageSize,
  ]);

  const fetchJobContext = useCallback(async () => {
    if (!selectedJobUuid) {
      setSelectedJobDetail(null);
      setTasks([]);
      setTasksTotal(0);
      return;
    }

    setJobDetailLoading(true);
    setTasksLoading(true);
    try {
      const [detailResponse, tasksResponse] = await Promise.all([
        getFetchJobDetail(token, selectedJobUuid),
        listFetchTasksV2(token, {
          jobUuid: selectedJobUuid,
          status: taskStatusFilter || undefined,
          taskName: taskNameFilter || undefined,
          sourceKind: taskSourceKindFilter || undefined,
          page: tasksPage,
          pageSize: tasksPageSize,
        }),
      ]);

      setSelectedJobDetail(detailResponse);
      setTasks(tasksResponse.items ?? []);
      setTasksTotal(tasksResponse.total ?? 0);
    } catch (error) {
      console.error("加载批次上下文失败", error);
      alert(error instanceof Error ? `加载批次上下文失败：${error.message}` : "加载批次上下文失败");
    } finally {
      setJobDetailLoading(false);
      setTasksLoading(false);
    }
  }, [
    token,
    selectedJobUuid,
    taskStatusFilter,
    taskNameFilter,
    taskSourceKindFilter,
    tasksPage,
    tasksPageSize,
  ]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs, jobsReloadKey]);

  useEffect(() => {
    fetchJobContext();
  }, [fetchJobContext, tasksReloadKey]);

  useEffect(() => {
    setSelectedTaskIds((current) =>
      current.filter((taskUuid) => tasks.some((item) => item.taskUuid === taskUuid && item.status === "FAILURE"))
    );
  }, [tasks]);

  const jobsTotalPages = Math.max(1, Math.ceil(jobsTotal / jobsPageSize));
  const tasksTotalPages = Math.max(1, Math.ceil(tasksTotal / tasksPageSize));

  const retryableTaskIds = useMemo(
    () => tasks.filter((task) => task.status === "FAILURE").map((task) => task.taskUuid),
    [tasks]
  );

  const previewErrors = useMemo(
    () => [...localPreviewIssues, ...(previewResult?.errors ?? [])],
    [localPreviewIssues, previewResult?.errors]
  );

  const previewWarnings = previewResult?.warnings ?? [];

  const canCreateJob =
    !creating &&
    !catalogLoading &&
    !previewLoading &&
    !previewBuildResult.error &&
    previewErrors.length === 0 &&
    previewResult?.valid !== false;

  const renderFieldMeta = (path: string, fallbackText: string) => {
    const statusInfo = fieldStatusMap.get(path);
    return (
      <>
        {statusInfo ? (
          <span className={cn("mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium", PARAMETER_STATUS_META[statusInfo.kind].badgeClass)}>
            {statusInfo.label}
          </span>
        ) : null}
        <p className="mt-2 text-[11px] leading-5 text-ink-400">{statusInfo?.message ?? fallbackText}</p>
      </>
    );
  };

  const applyJobFilters = () => {
    setJobStatusFilter(jobStatusInput);
    setJobModeFilter(jobModeInput);
    setJobUuidFilter(jobUuidInput.trim());
    setJobCreatedFromFilter(jobCreatedFromInput);
    setJobCreatedToFilter(jobCreatedToInput);
    setJobsPage(1);
    setJobsReloadKey((value) => value + 1);
  };

  const resetJobFilters = () => {
    setJobStatusInput("");
    setJobModeInput("");
    setJobUuidInput("");
    setJobCreatedFromInput("");
    setJobCreatedToInput("");
    setJobStatusFilter("");
    setJobModeFilter("");
    setJobUuidFilter("");
    setJobCreatedFromFilter("");
    setJobCreatedToFilter("");
    setJobsPage(1);
    setJobsReloadKey((value) => value + 1);
  };

  const applyTaskFilters = () => {
    setTaskStatusFilter(taskStatusInput);
    setTaskNameFilter(taskNameInput.trim());
    setTaskSourceKindFilter(taskSourceKindInput);
    setTasksPage(1);
    setTasksReloadKey((value) => value + 1);
  };

  const resetTaskFilters = () => {
    setTaskStatusInput("");
    setTaskNameInput("");
    setTaskSourceKindInput("");
    setTaskStatusFilter("");
    setTaskNameFilter("");
    setTaskSourceKindFilter("");
    setTasksPage(1);
    setTasksReloadKey((value) => value + 1);
  };

  const refreshAll = () => {
    setJobsReloadKey((value) => value + 1);
    setTasksReloadKey((value) => value + 1);
  };

  const handleTaskDraftChange = (draftId: string, taskName: string) => {
    const catalogTask = taskCatalogMap.get(taskName);
    setTaskDrafts((current) =>
      current.map((item) =>
        item.id === draftId
          ? {
              ...item,
              task_name: taskName,
              task_sub_type: String(getSupportedSubTypes(catalogTask)[0] ?? 1),
              task_params: buildParamsRecord(
                getTaskFieldSchema(catalogTask, getSupportedSubTypes(catalogTask)[0] ?? 1),
                catalogTask?.defaultParams
              ),
            }
          : item
      )
    );
  };

  const handleTaskSetDraftChange = (draftId: string, taskName: string) => {
    const catalogTask = taskCatalogMap.get(taskName);
    setTaskSetDrafts((current) =>
      current.map((item) =>
        item.id === draftId
          ? {
              ...item,
              task_name: taskName,
              task_sub_type: String(getSupportedSubTypes(catalogTask)[0] ?? 1),
              task_params: buildParamsRecord(
                getTaskFieldSchema(catalogTask, getSupportedSubTypes(catalogTask)[0] ?? 1),
                catalogTask?.defaultParams
              ),
              task_set_mode: getAllowedTaskSetModes(catalogTask, getSupportedSubTypes(catalogTask)[0] ?? 1)[0] ?? item.task_set_mode,
            }
          : item
      )
    );
  };

  const handleTaskSetModeChange = (draftId: string, taskSetMode: AdminFetchTaskSetMode) => {
    setTaskSetDrafts((current) =>
      current.map((item) =>
        item.id === draftId
          ? {
              ...item,
              task_set_mode: taskSetMode,
              task_sub_type:
                taskSetMode === "date_range_with_offsets" ? "3" : item.task_sub_type,
            }
          : item
      )
    );
  };

  const handleCreateJob = async () => {
    try {
      const payload = buildPayloadFromDrafts(
        editorMode,
        jobLabel,
        taskDrafts,
        taskSetDrafts,
        fetchInfoDraft,
        executionOptions,
        catalog,
        jsonSpec
      );
      setCreating(true);
      const response = await createFetchJob(token, payload);
      setSelectedJobUuid(response.job.jobUuid);
      setJobsPage(1);
      setTasksPage(1);
      setJobsReloadKey((value) => value + 1);
      setTasksReloadKey((value) => value + 1);
      alert(`抓取批次已创建：${response.job.jobUuid}`);
    } catch (error) {
      console.error("创建抓取批次失败", error);
      alert(error instanceof Error ? `创建抓取批次失败：${error.message}` : "创建抓取批次失败");
    } finally {
      setCreating(false);
    }
  };

  const handleViewTaskDetail = async (taskUuid: string) => {
    setShowDetailModal(true);
    setDetailLoading(true);
    setSelectedTask(null);
    try {
      const response = await getFetchTaskDetail(token, taskUuid);
      setSelectedTask(response);
    } catch (error) {
      console.error("加载叶子任务详情失败", error);
      alert(error instanceof Error ? `加载详情失败：${error.message}` : "加载详情失败");
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRetryTasks = async (taskUuids: string[]) => {
    if (taskUuids.length === 0) {
      alert("请先选择失败任务");
      return;
    }
    if (!window.confirm(`确定要重试 ${taskUuids.length} 个失败任务吗？`)) {
      return;
    }

    setRetryingTasks(true);
    try {
      const response = await retryFetchTasks(token, taskUuids);
      const successCount = response.results.filter((item) => item.success).length;
      const failureCount = response.results.length - successCount;
      setSelectedTaskIds([]);
      setTasksReloadKey((value) => value + 1);
      setJobsReloadKey((value) => value + 1);
      alert(`批量重试完成：成功 ${successCount} 个，失败 ${failureCount} 个。`);
    } catch (error) {
      console.error("批量重试失败", error);
      alert(error instanceof Error ? `批量重试失败：${error.message}` : "批量重试失败");
    } finally {
      setRetryingTasks(false);
    }
  };

  const handleRetrySelectedTasks = async () => {
    await handleRetryTasks(selectedTaskIds);
  };

  const handleRetryJobFailures = async () => {
    if (!selectedJobUuid) {
      alert("请先选择一个抓取批次");
      return;
    }
    if (!window.confirm("确定要重试当前批次下的所有失败任务吗？")) {
      return;
    }

    setRetryingJobFailures(true);
    try {
      const response = await retryFailedTasksInJob(token, selectedJobUuid);
      const successCount = response.results.filter((item) => item.success).length;
      const failureCount = response.results.length - successCount;
      setSelectedTaskIds([]);
      setTasksReloadKey((value) => value + 1);
      setJobsReloadKey((value) => value + 1);
      alert(`批次失败重试完成：成功 ${successCount} 个，失败 ${failureCount} 个。`);
    } catch (error) {
      console.error("批次失败重试失败", error);
      alert(error instanceof Error ? `批次失败重试失败：${error.message}` : "批次失败重试失败");
    } finally {
      setRetryingJobFailures(false);
    }
  };

  const isCancelableJob = (status: string) => status === "PENDING" || status === "RUNNING";

  const handleCancelJob = async (job: AdminFetchJob | AdminFetchJobDetail) => {
    if (!isCancelableJob(job.status)) {
      alert("当前批次状态不支持取消，只有 PENDING 或 RUNNING 才能取消。");
      return;
    }
    if (
      !window.confirm(
        `确定要取消批次 ${job.jobUuid} 吗？该操作会把该批次下所有 PENDING/RUNNING 叶子任务标记为 CANCELLED。`
      )
    ) {
      return;
    }

    setJobActionState({ jobUuid: job.jobUuid, action: "cancel" });
    try {
      await cancelFetchJob(token, job.jobUuid);
      setSelectedTaskIds([]);
      setJobsReloadKey((value) => value + 1);
      setTasksReloadKey((value) => value + 1);
      alert(`批次已取消：${job.jobUuid}`);
    } catch (error) {
      console.error("取消批次失败", error);
      alert(error instanceof Error ? `取消批次失败：${error.message}` : "取消批次失败");
    } finally {
      setJobActionState(null);
    }
  };

  const handleDeleteJob = async (job: AdminFetchJob | AdminFetchJobDetail) => {
    if (
      !window.confirm(
        `确定要删除批次 ${job.jobUuid} 吗？该操作会物理删除批次及其所有叶子任务记录，无法恢复。`
      )
    ) {
      return;
    }

    setJobActionState({ jobUuid: job.jobUuid, action: "delete" });
    try {
      await deleteFetchJob(token, job.jobUuid);
      setSelectedTaskIds([]);
      if (selectedJobUuid === job.jobUuid) {
        setSelectedJobUuid(null);
        setSelectedJobDetail(null);
        setTasks([]);
        setTasksTotal(0);
      }
      setJobsReloadKey((value) => value + 1);
      setTasksReloadKey((value) => value + 1);
      alert(`批次已删除：${job.jobUuid}`);
    } catch (error) {
      console.error("删除批次失败", error);
      alert(error instanceof Error ? `删除批次失败：${error.message}` : "删除批次失败");
    } finally {
      setJobActionState(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink-900">数据爬取任务管理</h2>
          <p className="mt-1 text-sm text-ink-500">
            对齐 ingestion_flow.py 的创建语义，支持 tasks、task_sets、fetch_info 与批次级状态观察。
          </p>
        </div>
        <ActionButton variant="ghost" className="flex items-center gap-2" onClick={refreshAll}>
          <RefreshCw size={16} />
          刷新
        </ActionButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[
          { label: "队列待处理", value: jobsSummary.queuePending, icon: Database, tone: "amber" },
          { label: "消费者数", value: jobsSummary.queueConsumers, icon: Users, tone: "sky" },
          { label: "运行中批次", value: jobsSummary.runningJobs, icon: Layers3, tone: "blue" },
          { label: "运行中任务", value: jobsSummary.runningTasks, icon: Workflow, tone: "blue" },
          { label: "今日成功", value: jobsSummary.successToday, icon: Calendar, tone: "green" },
          { label: "今日失败", value: jobsSummary.failureToday, icon: X, tone: "red" },
        ].map((item) => {
          const Icon = item.icon;
          const toneClass =
            item.tone === "amber"
              ? "border-amber-100 bg-amber-50/70 text-amber-600"
              : item.tone === "sky"
                ? "border-sky-100 bg-sky-50/70 text-sky-600"
                : item.tone === "blue"
                  ? "border-blue-100 bg-blue-50/70 text-blue-600"
                  : item.tone === "green"
                    ? "border-green-100 bg-green-50/70 text-green-600"
                    : "border-red-100 bg-red-50/70 text-red-600";

          return (
            <div key={item.label} className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.24em] text-ink-500">{item.label}</p>
                <span className={cn("rounded-full border p-2", toneClass)}>
                  <Icon size={16} />
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-ink-900">
                {item.value?.toLocaleString?.() ?? item.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-ink-900">创建抓取批次</h3>
              <p className="mt-1 text-sm text-ink-500">
                当前前端直接按 v2 接口组织 job spec，默认以 fetch-catalog 渲染表单。
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-2 gap-2">
              {EDITOR_MODE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = editorMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setEditorMode(option.value)}
                    className={cn(
                      "flex items-center gap-2 rounded-2xl border px-3 py-3 text-left text-sm font-medium transition",
                      active
                        ? "border-sky-300 bg-sky-50 text-sky-700"
                        : "border-gray-200 bg-white text-ink-600 hover:border-sky-200 hover:text-sky-700"
                    )}
                  >
                    <Icon size={16} />
                    {option.label}
                  </button>
                );
              })}
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink-700">批次标签</span>
              <input
                type="text"
                value={jobLabel}
                onChange={(event) => setJobLabel(event.target.value)}
                placeholder="例如：2026Q2 历史初始化"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
              />
            </label>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-700">快捷预设</span>
                {catalogLoading ? <Loader2 size={14} className="animate-spin text-sky-500" /> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(catalog?.quickPresets ?? []).map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() =>
                      applyPresetSpec(
                        preset,
                        catalog,
                        setEditorMode,
                        setJobLabel,
                        setTaskDrafts,
                        setTaskSetDrafts,
                        setFetchInfoDraft,
                        setExecutionOptions,
                        setJsonSpec
                      )
                    }
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:border-amber-300"
                  >
                    {preset.label}
                  </button>
                ))}
                {!catalogLoading && (catalog?.quickPresets?.length ?? 0) === 0 ? (
                  <span className="text-xs text-ink-400">后端尚未返回 quick presets</span>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-ink-900">服务端异步编排</h4>
                  <p className="mt-1 text-xs leading-5 text-ink-500">
                    这里控制的是服务端展开后的派发并发度与节流，不是浏览器线程。提交后即使关闭页面，job 也会继续执行。
                  </p>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
                  SERVER_ASYNC
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-ink-600">worker_threads</span>
                  <input
                    type="number"
                    min={1}
                    value={executionOptions.worker_threads}
                    onChange={(event) =>
                      setExecutionOptions((current) => ({
                        ...current,
                        worker_threads: event.target.value,
                      }))
                    }
                    className={cn(
                      "w-full rounded-xl border bg-white px-3 py-2 text-sm text-ink-900 focus:outline-none",
                      fieldStatusMap.get("execution_options.worker_threads")?.kind
                        ? PARAMETER_STATUS_META[fieldStatusMap.get("execution_options.worker_threads")!.kind].fieldClass
                        : "border-gray-200 focus:border-sky-500"
                    )}
                  />
                  {renderFieldMeta(
                    "execution_options.worker_threads",
                    "服务端展开并派发叶子任务时使用的并发 worker 数。必须大于 0。"
                  )}
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-ink-600">task_interval_ms</span>
                  <input
                    type="number"
                    min={0}
                    value={executionOptions.task_interval_ms}
                    onChange={(event) =>
                      setExecutionOptions((current) => ({
                        ...current,
                        task_interval_ms: event.target.value,
                      }))
                    }
                    className={cn(
                      "w-full rounded-xl border bg-white px-3 py-2 text-sm text-ink-900 focus:outline-none",
                      fieldStatusMap.get("execution_options.task_interval_ms")?.kind
                        ? PARAMETER_STATUS_META[fieldStatusMap.get("execution_options.task_interval_ms")!.kind].fieldClass
                        : "border-gray-200 focus:border-sky-500"
                    )}
                  />
                  {renderFieldMeta(
                    "execution_options.task_interval_ms",
                    "服务端连续派发叶子请求之间的间隔，单位毫秒。允许为 0。"
                  )}
                </label>
              </div>
            </div>

            {editorMode === "json" ? (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink-700">完整 job spec</span>
                <textarea
                  value={jsonSpec}
                  onChange={(event) => setJsonSpec(event.target.value)}
                  rows={20}
                  className="w-full rounded-2xl border border-gray-200 bg-slate-950 px-4 py-3 font-mono text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                />
              </label>
            ) : (
              <div className="space-y-5">
                {(editorMode === "tasks" || editorMode === "all") && (
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-ink-900">普通任务</h4>
                        <p className="mt-1 text-xs text-ink-500">直接维护 `tasks` 数组。</p>
                      </div>
                      <ActionButton
                        variant="ghost"
                        className="px-3 py-1.5 text-xs"
                        onClick={() => setTaskDrafts((current) => [...current, createTaskDraft(catalog)])}
                      >
                        <Plus size={14} />
                        添加任务
                      </ActionButton>
                    </div>

                    <div className="mt-4 space-y-4">
                      {taskDrafts.map((draft, index) => {
                        const catalogTask = taskCatalogMap.get(draft.task_name);
                        const visibleFields = getTaskFieldSchema(catalogTask, draft.task_sub_type);
                        return (
                          <div key={draft.id} className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                              <div>
                                <p className="text-xs uppercase tracking-[0.24em] text-sky-600">
                                  Task #{index + 1}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setTaskDrafts((current) =>
                                    current.length === 1 ? current : current.filter((item) => item.id !== draft.id)
                                  )
                                }
                                className="rounded-full border border-red-200 p-2 text-red-500 transition hover:bg-red-50"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                              <label className="block">
                                <span className="mb-2 block text-xs font-medium text-ink-600">task_name</span>
                                <select
                                  value={draft.task_name}
                                  onChange={(event) => handleTaskDraftChange(draft.id, event.target.value)}
                                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                                >
                                  {(catalog?.taskCatalog ?? []).map((item) => (
                                    <option key={item.taskName} value={item.taskName}>
                                      {item.label}
                                    </option>
                                  ))}
                                </select>
                                {renderFieldMeta(`tasks[${index}].task_name`, getFieldHelpText("task_name"))}
                              </label>

                              <label className="block">
                                <span className="mb-2 block text-xs font-medium text-ink-600">task_sub_type</span>
                                <select
                                  value={draft.task_sub_type}
                                  onChange={(event) =>
                                    setTaskDrafts((current) =>
                                      current.map((item) =>
                                        item.id === draft.id ? { ...item, task_sub_type: event.target.value } : item
                                      )
                                    )
                                  }
                                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                                >
                                  {getSupportedSubTypes(catalogTask).map((subType) => (
                                    <option key={subType} value={subType}>
                                      {getTaskVariant(catalogTask, subType)?.label
                                        ? `${subType} · ${getTaskVariant(catalogTask, subType)?.label}`
                                        : subType}
                                    </option>
                                  ))}
                                </select>
                                {renderFieldMeta(`tasks[${index}].task_sub_type`, getFieldHelpText("task_sub_type"))}
                              </label>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              {visibleFields.map((field) => (
                                <DynamicField
                                  key={field.name}
                                  field={field}
                                  value={draft.task_params[field.name] ?? ""}
                                  helperText={field.description || field.placeholder || getFieldHelpText(field.name)}
                                  statusInfo={fieldStatusMap.get(`tasks[${index}].task_params.${field.name}`)}
                                  onChange={(value) =>
                                    setTaskDrafts((current) =>
                                      current.map((item) =>
                                        item.id === draft.id
                                          ? {
                                              ...item,
                                              task_params: {
                                                ...item.task_params,
                                                [field.name]: value,
                                              },
                                            }
                                          : item
                                      )
                                    )
                                  }
                                />
                              ))}
                            </div>

                            {catalogTask?.acceptsEmptyTaskParams ? (
                              <p className="mt-3 text-xs text-ink-400">
                                当前任务允许空 `task_params`，未填写的字段会由后端按默认规则处理。
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(editorMode === "task_sets" || editorMode === "all") && (
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-ink-900">任务集合</h4>
                        <p className="mt-1 text-xs text-ink-500">由后端按 `task_set_mode` 展开为多条叶子任务。</p>
                      </div>
                      <ActionButton
                        variant="ghost"
                        className="px-3 py-1.5 text-xs"
                        onClick={() => setTaskSetDrafts((current) => [...current, createTaskSetDraft(catalog)])}
                      >
                        <Plus size={14} />
                        添加 task_set
                      </ActionButton>
                    </div>

                    <div className="mt-4 space-y-4">
                      {taskSetDrafts.map((draft, index) => {
                        const catalogTask = taskCatalogMap.get(draft.task_name);
                        const availableModes = getAllowedTaskSetModes(catalogTask, draft.task_sub_type);
                        const visibleFields = getTaskFieldSchema(catalogTask, draft.task_sub_type).filter(
                          (field) => {
                            const normalizedName = normalizeTaskParamFieldName(field.name);
                            if (TASK_SET_STRUCTURAL_PARAM_KEYS.has(normalizedName)) {
                              return false;
                            }
                            return true;
                          }
                        );

                        return (
                          <div key={draft.id} className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                              <p className="text-xs uppercase tracking-[0.24em] text-sky-600">
                                Task Set #{index + 1}
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  setTaskSetDrafts((current) =>
                                    current.length === 1 ? current : current.filter((item) => item.id !== draft.id)
                                  )
                                }
                                className="rounded-full border border-red-200 p-2 text-red-500 transition hover:bg-red-50"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            <div className="grid gap-3 md:grid-cols-3">
                              <label className="block">
                                <span className="mb-2 block text-xs font-medium text-ink-600">task_name</span>
                                <select
                                  value={draft.task_name}
                                  onChange={(event) => handleTaskSetDraftChange(draft.id, event.target.value)}
                                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                                >
                                  {(catalog?.taskCatalog ?? []).map((item) => (
                                    <option key={item.taskName} value={item.taskName}>
                                      {item.label}
                                    </option>
                                  ))}
                                </select>
                                {renderFieldMeta(`task_sets[${index}].task_name`, getFieldHelpText("task_name"))}
                              </label>

                              <label className="block">
                                <span className="mb-2 block text-xs font-medium text-ink-600">task_set_mode</span>
                                <select
                                  value={draft.task_set_mode}
                                  onChange={(event) =>
                                    handleTaskSetModeChange(draft.id, event.target.value as AdminFetchTaskSetMode)
                                  }
                                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                                >
                                  {availableModes.map((mode) => (
                                    <option key={mode} value={mode}>
                                      {TASK_SET_MODE_OPTIONS.find((item) => item.value === mode)?.label ?? mode}
                                    </option>
                                  ))}
                                </select>
                                {renderFieldMeta(`task_sets[${index}].task_set_mode`, getFieldHelpText("task_set_mode"))}
                              </label>

                              <label className="block">
                                <span className="mb-2 block text-xs font-medium text-ink-600">task_sub_type</span>
                                <select
                                  value={draft.task_sub_type}
                                  onChange={(event) =>
                                    setTaskSetDrafts((current) =>
                                      current.map((item) =>
                                        item.id === draft.id ? { ...item, task_sub_type: event.target.value } : item
                                      )
                                    )
                                  }
                                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                                >
                                  {getSupportedSubTypes(catalogTask).map((subType) => (
                                    <option key={subType} value={subType}>
                                      {getTaskVariant(catalogTask, subType)?.label
                                        ? `${subType} · ${getTaskVariant(catalogTask, subType)?.label}`
                                        : subType}
                                    </option>
                                  ))}
                                </select>
                                {renderFieldMeta(`task_sets[${index}].task_sub_type`, getFieldHelpText("task_sub_type"))}
                              </label>
                            </div>

                            {(draft.task_set_mode === "trade_dates" ||
                              draft.task_set_mode === "trade_dates_with_offsets") && (
                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <label className="block">
                                  <span className="mb-2 block text-xs font-medium text-ink-600">trade_dates.start_timestamp</span>
                                  <input
                                    type="date"
                                    value={draft.trade_dates.start_timestamp}
                                    onChange={(event) =>
                                      setTaskSetDrafts((current) =>
                                        current.map((item) =>
                                          item.id === draft.id
                                            ? {
                                                ...item,
                                                trade_dates: {
                                                  ...item.trade_dates,
                                                  start_timestamp: event.target.value,
                                                },
                                              }
                                            : item
                                        )
                                      )
                                    }
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                                  />
                                  {renderFieldMeta(`task_sets[${index}].trade_dates.start_timestamp`, getFieldHelpText("trade_dates_start_timestamp"))}
                                </label>
                                <label className="block">
                                  <span className="mb-2 block text-xs font-medium text-ink-600">trade_dates.end_timestamp</span>
                                  <input
                                    type="date"
                                    value={draft.trade_dates.end_timestamp}
                                    onChange={(event) =>
                                      setTaskSetDrafts((current) =>
                                        current.map((item) =>
                                          item.id === draft.id
                                            ? {
                                                ...item,
                                                trade_dates: {
                                                  ...item.trade_dates,
                                                  end_timestamp: event.target.value,
                                                },
                                              }
                                            : item
                                        )
                                      )
                                    }
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                                  />
                                  {renderFieldMeta(`task_sets[${index}].trade_dates.end_timestamp`, getFieldHelpText("trade_dates_end_timestamp"))}
                                </label>
                              </div>
                            )}

                            {draft.task_set_mode === "date_range_with_offsets" && (
                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <label className="block">
                                  <span className="mb-2 block text-xs font-medium text-ink-600">date_range.start_date</span>
                                  <input
                                    type="date"
                                    value={draft.date_range.start_date}
                                    onChange={(event) =>
                                      setTaskSetDrafts((current) =>
                                        current.map((item) =>
                                          item.id === draft.id
                                            ? {
                                                ...item,
                                                date_range: {
                                                  ...item.date_range,
                                                  start_date: event.target.value,
                                                },
                                              }
                                            : item
                                        )
                                      )
                                    }
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                                  />
                                  {renderFieldMeta(`task_sets[${index}].date_range.start_date`, getFieldHelpText("date_range_start_date"))}
                                </label>
                                <label className="block">
                                  <span className="mb-2 block text-xs font-medium text-ink-600">date_range.end_date</span>
                                  <input
                                    type="date"
                                    value={draft.date_range.end_date}
                                    onChange={(event) =>
                                      setTaskSetDrafts((current) =>
                                        current.map((item) =>
                                          item.id === draft.id
                                            ? {
                                                ...item,
                                                date_range: {
                                                  ...item.date_range,
                                                  end_date: event.target.value,
                                                },
                                              }
                                            : item
                                        )
                                      )
                                    }
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                                  />
                                  {renderFieldMeta(`task_sets[${index}].date_range.end_date`, getFieldHelpText("date_range_end_date"))}
                                </label>
                              </div>
                            )}

                            {(draft.task_set_mode === "offsets" ||
                              draft.task_set_mode === "trade_dates_with_offsets" ||
                              draft.task_set_mode === "date_range_with_offsets") && (
                              <div className="mt-4 grid gap-3 md:grid-cols-3">
                                <label className="block">
                                  <span className="mb-2 block text-xs font-medium text-ink-600">offset_range.start</span>
                                  <input
                                    type="number"
                                    value={draft.offset_range.start}
                                    onChange={(event) =>
                                      setTaskSetDrafts((current) =>
                                        current.map((item) =>
                                          item.id === draft.id
                                            ? {
                                                ...item,
                                                offset_range: {
                                                  ...item.offset_range,
                                                  start: event.target.value,
                                                },
                                              }
                                            : item
                                        )
                                      )
                                    }
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                                  />
                                  {renderFieldMeta(`task_sets[${index}].offset_range.start`, getFieldHelpText("offset_range_start"))}
                                </label>
                                <label className="block">
                                  <span className="mb-2 block text-xs font-medium text-ink-600">offset_range.end</span>
                                  <input
                                    type="number"
                                    value={draft.offset_range.end}
                                    onChange={(event) =>
                                      setTaskSetDrafts((current) =>
                                        current.map((item) =>
                                          item.id === draft.id
                                            ? {
                                                ...item,
                                                offset_range: {
                                                  ...item.offset_range,
                                                  end: event.target.value,
                                                },
                                              }
                                            : item
                                        )
                                      )
                                    }
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                                  />
                                  {renderFieldMeta(`task_sets[${index}].offset_range.end`, getFieldHelpText("offset_range_end"))}
                                </label>
                                <label className="block">
                                  <span className="mb-2 block text-xs font-medium text-ink-600">offset_range.step</span>
                                  <input
                                    type="number"
                                    min={1}
                                    value={draft.offset_range.step}
                                    onChange={(event) =>
                                      setTaskSetDrafts((current) =>
                                        current.map((item) =>
                                          item.id === draft.id
                                            ? {
                                                ...item,
                                                offset_range: {
                                                  ...item.offset_range,
                                                  step: event.target.value,
                                                },
                                              }
                                            : item
                                        )
                                      )
                                    }
                                    className={cn(
                                      "w-full rounded-xl border bg-white px-3 py-2 text-sm text-ink-900 focus:outline-none",
                                      fieldStatusMap.get(`task_sets[${index}].offset_range.step`)?.kind
                                        ? PARAMETER_STATUS_META[fieldStatusMap.get(`task_sets[${index}].offset_range.step`)!.kind].fieldClass
                                        : "border-gray-200 focus:border-sky-500"
                                    )}
                                  />
                                  {renderFieldMeta(`task_sets[${index}].offset_range.step`, getFieldHelpText("offset_range_step"))}
                                </label>
                              </div>
                            )}

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              {visibleFields.map((field) => (
                                <DynamicField
                                  key={field.name}
                                  field={field}
                                  value={draft.task_params[field.name] ?? ""}
                                  helperText={field.description || field.placeholder || getFieldHelpText(field.name)}
                                  statusInfo={fieldStatusMap.get(`task_sets[${index}].task_params.${field.name}`)}
                                  onChange={(value) =>
                                    setTaskSetDrafts((current) =>
                                      current.map((item) =>
                                        item.id === draft.id
                                          ? {
                                              ...item,
                                              task_params: {
                                                ...item.task_params,
                                                [field.name]: value,
                                              },
                                            }
                                          : item
                                      )
                                    )
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(editorMode === "fetch_info" || editorMode === "all") && (
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
                    <div>
                      <h4 className="text-sm font-semibold text-ink-900">基础信息抓取</h4>
                      <p className="mt-1 text-xs text-ink-500">对应 `fetch_info.fund / stock / index` 配置。</p>
                    </div>

                    <div className="mt-4 space-y-4">
                      {(["fund", "stock", "index"] as const).map((key) => {
                        const entry = fetchInfoDraft[key];
                        const catalogEntry = catalog?.fetchInfoCatalog[key];
                        return (
                          <div key={key} className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="text-sm font-semibold text-ink-900">
                                  {catalogEntry?.label ?? key}
                                </h5>
                                <p className="mt-1 text-xs text-ink-500">未启用时会以 `enabled=false` 发送。</p>
                              </div>
                              <label className="inline-flex items-center gap-2 text-sm font-medium text-ink-700">
                                <input
                                  type="checkbox"
                                  checked={entry.enabled}
                                  onChange={(event) =>
                                    setFetchInfoDraft((current) => ({
                                      ...current,
                                      [key]: {
                                        ...current[key],
                                        enabled: event.target.checked,
                                      },
                                    }))
                                  }
                                  className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                                />
                                启用
                              </label>
                            </div>
                            {renderFieldMeta(
                              `fetch_info.${key}.enabled`,
                              "关闭时会以 enabled=false 提交，后端不会为该信息源创建抓取任务。"
                            )}

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              {(catalogEntry?.paramsSchema ?? []).map((field) => (
                                <DynamicField
                                  key={field.name}
                                  field={field}
                                  value={entry.params[field.name] ?? ""}
                                  helperText={field.description || field.placeholder || getFieldHelpText(field.name)}
                                  statusInfo={fieldStatusMap.get(`fetch_info.${key}.${field.name}`)}
                                  onChange={(value) =>
                                    setFetchInfoDraft((current) => ({
                                      ...current,
                                      [key]: {
                                        ...current[key],
                                        params: {
                                          ...current[key].params,
                                          [field.name]: value,
                                        },
                                      },
                                    }))
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-ink-900">参数状态面板</h4>
                  <p className="mt-1 text-xs leading-5 text-ink-500">
                    状态完全以后端 `fetch-jobs:preview` 返回为准。这里会明确标出当前生效、必填未填、无效和非法参数。
                  </p>
                </div>
                <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-medium text-sky-700">
                  {parameterScopeCards.length} 个作用域
                </span>
              </div>

              {previewBuildResult.error ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  当前配置无法构建预览请求：{previewBuildResult.error}
                </div>
              ) : null}

              {previewErrors.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-semibold text-red-700">当前存在非法配置，提交按钮已禁用</p>
                  <div className="mt-2 space-y-1 text-xs leading-6 text-red-700">
                    {previewErrors.map((issue, index) => (
                      <p key={`${issue.path}-${index}`}>{issue.path}：{issue.message}</p>
                    ))}
                  </div>
                </div>
              ) : null}

              {previewWarnings.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm font-semibold text-amber-700">当前有参数会被忽略或按默认规则处理</p>
                  <div className="mt-2 space-y-1 text-xs leading-6 text-amber-700">
                    {previewWarnings.map((issue, index) => (
                      <p key={`${issue.path}-${index}`}>{issue.path}：{issue.message}</p>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 space-y-4">
                {parameterScopeCards.length === 0 && !previewLoading ? (
                  <div className="rounded-2xl border border-dashed border-sky-200 bg-white px-4 py-6 text-sm text-ink-400">
                    继续填写参数后，这里会显示每个作用域下哪些字段生效、缺失或被忽略。
                  </div>
                ) : null}

                {parameterScopeCards.map((card) => (
                  <div key={card.scope} className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                    <h5 className="text-sm font-semibold text-ink-900">{card.title}</h5>
                    <div className="mt-4 space-y-3">
                      {(Object.keys(card.groups) as ParameterStatusKind[]).map((kind) =>
                        card.groups[kind].length > 0 ? (
                          <div key={kind}>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">
                              {PARAMETER_STATUS_META[kind].label}
                            </p>
                            <div className="mt-2 space-y-2">
                              {card.groups[kind].map((item) => (
                                <div key={item.path} className={cn("rounded-xl px-3 py-2 text-xs leading-6", PARAMETER_STATUS_META[kind].cardClass)}>
                                  <div className="font-semibold">{item.label}：{item.value}</div>
                                  <div>{item.reason}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-ink-900">执行行为预览</h4>
                  <p className="mt-1 text-xs leading-5 text-ink-500">
                    中文说明、展开数量和叶子请求示例都以服务端 preview 结果为准，不再由浏览器本地硬编码推导。
                  </p>
                </div>
                {previewLoading ? <Loader2 size={16} className="animate-spin text-sky-600" /> : null}
              </div>

              {(previewResult?.behaviorSummary ?? []).some((block) =>
                block.scope.includes("index_quote") || block.scope.includes("index_weight")
              ) ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">重要说明：双层 offset/limit 语义</p>
                  <p className="mt-2 text-xs leading-6 text-amber-700">
                    当前任务包含 <code className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px]">index_quote</code> 或 <code className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px]">index_weight</code> 任务类型。
                    此类任务使用<strong>双层 offset/limit 机制</strong>：
                  </p>
                  <ul className="mt-2 ml-4 text-xs leading-6 text-amber-700 list-disc space-y-1">
                    <li>
                      <strong>第一层（本地指数池）</strong>：<code className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px]">offset</code> + <code className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px]">limit</code> 参数控制从本地指数池中选取哪一批指数代码
                    </li>
                    <li>
                      <strong>第二层（TuShare 分页）</strong>：<code className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px]">offset_range.start/end/step</code> 控制对每个指数向 TuShare 发送分页请求的次数和 offset 值
                    </li>
                  </ul>
                  <p className="mt-2 text-xs leading-6 text-amber-700">
                    当前后端的 <code className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px]">api_limit</code> 和 <code className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px]">api_offset</code> 字段为预留字段，暂未生效。
                  </p>
                </div>
              ) : null}

              {previewError ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  预览请求失败：{previewError}
                </div>
              ) : null}

              {previewResult?.executionPlan ? (
                <div className="mt-4 rounded-2xl border border-white bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
                      {previewResult.executionPlan.orchestrationMode ?? "SERVER_ASYNC"}
                    </span>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-700">
                      worker_threads={previewResult.executionPlan.workerThreads ?? "未返回"}
                    </span>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-700">
                      task_interval_ms={previewResult.executionPlan.taskIntervalMs ?? "未返回"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink-600">
                    {previewResult.executionPlan.note ?? "提交后由服务端继续展开、并发派发和重试，关闭页面不会中断已提交的 job。"}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 space-y-4">
                {(previewResult?.behaviorSummary ?? []).length === 0 && !previewLoading ? (
                  <div className="rounded-2xl border border-dashed border-sky-200 bg-white px-4 py-6 text-sm text-ink-400">
                    继续填写参数后，这里会出现服务端返回的中文行为说明和叶子请求样例。
                  </div>
                ) : null}

                {(previewResult?.behaviorSummary ?? []).map((block) => (
                  <div key={block.scope} className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h5 className="text-sm font-semibold text-ink-900">{block.title}</h5>
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                        预计 {block.expansionCount ?? 0} 个叶子请求
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-ink-600">{block.description}</p>
                    {(block.sampleLeafRequests?.length ?? 0) > 0 ? (
                      <div className="mt-4 space-y-2">
                        {block.sampleLeafRequests?.map((item, itemIndex) => (
                          <div key={`${block.scope}-${itemIndex}`} className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-6 text-ink-700">
                            <div className="font-semibold">{item.title}</div>
                            <div>{item.description}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <ActionButton className="w-full" onClick={handleCreateJob} disabled={!canCreateJob}>
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {creating ? "创建中..." : previewLoading ? "预览校验中..." : "创建抓取批次"}
            </ActionButton>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-ink-900">抓取批次列表</h3>
                  <p className="mt-1 text-sm text-ink-500">查看批次级状态、筛选条件与展开规模。</p>
                </div>
              </div>

              <div className="grid gap-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto_auto]">
                <select
                  value={jobStatusInput}
                  onChange={(event) => setJobStatusInput(event.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                >
                  {JOB_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={jobModeInput}
                  onChange={(event) => setJobModeInput(event.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                >
                  <option value="">全部模式</option>
                  {MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="精确批次号"
                    value={jobUuidInput}
                    onChange={(event) => setJobUuidInput(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <input
                  type="date"
                  value={jobCreatedFromInput}
                  onChange={(event) => setJobCreatedFromInput(event.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                />

                <input
                  type="date"
                  value={jobCreatedToInput}
                  onChange={(event) => setJobCreatedToInput(event.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                />

                <ActionButton variant="ghost" onClick={applyJobFilters} className="px-5">
                  <Filter size={16} />
                  查询
                </ActionButton>

                <ActionButton variant="ghost" onClick={resetJobFilters} className="px-5">
                  <X size={16} />
                  重置
                </ActionButton>
              </div>

              <div className="overflow-hidden rounded-2xl border border-sky-100">
                {jobsLoading ? (
                  <div className="flex h-40 items-center justify-center bg-white">
                    <Loader2 size={28} className="animate-spin text-sky-600" />
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="flex h-40 items-center justify-center bg-white text-sm text-ink-400">
                    暂无抓取批次
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-sky-100">
                      <thead className="bg-sky-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">状态</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">批次标签</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">模式</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">展开任务数</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">成功/失败</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">更新时间</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-sky-700">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sky-100 bg-white">
                        {jobs.map((job) => {
                          const active = selectedJobUuid === job.jobUuid;
                          const isActingOnThisJob = jobActionState?.jobUuid === job.jobUuid;
                          return (
                            <tr
                              key={job.jobUuid}
                              className={cn(
                                "cursor-pointer transition hover:bg-sky-50/70",
                                active && "bg-sky-50/80"
                              )}
                              onClick={() => {
                                setSelectedJobUuid(job.jobUuid);
                                setTasksPage(1);
                              }}
                            >
                              <td className="px-4 py-3">
                                <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", getStatusBadgeClass(job.status))}>
                                  {job.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-ink-900">{job.label || "-"}</td>
                              <td className="px-4 py-3 text-sm text-ink-600">{getModeLabel(job.mode)}</td>
                              <td className="px-4 py-3 text-sm text-ink-600">{job.expandedTaskCount}</td>
                              <td className="px-4 py-3 text-sm text-ink-600">
                                {job.successCount}/{job.failureCount}
                              </td>
                              <td className="px-4 py-3 text-sm text-ink-500">{formatDateTime(job.updatedAt)}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <ActionButton
                                    type="button"
                                    variant="ghost"
                                    className="px-3 py-1.5 text-xs"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedJobUuid(job.jobUuid);
                                      setTasksPage(1);
                                    }}
                                  >
                                    查看
                                    <ChevronRight size={14} />
                                  </ActionButton>
                                  {isCancelableJob(job.status) ? (
                                    <ActionButton
                                      type="button"
                                      variant="outline"
                                      className="px-3 py-1.5 text-xs"
                                      disabled={isActingOnThisJob}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void handleCancelJob(job);
                                      }}
                                    >
                                      {jobActionState?.jobUuid === job.jobUuid &&
                                      jobActionState.action === "cancel" ? (
                                        <Loader2 size={14} className="animate-spin" />
                                      ) : (
                                        <X size={14} />
                                      )}
                                      取消
                                    </ActionButton>
                                  ) : null}
                                  <ActionButton
                                    type="button"
                                    variant="danger"
                                    className="px-3 py-1.5 text-xs"
                                    disabled={isActingOnThisJob}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void handleDeleteJob(job);
                                    }}
                                  >
                                    {jobActionState?.jobUuid === job.jobUuid &&
                                    jobActionState.action === "delete" ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <Trash2 size={14} />
                                    )}
                                    删除
                                  </ActionButton>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-ink-500">
                <span>
                  共 {jobsTotal} 条，当前第 {Math.min(jobsPage, jobsTotalPages)}/{jobsTotalPages} 页
                </span>
                <div className="flex items-center gap-2">
                  <ActionButton
                    variant="outline"
                    className="px-3 py-1.5 text-xs"
                    disabled={jobsPage <= 1}
                    onClick={() => setJobsPage((value) => Math.max(1, value - 1))}
                  >
                    上一页
                  </ActionButton>
                  <ActionButton
                    variant="outline"
                    className="px-3 py-1.5 text-xs"
                    disabled={jobsPage >= jobsTotalPages}
                    onClick={() => setJobsPage((value) => Math.min(jobsTotalPages, value + 1))}
                  >
                    下一页
                  </ActionButton>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-ink-900">批次详情</h3>
                <p className="mt-1 text-sm text-ink-500">
                  {selectedJobUuid ? `当前批次：${selectedJobUuid}` : "请先从上方选择一个抓取批次。"}
                </p>
              </div>
              {jobDetailLoading ? <Loader2 size={18} className="animate-spin text-sky-600" /> : null}
            </div>

            {!selectedJobDetail ? (
              <div className="mt-4 rounded-2xl border border-dashed border-sky-100 bg-sky-50/40 p-6 text-sm text-ink-400">
                暂未选择批次
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", getStatusBadgeClass(selectedJobDetail.status))}>
                    {selectedJobDetail.status}
                  </span>
                  {isCancelableJob(selectedJobDetail.status) ? (
                    <ActionButton
                      variant="outline"
                      disabled={jobActionState?.jobUuid === selectedJobDetail.jobUuid}
                      onClick={() => void handleCancelJob(selectedJobDetail)}
                    >
                      {jobActionState?.jobUuid === selectedJobDetail.jobUuid &&
                      jobActionState.action === "cancel" ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <X size={16} />
                      )}
                      取消当前批次
                    </ActionButton>
                  ) : null}
                  <ActionButton
                    variant="danger"
                    disabled={jobActionState?.jobUuid === selectedJobDetail.jobUuid}
                    onClick={() => void handleDeleteJob(selectedJobDetail)}
                  >
                    {jobActionState?.jobUuid === selectedJobDetail.jobUuid &&
                    jobActionState.action === "delete" ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    删除当前批次
                  </ActionButton>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { label: "状态", value: selectedJobDetail.status },
                    { label: "模式", value: getModeLabel(selectedJobDetail.mode) },
                    { label: "展开任务数", value: selectedJobDetail.expandedTaskCount },
                    { label: "成功 / 失败", value: `${selectedJobDetail.successCount} / ${selectedJobDetail.failureCount}` },
                    {
                      label: "服务端并发度",
                      value:
                        selectedJobDetail.dispatchStats?.workerThreads ??
                        selectedJobDetail.executionOptions?.workerThreads ??
                        "-",
                    },
                    {
                      label: "派发间隔(ms)",
                      value:
                        selectedJobDetail.dispatchStats?.taskIntervalMs ??
                        selectedJobDetail.executionOptions?.taskIntervalMs ??
                        "-",
                    },
                    {
                      label: "已派发 / 待派发",
                      value: `${selectedJobDetail.dispatchStats?.dispatchedCount ?? 0} / ${
                        selectedJobDetail.dispatchStats?.pendingDispatchCount ?? 0
                      }`,
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-ink-500">{item.label}</p>
                      <p className="mt-3 text-lg font-semibold text-ink-900">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-emerald-700">执行编排说明</p>
                  <p className="mt-3 text-sm leading-6 text-emerald-900">
                    {selectedJobDetail.orchestrationNote ??
                      "当前 job 由服务端异步展开和派发。刷新、关闭或切换页面不会中断已经提交的任务。"}
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-ink-900">requestedSpec</p>
                    <pre className="max-h-72 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
                      {formatJson(selectedJobDetail.requestedSpec)}
                    </pre>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-semibold text-ink-900">normalizedSpec</p>
                    <pre className="max-h-72 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
                      {formatJson(selectedJobDetail.normalizedSpec)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-ink-900">叶子任务列表</h3>
                  <p className="mt-1 text-sm text-ink-500">仅展示当前选中批次下的叶子任务。</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ActionButton
                    variant="outline"
                    disabled={!selectedJobUuid || retryingJobFailures}
                    onClick={handleRetryJobFailures}
                  >
                    {retryingJobFailures ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                    重试当前批次失败任务
                  </ActionButton>
                  <ActionButton
                    variant="outline"
                    disabled={selectedTaskIds.length === 0 || retryingTasks}
                    onClick={handleRetrySelectedTasks}
                  >
                    {retryingTasks ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                    批量重试选中任务
                  </ActionButton>
                </div>
              </div>

              <div className="grid gap-3 xl:grid-cols-[repeat(3,minmax(0,1fr))_auto_auto]">
                <select
                  value={taskStatusInput}
                  onChange={(event) => setTaskStatusInput(event.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                >
                  {JOB_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="task_name"
                    value={taskNameInput}
                    onChange={(event) => setTaskNameInput(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <select
                  value={taskSourceKindInput}
                  onChange={(event) => setTaskSourceKindInput(event.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                >
                  {TASK_SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <ActionButton variant="ghost" onClick={applyTaskFilters} className="px-5">
                  <Filter size={16} />
                  查询
                </ActionButton>

                <ActionButton variant="ghost" onClick={resetTaskFilters} className="px-5">
                  <X size={16} />
                  重置
                </ActionButton>
              </div>

              <div className="flex items-center justify-between text-sm text-ink-500">
                <span>
                  共 {tasksTotal} 条，当前第 {Math.min(tasksPage, tasksTotalPages)}/{tasksTotalPages} 页
                </span>
                <button
                  type="button"
                  disabled={retryableTaskIds.length === 0}
                  onClick={() =>
                    setSelectedTaskIds((current) =>
                      current.length === retryableTaskIds.length ? [] : [...retryableTaskIds]
                    )
                  }
                  className="text-sky-600 hover:text-sky-700 disabled:cursor-not-allowed disabled:text-ink-300"
                >
                  {selectedTaskIds.length === retryableTaskIds.length && retryableTaskIds.length > 0
                    ? "取消全选失败任务"
                    : "全选失败任务"}
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-sky-100">
                {tasksLoading ? (
                  <div className="flex h-48 items-center justify-center bg-white">
                    <Loader2 size={28} className="animate-spin text-sky-600" />
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="flex h-48 items-center justify-center bg-white text-sm text-ink-400">
                    当前批次下暂无叶子任务
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-sky-100">
                      <thead className="bg-sky-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">选择</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">状态</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">task_name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">subtype</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">source_kind</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">task_set_mode</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">参数摘要</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">抓取条数</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">更新时间</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-sky-700">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sky-100 bg-white">
                        {tasks.map((task) => {
                          const retryable = task.status === "FAILURE";
                          const checked = selectedTaskIds.includes(task.taskUuid);
                          return (
                            <tr key={task.taskUuid} className="transition hover:bg-sky-50/60">
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={!retryable}
                                  onChange={() =>
                                    setSelectedTaskIds((current) =>
                                      current.includes(task.taskUuid)
                                        ? current.filter((item) => item !== task.taskUuid)
                                        : [...current, task.taskUuid]
                                    )
                                  }
                                  className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", getStatusBadgeClass(task.status))}>
                                  {task.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-ink-900">{task.taskName}</td>
                              <td className="px-4 py-3 text-sm text-ink-600">{task.taskSubType}</td>
                              <td className="px-4 py-3 text-sm text-ink-600">{task.sourceKind ?? "-"}</td>
                              <td className="px-4 py-3 text-sm text-ink-600">{task.taskSetMode ?? "-"}</td>
                              <td className="max-w-[360px] px-4 py-3 text-sm text-ink-600">{task.paramsSummary || "-"}</td>
                              <td className="px-4 py-3 text-sm text-ink-600">{task.fetchedItemsCount}</td>
                              <td className="px-4 py-3 text-sm text-ink-500">{formatDateTime(task.updatedAt)}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <ActionButton
                                    variant="ghost"
                                    className="px-3 py-1.5 text-xs"
                                    onClick={() => handleViewTaskDetail(task.taskUuid)}
                                  >
                                    <Eye size={14} />
                                    详情
                                  </ActionButton>
                                  {retryable ? (
                                    <ActionButton
                                      variant="ghost"
                                      className="px-3 py-1.5 text-xs"
                                      onClick={() => void handleRetryTasks([task.taskUuid])}
                                    >
                                      <RotateCcw size={14} />
                                      重试
                                    </ActionButton>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-ink-500">
                <span>已选失败任务 {selectedTaskIds.length} 个</span>
                <div className="flex items-center gap-2">
                  <ActionButton
                    variant="outline"
                    className="px-3 py-1.5 text-xs"
                    disabled={tasksPage <= 1}
                    onClick={() => setTasksPage((value) => Math.max(1, value - 1))}
                  >
                    上一页
                  </ActionButton>
                  <ActionButton
                    variant="outline"
                    className="px-3 py-1.5 text-xs"
                    disabled={tasksPage >= tasksTotalPages}
                    onClick={() => setTasksPage((value) => Math.min(tasksTotalPages, value + 1))}
                  >
                    下一页
                  </ActionButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDetailModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-sky-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-ink-900">叶子任务详情</h3>
                <p className="mt-1 text-sm text-ink-500">{selectedTask?.taskUuid ?? "加载中..."}</p>
              </div>
              <button
                type="button"
                className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50"
                onClick={() => setShowDetailModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-6 py-5">
              {detailLoading || !selectedTask ? (
                <div className="flex h-56 items-center justify-center">
                  <Loader2 size={32} className="animate-spin text-sky-600" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      { label: "状态", value: selectedTask.status },
                      { label: "task_name", value: selectedTask.taskName },
                      { label: "task_sub_type", value: selectedTask.taskSubType },
                      { label: "抓取条数", value: selectedTask.fetchedItemsCount },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-ink-500">{item.label}</p>
                        <p className="mt-3 text-base font-semibold text-ink-900">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-sky-100 bg-white p-4">
                      <h4 className="text-sm font-semibold text-ink-900">业务信息</h4>
                      <dl className="mt-4 space-y-3 text-sm text-ink-600">
                        <div className="flex justify-between gap-4">
                          <dt>jobUuid</dt>
                          <dd className="font-medium text-ink-900">{selectedTask.jobUuid ?? "-"}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt>sourceKind</dt>
                          <dd className="font-medium text-ink-900">{selectedTask.sourceKind ?? "-"}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt>sourceIndex</dt>
                          <dd className="font-medium text-ink-900">{selectedTask.sourceIndex ?? "-"}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt>taskSetMode</dt>
                          <dd className="font-medium text-ink-900">{selectedTask.taskSetMode ?? "-"}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt>创建人</dt>
                          <dd className="font-medium text-ink-900">{selectedTask.createdBy}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt>创建时间</dt>
                          <dd className="font-medium text-ink-900">{formatDateTime(selectedTask.createdAt)}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt>更新时间</dt>
                          <dd className="font-medium text-ink-900">{formatDateTime(selectedTask.updatedAt)}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt>结束时间</dt>
                          <dd className="font-medium text-ink-900">{formatDateTime(selectedTask.finishedAt)}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt>重试来源</dt>
                          <dd className="font-medium text-ink-900">{selectedTask.retryOfTaskUuid ?? "-"}</dd>
                        </div>
                        <div className="flex flex-col gap-2">
                          <dt>message</dt>
                          <dd className="rounded-xl bg-slate-50 px-3 py-2 text-ink-700">
                            {selectedTask.message ?? "-"}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-2xl border border-sky-100 bg-white p-4">
                        <h4 className="text-sm font-semibold text-ink-900">inputParams</h4>
                        <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-gray-50 p-4 text-xs text-ink-700">
                          {formatJson(selectedTask.inputParams)}
                        </pre>
                      </div>

                      <div className="rounded-2xl border border-sky-100 bg-white p-4">
                        <h4 className="text-sm font-semibold text-ink-900">dispatchPayload</h4>
                        <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-gray-50 p-4 text-xs text-ink-700">
                          {formatJson(selectedTask.dispatchPayload)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
