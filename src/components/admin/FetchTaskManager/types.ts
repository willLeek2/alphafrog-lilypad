import type {
  AdminFetchJobSummary,
  AdminFetchMode,
  AdminFetchTaskSetMode,
} from "../../api/admin";

export type { AdminFetchMode, AdminFetchTaskSetMode };

export interface FetchTaskManagerProps {
  token: string;
}

export type EditorMode = AdminFetchMode | "json";

export type TaskDraft = {
  id: string;
  task_name: string;
  task_sub_type: string;
  task_params: Record<string, string>;
};

export type TaskSetDraft = TaskDraft & {
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

export type FetchInfoDraftEntry = {
  enabled: boolean;
  params: Record<string, string>;
};

export type TextPreviewBlock = {
  key: string;
  title: string;
  summary: string;
  requestCount: number;
  requestLines: string[];
  parameterLines: string[];
};

export type ExecutionOptionsDraft = {
  worker_threads: string;
  task_interval_ms: string;
};

export type ParameterStatusKind =
  | "requiredMissing"
  | "effective"
  | "optionalEffectiveEmpty"
  | "ignored"
  | "invalid";

export type ParameterStatusItem = {
  path: string;
  label: string;
  value: string;
  reason: string;
  kind: ParameterStatusKind;
};

export type ParameterScopeCard = {
  scope: string;
  title: string;
  groups: Record<ParameterStatusKind, ParameterStatusItem[]>;
};

export type FieldStatusInfo = {
  kind: ParameterStatusKind;
  label: string;
  message: string;
};

export const EMPTY_JOB_SUMMARY: AdminFetchJobSummary = {
  queuePending: 0,
  queueConsumers: 0,
  runningJobs: 0,
  runningTasks: 0,
  successToday: 0,
  failureToday: 0,
};
