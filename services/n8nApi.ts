/**
 * n8n API 服务层
 * 直接使用 n8n 的数据结构，不进行转换
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { Workflow, WorkflowNode, WorkflowConnections, WorkflowSettings, WorkflowTag, Assistant } from '../types';

// n8n API 配置
// 后端服务地址（默认 5678 端口）
// 开发环境：使用相对路径通过 Vite 代理（避免跨域 Cookie 问题）
// 生产环境：使用绝对 URL
const getN8nBaseUrl = () => {
  const url = import.meta.env.VITE_N8N_BASE_URL || 'http://localhost:5678';
  // 如果 URL 不包含协议，添加 http://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `http://${url}`;
  }
  return url;
};

// 判断是否为开发环境（Vite 开发服务器）
const isDev = import.meta.env.DEV;
const N8N_BASE_URL = getN8nBaseUrl();

// 开发环境使用相对路径（通过 Vite 代理），生产环境使用绝对 URL
// 注意：相对路径必须以 / 开头，这样 axios 会使用当前域名（localhost:3000），然后通过 Vite 代理转发
const API_BASE_URL = isDev ? '/api/v1' : `${N8N_BASE_URL}/api/v1`;
const REST_BASE_URL = isDev ? '/rest' : `${N8N_BASE_URL}/rest`;

// 创建 axios 实例（用于 API v1）
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30秒超时
  withCredentials: true, // 重要：启用 Cookie 支持，用于 Session 认证
});

// 创建 REST API 客户端（用于登录等操作）
const restClient: AxiosInstance = axios.create({
  baseURL: REST_BASE_URL, // 开发环境：'/rest'（通过 Vite 代理），生产环境：绝对 URL
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true, // 启用 Cookie 支持
});

// REST API 请求拦截器 - 添加认证
restClient.interceptors.request.use(
  (config) => {
    // 优先使用 API Key（如果设置了）
    const apiKey = localStorage.getItem('n8n_api_key');
    if (apiKey) {
      config.headers['X-N8N-API-KEY'] = apiKey;
    } else {
      // 否则使用 Bearer Token（如果设置了）
      const token = localStorage.getItem('n8n_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // 如果没有设置 API Key 或 Token，则依赖 Session Cookie（withCredentials: true）
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// REST API 响应拦截器 - 统一错误处理
restClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;

      switch (status) {
        case 401:
          // 未授权，清除本地存储
          localStorage.removeItem('n8n_token');
          localStorage.removeItem('n8n_api_key');
          localStorage.removeItem('n8n_user');
          console.error('认证失败，请重新登录');
          break;
        case 403:
          console.error('权限不足');
          break;
        case 404:
          console.error('资源不存在');
          break;
        case 500:
          console.error('服务器错误:', data?.message || '后端服务器内部错误');
          break;
        default:
          console.error('请求失败:', data?.message || error.message);
      }
    } else if (error.request) {
      console.error('网络错误，请检查网络连接');
    } else {
      console.error('请求配置错误:', error.message);
    }
    return Promise.reject(error);
  }
);


// 请求拦截器 - 添加认证
// 使用 Session Cookie 认证（withCredentials: true）
// 如果需要 API Key 或 Token，可以通过请求头手动设置
apiClient.interceptors.request.use(
  (config) => {
    // 优先使用 API Key（如果设置了）
    const apiKey = localStorage.getItem('n8n_api_key');
    if (apiKey) {
      config.headers['X-N8N-API-KEY'] = apiKey;
    } else {
      // 否则使用 Bearer Token（如果设置了）
      const token = localStorage.getItem('n8n_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // 如果没有设置 API Key 或 Token，则依赖 Session Cookie（withCredentials: true）
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 统一错误处理
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;

      switch (status) {
        case 401:
          // 未授权，清除本地存储
          localStorage.removeItem('n8n_token');
          localStorage.removeItem('n8n_api_key');
          localStorage.removeItem('n8n_user');
          console.error('认证失败，请重新登录');
          break;
        case 403:
          console.error('权限不足');
          break;
        case 404:
          console.error('资源不存在');
          break;
        case 500:
          console.error('服务器错误');
          break;
        default:
          console.error('请求失败:', data?.message || error.message);
      }
    } else if (error.request) {
      console.error('网络错误，请检查网络连接');
    } else {
      console.error('请求配置错误:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * 移除 UI 扩展字段，只保留 n8n 需要的字段
 */
