import { MessagePrimitive, ThreadPrimitive } from '@assistant-ui/react';
import { ChatMarkdown } from './ChatMarkdown';
import { AgentDataPart, AgentToolCallPart } from './partRenderers';

function UserMessage() {
  return (
    <MessagePrimitive.Root className="mb-4 flex justify-end">
      <div className="max-w-[85%] rounded-2xl bg-sky-600 px-4 py-2.5 text-sm text-white">
        <MessagePrimitive.Content
          components={{
            Text: ({ text }) => <span className="whitespace-pre-wrap">{text}</span>,
          }}
        />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="mb-4">
      <div className="max-w-full space-y-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
        <MessagePrimitive.Content
          components={{
            Text: ({ text }) => <ChatMarkdown text={text} />,
            tools: {
              Fallback: AgentToolCallPart,
            },
            data: {
              by_name: {
                llm_progress: AgentDataPart,
              },
            },
          }}
        />
      </div>
    </MessagePrimitive.Root>
  );
}

export function ChatShell() {
  return (
    <ThreadPrimitive.Root className="flex h-full min-h-0 flex-col">
      <ThreadPrimitive.Viewport className="agent-v2-scroll min-h-0 flex-1">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              AssistantMessage,
            }}
          />
          <ThreadPrimitive.Empty>
            <p className="py-12 text-center text-sm text-slate-400">
              发送消息开始 Agent run
            </p>
          </ThreadPrimitive.Empty>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}
