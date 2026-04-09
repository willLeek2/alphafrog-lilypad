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
  templateKey: FetchTaskTemplateKey;
  taskName: string;
  taskSubType: number;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILURE" | string;
  fetchedItemsCount: number;
  message: string | null;
  paramsSummary: string;
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
