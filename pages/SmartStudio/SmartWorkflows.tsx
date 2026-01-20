import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../App';
import { Workflow, PublishStatus } from '../../types';
import { TagInput } from '../../components/TagInput';
import { TagManagementModal } from '../../components/TagManagementModal';
import { workflowApi, authApi } from '../../services/n8nApi';
import { 
  Plus, 
  Trash2, 
  Share2, 
  LayoutGrid, 
  Database, 
  Mail, 
  FileText, 
  Zap, 
  Globe, 
  Cpu, 
  MinusCircle, 
  Pencil, 
  SlidersHorizontal, 
  Copy, 
  Layers, 
  ChevronDown, 
  X, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  Loader2, 
  FilePlus,
  Search,
  Filter,
  Tag,
  Settings,
  Edit2,
  AlertTriangle,
  Info,
  Rocket,
  UserPlus,
  ArrowLeft,
  Image as ImageIcon
} from 'lucide-react';

// Mock Templates
const TEMPLATES = [
  { id: 't1', name: '定时数据抓取', description: '每小时抓取网站数据并存入数据库。', nodesPreview: ['Clock', 'Globe', 'Database'] },
  { id: 't2', name: '邮件自动回复', description: '分析收到的邮件情感并自动生成草稿。', nodesPreview: ['Mail', 'BrainCircuit', 'FileText'] },
  { id: 't3', name: 'Slack 报警通知', description: '监控系统日志，发现异常推送到 Slack。', nodesPreview: ['Server', 'AlertTriangle', 'MessageSquare'] },
  { id: 't4', name: 'CRM 同步助手', description: '新客户注册后自动同步到 Salesforce。', nodesPreview: ['User', 'RefreshCw', 'Database'] },
  { id: 't5', name: '每日新闻摘要', description: '聚合多源新闻，利用 AI 生成摘要发送邮件。', nodesPreview: ['Globe', 'BrainCircuit', 'Mail'] },
  { id: 't6', name: '发票自动识别', description: '监控文件夹，OCR 识别发票并录入系统。', nodesPreview: ['FileText', 'BrainCircuit', 'Database'] },
  { id: 't7', name: '社交媒体监控', description: '监控品牌关键词，情感分析负面评论。', nodesPreview: ['Globe', 'BrainCircuit', 'AlertTriangle'] },
  { id: 't8', name: '数据库备份', description: '定时备份核心数据库并上传至 S3。', nodesPreview: ['Clock', 'Database', 'Cloud'] },
  { id: 't9', name: '用户流失预警', description: '分析用户行为日志，预测流失风险。', nodesPreview: ['Database', 'BrainCircuit', 'Slack'] },
];

// Helper to render icons
const NodeIcon = ({ name }: { name: string }) => {
  const iconProps = { size: 12, className: "text-slate-600" };
  switch(name) {
    case 'Database': return <Database {...iconProps} />;
    case 'Mail': return <Mail {...iconProps} />;
    case 'FileText': return <FileText {...iconProps} />;
    case 'Globe': return <Globe {...iconProps} />;
    case 'Cpu': return <Cpu {...iconProps} />;
    default: return <Zap {...iconProps} />;
  }
};

// Mock Users for Share Feature (Duplicated to avoid complex export/import in this demo structure)
const MOCK_AVAILABLE_USERS = [
    { id: 'u3', name: '张三', email: 'zhangsan@example.com' },
    { id: 'u4', name: '王五', email: 'wangwu@example.com' },
    { id: 'u5', name: '赵六', email: 'zhaoliu@example.com' }
];

// --- Sub-Components for Reusability ---

