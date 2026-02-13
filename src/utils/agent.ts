import { AgentRunEvent } from "../api/agent";

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  isThinking?: boolean;
  artifacts?: any[]; // Simplified
  cost?: number;
}

export function parseEventsToMessages(events: AgentRunEvent[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  
  // Sort events by seq just in case
  const sortedEvents = [...events].sort((a, b) => a.seq - b.seq);

  for (const event of sortedEvents) {
    try {
      const payload = JSON.parse(event.payloadJson);
      
      switch (event.eventType) {
        case 'USER_MESSAGE':
          messages.push({
            id: event.id.toString(),
            role: 'user',
            content: payload.message || '',
            timestamp: new Date(event.createdAt),
          });
          break;
          
        case 'MODEL_THOUGHT':
          // Can be separate thought bubble or merged. 
          // For now, let's treat it as a "thinking" message or just content if we want to show thoughts.
          // DemoChat had `isThinking: true`.
          // If we receive partial thoughts, we might want to accumulate them.
          // For simplicity, let's map it to an agent message with isThinking=true if it's the last one?
          // Or just render it.
          messages.push({
            id: event.id.toString(),
            role: 'agent',
            content: payload.thought || payload.content || 'Thinking...',
            timestamp: new Date(event.createdAt),
            isThinking: true,
          });
          break;

        case 'MODEL_RESPONSE':
          messages.push({
            id: event.id.toString(),
            role: 'agent',
            content: payload.response || payload.content || '',
            timestamp: new Date(event.createdAt),
          });
          break;
          
        case 'TOOL_CALL':
           // Optionally show tool calls
           // messages.push({ ... role: 'agent', content: `Executing tool: ${payload.toolName}...`, isThinking: true })
           break;
           
        case 'TOOL_OUTPUT':
           // Optionally show tool output
           break;

        case 'WORKFLOW_COMPLETED':
          messages.push({
            id: event.id.toString(),
            role: 'agent',
            content: payload.answer || '已完成',
            timestamp: new Date(event.createdAt),
          });
          break;
          
        case 'WORKFLOW_FAILED':
          messages.push({
            id: event.id.toString(),
            role: 'agent',
            content: `错误: ${payload.error || '未知错误'}`,
            timestamp: new Date(event.createdAt),
          });
          break;
      }
    } catch (e) {
      console.warn("Failed to parse event payload", event);
    }
  }
  
  return messages;
}
