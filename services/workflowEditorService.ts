/**
 * 工作流编辑器服务
 * 处理节点类型、配置、数据流等核心逻辑
 */

import { nodeTypesApi, credentialsApi, workflowApi, executionApi } from './n8nApi';
import { WorkflowNode, WorkflowConnections } from '../types';

export interface NodeTypeInfo {
  name: string;
  displayName: string;
  description: string;
  version: number;
  category: string[];
  defaults: any;
  properties: NodeProperty[];
  credentials?: CredentialType[];
  // 图标字段（参考 n8n 的 SimplifiedNodeType 和 INodeTypeDescription）
  // 可能是 Themed<string> 类型：{ light?: string, dark?: string } | string
  icon?: any; // Themed<string> | string
  iconUrl?: any; // Themed<string> | string
  iconColor?: string; // ThemeIconColor
  badgeIconUrl?: any; // Themed<string> | string
  group?: string[];
  outputs?: any; // 节点输出定义
  codex?: any; // 代码相关配置
}

export interface NodeProperty {
  displayName: string;
  name: string;
  type: string;
  typeOptions?: any;
  default?: any;
  required?: boolean;
  description?: string;
  options?: Array<{ name: string; value: string }>;
  placeholder?: string;
}

export interface CredentialType {
  name: string;
  displayName: string;
  properties: NodeProperty[];
}

export interface NodeExecutionData {
  [nodeName: string]: Array<{
    json: Record<string, any>;
    binary?: Record<string, any>;
  }>;
}

/**
 * 获取所有节点类型，按分类组织
 * 参考 n8n: packages/frontend/@n8n/rest-api-client/src/api/nodeTypes.ts
 * n8n 从 /types/nodes.json 获取节点类型数据，返回 INodeTypeDescription[] 数组
 */
export async function getNodeTypesByCategory(): Promise<Record<string, NodeTypeInfo[]>> {
  try {
    // 调用 n8n API 获取节点类型列表（从 /types/nodes.json）
    const nodeTypes = await nodeTypesApi.list();
    
    // n8n API 返回的是 INodeTypeDescription[] 数组
    // 确保是数组格式
    let typesArray: any[] = [];
    
    if (Array.isArray(nodeTypes)) {
      typesArray = nodeTypes;
    } else if (nodeTypes && typeof nodeTypes === 'object') {
      // 如果是对象，尝试获取值
      typesArray = Object.values(nodeTypes);
    } else {
      console.error('节点类型数据格式不正确:', nodeTypes);
      return {};
    }
    
    // 按分类组织
    const categorized: Record<string, NodeTypeInfo[]> = {};
    
    typesArray.forEach((nodeType: any) => {
      // n8n 节点类型必须有 name 字段（INodeTypeDescription.name）
      // 参考：n8n-workflow 的 INodeTypeDescription 接口
      if (!nodeType.name) {
        console.warn('节点类型缺少 name 字段，跳过:', nodeType);
        return;
      }
      
      // n8n 节点类型的 name 字段是必需的，如 'n8n-nodes-base.httpRequest'
      const nodeName = nodeType.name;
      
      // n8n 使用 codex.categories 进行节点分类
      // 参考 n8n 源码: packages/core/src/nodes-loader/directory-loader.ts
      // Codex 结构: { categories: string[], subcategories: {...}, resources: {...}, alias: string[] }
      let categories: string[] = [];
      
      // 优先使用 codex.categories（n8n 的标准分类方式）
      if (nodeType.codex?.categories && Array.isArray(nodeType.codex.categories) && nodeType.codex.categories.length > 0) {
        categories = nodeType.codex.categories;
      }
      // 如果没有 codex，尝试使用 defaults.category
      else if (nodeType.defaults?.category) {
        categories = Array.isArray(nodeType.defaults.category) 
          ? nodeType.defaults.category 
          : [nodeType.defaults.category];
      }
      // 如果没有，尝试使用 category 字段
      else if (nodeType.category) {
        categories = Array.isArray(nodeType.category) 
          ? nodeType.category 
          : [nodeType.category];
      }
      // 默认分类为 'Other'
      else {
        categories = ['Other'];
      }
      
      categories.forEach((cat: string) => {
        if (!cat) return; // 跳过空分类
        
        if (!categorized[cat]) {
          categorized[cat] = [];
        }
        
        // 转换为 SimplifiedNodeType 格式（参考 n8n 的 getSimplifiedNodeType）
        // packages/frontend/editor-ui/src/features/shared/nodeCreator/composables/useActionsGeneration.ts:341-369
        categorized[cat].push({
          name: nodeName, // n8n 节点类型的唯一标识符（必需）
          displayName: nodeType.displayName || nodeName, // 必需
          description: nodeType.description || '', // 必需
          version: Array.isArray(nodeType.version) 
            ? Math.max(...nodeType.version) 
            : (nodeType.version || 1),
          category: categories,
          defaults: nodeType.defaults || {}, // 必需（可能包含 category）
          properties: nodeType.properties || [],
          credentials: nodeType.credentials || [],
          // SimplifiedNodeType 的图标字段（参考 Interface.ts:497-508）
          icon: nodeType.icon, // Themed<string> | string
          iconUrl: nodeType.iconUrl, // Themed<string> | string
          iconColor: nodeType.iconColor, // ThemeIconColor
          badgeIconUrl: nodeType.badgeIconUrl, // Themed<string> | string
          group: nodeType.group || [], // NodeGroupType[]（必需）
          outputs: nodeType.outputs, // 节点输出定义
          codex: nodeType.codex, // 代码相关配置
        });
      });
    });
    
    console.log('节点类型按分类组织完成:', Object.keys(categorized).length, '个分类');
    return categorized;
  } catch (error) {
    console.error('获取节点类型失败:', error);
    return {};
  }
}

