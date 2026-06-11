import type { ReactNode } from 'react';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import type { CreateAgentRunParams } from '../../api/agent';
import { useAssistantRuntime } from '../hooks/useAssistantRuntime';

interface AgentV2RuntimeProviderProps {
  children: ReactNode;
  runId: string | null;
  onStartRun: (params: CreateAgentRunParams) => Promise<{ id: string }>;
  onFollowUp?: (params: { runId: string; message: string }) => Promise<void>;
  onCancel?: (runId: string) => Promise<void>;
}

export function AgentV2RuntimeProvider({
  children,
  runId,
  onStartRun,
  onFollowUp,
  onCancel,
}: AgentV2RuntimeProviderProps) {
  const runtime = useAssistantRuntime({ runId, onStartRun, onFollowUp, onCancel });
  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
