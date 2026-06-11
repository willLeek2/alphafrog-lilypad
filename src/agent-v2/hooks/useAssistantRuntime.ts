import { useCallback, useMemo } from 'react';
import {
  useExternalStoreRuntime,
  type AppendMessage,
  type AssistantRuntime,
  type ThreadMessageLike,
} from '@assistant-ui/react';
import type { CreateAgentRunParams } from '../../api/agent';
import {
  convertRunToThreadMessages,
  deriveIsRunning,
} from '../adapter/convertRunToThreadMessages';
import { useAgentV2Store } from '../store/agentV2Store';

function extractTextFromAppendMessage(message: AppendMessage): string {
  if (typeof message.content === 'string') {
    return message.content;
  }
  const textPart = message.content.find((p) => p.type === 'text');
  return textPart && 'text' in textPart ? textPart.text : '';
}

export function useAssistantRuntime(options: {
  runId: string | null;
  onStartRun: (params: CreateAgentRunParams) => Promise<{ id: string }>;
  onFollowUp?: (params: { runId: string; message: string }) => Promise<void>;
  onCancel?: (runId: string) => Promise<void>;
}): AssistantRuntime {
  const parts = useAgentV2Store((s) => s.parts);
  const userTurns = useAgentV2Store((s) => s.userTurns);
  const runId = useAgentV2Store((s) => s.runId);
  const connected = useAgentV2Store((s) => s.connected);
  const appendUserTurn = useAgentV2Store((s) => s.appendUserTurn);
  const setControlError = useAgentV2Store((s) => s.setControlError);

  const isRunning = useMemo(() => deriveIsRunning(parts, connected), [parts, connected]);
  const canFollowUp = Boolean(options.runId) && !isRunning && Boolean(options.onFollowUp);

  const onNew = useCallback(
    async (message: AppendMessage) => {
      const text = extractTextFromAppendMessage(message).trim();
      if (!text) {
        return;
      }
      setControlError(null);
      try {
        if (canFollowUp && options.runId && options.onFollowUp) {
          appendUserTurn(text);
          await options.onFollowUp({ runId: options.runId, message: text });
          return;
        }
        await options.onStartRun({ message: text });
      } catch (err) {
        setControlError(err instanceof Error ? err.message : '发送失败');
        throw err;
      }
    },
    [canFollowUp, options, appendUserTurn, setControlError]
  );

  const onCancel = useCallback(async () => {
    if (!options.runId || !options.onCancel) {
      return;
    }
    setControlError(null);
    try {
      await options.onCancel(options.runId);
    } catch (err) {
      setControlError(err instanceof Error ? err.message : '取消失败');
      throw err;
    }
  }, [options, setControlError]);

  const threadMessages = useMemo(
    () => convertRunToThreadMessages({ runId, parts, userTurns, isRunning }),
    [runId, parts, userTurns, isRunning]
  );

  const adapter = useMemo(
    () => ({
      // Must set convertMessage so assistant-ui runs fromThreadMessageLike (metadata, etc.)
      messages: threadMessages,
      convertMessage: (message: ThreadMessageLike) => message,
      isRunning,
      isSendDisabled: isRunning,
      onNew,
      onCancel: options.onCancel ? onCancel : undefined,
      adapters: {},
    }),
    [threadMessages, isRunning, onNew, onCancel, options.onCancel]
  );

  return useExternalStoreRuntime(adapter);
}
