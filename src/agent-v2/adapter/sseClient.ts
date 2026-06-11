import { getApiBaseUrl } from '../../utils/api';
import { loadAuth } from '../../utils/storage';
import type { RawSseFrame } from '../types/sse';
import { parseSseFrame, parseSseStream } from './parseSseStream';

export interface AgentSseClientOptions {
  runId: string;
  streamUrl?: string;
  afterSeq?: number;
  signal?: AbortSignal;
  onFrame: (frame: RawSseFrame) => void;
  onConnected?: () => void;
  onDisconnected?: (reason: string) => void;
}

/**
 * In dev, Vite proxies `/api/*` — strip absolute backend host from streamUrl when safe.
 * Non-dev (or non-/api paths) keep the original URL.
 */
export function normalizeAgentStreamUrl(streamUrl: string, apiBase: string): string {
  if (!streamUrl.startsWith('http')) {
    return `${apiBase}${streamUrl.startsWith('/') ? '' : '/'}${streamUrl}`;
  }
  if (import.meta.env.DEV) {
    try {
      const parsed = new URL(streamUrl);
      if (parsed.pathname.startsWith('/api/')) {
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return streamUrl;
    }
  }
  return streamUrl;
}

function resolveStreamUrl(runId: string, streamUrl?: string, afterSeq?: number): string {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const path =
    streamUrl && streamUrl.length > 0
      ? normalizeAgentStreamUrl(streamUrl, base)
      : `${base}/api/agent/runs/${runId}/stream`;
  if (afterSeq != null && afterSeq > 0) {
    const sep = path.includes('?') ? '&' : '?';
    return `${path}${sep}after_seq=${afterSeq}`;
  }
  return path;
}

/** Fetch-based SSE client — Bearer auth works (EventSource cannot set Authorization). */
export async function connectAgentSse(options: AgentSseClientOptions): Promise<void> {
  const auth = loadAuth();
  const url = resolveStreamUrl(options.runId, options.streamUrl, options.afterSeq);
  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
  };
  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }
  if (options.afterSeq != null && options.afterSeq > 0) {
    headers['Last-Event-ID'] = String(options.afterSeq);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
      signal: options.signal,
    });
  } catch (err) {
    options.onDisconnected?.(err instanceof Error ? err.message : 'fetch failed');
    throw err;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    options.onDisconnected?.(text || `HTTP ${response.status}`);
    throw new Error(text || `HTTP ${response.status}`);
  }

  if (!response.body) {
    options.onDisconnected?.('empty response body');
    throw new Error('SSE response has no body');
  }

  options.onConnected?.();

  try {
    for await (const parsed of parseSseStream(response.body)) {
      if (options.signal?.aborted) {
        break;
      }
      const frame = parseSseFrame(parsed);
      if (frame) {
        options.onFrame(frame);
      }
    }
    options.onDisconnected?.('stream ended');
  } catch (err) {
    if (options.signal?.aborted) {
      options.onDisconnected?.('aborted');
      return;
    }
    options.onDisconnected?.(err instanceof Error ? err.message : 'stream error');
    throw err;
  }
}

export function buildDefaultStreamUrl(runId: string): string {
  return `/api/agent/runs/${runId}/stream`;
}
