import { getRunEvents, type AgentRunEvent } from '../../api/agent';
import type { AgentEventPayload } from '../types/sse';
import { normalizeEventType } from './runAdapter';

function parseEventPayload(event: AgentRunEvent): Record<string, unknown> {
  const raw = event.payload ?? (event as { payloadJson?: string }).payloadJson;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

export function toAgentEventPayload(event: AgentRunEvent): AgentEventPayload {
  return {
    type: 'agent.event',
    runId: event.runId,
    seq: event.seq,
    eventType: normalizeEventType(event.eventType),
    payload: parseEventPayload(event),
    createdAt: event.createdAt,
  };
}

/**
 * Fetch durable events after `afterSeq` and invoke handler for each (ascending seq).
 * @returns highest seq seen after repair (unchanged if no new events)
 */
export async function repairAgentEventsAfterSeq(
  runId: string,
  afterSeq: number,
  onEvent: (event: AgentEventPayload) => void,
  options?: { limit?: number; maxPages?: number }
): Promise<number> {
  const limit = options?.limit ?? 100;
  const maxPages = options?.maxPages ?? 50;
  let cursor = afterSeq;
  let maxSeq = afterSeq;
  let pages = 0;

  while (pages < maxPages) {
    pages += 1;
    const page = await getRunEvents(runId, cursor, limit);
    const items = [...page.items].sort((a, b) => a.seq - b.seq);
    if (items.length === 0) {
      break;
    }
    for (const item of items) {
      if (item.seq <= afterSeq) {
        continue;
      }
      onEvent(toAgentEventPayload(item));
      maxSeq = Math.max(maxSeq, item.seq);
      cursor = item.seq;
    }
    if (!page.hasMore) {
      break;
    }
  }

  return maxSeq;
}