/**
 * 获取单个节点类型的详细信息
 * @param nodeTypeName 节点类型名称
 * @param cachedNodeTypes 可选的缓存节点类型数据，用于快速查找
 */
export async function getNodeTypeDetails(
  nodeTypeName: string,
  cachedNodeTypes?: Record<string, NodeTypeInfo[]>
): Promise<NodeTypeInfo | null> {
  try {
    // 如果提供了缓存的节点类型数据，先从中查找
    if (cachedNodeTypes) {
      for (const category in cachedNodeTypes) {
        const nodeType = cachedNodeTypes[category].find(nt => nt.name === nodeTypeName);
        if (nodeType) {
          return nodeType;
        }
      }
    }

    // 如果缓存中没有，从 API 获取
    const nodeType = await nodeTypesApi.get(nodeTypeName);
    
    // 检查 nodeType 是否为 null
    if (!nodeType) {
      console.warn(`节点类型 ${nodeTypeName} 不存在`);
      return null;
    }
    
    return {
      name: nodeType.name || nodeTypeName,
      displayName: nodeType.displayName || nodeType.name || nodeTypeName,
      description: nodeType.description || '',
      version: nodeType.version || 1,
      category: Array.isArray(nodeType.category) ? nodeType.category : [nodeType.category || 'Other'],
      defaults: nodeType.defaults || {},
      properties: nodeType.properties || [],
      credentials: nodeType.credentials || [],
      icon: nodeType.icon,
      iconUrl: nodeType.iconUrl,
      iconColor: nodeType.iconColor,
      group: nodeType.group || [],
    };
  } catch (error) {
    console.error(`获取节点类型 ${nodeTypeName} 详情失败:`, error);
    return null;
  }
}

/**
 * 生成唯一的节点名称
 * 参考 n8n: packages/frontend/editor-ui/src/app/composables/useUniqueNodeName.ts
 * 只在名称冲突时才添加数字后缀
 */
