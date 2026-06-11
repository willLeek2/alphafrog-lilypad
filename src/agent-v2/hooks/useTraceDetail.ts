import { useCallback, useRef, useState } from 'react';
import { getTraceDetail, type TraceDetail } from '../../api/agent';

interface CacheEntry {
  detail?: TraceDetail;
  error?: string;
  loading: boolean;
}

/** Lazy-load trace detail on card expand (one id at a time). */
export function useTraceDetail(runId: string | null) {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const [, bump] = useState(0);

  const refresh = useCallback(() => {
    bump((n) => n + 1);
  }, []);

  const load = useCallback(
    async (traceId: string) => {
      if (!runId || !traceId) {
        return;
      }
      const existing = cacheRef.current.get(traceId);
      if (existing?.detail || existing?.loading) {
        return;
      }
      cacheRef.current.set(traceId, { loading: true });
      refresh();
      try {
        const detail = await getTraceDetail(runId, traceId);
        cacheRef.current.set(traceId, { detail, loading: false });
      } catch (e) {
        cacheRef.current.set(traceId, {
          loading: false,
          error: e instanceof Error ? e.message : '详情加载失败',
        });
      }
      refresh();
    },
    [runId, refresh]
  );

  const getEntry = useCallback((traceId: string): CacheEntry | undefined => {
    return cacheRef.current.get(traceId);
  }, []);

  return { load, getEntry };
}
