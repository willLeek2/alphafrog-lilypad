/**
 * 预览相关工具函数
 */

import type {
  AdminFetchCatalogResponse,
  AdminFetchCatalogTask,
  AdminFetchPreviewIssue,
  AdminFetchQuickPreset,
} from "../../../../types/admin";
import type { EditorMode, ExecutionOptionsDraft, FetchInfoDraftEntry, TaskDraft, TaskSetDraft, TextPreviewBlock } from "../types";
import { getFieldHelpText } from "./helpTexts";
import { getTaskKindLabel, getTaskSetModeLabel, formatJson, toInputValue } from "./formatters";
import { summarizeTaskBehavior, describeLeafRequest } from "./taskBehavior";
import { buildTaskSpec, buildTaskSetSpec, parseNumber } from "./payload";
import { createTaskDraft, createTaskSetDraft, buildFetchInfoDraft } from "./draft";
import { compactDate, formatDateAsCompact, enumerateDates } from "./dates";
import { enumerateOffsets } from "./offsets";

export const buildTaskPreviewBlock = (draft: TaskDraft, task: AdminFetchCatalogTask | undefined, index: number): TextPreviewBlock => {
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

const computeIndexBatchCount = (draft: TaskSetDraft) => {
  const rawOffset = draft.task_params.index_offset ?? draft.task_params.offset ?? "0";
  const rawLimit = draft.task_params.index_limit ?? draft.task_params.limit ?? "5000";
  const rawCountLimit = draft.task_params.index_count_limit ?? rawLimit;
  const baseOffset = Number(rawOffset) || 0;
  const batchSize = Number(rawLimit) || 5000;
  const indexCountLimit = Number(rawCountLimit) || batchSize;
  const effectiveCount = Math.max(0, indexCountLimit - baseOffset);
  return Math.max(1, Math.ceil(effectiveCount / batchSize));
};

export const buildTaskSetPreviewBlock = (
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
  } else if (draft.task_set_mode === "index_batches") {
    const batchCount = computeIndexBatchCount(draft);
    for (let b = 0; b < batchCount; b++) {
      const offset = Number(draft.task_params.index_offset ?? draft.task_params.offset ?? "0");
      const limit = Number(draft.task_params.index_limit ?? draft.task_params.limit ?? "5000");
      requestLines.push(
        `请求 ${b + 1}：${describeLeafRequest(draft.task_name, Number(spec.task_sub_type ?? 1), {
          ...baseParams,
          index_offset: offset + b * limit,
          index_limit: limit,
        })}`
      );
    }
  } else if (draft.task_set_mode === "trade_dates_with_index_batches") {
    const dates = enumerateDates(draft.trade_dates.start_timestamp, draft.trade_dates.end_timestamp);
    const batchCount = computeIndexBatchCount(draft);
    const offset = Number(draft.task_params.index_offset ?? draft.task_params.offset ?? "0");
    const limit = Number(draft.task_params.index_limit ?? draft.task_params.limit ?? "5000");
    dates.forEach((date) => {
      for (let b = 0; b < batchCount; b++) {
        requestLines.push(
          `请求 ${requestLines.length + 1}：${describeLeafRequest(draft.task_name, Number(spec.task_sub_type ?? 1), {
            ...baseParams,
            trade_date: task?.dateStyle === "yyyyMMdd" ? formatDateAsCompact(date) : undefined,
            trade_date_timestamp: task?.dateStyle === "yyyyMMdd" ? undefined : Number(formatDateAsCompact(date)),
            index_offset: offset + b * limit,
            index_limit: limit,
          })}`
        );
      }
    });
  } else if (draft.task_set_mode === "date_range_with_index_batches") {
    const batchCount = computeIndexBatchCount(draft);
    const offset = Number(draft.task_params.index_offset ?? draft.task_params.offset ?? "0");
    const limit = Number(draft.task_params.index_limit ?? draft.task_params.limit ?? "5000");
    for (let b = 0; b < batchCount; b++) {
      requestLines.push(
        `请求 ${b + 1}：${describeLeafRequest(draft.task_name, Number(spec.task_sub_type ?? 1), {
          ...baseParams,
          start_date: compactDate(draft.date_range.start_date),
          end_date: compactDate(draft.date_range.end_date),
          index_offset: offset + b * limit,
          index_limit: limit,
        })}`
      );
    }
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

  if (
    draft.task_set_mode === "trade_dates" ||
    draft.task_set_mode === "trade_dates_with_offsets" ||
    draft.task_set_mode === "trade_dates_with_index_batches"
  ) {
    parameterLines.push(
      `trade_dates.start_timestamp：${getFieldHelpText("trade_dates_start_timestamp")}`,
      `trade_dates.end_timestamp：${getFieldHelpText("trade_dates_end_timestamp")}`
    );
  }
  if (
    draft.task_set_mode === "date_range_with_offsets" ||
    draft.task_set_mode === "date_range_with_index_batches"
  ) {
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

export const buildFetchInfoPreviewBlocks = (
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

export const applyPresetSpec = (
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

export const getScopeTitle = (scope: string) => {
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

export const addIssueMessage = (
  bucket: Map<string, { errors: string[]; warnings: string[] }>,
  issue: AdminFetchPreviewIssue,
  kind: "errors" | "warnings"
) => {
  const current = bucket.get(issue.path) ?? { errors: [], warnings: [] };
  current[kind].push(issue.message);
  bucket.set(issue.path, current);
};

export const getIssueReason = (
  path: string,
  issueMap: Map<string, { errors: string[]; warnings: string[] }>
) => {
  const entry = issueMap.get(path);
  if (!entry) return undefined;
  if (entry.errors.length > 0) return entry.errors.join("；");
  if (entry.warnings.length > 0) return entry.warnings.join("；");
  return undefined;
};
