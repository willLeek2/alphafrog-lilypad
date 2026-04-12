import { Blocks, Braces, Database, Layers3, Workflow } from "lucide-react";
import type { EditorMode, ParameterStatusKind, AdminFetchMode, AdminFetchTaskSetMode } from "./types";

export const JOB_STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "PENDING", label: "PENDING" },
  { value: "RUNNING", label: "RUNNING" },
  { value: "CANCELLED", label: "CANCELLED" },
  { value: "SUCCESS", label: "SUCCESS" },
  { value: "FAILURE", label: "FAILURE" },
  { value: "PARTIAL_FAILURE", label: "PARTIAL_FAILURE" },
];

export const MODE_OPTIONS: Array<{ value: AdminFetchMode; label: string }> = [
  { value: "tasks", label: "普通任务" },
  { value: "task_sets", label: "任务集合" },
  { value: "fetch_info", label: "基础信息" },
  { value: "all", label: "全部组合" },
];

export const EDITOR_MODE_OPTIONS: Array<{ value: EditorMode; label: string; icon: typeof Workflow }> = [
  { value: "tasks", label: "普通任务", icon: Workflow },
  { value: "task_sets", label: "任务集合", icon: Layers3 },
  { value: "fetch_info", label: "基础信息", icon: Database },
  { value: "all", label: "全部组合", icon: Blocks },
  { value: "json", label: "高级 JSON", icon: Braces },
];

export const TASK_SOURCE_OPTIONS = [
  { value: "", label: "全部来源" },
  { value: "TASK", label: "TASK" },
  { value: "TASK_SET", label: "TASK_SET" },
  { value: "FETCH_INFO", label: "FETCH_INFO" },
];

export const TASK_SET_MODE_OPTIONS: Array<{ value: AdminFetchTaskSetMode; label: string }> = [
  { value: "trade_dates", label: "按日期展开" },
  { value: "offsets", label: "按 offset 展开" },
  { value: "trade_dates_with_offsets", label: "日期 + offset 组合" },
  { value: "date_range_with_offsets", label: "固定日期范围 + offset" },
];

export const PARAM_HELP_TEXT: Record<string, string> = {
  task_name: "选择要抓取的数据类型。不同任务名对应完全不同的 TuShare 接口和参数约束。",
  task_sub_type: "同一个 task_name 下的执行分支编号。它决定后端到底走\"按交易日\"、\"按代码+区间\"还是\"全量历史初始化\"等哪条逻辑。",
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
  offset_range_start: "task_sets 中 offset 展开的起始值。注意:对于 index_quote/index_weight 任务,这里控制的是对每个指数向 TuShare 发送分页请求的起始 offset,不是本地指数池的偏移量。",
  offset_range_end: "task_sets 中 offset 展开的结束值。注意:对于 index_quote/index_weight 任务,这里控制的是对每个指数向 TuShare 发送分页请求的结束 offset,不是本地指数池的偏移量。",
  offset_range_step: "task_sets 中 offset 展开的步长。注意:对于 index_quote/index_weight 任务,这里的步长决定对每个指数向 TuShare 分页请求的 offset 间隔,通常建议与单页 limit 保持一致。",
};

export const TASK_KIND_LABELS: Record<string, string> = {
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

export const TASK_SET_STRUCTURAL_PARAM_KEYS = new Set([
  "trade_dates.start_timestamp",
  "trade_dates.end_timestamp",
  "date_range.start_date",
  "date_range.end_date",
  "offset_range.start",
  "offset_range.end",
  "offset_range.step",
  "trade_date",
  "trade_date_timestamp",
  "start_date",
  "end_date",
  "start_date_timestamp",
  "end_date_timestamp",
  "offset_start",
  "offset_end",
  "offset_step",
]);

export const PARAMETER_STATUS_META: Record<
  ParameterStatusKind,
  { label: string; badgeClass: string; fieldClass: string; cardClass: string }
> = {
  requiredMissing: {
    label: "必填未填",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    fieldClass: "border-amber-300 bg-amber-50/40 focus:border-amber-500",
    cardClass: "bg-amber-50/70 text-amber-800",
  },
  effective: {
    label: "当前生效",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    fieldClass: "border-emerald-300 bg-emerald-50/30 focus:border-emerald-500",
    cardClass: "bg-emerald-50/70 text-emerald-800",
  },
  optionalEffectiveEmpty: {
    label: "可选生效",
    badgeClass: "border-sky-200 bg-sky-50 text-sky-700",
    fieldClass: "border-sky-300 bg-sky-50/30 focus:border-sky-500",
    cardClass: "bg-sky-50/70 text-sky-800",
  },
  ignored: {
    label: "当前无效",
    badgeClass: "border-slate-200 bg-slate-50 text-slate-600",
    fieldClass: "border-slate-200 bg-slate-50/60 text-slate-500 focus:border-slate-300",
    cardClass: "bg-slate-50/90 text-slate-700",
  },
  invalid: {
    label: "当前非法",
    badgeClass: "border-red-200 bg-red-50 text-red-700",
    fieldClass: "border-red-300 bg-red-50/40 focus:border-red-500",
    cardClass: "bg-red-50/80 text-red-800",
  },
};
