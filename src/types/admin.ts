export type AdminUser = {
  username: string;
  token: string;
  tokenExpiresAt?: string;
};

export type FetchTaskTemplateKey =
  | "stock_quote_range"
  | "index_quote_trade_date"
  | "index_quote_range"
  | "index_weight_range"
  | "fund_portfolio_range"
  | "trade_calendar_range";

export type FetchQuickPresetKey = FetchTaskTemplateKey;

export type AdminOverall = {
  fundCount: number;
  indexCount: number;
  stockCount: number;
  fundNavCount: number;
  indexDailyCount: number;
  stockDailyCount: number;
};

// Agent 运行监控
export type AdminAgentRun = {
  runId: string;
  userId: string;
  username: string;
  status: string;
  message: string;
  currentStep: number;
  maxSteps: number;
  startedAt: string;
  updatedAt: string;
  completedAt: string;
  durationMs: number;
  totalTokens: number;
  toolCalls: number;
  hasArtifacts: boolean;
};

export type AdminAgentRunDetail = {
  run: AdminAgentRun;
  planJson: string;
  snapshotJson: string;
  lastError: string;
};

// 系统配置
export type SystemConfigItem = {
  key: string;
  value: string;
  description: string;
  category: string;
  editable: boolean;
};

// 额度流水
export type CreditLedgerEntry = {
  ledgerId: string;
  userId: string;
  bizType: string;
  delta: number;
  balanceBefore: number;
  balanceAfter: number;
  sourceType: string;
  sourceId: string;
  operatorId: string;
  idempotencyKey: string;
  ext: string;
  createdAt: string;
};

// 用户管理增强
export type AdminUserDetail = {
  userId: string;
  username: string;
  email: string;
  credit: number;
  registerTime: number;
  status: string;
  disabledAt: string;
  disabledReason: string;
};

export type AdminFetchTask = {
  taskUuid: string;
  templateKey?: string | null;
  jobUuid?: string | null;
  taskName: string;
  taskSubType: number;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILURE" | string;
  fetchedItemsCount: number;
  message: string | null;
  paramsSummary: string;
  sourceKind?: "TASK" | "TASK_SET" | "FETCH_INFO" | string | null;
  sourceIndex?: number | null;
  taskSetMode?: AdminFetchTaskSetMode | string | null;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
  finishedAt: string | null;
  retryOfTaskUuid: string | null;
};

export type AdminFetchTaskDetail = AdminFetchTask & {
  inputParams: unknown;
  dispatchPayload: unknown;
};

export type AdminFetchTaskSummary = {
  queuePending: number;
  queueConsumers: number;
  runningCount: number;
  successToday: number;
  failureToday: number;
};

export type AdminFetchMode = "tasks" | "task_sets" | "fetch_info" | "all";

export type AdminFetchTaskSetMode =
  | "trade_dates"
  | "offsets"
  | "trade_dates_with_offsets"
  | "date_range_with_offsets";

export type AdminFetchCatalogParamField = {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  options?: Array<{
    label: string;
    value: string;
  }>;
};

export type AdminFetchCatalogTask = {
  taskName: string;
  label: string;
  supportedSubTypes: number[];
  taskSetModes?: AdminFetchTaskSetMode[];
  dateStyle?: "timestamp" | "yyyyMMdd" | string;
  acceptsEmptyTaskParams?: boolean;
  paramsSchema?: AdminFetchCatalogParamField[];
  defaultParams?: Record<string, unknown>;
};

export type AdminFetchInfoCatalogEntry = {
  label: string;
  paramsSchema?: AdminFetchCatalogParamField[];
  defaultParams?: Record<string, unknown>;
};

export type AdminFetchTaskSpec = {
  task_name: string;
  task_sub_type?: number;
  task_params?: Record<string, unknown>;
  [key: string]: unknown;
};

export type AdminFetchTaskSetSpec = AdminFetchTaskSpec & {
  task_set_mode?: AdminFetchTaskSetMode | string;
  expand_mode?: string;
  trade_dates?: Record<string, unknown>;
  date_range?: Record<string, unknown>;
  offset_range?: Record<string, unknown>;
  offset_start?: number | string;
  offset_end?: number | string;
  offset_step?: number | string;
};

export type AdminFetchInfoTargetSpec = {
  enabled?: boolean;
  [key: string]: unknown;
};

export type AdminFetchInfoSpec = {
  fund?: AdminFetchInfoTargetSpec;
  stock?: AdminFetchInfoTargetSpec;
  index?: AdminFetchInfoTargetSpec;
};

export type AdminFetchJobSpec = {
  mode: AdminFetchMode;
  label?: string;
  tasks?: AdminFetchTaskSpec[];
  task_sets?: AdminFetchTaskSetSpec[];
  fetch_info?: AdminFetchInfoSpec;
};

export type AdminFetchQuickPreset = {
  key: FetchQuickPresetKey | string;
  label: string;
  description?: string;
  spec?: AdminFetchJobSpec;
};

export type AdminFetchCatalogResponse = {
  taskCatalog: AdminFetchCatalogTask[];
  fetchInfoCatalog: {
    fund?: AdminFetchInfoCatalogEntry;
    stock?: AdminFetchInfoCatalogEntry;
    index?: AdminFetchInfoCatalogEntry;
  };
  quickPresets: AdminFetchQuickPreset[];
};

export type AdminFetchJob = {
  jobUuid: string;
  label: string | null;
  mode: AdminFetchMode | string;
  status: string;
  expandedTaskCount: number;
  pendingCount: number;
  runningCount: number;
  successCount: number;
  failureCount: number;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
  finishedAt: string | null;
};

export type AdminFetchJobDetail = AdminFetchJob & {
  requestedSpec: unknown;
  normalizedSpec: unknown;
  expansionSummary?: unknown;
  itemsPreview?: AdminFetchTask[];
};

export type AdminFetchJobSummary = {
  queuePending: number;
  queueConsumers: number;
  runningJobs: number;
  runningTasks: number;
  successToday: number;
  failureToday: number;
};
