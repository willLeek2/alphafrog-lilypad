import { useEffect, useRef, useCallback } from 'react';
import { getRunEvents, getRunStatus } from '../api/agent';
import { useAgentStore } from '../store/agentStore';

const POLLING_INTERVAL = 2000; // 2 seconds

interface UseAgentPollingReturn {
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAgentPolling(runId: string | null): UseAgentPollingReturn {
  const afterSeqRef = useRef(0);
  const isTerminalRef = useRef(false);
  
  // Get store actions
  const initRun = useAgentStore((state) => state.initRun);
  const appendRunEvents = useAgentStore((state) => state.appendRunEvents);
  const setRunStatus = useAgentStore((state) => state.setRunStatus);
  const setRunPolling = useAgentStore((state) => state.setRunPolling);
  const setRunError = useAgentStore((state) => state.setRunError);
  const setCurrentRun = useAgentStore((state) => state.setCurrentRun);

  const fetchData = useCallback(async () => {
    if (!runId || isTerminalRef.current) return;

    try {
      // 1. Fetch new events
      const eventsRes = await getRunEvents(runId, afterSeqRef.current);
      if (eventsRes.items.length > 0) {
        appendRunEvents(runId, eventsRes.items);
        afterSeqRef.current = eventsRes.nextAfterSeq;
      }

      // 2. Fetch status
      const statusRes = await getRunStatus(runId);
      setRunStatus(runId, statusRes);

      // 3. Check if terminal state
      const terminalStates = ['COMPLETED', 'FAILED', 'CANCELED'];
      if (terminalStates.includes(statusRes.status)) {
        isTerminalRef.current = true;
        setRunPolling(runId, false);
      }
    } catch (err) {
      setRunError(runId, err instanceof Error ? err.message : '轮询失败');
    }
  }, [runId, appendRunEvents, setRunStatus, setRunPolling, setRunError]);

  const refetch = useCallback(async () => {
    if (!runId) return;
    
    setRunPolling(runId, true);
    try {
      // Reset to fetch all events
      afterSeqRef.current = 0;
      const eventsRes = await getRunEvents(runId, 0);
      
      // Replace all events
      const store = useAgentStore.getState();
      store.setRunEvents(runId, eventsRes.items);
      
      afterSeqRef.current = eventsRes.nextAfterSeq;
      
      const statusRes = await getRunStatus(runId);
      setRunStatus(runId, statusRes);
      
      // Check terminal state
      const terminalStates = ['COMPLETED', 'FAILED', 'CANCELED'];
      isTerminalRef.current = terminalStates.includes(statusRes.status);
      if (isTerminalRef.current) {
        setRunPolling(runId, false);
      }
    } catch (err) {
      setRunError(runId, err instanceof Error ? err.message : '刷新失败');
    }
  }, [runId, setRunStatus, setRunPolling, setRunError]);

  useEffect(() => {
    if (!runId) {
      afterSeqRef.current = 0;
      isTerminalRef.current = false;
      return;
    }

    // Initialize run in store
    initRun(runId);
    setCurrentRun(runId);
    setRunPolling(runId, true);
    
    // Initial load
    fetchData();

    // Setup polling interval
    const interval = setInterval(() => {
      if (!isTerminalRef.current) {
        fetchData();
      }
    }, POLLING_INTERVAL);

    return () => {
      clearInterval(interval);
      setRunPolling(runId, false);
    };
  }, [runId, initRun, setCurrentRun, setRunPolling, fetchData]);

  // Get loading/error state from store
  const run = useAgentStore((state) => (runId ? state.runs.get(runId) : undefined));
  
  return { 
    isLoading: run?.isPolling ?? false, 
    error: run?.error ?? null, 
    refetch 
  };
}

// Hook to get events and status for a run
export function useRunData(runId: string | null) {
  return useAgentStore((state) => {
    const run = runId ? state.runs.get(runId) : undefined;
    return {
      events: run?.events ?? [],
      status: run?.status ?? null,
    };
  });
}
