import type { RawSseFrame } from '../types/sse';

export interface ParsedSseEvent {
  event: string;
  id?: string;
  data: string;
}

/** Minimal text/event-stream parser for fetch-based SSE (supports Authorization header). */
export async function* parseSseStream(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<ParsedSseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';
      for (const chunk of chunks) {
        const parsed = parseSseChunk(chunk);
        if (parsed) {
          yield parsed;
        }
      }
    }
    if (buffer.trim()) {
      const parsed = parseSseChunk(buffer);
      if (parsed) {
        yield parsed;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseSseChunk(chunk: string): ParsedSseEvent | null {
  const lines = chunk.split('\n');
  let event = 'message';
  let id: string | undefined;
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('id:')) {
      id = line.slice(3).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  return { event, id, data: dataLines.join('\n') };
}

export function parseSseFrame(parsed: ParsedSseEvent): RawSseFrame | null {
  let json: unknown;
  try {
    json = JSON.parse(parsed.data);
  } catch {
    return null;
  }
  if (!json || typeof json !== 'object') {
    return null;
  }

  switch (parsed.event) {
    case 'snapshot':
      return { event: 'snapshot', data: json as RawSseFrame extends { event: 'snapshot' } ? RawSseFrame['data'] : never };
    case 'agent.event':
      return {
        event: 'agent.event',
        id: parsed.id,
        data: json as RawSseFrame extends { event: 'agent.event' } ? RawSseFrame['data'] : never,
      };
    case 'run.status':
      return { event: 'run.status', data: json as RawSseFrame extends { event: 'run.status' } ? RawSseFrame['data'] : never };
    case 'run.done':
      return { event: 'run.done', data: json as RawSseFrame extends { event: 'run.done' } ? RawSseFrame['data'] : never };
    case 'heartbeat':
      return { event: 'heartbeat', data: json as RawSseFrame extends { event: 'heartbeat' } ? RawSseFrame['data'] : never };
    case 'error':
      return { event: 'error', data: json as RawSseFrame extends { event: 'error' } ? RawSseFrame['data'] : never };
    default:
      return null;
  }
}
