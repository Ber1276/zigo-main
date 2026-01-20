import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wrench, 
  PlusCircle, 
  Settings, 
  Workflow, 
  User, 
  LogOut, 
  Box,
  ChevronRight,
  Menu,
  X,
  Cpu,
  BrainCircuit,
  Bot,
  LayoutGrid,
  AppWindow,
  Sparkles,
  ShoppingBag,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronsLeft,
  ChevronsRight,
  Home as HomeIcon,
  AlertTriangle,
  Save
} from 'lucide-react';
import { ToolDefinition, UserRole, ParameterType, ToolType, ModelDefinition, ModelProvider, Workflow as WorkflowType, Assistant, PublishStatus } from './types';
import ToolRegistry from './pages/ToolRegistry';
import ToolHub from './pages/ToolHub';
import WorkflowEditor from './pages/WorkflowEditor';
import AssistantEditor from './pages/AssistantEditor';
import Dashboard from './pages/Dashboard';
import ModelManagement from './pages/ModelManagement';
import SmartStudio from './pages/SmartStudio/SmartStudio';
import AppManagement from './pages/SmartStudio/AppManagement';
import AppCenter from './pages/AppCenter';
import Home from './pages/Home';
import { AuthGuard } from './components/AuthGuard';
import { authApi, tagsApi } from './services/n8nApi';

// --- Context ---

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  tools: ToolDefinition[];
  addTool: (tool: ToolDefinition) => void;
  updateTool: (tool: ToolDefinition) => void;
  deleteTool: (id: string) => void;
  models: ModelDefinition[];
  addModel: (model: ModelDefinition) => void;
  updateModel: (model: ModelDefinition) => void;
  deleteModel: (id: string) => void;
  workflows: WorkflowType[];
  setWorkflows: React.Dispatch<React.SetStateAction<WorkflowType[]>>;
  assistants: Assistant[];
  setAssistants: React.Dispatch<React.SetStateAction<Assistant[]>>;
  tags: string[];
  addTag: (tag: string) => void;
  deleteTag: (tag: string) => void;
  renameTag: (oldTag: string, newTag: string) => void;
  isUnsavedChanges: boolean;
  setIsUnsavedChanges: (isUnsaved: boolean) => void;
  registerSaveHandler: (handler: () => void) => void;
  requestNavigation: (path: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};

// --- Mock Data ---

const INITIAL_TOOLS: ToolDefinition[] = [
  {
    id: '1',
    name: 'SlackNotifier',
    description: '通过 Webhook 发送消息到 Slack 频道。',
    method: 'POST',
    baseUrl: 'https://hooks.slack.com',
    endpoint: '/services/T000/B000/XXXX',
    category: '通信',
    version: '1.0.0',
    status: 'ACTIVE',
    type: ToolType.API,
    createdBy: 'System',
    createdAt: new Date().toISOString(),
    parameters: [
      { id: 'p1', key: 'text', label: '消息内容', type: ParameterType.STRING, required: true, description: '要发送的消息文本' },
      { id: 'p2', key: 'channel', label: '频道', type: ParameterType.STRING, required: false, description: '覆盖默认频道' }
    ]
  },
  {
    id: '2',
    name: 'CustomerEnrichment',
    description: '从内部 CRM 获取详细的客户信息。',
    method: 'GET',
    baseUrl: 'https://crm.internal.api',
    endpoint: '/v1/customers',
    category: '数据',
    version: '2.1.0',
    status: 'ACTIVE',
    type: ToolType.API,
    createdBy: 'User', // Matches the default user context
    createdAt: new Date().toISOString(),
    parameters: [
      { id: 'p3', key: 'email', label: '电子邮箱', type: ParameterType.STRING, required: true, description: '要查询的客户邮箱' },
      { id: 'p4', key: 'includeHistory', label: '包含历史记录', type: ParameterType.BOOLEAN, required: false, defaultValue: 'false' }
    ]
  },
  {
    id: '3',
    name: 'PDFGenerator',
    description: '系统内置 PDF 生成服务。',
    method: 'POST',
    baseUrl: 'https://api.system.com',
    endpoint: '/v1/pdf',
    category: '工具',
    version: '1.0.0',
    status: 'ACTIVE',
    type: ToolType.API,
    createdBy: 'System',
    createdAt: new Date().toISOString(),
    parameters: [
      { id: 'p5', key: 'html', label: 'HTML内容', type: ParameterType.STRING, required: true }
    ]
  },
  {
    id: '4',
    name: 'FilesystemMCP',
    description: '允许模型访问本地指定目录的文件系统 MCP 服务。',
    method: 'MCP',
    baseUrl: 'stdio://local-fs-server',
    endpoint: 'read_file',
    category: '文件系统',
    version: '0.9.5',
    status: 'ACTIVE',
    type: ToolType.MCP,
    createdBy: 'System',
    createdAt: new Date().toISOString(),
    parameters: [
      { id: 'p6', key: 'path', label: '文件路径', type: ParameterType.STRING, required: true }
    ]
  },
  {
    id: '5',
    name: 'MyDatabaseQuery',
    description: '自定义数据库查询 MCP 工具。',
    method: 'MCP',
    baseUrl: 'sse://my-db-mcp.internal',
    endpoint: 'query',
    category: '数据库',
    version: '1.0.0',
    status: 'ACTIVE',
    type: ToolType.MCP,
    createdBy: 'User',
    createdAt: new Date().toISOString(),
    parameters: [
      { id: 'p7', key: 'sql', label: 'SQL 语句', type: ParameterType.STRING, required: true }
    ]
  }
];