function sanitizeWorkflow(workflow: Partial<Workflow>): Partial<Workflow> {
  const { _ui, ...n8nWorkflow } = workflow;
  return n8nWorkflow;
}

// 工作流 API
export interface WorkflowListFilter {
  projectId?: string;
  name?: string;
  tags?: string[];
  active?: boolean;
  isArchived?: boolean;
  parentFolderId?: string;
  availableInMCP?: boolean;
  nodeTypes?: string[];
}

export interface WorkflowListOptions {
  skip?: number;
  take?: number;
  sortBy?: string;
}

export interface WorkflowListResponse {
  count: number;
  data: any[]; // WorkflowListResource[] 或 IWorkflowDb[]
}

export const workflowApi = {
  /**
   * 获取工作流列表（包含文件夹，分页）
   * 接口路径：GET /rest/workflows
   * 参考：packages/frontend/editor-ui/src/app/api/workflows.ts:62-76
   */
  getWorkflowsAndFolders: async (
    filter?: WorkflowListFilter,
    options?: WorkflowListOptions,
    includeFolders: boolean = true,
    onlySharedWithMe: boolean = false,
    includeScopes: boolean = false
  ): Promise<WorkflowListResponse> => {
    const params: any = {};
    
    // n8n 后端可能期望布尔值而不是字符串
    if (includeScopes) params.includeScopes = true;
    if (includeFolders) params.includeFolders = true;
    if (onlySharedWithMe) params.onlySharedWithMe = true;
    
    // 将 filter 对象转换为查询参数
    // n8n 后端可能期望 filter 作为 JSON 字符串或嵌套查询参数
    // 这里使用嵌套查询参数的方式，如果后端不支持，可以改为 JSON.stringify
    if (filter) {
      const filterParams: any = {};
      if (filter.projectId !== undefined) filterParams.projectId = filter.projectId;
      if (filter.name !== undefined) filterParams.name = filter.name;
      if (filter.active !== undefined) filterParams.active = filter.active;
      if (filter.isArchived !== undefined) filterParams.isArchived = filter.isArchived;
      if (filter.parentFolderId !== undefined) filterParams.parentFolderId = filter.parentFolderId;
      if (filter.availableInMCP !== undefined) filterParams.availableInMCP = filter.availableInMCP;
      if (filter.tags && filter.tags.length > 0) filterParams.tags = filter.tags;
      if (filter.nodeTypes && filter.nodeTypes.length > 0) filterParams.nodeTypes = filter.nodeTypes;
      
      // 将 filter 对象序列化为 JSON 字符串（n8n 后端通常期望这种方式）
      if (Object.keys(filterParams).length > 0) {
        params.filter = JSON.stringify(filterParams);
      }
    }
    
    if (options) {
      if (options.skip !== undefined) params.skip = options.skip;
      if (options.take !== undefined) params.take = options.take;
      if (options.sortBy) params.sortBy = options.sortBy;
    }
    
    const response = await restClient.get('/workflows', { params });
    return {
      count: response.data.count || 0,
      data: response.data.data || []
    };
  },

  /**
   * 获取工作流列表（简单版本）
   * 接口路径：GET /rest/workflows
   * 参考：packages/frontend/editor-ui/src/app/api/workflows.ts:37-49
   */
  getWorkflows: async (
    filter?: WorkflowListFilter,
    options?: WorkflowListOptions,
    select?: string[],
    includeScopes: boolean = false
  ): Promise<WorkflowListResponse> => {
    const params: any = {};
    
    if (includeScopes) params.includeScopes = true;
    
    // 将 filter 对象转换为查询参数
    if (filter) {
      const filterParams: any = {};
      if (filter.projectId !== undefined) filterParams.projectId = filter.projectId;
      if (filter.name !== undefined) filterParams.name = filter.name;
      if (filter.active !== undefined) filterParams.active = filter.active;
      if (filter.isArchived !== undefined) filterParams.isArchived = filter.isArchived;
      if (filter.parentFolderId !== undefined) filterParams.parentFolderId = filter.parentFolderId;
      if (filter.availableInMCP !== undefined) filterParams.availableInMCP = filter.availableInMCP;
      if (filter.tags && filter.tags.length > 0) filterParams.tags = filter.tags;
      if (filter.nodeTypes && filter.nodeTypes.length > 0) filterParams.nodeTypes = filter.nodeTypes;
      
      // 将 filter 对象序列化为 JSON 字符串
      if (Object.keys(filterParams).length > 0) {
        params.filter = JSON.stringify(filterParams);
      }
    }
    
    if (options) {
      if (options.skip !== undefined) params.skip = options.skip;
      if (options.take !== undefined) params.take = options.take;
      if (options.sortBy) params.sortBy = options.sortBy;
    }
    
    if (select && select.length > 0) {
      params.select = select.join(',');
    }
    
    const response = await restClient.get('/workflows', { params });
    return {
      count: response.data.count || 0,
      data: response.data.data || []
    };
  },

  /**
   * 获取工作流列表（向后兼容的简化版本）
   * 使用 getWorkflowsAndFolders，默认获取所有工作流
   */
  list: async (filters?: { active?: boolean; tags?: string[] }) => {
    const filter: WorkflowListFilter = {};
    if (filters?.active !== undefined) filter.active = filters.active;
    if (filters?.tags && filters.tags.length > 0) filter.tags = filters.tags;
    
    const response = await workflowApi.getWorkflowsAndFolders(filter, undefined, false, false);
    return response.data;
  },

  /**
   * 获取单个工作流详情
   * 接口路径：GET /rest/workflows/:workflowId
   * 参考：packages/frontend/editor-ui/src/app/api/workflows.ts:33-35
   */
  get: async (id: string) => {
    const response = await restClient.get(`/workflows/${id}`);
    // n8n 可能返回 { data: Workflow } 或直接返回 Workflow
    const workflowData = response.data?.data || response.data;
    return workflowData as Workflow;
  },

  /**
   * 创建工作流
   * 接口路径：POST /rest/workflows
   * 直接使用 n8n 格式，自动移除 _ui 字段
   */
  create: async (workflow: Workflow) => {
    const n8nWorkflow = sanitizeWorkflow(workflow);
    const response = await restClient.post('/workflows', n8nWorkflow);
    return response.data as Workflow;
  },

  /**
   * 更新工作流
   * 接口路径：PATCH /rest/workflows/:id?forceSave=true
   * 参考：packages/cli/src/workflows/workflows.controller.ts:351-382
   * 直接使用 n8n 格式，自动移除 _ui 字段
   */
  update: async (id: string, workflow: Partial<Workflow>, options?: { forceSave?: boolean }) => {
    const n8nWorkflow = sanitizeWorkflow(workflow);
    const params: any = {};
    if (options?.forceSave) {
      params.forceSave = 'true';
    }
    const response = await restClient.patch(`/workflows/${id}`, n8nWorkflow, { params });
    return response.data as Workflow;
  },

  /**
   * 删除工作流
   * 接口路径：DELETE /rest/workflows/:id
   */
  delete: async (id: string) => {
    const response = await restClient.delete(`/workflows/${id}`);
    return response.data;
  },

  /**
   * 激活工作流
   * 接口路径：POST /rest/workflows/:id/activate
   */
  activate: async (id: string) => {
    const response = await restClient.post(`/workflows/${id}/activate`);
    return response.data;
  },

  /**
   * 停用工作流
   * 接口路径：POST /rest/workflows/:id/deactivate
   */
  deactivate: async (id: string) => {
    const response = await restClient.post(`/workflows/${id}/deactivate`);
    return response.data;
  },

  /**
   * 执行工作流
   * 接口路径：POST /rest/workflows/:id/run
   * 注意：n8n 使用的端点是 /run 而不是 /execute
   * 参考：packages/cli/src/workflows/workflows.controller.ts:443
   * 参考：packages/frontend/editor-ui/src/app/stores/workflows.store.ts:1653
   * 
   * @param id 工作流 ID
   * @param startRunData 执行请求数据（IStartRunData 格式），如果只传递 workflowData，会自动包装
   * @param inputData 额外的输入数据（已废弃，保留用于兼容性）
   */
  execute: async (id: string, startRunData?: any, inputData?: any) => {
    let requestBody: any;
    
    // 如果 startRunData 已经有 workflowData 字段，说明已经是 IStartRunData 格式
    if (startRunData && startRunData.workflowData) {
      requestBody = {
        workflowData: startRunData.workflowData,
        ...(startRunData.startNodes && { startNodes: startRunData.startNodes }),
        ...(startRunData.destinationNode && { destinationNode: startRunData.destinationNode }),
        ...(startRunData.runData && { runData: startRunData.runData }),
        ...(startRunData.triggerToStartFrom && { triggerToStartFrom: startRunData.triggerToStartFrom }),
        ...(startRunData.dirtyNodeNames && { dirtyNodeNames: startRunData.dirtyNodeNames }),
        ...(startRunData.agentRequest && { agentRequest: startRunData.agentRequest }),
      };
      
      // 处理 settings，确保 null 被转换为 undefined
      if (requestBody.workflowData && requestBody.workflowData.settings === null) {
        requestBody.workflowData.settings = undefined;
      }
    } else if (startRunData) {
      // 如果只传递了 workflowData 对象（向后兼容）
      requestBody = {
        workflowData: startRunData,
      };
    } else {
      // 如果没有提供 workflowData，需要先获取工作流数据
      const workflow = await workflowApi.get(id);
      requestBody = {
        workflowData: workflow,
      };
    }
    
    // 合并 inputData（如果提供，用于向后兼容）
    if (inputData) {
      requestBody = {
        ...requestBody,
        ...inputData,
      };
    }
    
    const response = await restClient.post(`/workflows/${id}/run`, requestBody);
    return response.data;
  },

  /**
   * 获取激活的工作流列表
   * 接口路径：GET /rest/active-workflows
   * 参考：packages/frontend/editor-ui/src/app/api/workflows.ts:78-80
   */
  getActiveWorkflows: async (): Promise<string[]> => {
    const response = await restClient.get('/active-workflows');
    return response.data || [];
  },

  /**
   * 根据节点类型获取工作流
   * 接口路径：POST /rest/workflows/with-node-types
   * 参考：packages/frontend/editor-ui/src/app/api/workflows.ts:51-60
   */
  getWorkflowsWithNodesIncluded: async (nodeTypes: string[]): Promise<WorkflowListResponse> => {
    const response = await restClient.post('/workflows/with-node-types', { nodeTypes });
    return {
      count: response.data.count || 0,
      data: response.data.data || []
    };
  },
};

