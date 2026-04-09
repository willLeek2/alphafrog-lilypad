import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createFetchTask,
  getFetchTaskDetail,
  listFetchTasks,
  retryFetchTasks,
} from "../../api/admin";
import type {
  AdminFetchTask,
  AdminFetchTaskDetail,
  AdminFetchTaskSummary,
  FetchTaskTemplateKey,
} from "../../types/admin";
import ActionButton from "../ActionButton";
import { cn } from "../../utils/classNames";
import {
  Calendar,
  Database,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Users,
  X,
} from "lucide-react";

interface FetchTaskManagerProps {
  token: string;
}

type FetchTaskFormState = {
  templateKey: FetchTaskTemplateKey;
  startDate: string;
  endDate: string;
  offset: string;
  limit: string;
};

const TEMPLATE_OPTIONS: Array<{ value: FetchTaskTemplateKey; label: string; singleDate?: boolean }> = [
  { value: "stock_quote_range", label: "股票日线区间抓取" },
  { value: "index_quote_trade_date", label: "指数单日行情抓取", singleDate: true },
  { value: "index_quote_range", label: "指数区间行情抓取" },
  { value: "index_weight_range", label: "指数成分权重抓取" },
  { value: "fund_portfolio_range", label: "基金持仓区间抓取" },
  { value: "trade_calendar_range", label: "交易日历区间抓取" },
];

const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "PENDING", label: "PENDING" },
  { value: "RUNNING", label: "RUNNING" },
  { value: "SUCCESS", label: "SUCCESS" },
  { value: "FAILURE", label: "FAILURE" },
];

const DEFAULT_FORM_TEMPLATE: FetchTaskFormState = {
  templateKey: "stock_quote_range",
  startDate: "",
  endDate: "",
  offset: "0",
  limit: "10",
};

const EMPTY_SUMMARY: AdminFetchTaskSummary = {
  queuePending: 0,
  queueConsumers: 0,
  runningCount: 0,
  successToday: 0,
  failureToday: 0,
};

const getTemplateLabel = (templateKey: FetchTaskTemplateKey) =>
  TEMPLATE_OPTIONS.find((item) => item.value === templateKey)?.label ?? templateKey;

const isSingleDateTemplate = (templateKey: FetchTaskTemplateKey) =>
  TEMPLATE_OPTIONS.find((item) => item.value === templateKey)?.singleDate ?? false;

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
    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
};

