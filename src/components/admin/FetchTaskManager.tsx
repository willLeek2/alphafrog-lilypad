import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createFetchJob,
  getFetchCatalog,
  getFetchJobDetail,
  getFetchTaskDetail,
  listFetchJobs,
  listFetchTasksV2,
  retryFailedTasksInJob,
  retryFetchTasks,
} from "../../api/admin";
import type {
  AdminFetchCatalogParamField,
  AdminFetchCatalogResponse,
  AdminFetchCatalogTask,
  AdminFetchInfoCatalogEntry,
  AdminFetchInfoSpec,
  AdminFetchJob,
  AdminFetchJobDetail,
  AdminFetchJobSpec,
  AdminFetchJobSummary,
  AdminFetchMode,
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

interface FetchTaskManagerProps {
  token: string;
}

type EditorMode = AdminFetchMode | "json";

type TaskDraft = {
  id: string;
  task_name: string;
  task_sub_type: string;
  task_params: Record<string, string>;
};

type TaskSetDraft = TaskDraft & {
  task_set_mode: AdminFetchTaskSetMode;
  trade_dates: {
    start_timestamp: string;
    end_timestamp: string;
  };
  date_range: {
    start_date: string;
    end_date: string;
  };
  offset_range: {
    start: string;
    end: string;
    step: string;
  };
};

type FetchInfoDraftEntry = {
  enabled: boolean;
  params: Record<string, string>;
};

type TextPreviewBlock = {
  key: string;
  title: string;
  summary: string;
  requestCount: number;
  requestLines: string[];
  parameterLines: string[];
};

const EMPTY_JOB_SUMMARY: AdminFetchJobSummary = {
  queuePending: 0,
  queueConsumers: 0,
  runningJobs: 0,
  runningTasks: 0,
  successToday: 0,
  failureToday: 0,
};

const JOB_STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "PENDING", label: "PENDING" },
  { value: "RUNNING", label: "RUNNING" },
  { value: "SUCCESS", label: "SUCCESS" },
  { value: "FAILURE", label: "FAILURE" },
  { value: "PARTIAL_FAILURE", label: "PARTIAL_FAILURE" },
];

const MODE_OPTIONS: Array<{ value: AdminFetchMode; label: string }> = [
  { value: "tasks", label: "普通任务" },
  { value: "task_sets", label: "任务集合" },
  { value: "fetch_info", label: "基础信息" },
  { value: "all", label: "全部组合" },
];

const EDITOR_MODE_OPTIONS: Array<{ value: EditorMode; label: string; icon: typeof Workflow }> = [
  { value: "tasks", label: "普通任务", icon: Workflow },
  { value: "task_sets", label: "任务集合", icon: Layers3 },
  { value: "fetch_info", label: "基础信息", icon: Database },
  { value: "all", label: "全部组合", icon: Blocks },
  { value: "json", label: "高级 JSON", icon: Braces },
];

const TASK_SOURCE_OPTIONS = [
  { value: "", label: "全部来源" },
  { value: "TASK", label: "TASK" },
  { value: "TASK_SET", label: "TASK_SET" },
  { value: "FETCH_INFO", label: "FETCH_INFO" },
];

const TASK_SET_MODE_OPTIONS: Array<{ value: AdminFetchTaskSetMode; label: string }> = [
  { value: "trade_dates", label: "按日期展开" },
  { value: "offsets", label: "按 offset 展开" },
  { value: "trade_dates_with_offsets", label: "日期 + offset 组合" },
  { value: "date_range_with_offsets", label: "固定日期范围 + offset" },
];

