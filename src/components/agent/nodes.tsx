import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { 
  Play, 
  Brain, 
  Wrench, 
  Clock, 
  GitBranch, 
  Layers, 
  CheckCircle2, 
  XCircle,
  Loader2
} from 'lucide-react';

// Node data type
export interface AgentNodeData {
  label: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'waiting';
  type: 'start' | 'plan' | 'tool' | 'wait' | 'decision' | 'parallel_task' | 'result';
  detail?: {
    toolName?: string;
    description?: string;
    duration?: number;
    error?: string;
    taskId?: string;
    dependsOn?: string[];
  };
  [key: string]: unknown;
}

export type AgentNode = Node<AgentNodeData>;

// Node styles
const nodeBaseClass = 'px-4 py-3 rounded-xl border-2 shadow-sm min-w-[140px] text-center transition-all duration-300';

const statusStyles = {
  pending: 'opacity-60',
  running: 'animate-pulse ring-2 ring-offset-2',
  success: '',
  error: 'ring-2 ring-red-400 ring-offset-2',
  waiting: 'opacity-70',
};

const typeStyles = {
  start: 'bg-blue-50 border-blue-300 text-blue-800',
  plan: 'bg-violet-50 border-violet-300 text-violet-800',
  tool: 'bg-emerald-50 border-emerald-300 text-emerald-800',
  wait: 'bg-amber-50 border-amber-300 text-amber-800',
  decision: 'bg-indigo-50 border-indigo-300 text-indigo-800',
  parallel_task: 'bg-cyan-50 border-cyan-300 text-cyan-800',
  result: 'bg-slate-50 border-slate-300 text-slate-800',
};

const typeIcons = {
  start: Play,
  plan: Brain,
  tool: Wrench,
  wait: Clock,
  decision: GitBranch,
  parallel_task: Layers,
  result: CheckCircle2,
};

// Base Node Component
const BaseNode = memo(({ data, selected }: NodeProps<AgentNode>) => {
  const Icon = typeIcons[data.type];
  const isRunning = data.status === 'running';
  
  return (
    <div className={`${nodeBaseClass} ${typeStyles[data.type]} ${statusStyles[data.status]} ${selected ? 'ring-2 ring-offset-2 ring-violet-400' : ''}`}>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2" />
      
      <div className="flex flex-col items-center gap-2">
        <div className={`p-2 rounded-lg ${isRunning ? 'bg-white/50' : 'bg-white/30'}`}>
          {isRunning ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Icon className="w-5 h-5" />
          )}
        </div>
        
        <div>
          <p className="text-sm font-semibold">{data.label}</p>
          {data.detail?.toolName && (
            <p className="text-xs opacity-70 mt-0.5">{data.detail.toolName}</p>
          )}
          {data.detail?.description && (
            <p className="text-xs opacity-60 mt-0.5 line-clamp-2">{data.detail.description}</p>
          )}
        </div>
        
        {data.status === 'success' && (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute -top-2 -right-2 bg-white rounded-full" />
        )}
        {data.status === 'error' && (
          <XCircle className="w-4 h-4 text-red-500 absolute -top-2 -right-2 bg-white rounded-full" />
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2" />
    </div>
  );
});

BaseNode.displayName = 'BaseNode';

// Specialized Nodes
export const StartNode = memo((props: NodeProps<AgentNode>) => (
  <BaseNode {...props} />
));
StartNode.displayName = 'StartNode';

export const PlanNode = memo((props: NodeProps<AgentNode>) => (
  <BaseNode {...props} />
));
PlanNode.displayName = 'PlanNode';

export const ToolNode = memo((props: NodeProps<AgentNode>) => (
  <BaseNode {...props} />
));
ToolNode.displayName = 'ToolNode';

export const WaitNode = memo((props: NodeProps<AgentNode>) => (
  <div className={`${nodeBaseClass} ${typeStyles.wait} ${statusStyles[props.data.status]} ${props.selected ? 'ring-2 ring-offset-2 ring-violet-400' : ''}`}>
    <Handle type="target" position={Position.Top} className="!w-2 !h-2" />
    <Handle type="target" position={Position.Left} className="!w-2 !h-2" />
    
    <div className="flex flex-col items-center gap-2">
      <div className="p-2 rounded-lg bg-white/30">
        <Clock className="w-5 h-5" />
      </div>
      <p className="text-sm font-semibold">{props.data.label}</p>
    </div>
    
    <Handle type="source" position={Position.Bottom} className="!w-2 !h-2" />
    <Handle type="source" position={Position.Right} className="!w-2 !h-2" />
  </div>
));
WaitNode.displayName = 'WaitNode';

export const DecisionNode = memo((props: NodeProps<AgentNode>) => (
  <div className={`${nodeBaseClass} ${typeStyles.decision} ${statusStyles[props.data.status]} ${props.selected ? 'ring-2 ring-offset-2 ring-violet-400' : ''}`} style={{ transform: 'rotate(45deg)' }}>
    <Handle type="target" position={Position.Top} className="!w-2 !h-2" style={{ transform: 'rotate(-45deg)' }} />
    
    <div className="flex flex-col items-center gap-2" style={{ transform: 'rotate(-45deg)' }}>
      <div className="p-2 rounded-lg bg-white/30">
        <GitBranch className="w-5 h-5" />
      </div>
      <p className="text-sm font-semibold">{props.data.label}</p>
    </div>
    
    <Handle type="source" position={Position.Bottom} className="!w-2 !h-2" style={{ transform: 'rotate(-45deg)' }} />
    <Handle type="source" position={Position.Right} className="!w-2 !h-2" style={{ transform: 'rotate(-45deg)' }} />
  </div>
));
DecisionNode.displayName = 'DecisionNode';

export const ParallelTaskNode = memo((props: NodeProps<AgentNode>) => (
  <BaseNode {...props} />
));
ParallelTaskNode.displayName = 'ParallelTaskNode';

export const ResultNode = memo((props: NodeProps<AgentNode>) => {
  const isSuccess = props.data.status === 'success';
  const Icon = isSuccess ? CheckCircle2 : XCircle;
  
  return (
    <div className={`${nodeBaseClass} ${isSuccess ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'} ${props.selected ? 'ring-2 ring-offset-2 ring-violet-400' : ''}`}>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2" />
      
      <div className="flex flex-col items-center gap-2">
        <div className={`p-2 rounded-lg ${isSuccess ? 'bg-green-100' : 'bg-red-100'}`}>
          <Icon className={`w-6 h-6 ${isSuccess ? 'text-green-600' : 'text-red-600'}`} />
        </div>
        <p className="text-sm font-semibold">{props.data.label}</p>
      </div>
    </div>
  );
});
ResultNode.displayName = 'ResultNode';

// Node types registry
export const nodeTypes = {
  start: StartNode,
  plan: PlanNode,
  tool: ToolNode,
  wait: WaitNode,
  decision: DecisionNode,
  parallel_task: ParallelTaskNode,
  result: ResultNode,
};
