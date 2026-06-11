import { useCallback, useEffect } from 'react';
import {
  cancelRun,
  createAgentRunWithStream,
  listMessages,
  sendMessage,
  type CreateAgentRunParams,
} from '../../api/agent';
import { useAgentV2Store } from '../store/agentV2Store';

export function useAgentRun(runId: string | null) {
  const parts = useAgentV2Store((s) => s.parts);
  const execution = useAgentV2Store((s) => s.execution);
  const lastSeq = useAgentV2Store((s) => s.lastSeq);
  const connected = useAgentV2Store((s) => s.connected);
  const streamError = useAgentV2Store((s) => s.streamError);
  const connectStream = useAgentV2Store((s) => s.connectStream);
  const disconnectStream = useAgentV2Store((s) => s.disconnectStream);
  const reset = useAgentV2Store((s) => s.reset);
  const fetchResultFallback = useAgentV2Store((s) => s.fetchResultFallback);
  const repairEventGap = useAgentV2Store((s) => s.repairEventGap);
  const setUserTurns = useAgentV2Store((s) => s.setUserTurns);
  const appendUserTurn = useAgentV2Store((s) => s.appendUserTurn);
  const clearChatPartsForFollowUp = useAgentV2Store((s) => s.clearChatPartsForFollowUp);
  const setControlError = useAgentV2Store((s) => s.setControlError);

  useEffect(() => {
    if (!runId) {
      reset(null);
      return;
    }
    reset(runId);

    let cancelled = false;
    void (async () => {
      try {
        const history = await listMessages(runId, 50, 0, true);
        if (cancelled) {
          return;
        }
        const userTexts = history.items
          .filter((m) => m.role === 'user' && m.content?.trim())
          .map((m) => m.content.trim());
        if (userTexts.length > 0) {
          setUserTurns(userTexts);
        }
      } catch {
        // history is best-effort for deep-linked runs
      }
      if (!cancelled) {
        void connectStream({ runId });
      }
    })();

    return () => {
      cancelled = true;
      disconnectStream();
    };
  }, [runId, reset, connectStream, disconnectStream, setUserTurns]);

  const startRun = useCallback(
    async (params: CreateAgentRunParams) => {
      const messageText = params.message?.trim() ?? '';
      const created = await createAgentRunWithStream(params);
      reset(created.id);
      if (messageText) {
        setUserTurns([messageText]);
      }
      void connectStream({
        runId: created.id,
        streamUrl: created.streamUrl,
      });
      return created;
    },
    [reset, connectStream, setUserTurns]
  );

  const followUpRun = useCallback(
    async (params: { message: string }) => {
      if (!runId) {
        return;
      }
      const text = params.message.trim();
      if (!text) {
        return;
      }
      setControlError(null);
      const afterSeq = useAgentV2Store.getState().lastSeq;
      clearChatPartsForFollowUp();

      const response = await sendMessage(runId, text);
      if (response.status !== 'accepted') {
        throw new Error(response.rejectReason || '追问被拒绝');
      }

      void connectStream({ runId, afterSeq });
    },
    [runId, clearChatPartsForFollowUp, connectStream, setControlError]
  );

  const cancelActiveRun = useCallback(async () => {
    if (!runId) {
      return;
    }
    setControlError(null);
    await cancelRun(runId);
  }, [runId, setControlError]);

  const reconnect = useCallback(() => {
    if (!runId) {
      return;
    }
    const afterSeq = useAgentV2Store.getState().lastSeq;
    void connectStream({ runId, afterSeq });
  }, [runId, connectStream]);

  const refreshResult = useCallback(() => {
    if (!runId) {
      return;
    }
    void fetchResultFallback(runId);
  }, [runId, fetchResultFallback]);

  return {
    parts,
    execution,
    lastSeq,
    connected,
    streamError,
    startRun,
    followUpRun,
    cancelActiveRun,
    reconnect,
    refreshResult,
    repairEventGap,
  };
}