function generateUniqueNodeName(
  baseName: string,
  existingNodeNames: string[]
): string {
  // 如果名称唯一，直接返回（不添加数字）
  if (!existingNodeNames.includes(baseName)) {
    return baseName;
  }

  // 如果名称已存在，添加数字后缀
  let counter = 1;
  let uniqueName = `${baseName}${counter}`;
  
  while (existingNodeNames.includes(uniqueName)) {
    counter++;
    uniqueName = `${baseName}${counter}`;
  }
  
  return uniqueName;
}

/**
 * 根据节点类型创建默认节点
 * 参考 n8n: packages/frontend/editor-ui/src/app/composables/useCanvasOperations.ts:1000-1037
 */
export function createDefaultNode(
  nodeType: NodeTypeInfo,
  position: [number, number],
  name?: string,
  existingNodes: WorkflowNode[] = []
): WorkflowNode {
  // 生成唯一的节点 ID（使用时间戳和随机字符串）
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substr(2, 9);
  const nodeId = `node-${timestamp}-${randomStr}`;
  
  // 生成节点名称
  // 优先级：1. 传入的 name 2. nodeType.defaults.name 3. nodeType.displayName
  const existingNodeNames = existingNodes.map(n => n.name);
  const baseName = name || 
    (nodeType.defaults?.name as string) || 
    nodeType.displayName || 
    nodeType.name || 
    'Node';
  
  // 使用 uniqueNodeName 确保名称唯一（只在冲突时添加数字）
  const nodeName = generateUniqueNodeName(baseName, existingNodeNames);
  
  return {
    id: nodeId,
    name: nodeName,
    type: nodeType.name,
    typeVersion: nodeType.version,
    position,
    parameters: nodeType.defaults || {},
    credentials: {},
    disabled: false,
  };
}

/**
 * 获取节点的前置节点输出数据
 * 根据 connections 找到连接到当前节点的所有前置节点
 */
export function getPredecessorNodes(
  nodeName: string,
  connections: WorkflowConnections
): string[] {
  const predecessors: string[] = [];
  
  // 遍历所有连接，找到目标为当前节点的连接
  Object.keys(connections).forEach((sourceNodeName) => {
    const sourceConnections = connections[sourceNodeName];
    
    Object.keys(sourceConnections).forEach((outputType) => {
      const targets = sourceConnections[outputType];
      
      if (Array.isArray(targets)) {
        targets.forEach((target) => {
          if (target.node === nodeName) {
            if (!predecessors.includes(sourceNodeName)) {
              predecessors.push(sourceNodeName);
            }
          }
        });
      }
    });
  });
  
  return predecessors;
}

/**
 * 获取节点的后续节点
 */
export function getSuccessorNodes(
  nodeName: string,
  connections: WorkflowConnections
): string[] {
  const successors: string[] = [];
  
  const nodeConnections = connections[nodeName];
  if (!nodeConnections) return successors;
  
  Object.keys(nodeConnections).forEach((outputType) => {
    const targets = nodeConnections[outputType];
    
    if (Array.isArray(targets)) {
      targets.forEach((target) => {
        if (!successors.includes(target.node)) {
          successors.push(target.node);
        }
      });
    }
  });
  
  return successors;
}

/**
 * 构建节点连接
 * 参考 n8n: packages/@n8n/ai-workflow-builder.ee/src/tools/utils/connection.utils.ts:181-226
 * n8n 的连接结构：connections[sourceNodeName][connectionType][sourceOutputIndex] = [{ node, type, index }]
 */
