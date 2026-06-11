import type { ThreadMessageLike } from '@assistant-ui/react';
import type { AgentMessagePart } from '../types/messagePart';

export interface ConvertRunState {
  runId: string | null;
  parts: AgentMessagePart[];
  /** All user turns (initial + follow-ups) for thread display */
  userTurns: string[];
  isRunning: boolean;
}

const TERMINAL_STATUSES = new Set(['COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED', 'CANCELED', 'ERROR']);

export function deriveIsRunning(parts: AgentMessagePart[], connected: boolean): boolean {
  const statusPart = parts.find((p) => p.type === 'run_status');
  if (statusPart?.type === 'run_status') {
    if (statusPart.terminal) {
      return false;
    }
    if (TERMINAL_STATUSES.has(statusPart.status.toUpperCase())) {
      return false;
    }
    const s = statusPart.status.toUpperCase();
    if (s === 'RUNNING' || s === 'IN_PROGRESS' || s === 'ACTIVE') {
      return true;
    }
  }
  return connected && !statusPart;
}

export function deriveIsTerminal(parts: AgentMessagePart[]): boolean {
  const statusPart = parts.find((p) => p.type === 'run_status');
  if (statusPart?.type === 'run_status') {
    if (statusPart.terminal) {
      return true;
    }
    return TERMINAL_STATUSES.has(statusPart.status.toUpperCase());
  }
  return false;
}

export function convertRunToThreadMessages(state: ConvertRunState): ThreadMessageLike[] {
  const messages: ThreadMessageLike[] = [];

  state.userTurns.forEach((text, idx) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    messages.push({
      role: 'user',
      content: trimmed,
      id: `user-${state.runId ?? 'new'}-${idx}`,
      metadata: { custom: {} },
    });
  });

  // Build as mutable array; will be passed to content which accepts readonly
  const assistantContent = [];

  for (const part of state.parts) {
    switch (part.type) {
      case 'text':
        assistantContent.push({ type: 'text', text: part.content });
        break;

      case 'tool_call':
        assistantContent.push({
          type: 'tool-call',
          toolCallId: part.id,
          toolName: part.name,
          args: part.arguments ?? {},
          argsText: JSON.stringify(part.arguments ?? {}),
          result: part.resultPreview,
          isError: part.status === 'error',
        });
        break;

      case 'llm_progress':
        assistantContent.push({
          type: 'data',
          name: 'llm_progress',
          data: {
            model: part.model,
            phase: part.stage ?? part.phase,
            estimatedTokens: part.estimatedOutputTokens,
            inputTokens: part.inputTokens,
            outputTokens: part.outputTokens,
            totalTokens: part.totalTokens,
            contentChars: part.contentChars,
            reasoningChars: part.reasoningChars,
            chunkCount: part.chunkCount,
            status: part.status,
            todoId: part.todoId,
          },
        });
        break;

      case 'error':
        assistantContent.push({
          type: 'text',
          text: `[Error: ${part.code}] ${part.message}`,
        });
        break;

      case 'run_status':
        break;

      default:
        break;
    }
  }

  if (assistantContent.length > 0 || state.isRunning) {
    messages.push({
      role: 'assistant',
      content: (assistantContent.length > 0 ? assistantContent : [{ type: 'text' as const, text: '…' }]) as Extract<ThreadMessageLike['content'], readonly unknown[]>,
      id: `assistant-${state.runId ?? 'new'}`,
      status: state.isRunning ? { type: 'running' } : { type: 'complete', reason: 'stop' },
      metadata: {
        unstable_state: null,
        custom: {},
      },
    });
  }

  return messages;
}
