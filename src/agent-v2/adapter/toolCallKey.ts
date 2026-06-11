export function toolCallKey(payload: Record<string, unknown>): string {
  const id = payload.tool_call_id ?? payload.toolCallId;
  if (typeof id === 'string' && id.length > 0) {
    return id;
  }
  const name = payload.tool_name ?? payload.toolName ?? 'unknown';
  return `tool:${String(name)}:${Date.now()}`;
}
