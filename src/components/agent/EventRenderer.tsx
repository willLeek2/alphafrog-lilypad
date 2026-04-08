import type { AgentRunEvent } from './types';
import { getEventDisplayType, parsePayload } from './types';
import { UserMessage } from './UserMessage';
import { AIMessage } from './AIMessage';
import { ToolResult } from './ToolResult';
import { StatusIndicator } from './StatusIndicator';

interface EventRendererProps {
  event: AgentRunEvent;
}

export function EventRenderer({ event }: EventRendererProps) {
  const displayType = getEventDisplayType(event.eventType);
  const payload = parsePayload(event.payloadJson);
  const timestamp = new Date(event.createdAt);

  switch (displayType) {
    case 'user_message':
      // 从 RUN_RECEIVED 提取 user_goal
      const userGoal = (payload.user_goal as string) || (payload.message as string) || '';
      if (!userGoal) return null;
      return <UserMessage content={userGoal} timestamp={timestamp} />;

    case 'ai_message':
      // WORKFLOW_COMPLETED - 提取完整的 answer
      const answer = (payload.answer as string) || '';
      if (!answer) return null;
      return <AIMessage content={answer} timestamp={timestamp} isMarkdown />;

    case 'tool_result':
      // TOOL_CALL_FINISHED - 显示折叠面板
      return <ToolResult event={event} />;

    case 'status_indicator':
      // 系统事件 - 简化状态指示器
      return <StatusIndicator type={event.eventType} />;

    case 'hidden':
    default:
      // 不显示的事件
      return null;
  }
}

// 批量渲染事件列表
interface EventListProps {
  events: AgentRunEvent[];
  className?: string;
}

// 需要被后续事件覆盖的"进行中"状态事件类型
const OVERRIDABLE_EVENTS = ['TODO_STARTED', 'TODO_RETRY', 'FINAL_ANSWER_GENERATING'];

// 可以覆盖"进行中"状态的完成事件类型
const COMPLETION_EVENTS = ['TODO_FINISHED', 'WORKFLOW_COMPLETED'];

/**
 * 处理事件列表，过滤掉已被后续完成事件覆盖的"进行中"状态事件
 * 例如：如果后面有 TODO_FINISHED，则前面的 TODO_STARTED 应该被过滤掉
 */
function processEvents(events: AgentRunEvent[]): AgentRunEvent[] {
  // 首先过滤出需要显示的事件
  const visibleEvents = events.filter(e => getEventDisplayType(e.eventType) !== 'hidden');
  
  if (visibleEvents.length === 0) {
    return [];
  }

  // 按 seq 排序（确保顺序正确）
  const sortedEvents = [...visibleEvents].sort((a, b) => a.seq - b.seq);
  
  // 跟踪每个"进行中"事件是否被覆盖
  // key: eventType, value: 该类型事件是否已被覆盖
  const overriddenStatus = new Map<string, boolean>();
  
  // 倒序遍历，标记哪些"进行中"事件被覆盖了
  // 当遇到完成事件时，标记对应的"进行中"事件为已覆盖
  for (let i = sortedEvents.length - 1; i >= 0; i--) {
    const event = sortedEvents[i];
    const eventType = event.eventType;
    
    if (COMPLETION_EVENTS.includes(eventType)) {
      // 遇到完成事件，标记对应的"进行中"事件为已覆盖
      if (eventType === 'TODO_FINISHED') {
        overriddenStatus.set('TODO_STARTED', true);
        overriddenStatus.set('TODO_RETRY', true);
      } else if (eventType === 'WORKFLOW_COMPLETED') {
        overriddenStatus.set('FINAL_ANSWER_GENERATING', true);
        overriddenStatus.set('TODO_STARTED', true);
        overriddenStatus.set('TODO_RETRY', true);
      }
    }
  }
  
  // 正序遍历，过滤掉已被覆盖的"进行中"事件
  // 同时确保每个"进行中"事件只保留最新的一个（未被覆盖的）
  const result: AgentRunEvent[] = [];
  const seenOverridable = new Set<string>(); // 记录已经处理过的可覆盖事件类型
  
  for (const event of sortedEvents) {
    const eventType = event.eventType;
    
    // 如果是可覆盖的"进行中"事件
    if (OVERRIDABLE_EVENTS.includes(eventType)) {
      // 如果该类型已经被标记为覆盖，或者已经处理过一个同类型的，则跳过
      if (overriddenStatus.get(eventType) || seenOverridable.has(eventType)) {
        continue;
      }
      seenOverridable.add(eventType);
      result.push(event);
    } else {
      // 非可覆盖事件直接保留
      result.push(event);
    }
  }
  
  return result;
}

export function EventList({ events, className = '' }: EventListProps) {
  const processedEvents = processEvents(events);
  
  if (processedEvents.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {processedEvents.map((event) => (
        <EventRenderer key={`${event.runId}-${event.seq}`} event={event} />
      ))}
    </div>
  );
}

export default EventRenderer;