interface WorkflowCardProps {
    versions: Workflow[]; // Pass all versions
    activeMenuId: string | null;
    toggleMenu: (e: React.MouseEvent, id: string) => void;
    navigate: (path: string) => void;
    handleDeleteClick: (e: React.MouseEvent, id: string, name: string) => void;
    handlePublishClick: (wf: Workflow) => void; 
    onDuplicate: (id: string) => void;
    onRename: (id: string, newName: string) => void;
    onWarnPublished: () => void;
    onShare: (id: string) => void; 
    onChangeOwner: (id: string) => void; // Added onChangeOwner
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({ versions, activeMenuId, toggleMenu, navigate, handleDeleteClick, handlePublishClick, onDuplicate, onRename, onWarnPublished, onShare, onChangeOwner }) => {
    // Sort versions desc
    const sortedVersions = useMemo(() => {
        return [...versions].sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
    }, [versions]);

    const [selectedVersionId, setSelectedVersionId] = useState(sortedVersions[0].id);
    const [showAllTags, setShowAllTags] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState('');
    const tagsRef = useRef<HTMLDivElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    // Sync selected version if versions prop changes (e.g. deletion)
    useEffect(() => {
        if (!versions.find(v => v.id === selectedVersionId)) {
            setSelectedVersionId(sortedVersions[0].id);
        }
    }, [versions, sortedVersions, selectedVersionId]);

    const currentWf = versions.find(v => v.id === selectedVersionId) || sortedVersions[0];
    
    // Permission check: Assuming 'User' is the current logged-in user
    const isOwner = currentWf.owner === 'User';

    // Close tags popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (tagsRef.current && !tagsRef.current.contains(event.target as Node)) {
                setShowAllTags(false);
            }
            if (isEditingName && nameInputRef.current && !nameInputRef.current.contains(event.target as Node)) {
                submitNameChange();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isEditingName, nameDraft]); // Add dependencies for closure

    // Name editing handlers
    const startEditingName = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentWf.status === 'PUBLISHED') {
            onWarnPublished();
            return;
        }
        setNameDraft(currentWf.name);
        setIsEditingName(true);
        setTimeout(() => nameInputRef.current?.focus(), 50);
    };

    const submitNameChange = () => {
        if (isEditingName && nameDraft.trim() && nameDraft !== currentWf.name) {
            onRename(currentWf.id, nameDraft.trim());
        }
        setIsEditingName(false);
    };

    return (
        <div 
            className={`bg-white rounded-xl border transition-all duration-300 relative group flex flex-col h-full min-h-[220px]
                ${currentWf.status === 'PUBLISHED' 
                ? 'border-green-200 shadow-[0_0_10px_rgba(74,222,128,0.2)] hover:shadow-[0_0_15px_rgba(74,222,128,0.4)]' 
                : 'border-slate-200 shadow-sm hover:shadow-lg'
                }
            `}
        >
            {/* Header */}
            <div className="px-4 pt-4 pb-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 max-w-[70%]">
                        {isEditingName ? (
                            <input 
                                ref={nameInputRef}
                                value={nameDraft}
                                onChange={(e) => setNameDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') submitNameChange();
                                    if (e.key === 'Escape') setIsEditingName(false);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="font-bold text-base text-slate-900 w-full border-b-2 border-blue-500 outline-none bg-transparent"
                            />
                        ) : (
                            <h3 
                                className="font-bold text-base text-slate-900 truncate cursor-pointer hover:text-blue-600 transition-colors border-b border-transparent hover:border-blue-200 hover:border-dashed" 
                                title="点击进入详情" 
                                onClick={() => navigate(`/editor/${currentWf.id}`)}
                            >
                                {currentWf.name}
                            </h3>
                        )}
                        {!isEditingName && isOwner && ( // Only owner can edit name? Assuming yes for consistency, or strict per request
                            <button 
                                onClick={startEditingName} 
                                className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                                title="修改名称"
                            >
                                <Pencil size={12} />
                            </button>
                        )}
                    </div>
                    
                    <div className="relative">
                        <div className="flex items-center gap-1 text-[10px] text-slate-600 border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50 hover:bg-white hover:border-blue-300 transition-colors cursor-pointer group/ver">
                            <span className="font-medium">v</span>
                            <select 
                                value={selectedVersionId}
                                onChange={(e) => setSelectedVersionId(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-transparent outline-none appearance-none cursor-pointer font-mono font-medium w-full text-center pr-3 z-10"
                            >
                                {sortedVersions.map(v => (
                                    <option key={v.id} value={v.id}>
                                        {v.version} {v.status === 'PUBLISHED' ? '(已发布)' : ''}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={10} className="absolute right-1.5 pointer-events-none text-slate-400 group-hover/ver:text-blue-500" />
                        </div>
                    </div>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>更新于 {new Date(currentWf.updatedAt).toLocaleDateString()}</span>
                    {!isOwner && (
                        <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-1.5 rounded" title={`所有者: ${currentWf.owner}`}>
                            <Layers size={10}/> {currentWf.owner}
                        </span>
                    )}
                </div>
            </div>

            {/* Divider */}
            <div className="w-full h-[1px] bg-slate-100 my-1"></div>

            {/* Body */}
            <div className="px-4 py-2 flex-1 flex flex-col">
                {/* Status & Menu */}
                <div className="flex items-center justify-between mb-2 relative">
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors duration-300 ${
                            currentWf.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                            currentWf.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                        }`}>
                            {currentWf.status === 'PUBLISHED' ? '已发布' : currentWf.status === 'DRAFT' ? '草稿' : '已共享'}
                        </span>
                        {/* Run Status Indicator */}
                        {currentWf.lastRunStatus === 'SUCCESS' && (
                            <span className="text-[10px] text-green-600 flex items-center gap-0.5" title="上次运行成功"><CheckCircle2 size={10} /> 正常</span>
                        )}
                        {currentWf.lastRunStatus === 'FAILURE' && (
                            <span className="text-[10px] text-red-600 flex items-center gap-0.5" title="上次运行失败"><AlertTriangle size={10} /> 异常</span>
                        )}
                    </div>
                    
                    <button 
                        onClick={(e) => toggleMenu(e, currentWf.id)}
                        className="text-slate-400 hover:text-slate-800 p-1 rounded hover:bg-slate-100"
                    >
                        <SlidersHorizontal size={14} />
                    </button>

                    {/* Dropdown Menu */}
                    {activeMenuId === currentWf.id && (
                        <div className="absolute right-0 top-6 w-32 bg-white text-slate-700 rounded-lg shadow-xl z-20 py-1 border border-slate-200 animate-in fade-in zoom-in-95 duration-100">
                            {isOwner && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onShare(currentWf.id); }}
                                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                >
                                    <Share2 size={12} /> 共享
                                </button>
                            )}
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDuplicate(currentWf.id); }}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 transition-colors"
                            >
                                <Copy size={12} /> 复制
                            </button>
                            {isOwner && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onChangeOwner(currentWf.id); }}
                                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                >
                                    <Layers size={12} /> 变更所有者
                                </button>
                            )}
                            {(isOwner) && <div className="h-[1px] bg-slate-100 my-1"></div>}
                            {isOwner && (
                                <button 
                                    onClick={(e) => handleDeleteClick(e, currentWf.id, currentWf.name)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                >
                                    <Trash2 size={12} /> 删除
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-500 line-clamp-2 mb-3 font-light leading-relaxed flex-1">
                    {currentWf.description}
                </p>

                {/* Tags */}
                <div className="relative flex flex-wrap gap-1.5 mb-3" ref={tagsRef}>
                    {currentWf.tags?.slice(0, 5).map((tag, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#C25E5E] text-white font-medium">
                            {tag}
                        </span>
                    ))}
                    {(currentWf.tags?.length || 0) > 5 && (
                        <>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowAllTags(!showAllTags); }}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors font-medium"
                            >
                                +{(currentWf.tags?.length || 0) - 5}
                            </button>
                            {showAllTags && (
                                <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-2 z-30 w-48 flex flex-wrap gap-1.5 animate-in fade-in zoom-in-95 duration-100">
                                    {currentWf.tags?.map((tag, i) => (
                                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#C25E5E] text-white font-medium">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-4 pb-4 pt-1 flex gap-2 mt-auto">
                <button 
                    onClick={() => navigate(`/editor/${currentWf.id}`)}
                    className="flex-1 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                    <Pencil size={12} /> 编辑
                </button>
                {isOwner && (
                    <button 
                        onClick={() => handlePublishClick(currentWf)}
                        className="flex-1 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                        {currentWf.status === 'PUBLISHED' ? '下架' : '发布'}
                    </button>
                )}
            </div>
        </div>
    );
};

interface TemplateCardProps {
    tpl: typeof TEMPLATES[0];
    useTemplate: (t: typeof TEMPLATES[0]) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ tpl, useTemplate }) => (
    <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-xl border border-slate-200 p-4 hover:border-blue-300 transition-colors flex flex-col h-full hover:shadow-md min-h-[200px]">
        <div className="flex items-center justify-center mb-4 mt-2 space-x-1 opacity-70">
        {tpl.nodesPreview.map((n, i) => (
            <React.Fragment key={i}>
                <div className="w-6 h-6 bg-white border border-slate-200 rounded flex items-center justify-center shadow-sm">
                    <NodeIcon name={n} />
                </div>
                {i < tpl.nodesPreview.length - 1 && <div className="w-2 h-0.5 bg-slate-300"></div>}
            </React.Fragment>
        ))}
        </div>
        
        <h3 className="font-bold text-slate-800 text-center mb-1 text-base">{tpl.name}</h3>
        <p className="text-xs text-slate-500 text-center mb-4 leading-relaxed flex-1 px-2">{tpl.description}</p>
        
        <button 
            onClick={() => useTemplate(tpl)}
            className="w-full py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm mt-auto"
        >
            添加至工作区
        </button>
    </div>
);

// --- Main Component ---

const SmartWorkflows: React.FC = () => {
  // Get tag methods from global context
  const { workflows, setWorkflows, assistants, tags, addTag, deleteTag, renameTag } = useAppContext();
  const navigate = useNavigate();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // -- Modal States (Creation) --
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  
  // -- Modal States (Duplicate) --
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateWorkflowId, setDuplicateWorkflowId] = useState<string | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicateTags, setDuplicateTags] = useState<string[]>([]);
  
  // -- Modal States (Tag Manager) --
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  
  // -- Modal States (View All) --
  const [isAllWorkflowsOpen, setIsAllWorkflowsOpen] = useState(false);
  const [isAllTemplatesOpen, setIsAllTemplatesOpen] = useState(false);

  // -- Modal States (Delete Confirm) --
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean, id: string | null, name: string }>({ isOpen: false, id: null, name: '' });
  const [showPublishedWarning, setShowPublishedWarning] = useState(false);

  // -- Modal States (Publish) --
  const [publishModal, setPublishModal] = useState<{ isOpen: boolean, wf: Workflow | null }>({ isOpen: false, wf: null });
  const [publishName, setPublishName] = useState('');
  const [publishDesc, setPublishDesc] = useState('');
  const [notExecutedWarning, setNotExecutedWarning] = useState(false);

  // -- Share Modal States --
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalMode, setShareModalMode] = useState<'LIST' | 'INVITE'>('LIST');
  const [userToAdd, setUserToAdd] = useState('');
  const [removeUserConfirm, setRemoveUserConfirm] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'USER'>('USER');
  const [sharedUsers, setSharedUsers] = useState([
      { id: 'u1', name: 'Admin', email: 'admin@system.com', role: 'OWNER' },
      { id: 'u2', name: '李四 (验证用户)', email: 'lisi@test.com', role: 'USER' }
  ]);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);

  // -- Change Owner Modal States (NEW) --
  const [isChangeOwnerModalOpen, setIsChangeOwnerModalOpen] = useState(false);
  const [changeOwnerWorkflowId, setChangeOwnerWorkflowId] = useState<string | null>(null);
  const [newOwnerId, setNewOwnerId] = useState('');
  const [shareCredentials, setShareCredentials] = useState(false);

  // -- View All Filters --
  const [wfSearch, setWfSearch] = useState('');
  const [wfStatus, setWfStatus] = useState<'ALL' | 'PUBLISHED' | 'DRAFT' | 'SHARED'>('ALL');
  const [wfTag, setWfTag] = useState<string>('ALL');
  const [tplSearch, setTplSearch] = useState('');
  
  // -- Sorting State --
  const [sortField, setSortField] = useState<'name' | 'updatedAt' | 'createdAt'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  
  // -- Form States --
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDesc, setNewWorkflowDesc] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  
  // Credential Step State
  const [requiredCredentials, setRequiredCredentials] = useState<{key: string, label: string, type: string}[]>([]);
  const [credentialValues, setCredentialValues] = useState<Record<string, string>>({});
  const [isTestingCreds, setIsTestingCreds] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);

  // Loading state
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  
  // 使用 ref 缓存当前用户信息，避免触发重新渲染和函数重新创建
  const currentUserRef = useRef<any>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 3000);
  };

  /**
   * 将 n8n 工作流数据转换为前端需要的格式
   */
  const transformN8nWorkflow = (n8nWorkflow: any, currentUser: any): Workflow => {
    // 从节点中提取节点类型用于预览
    const nodesPreview: string[] = [];
    if (n8nWorkflow.nodes && Array.isArray(n8nWorkflow.nodes)) {
      n8nWorkflow.nodes.forEach((node: any) => {
        if (node.type) {
          // 将 n8n 节点类型映射到前端图标名称
          const nodeType = node.type.toLowerCase();
          if (nodeType.includes('database') || nodeType.includes('postgres') || nodeType.includes('mysql')) {
            nodesPreview.push('Database');
          } else if (nodeType.includes('email') || nodeType.includes('smtp')) {
            nodesPreview.push('Mail');
          } else if (nodeType.includes('http') || nodeType.includes('webhook')) {
            nodesPreview.push('Globe');
          } else if (nodeType.includes('file') || nodeType.includes('read')) {
            nodesPreview.push('FileText');
          } else {
            nodesPreview.push('Cpu');
          }
        }
      });
    }

    // 从 tags 数组中获取标签名称（n8n API 返回的是 Tag 对象数组）
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

    // 确定状态：根据 active 字段判断
    // active = true 表示 PUBLISHED，false 表示 DRAFT
    const status: PublishStatus = n8nWorkflow.active ? 'PUBLISHED' : 'DRAFT';

    // 获取描述：从 _ui 或 settings 中获取
    const description = n8nWorkflow._ui?.description || 
                       n8nWorkflow.settings?.description || 
                       n8nWorkflow.description || 
                       '暂无描述';

    // 获取版本：从 settings 或默认值
    const version = n8nWorkflow.settings?.version || '1.0.0';

    // 获取所有者：从当前用户信息获取
    const owner = currentUser?.firstName || currentUser?.email || currentUser?.id || 'User';

    return {
      id: n8nWorkflow.id,
      name: n8nWorkflow.name || '未命名工作流',
      description,
      status,
      version,
      owner,
      createdAt: n8nWorkflow.createdAt || new Date().toISOString(),
      updatedAt: n8nWorkflow.updatedAt || n8nWorkflow.createdAt || new Date().toISOString(),
      nodesPreview: nodesPreview.length > 0 ? nodesPreview : undefined,
      tags: tags.length > 0 ? tags : undefined,
      lastRunStatus: 'NONE', // 暂时设为 NONE，后续可以从执行历史获取
      // 保留 n8n 原始字段
      active: n8nWorkflow.active,
      nodes: n8nWorkflow.nodes,
      connections: n8nWorkflow.connections,
      settings: n8nWorkflow.settings,
      staticData: n8nWorkflow.staticData,
    };
  };

  /**
   * 对工作流列表进行排序
   */
  const sortWorkflows = useCallback((workflowsToSort: Workflow[]) => {
    return [...workflowsToSort].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
        default:
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
      }
      
      if (sortOrder === 'ASC') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [sortField, sortOrder]);

  /**
   * 从后端获取工作流列表
   * 使用 GET /rest/workflows 接口，支持分页和过滤
   */
  const fetchWorkflows = useCallback(async (applyFilters: boolean = true) => {
    setIsLoadingWorkflows(true);
    try {
      // 使用 ref 缓存的用户信息，避免重复请求
      let user = currentUserRef.current;
      if (!user) {
        user = await authApi.getCurrentUser();
        currentUserRef.current = user;
      }
      
      // 构建过滤条件
      const filter: any = {
        isArchived: false, // 不包含已归档的工作流
      };
      
      // 应用筛选条件
      if (applyFilters) {
        // 按状态筛选
        if (wfStatus === 'PUBLISHED') {
          filter.active = true;
        } else if (wfStatus === 'DRAFT') {
          filter.active = false;
        }
        // 注意：SHARED 状态可能需要特殊处理，这里暂时不处理
        
        // 按名称搜索
        if (wfSearch.trim()) {
          filter.name = wfSearch.trim();
        }
        
        // 按标签筛选
        if (wfTag !== 'ALL') {
          filter.tags = [wfTag];
        }
      }
      
      // 构建排序选项（n8n 后端可能不支持 sortBy，所以先不传）
      const options: any = {};
      
      // 从后端获取工作流列表（使用 getWorkflowsAndFolders，支持分页和过滤）
      // 不包含文件夹，只获取工作流
      const response = await workflowApi.getWorkflowsAndFolders(
        filter,
        options,
        false, // includeFolders: 不包含文件夹
        false, // onlySharedWithMe: 获取所有工作流，不只是共享给我的
        false  // includeScopes: 不包含权限范围
      );
      
      // 过滤出工作流（排除文件夹）
      const workflowsOnly = response.data.filter((item: any) => {
        return !item.type || item.type === 'workflow' || item.id;
      });
      
      // 转换数据格式
      let transformedWorkflows = workflowsOnly.map((wf: any) => 
        transformN8nWorkflow(wf, user)
      );
      
      // 应用排序（使用当前的 sortField 和 sortOrder，通过闭包获取最新值）
      // 注意：这里直接使用 sortField 和 sortOrder，不将它们作为依赖项
      // 这样当排序改变时，不会触发重新获取，只会在排序 useEffect 中处理
      transformedWorkflows = transformedWorkflows.sort((a, b) => {
        let aValue: any;
        let bValue: any;
        
        switch (sortField) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'createdAt':
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
          case 'updatedAt':
          default:
            aValue = new Date(a.updatedAt).getTime();
            bValue = new Date(b.updatedAt).getTime();
            break;
        }
        
        if (sortOrder === 'ASC') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
      
      // 更新全局状态
      setWorkflows(transformedWorkflows);
    } catch (error: any) {
      console.error('获取工作流列表失败:', error);
      setWorkflows([]);
      if (import.meta.env.DEV) {
        const errorMsg = error.response?.data?.message || error.message || '请检查后端服务是否运行';
        showToast(`无法连接到后端: ${errorMsg}`, 'error');
      }
    } finally {
      setIsLoadingWorkflows(false);
    }
  }, [wfSearch, wfStatus, wfTag]); // 不包含 sortField 和 sortOrder，避免排序改变时重新获取

  // 使用 ref 来跟踪是否是初始加载
  const isInitialLoad = useRef(true);

  // 组件加载时获取用户信息和工作流列表（只获取一次）
  useEffect(() => {
    const loadData = async () => {
      // 获取用户信息（如果还没有）
      if (!currentUserRef.current) {
        currentUserRef.current = await authApi.getCurrentUser();
      }
      // 获取工作流列表
      await fetchWorkflows(false); // 初始加载时不应用筛选
      isInitialLoad.current = false;
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件挂载时执行一次

  // 当筛选条件改变时，重新获取数据
  useEffect(() => {
    // 跳过初始加载（避免重复请求）
    if (isInitialLoad.current) return;
    
    // 延迟执行，避免频繁请求
    const timer = setTimeout(() => {
      fetchWorkflows(true);
    }, 300); // 300ms 防抖
    
    return () => clearTimeout(timer);
  }, [wfSearch, wfStatus, wfTag, fetchWorkflows]);

  // 当排序改变时，只对已有数据进行排序（不重新获取）
  useEffect(() => {
    // 跳过初始加载
    if (isInitialLoad.current || workflows.length === 0) return;
    
    // 使用函数式更新，避免依赖 workflows
    setWorkflows(prev => sortWorkflows(prev));
  }, [sortField, sortOrder, sortWorkflows]);

  // --- Derived Data ---
  
  // Group workflows by name to get all versions
  // 注意：保持 workflows 的原始顺序（已在 fetchWorkflows 中排序）
  const groupedWorkflows = useMemo(() => {
      const groups: Record<string, Workflow[]> = {};
      const nameOrder: string[] = []; // 记录名称出现的顺序
      
      workflows.forEach(w => {
          if (!groups[w.name]) {
              groups[w.name] = [];
              nameOrder.push(w.name); // 记录第一次出现的顺序
          }
          groups[w.name].push(w);
      });
      
      // 按照 workflows 中名称出现的顺序返回分组
      // 这样就能保持 fetchWorkflows 中应用的排序
      return nameOrder.map(name => groups[name]);
  }, [workflows]);

  const displayedGroups = groupedWorkflows.slice(0, 7);

  // 注意：筛选和排序已经在 fetchWorkflows 中完成，这里只需要在前端进行二次筛选
  // 因为后端可能不支持所有筛选条件，所以这里作为补充
  const filteredAllWorkflowGroups = useMemo(() => {
      // 如果已经应用了后端筛选，这里只需要做前端补充筛选
      // 由于筛选条件已经在 fetchWorkflows 中应用，这里主要处理前端显示
      return groupedWorkflows.filter(group => {
          // Use the latest version for basic filtering
          const latest = group.reduce((prev, current) => (new Date(prev.updatedAt) > new Date(current.updatedAt) ? prev : current));
          
          // 前端补充筛选（如果后端筛选不完整）
          const matchesSearch = !wfSearch.trim() || latest.name.toLowerCase().includes(wfSearch.toLowerCase()) || latest.description.toLowerCase().includes(wfSearch.toLowerCase());
          const matchesStatus = wfStatus === 'ALL' || latest.status === wfStatus;
          const matchesTag = wfTag === 'ALL' || latest.tags?.includes(wfTag);
          return matchesSearch && matchesStatus && matchesTag;
      });
      // 排序已经在 fetchWorkflows 中完成，groupedWorkflows 已经保持了正确的顺序
  }, [groupedWorkflows, wfSearch, wfStatus, wfTag]);

  const filteredAllTemplates = useMemo(() => {
      return TEMPLATES.filter(t => t.name.toLowerCase().includes(tplSearch.toLowerCase()) || t.description.toLowerCase().includes(tplSearch.toLowerCase()));
  }, [tplSearch]);

  // --- Handlers ---

  const handleShareClick = (id: string) => {
      setActiveShareId(id);
      setShareModalMode('LIST');
      setUserToAdd('');
      setRemoveUserConfirm(null);
      setIsShareModalOpen(true);
      setActiveMenuId(null);
  };

  // Change Owner Handler
  const handleChangeOwnerInitiate = (id: string) => {
      setChangeOwnerWorkflowId(id);
      setNewOwnerId('');
      setShareCredentials(false);
      setActiveMenuId(null);
      setIsChangeOwnerModalOpen(true);
  };

  const handleChangeOwnerSubmit = () => {
      if (!changeOwnerWorkflowId || !newOwnerId) return;
      
      const user = MOCK_AVAILABLE_USERS.find(u => u.id === newOwnerId);
      const newOwnerName = user ? user.name : 'Unknown User';
      
      // Update workflow owner
      setWorkflows(prev => prev.map(w => w.id === changeOwnerWorkflowId ? { ...w, owner: newOwnerName, updatedAt: new Date().toISOString() } : w));
      
      showToast(`所有权已成功转移给 ${newOwnerName}`, 'success');

      setIsChangeOwnerModalOpen(false);
      setChangeOwnerWorkflowId(null);
      setNewOwnerId('');
  };

  const handleAddSystemUser = () => {
      if (!userToAdd) return;
      const user = MOCK_AVAILABLE_USERS.find(u => u.id === userToAdd);
      if (user) {
          setSharedUsers(prev => [...prev, { ...user, role: 'USER' }]);
          setUserToAdd('');
      }
  };

  const handleSwitchToInvite = () => {
      setInviteEmail('');
      setInviteRole('USER');
      setShareModalMode('INVITE');
  };

  const handleInviteUser = () => {
      if (!inviteEmail.trim()) {
          alert('请输入有效的电子邮件地址');
          return;
      }
      
      const newUser = {
          id: `u-${Date.now()}`,
          name: inviteEmail.split('@')[0], // Simple name extraction
          email: inviteEmail,
          role: inviteRole
      };

      setSharedUsers(prev => [...prev, newUser]);
      setShareModalMode('LIST');
  };

  const handleRemoveClick = (userId: string) => {
      setRemoveUserConfirm(userId);
  };

  const confirmRemoveUser = () => {
      if (removeUserConfirm) {
          setSharedUsers(prev => prev.filter(u => u.id !== removeUserConfirm));
          setRemoveUserConfirm(null);
      }
  };

  const handleSaveShare = () => {
      setIsShareModalOpen(false);
      // In real app, persist sharedUsers to backend linked to activeShareId
  };

  const handleRename = async (id: string, newName: string) => {
      try {
          // 获取当前工作流
          const workflow = workflows.find(w => w.id === id);
          if (!workflow) return;
          
          // 调用后端 API 更新工作流名称
          await workflowApi.update(id, { name: newName });
          
          // 更新本地状态
          setWorkflows(prev => prev.map(w => w.id === id ? { ...w, name: newName, updatedAt: new Date().toISOString() } : w));
          showToast('工作流名称已更新', 'success');
      } catch (error: any) {
          console.error('重命名工作流失败:', error);
          const errorMsg = error.response?.data?.message || error.message || '重命名失败';
          showToast(`重命名失败: ${errorMsg}`, 'error');
      }
  };

  const handlePublishClick = async (wf: Workflow) => {
      // Toggle logic
      if (wf.status === 'PUBLISHED') {
          // Unpublish: 停用工作流
          try {
              await workflowApi.deactivate(wf.id);
              setWorkflows(prev => prev.map(w => w.id === wf.id ? { ...w, status: 'DRAFT', active: false } : w));
              showToast('工作流已下架', 'success');
          } catch (error: any) {
              console.error('下架工作流失败:', error);
              const errorMsg = error.response?.data?.message || error.message || '下架失败';
              showToast(`下架失败: ${errorMsg}`, 'error');
          }
      } else {
          // Publish logic: Check execution status
          if (wf.lastRunStatus !== 'SUCCESS') {
              setNotExecutedWarning(true);
              return;
          }
          // Open Modal
          setPublishName(wf.name);
          setPublishDesc(wf.description);
          setPublishModal({ isOpen: true, wf });
      }
  };

  const confirmPublish = async () => {
      if (publishModal.wf) {
          try {
              // 激活工作流（发布）
              await workflowApi.activate(publishModal.wf.id);
              
              // 如果需要更新名称和描述，也调用更新 API
              if (publishName !== publishModal.wf.name || publishDesc !== publishModal.wf.description) {
                  const updateData: any = {
                      name: publishName,
                  };
                  
                  // 更新 settings，添加 description（n8n 支持在 settings 中存储 description）
                  if (publishModal.wf.settings) {
                      updateData.settings = {
                          ...(publishModal.wf.settings as any),
                          description: publishDesc
                      } as any;
                  } else {
                      updateData.settings = {
                          description: publishDesc
                      } as any;
                  }
                  
                  await workflowApi.update(publishModal.wf.id, updateData);
              }
              
              // 更新本地状态
              setWorkflows(prev => prev.map(w => w.id === publishModal.wf!.id ? {
                  ...w,
                  status: 'PUBLISHED',
                  active: true,
                  name: publishName,
                  description: publishDesc,
                  updatedAt: new Date().toISOString()
              } : w));
              
              showToast('工作流已发布', 'success');
              setPublishModal({ isOpen: false, wf: null });
          } catch (error: any) {
              console.error('发布工作流失败:', error);
              const errorMsg = error.response?.data?.message || error.message || '发布失败';
              showToast(`发布失败: ${errorMsg}`, 'error');
          }
      }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    const wf = workflows.find(w => w.id === id);
    if (!wf) return;

    // Close menu first
    setActiveMenuId(null);

    if (wf.status === 'PUBLISHED') {
        setShowPublishedWarning(true);
        return;
    }
    setDeleteConfirm({ isOpen: true, id, name });
  };

  const handleConfirmDelete = async () => {
      if (deleteConfirm.id) {
          try {
              // 调用后端 API 删除工作流
              await workflowApi.delete(deleteConfirm.id);
              
              // 更新本地状态
              setWorkflows(prev => prev.filter(w => w.id !== deleteConfirm.id));
              showToast('工作流已删除', 'success');
          } catch (error: any) {
              console.error('删除工作流失败:', error);
              const errorMsg = error.response?.data?.message || error.message || '删除失败';
              showToast(`删除失败: ${errorMsg}`, 'error');
          }
      }
      setDeleteConfirm({ isOpen: false, id: null, name: '' });
  };

  // Tag Manager Logic - Mapped to Global Context
  const handleTagCreate = (tagName: string) => {
      addTag(tagName);
      return true; 
  };

  // Duplicate Logic
  const handleDuplicateInitiate = (id: string) => {
    const wf = workflows.find(w => w.id === id);
    if (wf) {
      setDuplicateWorkflowId(id);
      setDuplicateName(`${wf.name} (副本)`);
      setDuplicateTags(wf.tags || []);
      setActiveMenuId(null);
      setIsDuplicateModalOpen(true);
    }
  };

  const handleDuplicateSubmit = async () => {
    if (!duplicateWorkflowId || !duplicateName.trim()) return;
    
    // Check for duplicate name
    if (workflows.some(w => w.name === duplicateName.trim())) {
        alert("工作流名称已存在，请使用唯一的名称。");
        return;
    }
    
    const original = workflows.find(w => w.id === duplicateWorkflowId);
    if (!original) return;

    try {
        // 使用 ref 缓存的用户信息，如果没有则获取
        let user = currentUserRef.current;
        if (!user) {
          user = await authApi.getCurrentUser();
          currentUserRef.current = user;
        }
        
        // 获取原始工作流的完整数据
        const originalWorkflow = await workflowApi.get(duplicateWorkflowId);
        
        // 构建新的工作流对象（n8n 格式）
        const newWorkflow: any = {
            name: duplicateName,
            active: false, // 复制的工作流默认不激活
            nodes: originalWorkflow.nodes || [],
            connections: originalWorkflow.connections || {},
            settings: {
                ...originalWorkflow.settings,
                tags: duplicateTags.length > 0 ? duplicateTags : originalWorkflow.settings?.tags || [],
            },
            staticData: originalWorkflow.staticData || {},
        };
        
        // 调用后端 API 创建工作流
        const createdWorkflow = await workflowApi.create(newWorkflow as Workflow);
        
        // 转换数据格式并添加到列表
        const transformedWorkflow = transformN8nWorkflow(createdWorkflow, user);
        setWorkflows([transformedWorkflow, ...workflows]);
        
        showToast('工作流复制成功', 'success');
        setIsDuplicateModalOpen(false);
        setDuplicateWorkflowId(null);
        setDuplicateName('');
        setDuplicateTags([]);
    } catch (error: any) {
        console.error('复制工作流失败:', error);
        const errorMsg = error.response?.data?.message || error.message || '复制失败';
        showToast(`复制失败: ${errorMsg}`, 'error');
    }
  };

  const openCreateModal = () => {
    setSelectedTemplateId(null);
    setNewWorkflowName('');
    setNewWorkflowDesc('');
    setIsCreateModalOpen(true);
  };

  const useTemplate = (template: typeof TEMPLATES[0]) => {
    setSelectedTemplateId(template.id);
    setNewWorkflowName(`${template.name} (副本)`);
    setNewWorkflowDesc(template.description);
    setIsAllTemplatesOpen(false); // Close view all if open
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = () => {
    if (!newWorkflowName.trim()) return;

    // Check for duplicate name
    if (workflows.some(w => w.name === newWorkflowName.trim())) {
        alert("工作流名称已存在，请使用唯一的名称。");
        return;
    }

    if (selectedTemplateId) {
      const template = TEMPLATES.find(t => t.id === selectedTemplateId);
      const reqs = [];
      if (template?.nodesPreview.includes('Database')) {
        reqs.push({ key: 'db_host', label: '数据库地址 (Host)', type: 'text' });
        reqs.push({ key: 'db_password', label: '数据库密码', type: 'password' });
      }
      if (template?.nodesPreview.includes('Mail')) {
        reqs.push({ key: 'smtp_key', label: 'SMTP 密钥', type: 'password' });
      }
      if (template?.nodesPreview.includes('Globe')) {
        reqs.push({ key: 'api_key', label: 'API Key', type: 'password' });
      }

      if (reqs.length > 0) {
        setRequiredCredentials(reqs);
        setCredentialValues({});
        setTestResult(null);
        setIsCreateModalOpen(false); 
        setIsCredentialModalOpen(true); 
        return;
      }
    }
    finalizeCreation();
  };

  const finalizeCreation = async () => {
    try {
      // 使用 ref 缓存的用户信息，如果没有则获取
      let user = currentUserRef.current;
      if (!user) {
        user = await authApi.getCurrentUser();
        currentUserRef.current = user;
      }
      const template = TEMPLATES.find(t => t.id === selectedTemplateId);
      
      // 构建 n8n 格式的工作流对象
      const n8nWorkflow: any = {
        name: newWorkflowName,
        active: false, // 新创建的工作流默认不激活
        nodes: [], // 空节点数组，后续在编辑器中添加
        connections: {}, // 空连接
        settings: {
          executionOrder: 'v1',
          saveDataErrorExecution: 'all',
          saveDataSuccessExecution: 'all',
          saveManualExecutions: true,
          saveExecutionProgress: false,
          tags: template ? ['模版'] : ['新建'],
        },
        staticData: {},
      };

      // 如果有描述，添加到 settings 中
      if (newWorkflowDesc) {
        n8nWorkflow.settings.description = newWorkflowDesc;
      }

      // 调用后端 API 创建工作流
      const createdWorkflow = await workflowApi.create(n8nWorkflow as Workflow);
      
      // 转换数据格式并添加到列表
      const transformedWorkflow = transformN8nWorkflow(createdWorkflow, user);
      setWorkflows([transformedWorkflow, ...workflows]);
      
      showToast('工作流创建成功', 'success');
      setIsCreateModalOpen(false);
      setIsCredentialModalOpen(false);
      
      // 导航到编辑器
      navigate(`/editor/${createdWorkflow.id}`);
    } catch (error: any) {
      console.error('创建工作流失败:', error);
      const errorMsg = error.response?.data?.message || error.message || '创建工作流失败';
      showToast(`创建失败: ${errorMsg}`, 'error');
    }
  };

  const testCredentials = () => {
    setIsTestingCreds(true);
    setTimeout(() => {
        setIsTestingCreds(false);
        setTestResult('success');
    }, 1000);
  };

  const toggleMenu = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setActiveMenuId(prev => prev === id ? null : id);
  };

  useEffect(() => {
    const handleClickOutside = () => {
        setActiveMenuId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const displayedTemplates = TEMPLATES.slice(0, 8);

  return (
    <div className="space-y-8 pb-12 relative">
      {/* --- Workflows Section --- */}
      <section>
         <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                我的工作流
            </h2>
            <div className="flex items-center gap-3">
              {/* 排序控件 */}
              <div className="flex items-center gap-2">
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as 'name' | 'updatedAt' | 'createdAt')}
                  className="text-xs px-2 py-1 border border-slate-200 rounded bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="updatedAt">更新时间</option>
                  <option value="createdAt">创建时间</option>
                  <option value="name">名称</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
                  className="text-xs px-2 py-1 border border-slate-200 rounded bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  title={sortOrder === 'ASC' ? '升序' : '降序'}
                >
                  {sortOrder === 'ASC' ? '↑' : '↓'}
                </button>
              </div>
              <button 
                  onClick={() => setIsAllWorkflowsOpen(true)}
                  className="text-sm text-blue-600 hover:underline"
              >
                  查看全部 ({groupedWorkflows.length})
              </button>
            </div>
         </div>

         {isLoadingWorkflows ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-blue-600" size={32} />
                <p className="text-sm text-slate-500">正在加载工作流列表...</p>
              </div>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Create Card - Always visible first */}
              <div 
                  onClick={openCreateModal}
                  className="bg-white rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer flex flex-col items-center justify-center text-center p-6 min-h-[220px] group"
              >
                  <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-white group-hover:shadow-md flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-all mb-3">
                     <FilePlus size={24} />
                  </div>
                  <h3 className="font-bold text-slate-700 group-hover:text-blue-700 transition-colors">创建你的工作流</h3>
                  <span className="mt-2 text-xs font-medium text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                     立即创建 <ArrowRight size={12} />
                  </span>
              </div>

              {/* Grouped Workflow Cards */}
              {displayedGroups.map((group, idx) => (
                  <WorkflowCard 
                      key={`group-${idx}`} 
                      versions={group} // Pass the array of versions
                      activeMenuId={activeMenuId} 
                      toggleMenu={toggleMenu} 
                      navigate={navigate} 
                      handleDeleteClick={handleDeleteClick} 
                      handlePublishClick={handlePublishClick}
                      onDuplicate={handleDuplicateInitiate}
                      onRename={handleRename}
                      onWarnPublished={() => setShowPublishedWarning(true)}
                      onShare={handleShareClick}
                      onChangeOwner={handleChangeOwnerInitiate}
                  />
              ))}
            </div>
         )}
      </section>

      {/* --- Templates Section --- */}
      <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">工作流模版</h2>
            <button 
                onClick={() => setIsAllTemplatesOpen(true)}
                className="text-sm text-blue-600 hover:underline"
            >
                查看全部
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
             {displayedTemplates.map(tpl => (
                 <TemplateCard key={tpl.id} tpl={tpl} useTemplate={useTemplate} />
             ))}
          </div>
      </section>

      {/* --- Change Owner Modal (NEW) --- */}
      {isChangeOwnerModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                  <div className="p-6">
                      <h3 className="text-lg font-bold text-slate-900 mb-4">选择将此工作流迁移到的项目或用户</h3>
                      
                      <div className="space-y-4">
                          <div className="relative">
                              <select 
                                value={newOwnerId}
                                onChange={(e) => setNewOwnerId(e.target.value)}
                                className="w-full pl-4 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
                              >
                                  <option value="">选择项目或用户...</option>
                                  {MOCK_AVAILABLE_USERS.map(u => (
                                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                  ))}
                              </select>
                              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>

                          <p className="text-xs text-slate-500 leading-relaxed">
                              注意：移动操作将删除此工作流程中所有现有的共享设置
                          </p>

                          <label className="flex items-start gap-2 cursor-pointer group">
                              <input 
                                  type="checkbox" 
                                  checked={shareCredentials}
                                  onChange={(e) => setShareCredentials(e.target.checked)}
                                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-xs text-slate-600 group-hover:text-slate-800 transition-colors select-none">
                                  同时分享此工作流程使用的唯一凭证，以确保其正常运行
                              </span>
                          </label>
                      </div>

                      <div className="flex justify-end gap-3 mt-8">
                          <button 
                              onClick={() => setIsChangeOwnerModalOpen(false)}
                              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
                          >
                              取消
                          </button>
                          <button 
                              onClick={handleChangeOwnerSubmit}
                              disabled={!newOwnerId}
                              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              移动工程
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- Share Modal (Copied from WorkflowEditor) --- */}
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

      {/* --- Delete Confirmation Modal (Specific) --- */}
      {deleteConfirm.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setDeleteConfirm({ isOpen: false, id: null, name: '' })}>
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                  <div className="p-6 text-center">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                          <AlertTriangle size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">确认删除</h3>
                      <p className="text-sm text-slate-500 mb-6 px-4 leading-relaxed">
                          确定要删除工作流 <span className="font-bold text-slate-800">{deleteConfirm.name}</span> 以及对应的凭证配置吗？<br/>此操作无法撤销。
                      </p>
                      <div className="flex gap-3">
                          <button 
                            onClick={() => setDeleteConfirm({ isOpen: false, id: null, name: '' })}
                            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
                          >
                              取消
                          </button>
                          <button 
                            onClick={handleConfirmDelete}
                            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-medium shadow-md transition-colors"
                          >
                              确认删除
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- Published Warning Modal (Specific) --- */}
      {showPublishedWarning && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowPublishedWarning(false)}>
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                  <div className="p-6 text-center">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                          <Info size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">无法执行操作</h3>
                      <p className="text-sm text-slate-500 mb-6 px-4 leading-relaxed">
                          该工作流当前处于已发布状态。为了防止线上服务中断，请先将其下架（设为草稿），然后再尝试修改名称或删除。
                      </p>
                      <button 
                        onClick={() => setShowPublishedWarning(false)}
                        className="w-full py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 text-sm font-medium shadow-md transition-colors"
                      >
                          知道了
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- Not Executed Warning Modal --- */}
      {notExecutedWarning && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setNotExecutedWarning(false)}>
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                  <div className="p-6 text-center">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                          <AlertTriangle size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">无法发布</h3>
                      <p className="text-sm text-slate-500 mb-6 px-4 leading-relaxed">
                          工作流必须先进行测试运行并<b>保存且执行成功</b>后才能发布。请进入编辑器运行工作流。
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

      {/* --- Publish Config Modal --- */}
      {publishModal.isOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                     <h3 className="text-lg font-bold text-slate-800">
                        确认发布工作流
                     </h3>
                     <button onClick={() => setPublishModal({ isOpen: false, wf: null })} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
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
                      <button onClick={() => setPublishModal({ isOpen: false, wf: null })} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors">取消</button>
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

      {/* --- Duplicate Workflow Modal --- */}
      {isDuplicateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md transform transition-all scale-100 flex flex-col min-h-[300px]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                 <h3 className="text-lg font-bold text-slate-800">
                    复制工作流
                 </h3>
                 <button onClick={() => setIsDuplicateModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              <div className="p-6 space-y-4 flex-1">
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">工作流名称</label>
                    <input 
                      autoFocus
                      value={duplicateName}
                      onChange={(e) => setDuplicateName(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                 </div>
                 <div className="space-y-2 relative z-50">
                     <label className="text-sm font-medium text-slate-700">选择或创建标签</label>
                     <TagInput 
                        selectedTags={duplicateTags}
                        onChange={setDuplicateTags}
                        availableTags={tags}
                        onManageTags={() => setIsTagManagerOpen(true)}
                        onCreateTag={addTag}
                     />
                 </div>
              </div>
              <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100 rounded-b-2xl">
                  <button onClick={() => setIsDuplicateModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors">取消</button>
                  <button 
                    onClick={handleDuplicateSubmit}
                    disabled={!duplicateName.trim()}
                    className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    复制
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* --- Tag Management Modal --- */}
      <TagManagementModal 
        isOpen={isTagManagerOpen}
        onClose={() => setIsTagManagerOpen(false)}
        availableTags={tags}
        workflows={workflows}
        assistants={assistants}
        onRenameTag={renameTag}
        onDeleteTag={deleteTag}
        onCreateTag={handleTagCreate}
      />

      {/* --- Create/Name Modal (Existing) --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <h3 className="text-lg font-bold text-slate-800">
                    {selectedTemplateId ? '从模版创建' : '创建新工作流'}
                 </h3>
                 <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              <div className="p-6 space-y-4">
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">工作流名称</label>
                    <input 
                      autoFocus
                      value={newWorkflowName}
                      onChange={(e) => setNewWorkflowName(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="e.g. 每日报表自动化"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">描述</label>
                    <textarea 
                      value={newWorkflowDesc}
                      onChange={(e) => setNewWorkflowDesc(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                      placeholder="描述该工作流的用途..."
                    />
                 </div>
              </div>
              <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                  <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors">取消</button>
                  <button 
                    onClick={handleCreateSubmit}
                    disabled={!newWorkflowName.trim()}
                    className="px-6 py-2 bg-slate-900 text-white hover:bg-orange-600 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {selectedTemplateId ? '下一步: 配置凭证' : '立即创建'} <ArrowRight size={16} />
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* --- Credentials Modal (Existing) --- */}
      {isCredentialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-orange-50">
                 <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <ShieldCheck className="text-orange-600" /> 配置必要凭证
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">此模版需要连接外部服务，请填写配置。</p>
                 </div>
                 <button onClick={() => setIsCredentialModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                 {requiredCredentials.map((cred) => (
                    <div key={cred.key} className="space-y-1.5">
                       <label className="text-sm font-medium text-slate-700">{cred.label}</label>
                       <input 
                         type={cred.type}
                         value={credentialValues[cred.key] || ''}
                         onChange={(e) => setCredentialValues({...credentialValues, [cred.key]: e.target.value})}
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-mono text-sm"
                         placeholder={`请输入 ${cred.label}...`}
                       />
                    </div>
                 ))}

                 {testResult === 'success' && (
                    <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 size={16} /> 连接测试通过！
                    </div>
                 )}
                 {testResult === 'failed' && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-in fade-in">
                        <X size={16} /> 连接测试失败，请检查凭证。
                    </div>
                 )}
              </div>

              <div className="p-4 bg-slate-50 flex justify-between items-center border-t border-slate-100">
                  <button 
                    onClick={finalizeCreation} 
                    className="text-slate-400 hover:text-slate-600 text-xs underline"
                  >
                    跳过配置 (稍后填写)
                  </button>
                  <div className="flex gap-3">
                      <button 
                        onClick={testCredentials}
                        disabled={isTestingCreds}
                        className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                      >
                         {isTestingCreds && <Loader2 size={14} className="animate-spin" />}
                         测试连接
                      </button>
                      <button 
                         onClick={finalizeCreation}
                         disabled={testResult !== 'success' && !isTestingCreds && Object.keys(credentialValues).length < requiredCredentials.length} // Soft check logic
                         className="px-6 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                         完成并进入画布 <ArrowRight size={16} />
                      </button>
                  </div>
              </div>
           </div>
        </div>
      )}

      {/* --- All Workflows Modal (NEW) --- */}
      {isAllWorkflowsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
               {/* Header */}
               <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white z-10">
                  <h2 className="text-xl font-bold text-slate-800">所有工作流</h2>
                  <button onClick={() => setIsAllWorkflowsOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                      <X size={20} />
                  </button>
               </div>
               
               {/* Filter Bar */}
               <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-4">
                   <div className="flex flex-col md:flex-row gap-4 items-center">
                       <div className="relative flex-1 w-full">
                           <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                           <input 
                             type="text" 
                             placeholder="搜索工作流名称或描述..." 
                             value={wfSearch}
                             onChange={(e) => setWfSearch(e.target.value)}
                             className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                           />
                       </div>
                       <div className="flex gap-3 w-full md:w-auto">
                           <select 
                             value={wfStatus} 
                             onChange={(e) => setWfStatus(e.target.value as any)}
                             className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[120px]"
                           >
                               <option value="ALL">所有状态</option>
                               <option value="PUBLISHED">已发布</option>
                               <option value="DRAFT">草稿</option>
                               <option value="SHARED">已共享</option>
                           </select>
                           <div className="relative min-w-[140px]">
                               <select 
                                   value={wfTag} 
                                   onChange={(e) => setWfTag(e.target.value)}
                                   className="w-full px-3 py-2 pl-8 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                               >
                                   <option value="ALL">所有标签</option>
                                   {tags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                               </select>
                               <Tag size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                           </div>
                       </div>
                   </div>
                   {/* 排序控件 */}
                   <div className="flex items-center gap-2">
                       <span className="text-xs text-slate-500 font-medium">排序:</span>
                       <select
                         value={sortField}
                         onChange={(e) => setSortField(e.target.value as 'name' | 'updatedAt' | 'createdAt')}
                         className="text-xs px-2 py-1 border border-slate-200 rounded bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                       >
                           <option value="updatedAt">更新时间</option>
                           <option value="createdAt">创建时间</option>
                           <option value="name">名称</option>
                       </select>
                       <button
                         onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
                         className="text-xs px-2 py-1 border border-slate-200 rounded bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                         title={sortOrder === 'ASC' ? '升序' : '降序'}
                       >
                           {sortOrder === 'ASC' ? '↑' : '↓'}
                       </button>
                   </div>
               </div>

               {/* Grid Content */}
               <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                   {filteredAllWorkflowGroups.length > 0 ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                           {filteredAllWorkflowGroups.map((group, idx) => (
                               <WorkflowCard 
                                    key={`all-group-${idx}`} 
                                    versions={group} 
                                    activeMenuId={activeMenuId} 
                                    toggleMenu={toggleMenu} 
                                    navigate={(path) => { setIsAllWorkflowsOpen(false); navigate(path); }} 
                                    handleDeleteClick={handleDeleteClick} 
                                    handlePublishClick={handlePublishClick}
                                    onDuplicate={handleDuplicateInitiate}
                                    onRename={handleRename}
                                    onWarnPublished={() => setShowPublishedWarning(true)}
                                    onShare={handleShareClick}
                                    onChangeOwner={handleChangeOwnerInitiate}
                                />
                           ))}
                       </div>
                   ) : (
                       <div className="h-full flex flex-col items-center justify-center text-slate-400">
                           <Filter size={48} className="mb-4 opacity-20" />
                           <p>没有找到匹配的工作流。</p>
                       </div>
                   )}
               </div>
           </div>
        </div>
      )}

      {/* --- All Templates Modal (NEW) --- */}
      {isAllTemplatesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
               {/* Header */}
               <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white z-10">
                  <h2 className="text-xl font-bold text-slate-800">所有模版</h2>
                  <button onClick={() => setIsAllTemplatesOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                      <X size={20} />
                  </button>
               </div>

               {/* Filter Bar */}
               <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                   <div className="relative w-full">
                       <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input 
                         type="text" 
                         placeholder="搜索模版..." 
                         value={tplSearch}
                         onChange={(e) => setTplSearch(e.target.value)}
                         className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                       />
                   </div>
               </div>

               {/* Grid Content */}
               <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    {filteredAllTemplates.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredAllTemplates.map(tpl => (
                                <TemplateCard key={tpl.id} tpl={tpl} useTemplate={useTemplate} />
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <Search size={48} className="mb-4 opacity-20" />
                            <p>没有找到匹配的模版。</p>
                        </div>
                    )}
               </div>
           </div>
        </div>
      )}

      {/* --- Change Owner Modal (NEW) --- */}
      {isChangeOwnerModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                  <div className="p-6">
                      <h3 className="text-lg font-bold text-slate-900 mb-4">选择将此工作流迁移到的项目或用户</h3>
                      
                      <div className="space-y-4">
                          <div className="relative">
                              <select 
                                value={newOwnerId}
                                onChange={(e) => setNewOwnerId(e.target.value)}
                                className="w-full pl-4 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
                              >
                                  <option value="">选择项目或用户...</option>
                                  {MOCK_AVAILABLE_USERS.map(u => (
                                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                  ))}
                              </select>
                              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>

                          <p className="text-xs text-slate-500 leading-relaxed">
                              注意：移动操作将删除此工作流程中所有现有的共享设置
                          </p>

                          <label className="flex items-start gap-2 cursor-pointer group">
                              <input 
                                  type="checkbox" 
                                  checked={shareCredentials}
                                  onChange={(e) => setShareCredentials(e.target.checked)}
                                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-xs text-slate-600 group-hover:text-slate-800 transition-colors select-none">
                                  同时分享此工作流程使用的唯一凭证，以确保其正常运行
                              </span>
                          </label>
                      </div>

                      <div className="flex justify-end gap-3 mt-8">
                          <button 
                              onClick={() => setIsChangeOwnerModalOpen(false)}
                              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
                          >
                              取消
                          </button>
                          <button 
                              onClick={handleChangeOwnerSubmit}
                              disabled={!newOwnerId}
                              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              移动工程
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- Toast Notification --- */}
      {toast && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[70] animate-in slide-in-from-bottom-5 fade-in duration-300">
              <div className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border ${
                  toast.type === 'success' ? 'bg-white border-green-200 text-green-700' : 'bg-white border-red-200 text-red-700'
              }`}>
                  {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  <span className="text-sm font-medium">{toast.msg}</span>
              </div>
          </div>
      )}
    </div>
  );
};

export default SmartWorkflows;