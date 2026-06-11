import type { AgentMessagePart } from '../types/messagePart';

/** Parts attributed to a todo (tool / llm_progress with matching todoId). */
export function filterPartsByTodoId(
  parts: AgentMessagePart[],
  todoId: string | null
): AgentMessagePart[] {
  if (!todoId) {
    return [];
  }
  return parts.filter((p) => {
    if (p.type === 'tool_call' || p.type === 'llm_progress') {
      return p.todoId === todoId;
    }
    return false;
  });
}
