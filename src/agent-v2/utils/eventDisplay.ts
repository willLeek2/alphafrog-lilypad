const MAX_HEADLINE = 120;
const MAX_DETAIL = 4000;

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}…`;
}

/** Hide provider-internal generation ids from user-facing headlines. */
export function stripInternalIds(text: string): string {
  return text
    .replace(/"id"\s*:\s*"gen-[^"]+"/gi, '')
    .replace(/\bgen-\d+-[A-Za-z0-9]+\b/g, '[id]')
    .replace(/,\s*,/g, ',')
    .replace(/\{\s*,/g, '{')
    .trim();
}

export interface DisplayLine {
  headline: string;
  subline?: string;
}

export function formatToolResultText(raw: string | undefined): DisplayLine {
  if (!raw?.trim()) {
    return { headline: '（无输出摘要）' };
  }
  const trimmed = raw.trim();
  try {
    const data = JSON.parse(trimmed) as Record<string, unknown>;
    const tool = typeof data.tool === 'string' ? data.tool : undefined;
    const ok = data.ok === true;
    if (tool === 'searchAssetInfo' && data.data && typeof data.data === 'object') {
      const inner = data.data as Record<string, unknown>;
      const results = Array.isArray(inner.results) ? inner.results : [];
      const queries = results
        .map((r) => {
          if (r && typeof r === 'object' && 'query' in r) {
            return String((r as { query?: unknown }).query ?? '');
          }
          return '';
        })
        .filter(Boolean);
      const hitCount = results.reduce((n, r) => {
        if (r && typeof r === 'object' && (r as { ok?: boolean }).ok) {
          return n + 1;
        }
        return n;
      }, 0);
      return {
        headline: `searchAssetInfo · ${ok ? '成功' : '失败'} · ${hitCount}/${results.length} 条命中`,
        subline: queries.length ? `查询：${queries.join('、')}` : undefined,
      };
    }
    if (tool) {
      return {
        headline: `${tool} · ${ok ? '成功' : '失败'}`,
        subline: truncate(stripInternalIds(trimmed), MAX_HEADLINE),
      };
    }
    if (typeof data.ok === 'boolean') {
      return {
        headline: ok ? '工具调用成功' : '工具调用失败',
        subline: truncate(stripInternalIds(trimmed), MAX_HEADLINE),
      };
    }
  } catch {
    /* plain text */
  }
  return { headline: truncate(stripInternalIds(trimmed), MAX_HEADLINE) };
}

export function formatTraceOutputSummary(raw: string | undefined): DisplayLine {
  if (!raw?.trim()) {
    return { headline: '—' };
  }
  const cleaned = stripInternalIds(raw.trim());
  if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
    try {
      return formatToolResultText(cleaned);
    } catch {
      /* fall through */
    }
  }
  return { headline: truncate(cleaned, MAX_HEADLINE) };
}

export function formatDetailBody(text: string | undefined): string {
  if (!text?.trim()) {
    return '（无详情）';
  }
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed);
    return truncate(JSON.stringify(parsed, null, 2), MAX_DETAIL);
  } catch {
    return truncate(stripInternalIds(trimmed), MAX_DETAIL);
  }
}

export function llmCardTitle(model?: string, phase?: string): string {
  const m = model?.trim();
  const p = phase?.trim();
  if (m && p) {
    return `LLM · ${m} · ${p}`;
  }
  if (m) {
    return `LLM · ${m}`;
  }
  if (p) {
    return `LLM · ${p}`;
  }
  return 'LLM 调用';
}

export function tokenLine(
  durationMs?: number | null,
  inputTokens?: number | null,
  outputTokens?: number | null
): string {
  const parts: string[] = [];
  if (durationMs != null) {
    parts.push(`${durationMs}ms`);
  }
  if (inputTokens != null || outputTokens != null) {
    parts.push(`${inputTokens ?? 0}/${outputTokens ?? 0} tok`);
  }
  return parts.join(' · ') || '—';
}