const formatDateTime = (value: string | null) => {
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

const buildDefaultForm = (templateKey: FetchTaskTemplateKey): FetchTaskFormState => ({
  templateKey,
  startDate: "",
  endDate: "",
  offset: "0",
  limit: "10",
});

export const FetchTaskManager = ({ token }: FetchTaskManagerProps) => {
  const [tasks, setTasks] = useState<AdminFetchTask[]>([]);
  const [summary, setSummary] = useState<AdminFetchTaskSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const [statusInput, setStatusInput] = useState("");
  const [templateInput, setTemplateInput] = useState<FetchTaskTemplateKey | "">("");
  const [taskUuidInput, setTaskUuidInput] = useState("");
  const [createdFromInput, setCreatedFromInput] = useState("");
  const [createdToInput, setCreatedToInput] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [templateFilter, setTemplateFilter] = useState<FetchTaskTemplateKey | "">("");
  const [taskUuidFilter, setTaskUuidFilter] = useState("");
  const [createdFromFilter, setCreatedFromFilter] = useState("");
  const [createdToFilter, setCreatedToFilter] = useState("");

  const [form, setForm] = useState<FetchTaskFormState>(DEFAULT_FORM_TEMPLATE);
  const [creating, setCreating] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [retrying, setRetrying] = useState(false);

  const [selectedTask, setSelectedTask] = useState<AdminFetchTaskDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [highlightedTaskUuid, setHighlightedTaskUuid] = useState<string | null>(null);

  const retryableIds = useMemo(
    () => tasks.filter((task) => task.status === "FAILURE").map((task) => task.taskUuid),
    [tasks]
  );

  const selectedRetryableCount = selectedTaskIds.filter((taskUuid) => retryableIds.includes(taskUuid)).length;

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listFetchTasks(token, {
        status: statusFilter || undefined,
        templateKey: templateFilter || undefined,
        taskUuid: taskUuidFilter || undefined,
        createdFrom: toDateTimeFilter(createdFromFilter, false),
        createdTo: toDateTimeFilter(createdToFilter, true),
        page,
        pageSize,
      });
      setTasks(response.items ?? []);
      setSummary(response.summary ?? EMPTY_SUMMARY);
      setTotal(response.total ?? 0);
    } catch (error) {
      console.error("加载抓取任务失败", error);
      alert(error instanceof Error ? `加载抓取任务失败：${error.message}` : "加载抓取任务失败");
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, templateFilter, taskUuidFilter, createdFromFilter, createdToFilter, page, pageSize]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, reloadKey]);

  useEffect(() => {
    setSelectedTaskIds((current) => current.filter((taskUuid) => retryableIds.includes(taskUuid)));
  }, [retryableIds]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleApplyFilters = () => {
    setStatusFilter(statusInput);
    setTemplateFilter(templateInput);
    setTaskUuidFilter(taskUuidInput.trim());
    setCreatedFromFilter(createdFromInput);
    setCreatedToFilter(createdToInput);
    setPage(1);
    setReloadKey((value) => value + 1);
  };

  const handleResetFilters = () => {
    setStatusInput("");
    setTemplateInput("");
    setTaskUuidInput("");
    setCreatedFromInput("");
    setCreatedToInput("");
    setStatusFilter("");
    setTemplateFilter("");
    setTaskUuidFilter("");
    setCreatedFromFilter("");
    setCreatedToFilter("");
    setPage(1);
    setReloadKey((value) => value + 1);
  };

  const handleFormChange = <K extends keyof FetchTaskFormState>(key: K, value: FetchTaskFormState[K]) => {
    setForm((current) => {
      if (key === "templateKey") {
        return buildDefaultForm(value as FetchTaskTemplateKey);
      }
      return {
        ...current,
        [key]: value,
      };
    });
  };

  const handleCreateTask = async () => {
    const singleDate = isSingleDateTemplate(form.templateKey);
    const startDate = form.startDate.trim();
    const endDate = singleDate ? startDate : form.endDate.trim();

    if (!startDate) {
      alert(singleDate ? "请选择交易日" : "请选择开始日期");
      return;
    }
    if (!singleDate && !endDate) {
      alert("请选择结束日期");
      return;
    }

    const offset = Number(form.offset);
    const limit = Number(form.limit);
    if (!Number.isInteger(offset) || offset < 0) {
      alert("offset 必须是大于等于 0 的整数");
      return;
    }
    if (!Number.isInteger(limit) || limit <= 0) {
      alert("limit 必须是大于 0 的整数");
      return;
    }

    setCreating(true);
    try {
      const response = await createFetchTask(token, {
        templateKey: form.templateKey,
        params: {
          startDate,
          endDate,
          offset,
          limit,
        },
      });
      setHighlightedTaskUuid(response.task.taskUuid);
      setForm(buildDefaultForm(form.templateKey));
      setPage(1);
      setReloadKey((value) => value + 1);
      alert(`任务已创建：${response.task.taskUuid}`);
    } catch (error) {
      console.error("创建抓取任务失败", error);
      alert(error instanceof Error ? `创建失败：${error.message}` : "创建抓取任务失败");
    } finally {
      setCreating(false);
    }
  };

  const handleViewDetail = async (taskUuid: string) => {
    setShowDetailModal(true);
    setDetailLoading(true);
    setSelectedTask(null);
    try {
      const response = await getFetchTaskDetail(token, taskUuid);
      setSelectedTask(response);
    } catch (error) {
      console.error("加载任务详情失败", error);
      alert(error instanceof Error ? `加载详情失败：${error.message}` : "加载任务详情失败");
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRetry = async (taskUuids: string[]) => {
    if (taskUuids.length === 0) {
      alert("请先选择失败任务");
      return;
    }
    if (!window.confirm(`确定要重试 ${taskUuids.length} 个任务吗？`)) {
      return;
    }

    setRetrying(true);
    try {
      const response = await retryFetchTasks(token, taskUuids);
      const successCount = response.results.filter((item) => item.success).length;
      const failureItems = response.results.filter((item) => !item.success);
      const failureSummary = failureItems
        .slice(0, 3)
        .map((item) => `${item.sourceTaskUuid}: ${item.message}`)
        .join("\n");

      setSelectedTaskIds([]);
      setPage(1);
      setReloadKey((value) => value + 1);

      const summaryLines = [
        `重试完成：成功 ${successCount} 个，失败 ${failureItems.length} 个。`,
      ];
      if (failureSummary) {
        summaryLines.push("", failureSummary);
      }
      alert(summaryLines.join("\n"));
    } catch (error) {
      console.error("重试抓取任务失败", error);
      alert(error instanceof Error ? `重试失败：${error.message}` : "重试抓取任务失败");
    } finally {
      setRetrying(false);
    }
  };

  const toggleSelectTask = (taskUuid: string) => {
    setSelectedTaskIds((current) =>
      current.includes(taskUuid)
        ? current.filter((item) => item !== taskUuid)
        : [...current, taskUuid]
    );
  };

  const toggleSelectAllRetryable = () => {
    setSelectedTaskIds((current) =>
      current.length === retryableIds.length ? [] : [...retryableIds]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink-900">数据爬取任务管理</h2>
          <p className="mt-1 text-sm text-ink-500">创建抓取任务、查看状态、查看详情并对失败任务重试。</p>
        </div>
        <ActionButton
          variant="ghost"
          className="flex items-center gap-2"
          onClick={() => setReloadKey((value) => value + 1)}
        >
          <RefreshCw size={16} />
          刷新
        </ActionButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "队列待处理", value: summary.queuePending, icon: Database, tone: "amber" },
          { label: "消费者数", value: summary.queueConsumers, icon: Users, tone: "sky" },
          { label: "运行中", value: summary.runningCount, icon: RefreshCw, tone: "blue" },
          { label: "今日成功", value: summary.successToday, icon: Calendar, tone: "green" },
          { label: "今日失败", value: summary.failureToday, icon: X, tone: "red" },
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
              <p className="mt-4 text-3xl font-semibold text-ink-900">{item.value?.toLocaleString?.() ?? item.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-ink-900">创建任务</h3>
              <p className="mt-1 text-sm text-ink-500">v1 仅开放后端 admin facade 已支持的 6 种模板。</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink-700">任务模板</span>
              <select
                value={form.templateKey}
                onChange={(event) => handleFormChange("templateKey", event.target.value as FetchTaskTemplateKey)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
              >
                {TEMPLATE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink-700">
                {isSingleDateTemplate(form.templateKey) ? "交易日" : "开始日期"}
              </span>
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => handleFormChange("startDate", event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
              />
            </label>

            {!isSingleDateTemplate(form.templateKey) && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink-700">结束日期</span>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(event) => handleFormChange("endDate", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                />
              </label>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink-700">offset</span>
                <input
                  type="number"
                  min="0"
                  value={form.offset}
                  onChange={(event) => handleFormChange("offset", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink-700">limit</span>
                <input
                  type="number"
                  min="1"
                  value={form.limit}
                  onChange={(event) => handleFormChange("limit", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                />
              </label>
            </div>

            <ActionButton
              className="w-full"
              onClick={handleCreateTask}
              disabled={creating}
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : null}
              {creating ? "创建中..." : "创建抓取任务"}
            </ActionButton>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-ink-900">任务列表</h3>
                <p className="mt-1 text-sm text-ink-500">支持状态、模板、任务号与创建时间筛选。</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ActionButton
                  variant="outline"
                  disabled={selectedRetryableCount === 0 || retrying}
                  onClick={() => handleRetry(selectedTaskIds)}
                >
                  {retrying ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                  批量重试
                </ActionButton>
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto_auto]">
              <select
                value={statusInput}
                onChange={(event) => setStatusInput(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={templateInput}
                onChange={(event) => setTemplateInput(event.target.value as FetchTaskTemplateKey | "")}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
              >
                <option value="">全部模板</option>
                {TEMPLATE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="精确任务号"
                  value={taskUuidInput}
                  onChange={(event) => setTaskUuidInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleApplyFilters();
                    }
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <input
                type="date"
                value={createdFromInput}
                onChange={(event) => setCreatedFromInput(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
              />

              <input
                type="date"
                value={createdToInput}
                onChange={(event) => setCreatedToInput(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink-900 focus:border-sky-500 focus:outline-none"
              />

              <ActionButton variant="ghost" onClick={handleApplyFilters} className="px-5">
                <Filter size={16} />
                查询
              </ActionButton>

              <ActionButton variant="ghost" onClick={handleResetFilters} className="px-5">
                <X size={16} />
                重置
              </ActionButton>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-500">
              <div>
                共 {total} 条，当前第 {Math.min(page, totalPages)}/{totalPages} 页
              </div>
              <button
                type="button"
                disabled={retryableIds.length === 0}
                onClick={toggleSelectAllRetryable}
                className="text-sky-600 hover:text-sky-700 disabled:cursor-not-allowed disabled:text-ink-300"
              >
                {selectedRetryableCount === retryableIds.length && retryableIds.length > 0 ? "取消全选失败任务" : "全选失败任务"}
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-sky-100">
              {loading ? (
                <div className="flex h-64 items-center justify-center bg-white">
                  <Loader2 size={32} className="animate-spin text-sky-600" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="flex h-48 items-center justify-center bg-white text-sm text-ink-400">暂无抓取任务</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-sky-100">
                    <thead className="bg-sky-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">选择</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">状态</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">模板类型</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">参数摘要</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">抓取条数</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">创建人</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">更新时间</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">结束时间</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-sky-700">重试来源</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-sky-700">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100 bg-white">
                      {tasks.map((task) => {
                        const retryable = task.status === "FAILURE";
                        const checked = selectedTaskIds.includes(task.taskUuid);

                        return (
                          <tr
                            key={task.taskUuid}
                            className={cn(
                              "transition-colors hover:bg-sky-50/40",
                              highlightedTaskUuid === task.taskUuid && "bg-amber-50/60"
                            )}
                          >
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!retryable}
                                onChange={() => toggleSelectTask(task.taskUuid)}
                                className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", getStatusBadgeClass(task.status))}>
                                {task.status}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm font-medium text-ink-900">{getTemplateLabel(task.templateKey)}</div>
                              <div className="mt-1 text-xs text-ink-400">
                                {task.taskName} / subtype {task.taskSubType}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-ink-600">{task.paramsSummary || "-"}</td>
                            <td className="px-4 py-4 text-sm font-medium text-ink-900">{task.fetchedItemsCount ?? 0}</td>
                            <td className="px-4 py-4 text-sm text-ink-600">{task.createdBy || "-"}</td>
                            <td className="px-4 py-4 text-sm text-ink-500">{formatDateTime(task.updatedAt)}</td>
                            <td className="px-4 py-4 text-sm text-ink-500">{formatDateTime(task.finishedAt)}</td>
                            <td className="px-4 py-4 text-sm text-ink-500">
                              {task.retryOfTaskUuid ? (
                                <span className="font-mono text-xs">{task.retryOfTaskUuid}</span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleViewDetail(task.taskUuid)}
                                  className="rounded-lg p-1.5 text-sky-600 transition hover:bg-sky-50"
                                  title="查看详情"
                                >
                                  <Eye size={16} />
                                </button>
                                {retryable && (
                                  <button
                                    type="button"
                                    onClick={() => handleRetry([task.taskUuid])}
                                    className="rounded-lg p-1.5 text-amber-600 transition hover:bg-amber-50"
                                    title="重试任务"
                                  >
                                    <RotateCcw size={16} />
                                  </button>
                                )}
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-ink-500">
                  共 {total} 条，第 {Math.min(page, totalPages)}/{totalPages} 页
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-ink-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-ink-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-ink-900">抓取任务详情</h3>
                <p className="mt-1 text-sm text-ink-500">
                  {selectedTask ? selectedTask.taskUuid : "加载中..."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {detailLoading || !selectedTask ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 size={32} className="animate-spin text-sky-600" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-500">状态</p>
                      <span className={cn("mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", getStatusBadgeClass(selectedTask.status))}>
                        {selectedTask.status}
                      </span>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-500">模板</p>
                      <p className="mt-2 text-sm font-medium text-ink-900">{getTemplateLabel(selectedTask.templateKey)}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-500">抓取条数</p>
                      <p className="mt-2 text-sm font-medium text-ink-900">{selectedTask.fetchedItemsCount ?? 0}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-500">创建人</p>
                      <p className="mt-2 text-sm font-medium text-ink-900">{selectedTask.createdBy || "-"}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-4">
                      <h4 className="text-sm font-semibold text-ink-900">业务信息</h4>
                      <dl className="mt-4 space-y-3 text-sm">
                        <div>
                          <dt className="text-ink-500">任务号</dt>
                          <dd className="mt-1 break-all font-mono text-ink-900">{selectedTask.taskUuid}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-500">参数摘要</dt>
                          <dd className="mt-1 text-ink-900">{selectedTask.paramsSummary || "-"}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-500">消息</dt>
                          <dd className="mt-1 whitespace-pre-wrap text-ink-900">{selectedTask.message || "-"}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-500">创建时间</dt>
                          <dd className="mt-1 text-ink-900">{formatDateTime(selectedTask.createdAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-500">更新时间</dt>
                          <dd className="mt-1 text-ink-900">{formatDateTime(selectedTask.updatedAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-500">结束时间</dt>
                          <dd className="mt-1 text-ink-900">{formatDateTime(selectedTask.finishedAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-500">重试来源</dt>
                          <dd className="mt-1 break-all font-mono text-ink-900">{selectedTask.retryOfTaskUuid || "-"}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="rounded-xl border border-sky-100 bg-white p-4">
                      <h4 className="text-sm font-semibold text-ink-900">技术信息</h4>
                      <div className="mt-4 space-y-4">
                        <div>
                          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-ink-500">inputParams</p>
                          <pre className="max-h-64 overflow-auto rounded-xl bg-gray-50 p-4 text-xs text-ink-700">
                            {formatJson(selectedTask.inputParams)}
                          </pre>
                        </div>
                        <div>
                          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-ink-500">dispatchPayload</p>
                          <pre className="max-h-64 overflow-auto rounded-xl bg-gray-50 p-4 text-xs text-ink-700">
                            {formatJson(selectedTask.dispatchPayload)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-6 py-4">
              <ActionButton onClick={() => setShowDetailModal(false)}>关闭</ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
