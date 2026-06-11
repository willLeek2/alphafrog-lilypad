import { useCallback, useEffect, useState } from 'react';
import {
  getRunArtifacts,
  getRunResult,
  getRunTraces,
  type AgentRunResult,
  type Artifact,
  type TraceSpanItem,
} from '../../api/agent';
import { extractRunResultText, parseAgentRunResult } from '../utils/extractRunResult';
import { isUserVisibleArtifact } from '../utils/artifacts';

interface SidecarState {
  artifacts: Artifact[];
  artifactsLoading: boolean;
  artifactsError: string | null;
  resultText: string | null;
  resultLoading: boolean;
  resultError: string | null;
  runResult: AgentRunResult | null;
  traceSpans: TraceSpanItem[];
  tracesLoading: boolean;
  tracesError: string | null;
}

const EMPTY: SidecarState = {
  artifacts: [],
  artifactsLoading: false,
  artifactsError: null,
  resultText: null,
  resultLoading: false,
  resultError: null,
  runResult: null,
  traceSpans: [],
  tracesLoading: false,
  tracesError: null,
};

/** Fetch result / artifacts when terminal; traces when terminal or node inspection. */
export function useRunSidecar(
  runId: string | null,
  terminalEnabled: boolean,
  tracesEnabled: boolean = terminalEnabled
) {
  const [state, setState] = useState<SidecarState>(EMPTY);

  const refresh = useCallback(async () => {
    if (!runId || (!terminalEnabled && !tracesEnabled)) {
      return;
    }

    setState((s) => ({
      ...s,
      artifactsLoading: terminalEnabled,
      resultLoading: terminalEnabled,
      tracesLoading: tracesEnabled,
      artifactsError: null,
      resultError: null,
      tracesError: null,
    }));

    const tasks: Promise<unknown>[] = [];
    if (terminalEnabled) {
      tasks.push(getRunArtifacts(runId), getRunResult(runId));
    }
    if (tracesEnabled) {
      tasks.push(getRunTraces(runId));
    }

    const settled = await Promise.allSettled(tasks);
    let ai = 0;
    const artifactsSettled = terminalEnabled ? settled[ai++] : null;
    const resultSettled = terminalEnabled ? settled[ai++] : null;
    const tracesSettled = tracesEnabled ? settled[ai++] : null;

    setState((s) => {
      const next = {
        ...s,
        artifactsLoading: false,
        resultLoading: false,
        tracesLoading: false,
      };

      if (artifactsSettled) {
        if (artifactsSettled.status === 'fulfilled') {
          next.artifacts = (artifactsSettled.value as Artifact[]).filter(isUserVisibleArtifact);
          next.artifactsError = null;
        } else {
          next.artifacts = [];
          next.artifactsError =
            artifactsSettled.reason instanceof Error
              ? artifactsSettled.reason.message
              : '产物加载失败';
        }
      }

      if (resultSettled) {
        if (resultSettled.status === 'fulfilled') {
          const parsed = parseAgentRunResult(resultSettled.value);
          next.runResult = parsed;
          next.resultText = extractRunResultText(parsed);
          next.resultError = next.resultText ? null : '暂无最终结果文本';
        } else {
          next.runResult = null;
          next.resultText = null;
          next.resultError =
            resultSettled.reason instanceof Error ? resultSettled.reason.message : '结果加载失败';
        }
      }

      if (tracesSettled) {
        if (tracesSettled.status === 'fulfilled') {
          const body = tracesSettled.value as Awaited<ReturnType<typeof getRunTraces>>;
          next.traceSpans = body.spans ?? [];
          next.tracesError = null;
        } else {
          next.traceSpans = [];
          next.tracesError =
            tracesSettled.reason instanceof Error
              ? tracesSettled.reason.message
              : '链路摘要加载失败';
        }
      }

      return next;
    });
  }, [runId, terminalEnabled, tracesEnabled]);

  useEffect(() => {
    if (!runId || (!terminalEnabled && !tracesEnabled)) {
      setState(EMPTY);
      return;
    }
    void refresh();
  }, [runId, terminalEnabled, tracesEnabled, refresh]);

  return { ...state, refresh };
}