const INITIAL_MODELS: ModelDefinition[] = [
  {
    id: 'm1',
    name: 'Llama 3 8B (Local)',
    provider: ModelProvider.OLLAMA,
    baseUrl: 'http://localhost:11434',
    modelId: 'llama3:latest',
    contextWindow: 8192,
    description: '本地部署的通用大语言模型，适用于一般任务。',
    status: 'ONLINE',
    latency: 45,
    createdAt: new Date().toISOString()
  },
  {
    id: 'm2',
    name: 'Qwen 2.5 Coder',
    provider: ModelProvider.VLLM,
    baseUrl: 'http://192.168.1.100:8000',
    modelId: 'qwen2.5-coder-7b-instruct',
    contextWindow: 32768,
    description: '针对代码生成优化的模型。',
    status: 'ONLINE',
    latency: 32,
    createdAt: new Date().toISOString()
  },
  {
    id: 'm3',
    name: 'DeepSeek R1 Distill',
    provider: ModelProvider.LOCALAI,
    baseUrl: 'http://localhost:8080',
    modelId: 'deepseek-r1',
    contextWindow: 16384,
    description: '推理能力增强的蒸馏模型。',
    status: 'OFFLINE',
    createdAt: new Date().toISOString()
  }
];

// 初始工作流列表为空，数据从后端获取
const INITIAL_WORKFLOWS: WorkflowType[] = [];

const INITIAL_ASSISTANTS: Assistant[] = [
  {
    id: 'a1',
    name: '代码审查助手',
    description: '专注于 Python 和 TypeScript 代码的审查与优化建议。',
    status: 'SHARED',
    version: '1.0',
    owner: 'User',
    modelId: 'm2',
    createdAt: new Date().toISOString(),
    avatar: '👨‍💻',
    tags: ['开发', 'Code Review']
  },
  {
    id: 'a2',
    name: '数据分析师',
    description: '帮助解释 SQL 查询结果并生成图表建议。',
    status: 'PUBLISHED',
    version: '2.1',
    owner: 'User',
    modelId: 'm1',
    createdAt: new Date().toISOString(),
    avatar: '📊',
    tags: ['Data', 'SQL']
  }
];

