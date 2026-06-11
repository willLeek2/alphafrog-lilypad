/** Frontend MessagePart model — adapter output, UI-library agnostic */

export type AgentMessagePart =
  | {
      type: 'text';
      content: string;
      source?: 'message_completed' | 'workflow_completed' | 'result';
    }
  | {
      type: 'tool_call';
      id: string;
      name: string;
      arguments?: Record<string, unknown>;
      resultPreview?: string;
      status: 'pending' | 'success' | 'error';
      durationMs?: number;
      todoId?: string;
      todoSequence?: number;
      workflow?: string;
      phase?: string;
    }
  | {
      type: 'llm_progress';
      llmCallId: string;
      traceId?: string;
      model?: string;
      stage?: string;
      phase?: string;
      estimatedOutputTokens?: number;
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
      contentChars?: number;
      reasoningChars?: number;
      chunkCount?: number;
      durationMs?: number;
      status: 'running' | 'done';
      todoId?: string;
      todoSequence?: number;
      workflow?: string;
    }
  | {
      type: 'run_status';
      status: string;
      phase?: string;
      lastSeq?: number;
      terminal?: boolean;
    }
  | {
      type: 'error';
      code: string;
      message: string;
    };

export interface AgentRunViewState {
  runId: string | null;
  lastSeq: number;
  connected: boolean;
  parts: AgentMessagePart[];
}
