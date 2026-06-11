import { useMemo } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ExecutionState, TodoNodeStatus } from '../../types/runTypes';

const STATUS_COLORS: Record<TodoNodeStatus, { bg: string; border: string }> = {
  pending: { bg: '#f8fafc', border: '#cbd5e1' },
  running: { bg: '#e0f2fe', border: '#38bdf8' },
  completed: { bg: '#dcfce7', border: '#4ade80' },
  failed: { bg: '#fee2e2', border: '#f87171' },
  skipped: { bg: '#f1f5f9', border: '#94a3b8' },
};

function layoutDag(planItems: ExecutionState['planItems']): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const levels = new Map<string, number>();

  function levelFor(id: string): number {
    if (levels.has(id)) {
      return levels.get(id)!;
    }
    const item = planItems.find((p) => p.id === id);
    if (!item || item.dependsOn.length === 0) {
      levels.set(id, 0);
      return 0;
    }
    const maxDep = Math.max(...item.dependsOn.map((d) => levelFor(d)));
    const lv = maxDep + 1;
    levels.set(id, lv);
    return lv;
  }

  for (const item of planItems) {
    levelFor(item.id);
  }

  const byLevel = new Map<number, string[]>();
  for (const item of planItems) {
    const lv = levels.get(item.id) ?? 0;
    const list = byLevel.get(lv) ?? [];
    list.push(item.id);
    byLevel.set(lv, list);
  }

  const xGap = 200;
  const yGap = 120;
  for (const [lv, ids] of byLevel.entries()) {
    ids.forEach((id, idx) => {
      positions.set(id, { x: idx * xGap, y: lv * yGap });
    });
  }
  return positions;
}

interface DagFlowGraphProps {
  execution: ExecutionState;
  selectedTodoId?: string | null;
  onSelectTodo?: (todoId: string) => void;
}

export function DagFlowGraph({ execution, selectedTodoId, onSelectTodo }: DagFlowGraphProps) {
  const { planItems, nodeStatus } = execution;

  const { nodes, edges } = useMemo(() => {
    if (planItems.length === 0) {
      return { nodes: [] as Node[], edges: [] as Edge[] };
    }

    const positions = layoutDag(planItems);
    const nodes: Node[] = planItems.map((item) => {
      const status = nodeStatus[item.id] ?? 'pending';
      const colors = STATUS_COLORS[status];
      const pos = positions.get(item.id) ?? { x: 0, y: 0 };
      const selected = item.id === selectedTodoId;
      return {
        id: item.id,
        position: pos,
        data: {
          label: `#${item.sequence} ${item.description.slice(0, 48)}${
            item.description.length > 48 ? '…' : ''
          }`,
        },
        style: {
          background: colors.bg,
          border: `2px solid ${selected ? '#0284c7' : colors.border}`,
          borderRadius: 8,
          padding: 8,
          width: 200,
          fontSize: 11,
          boxShadow: selected ? '0 0 0 2px #bae6fd' : undefined,
        },
      };
    });

    const edges: Edge[] = [];
    for (const item of planItems) {
      for (const dep of item.dependsOn) {
        edges.push({
          id: `${dep}->${item.id}`,
          source: dep,
          target: item.id,
          animated: nodeStatus[item.id] === 'running',
          style: { stroke: '#64748b' },
        });
      }
    }

    return { nodes, edges };
  }, [planItems, nodeStatus, selectedTodoId]);

  if (planItems.length === 0) {
    return (
      <p className="flex h-full items-center justify-center text-sm text-slate-400">
        等待 PLAN_READY（DAG）…
      </p>
    );
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.25}
        maxZoom={1.25}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        onNodeClick={(_, node) => onSelectTodo?.(node.id)}
      >
        <Background gap={16} color="#e2e8f0" />
        <Controls />
        <MiniMap zoomable pannable />
      </ReactFlow>
    </div>
  );
}
