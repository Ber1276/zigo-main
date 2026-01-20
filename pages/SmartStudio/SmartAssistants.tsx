import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../App';
import { Assistant, PublishStatus } from '../../types';
import { assistantApi, authApi } from '../../services/n8nApi';
import { TagInput } from '../../components/TagInput';
import { TagManagementModal } from '../../components/TagManagementModal';
import { 
  Plus, 
  Trash2, 
  Share2, 
  UserPlus, 
  Bot,
  Pencil,
  MinusCircle,
  SlidersHorizontal,
  Copy,
  Layers,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Search,
  Filter,
  Tag,
  X,
  AlertTriangle,
  Mail,
  CheckCircle2,
  Info,
  ArrowLeft,
  User as UserIcon,
  Rocket,
  MessageSquare,
  ShieldCheck,
  Loader2,
  AlertCircle
} from 'lucide-react';

// Mock Templates
const AGENT_TEMPLATES = [
  { id: 't1', name: 'SQL 专家', description: '精通各种数据库方言，帮助优化查询。', avatar: '💾' },
  { id: 't2', name: '文案润色', description: '将枯燥的文本转化为吸引人的营销文案。', avatar: '✍️' },
  { id: 't3', name: 'Bug 猎手', description: '分析错误日志并给出修复建议。', avatar: '🐛' },
  { id: 't4', name: '面试官', description: '模拟技术面试场景，提供反馈。', avatar: '👔' },
];

// Mock Users for Share Feature
const MOCK_AVAILABLE_USERS = [
    { id: 'u3', name: '张三', email: 'zhangsan@example.com' },
    { id: 'u4', name: '王五', email: 'wangwu@example.com' },
    { id: 'u5', name: '赵六', email: 'zhaoliu@example.com' }
];

interface AssistantCardProps {
    versions: Assistant[];
    navigate: (path: string) => void;
    activeMenuId: string | null;
    toggleMenu: (e: React.MouseEvent, id: string) => void;
    handleDeleteClick: (e: React.MouseEvent, id: string, name: string, status: PublishStatus) => void;
    handlePublishClick: (assistant: Assistant) => void;
    onDuplicate: (id: string) => void;
    onShare: (id: string) => void;
    onChangeOwner: (id: string) => void;
    onWarnPublished: () => void;
    onRename: (id: string, newName: string) => void;
}