// Assistant API 接口定义
export interface AssistantListFilter {
  name?: string;
  tags?: string[];
  status?: string;
  isArchived?: boolean;
  projectId?: string;
}

export interface AssistantListOptions {
  skip?: number;
  take?: number;
  sortBy?: string;
}

export interface AssistantListResponse {
  count: number;
  data: Assistant[];
}

// Assistant API
export const assistantApi = {
  /**
   * 获取助手列表
   * 接口路径：GET /rest/assistant/all
   */
  list: async (
    filter?: AssistantListFilter,
    options?: AssistantListOptions
  ): Promise<AssistantListResponse> => {
    const params: any = {};
    
    // 将 filter 对象转换为查询参数
    if (filter) {
      const filterParams: any = {};
      if (filter.name !== undefined) filterParams.name = filter.name;
      if (filter.status !== undefined) filterParams.status = filter.status;
      if (filter.isArchived !== undefined) filterParams.isArchived = filter.isArchived;
      if (filter.projectId !== undefined) filterParams.projectId = filter.projectId;
      if (filter.tags && filter.tags.length > 0) filterParams.tags = filter.tags;
      
      // 将 filter 对象序列化为 JSON 字符串
      if (Object.keys(filterParams).length > 0) {
        params.filter = JSON.stringify(filterParams);
      }
    }
    
    if (options) {
      if (options.skip !== undefined) params.skip = options.skip;
      if (options.take !== undefined) params.take = options.take;
      if (options.sortBy) params.sortBy = options.sortBy;
    }
    
    const response = await restClient.get('/assistant/all', { params });
    return {
      count: response.data.count || 0,
      data: response.data.data || []
    };
  },

  /**
   * 获取单个助手详情
   * 接口路径：GET /rest/assistant/:id
   */
  get: async (id: string) => {
    const response = await restClient.get(`/assistant/${id}`);
    return response.data as Assistant;
  },

  /**
   * 创建助手
   * 接口路径：POST /rest/assistant
   * 请求体格式：
   * {
   *   "name": "助手名称",
   *   "discription": "描述",  // 注意是 discription 不是 description
   *   "body": {  // 工作流对象
   *     "name": "助手名称",
   *     "nodes": [...],
   *     "connections": {...},
   *     "active": false,
   *     "settings": {...},
   *     "tags": [],
   *     "versionId": ""
   *   }
   * }
   */
  create: async (assistant: {
    name: string;
    discription?: string;
    body: {
      name: string;
      nodes: any[];
      connections: any;
      active?: boolean;
      settings?: any;
      tags?: string[];
      versionId?: string;
      pinData?: any;
    };
  }) => {
    try {
      // 调试：打印发送的数据
      console.log('创建助手请求数据:', JSON.stringify(assistant, null, 2));
      const response = await restClient.post('/assistant', assistant);
      console.log('创建助手响应:', response.data);
      return response.data as Assistant;
    } catch (error: any) {
      console.error('创建助手 API 错误:', error);
      console.error('请求数据:', JSON.stringify(assistant, null, 2));
      console.error('错误响应:', error.response?.data);
      throw error;
    }
  },

  /**
   * 更新助手
   * 接口路径：PUT /rest/assistant/:id
   */
  update: async (id: string, assistant: Partial<Assistant>) => {
    const response = await restClient.put(`/assistant/${id}`, assistant);
    return response.data as Assistant;
  },

  /**
   * 删除助手
   * 接口路径：DELETE /rest/assistant/:id
   */
  delete: async (id: string) => {
    const response = await restClient.delete(`/assistant/${id}`);
    return response.data;
  },

  /**
   * 归档助手
   * 接口路径：POST /rest/assistant/:id/archive
   */
  archive: async (id: string) => {
    const response = await restClient.post(`/assistant/${id}/archive`);
    return response.data;
  },

  /**
   * 取消归档助手
   * 接口路径：POST /rest/assistant/:id/unarchive
   */
  unarchive: async (id: string) => {
    const response = await restClient.post(`/assistant/${id}/unarchive`);
    return response.data;
  },
};