const PARAM_HELP_TEXT: Record<string, string> = {
  task_name: "选择要抓取的数据类型。不同任务名对应完全不同的 TuShare 接口和参数约束。",
  task_sub_type: "同一个 task_name 下的执行分支编号。它决定后端到底走“按交易日”、“按代码+区间”还是“全量历史初始化”等哪条逻辑。",
  task_set_mode: "只在 task_sets 中生效。它不是后端 fetch service 的原生字段，而是先在 admin facade / ingestion_flow 里展开成多条叶子请求的规则。",
  ts_code: "TuShare 的证券或指数代码。填写后通常表示只抓指定标的，不再抓全市场。",
  trade_date: "交易日，格式通常为 YYYYMMDD。适合字符串日期类任务，例如指数估值、申万行业日线、基金份额等。",
  trade_date_timestamp: "交易日时间戳类字段。脚本和 facade 会把日期转换后再派发给后端，常见于股票日线、基金净值等老接口。",
  start_date: "开始日期，通常用于按日期范围抓取。格式一般为 YYYYMMDD。",
  end_date: "结束日期，通常用于按日期范围抓取。格式一般为 YYYYMMDD。",
  start_date_timestamp: "开始日期时间戳。主要用于旧的 timestamp 风格接口。",
  end_date_timestamp: "结束日期时间戳。主要用于旧的 timestamp 风格接口。",
  offset: "分页偏移量。值越大表示向后翻页，常与 limit 组合使用。",
  limit: "每次请求的页大小。不同接口的默认值不同，但为了可控性通常建议显式填写。",
  market: "市场过滤条件。基金相关任务中常用于区分交易市场。",
  exchange: "交易所过滤条件。ETF 份额规模任务中可按交易所收窄范围。",
  ann_date: "公告日期，常用于基金经理等按公告日过滤的接口。",
  name: "名称过滤条件。填写后只抓特定名称匹配的数据。",
  l1_code: "一级行业编码过滤条件。",
  l2_code: "二级行业编码过滤条件。",
  l3_code: "三级行业编码过滤条件。",
  is_new: "是否只看最新成分，一般不填时后端会默认使用 Y。",
  level: "行业分类层级，例如一级、二级、三级。",
  src: "行业分类标准来源。申万分类不填时后端默认使用 SW2021。",
  trade_dates_start_timestamp: "task_sets 的日期展开起点。会按自然日逐天展开。",
  trade_dates_end_timestamp: "task_sets 的日期展开终点。会按自然日逐天展开。",
  date_range_start_date: "固定日期范围的开始日期。常用于 task_sub_type=3 的历史初始化模式。",
  date_range_end_date: "固定日期范围的结束日期。常用于 task_sub_type=3 的历史初始化模式。",
  offset_range_start: "task_sets 中 offset 展开的起始值。",
  offset_range_end: "task_sets 中 offset 展开的结束值。",
  offset_range_step: "task_sets 中 offset 展开的步长。通常建议与单页 limit 保持一致。",
};

const TASK_KIND_LABELS: Record<string, string> = {
  stock_daily: "股票日线",
  index_daily_basic: "指数估值指标",
  sw_industry_daily: "申万行业日线",
  sw_industry_classify: "申万行业分类",
  sw_industry_member: "申万行业成分",
  ci_index_member: "中信行业成分",
  fund_nav: "基金净值",
  fund_manager: "基金经理",
  fund_share: "基金份额",
  etf_share_size: "ETF 份额规模",
  stock_info: "股票基础信息",
  fund_info: "基金基础信息",
  index_info: "指数基础信息",
};

const createDraftId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

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

const toDateTimeFilter = (date: string, endOfDay: boolean) => {
  if (!date) return undefined;
  const localTime = endOfDay ? `${date}T23:59:59.999` : `${date}T00:00:00.000`;
  return new Date(localTime).toISOString();
};

const compactDate = (value: string) => value.replaceAll("-", "");

const expandDate = (value: string | number | null | undefined) => {
  if (value == null) return "";
  const raw = String(value).trim();
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw;
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

const formatDisplayDate = (value: string) => {
  if (!value) return "未填写";
  return value;
};

const parseDateInput = (value: string) => {
  const normalized = expandDate(value);
  if (!normalized) return null;
  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp);
};