// Reusable Assistant Card
const AssistantCard: React.FC<AssistantCardProps> = ({ 
    versions, 
    navigate, 
    activeMenuId, 
    toggleMenu, 
    handleDeleteClick, 
    handlePublishClick,
    onDuplicate,
    onShare,
    onChangeOwner,
    onWarnPublished,
    onRename
}) => {
    // Sort versions desc by createdAt
    const sortedVersions = useMemo(() => {
        return [...versions].sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
    }, [versions]);

    const [selectedVersionId, setSelectedVersionId] = useState(sortedVersions[0].id);
    const [showAllTags, setShowAllTags] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState('');
    const tagsRef = useRef<HTMLDivElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    // Sync selected version if versions prop changes
    useEffect(() => {
        if (!versions.find(v => v.id === selectedVersionId)) {
            setSelectedVersionId(sortedVersions[0].id);
        }
    }, [versions, sortedVersions, selectedVersionId]);

    const currentAgent = versions.find(v => v.id === selectedVersionId) || sortedVersions[0];
    const isOwner = currentAgent.owner === 'User';

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
    }, [isEditingName, nameDraft]);

    // Name editing handlers
    const startEditingName = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentAgent.status === 'PUBLISHED') {
            onWarnPublished();
            return;
        }
        setNameDraft(currentAgent.name);
        setIsEditingName(true);
        setTimeout(() => nameInputRef.current?.focus(), 50);
    };

    const submitNameChange = () => {
        if (isEditingName && nameDraft.trim() && nameDraft !== currentAgent.name) {
            onRename(currentAgent.id, nameDraft.trim());
        }
        setIsEditingName(false);
    };

    return (
        <div 
            className={`bg-white rounded-xl border transition-all duration-300 relative group flex flex-col h-full min-h-[220px]
                ${currentAgent.status === 'PUBLISHED' 
                ? 'border-green-200 shadow-[0_0_10px_rgba(74,222,128,0.2)] hover:shadow-[0_0_15px_rgba(74,222,128,0.4)]' 
                : 'border-slate-200 shadow-sm hover:shadow-lg'
                }
            `}
        >
            {/* Header */}
            <div className="px-4 pt-4 pb-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 max-w-[70%]">
                        <span className="text-lg">{currentAgent.avatar || '🤖'}</span>
                        
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
                                onClick={() => navigate(`/assistant/${currentAgent.id}`)}
                            >
                                {currentAgent.name}
                            </h3>
                        )}

                        {!isEditingName && isOwner && (
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
                    <span>更新于 {new Date(currentAgent.updatedAt || currentAgent.createdAt).toLocaleDateString()}</span>
                    {!isOwner && (
                        <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-1.5 rounded" title={`所有者: ${currentAgent.owner}`}>
                            <UserIcon size={10}/> {currentAgent.owner}
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
                            currentAgent.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                            currentAgent.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                        }`}>
                            {currentAgent.status === 'PUBLISHED' ? '已发布' : currentAgent.status === 'DRAFT' ? '草稿' : '已共享'}
                        </span>
                        {/* Run Status Indicator */}
                        {currentAgent.lastRunStatus === 'SUCCESS' && (
                            <span className="text-[10px] text-green-600 flex items-center gap-0.5" title="上次调试成功"><CheckCircle2 size={10} /> 正常</span>
                        )}
                        {currentAgent.lastRunStatus === 'FAILURE' && (
                            <span className="text-[10px] text-red-600 flex items-center gap-0.5" title="上次调试失败"><AlertTriangle size={10} /> 异常</span>
                        )}
                    </div>
                    
                    <button 
                        onClick={(e) => toggleMenu(e, currentAgent.id)}
                        className="text-slate-400 hover:text-slate-800 p-1 rounded hover:bg-slate-100"
                    >
                        <SlidersHorizontal size={14} />
                    </button>

                    {/* Dropdown Menu */}
                    {activeMenuId === currentAgent.id && (
                        <div className="absolute right-0 top-6 w-32 bg-white text-slate-700 rounded-lg shadow-xl z-20 py-1 border border-slate-200 animate-in fade-in zoom-in-95 duration-100">
                            {isOwner && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onShare(currentAgent.id); }}
                                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                >
                                    <Share2 size={12} /> 共享
                                </button>
                            )}
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDuplicate(currentAgent.id); }}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 transition-colors"
                            >
                                <Copy size={12} /> 复制
                            </button>
                            {isOwner && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onChangeOwner(currentAgent.id); }}
                                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                >
                                    <Layers size={12} /> 变更所有者
                                </button>
                            )}
                            {(isOwner) && <div className="h-[1px] bg-slate-100 my-1"></div>}
                            {isOwner && (
                                <button 
                                    onClick={(e) => handleDeleteClick(e, currentAgent.id, currentAgent.name, currentAgent.status)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                >
                                    <Trash2 size={12} /> 删除
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-500 line-clamp-3 mb-3 font-light leading-relaxed flex-1">
                    {currentAgent.description}
                </p>

                {/* Tags */}
                <div className="relative flex flex-wrap gap-1.5 mb-3" ref={tagsRef}>
                    {currentAgent.tags?.slice(0, 5).map((tag, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#C25E5E] text-white font-medium">
                            {tag}
                        </span>
                    ))}
                    {(currentAgent.tags?.length || 0) > 5 && (
                        <>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowAllTags(!showAllTags); }}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors font-medium"
                            >
                                +{(currentAgent.tags?.length || 0) - 5}
                            </button>
                            {showAllTags && (
                                <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-2 z-30 w-48 flex flex-wrap gap-1.5 animate-in fade-in zoom-in-95 duration-100">
                                    {currentAgent.tags?.map((tag, i) => (
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
                    onClick={() => { navigate(`/assistant/${currentAgent.id}`); }}
                    className="flex-1 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                    <Pencil size={12} /> 编辑
                </button>
                {isOwner && (
                    <button 
                        onClick={() => handlePublishClick(currentAgent)}
                        className="flex-1 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                        {currentAgent.status === 'PUBLISHED' ? '下架' : '发布'}
                    </button>
                )}
            </div>
        </div>
    );
};

const SmartAssistants: React.FC = () => {
  const { assistants, setAssistants, workflows, tags, addTag, deleteTag, renameTag } = useAppContext();
  const navigate = useNavigate();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [isLoadingAssistants, setIsLoadingAssistants] = useState(false);
  
  // 使用 ref 缓存当前用户信息，避免重复请求
  const currentUserRef = useRef<any>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAllAssistantsOpen, setIsAllAssistantsOpen] = useState(false);
  const [isAllTemplatesOpen, setIsAllTemplatesOpen] = useState(false);
  
  // -- Modal States (Credential) --
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [requiredCredentials, setRequiredCredentials] = useState<{key: string, label: string, type: string}[]>([]);
  const [credentialValues, setCredentialValues] = useState<Record<string, string>>({});
  const [isTestingCreds, setIsTestingCreds] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);

  // -- Modal States (Duplicate) --
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateAgentId, setDuplicateAgentId] = useState<string | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicateTags, setDuplicateTags] = useState<string[]>([]);
  
  // -- Modal States (Tag Manager) --
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);

  // -- Modal States (Share) --
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

  // -- Modal States (Change Owner) --
  const [isChangeOwnerModalOpen, setIsChangeOwnerModalOpen] = useState(false);
  const [changeOwnerId, setChangeOwnerId] = useState<string | null>(null);
  const [newOwnerId, setNewOwnerId] = useState('');
  const [shareCredentials, setShareCredentials] = useState(false);

  // -- Modal States (Delete) --
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean, id: string | null, name: string }>({ isOpen: false, id: null, name: '' });
  const [showPublishedWarning, setShowPublishedWarning] = useState(false);

  // -- Modal States (Publish) --
  const [publishModal, setPublishModal] = useState<{ isOpen: boolean, agent: Assistant | null }>({ isOpen: false, agent: null });
  const [publishName, setPublishName] = useState('');
  const [publishDesc, setPublishDesc] = useState('');
  const [notExecutedWarning, setNotExecutedWarning] = useState(false);

  // Form State
  const [newAssistantName, setNewAssistantName] = useState('');
  const [newAssistantDesc, setNewAssistantDesc] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Filter State
  const [asSearch, setAsSearch] = useState('');
  const [asStatus, setAsStatus] = useState<'ALL' | 'PUBLISHED' | 'DRAFT' | 'SHARED'>('ALL');
  const [asTag, setAsTag] = useState<string>('ALL');
  const [tplSearch, setTplSearch] = useState('');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 3000);
  };

  /**
   * 从后端获取助手列表
   * 使用 GET /rest/assistant 接口，支持分页和过滤
   */
  const fetchAssistants = useCallback(async (applyFilters: boolean = true) => {
    setIsLoadingAssistants(true);
    try {
      // 使用 ref 缓存的用户信息，避免重复请求
      let user = currentUserRef.current;
      if (!user) {
        user = await authApi.getCurrentUser();
        currentUserRef.current = user;
      }

      // 构建过滤条件
      const filter: any = {
        isArchived: false, // 不包含已归档的助手
      };

      if (applyFilters) {
        if (asSearch) filter.name = asSearch;
        if (asStatus !== 'ALL') filter.status = asStatus;
        if (asTag !== 'ALL' && tags.includes(asTag)) {
          filter.tags = [asTag];
        }
      }

      // 调用后端 API 获取助手列表
      const response = await assistantApi.list(filter, {
        sortBy: 'updatedAt',
      });

      // 转换数据格式（如果需要）
      const transformedAssistants = response.data.map((assistant: any) => ({
        id: assistant.id,
        name: assistant.name,
        description: assistant.description || '',
        status: assistant.status || 'DRAFT',
        version: assistant.version || '0.0.1',
        owner: user?.firstName || user?.email || user?.id || 'User',
        modelId: assistant.modelId || 'm1',
        createdAt: assistant.createdAt,
        updatedAt: assistant.updatedAt || assistant.createdAt,
        avatar: assistant.avatar,
        tags: assistant.tags || [],
        lastRunStatus: assistant.lastRunStatus || 'NONE',
        data: assistant.data,
      }));

      // 更新全局状态
      setAssistants(transformedAssistants);
    } catch (error: any) {
      console.error('获取助手列表失败:', error);
      showToast('获取助手列表失败: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setIsLoadingAssistants(false);
    }
  }, [asSearch, asStatus, asTag, tags, setAssistants]);

  // 使用 ref 来跟踪是否是初始加载
  const isInitialLoad = useRef(true);

  // 组件加载时获取用户信息和助手列表（只获取一次）
  useEffect(() => {
    const loadData = async () => {
      // 获取用户信息（如果还没有）
      if (!currentUserRef.current) {
        currentUserRef.current = await authApi.getCurrentUser();
      }
      // 获取助手列表
      await fetchAssistants(false); // 初始加载时不应用筛选
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
      fetchAssistants(true);
    }, 300); // 300ms 防抖
    
    return () => clearTimeout(timer);
  }, [asSearch, asStatus, asTag, fetchAssistants]);

  // Group assistants by name to get all versions
  const groupedAssistants = useMemo(() => {
      const groups: Record<string, Assistant[]> = {};
      assistants.forEach(a => {
          if (!groups[a.name]) groups[a.name] = [];
          groups[a.name].push(a);
      });
      
      const groupedArray = Object.values(groups);
      
      return groupedArray.sort((groupA, groupB) => {
          const latestA = groupA.reduce((prev, current) => (new Date(prev.createdAt) > new Date(current.createdAt) ? prev : current));
          const latestB = groupB.reduce((prev, current) => (new Date(prev.createdAt) > new Date(current.createdAt) ? prev : current));
          return new Date(latestB.createdAt).getTime() - new Date(latestA.createdAt).getTime();
      });
  }, [assistants]);

  const displayedGroups = groupedAssistants.slice(0, 7);

  const filteredAllAssistantGroups = useMemo(() => {
      return groupedAssistants.filter(group => {
          // Use latest version for filtering
          const latest = group.reduce((prev, current) => (new Date(prev.createdAt) > new Date(current.createdAt) ? prev : current));
          const matchesSearch = latest.name.toLowerCase().includes(asSearch.toLowerCase()) || latest.description.toLowerCase().includes(asSearch.toLowerCase());
          const matchesStatus = asStatus === 'ALL' || latest.status === asStatus;
          const matchesTag = asTag === 'ALL' || latest.tags?.includes(asTag);
          return matchesSearch && matchesStatus && matchesTag;
      });
  }, [groupedAssistants, asSearch, asStatus, asTag]);

   const filteredAllTemplates = useMemo(() => {
      return AGENT_TEMPLATES.filter(t => t.name.toLowerCase().includes(tplSearch.toLowerCase()) || t.description.toLowerCase().includes(tplSearch.toLowerCase()));
  }, [tplSearch]);

  const handlePublishClick = async (agent: Assistant) => {
      // Toggle logic
      if (agent.status === 'PUBLISHED') {
          // Unpublish - 更新状态为 DRAFT
          try {
              const updated = await assistantApi.update(agent.id, { status: 'DRAFT' });
              setAssistants(prev => prev.map(a => a.id === agent.id ? { ...a, status: 'DRAFT', updatedAt: updated.updatedAt || new Date().toISOString() } : a));
              showToast('助手已下架，转为草稿状态', 'success');
          } catch (error: any) {
              console.error('下架助手失败:', error);
              showToast('下架助手失败: ' + (error.response?.data?.message || error.message), 'error');
          }
      } else {
          // Publish: Check execution status
          if (agent.lastRunStatus !== 'SUCCESS') {
              setNotExecutedWarning(true);
              return;
          }
          // Open Modal
          setPublishName(agent.name);
          setPublishDesc(agent.description);
          setPublishModal({ isOpen: true, agent });
      }
  };

  const confirmPublish = async () => {
      if (publishModal.agent) {
          try {
              // 调用后端 API 更新助手状态和名称/描述
              const updated = await assistantApi.update(publishModal.agent.id, {
                  status: 'PUBLISHED',
                  name: publishName,
                  description: publishDesc,
              });
              // 更新本地状态
              setAssistants(prev => prev.map(a => a.id === publishModal.agent!.id ? {
                  ...a,
                  status: 'PUBLISHED',
                  name: updated.name,
                  description: updated.description,
                  updatedAt: updated.updatedAt || new Date().toISOString()
              } : a));
              setPublishModal({ isOpen: false, agent: null });
              showToast('发布成功！', 'success');
          } catch (error: any) {
              console.error('发布助手失败:', error);
              showToast('发布助手失败: ' + (error.response?.data?.message || error.message), 'error');
          }
      }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string, name: string, status: PublishStatus) => {
    e.stopPropagation();
    setActiveMenuId(null);

    if (status === 'PUBLISHED') {
        setShowPublishedWarning(true);
        return;
    }
    setDeleteConfirm({ isOpen: true, id, name });
  };

  const confirmDelete = async () => {
      if (deleteConfirm.id) {
          try {
              // 调用后端 API 删除助手
              await assistantApi.delete(deleteConfirm.id);
              // 更新本地状态
              setAssistants(prev => prev.filter(a => a.id !== deleteConfirm.id));
              showToast('助手已删除', 'success');
          } catch (error: any) {
              console.error('删除助手失败:', error);
              showToast('删除助手失败: ' + (error.response?.data?.message || error.message), 'error');
          }
      }
      setDeleteConfirm({ isOpen: false, id: null, name: '' });
  };

  const handleRename = async (id: string, newName: string) => {
      try {
          // 调用后端 API 更新助手名称
          const updated = await assistantApi.update(id, { name: newName });
          // 更新本地状态
          setAssistants(prev => prev.map(a => a.id === id ? { ...a, name: updated.name, updatedAt: updated.updatedAt || new Date().toISOString() } : a));
      } catch (error: any) {
          console.error('重命名助手失败:', error);
          showToast('重命名助手失败: ' + (error.response?.data?.message || error.message), 'error');
      }
  };

  // Tag Manager Logic
  const handleTagCreate = (tagName: string) => {
      addTag(tagName);
      return true; 
  };

  // Duplicate Logic
  const handleDuplicateInitiate = (id: string) => {
    const agent = assistants.find(a => a.id === id);
    if (agent) {
      setDuplicateAgentId(id);
      setDuplicateName(`${agent.name} (副本)`);
      setDuplicateTags(agent.tags || []);
      setActiveMenuId(null);
      setIsDuplicateModalOpen(true);
    }
  };

  const handleDuplicateSubmit = async () => {
    if (!duplicateAgentId || !duplicateName.trim()) return;
    
    const original = assistants.find(a => a.id === duplicateAgentId);
    if (!original) return;

    try {
        // 获取原始助手的完整数据
        const originalAssistant = await assistantApi.get(duplicateAgentId);
        
        // 使用缓存的用户信息
        let user = currentUserRef.current;
        if (!user) {
          user = await authApi.getCurrentUser();
          currentUserRef.current = user;
        }

        // 获取原始助手的工作流数据（body）
        // 如果 originalAssistant.data 包含 body，使用它；否则创建一个基本结构
        const originalBody = originalAssistant.data?.body || {
            name: originalAssistant.name,
            nodes: [],
            connections: {},
            active: false,
            settings: { executionOrder: "v1" },
            tags: duplicateTags,
            versionId: ""
        };

        // 创建新助手对象，按照后端接口格式
        const newAssistantData = {
            name: duplicateName,
            discription: originalAssistant.description || '', // 注意是 discription
            body: {
                ...originalBody,
                name: duplicateName,
                tags: duplicateTags,
                active: false,
                versionId: ""
            }
        };

        // 调用后端 API 创建助手
        const createdAssistant = await assistantApi.create(newAssistantData);
        
        // 转换数据格式并添加到列表
        const transformedAssistant: Assistant = {
            id: createdAssistant.id || `assistant-${Date.now()}`,
            name: createdAssistant.name || duplicateName,
            description: createdAssistant.description || originalAssistant.description || '',
            status: createdAssistant.status || 'DRAFT',
            version: createdAssistant.version || originalAssistant.version || '0.0.1',
            owner: user?.firstName || user?.email || user?.id || 'User',
            modelId: createdAssistant.modelId || originalAssistant.modelId || 'm1',
            createdAt: createdAssistant.createdAt || new Date().toISOString(),
            updatedAt: createdAssistant.updatedAt || new Date().toISOString(),
            avatar: originalAssistant.avatar,
            tags: duplicateTags,
            lastRunStatus: 'NONE',
            data: createdAssistant.data,
        };
        
        setAssistants([transformedAssistant, ...assistants]);
        setIsDuplicateModalOpen(false);
        setDuplicateAgentId(null);
        setDuplicateName('');
        setDuplicateTags([]);
        showToast('助手已复制', 'success');
    } catch (error: any) {
        console.error('复制助手失败:', error);
        showToast('复制助手失败: ' + (error.response?.data?.message || error.message), 'error');
    }
  };

  // Share Logic
  const handleShareClick = (id: string) => {
      setActiveShareId(id);
      setShareModalMode('LIST');
      setUserToAdd('');
      setRemoveUserConfirm(null);
      setIsShareModalOpen(true);
      setActiveMenuId(null);
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
          name: inviteEmail.split('@')[0],
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
  };

  // Change Owner Logic
  const handleChangeOwnerInitiate = (id: string) => {
      setChangeOwnerId(id);
      setNewOwnerId('');
      setShareCredentials(false);
      setActiveMenuId(null);
      setIsChangeOwnerModalOpen(true);
  };

  const handleChangeOwnerSubmit = () => {
      if (!changeOwnerId || !newOwnerId) return;
      
      const user = MOCK_AVAILABLE_USERS.find(u => u.id === newOwnerId);
      const newOwnerName = user ? user.name : 'Unknown User';
      
      setAssistants(prev => prev.map(a => a.id === changeOwnerId ? { ...a, owner: newOwnerName } : a));
      
      showToast(`所有权已成功转移给 ${newOwnerName}`, 'success');

      setIsChangeOwnerModalOpen(false);
      setChangeOwnerId(null);
      setNewOwnerId('');
  };

  const openCreateModal = (templateId?: string) => {
    setSelectedTemplateId(templateId || null);
    if (templateId) {
        const tpl = AGENT_TEMPLATES.find(t => t.id === templateId);
        setNewAssistantName(`${tpl?.name} (副本)`);
        setNewAssistantDesc(tpl?.description || '');
        setIsAllTemplatesOpen(false);
    } else {
        setNewAssistantName('');
        setNewAssistantDesc('');
    }
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = () => {
    if (!newAssistantName.trim()) return;

    // Check template requirements
    if (selectedTemplateId) {
        const reqs = [];
        if (selectedTemplateId === 't1') { // SQL Expert
            reqs.push({ key: 'db_connection', label: '数据库连接串', type: 'text' });
        }
        if (selectedTemplateId === 't3') { // Bug Hunter
            reqs.push({ key: 'issue_tracker_key', label: 'Jira/Github API Key', type: 'password' });
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
        // 使用缓存的用户信息
        let user = currentUserRef.current;
        if (!user) {
          user = await authApi.getCurrentUser();
          currentUserRef.current = user;
        }
        
        const template = AGENT_TEMPLATES.find(t => t.id === selectedTemplateId);

        // 构建新助手数据，按照后端接口文档的格式
        // 创建一个基本的工作流结构
        const workflowBody = {
            name: newAssistantName,
            nodes: [
                // 默认的聊天触发器节点
                {
                    parameters: {
                        public: true,
                        options: {}
                    },
                    type: "@n8n/n8n-nodes-langchain.chatTrigger",
                    typeVersion: 1.4,
                    position: [0, 0],
                    id: `trigger-${Date.now()}`,
                    name: "When chat message received",
                    webhookId: `webhook-${Date.now()}`
                },
                // 默认的 AI Agent 节点
                {
                    parameters: {
                        options: {
                            systemMessage: newAssistantDesc || "You are a helpful assistant"
                        }
                    },
                    type: "@n8n/n8n-nodes-langchain.agent",
                    typeVersion: 3,
                    position: [320, 0],
                    id: `agent-${Date.now()}`,
                    name: "AI Agent"
                }
            ],
            pinData: {},
            connections: {
                "When chat message received": {
                    main: [
                        [
                            {
                                node: "AI Agent",
                                type: "main",
                                index: 0
                            }
                        ]
                    ]
                }
            },
            active: false,
            settings: {
                executionOrder: "v1"
            },
            tags: template ? ['模版'] : ['新建'],
            versionId: ""
        };

        // 构建符合后端接口格式的请求体
        const newAssistantData = {
            name: newAssistantName,
            discription: newAssistantDesc || '暂无描述', // 注意是 discription 不是 description
            body: workflowBody
        };

        // 调试：打印发送的数据
        console.log('创建助手请求数据:', JSON.stringify(newAssistantData, null, 2));

        // 调用后端 API 创建助手
        const createdAssistant = await assistantApi.create(newAssistantData);
        
        // 转换数据格式并添加到列表
        const transformedAssistant: Assistant = {
            id: createdAssistant.id || `assistant-${Date.now()}`,
            name: createdAssistant.name || newAssistantName,
            description: createdAssistant.description || newAssistantDesc || '暂无描述',
            status: createdAssistant.status || 'DRAFT',
            version: createdAssistant.version || '0.0.1',
            owner: user?.firstName || user?.email || user?.id || 'User',
            modelId: createdAssistant.modelId || 'm1',
            createdAt: createdAssistant.createdAt || new Date().toISOString(),
            updatedAt: createdAssistant.updatedAt || new Date().toISOString(),
            avatar: template ? template.avatar : '🤖',
            tags: createdAssistant.tags || (template ? ['模版'] : ['新建']),
            lastRunStatus: 'NONE',
            data: createdAssistant.data,
        };
        
        setAssistants([transformedAssistant, ...assistants]);
        setIsCreateModalOpen(false);
        setIsCredentialModalOpen(false);
        navigate(`/assistant/${transformedAssistant.id}`);
        showToast('助手创建成功', 'success');
    } catch (error: any) {
        console.error('创建助手失败:', error);
        showToast('创建助手失败: ' + (error.response?.data?.message || error.message), 'error');
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
      setActiveMenuId(activeMenuId === id ? null : id);
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const displayedTemplates = AGENT_TEMPLATES.slice(0, 8);

  return (
    <div className="space-y-8 pb-12 relative">
      <section>
         <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                我的智能助手
                {isLoadingAssistants && <Loader2 size={16} className="animate-spin text-slate-400" />}
            </h2>
            <button 
                onClick={() => setIsAllAssistantsOpen(true)}
                className="text-sm text-blue-600 hover:underline"
            >
                查看全部 ({groupedAssistants.length})
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
             {/* Create Card */}
            <div 
                onClick={() => openCreateModal()}
                className="bg-white rounded-xl border-2 border-dashed border-slate-200 hover:border-purple-400 hover:bg-purple-50/30 transition-all cursor-pointer flex flex-col items-center justify-center text-center p-6 min-h-[220px] group"
            >
                <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-white group-hover:shadow-md flex items-center justify-center text-slate-400 group-hover:text-purple-500 transition-all mb-3">
                   <Sparkles size={24} />
                </div>
                <h3 className="font-bold text-slate-700 group-hover:text-purple-700 transition-colors">新建智能助手</h3>
                <span className="mt-2 text-xs font-medium text-purple-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                   开始创建 <ArrowRight size={12} />
                </span>
            </div>

            {displayedGroups.map((group, idx) => (
                <AssistantCard 
                    key={`as-group-${idx}`} 
                    versions={group}
                    navigate={navigate}
                    activeMenuId={activeMenuId}
                    toggleMenu={toggleMenu}
                    handleDeleteClick={handleDeleteClick}
                    handlePublishClick={handlePublishClick}
                    onDuplicate={handleDuplicateInitiate}
                    onShare={handleShareClick}
                    onChangeOwner={handleChangeOwnerInitiate}
                    onWarnPublished={() => setShowPublishedWarning(true)}
                    onRename={handleRename}
                />
            ))}
         </div>
      </section>

      <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">助手模版库</h2>
            <button 
                onClick={() => setIsAllTemplatesOpen(true)}
                className="text-sm text-blue-600 hover:underline"
            >
                查看全部
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
             {displayedTemplates.map(tpl => (
                 <div key={tpl.id} className="bg-gradient-to-br from-white to-slate-50/50 rounded-xl border border-slate-200 p-4 hover:border-purple-300 transition-colors flex flex-col h-full hover:shadow-md min-h-[200px]">
                     <div className="flex items-center justify-center mb-4 mt-2">
                        <div className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-2xl shadow-sm">
                            {tpl.avatar}
                        </div>
                     </div>
                     <h3 className="font-bold text-slate-800 text-center mb-1 text-base">{tpl.name}</h3>
                     <p className="text-xs text-slate-500 text-center mb-4 leading-relaxed flex-1 px-2">{tpl.description}</p>
                     <button 
                        onClick={() => openCreateModal(tpl.id)}
                        className="w-full py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all shadow-sm mt-auto"
                     >
                        使用此模版
                     </button>
                 </div>
             ))}
          </div>
      </section>

      {/* --- Credentials Modal (New) --- */}
      {isCredentialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-purple-50">
                 <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <ShieldCheck className="text-purple-600" /> 配置必要凭证
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">此助手模版需要连接外部服务，请填写配置。</p>
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
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm"
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
                         className="px-6 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                         完成并进入编排 <ArrowRight size={16} />
                      </button>
                  </div>
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
                                 <div key={tpl.id} className="bg-gradient-to-br from-white to-slate-50/50 rounded-xl border border-slate-200 p-4 hover:border-purple-300 transition-colors flex flex-col h-full hover:shadow-md min-h-[200px]">
                                     <div className="flex items-center justify-center mb-4 mt-2">
                                        <div className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-2xl shadow-sm">
                                            {tpl.avatar}
                                        </div>
                                     </div>
                                     <h3 className="font-bold text-slate-800 text-center mb-1 text-base">{tpl.name}</h3>
                                     <p className="text-xs text-slate-500 text-center mb-4 leading-relaxed flex-1 px-2">{tpl.description}</p>
                                     <button 
                                        onClick={() => openCreateModal(tpl.id)}
                                        className="w-full py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all shadow-sm mt-auto"
                                     >
                                        使用此模版
                                     </button>
                                 </div>
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

      {/* --- Duplicate Assistant Modal --- */}
      {isDuplicateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md transform transition-all scale-100 flex flex-col min-h-[300px]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                 <h3 className="text-lg font-bold text-slate-800">
                    复制智能助手
                 </h3>
                 <button onClick={() => setIsDuplicateModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              <div className="p-6 space-y-4 flex-1">
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">助手名称</label>
                    <input 
                      autoFocus
                      value={duplicateName}
                      onChange={(e) => setDuplicateName(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
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
                    className="px-6 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    复制
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
                        确认发布助手
                     </h3>
                     <button onClick={() => setPublishModal({ isOpen: false, agent: null })} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                     <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">助手名称</label>
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
                      <button onClick={() => setPublishModal({ isOpen: false, agent: null })} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors">取消</button>
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
                          助手必须先进行测试运行并<b>保存且执行成功</b>后才能发布。请进入编辑器进行对话调试。
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

      {/* --- Create Modal --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <h3 className="text-lg font-bold text-slate-800">
                    {selectedTemplateId ? '从模版创建助手' : '创建新助手'}
                 </h3>
                 <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              <div className="p-6 space-y-4">
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">助手名称</label>
                    <input 
                      autoFocus
                      value={newAssistantName}
                      onChange={(e) => setNewAssistantName(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      placeholder="e.g. 代码优化专家"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">描述</label>
                    <textarea 
                      value={newAssistantDesc}
                      onChange={(e) => setNewAssistantDesc(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                      placeholder="描述该助手的用途..."
                    />
                 </div>
              </div>
              <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                  <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors">取消</button>
                  <button 
                    onClick={handleCreateSubmit}
                    disabled={!newAssistantName.trim()}
                    className="px-6 py-2 bg-slate-900 text-white hover:bg-purple-600 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {selectedTemplateId ? '下一步: 配置' : '立即创建'} <ArrowRight size={16} />
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* --- All Assistants Modal --- */}
      {isAllAssistantsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
               {/* Header */}
               <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white z-10">
                  <h2 className="text-xl font-bold text-slate-800">所有智能助手</h2>
                  <button onClick={() => setIsAllAssistantsOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                      <X size={20} />
                  </button>
               </div>
               
               {/* Filter Bar */}
               <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center">
                   <div className="relative flex-1 w-full">
                       <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input 
                         type="text" 
                         placeholder="搜索助手名称或描述..." 
                         value={asSearch}
                         onChange={(e) => setAsSearch(e.target.value)}
                         className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                       />
                   </div>
                   <div className="flex gap-3 w-full md:w-auto">
                       <select 
                         value={asStatus} 
                         onChange={(e) => setAsStatus(e.target.value as any)}
                         className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[120px]"
                       >
                           <option value="ALL">所有状态</option>
                           <option value="PUBLISHED">已发布</option>
                           <option value="DRAFT">草稿</option>
                           <option value="SHARED">已共享</option>
                       </select>
                       <div className="relative min-w-[140px]">
                           <select 
                               value={asTag} 
                               onChange={(e) => setAsTag(e.target.value)}
                               className="w-full px-3 py-2 pl-8 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                           >
                               <option value="ALL">所有标签</option>
                               {tags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                           </select>
                           <Tag size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                       </div>
                   </div>
               </div>

               {/* Grid Content */}
               <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                   {filteredAllAssistantGroups.length > 0 ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                           {filteredAllAssistantGroups.map((group, idx) => (
                               <AssistantCard 
                                    key={`all-as-group-${idx}`} 
                                    versions={group} 
                                    navigate={navigate}
                                    activeMenuId={activeMenuId}
                                    toggleMenu={toggleMenu}
                                    handleDeleteClick={handleDeleteClick}
                                    handlePublishClick={handlePublishClick}
                                    onDuplicate={handleDuplicateInitiate}
                                    onShare={handleShareClick}
                                    onChangeOwner={handleChangeOwnerInitiate}
                                    onWarnPublished={() => setShowPublishedWarning(true)}
                                    onRename={handleRename}
                                />
                           ))}
                       </div>
                   ) : (
                       <div className="h-full flex flex-col items-center justify-center text-slate-400">
                           <Bot size={48} className="mb-4 opacity-20" />
                           <p>没有找到匹配的助手。</p>
                       </div>
                   )}
               </div>
           </div>
        </div>
      )}

      {/* --- Share Modal --- */}
        {isShareModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col transform transition-all scale-100 min-h-[400px] relative">
                  {shareModalMode === 'LIST' ? (
                      <>
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-slate-900 mb-6">共享</h3>
                            <div className="mb-6">
                                <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">添加系统用户</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <select value={userToAdd} onChange={(e) => setUserToAdd(e.target.value)} className="w-full h-10 pl-3 pr-8 border border-slate-300 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                            <option value="">选择用户...</option>
                                            {MOCK_AVAILABLE_USERS.filter(u => !sharedUsers.find(s => s.id === u.id)).map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                    <button onClick={handleAddSystemUser} disabled={!userToAdd} className="h-10 px-4 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors">添加</button>
                                </div>
                            </div>
                            <div className="mb-6 flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <div className="flex items-center gap-2 text-blue-800"><MessageSquare size={16} /><span className="text-sm font-medium">需要邀请外部人员？</span></div>
                                <button onClick={() => {setInviteEmail(''); setShareModalMode('INVITE');}} className="text-xs bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-md hover:bg-blue-600 hover:text-white transition-colors font-medium">通过邮箱邀请</button>
                            </div>
                            <div className="text-xs font-bold text-slate-500 mb-3 uppercase">已添加成员</div>
                            <div className="space-y-4 max-h-[200px] overflow-y-auto pr-1">
                                {sharedUsers.map(user => (
                                    <div key={user.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-400 shrink-0"><span className="text-xs font-bold">{user.name[0].toUpperCase()}</span></div>
                                            <div className="flex flex-col"><span className="text-sm font-bold text-slate-800 leading-tight">{user.name}</span><span className="text-xs text-slate-500 leading-tight mt-0.5">{user.email}</span></div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {user.role === 'OWNER' ? <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">所有者</span> : (
                                                <><span className="text-sm text-slate-600">{user.role === 'ADMIN' ? '管理员' : '用户'}</span><button onClick={() => setRemoveUserConfirm(user.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button></>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end mt-auto">
                            <button onClick={() => { setIsShareModalOpen(false); showToast('共享设置已保存', 'success'); }} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">完成</button>
                        </div>
                      </>
                  ) : (
                      <>
                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-6"><button onClick={() => setShareModalMode('LIST')} className="p-1 hover:bg-slate-100 rounded-full -ml-2 text-slate-500"><ArrowLeft size={20}/></button><h3 className="text-xl font-bold text-slate-900">邀请外部用户</h3></div>
                            <div className="space-y-5">
                                <div className="space-y-2"><label className="text-sm font-medium text-slate-500">邮箱地址 <span className="text-red-500">*</span></label><input autoFocus value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="name@example.com"/></div>
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
                        <div className="p-4 border-t border-slate-100 flex justify-end mt-auto gap-3">
                            <button onClick={() => setShareModalMode('LIST')} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">取消</button>
                            <button onClick={handleInviteUser} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">发送邀请</button>
                        </div>
                      </>
                  )}
               </div>
            </div>
        )}

        {/* Tag Management Modal */}
        <TagManagementModal 
            isOpen={isTagManagerOpen} 
            onClose={() => setIsTagManagerOpen(false)} 
            availableTags={tags} 
            workflows={[]} 
            assistants={assistants} 
            onRenameTag={renameTag} 
            onDeleteTag={deleteTag} 
            onCreateTag={handleTagCreate} 
        />

        {/* Toast */}
        {toast && (
            <div className="absolute left-6 bottom-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border ${toast.type === 'success' ? 'bg-white border-green-200 text-green-700' : 'bg-white border-red-200 text-red-700'}`}>
                    {toast.type === 'success' ? <CheckCircle2 size={20} className="text-green-500" /> : <AlertCircle size={20} className="text-red-500" />}
                    <span className="font-medium text-sm">{toast.msg}</span>
                    <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600"><X size={14} /></button>
                </div>
            </div>
        )}
    </div>
  );
};

export default SmartAssistants;