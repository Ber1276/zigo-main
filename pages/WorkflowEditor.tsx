import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../App';
import { Workflow, ToolDefinition, ToolType, WorkflowNode as N8nWorkflowNode, WorkflowConnections as WorkflowConnectionsType } from '../types';
import { TagInput } from '../components/TagInput';
import { TagManagementModal } from '../components/TagManagementModal';
import { NodeConfigPanel } from '../components/NodeConfigPanel';
import { CredentialConfigModal } from '../components/CredentialConfigModal';
import { ExecutionLogPanel, ExecutionLog } from '../components/ExecutionLogPanel';
import { WorkflowEditorLayout } from '../components/workflow';
import { WorkflowConnectionsRenderer } from '../components/WorkflowConnections';
import { NodesListPanel } from '../components/workflow/NodesListPanel';
import { NodeSelectorModal } from '../components/workflow/NodeSelectorModal';
import { NodeIcon } from '../components/workflow/NodeIcon';
import { CanvasNodeRenderer } from '../components/workflow/CanvasNodeRenderer';
import { CanvasNodeDefault } from '../components/workflow/CanvasNodeDefault';
import { CanvasNode } from '../components/workflow/canvas/CanvasNode';
import type { CanvasNodeData } from '../components/workflow/canvas/canvas.types';
import { 
  getNodeTypesByCategory, 
  getNodeTypeDetails, 
  createDefaultNode,
  buildConnection,
  removeConnection,
  getPredecessorNodes,
  executeWorkflow,
  getExecutionHistory,
  getAllCredentials,
  getCredentialsByType,
  NodeTypeInfo 
} from '../services/workflowEditorService';
import { workflowApi, nodeTypesApi, tagsApi } from '../services/n8nApi';
import { GoogleGenAI } from "@google/genai";
import { 
  ArrowLeft,
  Share2,
  ChevronDown,
  Settings,
  Bell,
  Plus,
  Edit2,
  Search,
  FileText,
  Wand2,
  Maximize,
  ZoomIn,
  ZoomOut,
  Eraser,
  Play,
  ChevronUp,
  MoreHorizontal,
  Zap,
  Undo2,
  Copy,
  Download,
  Link,
  FileJson,
  History,
  Sliders,
  Clock,
  Webhook,
  FileInput,
  ArrowRightCircle,
  MessageSquare,
  FolderOpen,
  MousePointerClick,
  UploadCloud,
  ArrowRight,
  Palette,
  Trash2,
  MoreVertical,
  Filter,
  Globe,
  Cpu,
  Loader2,
  ArrowDownRight,
  Focus,
  Target,
  Save,
  X,
  FilePlus,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  Rocket,
  SlidersHorizontal,
  Lock,
  Unlock,
  AlertTriangle,
  Database,
  Mail,
  Sparkles,
  RefreshCcw,
  Send,
  Terminal,
  AlignLeft,
  ChevronsRight,
  Info,
  Upload,
  Bot,
  ArrowUp,
  GripVertical,
  ExternalLink,
  PlusCircle,
  MinusCircle,
  Image as ImageIcon,
  ChevronLeft,
  UserPlus
} from 'lucide-react';

// Icon Mapping for Serialization
const ICON_MAP: Record<string, React.ElementType> = {
  MousePointerClick,
  Clock,
  Webhook,
  FileInput,
  ArrowRightCircle,
  MessageSquare,
  FolderOpen,
  Globe,
  Cpu,
  Zap,
  Database,
  Mail
};

// Mock Trigger Data for Add Panel
const TRIGGERS = [
    { iconName: 'MousePointerClick', icon: MousePointerClick, title: '手动触发', desc: '在智构中点击按钮时运行，适合快速入门' },
    { iconName: 'Clock', icon: Clock, title: '在应用事件时', desc: '当在Telegram、Notion或Airtable等应用发生某些事件时运行流' },
    { iconName: 'Clock', icon: Clock, title: '按计划', desc: '每天、每小时或自定义间隔运行流' },
    { iconName: 'Webhook', icon: Webhook, title: '在Webhook调用时', desc: '在收到HTTP请求时运行流' },
    { iconName: 'FileInput', icon: FileInput, title: '在表单提交时', desc: '在智构中生成Web表单并将它们的响应传递到工作流' },
    { iconName: 'ArrowRightCircle', icon: ArrowRightCircle, title: '由另一个工作流执行时', desc: '当由不同工作流的“执行工作流”节点调用时，运行流' },
    { iconName: 'MessageSquare', icon: MessageSquare, title: '在聊天消息时', desc: '当用户发送聊天消息时运行流。用于AI节点' },
    { iconName: 'FolderOpen', icon: FolderOpen, title: '其他方式...', desc: '在工作流错误、文件更改等情况下运行流' },
];

interface Note {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple';
}

interface WorkflowNode {
    id: string;
    type: string;
    label: string;
    x: number;
    y: number;
    icon?: string; // Changed from React.ReactNode to string for serialization
    toolId?: string;
    hasError?: boolean;
}

// Mock Users for Share Feature
const MOCK_AVAILABLE_USERS = [
    { id: 'u3', name: '张三', email: 'zhangsan@example.com' },
    { id: 'u4', name: '王五', email: 'wangwu@example.com' },
    { id: 'u5', name: '赵六', email: 'zhaoliu@example.com' }
];

const NOTE_COLORS = {
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', header: 'text-yellow-700' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', header: 'text-blue-700' },
  green: { bg: 'bg-green-50', border: 'border-green-200', header: 'text-green-700' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', header: 'text-pink-700' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', header: 'text-purple-700' },
};

const WorkflowEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { workflows, setWorkflows, tools, assistants, setIsUnsavedChanges, isUnsavedChanges, tags, addTag, deleteTag, renameTag, registerSaveHandler, requestNavigation } = useAppContext();
  
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [isLogOpen, setIsLogOpen] = useState(true);
  
  // Sidebar & Modal States
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  
  // Node Selector Modal State
  const [isNodeSelectorOpen, setIsNodeSelectorOpen] = useState(false);
  const [selectedNodeType, setSelectedNodeType] = useState<any>(null);
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);
  const [workflowVersionId, setWorkflowVersionId] = useState<string | undefined>(undefined);
  const [isWorkflowSettingsModalOpen, setIsWorkflowSettingsModalOpen] = useState(false);
  
  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalMode, setShareModalMode] = useState<'LIST' | 'INVITE'>('LIST');
  const [userToAdd, setUserToAdd] = useState('');
  const [removeUserConfirm, setRemoveUserConfirm] = useState<string | null>(null);
  
  // Invite State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'USER'>('USER');

  const [sharedUsers, setSharedUsers] = useState([
      { id: 'u1', name: 'Admin', email: 'admin@system.com', role: 'OWNER' },
      { id: 'u2', name: '李四 (验证用户)', email: 'lisi@test.com', role: 'USER' }
  ]);
  
  // Workflow Settings Form State
  const [wfSettings, setWfSettings] = useState({
      executionOrder: 'v1',
      errorWorkflow: 'none',
      callerWorkflow: 'none',
      callerIds: '',
      saveFailedExec: 'default',
      saveSuccessExec: 'default',
      saveManualExec: 'default',
      saveProgress: 'default',
      timeoutEnabled: true,
      timeout: { h: '', m: '', s: '' },
      savedTime: 0
  });

  // Notification / Message Log Popover State
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const messageButtonRef = useRef<HTMLButtonElement>(null);
  const messagePanelRef = useRef<HTMLDivElement>(null);
  
  // Edit Description / Publish Confirm Modal
  const [isDescModalOpen, setIsDescModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [publishName, setPublishName] = useState('');
  const [publishDesc, setPublishDesc] = useState('');
  const [isAiPolishing, setIsAiPolishing] = useState(false);
  const [notExecutedWarning, setNotExecutedWarning] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Import / Export / Duplicate States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportTab, setExportTab] = useState<'JSON' | 'URL'>('JSON');
  const [isImportUrlModalOpen, setIsImportUrlModalOpen] = useState(false);
  const [isImportJsonModalOpen, setIsImportJsonModalOpen] = useState(false);
  const [importUrlInput, setImportUrlInput] = useState('');
  const [importJsonText, setImportJsonText] = useState('');
  const [showOverwriteAlert, setShowOverwriteAlert] = useState(false);
  const [pendingImportPayload, setPendingImportPayload] = useState<{ nodes: WorkflowNode[], notes: Note[] } | null>(null);
  const [duplicateSuccessModal, setDuplicateSuccessModal] = useState<{ isOpen: boolean, newId: string, newName: string }>({ isOpen: false, newId: '', newName: '' });

  // New Version States
  const [isSaveVersionModalOpen, setIsSaveVersionModalOpen] = useState(false);
  const [nextVersionInput, setNextVersionInput] = useState('');
  const [switchVersionModal, setSwitchVersionModal] = useState<{ isOpen: boolean, newId: string, newVersion: string }>({ isOpen: false, newId: '', newVersion: '' });

  const [viewMode, setViewMode] = useState<'EDITOR' | 'EXECUTE'>('EDITOR');
  const [executionStatus, setExecutionStatus] = useState<'NONE' | 'RUNNING' | 'SUCCESS' | 'FAILURE'>('NONE');
  
  // Canvas State & History
  const [nodes, setNodes] = useState<WorkflowNode[]>([]); 
  const [notes, setNotes] = useState<Note[]>([]); 
  const [history, setHistory] = useState<{nodes: WorkflowNode[], notes: Note[]}[]>([]);
  
  // n8n 工作流节点和连接
  const [n8nNodes, setN8nNodes] = useState<N8nWorkflowNode[]>([]);
  const [connections, setConnections] = useState<WorkflowConnectionsType>({});
  
  // Viewport State (Infinite Canvas)
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Dragging Logic for Nodes & Notes
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  
  // Connection Dragging State
  const [connectingFrom, setConnectingFrom] = useState<{ 
    nodeId: string; 
    nodeName: string; 
    type: 'output';
    connectionType?: string;
    index?: number;
  } | null>(null);
  const [connectingTo, setConnectingTo] = useState<{ 
    nodeId: string; 
    nodeName: string; 
    type: 'input';
    connectionType?: string;
    index?: number;
  } | null>(null);
  const [tempConnectionEnd, setTempConnectionEnd] = useState<{ x: number; y: number } | null>(null);
  
  // Menu for notes
  const [activeNoteMenu, setActiveNoteMenu] = useState<string | null>(null);

  // Resizing Logic for Notes
  const [resizingNoteId, setResizingNoteId] = useState<string | null>(null);
  const resizeStart = useRef({ x: 0, y: 0 });
  const initialNoteSize = useRef({ w: 0, h: 0 });

  // Panel States
  const [activePanel, setActivePanel] = useState<'NONE' | 'ADD_NODE' | 'AI_SIDEBAR' | 'GLOBAL_SEARCH'>('NONE');
  const [aiMode, setAiMode] = useState<'ask' | 'build'>('ask');
  
  // AI Sidebar States
  const [aiSidebarWidth, setAiSidebarWidth] = useState(300);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [askMessages, setAskMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [buildMessages, setBuildMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [askInput, setAskInput] = useState('');
  const [buildInput, setBuildInput] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);
  
  // Search state for Add Node panel
  const [nodeSearch, setNodeSearch] = useState('');

  // Execution State (Editor Mode)
  const [editorExecuting, setEditorExecuting] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [selectedTriggerNodeName, setSelectedTriggerNodeName] = useState<string | undefined>(undefined);
  const [waitingForWebhook, setWaitingForWebhook] = useState(false);
  const [currentExecution, setCurrentExecution] = useState<ExecutionLog | null>(null);

  // 节点类型状态 - 类似 n8n 的 nodeTypesStore
  const [nodeTypesByCategory, setNodeTypesByCategory] = useState<Record<string, NodeTypeInfo[]>>({});
  const [nodeTypesMap, setNodeTypesMap] = useState<Map<string, NodeTypeInfo>>(new Map());
  const [allNodeTypes, setAllNodeTypes] = useState<NodeTypeInfo[]>([]);
  const [loadingNodeTypes, setLoadingNodeTypes] = useState(false);

  // Execution Mode Specific States
  const [executions, setExecutions] = useState<ExecutionLog[]>([]);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [executionInput, setExecutionInput] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Track last loaded ID to prevent overwriting canvas when saving (updating workflows dependency)
  const lastLoadedId = useRef<string | null>(null);

  // Derived Read-Only State
  const isReadOnly = useMemo(() => workflow?.status === 'PUBLISHED', [workflow]);

  // Derived Selected Execution - 优先使用 currentExecution
  const selectedExecution = useMemo(() => {
    if (currentExecution) {
      return currentExecution;
    }
    return executions.find(e => e.id === selectedExecutionId) || (executions.length > 0 ? executions[0] : null);
  }, [currentExecution, executions, selectedExecutionId]);

  // Keep selectedExecutionId in sync if it becomes invalid or select first by default
  useEffect(() => {
      if (!selectedExecutionId && executions.length > 0) {
          setSelectedExecutionId(executions[0].id);
      }
  }, [executions, selectedExecutionId]);

  // Helper to show toast
  const showToast = (message: string, type: 'success' | 'error') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
  };

  // Sidebar Resizing Logic
  const startResizingSidebar = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizingSidebar(true);
  }, []);

  useEffect(() => {
      if (!isResizingSidebar) return;
      
      const handleResizeMove = (e: MouseEvent) => {
          const newWidth = window.innerWidth - e.clientX - 16;
          setAiSidebarWidth(Math.max(250, Math.min(800, newWidth)));
      };

      const handleResizeUp = () => {
          setIsResizingSidebar(false);
      };

      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeUp);
      
      return () => {
          window.removeEventListener('mousemove', handleResizeMove);
          window.removeEventListener('mouseup', handleResizeUp);
      };
  }, [isResizingSidebar]);

  // Effect to show toast on version switch
  useEffect(() => {
      if (location.state?.versionSwitched && location.state?.version) {
          showToast(`已成功切换至版本 v${location.state.version}`, 'success');
          // Clear state to avoid showing again on refresh
          window.history.replaceState({}, '');
      }
  }, [location.state]);

  // Helper to check read-only and warn
  const checkReadOnly = useCallback(() => {
      if (isReadOnly) {
          showToast("已发布的工作流无法修改，请先下架或另存为新版本。", 'error');
          return true;
      }
      return false;
  }, [isReadOnly]);

  // Handle URL params for auto-opening panels and initial prompt
  useEffect(() => {
      const params = new URLSearchParams(location.search);
      const openBuild = params.get('openBuild') === 'true';

      if (openBuild) {
          setActivePanel('AI_SIDEBAR');
          setAiMode('build');
      }
      
      // Initialize AI chat with prompt from Home page if available
      if (location.state?.initialPrompt) {
          // If in Build mode (Zigo Generation), populate Build chat
          if (openBuild && buildMessages.length === 0) {
              setBuildMessages([
                  { role: 'user', content: location.state.initialPrompt },
                  { role: 'assistant', content: '收到，已为您生成基础工作流。您可以继续描述需求来完善它。' }
              ]);
          } 
          // If normally asking, populate Ask chat
          else if (!openBuild && askMessages.length === 0 && activePanel === 'AI_SIDEBAR' && aiMode === 'ask') {
              setAskMessages([
                  { role: 'user', content: location.state.initialPrompt },
                  { role: 'assistant', content: '收到，已为您生成基础工作流。' }
              ]);
          }
      }
  }, [location.search, location.state]); // Reduced deps to prevent loops

  // Save Logic Wrapper - 保存为 n8n 格式
  const handleSave = useCallback(async () => {
      if (checkReadOnly()) return;
      if (!workflow) {
          showToast('工作流数据不存在，无法保存', 'error');
          return;
      }
      
      // 如果是新工作流（id 为 'new' 或 undefined），需要先创建
      const isNewWorkflow = !id || id === 'new' || id === 'undefined';
      
      try {
          console.log('=== 开始保存工作流 ===');
          console.log('工作流 ID:', id);
          console.log('n8nNodes 数量:', n8nNodes.length);
          console.log('nodes 数量:', nodes.length);
          console.log('n8nNodes 数据:', n8nNodes);
          console.log('nodes 数据:', nodes);
          
          // 将旧格式节点转换为 n8n 格式
          // 优先使用 n8nNodes，如果为空则从 nodes 转换
          let n8nNodesToSave: N8nWorkflowNode[] = [];
          
          if (n8nNodes.length > 0) {
              // 使用 n8nNodes，但更新位置信息
              n8nNodesToSave = n8nNodes.map((n) => {
              const oldNode = nodes.find(old => old.id === n.id);
              if (oldNode) {
                  return {
                      ...n,
                      position: [oldNode.x, oldNode.y] as [number, number],
                  };
              }
                  // 如果节点有 position，保持原样
                  if (n.position && Array.isArray(n.position) && n.position.length >= 2) {
              return n;
                  }
                  // 如果没有位置，使用默认位置
                  return {
                      ...n,
                      position: [100, 100] as [number, number],
                  };
              });
          } else if (nodes.length > 0) {
              // 如果 n8nNodes 为空，从 nodes 转换
              console.warn('n8nNodes 为空，从 nodes 转换');
              n8nNodesToSave = nodes.map((node) => {
                  // 尝试从 nodeTypesByCategory 获取节点类型信息
                  const nodeType = getNodeType(node.type);
                  return {
                      id: node.id,
                      name: node.label || node.id,
                      type: node.type,
                      typeVersion: nodeType?.version || 1,
                      position: [node.x, node.y] as [number, number],
                      parameters: {},
                  } as N8nWorkflowNode;
              });
          }
          
          console.log('转换后的 n8nNodesToSave:', n8nNodesToSave);
          console.log('节点位置信息:', n8nNodesToSave.map(n => ({ id: n.id, position: n.position })));
          
          // 构建 n8n 工作流对象
          const n8nWorkflow: Partial<Workflow> = {
              name: workflow.name,
              active: workflow.status === 'PUBLISHED',
              nodes: n8nNodesToSave,
              connections: connections,
              settings: workflow.settings || {
                  executionOrder: 'v1',
                  saveDataErrorExecution: 'all',
                  saveDataSuccessExecution: 'all',
                  saveManualExecutions: true,
                  saveExecutionProgress: false,
              },
              staticData: workflow.staticData || {},
          };
          
          console.log('准备保存的工作流数据:', {
              name: n8nWorkflow.name,
              nodesCount: n8nWorkflow.nodes?.length,
              connectionsCount: Object.keys(n8nWorkflow.connections || {}).length,
              nodes: n8nWorkflow.nodes,
          });
          
          // 如果有描述，添加到 settings
          if (workflow.description) {
              n8nWorkflow.settings = {
                  ...n8nWorkflow.settings,
                  description: workflow.description,
              } as any;
          }
          
          // 如果有标签，转换为 n8n 格式（标签需要是标签 ID 数组）
          if (workflow.tags && workflow.tags.length > 0) {
              try {
                  // n8n 期望标签是标签 ID 数组，需要将标签名称转换为 ID
                  const allTags = await tagsApi.list();
                  const tagIds: string[] = [];
                  
                  for (const tagName of workflow.tags) {
                      // 查找标签 ID
                      const tag = allTags.find((t: any) => (t.name || t) === tagName);
                      if (tag && tag.id) {
                          tagIds.push(tag.id);
                      } else {
                          // 如果标签不存在，先创建它
                          try {
                              const newTag = await tagsApi.create({ name: tagName });
                              if (newTag.id) {
                                  tagIds.push(newTag.id);
                              }
                          } catch (createError: any) {
                              // 如果创建失败（可能是标签已存在），尝试再次获取
                              if (createError.response?.status === 409) {
                                  const refreshedTags = await tagsApi.list();
                                  const foundTag = refreshedTags.find((t: any) => (t.name || t) === tagName);
                                  if (foundTag && foundTag.id) {
                                      tagIds.push(foundTag.id);
                                  }
                              }
                          }
                      }
                  }
                  
                  if (tagIds.length > 0) {
                      (n8nWorkflow as any).tags = tagIds;
                  }
              } catch (error) {
                  console.error('转换标签失败:', error);
                  // 如果转换失败，不设置标签，让工作流保存继续
              }
          }
          
          // 调用 n8n API 保存
          let savedWorkflow: any;
          if (isNewWorkflow) {
              // 新工作流：直接创建
              console.log('创建新工作流:', n8nWorkflow);
              savedWorkflow = await workflowApi.create(n8nWorkflow as Workflow);
              // 更新 URL 和 ID
              if (savedWorkflow.id) {
                  navigate(`/editor/${savedWorkflow.id}`, { replace: true });
                  // 更新本地状态中的 ID
                  const updatedWf = {
                      ...workflow,
                      id: savedWorkflow.id,
                      nodes: n8nNodesToSave,
                      connections: connections,
                      updatedAt: new Date().toISOString(),
                  };
                  setWorkflow(updatedWf);
                  setWorkflows(prev => [...prev, updatedWf]);
                  setIsUnsavedChanges(false);
                  showToast('工作流创建成功', 'success');
                  return;
              }
          } else {
              // 现有工作流：尝试更新，如果失败则创建
              try {
                  // 如果有 versionId，添加到更新数据中
                  if (workflowVersionId) {
                      (n8nWorkflow as any).versionId = workflowVersionId;
                  }
                  
                  savedWorkflow = await workflowApi.update(id, n8nWorkflow, { forceSave: true });
                  
                  console.log('工作流保存成功，返回数据:', savedWorkflow);
                  console.log('保存后的节点数据:', (savedWorkflow as any).nodes);
                  
                  // 更新后保存新的 versionId
                  if ((savedWorkflow as any).versionId) {
                      setWorkflowVersionId((savedWorkflow as any).versionId);
                  }
                  
                  // 更新 n8nNodes 和 nodes 状态，确保与后端同步
                  if (savedWorkflow.nodes && Array.isArray(savedWorkflow.nodes)) {
                      setN8nNodes(savedWorkflow.nodes);
                      // 转换节点用于显示
                      const convertedNodes = savedWorkflow.nodes
                          .filter(n => n && n.id && n.position && Array.isArray(n.position) && n.position.length >= 2)
                          .map((n) => {
                              const x = typeof n.position[0] === 'number' ? n.position[0] : parseFloat(n.position[0]) || 0;
                              const y = typeof n.position[1] === 'number' ? n.position[1] : parseFloat(n.position[1]) || 0;
                              return {
                                  id: n.id,
                                  type: n.type,
                                  label: n.name || n.type || '未命名节点',
                                  x: x,
                                  y: y,
                                  icon: 'Zap',
                                  hasError: false,
                              };
                          });
                      setNodes(convertedNodes);
                      console.log('更新后的节点状态:', convertedNodes);
                  }
              } catch (updateError: any) {
                  // 如果更新失败（404），可能是新工作流，尝试创建
                  if (updateError.response?.status === 404) {
                      console.warn('工作流不存在，尝试创建新工作流:', id);
                      savedWorkflow = await workflowApi.create({
                          ...n8nWorkflow,
                          id: id,
                      } as Workflow);
                      // 更新ID（如果后端返回了新ID）
                      if (savedWorkflow.id && savedWorkflow.id !== id) {
                          navigate(`/editor/${savedWorkflow.id}`, { replace: true });
                      }
                  } else {
                      throw updateError; // 其他错误继续抛出
                  }
              }
          }
          
          // 更新本地状态
          const updatedWf = {
              ...workflow,
              nodes: n8nNodesToSave,
              connections: connections,
              updatedAt: new Date().toISOString(),
          };
          setWorkflow(updatedWf);
          setWorkflows(prev => prev.map(w => w.id === workflow.id ? updatedWf : w));
          setIsUnsavedChanges(false);
          showToast('保存成功', 'success');
      } catch (error: any) {
          console.error('保存工作流失败:', error);
          showToast(`保存失败: ${error.response?.data?.message || error.message}`, 'error');
      }
  }, [workflow, id, n8nNodes, nodes, connections, checkReadOnly, setWorkflows, setIsUnsavedChanges]);
  
  
  const handleNodeConfigSave = (updatedNode: N8nWorkflowNode) => {
      setN8nNodes(prev => prev.map(n => n.id === updatedNode.id ? updatedNode : n));
      setShowNodeConfig(false);
      setIsUnsavedChanges(true);
      showToast('节点配置已更新', 'success');
  };
  
  // 凭证配置处理
  const handleOpenCredentialModal = (credType: string, nodeId: string) => {
      setCredentialType(credType);
      setCredentialNodeId(nodeId);
      setShowCredentialModal(true);
      setShowNodeConfig(false);
  };
  
  const handleCredentialSave = (credentialId: string) => {
      if (configNode) {
          const updatedNode: N8nWorkflowNode = {
              ...configNode,
              credentials: {
                  ...configNode.credentials,
                  [credentialType]: {
                      id: credentialId,
                  },
              },
          };
          handleNodeConfigSave(updatedNode);
      }
      setShowCredentialModal(false);
  };

  // 获取节点类型 - 类似 n8n 的 nodeTypesStore.getNodeType()
  // 注意：这个函数需要在使用它的逻辑之前定义
  const getNodeType = useCallback((nodeTypeName: string): NodeTypeInfo | null => {
    return nodeTypesMap.get(nodeTypeName) || allNodeTypes.find(nt => nt.name === nodeTypeName) || null;
  }, [nodeTypesMap, allNodeTypes]);
  
  // 获取所有触发节点
  const triggerNodes = useMemo(() => {
    return n8nNodes.filter((node) => {
      const nodeType = getNodeType(node.type);
      // 判断是否为触发节点：节点类型包含 'trigger' 或 group 包含 'trigger'
      return nodeType?.group?.includes('trigger') || 
             node.type?.toLowerCase().includes('trigger') ||
             false;
    });
  }, [n8nNodes]);

  // 执行工作流
  const handleExecuteWorkflow = async () => {
      if (!workflow || !id) return;
      if (n8nNodes.length === 0) {
          showToast('画布为空，无法执行', 'error');
          return;
      }
      
      if (editorExecuting) {
          return; // 防止重复执行
      }
      
      setEditorExecuting(true);
      setExecutionStatus('RUNNING');
      setWaitingForWebhook(false);
      setIsLogOpen(true);
      
      // 创建执行日志
      const executionLog: ExecutionLog = {
          id: `exec-${Date.now()}`,
          status: 'running',
          startTime: new Date().toISOString(),
          logs: [
              {
                  id: 'log-1',
                  timestamp: new Date().toISOString(),
                  level: 'info',
                  message: '开始执行工作流...',
              },
          ],
      };
      setCurrentExecution(executionLog);
      
      try {
          // 先保存工作流（确保最新状态）
          await handleSave();
          
          // 构建工作流数据用于执行
          const n8nNodesToSave: N8nWorkflowNode[] = n8nNodes.map((n) => {
              const oldNode = nodes.find(old => old.id === n.id);
              if (oldNode) {
                  return {
                      ...n,
                      position: [oldNode.x, oldNode.y] as [number, number],
                  };
              }
              return n;
          });
          
          const workflowData = {
              id: id,
              name: workflow?.name || '未命名工作流',
              active: workflow?.status === 'PUBLISHED',
              nodes: n8nNodesToSave,
              connections: connections,
              settings: workflow?.settings || {},
              staticData: workflow?.staticData || {},
          };
          
          // 构建执行请求数据（参考 n8n 的 IStartRunData）
          // n8n 的 /workflows/:id/run 期望的格式：
          // {
          //   workflowData: {...},  // 工作流定义
          //   startNodes?: [...],   // 起始节点（可选）
          //   triggerToStartFrom?: {...},  // 触发节点数据（可选）
          //   destinationNode?: string,  // 目标节点（部分执行）
          //   runData?: {...},  // 运行数据（部分执行）
          //   pushRef?: string,  // WebSocket 连接引用
          //   streamingEnabled?: boolean,  // 是否启用流式输出
          // }
          const startRunData: any = {
              workflowData: workflowData,
              // 如果指定了触发节点，添加 triggerToStartFrom
              ...(selectedTriggerNodeName && {
                  triggerToStartFrom: {
                      name: selectedTriggerNodeName,
                  },
              }),
          };
          
          // 调用 workflowApi.execute（使用 n8n 的 /workflows/:id/run 端点）
          // 注意：workflowApi.execute 内部会将 workflowData 包装在 runData 中
          const response = await workflowApi.execute(id, startRunData);
          
          // 检查响应
          if (response.waitingForWebhook) {
              setWaitingForWebhook(true);
              const webhookLog: ExecutionLog = {
                  ...executionLog,
                  status: 'waiting',
                  logs: [
                      ...executionLog.logs,
                      {
                          id: 'log-webhook',
                          timestamp: new Date().toISOString(),
                          level: 'info',
                          message: '工作流正在等待 Webhook 触发...',
                      },
                  ],
              };
              setCurrentExecution(webhookLog);
              setExecutionStatus('RUNNING');
              showToast('工作流正在等待 Webhook 触发', 'success');
              return;
          }
          
          // 如果有 executionId，可以轮询执行状态
          const executionId = response.executionId || response.id;
          if (executionId) {
              // 更新执行日志 ID
              const updatedLog: ExecutionLog = {
                  ...executionLog,
                  id: executionId,
                  logs: [
                      ...executionLog.logs,
                      {
                          id: 'log-2',
                          timestamp: new Date().toISOString(),
                          level: 'info',
                          message: `工作流已启动，执行ID: ${executionId}`,
                      },
                  ],
              };
              setCurrentExecution(updatedLog);
              
              // TODO: 可以在这里添加轮询逻辑或 WebSocket 监听来获取实时执行状态
              // 目前先等待一段时间后获取最终结果
              setTimeout(async () => {
                  try {
                      // 尝试获取执行结果（如果有 executionApi）
                      const executionDetails = await getExecutionHistory(id, 1);
                      if (executionDetails && executionDetails.length > 0) {
                          const latestExecution = executionDetails[0];
                          const hasError =
                            latestExecution.data?.resultData?.error ||
                            latestExecution.status === 'error' ||
                            latestExecution.status === 'crashed';
                          const finalLog: ExecutionLog = {
                              ...updatedLog,
                              status: hasError
                                ? 'error'
                                : latestExecution.status === 'success'
                                  ? 'success'
                                  : 'running',
                              endTime: latestExecution.stoppedAt || latestExecution.updatedAt,
                              duration: latestExecution.duration || 
                                       (latestExecution.stoppedAt && latestExecution.startedAt 
                                        ? new Date(latestExecution.stoppedAt).getTime() - 
                                          new Date(latestExecution.startedAt).getTime()
                                        : undefined),
                              data: latestExecution.data,
                              logs: [
                                  ...updatedLog.logs,
                                  {
                                      id: 'log-final',
                                      timestamp: new Date().toISOString(),
                                      level: hasError ? 'error' : 'info',
                                      message: hasError
                                          ? `工作流执行失败: ${latestExecution.data?.resultData?.error?.message || latestExecution.error?.message || '未知错误'}`
                                          : '工作流执行成功',
                                  },
                              ],
                          };
                          setCurrentExecution(finalLog);
                          setExecutionStatus(hasError ? 'FAILURE' : 'SUCCESS');
                          if (!hasError) {
                              showToast('工作流执行成功', 'success');
                          } else {
                              showToast(
                                `执行失败: ${latestExecution.data?.resultData?.error?.message || latestExecution.error?.message || '未知错误'}`,
                                'error',
                              );
                          }
                      }
                  } catch (pollError) {
                      console.error('获取执行结果失败:', pollError);
                      // 如果无法获取结果，保持运行状态
                  }
              }, 2000);
          } else {
              // 如果没有 executionId，使用返回的状态和错误信息判断
              const hasError =
                response.status && response.status !== 'success' ||
                response.data?.resultData?.error;

              const updatedLog: ExecutionLog = {
                  ...executionLog,
                  status: hasError ? 'error' : 'success',
                  endTime: new Date().toISOString(),
                  duration: Date.now() - new Date(executionLog.startTime).getTime(),
                  logs: [
                      ...executionLog.logs,
                      {
                          id: 'log-2',
                          timestamp: new Date().toISOString(),
                          level: hasError ? 'error' : 'info',
                          message: hasError
                            ? `工作流执行失败: ${response.data?.resultData?.error?.message || '未知错误'}`
                            : '工作流执行成功',
                      },
                  ],
                  data: response.data,
              };
              
              setCurrentExecution(updatedLog);
              setExecutionStatus(hasError ? 'FAILURE' : 'SUCCESS');
              showToast(
                hasError
                  ? `执行失败: ${response.data?.resultData?.error?.message || '未知错误'}`
                  : '工作流执行成功',
                hasError ? 'error' : 'success',
              );
          }
      } catch (error: any) {
          console.error('执行工作流失败:', error);
          
          // 提取错误信息
          let errorMessage = '执行失败';
          if (error.response?.data?.message) {
              errorMessage = error.response.data.message;
          } else if (error.message) {
              errorMessage = error.message;
          }
          
          // 检查是否是凭证相关错误
          if (errorMessage.includes('credentials') || errorMessage.includes('credential')) {
              // 尝试提取节点名称
              const credentialMatch = errorMessage.match(/for "([^"]+)"/);
              if (credentialMatch) {
                  errorMessage = `节点缺少必需的凭证: ${credentialMatch[1]}。请配置节点的凭证后再执行。`;
              } else {
                  errorMessage = '工作流中包含需要凭证的节点，但凭证未配置。请检查并配置所有必需的凭证后再执行。';
              }
          }
          
          const errorLog: ExecutionLog = {
              ...executionLog,
              status: 'error',
              endTime: new Date().toISOString(),
              duration: Date.now() - new Date(executionLog.startTime).getTime(),
              logs: [
                  ...executionLog.logs,
                  {
                      id: 'log-error',
                      timestamp: new Date().toISOString(),
                      level: 'error',
                      message: errorMessage,
                  },
              ],
              data: error.response?.data || null,
          };
          
          setCurrentExecution(errorLog);
          setExecutionStatus('FAILURE');
          showToast(`执行失败: ${errorMessage}`, 'error');
      } finally {
          // 保持 editorExecuting 为 true 直到执行真正完成（用于等待 Webhook）
          if (!waitingForWebhook) {
              setEditorExecuting(false);
          }
      }
  };

  // Register Save Handler to Context
  useEffect(() => {
      registerSaveHandler(handleSave);
      return () => registerSaveHandler(() => {}); // Cleanup
  }, [handleSave, registerSaveHandler]);

  const handleAskSend = () => {
      if (!askInput.trim()) return;
      
      const newMsg = { role: 'user' as const, content: askInput };
      setAskMessages(prev => [...prev, newMsg]);
      setAskInput('');
      
      setTimeout(() => {
          setAskMessages(prev => [...prev, { role: 'assistant' as const, content: '收到您的具体问题，我会分析当前工作流配置并给出建议。' }]);
      }, 1000);
  };

  const handleBuildSubmit = () => {
      if (!buildInput.trim()) return;
      if (checkReadOnly()) return;

      const userText = buildInput;
      // Add User Message to Build Chat
      setBuildMessages(prev => [...prev, { role: 'user', content: userText }]);
      setBuildInput('');
      setIsBuilding(true);
      
      setTimeout(() => {
          let newNodeType = 'Action';
          let newNodeLabel = 'AI Generated Node';
          let newNodeIcon = 'Zap';
          let responseText = '构建完成！已添加新节点。';

          const lowerInput = userText.toLowerCase();
          if (lowerInput.includes('webhook')) { 
              newNodeType = 'Trigger'; newNodeLabel = 'Webhook'; newNodeIcon = 'Webhook'; 
              responseText = '已添加 Webhook 触发器。';
          }
          else if (lowerInput.includes('mail') || lowerInput.includes('邮件')) { 
              newNodeType = 'Action'; newNodeLabel = 'Send Email'; newNodeIcon = 'Mail'; 
              responseText = '已添加邮件发送节点。';
          }
          // ... other logic ...

          // Calculate position
          const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
          const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
          
          const newNode: WorkflowNode = {
              id: `node-ai-${Date.now()}`,
              type: newNodeType,
              label: newNodeLabel,
              x: centerX + (Math.random() * 100 - 50),
              y: centerY + (Math.random() * 100 - 50),
              icon: newNodeIcon,
              hasError: false
          };

          if (!isReadOnly) {
              setNodes(prev => [...prev, newNode]);
              recordHistory();
              setBuildMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
          } else {
              setBuildMessages(prev => [...prev, { role: 'assistant', content: '无法在只读模式下构建。' }]);
          }

          setIsBuilding(false);
      }, 1500);
  };

  const handleChipClick = (text: string) => {
      setBuildInput(text);
  };

  const handleSaveSettings = () => {
      setIsWorkflowSettingsModalOpen(false);
      showToast('设置已保存', 'success');
  };

  // --- Share Logic ---
  const handleShare = () => {
      setShareModalMode('LIST');
      setUserToAdd('');
      setIsShareModalOpen(true);
  };

  const handleSwitchToInvite = () => {
      setInviteEmail('');
      setInviteRole('USER');
      setShareModalMode('INVITE');
  };

  const handleAddSystemUser = () => {
      if (!userToAdd) return;
      const user = MOCK_AVAILABLE_USERS.find(u => u.id === userToAdd);
      if (user) {
          setSharedUsers(prev => [...prev, { ...user, role: 'USER' }]); // Default role USER for system add
          setUserToAdd('');
          showToast(`已添加用户 ${user.name}`, 'success');
      }
  };

  const handleInviteUser = () => {
      if (!inviteEmail.trim()) {
          showToast('请输入有效的电子邮件地址', 'error');
          return;
      }
      
      const newUser = {
          id: `u-${Date.now()}`,
          name: inviteEmail.split('@')[0], // Simple name extraction
          email: inviteEmail,
          role: inviteRole
      };

      setSharedUsers(prev => [...prev, newUser]);
      showToast(`已邀请用户 ${inviteEmail}`, 'success');
      setShareModalMode('LIST');
  };

  const handleRemoveClick = (userId: string) => {
      setRemoveUserConfirm(userId);
  };

  const confirmRemoveUser = () => {
      if (removeUserConfirm) {
          setSharedUsers(prev => prev.filter(u => u.id !== removeUserConfirm));
          setRemoveUserConfirm(null);
          showToast('用户已移除', 'success');
      }
  };

  const handleSaveShare = () => {
      setIsShareModalOpen(false);
      showToast('共享设置已保存', 'success');
  };

  // 凭证状态 - 类似 n8n 的 credentialsStore
  const [allCredentials, setAllCredentials] = useState<any[]>([]);
  const [credentialsByType, setCredentialsByType] = useState<Record<string, any[]>>({});
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  
  // 节点选择状态 - 类似 n8n 的 setNodeSelected
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  
  // 节点配置状态
  const [configNode, setConfigNode] = useState<N8nWorkflowNode | null>(null);
  const [configNodeTypeInfo, setConfigNodeTypeInfo] = useState<NodeTypeInfo | null>(null);
  const [showNodeConfig, setShowNodeConfig] = useState(false);
  
  // 凭证配置状态
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [credentialType, setCredentialType] = useState('');
  const [credentialNodeId, setCredentialNodeId] = useState('');
  
  // 获取特定类型的凭证 - 类似 n8n 的 credentialsStore.getCredentialsByType()
  const getCredentialsByTypeForNode = useCallback(async (credentialType: string): Promise<any[]> => {
    // 先尝试从缓存获取
    if (credentialsByType[credentialType]) {
      return credentialsByType[credentialType];
    }
    
    // 如果缓存中没有，从API获取
    try {
      const creds = await getCredentialsByType(credentialType);
      // 更新缓存
      setCredentialsByType(prev => ({
        ...prev,
        [credentialType]: creds,
      }));
      return creds;
    } catch (error) {
      console.error(`获取 ${credentialType} 类型凭证失败:`, error);
      return [];
    }
  }, [credentialsByType]);
  
  // 节点配置处理 - 优化：优先使用缓存的节点类型
  const handleNodeConfig = useCallback((node: N8nWorkflowNode) => {
    setConfigNode(node);
    
    // 先尝试从缓存获取节点类型
    const cachedTypeInfo = getNodeType(node.type);
    if (cachedTypeInfo) {
      setConfigNodeTypeInfo(cachedTypeInfo);
      setShowNodeConfig(true);
    } else {
      // 如果缓存中没有，则从API获取
      getNodeTypeDetails(node.type).then((info) => {
        if (info) {
          setConfigNodeTypeInfo(info);
          // 更新缓存
          setNodeTypesMap(prev => {
            const newMap = new Map(prev);
            newMap.set(info.name, info);
            return newMap;
          });
        }
        setShowNodeConfig(true);
      }).catch((error) => {
        console.error(`获取节点类型 ${node.type} 详情失败:`, error);
        setShowNodeConfig(true); // 即使失败也打开配置面板
      });
    }
  }, [getNodeType]);
  
  // 节点选择处理 - 类似 n8n 的 onSetNodeSelected
  const onSetNodeSelected = useCallback((nodeId?: string) => {
    if (nodeId === undefined || nodeId === null) {
      // 取消选择
      setSelectedNodeId(null);
      setSelectedNodeIds([]);
      setConfigNode(null);
      setShowNodeConfig(false);
    } else {
      // 选择单个节点
      const node = n8nNodes.find(n => n.id === nodeId);
      if (node) {
        setSelectedNodeId(nodeId);
        setSelectedNodeIds([nodeId]);
        // 自动打开节点配置面板
        handleNodeConfig(node);
      }
    }
  }, [n8nNodes, handleNodeConfig]);
  
  // 加载节点类型 - 类似 n8n 的 nodeTypesStore.getNodeTypes()
  useEffect(() => {
    const loadNodeTypes = async () => {
      setLoadingNodeTypes(true);
      try {
        const categorized = await getNodeTypesByCategory();
        setNodeTypesByCategory(categorized);
        
        // 构建扁平化的节点类型列表和映射
        const flatList: NodeTypeInfo[] = [];
        const map = new Map<string, NodeTypeInfo>();
        
        Object.values(categorized).forEach(categoryNodes => {
          categoryNodes.forEach(nodeType => {
            flatList.push(nodeType);
            map.set(nodeType.name, nodeType);
          });
        });
        
        setAllNodeTypes(flatList);
        setNodeTypesMap(map);
      } catch (error) {
        console.error('加载节点类型失败:', error);
        showToast('加载节点类型失败', 'error');
      } finally {
        setLoadingNodeTypes(false);
      }
    };
    
    // 只有在节点类型为空时才加载
    if (allNodeTypes.length === 0 && !loadingNodeTypes) {
    loadNodeTypes();
    }
  }, []);
  
  // 加载所有凭证 - 类似 n8n 的 credentialsStore.fetchAllCredentials()
  useEffect(() => {
    const loadCredentials = async () => {
      setLoadingCredentials(true);
      try {
        const credentials = await getAllCredentials();
        setAllCredentials(credentials);
        
        // 按类型组织凭证
        const byType: Record<string, any[]> = {};
        credentials.forEach(cred => {
          if (!byType[cred.type]) {
            byType[cred.type] = [];
          }
          byType[cred.type].push(cred);
        });
        setCredentialsByType(byType);
      } catch (error) {
        console.error('加载凭证列表失败:', error);
        // 不显示错误提示，因为凭证可能不是必需的
      } finally {
        setLoadingCredentials(false);
      }
    };
    
    // 只有在凭证为空时才加载
    if (allCredentials.length === 0 && !loadingCredentials) {
      loadCredentials();
    }
  }, []);

  // Initial Load - 从 n8n API 加载工作流
  useEffect(() => {
    const loadWorkflow = async () => {
      // 检查 id 是否存在
      if (!id || id === 'undefined') {
        // 新工作流：创建空工作流
        const newWf: Workflow = {
          id: 'new',
          name: '未命名工作流',
          description: '',
          status: 'DRAFT',
          version: '1.0.0',
          owner: 'User',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          active: false,
          nodes: [],
          connections: {},
          settings: {
            executionOrder: 'v1',
            saveDataErrorExecution: 'all',
            saveDataSuccessExecution: 'all',
            saveManualExecutions: true,
            saveExecutionProgress: false,
          },
          staticData: {},
          tags: [],
        };
        setWorkflow(newWf);
        setDescDraft('');
        setN8nNodes([]);
        setConnections({});
        setNodes([]);
        setNotes([]);
        lastLoadedId.current = 'new';
        return;
      }
      
      try {
        console.log('=== 开始加载工作流 ===');
        console.log('工作流 ID:', id);
        console.log('当前 URL:', window.location.href);
        
        // 从 n8n API 加载工作流
        let n8nWorkflow = await workflowApi.get(id);
        
        console.log('后端返回的原始数据:', n8nWorkflow);
        
        // n8n API 可能返回 { data: {...} } 格式，需要提取
        if (n8nWorkflow && (n8nWorkflow as any).data) {
          console.log('检测到嵌套数据结构，提取 data 字段');
          n8nWorkflow = (n8nWorkflow as any).data;
        }
        
        console.log('提取后的工作流数据:', n8nWorkflow);
        console.log('工作流 ID:', n8nWorkflow?.id);
        console.log('工作流节点数量:', n8nWorkflow?.nodes?.length || 0);
        console.log('工作流节点数据:', n8nWorkflow?.nodes);
        console.log('工作流连接数据:', n8nWorkflow?.connections);
        
        if (!n8nWorkflow) {
          console.error('后端返回的工作流数据为空');
          showToast('工作流数据为空', 'error');
          return;
        }
        
        if (!n8nWorkflow.id) {
          console.error('后端返回的工作流缺少 ID，完整数据:', n8nWorkflow);
          console.error('数据键:', Object.keys(n8nWorkflow));
          showToast('工作流数据无效：缺少 ID', 'error');
          return;
        }
        
        // 提取描述：从 settings.description 或 _ui.description 或直接 description
        const description = (n8nWorkflow.settings as any)?.description || 
                           (n8nWorkflow as any)._ui?.description || 
                           (n8nWorkflow as any).description || 
                           '';
        
        // 提取标签：从 tags 数组中提取 name
        const tags: string[] = [];
        if (n8nWorkflow.tags && Array.isArray(n8nWorkflow.tags)) {
          n8nWorkflow.tags.forEach((tag: any) => {
            if (typeof tag === 'string') {
              tags.push(tag);
            } else if (tag && tag.name) {
              tags.push(tag.name);
            }
          });
        }
        
        // 转换为前端格式
        const wf: Workflow = {
          id: n8nWorkflow.id,
          name: n8nWorkflow.name || '未命名工作流',
          description: description,
          status: n8nWorkflow.active ? 'PUBLISHED' : 'DRAFT',
          version: n8nWorkflow.version || '1.0.0',
          owner: 'User', // 从用户信息获取
          createdAt: n8nWorkflow.createdAt || new Date().toISOString(),
          updatedAt: n8nWorkflow.updatedAt || n8nWorkflow.createdAt || new Date().toISOString(),
          active: n8nWorkflow.active,
          nodes: n8nWorkflow.nodes || [],
          connections: n8nWorkflow.connections || {},
          settings: n8nWorkflow.settings,
          staticData: n8nWorkflow.staticData,
          tags: tags.length > 0 ? tags : undefined,
        };
        
        // 保存 versionId 用于后续更新
        if ((n8nWorkflow as any).versionId) {
          setWorkflowVersionId((n8nWorkflow as any).versionId);
        }
        
        setWorkflow(wf);
        setDescDraft(description);
        
        // 设置 n8n 节点和连接
        // 注意：即使 lastLoadedId 相同，如果节点数据变化了，也应该更新
        const shouldUpdateNodes = lastLoadedId.current !== id || 
                                  JSON.stringify(n8nWorkflow.nodes) !== JSON.stringify(n8nNodes);
        
        if (shouldUpdateNodes) {
          console.log('需要更新节点和连接');
          console.log('lastLoadedId:', lastLoadedId.current, '当前 ID:', id);
          console.log('后端返回的节点数据:', n8nWorkflow.nodes);
          console.log('后端返回的连接数据:', n8nWorkflow.connections);
          
          const nodesToSet = n8nWorkflow.nodes || [];
          const connectionsToSet = n8nWorkflow.connections || {};
          
          console.log('设置节点数量:', nodesToSet.length);
          console.log('设置连接数量:', Object.keys(connectionsToSet).length);
          
          setN8nNodes(nodesToSet);
          setConnections(connectionsToSet);
          
          // 转换 n8n 节点为旧格式用于显示（兼容现有 UI）
          // 确保节点位置数据有效
          if (n8nWorkflow.nodes && n8nWorkflow.nodes.length > 0) {
            const convertedNodes = n8nWorkflow.nodes
              .filter(n => {
                // 检查节点数据是否有效
                if (!n || !n.id) {
                  console.warn('节点缺少 id:', n);
                  return false;
                }
                if (!n.position) {
                  console.warn('节点缺少 position:', n.id, n);
                  return false;
                }
                if (!Array.isArray(n.position)) {
                  console.warn('节点 position 不是数组:', n.id, n.position);
                  return false;
                }
                if (n.position.length < 2) {
                  console.warn('节点 position 数组长度不足:', n.id, n.position);
                  return false;
                }
                return true;
              })
              .map((n) => {
                // 获取节点类型信息以显示正确的 displayName
                const nodeTypeInfo = getNodeType(n.type);
                const x = typeof n.position[0] === 'number' ? n.position[0] : parseFloat(n.position[0]) || 0;
                const y = typeof n.position[1] === 'number' ? n.position[1] : parseFloat(n.position[1]) || 0;
                
                return {
              id: n.id,
              type: n.type,
                  label: n.name || n.type || '未命名节点', // 使用节点实例名称（不是 displayName）
                  x: x,
                  y: y,
              icon: 'Zap',
              hasError: false,
                };
              });
            
            console.log('转换节点用于显示，节点数量:', convertedNodes.length, '原始节点数量:', n8nWorkflow.nodes.length);
            console.log('转换后的节点数据:', convertedNodes);
            
            if (convertedNodes.length === 0 && n8nWorkflow.nodes.length > 0) {
              console.error('所有节点都被过滤掉了！原始节点数据:', n8nWorkflow.nodes);
            }
            
            setNodes(convertedNodes);
            
            // 计算所有节点的边界框，然后居中显示
            if (convertedNodes.length > 0) {
              const minX = Math.min(...convertedNodes.map(n => n.x));
              const maxX = Math.max(...convertedNodes.map(n => n.x));
              const minY = Math.min(...convertedNodes.map(n => n.y));
              const maxY = Math.max(...convertedNodes.map(n => n.y));
              
              // 节点尺寸（用于计算边界）
              const nodeWidth = 200; // 节点最大宽度
              const nodeHeight = 65; // 节点高度
              
              // 计算边界框的中心点
              const centerX = (minX + maxX + nodeWidth) / 2;
              const centerY = (minY + maxY + nodeHeight) / 2;
              
              // 计算边界框的尺寸
              const boundsWidth = (maxX - minX) + nodeWidth * 2;
              const boundsHeight = (maxY - minY) + nodeHeight * 2;
              
              // 获取画布尺寸（延迟获取，确保 DOM 已渲染）
              setTimeout(() => {
                const canvasContainer = document.querySelector('.workflow-canvas-container');
                if (canvasContainer) {
                  const containerWidth = canvasContainer.clientWidth;
                  const containerHeight = canvasContainer.clientHeight;
                  
                  // 计算缩放比例，使所有节点可见（留出边距）
                  const padding = 100; // 边距
                  const scaleX = (containerWidth - padding * 2) / boundsWidth;
                  const scaleY = (containerHeight - padding * 2) / boundsHeight;
                  const newZoom = Math.min(scaleX, scaleY, 1); // 不超过 1
                  
                  // 计算新的 viewport 位置，使节点居中
                  const newX = containerWidth / 2 - centerX * newZoom;
                  const newY = containerHeight / 2 - centerY * newZoom;
                  
                  console.log('自动居中画布:', {
                    centerX,
                    centerY,
                    boundsWidth,
                    boundsHeight,
                    containerWidth,
                    containerHeight,
                    newZoom,
                    newX,
                    newY,
                  });
                  
                  setViewport({
                    x: newX,
                    y: newY,
                    zoom: newZoom,
                  });
                }
              }, 100);
            }
          } else {
            console.log('后端没有节点，清空画布');
            setNodes([]);
          }
          
          setNotes([]); // n8n 没有 notes 概念，使用空数组
          
          lastLoadedId.current = id;
        }
        
        // 初始化执行状态
        if (wf.lastRunStatus) {
          setExecutionStatus(wf.lastRunStatus);
        }
      } catch (error: any) {
        console.error('加载工作流失败:', error);
        showToast(`加载工作流失败: ${error.response?.data?.message || error.message}`, 'error');
        
        // 回退到本地数据
        const wf = workflows.find(w => w.id === id);
        if (wf) {
          setWorkflow(wf);
          setDescDraft(wf.description);
        } else {
          // 如果本地也没有，创建一个空工作流
          const newWf: Workflow = {
            id: id,
            name: '未命名工作流',
            description: '',
            status: 'DRAFT',
            version: '1.0.0',
            owner: 'User',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            active: false,
            nodes: [],
            connections: {},
            settings: {
              executionOrder: 'v1',
              saveDataErrorExecution: 'all',
              saveDataSuccessExecution: 'all',
              saveManualExecutions: true,
              saveExecutionProgress: false,
            },
            staticData: {},
            tags: [],
          };
          setWorkflow(newWf);
          setDescDraft('');
        }
      }
    };
    
    loadWorkflow();
  }, [id]);

  const recordHistory = () => {
      if (isReadOnly) return;
      setHistory(prev => [...prev.slice(-19), { nodes: JSON.parse(JSON.stringify(nodes)), notes: JSON.parse(JSON.stringify(notes)) }]); 
      setIsUnsavedChanges(true);
  };

  const getIcon = (name?: string) => {
      const Icon = name && ICON_MAP[name] ? ICON_MAP[name] : Zap;
      return <Icon size={16} />;
  };

  const relatedVersions = useMemo(() => {
      if (!workflow) return [];
      return workflows
          .filter(w => w.name === workflow.name)
          .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
  }, [workflow, workflows]);

  // --- Actions Implementation (Duplicate, Export, Import) ---

  const handleDuplicate = () => {
      if (!workflow) return;
      setSettingsMenuOpen(false); // Close menu

      const newId = Math.random().toString(36).substr(2, 9);
      const newName = `${workflow.name} (副本)`;
      const newWf: Workflow = {
          ...workflow,
          id: newId,
          name: newName,
          status: 'DRAFT',
          version: workflow.version, // Keep version or reset? Usually keep context.
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          data: { 
              nodes: JSON.parse(JSON.stringify(nodes)), 
              notes: JSON.parse(JSON.stringify(notes)) 
          },
          nodesPreview: nodes.map(n => n.label || n.type),
          lastRunStatus: 'NONE'
      };

      setWorkflows(prev => [newWf, ...prev]);
      showToast('工作流已复制', 'success');
      // Open modal to confirm switch
      setDuplicateSuccessModal({ isOpen: true, newId, newName });
  };

  const handleExport = () => {
      setSettingsMenuOpen(false);
      setExportTab('JSON');
      setIsExportModalOpen(true);
  };

  const executeExport = () => {
      if (!workflow) return;
      if (exportTab === 'JSON') {
          const exportData = {
              meta: {
                  name: workflow.name,
                  version: workflow.version,
                  description: workflow.description,
                  tags: workflow.tags
              },
              nodes: nodes,
              notes: notes
          };
          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
          const downloadAnchorNode = document.createElement('a');
          downloadAnchorNode.setAttribute("href", dataStr);
          downloadAnchorNode.setAttribute("download", `${workflow.name}_export.json`);
          document.body.appendChild(downloadAnchorNode);
          downloadAnchorNode.click();
          downloadAnchorNode.remove();
          setIsExportModalOpen(false);
      } else {
          // Copy URL
          const url = `${window.location.origin}/#/editor/${workflow.id}?share=true`;
          navigator.clipboard.writeText(url);
          showToast('链接已复制到剪贴板', 'success');
          setIsExportModalOpen(false);
      }
  };

  const handleImportURL = () => {
      setSettingsMenuOpen(false);
      setImportUrlInput('');
      setIsImportUrlModalOpen(true);
  };

  const handleImportJSON = () => {
      setSettingsMenuOpen(false);
      setImportJsonText('');
      setIsImportJsonModalOpen(true);
  };

  // Generic Import Execution
  const processImport = (payload: { nodes: WorkflowNode[], notes: Note[] }) => {
      if (nodes.length > 0) {
          // Trigger Overwrite Warning
          setPendingImportPayload(payload);
          setShowOverwriteAlert(true);
      } else {
          applyImport(payload);
      }
  };

  const applyImport = (payload: { nodes: WorkflowNode[], notes: Note[] }) => {
      recordHistory();
      setNodes(payload.nodes);
      setNotes(payload.notes);
      setIsUnsavedChanges(true);
      showToast('导入成功', 'success');
      
      // Close all modals
      setShowOverwriteAlert(false);
      setIsImportUrlModalOpen(false);
      setIsImportJsonModalOpen(false);
      setPendingImportPayload(null);
  };

  const handleUrlImportSubmit = () => {
      if (!importUrlInput.trim()) return;
      // Mock fetch logic
      // In a real app, verify URL and fetch JSON
      const mockImportedData = {
          nodes: [
              { id: 'imp-1', type: 'Trigger', label: 'Imported Webhook', x: 100, y: 100, icon: 'Webhook' },
              { id: 'imp-2', type: 'Action', label: 'Imported Log', x: 300, y: 100, icon: 'FileText' }
          ],
          notes: []
      };
      
      processImport(mockImportedData);
  };

  const handleJsonImportSubmit = () => {
      try {
          const parsed = JSON.parse(importJsonText);
          if (parsed.nodes && Array.isArray(parsed.nodes)) {
              processImport({
                  nodes: parsed.nodes,
                  notes: parsed.notes || []
              });
          } else {
              alert('JSON 格式无效：缺少 nodes 数组');
          }
      } catch (e) {
          alert('JSON 解析失败，请检查格式');
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
          if (ev.target?.result) {
              setImportJsonText(ev.target.result as string);
          }
      };
      reader.readAsText(file);
  };

  // --- Canvas Interaction Handlers ---
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('.workflow-node') || (e.target as HTMLElement).closest('.workflow-note')) return;
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMoveCanvas = useCallback((e: MouseEvent) => {
      if (isPanning) {
          const dx = e.clientX - lastMousePos.current.x;
          const dy = e.clientY - lastMousePos.current.y;
          setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
          lastMousePos.current = { x: e.clientX, y: e.clientY };
      } 
      else if (draggingNodeId) {
          if (isReadOnly) return;
          const dx = e.movementX / viewport.zoom;
          const dy = e.movementY / viewport.zoom;
          
          // 更新旧格式节点位置
          setNodes(prev => prev.map(n => 
            n.id === draggingNodeId ? { ...n, x: n.x + dx, y: n.y + dy } : n
          ));
          
          // 同步更新 n8n 节点位置（使用最新状态）
          setN8nNodes(prev => prev.map(n => {
              if (n.id === draggingNodeId) {
                  // 从当前状态获取节点位置
                  const currentNode = nodes.find(old => old.id === draggingNodeId);
                  if (currentNode) {
                      return { 
                          ...n, 
                          position: [currentNode.x + dx, currentNode.y + dy] as [number, number] 
                      };
                  }
              }
              return n;
          }));
      }
      else if (draggingNoteId) {
          if (isReadOnly) return;
          const dx = e.movementX / viewport.zoom;
          const dy = e.movementY / viewport.zoom;
          setNotes(prev => prev.map(n => n.id === draggingNoteId ? { ...n, x: n.x + dx, y: n.y + dy } : n));
      }
      else if (resizingNoteId) {
          if (isReadOnly) return;
          const dx = e.movementX / viewport.zoom;
          const dy = e.movementY / viewport.zoom;
          setNotes(prev => prev.map(n => {
              if (n.id === resizingNoteId) {
                  return { ...n, width: Math.max(200, n.width + dx), height: Math.max(150, n.height + dy) };
              }
              return n;
          }));
      }
      else if (connectingFrom) {
          // 更新临时连接线的终点
          const canvasElement = document.querySelector('.workflow-canvas-container');
          if (canvasElement) {
              const rect = canvasElement.getBoundingClientRect();
              const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
              const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;
              setTempConnectionEnd({ x, y });
          }
      }
  }, [isPanning, draggingNodeId, draggingNoteId, resizingNoteId, connectingFrom, viewport, isReadOnly, nodes]);

  // 节点位置更新处理 - 类似 n8n 的 onUpdateNodePosition
  const onUpdateNodePosition = useCallback((nodeId: string, position: { x: number; y: number }) => {
    if (isReadOnly) return;
    
    // 更新旧格式节点位置
    setNodes(prev => prev.map(n => 
      n.id === nodeId ? { ...n, x: position.x, y: position.y } : n
    ));
    
    // 同步更新 n8n 节点位置
    setN8nNodes(prev => prev.map(n => 
      n.id === nodeId ? { ...n, position: [position.x, position.y] as [number, number] } : n
    ));
    
    setIsUnsavedChanges(true);
  }, [isReadOnly]);
  
  // 多个节点位置更新处理 - 类似 n8n 的 onUpdateNodesPosition
  const onUpdateNodesPosition = useCallback((events: Array<{ id: string; position: { x: number; y: number } }>) => {
    if (isReadOnly) return;
    
    // 批量更新节点位置
    events.forEach(({ id, position }) => {
      onUpdateNodePosition(id, position);
    });
    
    // 记录历史（拖拽结束后）
    recordHistory();
  }, [isReadOnly, onUpdateNodePosition]);

  const handleMouseUpCanvas = useCallback(() => {
      // 如果刚刚完成节点拖拽，记录历史
      if (draggingNodeId) {
          recordHistory();
      }
      
      setIsPanning(false);
      setDraggingNodeId(null);
      setDraggingNoteId(null);
      setResizingNoteId(null);
      
      // 如果正在连接但未完成，取消连接
      if (connectingFrom && !connectingTo) {
          setConnectingFrom(null);
          setTempConnectionEnd(null);
      }
  }, [draggingNodeId, connectingFrom, connectingTo]);

  useEffect(() => {
      window.addEventListener('mousemove', handleMouseMoveCanvas);
      window.addEventListener('mouseup', handleMouseUpCanvas);
      return () => {
          window.removeEventListener('mousemove', handleMouseMoveCanvas);
          window.removeEventListener('mouseup', handleMouseUpCanvas);
      };
  }, [handleMouseMoveCanvas, handleMouseUpCanvas]);

  // --- Node & Note Actions ---
  const handleStartDragNode = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (checkReadOnly()) return;
      setDraggingNodeId(id);
  };

  const handleStartDragNote = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (checkReadOnly()) return;
      if ((e.target as HTMLElement).closest('.resize-handle') || (e.target as HTMLElement).closest('button')) return;
      setDraggingNoteId(id);
  };

  const addNote = () => {
    if (checkReadOnly()) return;
    recordHistory();
    const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
    const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
    const newNote: Note = {
        id: `note-${Date.now()}`,
        text: '',
        x: centerX,
        y: centerY,
        width: 250,
        height: 150,
        color: 'yellow'
    };
    setNotes(prev => [...prev, newNote]);
  };

  const deleteNote = (id: string) => {
    if (checkReadOnly()) return;
    recordHistory();
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    if (checkReadOnly()) return;
    if (!('text' in updates)) {
        recordHistory();
    }
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  // --- CanvasNode 事件处理 ---
  const handleDeleteNode = useCallback((nodeId: string) => {
    if (checkReadOnly()) return;
    recordHistory();
    
    const nodeToDelete = n8nNodes.find(n => n.id === nodeId);
    if (!nodeToDelete) return;
    
    // 删除节点
    setN8nNodes(prev => prev.filter(n => n.id !== nodeId));
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    
    // 删除相关连接
    const newConnections = { ...connections };
    Object.keys(newConnections).forEach(sourceNodeName => {
      if (sourceNodeName === nodeToDelete.name) {
        delete newConnections[sourceNodeName];
      } else {
        Object.keys(newConnections[sourceNodeName] || {}).forEach(connectionType => {
          Object.keys(newConnections[sourceNodeName][connectionType] || {}).forEach(outputIndex => {
            const connectionsList = newConnections[sourceNodeName][connectionType][outputIndex] || [];
            newConnections[sourceNodeName][connectionType][outputIndex] = connectionsList.filter(
              (conn: any) => conn.node !== nodeToDelete.name
            );
          });
        });
      }
    });
    setConnections(newConnections);
    
    setIsUnsavedChanges(true);
    showToast('节点已删除', 'success');
  }, [n8nNodes, connections, checkReadOnly, recordHistory]);

  const handleToggleNode = useCallback((nodeId: string) => {
    if (checkReadOnly()) return;
    recordHistory();
    
    setN8nNodes(prev => prev.map(n => 
      n.id === nodeId ? { ...n, disabled: !n.disabled } : n
    ));
    setIsUnsavedChanges(true);
    showToast('节点状态已更新', 'success');
  }, [checkReadOnly, recordHistory]);

  const handleRunNode = useCallback((nodeId: string) => {
    // TODO: 实现单个节点执行
    showToast('节点执行功能待实现', 'success');
  }, []);

  const handleNodeAddConnection = useCallback((nodeId: string, handleId: string) => {
    if (checkReadOnly()) return;
    
    const node = n8nNodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // 解析 handleId: "output-main-0" 或 "input-main-0"
    const [mode, type, indexStr] = handleId.split('-');
    const index = parseInt(indexStr, 10);
    
    if (mode === 'output') {
      // 开始连接
      setConnectingFrom({
        nodeId: node.id,
        nodeName: node.name,
        type: 'output',
        connectionType: type,
        index: index,
      });
    } else if (mode === 'input' && connectingFrom) {
      // 完成连接
      if (connectingFrom.nodeId !== nodeId) {
        const sourceNode = n8nNodes.find(n => n.id === connectingFrom.nodeId);
        if (sourceNode) {
          const newConnections = buildConnection(
            sourceNode.name,
            node.name,
            connectingFrom.connectionType || 'main',
            type,
            connections,
            connectingFrom.index || 0,
            index
          );
          setConnections(newConnections);
          setIsUnsavedChanges(true);
          setConnectingFrom(null);
          setConnectingTo(null);
          setTempConnectionEnd(null);
          showToast(`已连接 ${sourceNode.name} → ${node.name}`, 'success');
        }
      }
    }
  }, [n8nNodes, connectingFrom, connections, checkReadOnly]);

  // Add Node Handlers
  const handleAddToolNode = (tool: ToolDefinition) => {
    if (checkReadOnly()) return;
    recordHistory();
    const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
    const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
    const newNode: WorkflowNode = {
        id: `node-${Date.now()}`,
        type: tool.type === ToolType.API ? 'API Call' : 'MCP Tool',
        label: tool.name,
        x: centerX - 100,
        y: centerY - 40,
        icon: tool.type === ToolType.API ? 'Globe' : 'Cpu',
        toolId: tool.id
    };
    setNodes([...nodes, newNode]);
    setActivePanel('NONE');
  };

  const handleAddTriggerNode = (trigger: any) => {
      if (checkReadOnly()) return;
      recordHistory();
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      const newNode: WorkflowNode = {
          id: `node-${Date.now()}`,
          type: 'Trigger',
          label: trigger.title,
          x: centerX - 100,
          y: centerY - 40,
          icon: trigger.iconName
      };
      setNodes([...nodes, newNode]);
      setActivePanel('NONE');
  };

  const handleUpdateTags = async (newTags: string[]) => {
      if (checkReadOnly()) return;
      if (workflow) {
          const updatedWf = { ...workflow, tags: newTags, updatedAt: new Date().toISOString() };
          setWorkflow(updatedWf);
          setWorkflows(prev => prev.map(w => w.id === workflow.id ? updatedWf : w));
          setIsUnsavedChanges(true);
          
          // 如果有工作流 ID，立即保存标签到后端
          if (id && id !== 'new' && id !== 'undefined') {
              try {
                  // n8n 期望标签是标签 ID 数组，需要将标签名称转换为 ID
                  // 1. 获取所有标签
                  const allTags = await tagsApi.list();
                  
                  // 2. 将标签名称映射为标签 ID
                  const tagIds: string[] = [];
                  for (const tagName of newTags) {
                      // 查找标签 ID
                      const tag = allTags.find((t: any) => (t.name || t) === tagName);
                      if (tag && tag.id) {
                          tagIds.push(tag.id);
                      } else {
                          // 如果标签不存在，先创建它
                          console.log('标签不存在，创建新标签:', tagName);
                          try {
                              const newTag = await tagsApi.create({ name: tagName });
                              if (newTag.id) {
                                  tagIds.push(newTag.id);
                              }
                          } catch (createError: any) {
                              // 如果创建失败（可能是标签已存在），尝试再次获取
                              if (createError.response?.status === 409) {
                                  const refreshedTags = await tagsApi.list();
                                  const foundTag = refreshedTags.find((t: any) => (t.name || t) === tagName);
                                  if (foundTag && foundTag.id) {
                                      tagIds.push(foundTag.id);
                                  }
                              } else {
                                  console.error('创建标签失败:', createError);
                              }
                          }
                      }
                  }
                  
                  // 3. 构建更新数据，使用标签 ID 数组
                  // 注意：只更新标签时，需要传递 versionId 或使用 forceSave
                  const updateData: Partial<Workflow> = {
                      tags: tagIds as any, // n8n 期望标签 ID 数组
                  };
                  
                  // 如果有 versionId，添加到更新数据中
                  if (workflowVersionId) {
                      (updateData as any).versionId = workflowVersionId;
                  }
                  
                  // 使用 forceSave 来避免版本冲突（因为只更新标签）
                  await workflowApi.update(id, updateData, { forceSave: true });
                  
                  // 更新后重新获取工作流以获取新的 versionId
                  const updatedWorkflow = await workflowApi.get(id);
                  if ((updatedWorkflow as any).versionId) {
                      setWorkflowVersionId((updatedWorkflow as any).versionId);
                  }
                  
                  console.log('标签已保存到后端，标签 ID:', tagIds);
              } catch (error: any) {
                  console.error('保存标签失败:', error);
                  showToast(`保存标签失败: ${error.response?.data?.message || error.message}`, 'error');
              }
          }
      }
  };

  const handleTagCreate = (tagName: string) => {
      if (checkReadOnly()) return false;
      addTag(tagName);
      return true; 
  };

  const handleAiPolish = async () => {
      if (checkReadOnly()) return;
      if (!workflow) return;
      setIsAiPolishing(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `Rewrite description for "${workflow.name}": ${descDraft}`;
          const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
          if (response.text) setDescDraft(response.text.trim());
      } catch (error) {
          console.error("AI Polish failed", error);
      } finally {
          setIsAiPolishing(false);
      }
  };

  const handleSaveDescription = () => {
      if (checkReadOnly()) return;
      if (workflow) {
          const updatedWf = { ...workflow, description: descDraft, updatedAt: new Date().toISOString() };
          setWorkflow(updatedWf);
          setWorkflows(prev => prev.map(w => w.id === workflow.id ? updatedWf : w));
          setIsDescModalOpen(false);
          setIsUnsavedChanges(true);
      }
  };

  const openSaveVersionModal = () => {
      setNextVersionInput('');
      setIsSaveVersionModalOpen(true);
  };

  const confirmSaveVersion = () => {
      if (!workflow || !nextVersionInput.trim()) return;
      
      const newId = Math.random().toString(36).substr(2, 9);
      const newWf: Workflow = {
          ...workflow,
          id: newId,
          version: nextVersionInput.trim(),
          status: 'DRAFT',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          data: { nodes, notes },
          nodesPreview: nodes.map(n => n.label),
          lastRunStatus: 'NONE' // Reset execution status for new version
      };
      
      setWorkflows(prev => [newWf, ...prev]);
      setIsSaveVersionModalOpen(false);
      setSwitchVersionModal({ isOpen: true, newId, newVersion: newWf.version });
  };

  const handlePublishClick = () => {
      if (isReadOnly) {
          // If read-only (Published), this button acts as "Unpublish" / "Take Down"
          if (workflow) {
               const updatedWf: Workflow = { ...workflow, status: 'DRAFT', updatedAt: new Date().toISOString() };
               setWorkflow(updatedWf);
               setWorkflows(prev => prev.map(w => w.id === workflow.id ? updatedWf : w));
               showToast('应用已下架，转为草稿状态', 'success');
          }
          return;
      }

      if (isUnsavedChanges) {
          setShowUnsavedWarning(true);
          return;
      }
      
      // Check if last run was successful
      if (executionStatus !== 'SUCCESS' && nodes.length > 0) {
          setNotExecutedWarning(true);
          return;
      }

      setPublishName(workflow?.name || '');
      setPublishDesc(workflow?.description || '');
      setIsPublishModalOpen(true);
  };

  const confirmPublish = () => {
      if (!workflow) return;
      const updatedWf: Workflow = { 
          ...workflow, 
          name: publishName, 
          description: publishDesc,
          status: 'PUBLISHED', 
          updatedAt: new Date().toISOString() 
      };
      setWorkflow(updatedWf);
      setWorkflows(prev => prev.map(w => w.id === workflow.id ? updatedWf : w));
      setIsPublishModalOpen(false);
      showToast('发布成功！', 'success');
  };

  // 添加 n8n 节点类型节点
  // 使用 ref 防止重复调用
  const addingNodeRef = React.useRef<boolean>(false);
  
  const handleAddN8nNode = async (nodeTypeName: string) => {
      if (checkReadOnly()) return;
      
      // 防止重复调用
      if (addingNodeRef.current) {
          console.warn('正在添加节点，跳过重复调用');
          return;
      }
      
      // 检查节点类型名称是否有效（不是生成的临时名称）
      if (!nodeTypeName || 
          (nodeTypeName.startsWith('node-') && !nodeTypeName.includes('.') && nodeTypeName.match(/\d{13}/))) {
          console.warn('无效的节点类型名称（可能是临时生成的）:', nodeTypeName);
          showToast('节点类型名称无效，请选择有效的节点类型', 'error');
          return;
      }
      
      addingNodeRef.current = true;
      
      try {
          // 先从缓存的节点类型中查找
          let nodeTypeInfo = getNodeType(nodeTypeName);
          
          // 如果缓存中没有，从 API 获取（传入缓存数据以便在 getNodeTypeDetails 中查找）
          if (!nodeTypeInfo) {
              nodeTypeInfo = await getNodeTypeDetails(nodeTypeName, nodeTypesByCategory);
          }
          
          if (!nodeTypeInfo) {
              console.error(`无法获取节点类型信息: ${nodeTypeName}`);
              showToast(`无法获取节点类型信息: ${nodeTypeName}`, 'error');
              return;
          }
          
          const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
          const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
          
          const newNode = createDefaultNode(
              nodeTypeInfo,
              [centerX, centerY],
              undefined,
              n8nNodes // 传入现有节点，用于生成唯一名称
          );
          
          // 检查是否已存在相同 ID 的节点（防止重复添加）
          setN8nNodes(prev => {
              if (prev.find(n => n.id === newNode.id)) {
                  console.warn('节点已存在，跳过添加:', newNode.id);
                  return prev;
              }
              return [...prev, newNode];
          });
          
          // 同时更新旧格式节点用于显示（使用 displayName 作为标签）
          setNodes(prev => {
              // 检查是否已存在相同 ID 的节点
              if (prev.find(n => n.id === newNode.id)) {
                  return prev;
              }
              return [...prev, {
              id: newNode.id,
              type: newNode.type,
                  label: nodeTypeInfo.displayName || newNode.name, // 使用 displayName
              x: newNode.position[0],
              y: newNode.position[1],
              icon: 'Zap',
              hasError: false,
              }];
          });
          
          recordHistory();
          setActivePanel('NONE');
          showToast(`已添加节点: ${nodeTypeInfo.displayName}`, 'success');
      } catch (error: any) {
          console.error('添加节点失败:', error);
          showToast(`添加节点失败: ${error.message}`, 'error');
      } finally {
          // 延迟重置，防止快速连续点击
          setTimeout(() => {
              addingNodeRef.current = false;
          }, 300);
      }
  };

  // 处理节点选择modal中的节点选择
  const handleNodeSelectorNodeSelected = async (nodeType: any) => {
      if (!nodeType) return;
      
      // 判断是触发器节点还是普通节点
      if (nodeType.nodeType) {
          // 触发器节点
          handleAddN8nNode(nodeType.nodeType);
      } else if (nodeType.name) {
          // 普通节点
          handleAddN8nNode(nodeType.name);
      }
  };

  // 处理添加触发器
  const handleAddTrigger = () => {
      // 切换到触发器选择视图
      console.log('添加另一个触发器');
  };

  const handleRunWorkflow = () => {
      handleExecuteWorkflow();
  };
  
  // 旧的模拟执行代码（保留用于兼容）
  const handleRunWorkflowSimulation = () => {
      if (nodes.length === 0) {
          showToast("画布为空，无法执行", 'error');
          return;
      }
      setEditorExecuting(true);
      setExecutionStatus('RUNNING');
      setActiveNodeId(nodes[0].id); // Start highlighting first node
      
      // Simulation
      let step = 0;
      const interval = setInterval(() => {
          if (step >= nodes.length) {
              clearInterval(interval);
              setEditorExecuting(false);
              setExecutionStatus('SUCCESS');
              setActiveNodeId(null);
              
              // Update workflow execution status
              if (workflow) {
                  const updatedWf = { ...workflow, lastRunStatus: 'SUCCESS' as const };
                  setWorkflow(updatedWf);
                  setWorkflows(prev => prev.map(w => w.id === workflow.id ? updatedWf : w));
              }

              // Create execution log
              const newExecId = Math.random().toString(36).substr(2, 9);
              const startTime = new Date().toISOString();
              const logs = nodes.map((n, index) => ({
                  id: `log-${index}`,
                  timestamp: new Date().toISOString(),
                  level: 'info' as const,
                  message: `Executed node ${n.label} successfully.`,
                  nodeName: n.label
              }));
              const nodeStatuses: Record<string, 'success' | 'error' | 'running'> = {};
              nodes.forEach(n => nodeStatuses[n.id] = 'success');
              
              const newExec: ExecutionLog = {
                  id: newExecId,
                  startTime: startTime,
                  endTime: new Date().toISOString(),
                  duration: nodes.length * 800 + Math.floor(Math.random() * 200),
                  status: 'success',
                  logs: logs,
                  data: { result: "Workflow execution completed successfully", data: { processed: nodes.length } },
                  nodeStatuses
              };
              setExecutions(prev => [newExec, ...prev]);
              showToast("执行成功", 'success');
              
              return;
          }
          
          setActiveNodeId(nodes[step].id);
          step++;
      }, 800);
  };

  const handleUndo = () => {
      if (history.length === 0 || isReadOnly) return;
      const previousState = history[history.length - 1];
      setNodes(previousState.nodes);
      setNotes(previousState.notes);
      setHistory(prev => prev.slice(0, -1));
  };

  const handleCenterFocus = () => {
      setViewport({ x: 0, y: 0, zoom: 1 });
  };

  const handleZoom = (direction: 'in' | 'out') => {
      setViewport(prev => ({
          ...prev,
          zoom: direction === 'in' ? Math.min(2, prev.zoom + 0.1) : Math.max(0.2, prev.zoom - 0.1)
      }));
  };

  const handleClearErrors = () => {
      if (checkReadOnly()) return;
      setNodes(prev => prev.map(n => ({ ...n, hasError: false })));
      showToast("已清除所有报错状态", 'success');
  };

  // Leave / Navigation Logic
  const handleBackClick = () => {
      requestNavigation('/studio');
  };

  // Click Outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-trigger')) { setSettingsMenuOpen(false); }
      if (!target.closest('.version-trigger')) { setVersionDropdownOpen(false); }
      if (activePanel === 'ADD_NODE' && !target.closest('.add-node-panel') && !target.closest('.trigger-add-node')) { setActivePanel('NONE'); }
      if (activePanel === 'GLOBAL_SEARCH' && target.classList.contains('search-modal-backdrop')) { setActivePanel('NONE'); }
      if (!target.closest('.note-menu-trigger')) { setActiveNoteMenu(null); }
      
      // New check for message popover
      if (isMessageOpen && messagePanelRef.current && !messagePanelRef.current.contains(target as Node) && !messageButtonRef.current?.contains(target as Node)) {
          setIsMessageOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activePanel, isMessageOpen]);

  const filteredTools = tools.filter(t => t.name.toLowerCase().includes(nodeSearch.toLowerCase()) || t.description.toLowerCase().includes(nodeSearch.toLowerCase()));
  const filteredTriggers = TRIGGERS.filter(t => t.title.toLowerCase().includes(nodeSearch.toLowerCase()));

  if (!workflow) return <div className="h-full flex items-center justify-center">Loading...</div>;

  // Log refresh handler
  const handleLogRefresh = () => {
    if (workflow && id) {
      getExecutionHistory(id).then((history) => {
        if (history && history.length > 0) {
          const latest = history[0];
          const execLog: ExecutionLog = {
            id: latest.id,
            status: latest.status === 'success' ? 'success' : latest.status === 'error' ? 'error' : 'running',
            startTime: latest.startedAt,
            endTime: latest.stoppedAt,
            duration: latest.stoppedAt && latest.startedAt 
              ? new Date(latest.stoppedAt).getTime() - new Date(latest.startedAt).getTime()
              : undefined,
            logs: latest.data?.resultData?.error 
              ? [{
                  id: 'error',
                  timestamp: latest.stoppedAt || latest.startedAt,
                  level: 'error',
                  message: latest.data.resultData.error.message || '执行失败',
                }]
              : [{
                  id: 'success',
                  timestamp: latest.stoppedAt || latest.startedAt,
                  level: 'info',
                  message: '执行完成',
                }],
            data: latest.data,
          };
          setCurrentExecution(execLog);
        }
      });
    }
  };

  return (
    <WorkflowEditorLayout
      workflow={workflow}
      readOnly={isReadOnly}
      activeNode={configNode}
      sidebarCollapsed={false}
      onSidebarToggle={() => {}}
      isLogOpen={isLogOpen}
      execution={currentExecution}
      onLogToggle={() => setIsLogOpen(!isLogOpen)}
      onLogRefresh={handleLogRefresh}
      onTabChange={(tab) => {
        // Handle tab change if needed
      }}
    >
      <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans text-slate-900 select-none relative">
        {/* Workflow Header - Name, Tags, Description */}
        <div className="absolute top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm shadow-sm border-b border-slate-200">
          <div className="px-6 py-3 flex items-center justify-between gap-4">
            {/* Left Section - Back, Name, Tags, Description */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={handleBackClick}
                className="flex-shrink-0 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                title="返回"
              >
                <ArrowLeft size={18} className="text-slate-600" />
              </button>
              <h1 className="font-bold text-slate-800 text-sm flex items-center gap-2 shrink-0 whitespace-nowrap">
                {workflow.name}
                {isReadOnly && <span title="已发布 - 只读模式" className="flex items-center"><Lock size={14} className="text-orange-500" /></span>}
              </h1>
              <div className="flex items-center gap-2 shrink-0">
                <TagInput 
                  selectedTags={workflow.tags || []}
                  onChange={handleUpdateTags}
                  availableTags={tags}
                  onManageTags={() => setIsTagManagerOpen(true)}
                  onCreateTag={addTag}
                  variant="header"
                />
                <button 
                  onClick={() => { setDescDraft(workflow.description); setIsDescModalOpen(true); }}
                  className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 p-1"
                  title="编辑描述"
                >
                  <Edit2 size={14} />
                </button>
                {workflow.description && (
                  <span className="text-xs text-slate-500 truncate max-w-xs" title={workflow.description}>
                    {workflow.description}
                  </span>
                )}
              </div>
            </div>
            
            {/* Right Section - Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
                <button onClick={handleShare} className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm font-medium text-sm transition-colors">共享</button>
                <button onClick={handleSave} disabled={isReadOnly} className={`px-4 py-1.5 border font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center gap-1 ${isReadOnly ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                    {isReadOnly && <Lock size={12}/>} 保存
                </button>
                <button onClick={openSaveVersionModal} className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-sm hover:bg-slate-50 font-medium text-sm transition-colors">另存新版本</button>
                
                <div className="relative version-trigger">
                    <button onClick={() => setVersionDropdownOpen(!versionDropdownOpen)} className={`w-[34px] h-[34px] flex items-center justify-center bg-white border border-slate-200 text-slate-700 rounded-lg shadow-sm hover:bg-slate-50 transition-colors ${versionDropdownOpen ? 'ring-2 ring-blue-100 border-blue-400' : ''}`}><ChevronDown size={18} /></button>
                    {versionDropdownOpen && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-2">
                            {relatedVersions.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-slate-400 text-center">暂无历史版本</div>
                            ) : (
                                relatedVersions.map(ver => (
                                    <button 
                                        key={ver.id} 
                                        onClick={() => { 
                                            setVersionDropdownOpen(false); 
                                            navigate(`/editor/${ver.id}`, { state: { versionSwitched: true, version: ver.version } }); 
                                        }} 
                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-start gap-3 transition-colors group"
                                    >
                                        <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${ver.id === workflow.id ? 'border-blue-500' : 'border-slate-300'}`}>
                                            {ver.id === workflow.id && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-slate-700 flex items-center gap-2">v{ver.version}{ver.status === 'PUBLISHED' && <span className="text-[9px] bg-green-100 text-green-600 px-1 rounded border border-green-200">发布版</span>}</div>
                                            <div className="text-[10px] text-slate-400">{new Date(ver.updatedAt).toLocaleTimeString([], {year: 'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit'})}</div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <button onClick={handlePublishClick} className={`px-6 py-1.5 rounded-lg shadow-sm font-medium text-sm transition-colors ${isReadOnly ? 'bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-50' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
                    {isReadOnly ? '下架' : '发布'}
                </button>

                <div className="relative dropdown-trigger">
                    <button onClick={() => setSettingsMenuOpen(!settingsMenuOpen)} className={`w-[34px] h-[34px] flex items-center justify-center bg-white border border-slate-200 text-slate-700 rounded-lg shadow-sm hover:bg-slate-50 transition-colors ${settingsMenuOpen ? 'ring-2 ring-blue-100 border-blue-400' : ''}`}><SlidersHorizontal size={18} /></button>
                    {settingsMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 py-1">
                             <button onClick={handleDuplicate} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Copy size={14}/> 复制</button>
                             <button onClick={handleExport} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Download size={14}/> 导出</button>
                             <button onClick={handleImportURL} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Link size={14}/> URL导入</button>
                             <button onClick={handleImportJSON} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><FileJson size={14}/> Json导入</button>
                             <div className="my-1 border-t border-slate-100"></div>
                             <button onClick={() => { setSettingsMenuOpen(false); setIsWorkflowSettingsModalOpen(true); }} className="w-full text-left px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 font-medium">设置</button>
                        </div>
                    )}
                </div>
                
                {/* --- Message / Notification Button Popover --- */}
                <div className="relative">
                    <button 
                        ref={messageButtonRef}
                        onClick={() => setIsMessageOpen(!isMessageOpen)} 
                        className={`w-[34px] h-[34px] flex items-center justify-center bg-white border border-slate-200 text-slate-700 rounded-lg shadow-sm hover:bg-slate-50 transition-colors ${isMessageOpen ? 'ring-2 ring-blue-100 border-blue-400' : ''}`}
                    >
                        <Bell size={18} />
                        {executions.length > 0 && <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>}
                    </button>
                    {isMessageOpen && (
                        <div ref={messagePanelRef} className="absolute top-full right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <h3 className="font-bold text-slate-800 text-sm">消息</h3>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setExecutions([])} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded transition-colors" title="清空记录">
                                        <Trash2 size={14} />
                                    </button>
                                    <button onClick={() => setIsMessageOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto p-2">
                                {executions.length === 0 ? (
                                    <div className="py-8 text-center text-slate-400 text-xs">
                                        没有新的通知
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {executions.map(exec => (
                                            <div key={exec.id} className="p-2.5 bg-white border border-slate-100 rounded-lg shadow-sm hover:border-blue-200 transition-colors cursor-pointer group" onClick={() => { setSelectedExecutionId(exec.id); setViewMode('EXECUTE'); setIsMessageOpen(false); }}>
                                                <div className="flex items-start gap-2">
                                                    <div className={`mt-0.5 ${exec.status === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                                                        {exec.status === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">工作流执行{exec.status === 'success' ? '成功' : '失败'}</span>
                                                            <span className="text-[10px] text-slate-400">{exec.startTime}</span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 mt-0.5 flex justify-between">
                                                            <span>耗时 {exec.duration}ms</span>
                                                            <span className="font-mono text-slate-400">#{exec.id.slice(-4)}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
        </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
            
            {/* --- Left Sidebar (Execution History Mode) --- */}
            {viewMode === 'EXECUTE' && (
                <div className="w-64 bg-white border-r border-slate-200 flex flex-col z-20 animate-in slide-in-from-left-4 duration-300">
                    <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-800 text-sm">执行记录</h3>
                    </div>
                    <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                            自动刷新
                        </label>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {executions.length === 0 ? (
                            <div className="text-center text-slate-400 text-xs py-8">暂无执行记录</div>
                        ) : (
                            executions.map(exec => (
                                <button 
                                    key={exec.id}
                                    onClick={() => setSelectedExecutionId(exec.id)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-2 transition-all border-l-2 ${selectedExecutionId === exec.id ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-transparent hover:bg-slate-50'}`}
                                >
                                    <div className="mt-0.5">
                                        {exec.status === 'success' && <CheckCircle2 size={14} className="text-green-600" />}
                                        {exec.status === 'error' && <AlertCircle size={14} className="text-red-600" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-bold text-slate-800 mb-0.5">{exec.startTime}</div>
                                        <div className="text-[10px] text-slate-500 flex justify-between">
                                            <span>耗时 {exec.duration}ms</span>
                                            <span className="text-slate-400">#{exec.id.slice(-4)}</span>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* --- Left Floating Toolbar (Editor Mode) --- */}
            {viewMode === 'EDITOR' && (
                <div className="absolute left-6 top-20 flex flex-col gap-4 z-20">
                    <button onClick={(e) => { e.stopPropagation(); setIsNodeSelectorOpen(true); }} className={`trigger-add-node w-10 h-10 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] hover:shadow-lg hover:text-blue-600 rounded-xl flex items-center justify-center transition-all border ${isNodeSelectorOpen ? 'border-blue-500 text-blue-600 ring-2 ring-blue-100' : 'border-slate-100 text-slate-600'}`}><Plus size={20} /></button>
                    <button onClick={() => setActivePanel('GLOBAL_SEARCH')} className="w-10 h-10 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] hover:shadow-lg hover:text-blue-600 rounded-xl flex items-center justify-center text-slate-600 transition-all border border-slate-100"><Search size={20} /></button>
                    <button onClick={addNote} className="w-10 h-10 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] hover:shadow-lg hover:text-blue-600 rounded-xl flex items-center justify-center text-slate-600 transition-all border border-slate-100"><FileText size={20} /></button>
                    <button onClick={() => setActivePanel(activePanel === 'AI_SIDEBAR' ? 'NONE' : 'AI_SIDEBAR')} className={`w-10 h-10 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] hover:shadow-lg hover:text-blue-600 rounded-xl flex items-center justify-center transition-all border ${activePanel === 'AI_SIDEBAR' ? 'border-blue-500 text-blue-600 ring-2 ring-blue-100' : 'border-slate-100 text-slate-600'}`}><Wand2 size={20} /></button>
                </div>
            )}

            {/* --- Add Node Panel --- */}
            {activePanel === 'ADD_NODE' && (
                <div className="add-node-panel absolute left-20 top-20 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-4 duration-200" style={{ height: '600px' }}>
                        {loadingNodeTypes ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 size={20} className="animate-spin text-blue-600" />
                                <span className="ml-2 text-sm text-slate-500">加载节点类型...</span>
                            </div>
                        ) : (
                        <NodesListPanel
                            nodeTypes={Object.keys(nodeTypesByCategory).reduce((acc, category) => {
                                acc[category] = nodeTypesByCategory[category]
                                    .filter(node => node.name) // 只保留有 name 字段的节点
                                    .map(node => {
                                        // 确保 name 字段存在（应该已经存在，这里是额外的检查）
                                        if (!node.name) {
                                            console.warn('节点类型缺少 name 字段:', node);
                                        }
                                        return {
                                            name: node.name, // 使用实际的 name 字段
                                            displayName: node.displayName || node.name,
                                            description: node.description || '',
                                            icon: node.icon,
                                            iconUrl: node.iconUrl,
                                            iconColor: node.iconColor,
                                            defaults: node.defaults || {},
                                            group: node.group || [],
                                            category: node.category || [],
                                        };
                                    });
                                return acc;
                            }, {} as Record<string, any[]>)}
                            search={nodeSearch}
                            onSearchChange={setNodeSearch}
                            onNodeSelected={(nodeType) => handleAddN8nNode(nodeType.name)}
                        />
                    )}
                </div>
            )}

            {/* --- Main Canvas Container --- */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
                 
                 {/* Top Center Pill (View Mode Switcher) - 下移避免遮挡头部 */}
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-slate-200/80 backdrop-blur rounded-lg p-1 flex shadow-inner">
                    <button onClick={() => setViewMode('EDITOR')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'EDITOR' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-300/50'}`}>编辑器</button>
                    <button onClick={() => setViewMode('EXECUTE')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'EXECUTE' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-300/50'}`}>执行</button>
                </div>

                {/* Content Area */}
                <div className={`flex-1 relative bg-slate-50 cursor-${isPanning ? 'grabbing' : connectingFrom ? 'crosshair' : 'default'} workflow-canvas-container`} onMouseDown={handleMouseDownCanvas}>
                    {/* Execution Info Overlay (EXECUTE Mode) */}
                    {viewMode === 'EXECUTE' && selectedExecution && (
                        <div className="absolute top-6 left-6 z-20 pointer-events-none animate-in fade-in slide-in-from-left-4">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-xl font-bold text-slate-800">{selectedExecution.startTime}</h2>
                                <div className="flex items-center gap-3 text-sm">
                                    <span className={`font-bold ${selectedExecution.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{selectedExecution.status === 'success' ? '成功' : '失败'}</span>
                                    <span className="text-slate-500">耗时{selectedExecution.duration}毫秒</span>
                                    <span className="text-slate-400">|</span>
                                    <span className="text-slate-500">ID#{selectedExecution.id.slice(-6)}</span>
                                </div>
                                <div className="mt-2 pointer-events-auto">
                                    <button className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 shadow-sm"><Plus size={10} /> 添加标签</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI Sidebar (Interactive Chat & Build Modes) - Inside Canvas Container to respect flex layout */}
                    {activePanel === 'AI_SIDEBAR' && (
                        <div 
                            className={`absolute top-4 right-4 h-[calc(100%-32px)] flex flex-col z-40 animate-in slide-in-from-right-4 fade-in duration-300 shadow-2xl rounded-2xl border border-white/60 bg-white/95 backdrop-blur-xl ring-1 ring-black/5 overflow-hidden`}
                            style={{ width: aiSidebarWidth, transition: isResizingSidebar ? 'none' : 'width 0.3s ease-in-out' }}
                        >
                            {/* Resize Handle */}
                            <div 
                                onMouseDown={startResizingSidebar}
                                className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/20 active:bg-blue-500/40 z-50 transition-colors"
                            />

                            {/* Header with Toggle */}
                            <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100/50 bg-gradient-to-b from-white/80 to-transparent shrink-0">
                                <div className="flex bg-slate-100/80 p-1 rounded-lg border border-slate-200/50">
                                    <button 
                                        onClick={() => setAiMode('ask')} 
                                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all shadow-sm ${aiMode === 'ask' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 shadow-none'}`}
                                    >
                                        Ask
                                    </button>
                                    <button 
                                        onClick={() => setAiMode('build')} 
                                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all shadow-sm ${aiMode === 'build' ? 'bg-white text-purple-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 shadow-none'}`}
                                    >
                                        Build
                                    </button>
                                </div>
                                <button onClick={() => setActivePanel('NONE')} className="p-2 hover:bg-slate-200/50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            
                            {/* Mode: Ask */}
                            {aiMode === 'ask' && (
                                <>
                                    <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4 bg-transparent">
                                        {askMessages.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center text-center h-full text-slate-400">
                                                <div className="w-12 h-12 bg-blue-50/80 rounded-2xl flex items-center justify-center mb-3 text-blue-500 shadow-sm border border-blue-100">
                                                    <Bot size={24} />
                                                </div>
                                                <p className="text-xs max-w-[200px] leading-relaxed">有什么可以帮您的？我可以解答关于节点配置和工作流逻辑的问题。</p>
                                            </div>
                                        ) : (
                                            askMessages.map((msg, idx) => (
                                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm backdrop-blur-sm ${
                                                        msg.role === 'user' 
                                                            ? 'bg-blue-600 text-white rounded-br-sm' 
                                                            : 'bg-white/80 border border-slate-100 text-slate-700 rounded-bl-sm'
                                                    }`}>
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="p-3 border-t border-slate-100/50 shrink-0 bg-white/60">
                                        <div className="relative">
                                            <input 
                                                value={askInput}
                                                onChange={(e) => setAskInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAskSend()}
                                                placeholder="输入问题..." 
                                                className="w-full pl-4 pr-10 py-2.5 bg-white/80 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder:text-slate-400 shadow-sm"
                                            />
                                            <button 
                                                onClick={handleAskSend}
                                                disabled={!askInput.trim()}
                                                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                            >
                                                <ArrowUp size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Mode: Build */}
                            {aiMode === 'build' && (
                                <>
                                    <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4 bg-transparent">
                                        {buildMessages.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center text-center h-full text-slate-400">
                                                <div className="w-12 h-12 bg-purple-50/80 rounded-2xl flex items-center justify-center mb-3 text-purple-500 shadow-sm border border-purple-100">
                                                    <Sparkles size={24} />
                                                </div>
                                                <p className="text-xs max-w-[200px] leading-relaxed">描述您想构建的功能，我将自动为您生成节点。</p>
                                                <div className="mt-4 flex flex-wrap justify-center gap-1.5 max-w-[200px]">
                                                    {['定时任务', 'Webhook', '邮件通知'].map(chip => (
                                                        <button 
                                                            key={chip}
                                                            onClick={() => handleChipClick(chip)}
                                                            className="px-2 py-1 bg-white/50 border border-slate-200 text-slate-500 hover:text-purple-600 hover:border-purple-200 rounded text-[10px] transition-all"
                                                        >
                                                            {chip}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            buildMessages.map((msg, idx) => (
                                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm backdrop-blur-sm ${
                                                        msg.role === 'user' 
                                                            ? 'bg-purple-600 text-white rounded-br-sm' 
                                                            : 'bg-white/80 border border-slate-100 text-slate-700 rounded-bl-sm'
                                                    }`}>
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        {isBuilding && (
                                            <div className="flex justify-start">
                                                <div className="bg-white/80 border border-slate-100 text-slate-500 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-xs shadow-sm flex items-center gap-2">
                                                    <Loader2 size={12} className="animate-spin text-purple-500" />
                                                    正在生成...
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 border-t border-slate-100/50 shrink-0 bg-white/60">
                                        <div className="relative">
                                            <input 
                                                value={buildInput}
                                                onChange={(e) => setBuildInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleBuildSubmit();
                                                    }
                                                }}
                                                disabled={isBuilding}
                                                placeholder="构建什么..." 
                                                className="w-full pl-4 pr-10 py-2.5 bg-white/80 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition-all placeholder:text-slate-400 shadow-sm disabled:opacity-50"
                                            />
                                            <button 
                                                onClick={handleBuildSubmit}
                                                disabled={!buildInput.trim() || isBuilding}
                                                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                            >
                                                <ArrowUp size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Dot Grid Background */}
                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)', backgroundSize: '24px 24px', opacity: 0.6, transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: '0 0' }} />

                    {/* TRANSFORM WRAPPER for Infinite Canvas - 使用足够大的尺寸确保节点和连线都能渲染 */}
                    <div 
                        style={{ 
                            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, 
                            transformOrigin: '0 0',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100000px',  // 足够大的画布尺寸，确保节点和连线都能渲染
                            height: '100000px',
                            minWidth: '100000px',
                            minHeight: '100000px',
                        }}
                    >
                        {/* Notes */}
                        {notes.map(note => {
                            const style = NOTE_COLORS[note.color];
                            return (
                                <div key={note.id} style={{ left: note.x, top: note.y, width: note.width, height: note.height }} onMouseDown={(e) => handleStartDragNote(e, note.id)} className={`workflow-note absolute z-10 ${style.bg} border ${style.border} shadow-lg rounded-xl flex flex-col group animate-in zoom-in-95 cursor-grab active:cursor-grabbing`}>
                                    <div className="flex items-center justify-end p-2 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => deleteNote(note.id)} className="p-1 hover:bg-black/5 rounded text-slate-500 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                        <div className="relative note-menu-trigger">
                                            <button onClick={(e) => { e.stopPropagation(); setActiveNoteMenu(activeNoteMenu === `${note.id}-color` ? null : `${note.id}-color`); }} className="p-1 hover:bg-black/5 rounded text-slate-500 hover:text-slate-800 transition-colors"><Palette size={14} /></button>
                                            {activeNoteMenu === `${note.id}-color` && (
                                                <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-1.5 flex gap-1 z-50">
                                                    {(['yellow', 'blue', 'green', 'pink', 'purple'] as const).map(color => (
                                                        <button key={color} onClick={(e) => { e.stopPropagation(); updateNote(note.id, { color }); setActiveNoteMenu(null); }} className={`w-5 h-5 rounded-full border border-slate-200 hover:scale-110 transition-transform ${NOTE_COLORS[color].bg.replace('50', '200')}`} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="px-5 pb-5 pt-0 flex-1 flex flex-col"><textarea value={note.text} onChange={(e) => updateNote(note.id, { text: e.target.value })} className={`w-full h-full bg-transparent border-none outline-none text-sm text-slate-600 resize-none font-medium placeholder:text-slate-400`} placeholder="双击即可编辑。" /></div>
                                    <div className="resize-handle absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize flex items-center justify-center text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100" onMouseDown={(e) => { e.stopPropagation(); setResizingNoteId(note.id); resizeStart.current = { x: e.clientX, y: e.clientY }; initialNoteSize.current = { w: note.width, h: note.height }; }}><ArrowDownRight size={14} /></div>
                                </div>
                            );
                        })}

                        {/* Nodes */}
                        {nodes.length > 0 && (
                            <div className="relative w-full h-full">
                                {/* Workflow Connections - 使用 n8n 连接数据 */}
                                {n8nNodes.length > 0 && (
                                    <>
                                        <WorkflowConnectionsRenderer
                                            n8nNodes={n8nNodes}
                                            connections={connections}
                                            viewport={viewport}
                                            onConnectionClick={(sourceNodeName, targetNodeName) => {
                                                // 删除连接
                                                if (window.confirm(`是否删除从 "${sourceNodeName}" 到 "${targetNodeName}" 的连接？`)) {
                                                    const newConnections = removeConnection(
                                                        sourceNodeName,
                                                        targetNodeName,
                                                        'main',
                                                        connections
                                                    );
                                                    setConnections(newConnections);
                                                    setIsUnsavedChanges(true);
                                                    showToast('连接已删除', 'success');
                                                }
                                            }}
                                        />
                                        
                                        {/* 临时连接线（拖拽时显示） */}
                                        {connectingFrom && tempConnectionEnd && (() => {
                                            const sourceNode = n8nNodes.find(n => n.id === connectingFrom.nodeId);
                                            if (!sourceNode) return null;
                                            
                                            // 计算源节点连接点的逻辑坐标（与 WorkflowConnectionsRenderer 一致）
                                            // 临时连接线也在 transform wrapper 内部，使用逻辑坐标
                                            const nodeWidth = 180;
                                            const nodeHeight = 65;
                                            const outputOffsetX = nodeWidth + 1.5;
                                            const outputOffsetY = nodeHeight / 2;
                                            
                                            const sourceX = sourceNode.position[0] + outputOffsetX;
                                            const sourceY = sourceNode.position[1] + outputOffsetY;
                                            
                                            // 目标点已经是逻辑坐标（从 handleMouseMoveCanvas 转换而来）
                                            const targetX = tempConnectionEnd.x;
                                            const targetY = tempConnectionEnd.y;
                                            
                                            const dx = targetX - sourceX;
                                            const controlPointOffset = Math.min(Math.abs(dx) / 2, 100);
                                            const cp1x = sourceX + controlPointOffset;
                                            const cp1y = sourceY;
                                            const cp2x = targetX - controlPointOffset;
                                            const cp2y = targetY;
                                            const path = `M ${sourceX} ${sourceY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetX} ${targetY}`;
                                            
                                            return (
                                                <svg className="absolute inset-0 pointer-events-none z-10" style={{ width: '100%', height: '100%' }}>
                                                    <path
                                                        d={path}
                                                        fill="none"
                                                        stroke="#3b82f6"
                                                        strokeWidth="2"
                                                        strokeDasharray="5,5"
                                                        opacity="0.6"
                                                    />
                                                </svg>
                                            );
                                        })()}
                                    </>
                                )}
                                {nodes.map((node) => {
                                    // 查找对应的 n8n 节点
                                    const n8nNode = n8nNodes.find(n => n.id === node.id);

                                    // 获取节点显示名称
                                    const displayName = n8nNode?.name || node.label || '未命名节点';

                                    // 执行状态
                                    const executionStatus =
                                        viewMode === 'EXECUTE' && selectedExecution
                                            ? (selectedExecution.nodeStatuses?.[node.id] as
                                                | 'success'
                                                | 'error'
                                                | 'running'
                                                | 'waiting'
                                                | 'unknown'
                                                | null) ?? null
                                            : null;

                                    const hasError =
                                        (viewMode === 'EXECUTE' && selectedExecution
                                            ? selectedExecution.nodeStatuses?.[node.id] === 'error'
                                            : false) || node.hasError;

                                    // 构建 CanvasNodeData
                                    const nodeTypeInfo = n8nNode ? getNodeType(n8nNode.type) : undefined;
                                    const currentNodeName = n8nNode?.name || '';
                                    
                                    // 计算输入连接数
                                    // n8n 连接结构：connections[sourceNodeName][connectionType][sourceOutputIndex] = [{ node, type, index }]
                                    // 实际结构：connections[sourceNodeName][connectionType] = Array<Array<{ node, type, index }>>
                                    // 对于输入连接点，需要找到所有指向当前节点的连接，并按输入类型和输入索引分组
                                    const inputConnections: any = {};
                                    Object.keys(connections).forEach(sourceName => {
                                        const sourceConnections = connections[sourceName];
                                        if (!sourceConnections) return;
                                        
                                        Object.keys(sourceConnections).forEach(connType => {
                                            const connectionArray = sourceConnections[connType];
                                            if (!Array.isArray(connectionArray)) return;
                                            
                                            // connectionArray 是 Array<Array<{ node, type, index }>>
                                            // 每个元素对应一个输出索引，是一个连接数组
                                            for (let sourceOutputIndex = 0; sourceOutputIndex < connectionArray.length; sourceOutputIndex++) {
                                                const outputConnections = connectionArray[sourceOutputIndex];
                                                if (!Array.isArray(outputConnections)) continue;
                                                
                                                outputConnections.forEach((conn: any) => {
                                                    // conn 格式：{ node: targetNodeName, type: targetInputType, index: targetInputIndex }
                                                    if (conn && conn.node === currentNodeName) {
                                                        const targetInputType = conn.type || 'main';
                                                        const targetInputIndex = conn.index ?? 0;
                                                        
                                                        if (!inputConnections[targetInputType]) {
                                                            inputConnections[targetInputType] = {};
                                                        }
                                                        if (!inputConnections[targetInputType][targetInputIndex]) {
                                                            inputConnections[targetInputType][targetInputIndex] = [];
                                                        }
                                                        inputConnections[targetInputType][targetInputIndex].push({
                                                            node: sourceName,
                                                            type: connType,
                                                            index: sourceOutputIndex,
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    });
                                    
                                    // 计算输出连接数
                                    // 对于输出连接点，直接访问 connections[currentNodeName][connectionType][outputIndex]
                                    const outputConnections: any = {};
                                    if (currentNodeName && connections[currentNodeName]) {
                                        const sourceConnections = connections[currentNodeName];
                                        Object.keys(sourceConnections).forEach(connType => {
                                            const connectionArray = sourceConnections[connType];
                                            if (!Array.isArray(connectionArray)) return;
                                            
                                            // connectionArray 是 Array<Array<{ node, type, index }>>
                                            // 每个元素对应一个输出索引，是一个连接数组
                                            for (let outputIndex = 0; outputIndex < connectionArray.length; outputIndex++) {
                                                const outputConnectionsList = connectionArray[outputIndex];
                                                if (!Array.isArray(outputConnectionsList)) continue;
                                                
                                                if (outputConnectionsList.length > 0) {
                                                    if (!outputConnections[connType]) {
                                                        outputConnections[connType] = {};
                                                    }
                                                    outputConnections[connType][outputIndex] = outputConnectionsList.map((conn: any) => ({
                                                        node: conn.node,
                                                        type: conn.type,
                                                        index: conn.index,
                                                    }));
                                                }
                                            }
                                        });
                                    }
                                    
                                    const nodeData: CanvasNodeData = {
                                        id: node.id,
                                        name: displayName,
                                        type: n8nNode?.type || node.type,
                                        position: [node.x, node.y],
                                        disabled: !!n8nNode?.disabled,
                                        inputs: [
                                            {
                                                type: 'main',
                                                index: 0,
                                                position: 'left',
                                            },
                                        ],
                                        outputs: [
                                            {
                                                type: 'main',
                                                index: 0,
                                                position: 'right',
                                            },
                                        ],
                                        connections: {
                                            input: inputConnections,
                                            output: outputConnections,
                                        },
                                        render: {
                                            type: 'default',
                                            options: {
                                                icon: nodeTypeInfo?.icon,
                                                trigger: nodeTypeInfo?.group?.includes('trigger'),
                                            },
                                        },
                                    };

                                    // 计算连接点状态
                                    const connectingHandle = connectingFrom?.nodeId === node.id
                                        ? {
                                            nodeId: node.id,
                                            handleType: (connectingFrom.type === 'output' ? 'source' : 'target') as 'source' | 'target',
                                            handleId: connectingFrom.type === 'output' 
                                                ? `output-${connectingFrom.connectionType || 'main'}-${connectingFrom.index || 0}`
                                                : `input-${connectingFrom.connectionType || 'main'}-${connectingFrom.index || 0}`,
                                        }
                                        : connectingTo?.nodeId === node.id
                                            ? {
                                                nodeId: node.id,
                                                handleType: 'target' as 'source' | 'target',
                                                handleId: `input-main-0`,
                                            }
                                            : null;
                                    
                                    return (
                                        <div 
                                            key={node.id} 
                                            style={{
                                                position: 'absolute',
                                                left: node.x,
                                                top: node.y,
                                            }}
                                            onMouseDown={(e) => handleStartDragNode(e, node.id)} 
                                        >
                                            <CanvasNode
                                                id={node.id}
                                                data={nodeData}
                                                selected={activeNodeId === node.id}
                                                readOnly={isReadOnly || viewMode !== 'EDITOR'}
                                                hovered={false}
                                                nearbyHovered={false}
                                                nodeTypeInfo={nodeTypeInfo}
                                                subtitle={undefined}
                                                hasError={hasError}
                                                hasPinnedData={false}
                                                executionStatus={executionStatus}
                                                executionWaiting={null}
                                                executionRunning={executionStatus === 'running'}
                                                hasRunData={executionStatus === 'success'}
                                                hasExecutionErrors={hasError}
                                                hasValidationErrors={false}
                                                executionErrors={[]}
                                                validationErrors={[]}
                                                runDataIterations={1}
                                                alwaysOutputData={false}
                                                executeOnce={false}
                                                retryOnFail={false}
                                                mainInputsCount={1}
                                                mainOutputsCount={1}
                                                isExperimentalNdvActive={false}
                                                onAdd={handleNodeAddConnection}
                                                onDelete={handleDeleteNode}
                                                onRun={handleRunNode}
                                                onSelect={(id, selected) => {
                                                    if (selected) {
                                                        setActiveNodeId(id);
                                                    } else {
                                                        setActiveNodeId(null);
                                                    }
                                                }}
                                                onToggle={handleToggleNode}
                                                onActivate={(id, event) => {
                                                    event.stopPropagation();
                                                if (n8nNode) {
                                                    handleNodeConfig(n8nNode);
                                                }
                                            }}
                                                onDeactivate={() => {
                                                    // 可以在这里处理节点失活
                                                }}
                                                onOpenContextMenu={(id, event, source) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                                if (n8nNode) {
                                                                    handleNodeConfig(n8nNode);
                                                                }
                                                            }}
                                                onUpdate={(id, parameters) => {
                                                    // 更新节点参数
                                                    const nodeToUpdate = n8nNodes.find(n => n.id === id);
                                                    if (nodeToUpdate) {
                                                        const updatedNode: N8nWorkflowNode = {
                                                            ...nodeToUpdate,
                                                            parameters: {
                                                                ...nodeToUpdate.parameters,
                                                                ...parameters,
                                                            },
                                                        };
                                                        setN8nNodes(prev => prev.map(n => n.id === id ? updatedNode : n));
                                                        setIsUnsavedChanges(true);
                                                    }
                                                }}
                                                onMove={(id, position) => {
                                                    // 节点移动由 handleStartDragNode 处理
                                                }}
                                                onFocus={(id) => {
                                                    setActiveNodeId(id);
                                                }}
                                                connectingHandle={connectingHandle}
                                                isValidConnection={(connection: any) => {
                                                    // 验证连接：连接类型必须匹配，且不能是同一个模式
                                                    // 格式：handleId = "input-main-0" 或 "output-main-0"
                                                    if (!connection || !connection.sourceHandle || !connection.targetHandle) {
                                                        return false;
                                                    }
                                                    
                                                    // 解析 sourceHandle 和 targetHandle
                                                    const parseHandle = (handle: string) => {
                                                        const parts = handle.split('-');
                                                        if (parts.length < 3) return null;
                                                        return {
                                                            mode: parts[0] as 'input' | 'output',
                                                            type: parts[1],
                                                            index: parseInt(parts[2], 10),
                                                        };
                                                    };
                                                    
                                                    const source = parseHandle(connection.sourceHandle);
                                                    const target = parseHandle(connection.targetHandle);
                                                    
                                                    if (!source || !target) return false;
                                                    
                                                    // 不能是同一个模式（不能从 input 连接到 input，或从 output 连接到 output）
                                                    if (source.mode === target.mode) return false;
                                                    
                                                    // 连接类型必须匹配
                                                    if (source.type !== target.type) return false;
                                                    
                                                    return true;
                                                }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Execute Button (Centered Bottom with Smart Avoidance) */}
                    {viewMode === 'EDITOR' && nodes.length > 0 && (
                        <div 
                            className="absolute bottom-6 z-30 transition-all duration-300 ease-in-out"
                            style={{ 
                                left: activePanel === 'AI_SIDEBAR' ? `calc(50% - ${aiSidebarWidth / 2}px)` : '50%',
                                transform: 'translateX(-50%)'
                            }}
                        >
                            <button onClick={handleRunWorkflow} disabled={editorExecuting} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all disabled:opacity-80 disabled:cursor-not-allowed group">
                                {editorExecuting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" className="group-hover:scale-110 transition-transform" />}
                                <span className="font-medium text-sm">{editorExecuting ? '执行中...' : '执行工作流'}</span>
                            </button>
                        </div>
                    )}

                    {/* Floating Action Bar (Bottom Right - Shifts left when AI panel opens) */}
                    <div 
                        className={`absolute bottom-8 flex items-center gap-3 z-20 transition-all duration-300 ease-in-out`}
                        style={{ right: activePanel === 'AI_SIDEBAR' ? aiSidebarWidth + 30 : 32 }}
                    >
                        <button onClick={handleUndo} disabled={history.length === 0} title="撤回上一步 (Undo)" className="w-10 h-10 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] hover:shadow-lg hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center justify-center text-slate-600 transition-all border border-slate-100"><Undo2 size={20} /></button>
                        <button onClick={handleCenterFocus} title="聚焦中心 (Focus Center)" className="w-10 h-10 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] hover:shadow-lg hover:text-slate-900 rounded-xl flex items-center justify-center text-slate-600 transition-all border border-slate-100"><Target size={20} /></button>
                        <button onClick={() => handleZoom('in')} title="放大 (Zoom In)" className="w-10 h-10 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] hover:shadow-lg hover:text-slate-900 rounded-xl flex items-center justify-center text-slate-600 transition-all border border-slate-100"><ZoomIn size={20} /></button>
                        <button onClick={() => handleZoom('out')} title="缩小 (Zoom Out)" className="w-10 h-10 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] hover:shadow-lg hover:text-slate-900 rounded-xl flex items-center justify-center text-slate-600 transition-all border border-slate-100"><ZoomOut size={20} /></button>
                        <button onClick={handleClearErrors} title="清除报错 (Clear Errors)" className="w-10 h-10 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] hover:shadow-lg hover:text-red-500 rounded-xl flex items-center justify-center text-slate-600 transition-all border border-slate-100"><Eraser size={20} /></button>
                    </div>
                </div>

                {/* --- Bottom Panel --- */}
                
                {/* 1. EDITOR Mode Log Panel */}
                {viewMode === 'EDITOR' && (
                    <div className={`border-t border-slate-200 bg-white z-30 transition-all duration-300 flex flex-col ${isLogOpen ? 'h-48' : 'h-10'}`}>
                        <div className="h-10 border-b border-slate-100 flex items-center justify-between px-4 cursor-pointer hover:bg-slate-50 select-none" onClick={() => setIsLogOpen(!isLogOpen)}>
                            <div className="flex items-center gap-2"><h3 className="text-sm font-bold text-slate-800">日志</h3></div>
                            <button className="text-slate-400"><ChevronUp size={16} className={`transform transition-transform ${isLogOpen ? 'rotate-180' : ''}`} /></button>
                        </div>
                        {isLogOpen && <div className="flex-1 p-4 overflow-y-auto bg-slate-50">
                            {executionStatus === 'SUCCESS' ? (
                                <div className="space-y-2 font-mono text-xs">
                                    {/* <div className="text-green-600">[INFO] Workflow started execution...</div>
                                    <div className="text-slate-600">[INFO] Node "Database" processed successfully.</div>
                                    <div className="text-slate-600">[INFO] Node "Email" processed successfully.</div>
                                    <div className="text-green-600 font-bold">[SUCCESS] Workflow completed in 1.2s.</div> */}
                                </div>
                            ) : executionStatus === 'RUNNING' ? (
                                <div className="space-y-2 font-mono text-xs animate-pulse">
                                    <div className="text-blue-600">[INFO] Executing workflow...</div>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500 text-sm">暂无显示内容，请执行工作流以查看日志。</div>
                            )}
                        </div>}
                    </div>
                )}

                {/* 2. EXECUTE Mode 3-Column Panel */}
                {viewMode === 'EXECUTE' && (
                    <div className="h-64 bg-white border-t border-slate-200 grid grid-cols-3 divide-x divide-slate-200 z-30 animate-in slide-in-from-bottom-10 duration-300 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                        {/* Column 1: Input */}
                        <div className="flex flex-col h-full overflow-hidden">
                            <div className="flex-1 p-6 flex flex-col justify-center items-center text-slate-400 text-sm">
                                <p>[无响应，请确保最后一个执行节点输出要在此外显示的内容]</p>
                            </div>
                            <div className="p-4 border-t border-slate-100 bg-slate-50 relative">
                                <input 
                                    value={executionInput}
                                    onChange={(e) => setExecutionInput(e.target.value)}
                                    placeholder="请输入" 
                                    className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                                />
                                <button className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600">
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Column 3: Output */}
                        <div className="flex flex-col h-full overflow-hidden">
                            <div className="h-10 px-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <Zap size={14} className="text-orange-500" fill="currentColor"/> 
                                    点击“执行工作流”时
                                </h3>
                                {selectedExecution?.status === 'success' && (
                                    <span className="text-xs text-slate-500">{selectedExecution.duration}毫秒内成功</span>
                                )}
                            </div>
                            <div className="flex-1 p-4 bg-slate-50 overflow-y-auto">
                                {selectedExecution?.data ? (
                                    <div className="border border-slate-200 rounded bg-white overflow-hidden">
                                        <div className="px-3 py-1.5 border-b border-slate-100 text-xs text-slate-500 bg-slate-50 flex items-center gap-2">
                                            <AlignLeft size={12} /> JSON Output
                                        </div>
                                        <pre className="p-3 text-xs font-mono text-slate-700 overflow-x-auto">
                                            {JSON.stringify(selectedExecution.data, null, 2)}
                                        </pre>
                                    </div>
                                ) : (
                                    <div className="border border-slate-200 rounded bg-white h-24 flex items-center justify-center gap-2 text-xs text-slate-400">
                                        <AlertTriangle size={14} /> 这是一个空结果
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
        
        {/* Global Search / Command Palette Overlay */}
        {activePanel === 'GLOBAL_SEARCH' && (
             <div 
                className="search-modal-backdrop fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
             >
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[600px] animate-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                        <Search size={20} className="text-slate-400" />
                        <input 
                            autoFocus
                            placeholder="搜索节点、工具或命令..."
                            className="flex-1 text-base outline-none text-slate-700 placeholder:text-slate-400"
                        />
                        <button onClick={() => setActivePanel('NONE')} className="px-2 py-1 bg-slate-100 text-xs rounded text-slate-500 font-medium">ESC</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">建议</div>
                        <button onClick={() => setActivePanel('NONE')} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-3 text-slate-700">
                            <Plus size={16} className="text-blue-500" />
                            添加新节点
                        </button>
                        <button onClick={() => setActivePanel('NONE')} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-3 text-slate-700">
                            <Wand2 size={16} className="text-purple-500" />
                            AI 辅助构建
                        </button>
                    </div>
                </div>
             </div>
        )}

        {/* Share Modal */}
        {isShareModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col transform transition-all scale-100 min-h-[400px] relative">
                  
                  {/* Remove Confirmation Overlay */}
                  {removeUserConfirm && (
                      <div className="absolute inset-0 z-10 bg-white/95 backdrop-blur flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
                              <AlertTriangle size={24} />
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 mb-2">确认移除用户?</h3>
                          <p className="text-sm text-slate-500 mb-6">
                              确定要移除此用户吗？他们将失去对该工作流的访问权限。
                          </p>
                          <div className="flex gap-3 w-full max-w-xs">
                              <button 
                                onClick={() => setRemoveUserConfirm(null)}
                                className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium"
                              >
                                  取消
                              </button>
                              <button 
                                onClick={confirmRemoveUser}
                                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium shadow-sm"
                              >
                                  确认移除
                              </button>
                          </div>
                      </div>
                  )}

                  {shareModalMode === 'LIST' ? (
                      <>
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-slate-900 mb-6">共享</h3>
                            
                            {/* System User Dropdown & Add */}
                            <div className="mb-6">
                                <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">添加系统用户</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <select 
                                            value={userToAdd}
                                            onChange={(e) => setUserToAdd(e.target.value)}
                                            className="w-full h-10 pl-3 pr-8 border border-slate-300 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            <option value="">选择用户...</option>
                                            {MOCK_AVAILABLE_USERS.filter(u => !sharedUsers.find(s => s.id === u.id)).map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                    <button 
                                        onClick={handleAddSystemUser}
                                        disabled={!userToAdd}
                                        className="h-10 px-4 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        添加
                                    </button>
                                </div>
                            </div>

                            {/* Invite External User Link */}
                            <div className="mb-6 flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <div className="flex items-center gap-2 text-blue-800">
                                    <Mail size={16} />
                                    <span className="text-sm font-medium">需要邀请外部人员？</span>
                                </div>
                                <button 
                                    onClick={handleSwitchToInvite}
                                    className="text-xs bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-md hover:bg-blue-600 hover:text-white transition-colors font-medium"
                                >
                                    通过邮箱邀请
                                </button>
                            </div>

                            {/* User List Header */}
                            <div className="text-xs font-bold text-slate-500 mb-3 uppercase">已添加成员</div>

                            {/* User List */}
                            <div className="space-y-4 max-h-[200px] overflow-y-auto pr-1">
                                {sharedUsers.map(user => (
                                    <div key={user.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-400 shrink-0">
                                                <span className="text-xs font-bold">{user.name[0].toUpperCase()}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-800 leading-tight">{user.name}</span>
                                                <span className="text-xs text-slate-500 leading-tight mt-0.5">{user.email}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {user.role === 'OWNER' ? (
                                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">所有者</span>
                                            ) : (
                                                <>
                                                    <span className="text-sm text-slate-600">
                                                        {user.role === 'ADMIN' ? '管理员' : '用户'}
                                                    </span>
                                                    <button 
                                                        onClick={() => handleRemoveClick(user.id)}
                                                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 flex justify-end mt-auto">
                            <button 
                                onClick={handleSaveShare} 
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                            >
                                完成
                            </button>
                        </div>
                      </>
                  ) : (
                      // INVITE View
                      <>
                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <button onClick={() => setShareModalMode('LIST')} className="p-1 hover:bg-slate-100 rounded-full -ml-2 text-slate-500"><ArrowLeft size={20}/></button>
                                <h3 className="text-xl font-bold text-slate-900">邀请外部用户</h3>
                            </div>
                            
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-500">邮箱地址 <span className="text-red-500">*</span></label>
                                    <input 
                                        autoFocus
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="name@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-500">分配角色 <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <select 
                                            value={inviteRole}
                                            onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'USER')}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white text-slate-700"
                                        >
                                            <option value="ADMIN">管理员</option>
                                            <option value="USER">用户</option>
                                        </select>
                                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 flex justify-end mt-auto gap-3">
                            <button 
                                onClick={() => setShareModalMode('LIST')}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                            >
                                取消
                            </button>
                            <button 
                                onClick={handleInviteUser}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                            >
                                发送邀请
                            </button>
                        </div>
                      </>
                  )}
               </div>
            </div>
        )}

        {/* Workflow Settings Modal */}
        {isWorkflowSettingsModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                        <h3 className="text-lg font-bold text-slate-800">当前工作流设置</h3>
                        <button onClick={() => setIsWorkflowSettingsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto space-y-5 bg-white text-sm">
                        <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                            <label className="text-slate-700 font-medium">执行顺序</label>
                            <select 
                                value={wfSettings.executionOrder}
                                onChange={(e) => setWfSettings({...wfSettings, executionOrder: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white"
                            >
                                <option value="v1">v1</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                            <label className="text-slate-700 font-medium">错误工作流 (当此工作流出错时通知)</label>
                            <select 
                                value={wfSettings.errorWorkflow}
                                onChange={(e) => setWfSettings({...wfSettings, errorWorkflow: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white"
                            >
                                <option value="none">无工作流</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                            <label className="text-slate-700 font-medium">此工作流可由以下工作流调用</label>
                            <select 
                                value={wfSettings.callerWorkflow}
                                onChange={(e) => setWfSettings({...wfSettings, callerWorkflow: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white"
                            >
                                <option value="none">无其他工作流</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                            <label className="text-slate-700 font-medium">可以调用此工作流的工作流ID</label>
                            <input 
                                value={wfSettings.callerIds}
                                onChange={(e) => setWfSettings({...wfSettings, callerIds: e.target.value})}
                                placeholder="如: 13, 14"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                            <label className="text-slate-700 font-medium">保存失败的生产执行</label>
                            <select 
                                value={wfSettings.saveFailedExec}
                                onChange={(e) => setWfSettings({...wfSettings, saveFailedExec: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white"
                            >
                                <option value="default">默认-保存</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                            <label className="text-slate-700 font-medium">保存成功的生产执行</label>
                            <select 
                                value={wfSettings.saveSuccessExec}
                                onChange={(e) => setWfSettings({...wfSettings, saveSuccessExec: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white"
                            >
                                <option value="default">默认-保存</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                            <label className="text-slate-700 font-medium">保存手动执行</label>
                            <select 
                                value={wfSettings.saveManualExec}
                                onChange={(e) => setWfSettings({...wfSettings, saveManualExec: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white"
                            >
                                <option value="default">默认-保存</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                            <label className="text-slate-700 font-medium">保存执行进度</label>
                            <select 
                                value={wfSettings.saveProgress}
                                onChange={(e) => setWfSettings({...wfSettings, saveProgress: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white"
                            >
                                <option value="default">默认-保存</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                            <label className="text-slate-700 font-medium">超时工作流</label>
                            <div>
                                <button 
                                    onClick={() => setWfSettings(prev => ({...prev, timeoutEnabled: !prev.timeoutEnabled}))}
                                    className={`w-11 h-6 rounded-full relative transition-colors ${wfSettings.timeoutEnabled ? 'bg-green-500' : 'bg-slate-200'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${wfSettings.timeoutEnabled ? 'left-6' : 'left-1'}`}></div>
                                </button>
                            </div>
                        </div>

                        <div className={`grid grid-cols-[200px_1fr] items-center gap-4 transition-opacity ${wfSettings.timeoutEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                            <label className="text-slate-700 font-medium">超时时间</label>
                            <div className="flex gap-3">
                                <div className="flex items-center relative">
                                    <input 
                                        className="w-full border border-slate-300 rounded-md px-2 py-1.5 outline-none focus:border-blue-500 text-center"
                                        value={wfSettings.timeout.h}
                                        onChange={(e) => setWfSettings({...wfSettings, timeout: {...wfSettings.timeout, h: e.target.value}})}
                                    />
                                    <span className="absolute right-2 text-slate-400 text-xs pointer-events-none">小时</span>
                                </div>
                                <div className="flex items-center relative">
                                    <input 
                                        className="w-full border border-slate-300 rounded-md px-2 py-1.5 outline-none focus:border-blue-500 text-center"
                                        value={wfSettings.timeout.m}
                                        onChange={(e) => setWfSettings({...wfSettings, timeout: {...wfSettings.timeout, m: e.target.value}})}
                                    />
                                    <span className="absolute right-2 text-slate-400 text-xs pointer-events-none">分钟</span>
                                </div>
                                <div className="flex items-center relative">
                                    <input 
                                        className="w-full border border-slate-300 rounded-md px-2 py-1.5 outline-none focus:border-blue-500 text-center"
                                        value={wfSettings.timeout.s}
                                        onChange={(e) => setWfSettings({...wfSettings, timeout: {...wfSettings.timeout, s: e.target.value}})}
                                    />
                                    <span className="absolute right-2 text-slate-400 text-xs pointer-events-none">秒</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                            <label className="text-slate-700 font-medium">预计节省时间</label>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center border border-slate-300 rounded-md bg-white">
                                    <button className="px-3 py-1.5 hover:bg-slate-50 border-r border-slate-300 text-slate-500" onClick={() => setWfSettings(s => ({...s, savedTime: Math.max(0, s.savedTime - 1)}))}>-</button>
                                    <span className="px-4 py-1 text-sm text-slate-700 min-w-[3rem] text-center font-medium">{wfSettings.savedTime}</span>
                                    <button className="px-3 py-1.5 hover:bg-slate-50 border-l border-slate-300 text-slate-500" onClick={() => setWfSettings(s => ({...s, savedTime: s.savedTime + 1}))}>+</button>
                                </div>
                                <span className="text-slate-500 text-sm">每次执行所需分钟数</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
                        <button onClick={handleSaveSettings} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">保存</button>
                    </div>
                </div>
            </div>
        )}

        {/* ... (Other existing modals kept as they were) ... */}
        {/* Edit Description Modal */}
        {isDescModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                        <h3 className="text-lg font-bold text-slate-800">描述</h3>
                        <button onClick={handleAiPolish} disabled={isAiPolishing} className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-2 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50">
                            {isAiPolishing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} AI 润色
                        </button>
                    </div>
                    <div className="p-6 bg-slate-50">
                        <textarea value={descDraft} onChange={(e) => setDescDraft(e.target.value)} className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white" placeholder="填写简短的工作流描述..." />
                    </div>
                    <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
                        <button onClick={() => setIsDescModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">取消</button>
                        <button onClick={handleSaveDescription} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">保存</button>
                    </div>
                </div>
            </div>
        )}

        {/* Publish Confirmation Modal */}
        {isPublishModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                     <h3 className="text-lg font-bold text-slate-800">
                        确认发布工作流
                     </h3>
                     <button onClick={() => setIsPublishModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                     <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">工作流名称</label>
                        <input 
                          autoFocus
                          value={publishName}
                          onChange={(e) => setPublishName(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">描述</label>
                        <textarea 
                          value={publishDesc}
                          onChange={(e) => setPublishDesc(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                        />
                     </div>
                  </div>
                  <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                      <button onClick={() => setIsPublishModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors">取消</button>
                      <button 
                        onClick={confirmPublish}
                        disabled={!publishName.trim()}
                        className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Rocket size={16} /> 确认发布
                      </button>
                  </div>
               </div>
            </div>
        )}

        {/* Not Executed Warning Modal */}
        {notExecutedWarning && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setNotExecutedWarning(false)}>
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                    <div className="p-6 text-center">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">无法发布</h3>
                        <p className="text-sm text-slate-500 mb-6 px-4 leading-relaxed">
                            工作流必须先进行测试运行并<b>保存且执行成功</b>后才能发布。请点击编辑器下方的“执行工作流”按钮进行测试。
                        </p>
                        <button 
                            onClick={() => setNotExecutedWarning(false)}
                            className="w-full py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 text-sm font-medium shadow-md transition-colors"
                        >
                            知道了
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Unsaved Changes Warning Modal */}
        {showUnsavedWarning && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowUnsavedWarning(false)}>
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                    <div className="p-6 text-center">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                            <Save size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">存在未保存的更改</h3>
                        <p className="text-sm text-slate-500 mb-6 px-4 leading-relaxed">
                            请先保存当前工作流的修改，然后再进行发布操作。
                        </p>
                        <div className="flex gap-3">
                            <button 
                            onClick={() => setShowUnsavedWarning(false)}
                            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
                            >
                                知道了
                            </button>
                            <button 
                            onClick={() => {
                                handleSave();
                                setShowUnsavedWarning(false);
                            }}
                            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium shadow-md transition-colors"
                            >
                                立即保存
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Save As Version Modal */}
        {isSaveVersionModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-lg font-bold text-slate-800">另存为新版本</h3>
                        <button onClick={() => setIsSaveVersionModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                    <div className="p-6">
                        <label className="text-sm font-medium text-slate-700 block mb-2">版本号</label>
                        <input 
                            autoFocus
                            value={nextVersionInput}
                            onChange={(e) => setNextVersionInput(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                            placeholder="e.g. 1.0.1"
                        />
                        <p className="text-xs text-slate-500 mt-2">新版本将默认保存为草稿状态。</p>
                    </div>
                    <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                        <button 
                            onClick={() => setIsSaveVersionModalOpen(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors"
                        >
                            取消
                        </button>
                        <button 
                            onClick={confirmSaveVersion}
                            disabled={!nextVersionInput.trim()}
                            className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
                        >
                            保存
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Switch Version Confirmation Modal */}
        {switchVersionModal.isOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                    <div className="p-6 text-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                            <CheckCircle2 size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">另存版本成功</h3>
                        <p className="text-sm text-slate-500 mb-6 px-4 leading-relaxed">
                            已成功保存为版本 <span className="font-bold text-slate-800">v{switchVersionModal.newVersion}</span>。<br/>
                            是否立即切换到新版本进行编辑？
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setSwitchVersionModal({ isOpen: false, newId: '', newVersion: '' })}
                                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
                            >
                                留在当前版本
                            </button>
                            <button 
                                onClick={() => {
                                    setSwitchVersionModal({ isOpen: false, newId: '', newVersion: '' });
                                    navigate(`/editor/${switchVersionModal.newId}`);
                                    showToast(`已切换至版本 v${switchVersionModal.newVersion}`, 'success');
                                }}
                                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium shadow-md transition-colors"
                            >
                                切换至新版本
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Duplicate Success Modal */}
        {duplicateSuccessModal.isOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                    <div className="p-6 text-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                            <Copy size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">复制成功</h3>
                        <p className="text-sm text-slate-500 mb-6 px-4 leading-relaxed">
                            已成功创建副本 <span className="font-bold text-slate-800">{duplicateSuccessModal.newName}</span>。<br/>
                            是否立即切换到新副本进行编辑？
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setDuplicateSuccessModal({ isOpen: false, newId: '', newName: '' })}
                                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
                            >
                                留在当前
                            </button>
                            <button 
                                onClick={() => {
                                    setDuplicateSuccessModal({ isOpen: false, newId: '', newName: '' });
                                    navigate(`/editor/${duplicateSuccessModal.newId}`);
                                    showToast(`已切换至副本`, 'success');
                                }}
                                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium shadow-md transition-colors"
                            >
                                切换至副本
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Export Modal */}
        {isExportModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-lg font-bold text-slate-800">导出工作流</h3>
                        <button onClick={() => setIsExportModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                    <div className="flex border-b border-slate-200">
                        <button 
                            onClick={() => setExportTab('JSON')}
                            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${exportTab === 'JSON' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            JSON 文件
                        </button>
                        <button 
                            onClick={() => setExportTab('URL')}
                            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${exportTab === 'URL' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            分享链接 (URL)
                        </button>
                    </div>
                    <div className="p-6">
                        {exportTab === 'JSON' ? (
                            <p className="text-sm text-slate-500 mb-4">
                                将当前工作流导出为标准的 JSON 配置文件，可用于备份或迁移到其他环境。
                            </p>
                        ) : (
                            <p className="text-sm text-slate-500 mb-4">
                                生成一个可供他人导入的只读链接。
                            </p>
                        )}
                        <button 
                            onClick={executeExport}
                            className="w-full py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 text-sm font-medium shadow-md transition-colors flex items-center justify-center gap-2"
                        >
                            {exportTab === 'JSON' ? <><Download size={16}/> 下载 JSON</> : <><Link size={16}/> 复制链接</>}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Import URL Modal */}
        {isImportUrlModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-lg font-bold text-slate-800">通过 URL 导入</h3>
                        <button onClick={() => setIsImportUrlModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">工作流链接</label>
                            <input 
                                autoFocus
                                value={importUrlInput}
                                onChange={(e) => setImportUrlInput(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="https://..."
                            />
                        </div>
                        <button 
                            onClick={handleUrlImportSubmit}
                            disabled={!importUrlInput.trim()}
                            className="w-full py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            导入
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Import JSON Modal */}
        {isImportJsonModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-lg font-bold text-slate-800">导入 JSON 配置</h3>
                        <button onClick={() => setIsImportJsonModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                    <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                            <input type="file" accept=".json" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <UploadCloud size={24} className="mx-auto text-slate-400 mb-2" />
                            <p className="text-sm text-slate-600 font-medium">点击上传文件</p>
                            <p className="text-xs text-slate-400">支持 .json 格式</p>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-2 bg-white text-slate-500">或粘贴代码</span>
                            </div>
                        </div>
                        <textarea 
                            value={importJsonText}
                            onChange={(e) => setImportJsonText(e.target.value)}
                            className="w-full h-40 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs font-mono resize-none"
                            placeholder='{"nodes": [...], "notes": [...]}'
                        />
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
                        <button 
                            onClick={handleJsonImportSubmit}
                            disabled={!importJsonText.trim()}
                            className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            解析并导入
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Overwrite Warning Modal */}
        {showOverwriteAlert && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                    <div className="p-6 text-center">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">确认覆盖画布？</h3>
                        <p className="text-sm text-slate-500 mb-6 px-4 leading-relaxed">
                            当前画布中已有节点。导入操作将完全覆盖现有内容且无法撤销。是否继续？
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => {
                                    setShowOverwriteAlert(false);
                                    setPendingImportPayload(null);
                                }}
                                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
                            >
                                取消
                            </button>
                            <button 
                                onClick={() => {
                                    if (pendingImportPayload) {
                                        applyImport(pendingImportPayload);
                                    }
                                }}
                                className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 text-sm font-medium shadow-md transition-colors"
                            >
                                确认覆盖
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Execution Toast */}
        {toast && (
            <div 
                className="absolute left-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300 transition-all ease-in-out"
                style={{ bottom: isLogOpen ? '210px' : '60px' }} // Fixed here
            >
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border ${toast.type === 'success' ? 'bg-white border-green-200 text-green-700' : 'bg-white border-red-200 text-red-700'}`}>
                    {toast.type === 'success' ? <CheckCircle2 size={20} className="text-green-500" /> : <AlertCircle size={20} className="text-red-500" />}
                    <span className="font-medium text-sm">{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600"><X size={14} /></button>
                </div>
            </div>
        )}

        {/* Tag Manager Modal */}
        <TagManagementModal isOpen={isTagManagerOpen} onClose={() => setIsTagManagerOpen(false)} availableTags={tags} workflows={workflows} assistants={assistants} onRenameTag={renameTag} onDeleteTag={deleteTag} onCreateTag={handleTagCreate} />

        {/* Node Config Panel */}
        {showNodeConfig && configNode && (
          <NodeConfigPanel
            node={configNode}
            nodeTypeInfo={configNodeTypeInfo}
            onClose={() => {
              setShowNodeConfig(false);
              setConfigNode(null);
              setConfigNodeTypeInfo(null);
            }}
            onSave={handleNodeConfigSave}
            onOpenCredentialModal={handleOpenCredentialModal}
          />
        )}

        {/* Credential Config Modal */}
        {showCredentialModal && (
          <CredentialConfigModal
            credentialType={credentialType}
            nodeId={credentialNodeId}
            onClose={() => {
              setShowCredentialModal(false);
              setCredentialType('');
              setCredentialNodeId('');
            }}
            onSave={handleCredentialSave}
          />
        )}

        {/* Node Selector Modal */}
        <NodeSelectorModal
          isOpen={isNodeSelectorOpen}
          onClose={() => setIsNodeSelectorOpen(false)}
          hasTrigger={n8nNodes.some(node => node.type.includes('Trigger') || node.type === 'n8n-nodes-base.manualTrigger')}
          onNodeSelected={handleNodeSelectorNodeSelected}
          onAddTrigger={handleAddTrigger}
          nodeTypesByCategory={nodeTypesByCategory}
        />

        {/* Execution Log Panel - Now handled by WorkflowEditorLayout */}
        {/* Old ExecutionLogPanel removed */}
      </div>
    </WorkflowEditorLayout>
  );
};

export default WorkflowEditor;