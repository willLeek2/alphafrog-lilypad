import { useEffect, useState } from 'react';
import { getRunStatus, type AgentRunStatus } from '../../api/agent';

/** Light poll for REST status when SSE plan/progress may lag (Phase 2a). */
export function useRunStatusPoll(runId: string | null, enabled: boolean, intervalMs = 4000) {
  const [status, setStatus] = useState<AgentRunStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId || !enabled) {
      setStatus(null);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const next = await getRunStatus(runId);
        if (!cancelled) {
          setStatus(next);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'status poll failed');
        }
      }
    };

    void fetchStatus();
    const timer = setInterval(() => {
      void fetchStatus();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [runId, enabled, intervalMs]);

  return { status, error };
}