// 执行历史 API
export interface Execution {
  id: string;
  finished: boolean;
  mode: string;
  retryOf?: string;
  retrySuccessId?: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  workflowData?: Workflow;
  data?: any;
  status: 'success' | 'error' | 'waiting' | 'running';
}

export const executionApi = {
  /**
   * 获取执行历史列表
   */
  list: async (filters?: {
    workflowId?: string;
    status?: string;
    limit?: number;
    cursor?: string;
  }) => {
    const response = await apiClient.get('/executions', { params: filters });
    return response.data;
  },

  /**
   * 获取单个执行详情
   */
  get: async (id: string) => {
    const response = await apiClient.get(`/executions/${id}`);
    return response.data as Execution;
  },

  /**
   * 删除执行记录
   */
  delete: async (id: string) => {
    const response = await apiClient.delete(`/executions/${id}`);
    return response.data;
  },
};

// 节点类型 API
export interface NodeType {
  name: string;
  displayName: string;
  description: string;
  version: number;
  defaults: any;
  properties: any[];
  credentials?: any[];
}

export const nodeTypesApi = {
  /**
   * 获取所有节点类型
   * n8n 使用静态 JSON 文件：/types/nodes.json
   * 参考：packages/frontend/@n8n/rest-api-client/src/api/nodeTypes.ts:37-38
   */
  list: async () => {
    // n8n 节点类型存储在静态文件 /types/nodes.json
    // 参考：packages/frontend/@n8n/rest-api-client/src/api/nodeTypes.ts:37-38
    // 开发环境：使用相对路径通过 Vite 代理（vite.config.ts 已配置 /types 代理）
    // 生产环境：使用绝对 URL
    const nodeTypesUrl = isDev ? '/types/nodes.json' : `${N8N_BASE_URL}/types/nodes.json`;
    
    try {
      const response = await axios.get(nodeTypesUrl, { 
        withCredentials: true,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      // 验证返回的是 JSON 数据而不是 HTML
      if (typeof response.data === 'string' && response.data.trim().startsWith('<!DOCTYPE')) {
        console.error('节点类型 API 返回了 HTML 而不是 JSON，可能是代理配置错误:', nodeTypesUrl);
        console.error('请检查 vite.config.ts 中的 /types 代理配置');
        throw new Error('节点类型 API 路径配置错误：返回了 HTML 而不是 JSON');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('获取节点类型失败:', {
        url: nodeTypesUrl,
        status: error.response?.status,
        statusText: error.response?.statusText,
        isDev,
      });
      throw error;
    }
  },

  /**
   * 获取单个节点类型详情
   * 注意：n8n 没有单独的端点获取单个节点类型，需要从完整列表中查找
   */
  get: async (nodeType: string) => {
    // 先获取所有节点类型，然后查找指定的
    const allNodeTypes = await nodeTypesApi.list();
    const typesArray = Array.isArray(allNodeTypes) ? allNodeTypes : Object.values(allNodeTypes);
    return typesArray.find((type: any) => type.name === nodeType) || null;
  },
};

// 凭证 API
export interface Credential {
  id?: string;
  name: string;
  type: string;
  data: any;
  nodesAccess?: Array<{ nodeType: string }>;
}

export const credentialsApi = {
  /**
   * 获取凭证列表
   * n8n 使用 REST API：GET /rest/credentials
   * 参考：packages/frontend/editor-ui/src/features/credentials/credentials.store.ts
   */
  list: async (filter?: { projectId?: string }, includeScopes = true, onlySharedWithMe = false) => {
    const params: any = {};
    if (filter?.projectId) {
      params.projectId = filter.projectId;
    }
    if (includeScopes !== undefined) {
      params.includeScopes = includeScopes;
    }
    if (onlySharedWithMe !== undefined) {
      params.onlySharedWithMe = onlySharedWithMe;
    }
    const response = await restClient.get('/credentials', { params });
    // n8n 返回格式可能是 { data: Credential[] } 或直接是数组
    return response.data?.data || response.data || [];
  },

  /**
   * 获取单个凭证
   * 接口路径：GET /rest/credentials/:id
   */
  get: async (id: string) => {
    const response = await restClient.get(`/credentials/${id}`);
    return response.data?.data || response.data;
  },

  /**
   * 获取凭证数据（解密后的数据，用于编辑）
   * 接口路径：GET /rest/credentials/:id
   */
  getData: async (id: string) => {
    const response = await restClient.get(`/credentials/${id}`);
    return response.data?.data || response.data;
  },

  /**
   * 创建凭证
   * 接口路径：POST /rest/credentials
   */
  create: async (credential: Credential) => {
    const response = await restClient.post('/credentials', credential);
    return response.data?.data || response.data;
  },

  /**
   * 更新凭证
   * 接口路径：PATCH /rest/credentials/:id
   */
  update: async (id: string, credential: Partial<Credential>) => {
    const response = await restClient.patch(`/credentials/${id}`, credential);
    return response.data?.data || response.data;
  },

  /**
   * 删除凭证
   * 接口路径：DELETE /rest/credentials/:id
   */
  delete: async (id: string) => {
    await restClient.delete(`/credentials/${id}`);
  },
};

// 凭证类型 API
export interface CredentialType {
  name: string;
  displayName: string;
  properties: Array<{
    name: string;
    displayName: string;
    type: string;
    required?: boolean;
    placeholder?: string;
    description?: string;
    default?: any;
  }>;
  documentationUrl?: string;
}

export const credentialTypesApi = {
  /**
   * 获取所有凭证类型
   * n8n 使用静态 JSON 文件：/types/credentials.json
   * 参考：packages/frontend/editor-ui/src/features/credentials/credentials.api.ts:14-17
   */
  list: async (): Promise<CredentialType[]> => {
    const credentialTypesUrl = isDev ? '/types/credentials.json' : `${N8N_BASE_URL}/types/credentials.json`;
    
    try {
      const response = await axios.get(credentialTypesUrl, { 
        withCredentials: true,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      // 验证返回的是 JSON 数据而不是 HTML
      if (typeof response.data === 'string' && response.data.trim().startsWith('<!DOCTYPE')) {
        console.error('凭证类型 API 返回了 HTML 而不是 JSON，可能是代理配置错误:', credentialTypesUrl);
        throw new Error('凭证类型 API 路径配置错误：返回了 HTML 而不是 JSON');
      }
      
      // n8n 返回的格式可能是数组或对象
      const typesArray = Array.isArray(response.data) ? response.data : Object.values(response.data);
      return typesArray;
    } catch (error: any) {
      console.error('获取凭证类型失败:', {
        url: credentialTypesUrl,
        status: error.response?.status,
        statusText: error.response?.statusText,
        isDev,
      });
      throw error;
    }
  },

  /**
   * 获取单个凭证类型
   */
  get: async (credentialTypeName: string): Promise<CredentialType | null> => {
    const allTypes = await credentialTypesApi.list();
    return allTypes.find((type: any) => type.name === credentialTypeName) || null;
  },
};

// 标签 API
export interface Tag {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export const tagsApi = {
  /**
   * 获取所有标签列表
   * 接口路径：GET /rest/tags
   * 参考：packages/cli/src/controllers/tags.controller.ts:22-26
   */
  list: async (): Promise<Tag[]> => {
    const response = await restClient.get('/tags');
    // n8n 可能返回 { data: Tag[] } 或直接返回 Tag[]
    return response.data?.data || response.data || [];
  },

  /**
   * 获取单个标签
   * 接口路径：GET /rest/tags/:id
   */
  get: async (id: string): Promise<Tag> => {
    const response = await restClient.get(`/tags/${id}`);
    return response.data;
  },

  /**
   * 创建标签
   * 接口路径：POST /rest/tags
   * 参考：packages/cli/src/controllers/tags.controller.ts:28-39
   */
  create: async (tag: { name: string }): Promise<Tag> => {
    const response = await restClient.post('/tags', tag);
    return response.data;
  },

  /**
   * 更新标签
   * 接口路径：PATCH /rest/tags/:id
   * 参考：packages/cli/src/controllers/tags.controller.ts:41-52
   */
  update: async (id: string, tag: Partial<Tag>): Promise<Tag> => {
    const response = await restClient.patch(`/tags/${id}`, tag);
    return response.data;
  },

  /**
   * 删除标签
   * 接口路径：DELETE /rest/tags/:id
   * 参考：packages/cli/src/controllers/tags.controller.ts:54-59
   */
  delete: async (id: string): Promise<void> => {
    await restClient.delete(`/tags/${id}`);
  },
};

// 认证 API
// 请求去重：避免并发请求时发送多个相同的请求
let getCurrentUserPromise: Promise<any> | null = null;
let lastUserFetchTime = 0;
const USER_CACHE_TTL = 5000; // 5秒缓存，避免频繁请求

export const authApi = {
  /**
   * 获取当前用户信息
   * 优先从后端 API 获取完整用户信息（包括 globalRole）
   * 如果 API 调用失败，则从 localStorage 读取缓存
   * 添加了请求去重机制，避免并发请求
   */
  getCurrentUser: async () => {
    try {
      // 先检查 localStorage 中是否有用户信息
      const cachedUserStr = localStorage.getItem('n8n_user');
      let cachedUser = null;
      if (cachedUserStr) {
        try {
          cachedUser = JSON.parse(cachedUserStr);
        } catch (e) {
          // 解析失败，清除无效数据
          localStorage.removeItem('n8n_user');
        }
      }

      // 检查是否有正在进行的请求，如果有则复用
      const now = Date.now();
      if (getCurrentUserPromise && (now - lastUserFetchTime) < USER_CACHE_TTL) {
        return await getCurrentUserPromise;
      }

      // 创建新的请求 Promise
      getCurrentUserPromise = (async () => {
        try {
          // 尝试从后端 API 获取完整用户信息
          // GET /rest/login 返回当前登录用户的完整信息（需要 Session Cookie）
          const response = await restClient.get('/login', {
            // 确保发送 Cookie
            withCredentials: true,
          });
          // n8n API 返回格式：{ data: { id, role, ... } }
          // 需要从 response.data.data 中获取用户信息
          const userData = response.data?.data || response.data;
          if (userData && userData.id) {
            const user = userData;
            // 保存完整用户信息到 localStorage（包括 role）
            localStorage.setItem('n8n_user', JSON.stringify(user));
            lastUserFetchTime = now;
            return user;
          }
        } catch (apiError: any) {
          // API 调用失败（可能是 401 未登录或跨域 Cookie 问题）
          // 静默处理，不抛出错误，使用缓存
          if (apiError.response?.status !== 401 && apiError.response?.status !== 403) {
            console.warn('获取用户信息失败，使用缓存:', apiError.message);
          }
          // 如果是 401/403，说明未登录或 Cookie 未发送，使用缓存
        }

        // 回退到从 localStorage 读取
        if (cachedUser && cachedUser.id) {
          return cachedUser;
        }
        return null;
      })();

      // 等待请求完成
      const result = await getCurrentUserPromise;
      
      // 清除 Promise（请求完成后）
      getCurrentUserPromise = null;
      
      return result;
    } catch (error) {
      // 解析失败，清除无效数据
      localStorage.removeItem('n8n_user');
      getCurrentUserPromise = null;
      return null;
    }
  },

  /**
   * 登出
   */
  logout: async () => {
    try {
      // 尝试调用登出端点
      await restClient.post('/logout');
    } catch (error) {
      // 忽略错误，继续清理本地存储
    } finally {
      // 清理本地存储
      localStorage.removeItem('n8n_token');
      localStorage.removeItem('n8n_api_key');
      localStorage.removeItem('n8n_user');
    }
  },

  /**
   * 从 URL 参数中获取用户信息
   * 支持 HashRouter（参数在 hash 中）和普通路由（参数在 search 中）
   */
  getRedirectParams: () => {
    let userId: string | null = null;
    let userName: string | null = null;
    
    // 从 hash 中解析参数（HashRouter 的情况：#/path?param=value）
    const hash = window.location.hash;
    if (hash.includes('?')) {
      const hashQuery = hash.split('?')[1];
      const hashParams = new URLSearchParams(hashQuery);
      userId = hashParams.get('userId');
      userName = hashParams.get('userName');
    }
    
    // 如果 hash 中没有，尝试从 search 中获取
    if (!userId) {
      const urlParams = new URLSearchParams(window.location.search);
      userId = urlParams.get('userId');
      userName = urlParams.get('userName') || userName;
    }
    
    return { userId, userName };
  },

  /**
   * 外部登录 - 通过 URL 参数自动登录
   * 对应 n8n 的 performAutoLogin 功能
   * 步骤：
   * 1. 创建用户（如果不存在）- POST /rest/external-auth/create-user
   * 2. 登录 - POST /rest/external-auth/login（返回用户信息）
   */
  performAutoLogin: async (userId: string, userName: string) => {
    try {
      // 步骤1: 创建用户（如果不存在）
      // POST /rest/external-auth/create-user
      const firstName = userName || userId.split('@')[0];
      const lastName = userId.split('@')[0];
      // 从环境变量读取 authSecret，如果没有则使用默认值
      const authSecret = import.meta.env.VITE_N8N_AUTH_SECRET || 'n8n-secret-key-2025';

      await restClient.post('/external-auth/create-user', {
        userId: userId.trim(),
        firstName: firstName,
        lastName: lastName,
        authSecret: authSecret,
      });

      // 步骤2: 登录
      // POST /rest/external-auth/login
      // 这个接口会设置 Session Cookie 并返回用户信息
      const loginResponse = await restClient.post('/external-auth/login', {
        userIdentifier: userId.trim(),
        authSecret: authSecret,
      });

      // 检查登录响应，确保登录成功
      if (!loginResponse.data || loginResponse.status !== 200) {
        throw new Error('登录失败：无法建立 Session');
      }

      // 直接使用登录响应中的用户信息
      // 登录接口应该返回用户数据，不需要再调用 GET /rest/login
      let user = loginResponse.data.user || loginResponse.data;
      
      // 如果登录响应中没有完整的用户信息（包括 role），尝试调用 GET /rest/login 获取
      // 注意：此时 Cookie 应该已经设置，但可能需要等待一下
      if (!user || !user.role) {
        try {
          // 等待一小段时间确保 Cookie 已设置
          await new Promise(resolve => setTimeout(resolve, 100));
          // 再次尝试获取完整用户信息
          const userResponse = await restClient.get('/login');
          // n8n API 返回格式：{ data: { id, role, ... } }
          const userData = userResponse.data?.data || userResponse.data;
          if (userData && userData.id) {
            user = userData;
          }
        } catch (error) {
          // 如果获取失败，使用登录响应中的用户信息
          console.warn('无法获取完整用户信息，使用登录响应中的信息');
        }
      }
      
      if (user && user.id) {
        // 保存完整用户信息到 localStorage（包括 globalRole）
        localStorage.setItem('n8n_user', JSON.stringify(user));
        
        // 清理 URL 参数，保留 hash 路径但移除查询参数
        const hash = window.location.hash;
        const cleanHash = hash.split('?')[0] || '#/';
        const cleanUrl = window.location.origin + cleanHash;
        window.history.replaceState({}, '', cleanUrl);
        return user;
      }

      throw new Error('登录成功但响应中未包含用户信息');
    } catch (error: any) {
      console.error('自动登录失败:', error);
      throw new Error(error.response?.data?.message || '自动登录失败');
    }
  },
};

// 导出默认实例（如果需要直接使用）
export default apiClient;
