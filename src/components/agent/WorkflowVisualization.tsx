import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Edge,
  type ReactFlowInstance,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Maximize2 } from 'lucide-react';
import { nodeTypes, type AgentNodeData, type AgentNode } from './nodes';
import type { AgentRunEvent, AgentRunStatus } from '../../api/agent';

interface WorkflowVisualizationProps {
  runId: string;
  events: AgentRunEvent[];
  status: AgentRunStatus | null;
}

// Parse plan JSON to extract tasks
interface Task {
  id: string;
  type: 'tool' | 'sub_agent';
  tool?: string;
  dependsOn?: string[];
  description?: string;
}

interface Plan {
  strategy: 'parallel' | 'serial';
  tasks: Task[];
}

function parsePlan(planJson: string): Plan | null {
  try {
    return JSON.parse(planJson);
  } catch {
    return null;
  }
}

// Build nodes and edges from events and plan
function buildWorkflow(
  events: AgentRunEvent[],
  status: AgentRunStatus | null
): { nodes: AgentNode[]; edges: Edge[] } {
  const nodes: AgentNode[] = [];
  const edges: Edge[] = [];
  
  // Track task statuses from events
  const eventTypes = new Set(events.map(e => e.eventType));
  
  // Start node
  const isCompleted = status?.status === 'COMPLETED';
  const isFailed = status?.status === 'FAILED';
  const isCanceled = status?.status === 'CANCELED';
  const isRunning = status?.status === 'RUNNING';
  
  nodes.push({
    id: 'start',
    type: 'start',
    position: { x: 0, y: 0 },
    data: {
      label: '开始',
      status: isRunning ? 'running' : 'success',
      type: 'start',
    },
  });
  
  // Parse plan if available
  const plan = status?.planJson ? parsePlan(status.planJson) : null;
  
  // Plan node
  const hasPlan = eventTypes.has('PLAN_CREATED') || eventTypes.has('PLAN_REUSED');
  const isPlanning = eventTypes.has('PLAN_STARTED') && !hasPlan;
  
  nodes.push({
    id: 'plan',
    type: 'plan',
    position: { x: 0, y: 100 },
    data: {
      label: '生成计划',
      status: isPlanning ? 'running' : hasPlan ? 'success' : 'pending',
      type: 'plan',
      detail: plan ? { description: `${plan.tasks.length} 个任务` } : undefined,
    },
  });
  
  edges.push({
    id: 'start-plan',
    source: 'start',
    target: 'plan',
    animated: isPlanning,
    style: { stroke: '#8b5cf6', strokeWidth: 2 },
  });
  
  if (!plan || plan.tasks.length === 0) {
    // No plan yet, just show start and plan nodes
    return { nodes, edges };
  }
  
  // Build task nodes from plan
  const taskYBase = 200;
  const taskXSpacing = 200;
  const taskYSpacing = 100;
  
  // Group tasks by dependency level for layout
  const taskLevels = new Map<string, number>();
  
  function getTaskLevel(taskId: string): number {
    if (taskLevels.has(taskId)) return taskLevels.get(taskId)!;
    
    const task = plan!.tasks.find(t => t.id === taskId);
    if (!task || !task.dependsOn || task.dependsOn.length === 0) {
      taskLevels.set(taskId, 0);
      return 0;
    }
    
    const maxDepLevel = Math.max(...task.dependsOn.map(getTaskLevel));
    const level = maxDepLevel + 1;
    taskLevels.set(taskId, level);
    return level;
  }
  
  plan.tasks.forEach(task => getTaskLevel(task.id));
  
  // Group by level
  const levelGroups = new Map<number, Task[]>();
  taskLevels.forEach((level, taskId) => {
    const task = plan!.tasks.find(t => t.id === taskId);
    if (task) {
      if (!levelGroups.has(level)) levelGroups.set(level, []);
      levelGroups.get(level)!.push(task);
    }
  });
  
  // Create task nodes
  const taskPositions = new Map<string, { x: number; y: number }>();
  
  levelGroups.forEach((tasks, level) => {
    const y = taskYBase + level * taskYSpacing;
    const totalWidth = (tasks.length - 1) * taskXSpacing;
    const startX = -totalWidth / 2;
    
    tasks.forEach((task, index) => {
      const x = startX + index * taskXSpacing;
      taskPositions.set(task.id, { x, y });
      
      // Determine task status from events
      let taskStatus: AgentNodeData['status'] = 'pending';
      const taskStarted = events.some(e => 
        e.eventType === 'PARALLEL_TASK_STARTED' && 
        e.payloadJson.includes(task.id)
      );
      const taskFinished = events.some(e => 
        e.eventType === 'PARALLEL_TASK_FINISHED' && 
        e.payloadJson.includes(task.id)
      );
      const taskFailed = events.some(e => 
        e.eventType === 'PARALLEL_TASK_FAILED_INTERNAL' && 
        e.payloadJson.includes(task.id)
      );
      
      if (taskFailed) taskStatus = 'error';
      else if (taskFinished) taskStatus = 'success';
      else if (taskStarted) taskStatus = 'running';
      
      nodes.push({
        id: task.id,
        type: 'parallel_task',
        position: { x, y },
        data: {
          label: task.tool || task.type,
          status: taskStatus,
          type: 'parallel_task',
          detail: {
            taskId: task.id,
            toolName: task.tool,
            description: task.type === 'sub_agent' ? '子代理任务' : undefined,
          },
        },
      });
      
      // Create edges from dependencies
      if (task.dependsOn && task.dependsOn.length > 0) {
        task.dependsOn.forEach(depId => {
          edges.push({
            id: `${depId}-${task.id}`,
            source: depId,
            target: task.id,
            animated: taskStatus === 'running',
            style: { stroke: '#06b6d4', strokeWidth: 2 },
          });
        });
      } else {
        // Connect to plan node if no dependencies
        edges.push({
          id: `plan-${task.id}`,
          source: 'plan',
          target: task.id,
          animated: taskStatus === 'running',
          style: { stroke: '#8b5cf6', strokeWidth: 2 },
        });
      }
    });
  });
  
  // Find max level for result node placement
  const maxLevel = Math.max(...Array.from(levelGroups.keys()), 0);
  
  // Result node
  const resultY = taskYBase + (maxLevel + 1) * taskYSpacing;
  nodes.push({
    id: 'result',
    type: 'result',
    position: { x: 0, y: resultY },
    data: {
      label: isFailed ? '执行失败' : isCanceled ? '已取消' : '执行完成',
      status: isFailed || isCanceled ? 'error' : isCompleted ? 'success' : 'pending',
      type: 'result',
    },
  });
  
  // Connect last level tasks to result
  const lastLevelTasks = levelGroups.get(maxLevel) || [];
  lastLevelTasks.forEach(task => {
    edges.push({
      id: `${task.id}-result`,
      source: task.id,
      target: 'result',
      animated: isRunning,
      style: { stroke: isFailed ? '#ef4444' : '#22c55e', strokeWidth: 2 },
    });
  });
  
  return { nodes, edges };
}

const WorkflowVisualization = ({ events, status }: WorkflowVisualizationProps) => {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return buildWorkflow(events, status);
  }, [events, status]);
  
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  
  const onInit = useCallback((reactFlowInstance: ReactFlowInstance<AgentNode, Edge>) => {
    reactFlowInstance.fitView({ padding: 0.2 });
  }, []);
  
  if (!status) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-slate-400">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 flex items-center justify-center">
            <Maximize2 className="w-6 h-6" />
          </div>
          <p>等待状态信息...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        minZoom={0.1}
        maxZoom={2}
      >
        <Background color="#cbd5e1" gap={16} size={1} />
        <Controls />
        <MiniMap 
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="bg-white/80 rounded-lg shadow-sm"
        />
        <Panel position="top-left" className="bg-white/90 backdrop-blur rounded-lg shadow-sm p-3">
          <div className="text-xs text-slate-500 space-y-1">
            <p><span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1"></span> 开始</p>
            <p><span className="inline-block w-2 h-2 rounded-full bg-violet-400 mr-1"></span> 计划</p>
            <p><span className="inline-block w-2 h-2 rounded-full bg-cyan-400 mr-1"></span> 任务</p>
            <p><span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1"></span> 完成</p>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default WorkflowVisualization;
