// Event 渲染组件共享类型

export interface AgentRunEvent {
  id: number;
  runId: string;
  seq: number;
  eventType: string;
  payloadJson: string;
  createdAt: string;
}

export interface ParsedPayload {
  [key: string]: unknown;
}

// Event 类型分类
export type EventDisplayType = 
  | 'user_message'      // 用户消息 (RUN_RECEIVED)
  | 'ai_message'        // AI 回复 (FINAL_ANSWER_COMPLETED)
  | 'tool_result'       // 工具结果 (TOOL_CALL_FINISHED)
  | 'status_indicator'  // 状态指示器 (其他系统事件)
  | 'hidden';           // 不显示的事件

// Event 类型映射配置
export const EVENT_TYPE_MAP: Record<string, { type: EventDisplayType; label: string }> = {
  // 用户消息
  RUN_RECEIVED: { type: 'user_message', label: '已接收请求' },
  FOLLOW_UP_RECEIVED: { type: 'user_message', label: '已接收追问' },
  
  // AI 消息 - WORKFLOW_COMPLETED/FAILED 包含完整 answer
  WORKFLOW_COMPLETED: { type: 'ai_message', label: '分析完成' },
  WORKFLOW_FAILED: { type: 'ai_message', label: '分析失败' },
  
  // 工具结果 - 显示工具调用结果
  TOOL_CALL_FINISHED: { type: 'tool_result', label: '工具调用完成' },
  SUB_AGENT_STEP_FINISHED: { type: 'tool_result', label: '步骤执行完成' },
  TODO_FINISHED: { type: 'tool_result', label: '任务完成' },
  TODO_FAILED: { type: 'tool_result', label: '任务失败' },
  SUB_AGENT_FINISHED: { type: 'tool_result', label: '子任务完成' },
  SUB_AGENT_FAILED: { type: 'tool_result', label: '子任务失败' },
  
  // 状态指示器（简化显示）- 只显示关键状态
  PLANNING_STARTED: { type: 'status_indicator', label: '正在规划...' },
  PLANNING_COMPLETED: { type: 'status_indicator', label: '规划完成' },
  PAUSED: { type: 'status_indicator', label: '已暂停' },
  WORKFLOW_RESUMED: { type: 'status_indicator', label: '已恢复执行' },
  
  // 隐藏的事件 - 中间过程不显示
  EXECUTION_STARTED: { type: 'hidden', label: '开始执行' },
  TODO_STARTED: { type: 'hidden', label: '执行任务' },
  TODO_RETRY: { type: 'hidden', label: '正在重试' },
  FINAL_ANSWER_GENERATING: { type: 'hidden', label: '生成答案中...' },
  FINAL_ANSWER_COMPLETED: { type: 'hidden', label: '答案已生成' },
  TOOL_CALL_STARTED: { type: 'hidden', label: '工具调用开始' },
  TODO_RECOVERY_STARTED: { type: 'hidden', label: '恢复开始' },
  TODO_RECOVERY_FINISHED: { type: 'hidden', label: '恢复完成' },
  TODO_LIST_CREATED: { type: 'hidden', label: '计划已创建' },
  SUB_AGENT_STARTED: { type: 'hidden', label: '子任务开始' },
  SUB_AGENT_PLAN_CREATED: { type: 'hidden', label: '子计划已创建' },
  SUB_AGENT_STEP_STARTED: { type: 'hidden', label: '步骤开始' },
};

// 解析 payloadJson
export function parsePayload(payloadJson: string): ParsedPayload {
  try {
    return JSON.parse(payloadJson || '{}');
  } catch {
    return {};
  }
}

// 获取 event 的显示类型
export function getEventDisplayType(eventType: string): EventDisplayType {
  return EVENT_TYPE_MAP[eventType]?.type || 'hidden';
}

// 获取 event 的标签
export function getEventLabel(eventType: string): string {
  return EVENT_TYPE_MAP[eventType]?.label || eventType;
}
