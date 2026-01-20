
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export enum ToolType {
  API = 'API', // External HTTP API
  MCP = 'MCP'  // Model Context Protocol
}

export enum ParameterType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  JSON = 'JSON',
  SELECT = 'SELECT'
}

export interface ToolParameter {
  id: string;
  key: string;
  label: string;
  type: ParameterType;
  required: boolean;
  description?: string;
  options?: string[]; // For SELECT type
  defaultValue?: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'MCP';
  baseUrl: string;
  endpoint: string;
  category: string;
  version: string;
  parameters: ToolParameter[];
  createdBy: string;
  type: ToolType;
  status: 'ACTIVE' | 'DEPRECATED' | 'DRAFT';
  createdAt: string;
}

// Stats for dashboard
export interface SystemStats {
  totalTools: number;
  activeWorkflows: number;
  totalCalls: number;
  avgLatency: number;
}

// --- New Model Types ---

export enum ModelProvider {
  OLLAMA = 'Ollama',
  VLLM = 'vLLM',
  LOCALAI = 'LocalAI',
  OPENAI_COMPATIBLE = 'OpenAI Compatible',
  HUGGINGFACE = 'HuggingFace TGI'
}

export interface ModelDefinition {
  id: string;
  name: string;
  provider: ModelProvider;
  baseUrl: string;
  modelId: string; // The ID used in API calls
  contextWindow: number;
  description?: string;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  latency?: number; // ms
  createdAt: string;
}

// --- Smart Studio Types ---

export type PublishStatus = 'PUBLISHED' | 'DRAFT' | 'SHARED';

// --- n8n Workflow Types ---

/**
 * n8n 工作流节点
 */
export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion?: number;
  position: [number, number];
  parameters?: Record<string, any>;
  credentials?: Record<string, any>;
  notes?: string;
  notesInFlow?: boolean;
  disabled?: boolean;
  continueOnFail?: boolean;
  alwaysOutputData?: boolean;
  executeOnce?: boolean;
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;
  webhookId?: string;
}

/**
 * n8n 工作流连接
 * 格式: { [sourceNodeName]: { [outputType]: { [targetNodeName]: [inputType] } } }
 */
export interface WorkflowConnections {
  [sourceNodeName: string]: {
    [outputType: string]: Array<{
      node: string;
      type: string;
      index?: number;
    }>;
  };
}

/**
 * n8n 工作流设置
 */
export interface WorkflowSettings {
  executionOrder?: 'v1' | 'v2';
  saveDataErrorExecution?: 'all' | 'none';
  saveDataSuccessExecution?: 'all' | 'none';
  saveManualExecutions?: boolean;
  saveExecutionProgress?: boolean;
  callerPolicy?: string;
  errorWorkflow?: string;
  timezone?: string;
  executionTimeout?: number;
  tags?: string[];
}

/**
 * n8n 工作流标签
 */
export interface WorkflowTag {
  id?: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: PublishStatus;
  version: string;
  owner: string; // User ID or Name
  createdAt: string;
  updatedAt: string;
  nodesPreview?: string[]; // Icon names for visualization
  tags?: string[];
  data?: {
    nodes: any[];
    notes: any[];
  };
  lastRunStatus?: 'SUCCESS' | 'FAILURE' | 'NONE'; // New field for publish check
  // n8n 格式字段
  active?: boolean;
  nodes?: WorkflowNode[];
  connections?: WorkflowConnections;
  settings?: WorkflowSettings;
  staticData?: Record<string, any>;
  // UI 扩展字段，不发送到后端
  _ui?: {
    description?: string;
    owner?: string;
    lastRunStatus?: 'SUCCESS' | 'FAILURE' | 'NONE';
  };
}

export interface Assistant {
  id: string;
  name: string;
  description: string;
  status: PublishStatus;
  version: string;
  owner: string;
  modelId: string;
  createdAt: string;
  updatedAt?: string;
  avatar?: string; // Emoji or URL
  tags?: string[];
  lastRunStatus?: 'SUCCESS' | 'FAILURE' | 'NONE';
  data?: any;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  nodesPreview: string[]; // For workflow templates
  type: 'WORKFLOW' | 'ASSISTANT';
}