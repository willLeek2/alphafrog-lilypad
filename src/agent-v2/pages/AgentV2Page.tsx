import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AgentV2Layout } from '../layout/AgentV2Layout';
import { AgentV2RuntimeProvider } from '../runtime/AgentV2RuntimeProvider';
import { useAgentRun } from '../hooks/useAgentRun';
import { useRunList } from '../hooks/useRunList';

export default function AgentV2Page() {
  const { runId } = useParams<{ runId?: string }>();
  const navigate = useNavigate();
  const { runs, loading: runsLoading, error: runsError, refresh: refreshRuns } = useRunList();
  const {
    lastSeq,
    connected,
    streamError,
    startRun,
    followUpRun,
    cancelActiveRun,
    reconnect,
  } = useAgentRun(runId ?? null);

  const refreshRunsSoon = useCallback(() => {
    void refreshRuns();
  }, [refreshRuns]);

  const handleStartRun = useCallback(
    async (params: { message: string }) => {
      const created = await startRun(params);
      navigate(`/app/chat/v2/${created.id}`, { replace: !runId });
      refreshRunsSoon();
      return created;
    },
    [startRun, navigate, runId, refreshRunsSoon]
  );

  const handleFollowUp = useCallback(
    async (params: { runId: string; message: string }) => {
      if (params.runId !== runId) {
        return;
      }
      await followUpRun({ message: params.message });
      refreshRunsSoon();
    },
    [followUpRun, runId, refreshRunsSoon]
  );

  const handleCancel = useCallback(
    async (id: string) => {
      if (id !== runId) {
        return;
      }
      await cancelActiveRun();
      refreshRunsSoon();
    },
    [cancelActiveRun, runId, refreshRunsSoon]
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
    <AgentV2RuntimeProvider
      runId={runId ?? null}
      onStartRun={handleStartRun}
      onFollowUp={runId ? handleFollowUp : undefined}
      onCancel={runId ? handleCancel : undefined}
    >
      <AgentV2Layout
        runId={runId ?? null}
        connected={connected}
        streamError={streamError}
        lastSeq={lastSeq}
        runs={runs}
        runsLoading={runsLoading}
        runsError={runsError}
        onRefreshRuns={refreshRunsSoon}
        onReconnect={runId ? reconnect : undefined}
      />
    </AgentV2RuntimeProvider>
    </div>
  );
}