// --- Layout Component ---

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, setRole, requestNavigation } = useAppContext();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Updated Navigation Structure
  const navItems = [
    { path: '/', icon: HomeIcon, label: '首页', type: 'link' },
    { path: '/studio', icon: Sparkles, label: '智能工坊', type: 'link' },
    { path: '/apps', icon: ShoppingBag, label: '应用中心', type: 'link' },
    { path: '/tools', icon: Box, label: '工具中心', type: 'link' },
    { path: '/models', icon: BrainCircuit, label: '模型管理', type: 'link' },
  ];

  if (role === UserRole.ADMIN) {
    navItems.push(
      { path: '/studio/admin', icon: AppWindow, label: '应用管理', type: 'link' }
    );
  }

  const handleNavClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    requestNavigation(path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30 bg-slate-900 text-white transform transition-all duration-300 ease-in-out flex flex-col
        ${mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
        ${!mobileMenuOpen && (collapsed ? 'md:w-20' : 'md:w-64')}
      `}>
        <div className={`p-6 flex items-center gap-3 border-b border-slate-700 h-20 ${collapsed ? 'justify-center px-0' : ''}`}>
          <div className="w-8 h-8 rounded bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center font-bold text-white shadow-lg shadow-orange-500/20 shrink-0">
            Z
          </div>
          {!collapsed && (
            <div className="animate-in fade-in duration-200 overflow-hidden whitespace-nowrap">
              <h1 className="font-bold text-lg tracking-tight">智构 Zigo</h1>
              <p className="text-xs text-slate-400">智能开发平台</p>
            </div>
          )}
        </div>

        <nav className="flex-1 mt-6 px-3 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {navItems.map((item, idx) => {
             // Logic to highlight
             const isActive = location.pathname === item.path || 
                              (item.path === '/' && location.pathname === '/') ||
                              (item.path === '/studio' && (location.pathname.startsWith('/assistant') || location.pathname.startsWith('/editor'))) ||
                              (item.path === '/tools' && location.pathname.startsWith('/register'));
             
             return (
              <a
                key={item.path}
                href={`#${item.path}`}
                title={collapsed ? item.label : ''}
                onClick={(e) => handleNavClick(e, item.path)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-900/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
              >
                {item.icon && <item.icon size={20} className="shrink-0" />}
                {!collapsed && <span className="whitespace-nowrap animate-in fade-in duration-200">{item.label}</span>}
              </a>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-900 space-y-4">
          {!collapsed && (
            <div className="flex items-center gap-3 px-2 animate-in fade-in duration-200 overflow-hidden whitespace-nowrap">
              <div className={`w-2 h-2 rounded-full ${role === UserRole.ADMIN ? 'bg-red-500' : 'bg-green-500'}`} />
              <span className="text-xs text-slate-400 font-mono uppercase">
                {role === UserRole.ADMIN ? '管理员模式' : '用户模式'}
              </span>
            </div>
          )}

          {/* Collapse Toggle for Desktop */}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex w-full items-center justify-center p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
             {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden text-slate-500"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-3">
              {location.pathname === '/' ? '首页' :
               location.pathname === '/dashboard' ? '数据看板' :
               location.pathname === '/register' ? '注册工具' :
               location.pathname === '/models' ? '模型管理' :
               location.pathname === '/apps' ? '应用中心' :
               location.pathname.startsWith('/studio') ? (location.pathname.includes('admin') ? '应用管理中心' : '智能工坊') :
               location.pathname.startsWith('/editor') ? '工作流编辑器' :
               location.pathname.startsWith('/assistant') ? '智能助手编排' :
               '工具中心'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-green-50 animate-pulse"></span>
              系统运行正常
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-sm shadow-sm ring-2 ring-white">
              {role === UserRole.ADMIN ? '管' : '用'}
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className={`flex-1 overflow-auto ${
            location.pathname === '/' || 
            location.pathname.startsWith('/editor') || 
            location.pathname.startsWith('/assistant') 
            ? 'p-0' : 'p-6'
        }`}>
          <div className={`mx-auto h-full ${
              location.pathname === '/' || 
              location.pathname.startsWith('/editor') || 
              location.pathname.startsWith('/assistant') 
              ? '' : 'max-w-7xl'
          }`}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

// --- App Content Component ---

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const { role, setRole } = useAppContext();
  const [tools, setTools] = useState<ToolDefinition[]>(INITIAL_TOOLS);
  const [models, setModels] = useState<ModelDefinition[]>(INITIAL_MODELS);
  const [workflows, setWorkflows] = useState<WorkflowType[]>(INITIAL_WORKFLOWS);
  const [assistants, setAssistants] = useState<Assistant[]>(INITIAL_ASSISTANTS);
  const [isUnsavedChanges, setIsUnsavedChanges] = useState(false);
  
  // Navigation Guard State
  const [navConfirmOpen, setNavConfirmOpen] = useState(false);
  const [navTarget, setNavTarget] = useState<string | null>(null);
  
  // Initialize tags from existing data
  const [tags, setTags] = useState<string[]>([]);

  // Ref to hold save handler
  const saveHandlerRef = useRef<(() => void) | null>(null);

  // 根据用户信息自动设置角色（在 AuthGuard 中处理，这里只做初始设置）
  useEffect(() => {
    const updateRole = async () => {
      const user = await authApi.getCurrentUser();
      if (user) {
        // n8n 用户角色映射（根据 n8n API 文档）：
        // - 'global:owner' -> ADMIN（全局所有者）
        // - 'global:admin' -> ADMIN（全局管理员）
        // - 'global:member' 或其他 -> USER（普通用户）
        // n8n 使用 role 字段，值为 'global:owner' | 'global:admin' | 'global:member'
        const userRole = (user.globalRole || user.role || '').toLowerCase();
        // 检查是否为管理员角色（global:owner 或 global:admin）
        const isAdmin = userRole === 'global:owner' || userRole === 'global:admin';
        
        // 调试日志
        console.log('App.tsx 用户角色判断:', {
          userRole,
          isAdmin,
          userRoleRaw: user.globalRole || user.role,
          user: user,
        });
        
        setRole(isAdmin ? UserRole.ADMIN : UserRole.USER);
      } else {
        // 未登录，默认为普通用户
        setRole(UserRole.USER);
      }
    };
    updateRole();
  }, []);

  // 从后端加载标签
  useEffect(() => {
    const loadTags = async () => {
      try {
        const backendTags = await tagsApi.list();
        // n8n 返回的标签格式：{ id, name, createdAt, updatedAt }
        const tagNames = backendTags.map((tag: any) => tag.name || tag).filter(Boolean);
        setTags(tagNames.sort());
      } catch (error) {
        console.error('加载标签失败:', error);
        // 如果加载失败，使用本地标签作为后备
        const uniqueTags = new Set<string>();
        workflows.forEach(w => w.tags?.forEach(t => uniqueTags.add(t)));
        assistants.forEach(a => a.tags?.forEach(t => uniqueTags.add(t)));
        setTags(Array.from(uniqueTags).sort());
      }
    };
    loadTags();
  }, []); 

  const addTool = (tool: ToolDefinition) => setTools(prev => [tool, ...prev]);
  const updateTool = (tool: ToolDefinition) => setTools(prev => prev.map(t => t.id === tool.id ? tool : t));
  const deleteTool = (id: string) => setTools(prev => prev.filter(t => t.id !== id));

  const addModel = (model: ModelDefinition) => setModels(prev => [model, ...prev]);
  const updateModel = (model: ModelDefinition) => setModels(prev => prev.map(m => m.id === model.id ? model : m));
  const deleteModel = (id: string) => setModels(prev => prev.filter(m => m.id !== id));

  // Tag Management - 接入后端 API
  const addTag = async (tag: string) => {
    try {
      // 先检查标签是否已存在
      if (tags.includes(tag)) return;
      
      // 调用后端 API 创建标签
      await tagsApi.create({ name: tag });
      
      // 更新本地状态
      setTags(prev => {
        if (prev.includes(tag)) return prev;
        return [tag, ...prev].sort(); // Add to top and sort
      });
    } catch (error: any) {
      console.error('创建标签失败:', error);
      // 如果创建失败（可能是标签已存在），仍然更新本地状态
      if (error.response?.status === 409) {
        // 标签已存在，刷新标签列表
        const backendTags = await tagsApi.list();
        const tagNames = backendTags.map((t: any) => t.name || t).filter(Boolean);
        setTags(tagNames.sort());
      }
    }
  };

  const deleteTag = async (tag: string) => {
    try {
      // 查找标签 ID（如果后端返回的是对象）
      const backendTags = await tagsApi.list();
      const tagObj = backendTags.find((t: any) => (t.name || t) === tag);
      
      if (tagObj && tagObj.id) {
        // 调用后端 API 删除标签
        await tagsApi.delete(tagObj.id);
      }
      
      // 更新本地状态
      setTags(prev => prev.filter(t => t !== tag));
      // Also remove from workflows and assistants
      setWorkflows(prev => prev.map(w => ({
          ...w,
          tags: w.tags?.filter(t => t !== tag)
      })));
      setAssistants(prev => prev.map(a => ({
          ...a,
          tags: a.tags?.filter(t => t !== tag)
      })));
    } catch (error) {
      console.error('删除标签失败:', error);
      // 即使删除失败，也更新本地状态
      setTags(prev => prev.filter(t => t !== tag));
    }
  };

  const renameTag = async (oldTag: string, newTag: string) => {
    if (tags.includes(newTag)) return;
    
    try {
      // 查找旧标签 ID
      const backendTags = await tagsApi.list();
      const tagObj = backendTags.find((t: any) => (t.name || t) === oldTag);
      
      if (tagObj && tagObj.id) {
        // 调用后端 API 更新标签
        await tagsApi.update(tagObj.id, { name: newTag });
      }
      
      // 更新本地状态
      setTags(prev => prev.map(t => t === oldTag ? newTag : t).sort());
      // Update in resources
      setWorkflows(prev => prev.map(w => ({
          ...w,
          tags: w.tags?.map(t => t === oldTag ? newTag : t)
      })));
      setAssistants(prev => prev.map(a => ({
          ...a,
          tags: a.tags?.map(t => t === oldTag ? newTag : t)
      })));
    } catch (error: any) {
      console.error('重命名标签失败:', error);
      if (error.response?.status === 409) {
        // 新标签名已存在，刷新标签列表
        const backendTags = await tagsApi.list();
        const tagNames = backendTags.map((t: any) => t.name || t).filter(Boolean);
        setTags(tagNames.sort());
      }
    }
  };

  const registerSaveHandler = (handler: () => void) => {
    saveHandlerRef.current = handler;
  };

  const requestNavigation = (path: string) => {
    if (isUnsavedChanges) {
      setNavTarget(path);
      setNavConfirmOpen(true);
    } else {
      navigate(path);
    }
  };

  const handleDiscard = () => {
    setIsUnsavedChanges(false);
    setNavConfirmOpen(false);
    if (navTarget) navigate(navTarget);
  };

  const handleSaveAndLeave = () => {
    if (saveHandlerRef.current) {
        saveHandlerRef.current(); // Trigger save in editor
    }
    // Assume save is handled
    setIsUnsavedChanges(false); 
    setNavConfirmOpen(false);
    if (navTarget) navigate(navTarget);
  };

  return (
    <AppContext.Provider value={{
      role, setRole,
      tools, addTool, updateTool, deleteTool,
      models, addModel, updateModel, deleteModel,
      workflows, setWorkflows,
      assistants, setAssistants,
      tags, addTag, deleteTag, renameTag,
      isUnsavedChanges, setIsUnsavedChanges,
      registerSaveHandler,
      requestNavigation
    }}>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tools" element={<ToolHub />} />
          <Route path="/register" element={<ToolRegistry />} />
          {/* New Editor Routes */}
          <Route path="/editor/:id" element={<WorkflowEditor />} />
          <Route path="/assistant/:id" element={<AssistantEditor />} />
          
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/models" element={<ModelManagement />} />
          <Route path="/apps" element={<AppCenter />} />
          <Route path="/studio" element={<SmartStudio />} />
          <Route path="/studio/admin" element={<AppManagement />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Navigation Confirm Modal */}
        {navConfirmOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                    <div className="p-6 text-center">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">存在未保存的更改</h3>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            您正在离开当前页面，未保存的修改将会丢失。您希望如何处理？
                        </p>
                        <div className="flex flex-col gap-2">
                            <button 
                                onClick={handleSaveAndLeave}
                                className="w-full py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium shadow-md transition-colors flex items-center justify-center gap-2"
                            >
                                <Save size={16} /> 保存并离开
                            </button>
                            <button 
                                onClick={handleDiscard}
                                className="w-full py-2.5 bg-white border border-slate-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <LogOut size={16} /> 放弃更改并离开
                            </button>
                            <button 
                                onClick={() => setNavConfirmOpen(false)}
                                className="w-full py-2.5 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors mt-1"
                            >
                                取消，留在当前页面
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </Layout>
    </AppContext.Provider>
  );
};

// --- App Component Wrapper ---

const App: React.FC = () => {
  // 将 role 状态提升到 App 层级，以便 AuthGuard 可以使用
  const [role, setRole] = useState<UserRole>(UserRole.USER);
  
  return (
    <HashRouter>
      <AppContext.Provider value={{
        role, setRole,
        // 其他值将在 AppContent 中提供，这里先提供默认值
        tools: [],
        addTool: () => {},
        updateTool: () => {},
        deleteTool: () => {},
        models: [],
        addModel: () => {},
        updateModel: () => {},
        deleteModel: () => {},
        workflows: [],
        setWorkflows: () => {},
        assistants: [],
        setAssistants: () => {},
        tags: [],
        addTag: () => {},
        deleteTag: () => {},
        renameTag: () => {},
        isUnsavedChanges: false,
        setIsUnsavedChanges: () => {},
        registerSaveHandler: () => {},
        requestNavigation: () => {}
      }}>
        <AuthGuard onRoleUpdate={setRole}>
          <AppContent />
        </AuthGuard>
      </AppContext.Provider>
    </HashRouter>
  );
};

export default App;