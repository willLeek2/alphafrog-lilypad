import { create } from 'zustand';
import type { AgentRunEvent, AgentRunStatus } from '../api/agent';

// Message type for chat
export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  status?: 'sending' | 'running' | 'completed' | 'error';
  runId?: string;
  timestamp: Date;
}

// Run state
export interface RunState {
  runId: string;
  events: AgentRunEvent[];
  status: AgentRunStatus | null;
  isPolling: boolean;
  error: string | null;
}

// Store state
interface AgentState {
  // Chat messages
  messages: ChatMessage[];
  
  // Active runs (keyed by runId)
  runs: Map<string, RunState>;
  
  // Current active run
  currentRunId: string | null;
  
  // Actions
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  
  // Run actions
  initRun: (runId: string) => void;
  setRunEvents: (runId: string, events: AgentRunEvent[]) => void;
  appendRunEvents: (runId: string, events: AgentRunEvent[]) => void;
  setRunStatus: (runId: string, status: AgentRunStatus) => void;
  setRunPolling: (runId: string, isPolling: boolean) => void;
  setRunError: (runId: string, error: string | null) => void;
  clearRun: (runId: string) => void;
  
  // Current run
  setCurrentRun: (runId: string | null) => void;
  
  // Getters
  getRun: (runId: string) => RunState | undefined;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  // Initial state
  messages: [],
  runs: new Map(),
  currentRunId: null,
  
  // Message actions
  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },
  
  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    }));
  },
  
  clearMessages: () => {
    set({ messages: [] });
  },
  
  // Run actions
  initRun: (runId) => {
    set((state) => {
      const newRuns = new Map(state.runs);
      newRuns.set(runId, {
        runId,
        events: [],
        status: null,
        isPolling: true,
        error: null,
      });
      return { runs: newRuns };
    });
  },
  
  setRunEvents: (runId, events) => {
    set((state) => {
      const newRuns = new Map(state.runs);
      const run = newRuns.get(runId);
      if (run) {
        newRuns.set(runId, { ...run, events });
      }
      return { runs: newRuns };
    });
  },
  
  appendRunEvents: (runId, events) => {
    set((state) => {
      const newRuns = new Map(state.runs);
      const run = newRuns.get(runId);
      if (run) {
        newRuns.set(runId, { ...run, events: [...run.events, ...events] });
      }
      return { runs: newRuns };
    });
  },
  
  setRunStatus: (runId, status) => {
    set((state) => {
      const newRuns = new Map(state.runs);
      const run = newRuns.get(runId);
      if (run) {
        newRuns.set(runId, { ...run, status });
      }
      return { runs: newRuns };
    });
  },
  
  setRunPolling: (runId, isPolling) => {
    set((state) => {
      const newRuns = new Map(state.runs);
      const run = newRuns.get(runId);
      if (run) {
        newRuns.set(runId, { ...run, isPolling });
      }
      return { runs: newRuns };
    });
  },
  
  setRunError: (runId, error) => {
    set((state) => {
      const newRuns = new Map(state.runs);
      const run = newRuns.get(runId);
      if (run) {
        newRuns.set(runId, { ...run, error });
      }
      return { runs: newRuns };
    });
  },
  
  clearRun: (runId) => {
    set((state) => {
      const newRuns = new Map(state.runs);
      newRuns.delete(runId);
      return { runs: newRuns };
    });
  },
  
  // Current run
  setCurrentRun: (runId) => {
    set({ currentRunId: runId });
  },
  
  // Getters
  getRun: (runId) => {
    return get().runs.get(runId);
  },
}));

// Selector hooks for performance
export const useCurrentRun = () => {
  return useAgentStore((state) => 
    state.currentRunId ? state.runs.get(state.currentRunId) : undefined
  );
};

export const useRunById = (runId: string | null) => {
  return useAgentStore((state) => 
    runId ? state.runs.get(runId) : undefined
  );
};