export function buildConnection(
  sourceNodeName: string,
  targetNodeName: string,
  sourceOutputType: string = 'main',
  targetInputType: string = 'main',
  existingConnections: WorkflowConnections = {},
  sourceOutputIndex: number = 0,
  targetInputIndex: number = 0
): WorkflowConnections {
  const newConnections = JSON.parse(JSON.stringify(existingConnections)); // 深拷贝
  
  // 确保源节点存在
  if (!newConnections[sourceNodeName]) {
    newConnections[sourceNodeName] = {};
  }
  
  // 确保连接类型存在
  if (!newConnections[sourceNodeName][sourceOutputType]) {
    newConnections[sourceNodeName][sourceOutputType] = [];
  }
  
  // 确保输出索引数组有足够的元素
  const connectionArray = newConnections[sourceNodeName][sourceOutputType];
  while (connectionArray.length <= sourceOutputIndex) {
    connectionArray.push([]);
  }
  
  // 确保输出索引位置的数组存在
  if (!Array.isArray(connectionArray[sourceOutputIndex])) {
    connectionArray[sourceOutputIndex] = [];
  }
  
  // 检查是否已存在连接
  const existingConnection = connectionArray[sourceOutputIndex].find(
    (conn: any) => conn.node === targetNodeName && conn.index === targetInputIndex
  );
  
  // 如果不存在，添加新连接
  if (!existingConnection) {
    connectionArray[sourceOutputIndex].push({
      node: targetNodeName,
      type: targetInputType,
      index: targetInputIndex,
    });
  }
  
  return newConnections;
}

/**
 * 删除节点连接
 */
export function removeConnection(
  sourceNodeName: string,
  targetNodeName: string,
  sourceOutputType: string = 'main',
  existingConnections: WorkflowConnections
): WorkflowConnections {
  const newConnections = { ...existingConnections };
  
  if (newConnections[sourceNodeName] && newConnections[sourceNodeName][sourceOutputType]) {
    newConnections[sourceNodeName][sourceOutputType] = newConnections[sourceNodeName][sourceOutputType].filter(
      (conn) => !(conn.node === targetNodeName)
    );
    
    // 如果该输出类型没有连接了，删除它
    if (newConnections[sourceNodeName][sourceOutputType].length === 0) {
      delete newConnections[sourceNodeName][sourceOutputType];
    }
  }
  
  // 如果该节点没有连接了，删除它
  if (Object.keys(newConnections[sourceNodeName] || {}).length === 0) {
    delete newConnections[sourceNodeName];
  }
  
  return newConnections;
}

/**
 * 获取所有凭证类型
 */
export async function getAllCredentials(): Promise<any[]> {
  try {
    const credentials = await credentialsApi.list();
    return Array.isArray(credentials) ? credentials : [];
  } catch (error) {
    console.error('获取凭证列表失败:', error);
    return [];
  }
}

/**
 * 获取特定类型的凭证
 */
export async function getCredentialsByType(credentialType: string): Promise<any[]> {
  try {
    const allCredentials = await getAllCredentials();
    return allCredentials.filter((cred) => cred.type === credentialType);
  } catch (error) {
    console.error(`获取 ${credentialType} 类型凭证失败:`, error);
    return [];
  }
}

/**
 * 执行工作流并获取执行日志
 */
export async function executeWorkflow(
  workflowId: string,
  workflowData?: any,
  inputData?: any
): Promise<{
  executionId: string;
  data: NodeExecutionData;
}> {
  try {
    // 传递 workflowData 和 inputData 给 API
    const response = await workflowApi.execute(workflowId, workflowData, inputData);
    
    // n8n 执行返回格式可能不同，需要适配
    return {
      executionId: response.id || response.executionId || Date.now().toString(),
      data: response.data || {},
    };
  } catch (error: any) {
    console.error('执行工作流失败:', error);
    throw new Error(error.response?.data?.message || '执行工作流失败');
  }
}

/**
 * 获取执行历史
 */
export async function getExecutionHistory(workflowId: string, limit: number = 50) {
  try {
    const response = await executionApi.list({
      workflowId,
      limit,
    });
    return response.data || [];
  } catch (error) {
    console.error('获取执行历史失败:', error);
    return [];
  }
}

/**
 * 获取单个执行详情
 */
export async function getExecutionDetails(executionId: string) {
  try {
    const execution = await executionApi.get(executionId);
    return execution;
  } catch (error) {
    console.error('获取执行详情失败:', error);
    return null;
  }
}
