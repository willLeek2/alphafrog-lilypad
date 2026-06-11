import { useCallback, useRef, useState } from 'react';
import {
  getLlmCallDetail,
  getToolCallDetail,
  type SafeCallDetailResponse,
} from '../../api/agent';
import { mapAgentCallDetailToSafe } from '../utils/mapCallDetailResponse';
import type { NodeTimelineKind } from '../utils/mergeNodeTimeline';
import { sanitizeSafeCallDetailResponse } from '../utils/safeTraceDetail';

/** Step 1 safe detail APIs reviewed by codex-coder + dpsk (2026-05-30). */
export const SAFE_CALL_DETAIL_API_ENABLED = true;

/**
 * 是否在 llm call detail 请求中带 {@code includeThinking=true}。
 * 服务端在 `AgentController.llmCallDetail` 会对非 admin 用户强制降级为 false；
 * 这里默认关闭以保持 Step 1 普通用户契约（reasoning 不暴露给非 admin）。
 * 切换为 true 即可在管理/调试视图看到 thinking 内容（前提是当前用户是 admin）。
 */
export const SAFE_CALL_DETAIL_INCLUDE_THINKING = false;

interface CacheEntry {
  detail?: SafeCallDetailResponse;
  error?: string;
  loading: boolean;
}

export function useSafeCallDetail(runId: string | null) {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const [, bump] = useState(0);

  const refresh = useCallback(() => {
    bump((n) => n + 1);
  }, []);

  const load = useCallback(
    async (kind: NodeTimelineKind, callId: string) => {
      if (!runId || !callId || !SAFE_CALL_DETAIL_API_ENABLED) {
        return;
      }
      const key = `${kind}:${callId}`;
      const existing = cacheRef.current.get(key);
      if (existing?.detail || existing?.loading) {
        return;
      }
      cacheRef.current.set(key, { loading: true });
      refresh();
      try {
        const raw =
          kind === 'llm'
            ? await getLlmCallDetail(runId, callId, { includeThinking: SAFE_CALL_DETAIL_INCLUDE_THINKING })
            : await getToolCallDetail(runId, callId);
        const mapped = mapAgentCallDetailToSafe(raw);
        cacheRef.current.set(key, {
          detail: sanitizeSafeCallDetailResponse(mapped as unknown as Record<string, unknown>),
          loading: false,
        });
      } catch (e) {
        cacheRef.current.set(key, {
          loading: false,
          error: e instanceof Error ? e.message : '详情加载失败',
        });
      }
      refresh();
    },
    [runId, refresh]
  );

  const getEntry = useCallback((kind: NodeTimelineKind, callId: string): CacheEntry | undefined => {
    return cacheRef.current.get(`${kind}:${callId}`);
  }, []);

  return { load, getEntry, enabled: SAFE_CALL_DETAIL_API_ENABLED };
}
