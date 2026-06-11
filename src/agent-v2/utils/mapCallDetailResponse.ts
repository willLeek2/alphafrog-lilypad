import type { AgentCallDetailResponse, SafeCallDetailResponse } from '../../api/agent';

function userMessageForKind(kind: string, thinkingUnavailable = false): string | undefined {
  switch (kind) {
    case 'unavailable':
      return '该调用详情暂不可用（观测数据未找到或尚未写入）。';
    case 'expired':
      return '该调用详情已过期，无法加载。';
    case 'truncated':
      return '以下内容已截断显示，完整内容未保留在用户视图。';
    default:
      if (thinkingUnavailable) {
        return '本次 LLM 调用的 thinking 内容不可用（6h 短 TTL 已过期或未存储）。';
      }
      return undefined;
  }
}

/** Map backend AgentCallDetailResponse → normalized safe view (whitelist fields only). */
export function mapAgentCallDetailToSafe(raw: AgentCallDetailResponse): SafeCallDetailResponse {
  const callDetailKind = raw.detailKind ?? 'available';
  const type = raw.type === 'tool' ? 'tool' : 'llm';
  const unavailable = callDetailKind === 'unavailable';
  const expired = callDetailKind === 'expired';

  const structured: Record<string, string | number | boolean> = {};
  if (raw.phase) {
    structured.phase = raw.phase;
  }
  if (raw.stage) {
    structured.stage = raw.stage;
  }
  if (raw.status) {
    structured.status = raw.status;
  }
  if (raw.durationMs != null) {
    structured.durationMs = raw.durationMs;
  }
  if (raw.llm?.model) {
    structured.model = raw.llm.model;
  }
  if (raw.tool?.name) {
    structured.toolName = raw.tool.name;
  }
  if (raw.tool?.paramsSummary) {
    structured.paramsSummary = raw.tool.paramsSummary;
  }
  if (raw.tool?.outputPreview) {
    structured.outputPreview = raw.tool.outputPreview;
  }
  if (raw.metrics?.inputTokens != null) {
    structured.inputTokens = raw.metrics.inputTokens;
  }
  if (raw.metrics?.outputTokens != null) {
    structured.outputTokens = raw.metrics.outputTokens;
  }
  if (raw.metrics?.totalTokens != null) {
    structured.totalTokens = raw.metrics.totalTokens;
  }
  if (raw.limits?.truncated === true) {
    structured.truncated = true;
  }
  if (raw.limits?.previewMaxChars != null) {
    structured.maxChars = raw.limits.previewMaxChars;
  }
  // thinking/reasoning：仅当后端真正回传 reasoningContent 时写入 structured（受 STRUCTURED_SCALAR_KEYS 白名单约束）
  if (raw.llm?.reasoningContent) {
    structured.reasoningContent = raw.llm.reasoningContent;
  }
  // 后端仅在 includeThinking=true 且 blob 缺/无 reasoningText 时为 true；前端拿到时给一个 hint
  if (raw.reasoningUnavailable === true) {
    structured.reasoningUnavailable = true;
  }

  return {
    type,
    callDetailKind,
    source: raw.source,
    summary: raw.summary,
    structured: Object.keys(structured).length > 0 ? structured : null,
    unavailable,
    expired,
    message: userMessageForKind(callDetailKind, raw.reasoningUnavailable === true),
  };
}
