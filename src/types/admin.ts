export type AdminUser = {
  username: string;
  token: string;
  tokenExpiresAt?: string;
};

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
