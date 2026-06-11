import type { SafeCallDetailResponse } from '../../api/agent';
import { formatToolResultText, formatTraceOutputSummary } from './eventDisplay';

/**
 * Plain structured fields allowed for ordinary users (Step 1 contract).
 * Anything else is dropped, never passed to UI.
 */
const STRUCTURED_SCALAR_KEYS = [
  'headline',
  'subline',
  'query',
  'queries',
  'hitCount',
  'resultCount',
  'toolName',
  'status',
  'phase',
  'stage',
  'model',
  'paramsSummary',
  'outputPreview',
  'durationMs',
  'inputTokens',
  'outputTokens',
  'totalTokens',
  'truncated',
  'maxChars',
  'limitReason',
  // thinking/reasoning：后端仅在 includeThinking=true 且 admin 时回传；前端白名单也要列上才能渲染
  'reasoningContent',
  'reasoningUnavailable',
] as const;

const METRICS_NESTED_KEYS = [
  'durationMs',
  'inputTokens',
  'outputTokens',
  'totalTokens',
  'cachedTokens',
] as const;

const LIMITS_NESTED_KEYS = ['truncated', 'maxChars', 'limitReason'] as const;

const TOP_LEVEL_KEYS = [
  'type',
  'callDetailKind',
  'source',
  'summary',
  'structured',
  'expired',
  'unavailable',
  'message',
] as const;

function coerceScalar(v: unknown): string | number | boolean | undefined {
  if (v == null) {
    return undefined;
  }
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    return v;
  }
  if (Array.isArray(v) && v.every((x) => typeof x === 'string' || typeof x === 'number')) {
    return v.map(String).join('、');
  }
  return undefined;
}

function pickStructuredFields(
  structured: Record<string, unknown>
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};

  for (const key of STRUCTURED_SCALAR_KEYS) {
    const coerced = coerceScalar(structured[key]);
    if (coerced !== undefined) {
      out[key] = coerced;
    }
  }

  const metrics = structured.metrics;
  if (metrics && typeof metrics === 'object' && !Array.isArray(metrics)) {
    for (const key of METRICS_NESTED_KEYS) {
      const coerced = coerceScalar((metrics as Record<string, unknown>)[key]);
      if (coerced !== undefined && out[key] === undefined) {
        out[key] = coerced;
      }
    }
  }

  const limits = structured.limits;
  if (limits && typeof limits === 'object' && !Array.isArray(limits)) {
    for (const key of LIMITS_NESTED_KEYS) {
      const coerced = coerceScalar((limits as Record<string, unknown>)[key]);
      if (coerced !== undefined) {
        const outKey =
          key === 'truncated' ? 'truncated' : key === 'maxChars' ? 'maxChars' : 'limitReason';
        if (out[outKey] === undefined) {
          out[outKey] = coerced;
        }
      }
    }
  }

  return out;
}

/** Strip unexpected fields before cache/render (unknown keys discarded). */
export function sanitizeSafeCallDetailResponse(
  raw: Record<string, unknown>
): SafeCallDetailResponse {
  const structuredRaw = raw.structured;
  const structured =
    structuredRaw && typeof structuredRaw === 'object' && !Array.isArray(structuredRaw)
      ? pickStructuredFields(structuredRaw as Record<string, unknown>)
      : null;

  const callDetailKind =
    typeof raw.callDetailKind === 'string' ? raw.callDetailKind : 'available';

  const sanitized: SafeCallDetailResponse = {
    type: raw.type === 'tool' ? 'tool' : 'llm',
    callDetailKind,
    source: typeof raw.source === 'string' ? raw.source : undefined,
    summary: typeof raw.summary === 'string' ? raw.summary : undefined,
    structured: structured && Object.keys(structured).length > 0 ? structured : null,
    expired: raw.expired === true || callDetailKind === 'expired',
    unavailable: raw.unavailable === true || callDetailKind === 'unavailable',
    message: typeof raw.message === 'string' ? raw.message : undefined,
  };

  if (import.meta.env.DEV) {
    const rawKeys = Object.keys(raw);
    const dropped = rawKeys.filter((k) => !TOP_LEVEL_KEYS.includes(k as (typeof TOP_LEVEL_KEYS)[number]));
    if (dropped.length > 0) {
      console.debug('[safeTraceDetail] dropped top-level keys:', dropped.join(', '));
    }
  }

  return sanitized;
}

function formatStructuredLines(structured: Record<string, string | number | boolean>): string {
  return Object.entries(structured)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

/** Render only whitelisted SafeCallDetailResponse fields — no JSON.stringify(raw). */
export function formatSafeCallDetailBody(detail: SafeCallDetailResponse): string {
  const safe = sanitizeSafeCallDetailResponse(detail as unknown as Record<string, unknown>);

  if (safe.unavailable || safe.expired) {
    return safe.message ?? '详情不可用';
  }

  const chunks: string[] = [];

  if (safe.callDetailKind === 'truncated' && safe.message) {
    chunks.push(safe.message);
  }

  if (safe.summary?.trim()) {
    const line =
      safe.type === 'tool'
        ? formatToolResultText(safe.summary)
        : formatTraceOutputSummary(safe.summary);
    if (line.headline) {
      chunks.push(line.headline);
    }
    if (line.subline) {
      chunks.push(line.subline);
    }
  }

  if (safe.structured && Object.keys(safe.structured).length > 0) {
    const lines = formatStructuredLines(safe.structured);
    if (lines) {
      chunks.push(lines);
    }
  }

  if (chunks.length === 0) {
    return '（无详情）';
  }

  return chunks.join('\n');
}