const formatDateAsCompact = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}${month}${day}`;
};

const formatDateAsDashed = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const enumerateDates = (startValue: string, endValue: string) => {
  const start = parseDateInput(startValue);
  const end = parseDateInput(endValue);
  if (!start || !end || start.getTime() > end.getTime()) {
    return [];
  }
  const result: Date[] = [];
  const cursor = new Date(start.getTime());
  while (cursor.getTime() <= end.getTime()) {
    result.push(new Date(cursor.getTime()));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
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
    task_sub_type: normalizeTaskSubType(source?.task_sub_type, String(catalogTask?.supportedSubTypes?.[0] ?? 1)),
    task_params: buildParamsRecord(catalogTask?.paramsSchema, catalogTask?.defaultParams, source?.task_params),
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
          : catalogTask?.supportedSubTypes?.[0] ?? 1
      )
    ),
    task_params: buildParamsRecord(catalogTask?.paramsSchema, catalogTask?.defaultParams, source?.task_params),
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
  const fieldType = field?.type?.toLowerCase();

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
  Object.entries(draft.task_params).forEach(([key, value]) => {
    const field = task?.paramsSchema?.find((item) => item.name === key);
    const parsed = serializeFieldValue(field, value, key, task);
    if (parsed !== undefined) {
      params[key] = parsed;
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
    task_sub_type: Number(
      draft.task_set_mode === "date_range_with_offsets"
        ? draft.task_sub_type || 3
        : draft.task_sub_type || task?.supportedSubTypes?.[0] || 1
    ),
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
  catalog: AdminFetchCatalogResponse | null,
  jsonSpec: string
): AdminFetchJobSpec => {
  if (mode === "json") {
    return JSON.parse(jsonSpec) as AdminFetchJobSpec;
  }

  const payload: AdminFetchJobSpec = {
    mode,
  };

  if (label.trim()) {
    payload.label = label.trim();
  }

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
  setJsonSpec(JSON.stringify(spec, null, 2));
};

const DynamicField = ({
  field,
  value,
  onChange,
  helperText,
}: {
  field: AdminFetchCatalogParamField;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
}) => {
  const lowerType = field.type.toLowerCase();

  if (lowerType === "boolean") {
    return (
      <label className="block">
        <span className="mb-2 block text-xs font-medium text-ink-600">{field.label}</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
        >
          <option value="">未设置</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
        {helperText ? <p className="mt-2 text-[11px] leading-5 text-ink-400">{helperText}</p> : null}
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
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
        >
          <option value="">请选择</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {helperText ? <p className="mt-2 text-[11px] leading-5 text-ink-400">{helperText}</p> : null}
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
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
        />
        {helperText ? <p className="mt-2 text-[11px] leading-5 text-ink-400">{helperText}</p> : null}
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
        placeholder={field.placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
      />
      {helperText ? <p className="mt-2 text-[11px] leading-5 text-ink-400">{helperText}</p> : null}
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
  const [jsonSpec, setJsonSpec] = useState("{\n  \"mode\": \"tasks\"\n}");
  const [creating, setCreating] = useState(false);
  const [retryingTasks, setRetryingTasks] = useState(false);
  const [retryingJobFailures, setRetryingJobFailures] = useState(false);

  const taskCatalogMap = useMemo(
    () =>
      new Map((catalog?.taskCatalog ?? []).map((item) => [item.taskName, item])),
    [catalog]
  );

  const textPreviewBlocks = useMemo(() => {
    if (editorMode === "json") {
      try {
        const parsed = JSON.parse(jsonSpec) as AdminFetchJobSpec;
        return [
          {
            key: "json",
            title: "高级 JSON 预览",
            summary: "当前创建方式直接使用你填写的完整 job spec。下面展示的是原始 JSON，不再做进一步语义推断。",
            requestCount: 0,
            requestLines: [formatJson(parsed)],
            parameterLines: ["高级 JSON：适合直接对齐 ingestion_flow.py 的配置语义。"],
          } satisfies TextPreviewBlock,
        ];
      } catch (error) {
        return [
          {
            key: "json-error",
            title: "高级 JSON 预览",
            summary: "当前 JSON 还不能被解析，因此无法推导实际抓取行为。",
            requestCount: 0,
            requestLines: [error instanceof Error ? error.message : "JSON 解析失败"],
            parameterLines: ["请先修正 JSON 语法，再查看行为说明。"],
          } satisfies TextPreviewBlock,
        ];
      }
    }

    const blocks: TextPreviewBlock[] = [];
    if (editorMode === "tasks" || editorMode === "all") {
      taskDrafts.forEach((draft, index) => {
        blocks.push(buildTaskPreviewBlock(draft, taskCatalogMap.get(draft.task_name), index));
      });
    }
    if (editorMode === "task_sets" || editorMode === "all") {
      taskSetDrafts.forEach((draft, index) => {
        blocks.push(buildTaskSetPreviewBlock(draft, taskCatalogMap.get(draft.task_name), index));
      });
    }
    if (editorMode === "fetch_info" || editorMode === "all") {
      blocks.push(...buildFetchInfoPreviewBlocks(fetchInfoDraft));
    }
    return blocks;
  }, [editorMode, jsonSpec, taskDrafts, taskSetDrafts, fetchInfoDraft, taskCatalogMap]);

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
              task_sub_type: String(catalogTask?.supportedSubTypes?.[0] ?? 1),
              task_params: buildParamsRecord(catalogTask?.paramsSchema, catalogTask?.defaultParams),
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
              task_sub_type: String(catalogTask?.supportedSubTypes?.[0] ?? 1),
              task_params: buildParamsRecord(catalogTask?.paramsSchema, catalogTask?.defaultParams),
              task_set_mode: catalogTask?.taskSetModes?.[0] ?? item.task_set_mode,
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
                                <p className="mt-2 text-[11px] leading-5 text-ink-400">{getFieldHelpText("task_name")}</p>
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
                                  {(catalogTask?.supportedSubTypes ?? [1]).map((subType) => (
                                    <option key={subType} value={subType}>
                                      {subType}
                                    </option>
                                  ))}
                                </select>
                                <p className="mt-2 text-[11px] leading-5 text-ink-400">{getFieldHelpText("task_sub_type")}</p>
                              </label>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              {(catalogTask?.paramsSchema ?? []).map((field) => (
                                <DynamicField
                                  key={field.name}
                                  field={field}
                                  value={draft.task_params[field.name] ?? ""}
                                  helperText={field.placeholder || getFieldHelpText(field.name)}
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
                        const availableModes = catalogTask?.taskSetModes?.length
                          ? catalogTask.taskSetModes
                          : TASK_SET_MODE_OPTIONS.map((item) => item.value);

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
                                <p className="mt-2 text-[11px] leading-5 text-ink-400">{getFieldHelpText("task_name")}</p>
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
                                <p className="mt-2 text-[11px] leading-5 text-ink-400">{getFieldHelpText("task_set_mode")}</p>
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
                                  {(catalogTask?.supportedSubTypes ?? [1, 3]).map((subType) => (
                                    <option key={subType} value={subType}>
                                      {subType}
                                    </option>
                                  ))}
                                </select>
                                <p className="mt-2 text-[11px] leading-5 text-ink-400">{getFieldHelpText("task_sub_type")}</p>
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
                                  <p className="mt-2 text-[11px] leading-5 text-ink-400">{getFieldHelpText("trade_dates_start_timestamp")}</p>
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
                                  <p className="mt-2 text-[11px] leading-5 text-ink-400">{getFieldHelpText("trade_dates_end_timestamp")}</p>
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
                                  <p className="mt-2 text-[11px] leading-5 text-ink-400">{getFieldHelpText("date_range_start_date")}</p>
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
                                  <p className="mt-2 text-[11px] leading-5 text-ink-400">{getFieldHelpText("date_range_end_date")}</p>
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
                                  <p className="mt-2 text-[11px] leading-5 text-ink-400">{getFieldHelpText("offset_range_start")}</p>
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
                                  <p className="mt-2 text-[11px] leading-5 text-ink-400">{getFieldHelpText("offset_range_end")}</p>
                                </label>
                                <label className="block">
                                  <span className="mb-2 block text-xs font-medium text-ink-600">offset_range.step</span>
                                  <input
                                    type="number"
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
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                                  />
                                  <p className="mt-2 text-[11px] leading-5 text-ink-400">{getFieldHelpText("offset_range_step")}</p>
                                </label>
                              </div>
                            )}

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              {(catalogTask?.paramsSchema ?? []).map((field) => (
                                <DynamicField
                                  key={field.name}
                                  field={field}
                                  value={draft.task_params[field.name] ?? ""}
                                  helperText={field.placeholder || getFieldHelpText(field.name)}
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

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              {(catalogEntry?.paramsSchema ?? []).map((field) => (
                                <DynamicField
                                  key={field.name}
                                  field={field}
                                  value={entry.params[field.name] ?? ""}
                                  helperText={field.placeholder || getFieldHelpText(field.name)}
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
                  <h4 className="text-sm font-semibold text-ink-900">文字说明预览</h4>
                  <p className="mt-1 text-xs leading-5 text-ink-500">
                    这里会把你当前填写的参数翻译成中文说明，尽量描述出实际会发出的抓取行为和叶子请求。
                  </p>
                </div>
                <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-medium text-sky-700">
                  {textPreviewBlocks.length} 个说明块
                </span>
              </div>

              <div className="mt-4 space-y-4">
                {textPreviewBlocks.map((block) => (
                  <div key={block.key} className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h5 className="text-sm font-semibold text-ink-900">{block.title}</h5>
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                        预计 {block.requestCount} 个叶子请求
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-ink-600">{block.summary}</p>

                    <div className="mt-4 grid gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">
                          请求行为
                        </p>
                        <div className="mt-2 space-y-2">
                          {block.requestLines.map((line, lineIndex) => (
                            <p key={`${block.key}-request-${lineIndex}`} className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-6 text-ink-700">
                              {line}
                            </p>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">
                          参数说明
                        </p>
                        <div className="mt-2 space-y-2">
                          {block.parameterLines.map((line, lineIndex) => (
                            <p key={`${block.key}-param-${lineIndex}`} className="rounded-xl bg-sky-50/60 px-3 py-2 text-xs leading-6 text-ink-600">
                              {line}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <ActionButton className="w-full" onClick={handleCreateJob} disabled={creating || catalogLoading}>
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {creating ? "创建中..." : "创建抓取批次"}
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
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 text-sm font-medium text-sky-600 hover:text-sky-700"
                                >
                                  查看
                                  <ChevronRight size={14} />
                                </button>
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
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { label: "模式", value: getModeLabel(selectedJobDetail.mode) },
                    { label: "展开任务数", value: selectedJobDetail.expandedTaskCount },
                    { label: "成功 / 失败", value: `${selectedJobDetail.successCount} / ${selectedJobDetail.failureCount}` },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-ink-500">{item.label}</p>
                      <p className="mt-3 text-lg font-semibold text-ink-900">{item.value}</p>
                    </div>
                  ))}
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
