import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../App';
import { Assistant, ToolDefinition, ToolType, ParameterType, ToolParameter } from '../types';
import { TagInput } from '../components/TagInput';
import { TagManagementModal } from '../components/TagManagementModal';
import { generateToolFromDescription } from '../services/geminiService';
import { GoogleGenAI } from "@google/genai";
import { 
  ArrowLeft, 
  Plus, 
  Edit2, 
  Save, 
  ChevronDown, 
  Settings, 
  Bell, 
  MessageSquare, 
  Send, 
  Paperclip, 
  Mic, 
  Upload, 
  MoreVertical, 
  Bot, 
  Sliders, 
  Database,
  Wrench,
  ChevronRight,
  ChevronUp,
  Share2,
  Loader2,
  Wand2,
  X,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Trash2,
  AlertCircle,
  Mail,
  User,
  StopCircle,
  Search,
  Globe,
  Cpu,
  Check,
  Sparkles
} from 'lucide-react';

// Mock Users for Share Feature
const MOCK_AVAILABLE_USERS = [
    { id: 'u3', name: '张三', email: 'zhangsan@example.com' },
    { id: 'u4', name: '王五', email: 'wangwu@example.com' },
    { id: 'u5', name: '赵六', email: 'zhaoliu@example.com' }
];

interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    content: string;
}

// --- Helper Component for Tool Selector Row ---
interface ToolSelectorRowProps {
    label: string;
    tools: ToolDefinition[];
    selectedIds: string[];
    onToggle: (id: string) => void;
    onAdd?: () => void;
    isReadOnly: boolean;
}

const ToolSelectorRow: React.FC<ToolSelectorRowProps> = ({ label, tools, selectedIds, onToggle, onAdd, isReadOnly }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedToolsInThisCategory = tools.filter(t => selectedIds.includes(t.id));
    const displayText = selectedToolsInThisCategory.length > 0 
        ? selectedToolsInThisCategory.map(t => t.name).join(', ') 
        : '请选择...';

    return (
        <div className="flex items-center gap-4 mb-4">
            <label className="text-sm font-bold text-slate-500 w-20 flex-shrink-0 text-right">{label}</label>
            <div className="flex-1 relative min-w-0" ref={containerRef}>
                <div 
                    onClick={() => !isReadOnly && setIsOpen(!isOpen)}
                    className={`w-full h-10 px-3 flex items-center justify-between border rounded-lg bg-white cursor-pointer transition-all ${isOpen ? 'ring-2 ring-blue-100 border-blue-400' : 'border-slate-300 hover:border-slate-400'} ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                    <span className={`text-sm truncate block w-full text-left ${selectedToolsInThisCategory.length > 0 ? 'text-slate-800' : 'text-slate-400'}`} title={displayText}>
                        {displayText}
                    </span>
                    <ChevronDown size={16} className="text-slate-400 flex-shrink-0 ml-2" />
                </div>

                {isOpen && !isReadOnly && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                        {tools.length === 0 ? (
                            <div className="p-3 text-xs text-slate-400 text-center">暂无可用工具</div>
                        ) : (
                            tools.map(tool => (
                                <div 
                                    key={tool.id}
                                    onClick={() => onToggle(tool.id)}
                                    className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                                >
                                    <span className="truncate">{tool.name} <span className="text-slate-400 text-xs ml-1">({tool.version})</span></span>
                                    {selectedIds.includes(tool.id) && <Check size={14} className="text-blue-600" />}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
            {onAdd && !isReadOnly && (
                <button 
                    onClick={onAdd}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                    title="注册新工具"
                >
                    <Plus size={20} />
                </button>
            )}
            {onAdd && isReadOnly && <div className="w-9 flex-shrink-0" />} {/* Spacer for alignment in read-only mode */}
        </div>
    );
};

const AssistantEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { assistants, setAssistants, tools, addTool, tags, addTag, deleteTag, renameTag, setIsUnsavedChanges, isUnsavedChanges, registerSaveHandler, requestNavigation } = useAppContext();
  
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  
  // Config States
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('DeepSeek V3');
  const [contextWindow, setContextWindow] = useState(5);
  const [maxOutput, setMaxOutput] = useState(5);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  
  // UI States
  const [activeSections, setActiveSections] = useState({
      model: true,
      knowledge: true,
      capabilities: true
  });

  // Tag & Description States
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isDescModalOpen, setIsDescModalOpen] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [isAiPolishing, setIsAiPolishing] = useState(false);

  // --- Tool Management States ---
  const [isToolRegistryOpen, setIsToolRegistryOpen] = useState(false);
  
  // New Tool Form State
  const [newToolPrompt, setNewToolPrompt] = useState('');
  const [isGeneratingTool, setIsGeneratingTool] = useState(false);
  const [newToolData, setNewToolData] = useState<Partial<ToolDefinition>>({
      type: ToolType.API,
      method: 'GET',
      category: '通用',
      parameters: []
  });
  const [toolParameters, setToolParameters] = useState<ToolParameter[]>([]);

  // --- New Feature States (Matching WorkflowEditor) ---
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);
  const [isSaveVersionModalOpen, setIsSaveVersionModalOpen] = useState(false);
  const [nextVersionInput, setNextVersionInput] = useState('');
  const [switchVersionModal, setSwitchVersionModal] = useState<{ isOpen: boolean, newId: string, newVersion: string }>({ isOpen: false, newId: '', newVersion: '' });
  
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishName, setPublishName] = useState('');
  const [publishDesc, setPublishDesc] = useState('');
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [notExecutedWarning, setNotExecutedWarning] = useState(false); // New warning for publish
  
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [executions, setExecutions] = useState<{id: string, time: string, message: string, type: 'INFO' | 'SUCCESS' | 'ERROR'}[]>([]);
  const messageButtonRef = useRef<HTMLButtonElement>(null);
  const messagePanelRef = useRef<HTMLDivElement>(null);

  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Share States
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

  // --- Preview Chat States ---
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Derived State
  const isReadOnly = useMemo(() => assistant?.status === 'PUBLISHED', [assistant]);

  const relatedVersions = useMemo(() => {
      if (!assistant) return [];
      return assistants
          .filter(a => a.name === assistant.name)
          .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
  }, [assistant, assistants]);

  // Helper: Toast
  const showToast = (message: string, type: 'success' | 'error') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
  };

  // Helper: Check Read Only
  const checkReadOnly = useCallback(() => {
      if (isReadOnly) {
          showToast("已发布的助手无法修改，请先下架或另存为新版本。", 'error');
          return true;
      }
      return false;
  }, [isReadOnly]);

  // Initialize
  useEffect(() => {
    const found = assistants.find(a => a.id === id);
    if (found) {
      setAssistant(found);
      setDescDraft(found.description);
      
      // Load extended data if available (casting as any to bypass strict type for this demo feature)
      const data = (found as any).data || {};
      setSystemPrompt(data.systemPrompt || '');
      setSelectedModel(found.modelId || 'DeepSeek V3'); // Map modelId or default
      setContextWindow(data.contextWindow || 5);
      setMaxOutput(data.maxOutput || 5);
      setSelectedToolIds(data.toolIds || []);

      // Add initial log
      if (executions.length === 0) {
          setExecutions([{ id: 'init', time: new Date().toLocaleTimeString(), message: '编辑器已就绪', type: 'INFO' }]);
      }
    } else {
        // Fallback for new creation flow
        const newAssistant = {
            id: id || 'new',
            name: '未命名助手',
            description: '',
            status: 'DRAFT' as const,
            version: '1.0',
            owner: 'User',
            modelId: 'DeepSeek V3',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            avatar: '🤖',
            tags: [],
            lastRunStatus: 'NONE' as const
        };
        setAssistant(newAssistant);
        setDescDraft(newAssistant.description);
    }
  }, [id, assistants]);

  // Handle Version Switch Toast
  useEffect(() => {
      if (location.state?.versionSwitched && location.state?.version) {
          showToast(`已成功切换至版本 v${location.state.version}`, 'success');
          window.history.replaceState({}, '');
      }
  }, [location.state]);

  // Scroll Chat to Bottom
  useEffect(() => {
      if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
  }, [chatMessages, isChatLoading]);

  // Click Outside for Popovers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.version-trigger')) { setVersionDropdownOpen(false); }
      if (isMessageOpen && messagePanelRef.current && !messagePanelRef.current.contains(target as Node) && !messageButtonRef.current?.contains(target as Node)) {
          setIsMessageOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMessageOpen]);

  const toggleSection = (section: keyof typeof activeSections) => {
      setActiveSections(prev => ({...prev, [section]: !prev[section]}));
  };

  // --- Tool Handlers ---

  const handleToolToggle = (toolId: string) => {
      if (isReadOnly) return;
      setSelectedToolIds(prev => 
          prev.includes(toolId) ? prev.filter(id => id !== toolId) : [...prev, toolId]
      );
      if (!isUnsavedChanges) setIsUnsavedChanges(true);
  };

  const handleOpenToolRegistry = (type: ToolType) => {
      if (checkReadOnly()) return;
      setNewToolData(prev => ({ ...prev, type: type }));
      setToolParameters([]);
      setNewToolPrompt('');
      setIsToolRegistryOpen(true);
  };

  const handleMagicToolFill = async () => {
      if (!newToolPrompt.trim()) return;
      setIsGeneratingTool(true);
      try {
          const generated = await generateToolFromDescription(newToolPrompt);
          if (generated) {
              setNewToolData(prev => ({ ...prev, ...generated }));
              if (generated.parameters) {
                  setToolParameters(generated.parameters as ToolParameter[]);
              }
          }
      } catch (e) {
          console.error(e);
          showToast('生成失败，请检查配置', 'error');
      } finally {
          setIsGeneratingTool(false);
      }
  };

  // Tool Parameter Management Helpers
  const getParameterTypeLabel = (type: string) => {
    switch(type) {
      case 'STRING': return '字符串 (String)';
      case 'NUMBER': return '数字 (Number)';
      case 'BOOLEAN': return '布尔值 (Boolean)';
      case 'JSON': return 'JSON对象';
      case 'SELECT': return '选择框 (Select)';
      default: return type;
    }
  };

  const addParameter = () => {
    setToolParameters([
      ...toolParameters,
      {
        id: Math.random().toString(36).substr(2, 9),
        key: '',
        label: '',
        type: ParameterType.STRING,
        required: false
      }
    ]);
  };

  const updateParameter = (id: string, field: keyof ToolParameter, value: any) => {
    setToolParameters(toolParameters.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removeParameter = (id: string) => {
    setToolParameters(toolParameters.filter(p => p.id !== id));
  };

  const handleRegisterTool = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newToolData.name || !newToolData.baseUrl) return;

      const newTool: ToolDefinition = {
          id: Math.random().toString(36).substr(2, 9),
          name: newToolData.name,
          description: newToolData.description || '',
          method: newToolData.type === ToolType.MCP ? 'MCP' : (newToolData.method as any || 'GET'),
          baseUrl: newToolData.baseUrl,
          endpoint: newToolData.endpoint || '',
          category: newToolData.category || '自定义',
          version: '1.0.0',
          parameters: toolParameters,
          createdBy: 'User',
          type: newToolData.type || ToolType.API,
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
      };

      addTool(newTool);
      setSelectedToolIds(prev => [...prev, newTool.id]);
      showToast('工具已注册并添加', 'success');
      setIsToolRegistryOpen(false);
      
      // Reset form
      setNewToolData({ type: ToolType.API, method: 'GET', category: '通用', parameters: [] });
      setToolParameters([]);
      setNewToolPrompt('');
      
      if (!isUnsavedChanges) setIsUnsavedChanges(true);
  };

  // Group tools for display based on screenshot requirement
  const classifiedTools = useMemo(() => {
      const builtin = tools.filter(t => t.createdBy === 'System');
      const mcp = tools.filter(t => t.type === ToolType.MCP && t.createdBy !== 'System');
      const api = tools.filter(t => t.type === ToolType.API && t.createdBy !== 'System');
      return { builtin, mcp, api };
  }, [tools]);

  // --- Chat Handlers ---

  const handleSendMessage = async () => {
      if (!inputMessage.trim()) return;
      
      const userContent = inputMessage;
      const newUserMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: userContent };
      setChatMessages(prev => [...prev, newUserMsg]);
      setInputMessage('');
      setIsChatLoading(true);

      try {
          // Use GoogleGenAI to simulate or actually run the assistant logic
          // Note: Using a fixed model for demo as requested by guidelines, but ideally uses `selectedModel` mapping
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: userContent,
              config: {
                  systemInstruction: systemPrompt || "You are a helpful assistant.",
                  maxOutputTokens: maxOutput * 100, // Heuristic: 1 slider unit ~ 100 tokens
              }
          });

          const text = response.text || "无法生成回复。";
          setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', content: text }]);
          
          // Log success
          setExecutions(prev => [{ 
              id: Date.now().toString(), 
              time: new Date().toLocaleTimeString(), 
              message: `对话交互成功`, 
              type: 'SUCCESS' 
          }, ...prev]);

          // Update lastRunStatus
          if (assistant) {
              const updated = { ...assistant, lastRunStatus: 'SUCCESS' as const };
              setAssistant(updated);
              setAssistants(prev => prev.map(a => a.id === assistant.id ? updated : a));
          }

      } catch (error) {
          console.error("Chat generation error:", error);
          setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', content: "错误：无法连接到模型服务。" }]);
          setExecutions(prev => [{ 
              id: Date.now().toString(), 
              time: new Date().toLocaleTimeString(), 
              message: `对话请求失败`, 
              type: 'ERROR' 
          }, ...prev]);
      } finally {
          setIsChatLoading(false);
      }
  };

  const handleFileUpload = () => {
      const fileMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: "[文件 uploaded_doc.pdf]" };
      setChatMessages(prev => [...prev, fileMsg]);
      setIsChatLoading(true);
      
      // Mock processing
      setTimeout(() => {
          setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', content: "已收到文件 `uploaded_doc.pdf`。我已解析其内容，您可以针对文档提问。" }]);
          setIsChatLoading(false);
          setExecutions(prev => [{ 
              id: Date.now().toString(), 
              time: new Date().toLocaleTimeString(), 
              message: `文件解析成功`, 
              type: 'SUCCESS' 
          }, ...prev]);
      }, 1500);
  };

  const handleVoiceInput = () => {
      if (!isRecording) {
          setIsRecording(true);
          setTimeout(() => {
              setIsRecording(false);
              setInputMessage(prev => prev + "帮我优化这段代码的性能...");
          }, 2000);
      } else {
          setIsRecording(false);
      }
  };

  // --- Handlers for Save / Version / Publish ---

  const handleSave = useCallback(() => {
      if (checkReadOnly()) return;
      if (assistant) {
          const updated: Assistant = { 
              ...assistant, 
              description: descDraft, 
              tags: assistant.tags,
              modelId: selectedModel,
              updatedAt: new Date().toISOString(),
              // Store config in a flexible property (casting to allow for demo)
              ...({ data: {
                  systemPrompt,
                  contextWindow,
                  maxOutput,
                  toolIds: selectedToolIds
              }} as any)
          };
          setAssistant(updated);
          setAssistants(prev => prev.map(a => a.id === assistant.id ? updated : a));
          setIsUnsavedChanges(false);
          showToast('保存成功', 'success');
      }
  }, [assistant, descDraft, checkReadOnly, setAssistants, setIsUnsavedChanges, systemPrompt, selectedModel, contextWindow, maxOutput, selectedToolIds]);

  // Register global save handler
  useEffect(() => {
      registerSaveHandler(handleSave);
      return () => registerSaveHandler(() => {});
  }, [handleSave, registerSaveHandler]);

  const openSaveVersionModal = () => {
      setNextVersionInput('');
      setIsSaveVersionModalOpen(true);
  };

  const confirmSaveVersion = () => {
      if (!assistant || !nextVersionInput.trim()) return;
      
      const newId = Math.random().toString(36).substr(2, 9);
      const newAs: Assistant = {
          ...assistant,
          id: newId,
          version: nextVersionInput.trim(),
          status: 'DRAFT',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          description: descDraft,
          modelId: selectedModel,
          lastRunStatus: 'NONE', // Reset run status for new version
          ...({ data: {
              systemPrompt,
              contextWindow,
              maxOutput,
              toolIds: selectedToolIds
          }} as any)
      };
      
      setAssistants(prev => [newAs, ...prev]);
      setIsSaveVersionModalOpen(false);
      setSwitchVersionModal({ isOpen: true, newId, newVersion: newAs.version });
  };

  const handlePublishClick = () => {
      if (isReadOnly) {
          // Unpublish
          if (assistant) {
               const updatedAs: Assistant = { ...assistant, status: 'DRAFT', updatedAt: new Date().toISOString() };
               setAssistant(updatedAs);
               setAssistants(prev => prev.map(a => a.id === assistant.id ? updatedAs : a));
               showToast('助手已下架，转为草稿状态', 'success');
          }
          return;
      }

      if (isUnsavedChanges) {
          setShowUnsavedWarning(true);
          return;
      }

      // Check if executed successfully
      const hasSuccessRun = assistant?.lastRunStatus === 'SUCCESS' || executions.some(ex => ex.type === 'SUCCESS');
      if (!hasSuccessRun && chatMessages.length === 0) { // Check chatMessages as fallback if logs cleared
          setNotExecutedWarning(true);
          return;
      }

      setPublishName(assistant?.name || '');
      setPublishDesc(assistant?.description || '');
      setIsPublishModalOpen(true);
  };

  const confirmPublish = () => {
      if (!assistant) return;
      const updatedAs: Assistant = { 
          ...assistant, 
          name: publishName, 
          description: publishDesc, 
          status: 'PUBLISHED',
          updatedAt: new Date().toISOString()
      };
      setAssistant(updatedAs);
      setAssistants(prev => prev.map(a => a.id === assistant.id ? updatedAs : a));
      setIsPublishModalOpen(false);
      showToast('发布成功！', 'success');
      
      // Add log
      setExecutions(prev => [{ id: Date.now().toString(), time: new Date().toLocaleTimeString(), message: `版本 v${updatedAs.version} 已发布`, type: 'SUCCESS' }, ...prev]);
  };

  // --- Handlers for Tags & Description ---

  const handleUpdateTags = (newTags: string[]) => {
      if (checkReadOnly()) return;
      if (assistant) {
          const updated = { ...assistant, tags: newTags, updatedAt: new Date().toISOString() };
          setAssistant(updated);
          setAssistants(prev => prev.map(a => a.id === assistant.id ? updated : a));
          setIsUnsavedChanges(true);
      }
  };

  const handleTagCreate = (tagName: string) => {
      if (checkReadOnly()) return false;
      addTag(tagName);
      return true; 
  };

  const handleAiPolish = async () => {
      if (checkReadOnly()) return;
      if (!assistant) return;
      setIsAiPolishing(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `Rewrite description for assistant "${assistant.name}": ${descDraft}. Keep it concise and professional.`;
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
      if (assistant) {
          const updated = { ...assistant, description: descDraft, updatedAt: new Date().toISOString() };
          setAssistant(updated);
          setAssistants(prev => prev.map(a => a.id === assistant.id ? updated : a));
          setIsDescModalOpen(false);
          setIsUnsavedChanges(true);
      }
  };

  // --- Share Handlers ---
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
          setSharedUsers(prev => [...prev, { ...user, role: 'USER' }]);
          setUserToAdd('');
          showToast(`已添加用户 ${user.name}`, 'success');
      }
  };

  const handleInviteUser = () => {
      if (!inviteEmail.trim()) {
          showToast('请输入有效的邮箱', 'error');
          return;
      }
      const newUser = { id: `u-${Date.now()}`, name: inviteEmail.split('@')[0], email: inviteEmail, role: inviteRole };
      setSharedUsers(prev => [...prev, newUser]);
      showToast(`已邀请 ${inviteEmail}`, 'success');
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

  const handleBackClick = () => {
      requestNavigation('/studio?tab=assistant');
  };

  const handleConfigChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
      if (isReadOnly) return;
      setter(value);
      if (!isUnsavedChanges) setIsUnsavedChanges(true);
  };

  if (!assistant) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans text-slate-900 relative">
        {/* --- Header --- */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-40 shrink-0">
            <div className="flex items-center gap-4">
                <button 
                    onClick={handleBackClick} 
                    className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-lg">
                        {assistant.avatar || <Bot size={20} />}
                    </div>
                    <h1 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        {assistant.name}
                        {isReadOnly && <span title="已发布 - 只读模式" className="flex items-center"><Lock size={14} className="text-orange-500" /></span>}
                    </h1>
                    
                    {/* Tag Input Component */}
                    <TagInput 
                        selectedTags={assistant.tags || []}
                        onChange={handleUpdateTags}
                        availableTags={tags}
                        onManageTags={() => setIsTagManagerOpen(true)}
                        onCreateTag={handleTagCreate}
                        variant="header"
                    />

                    <button 
                        onClick={() => { setDescDraft(assistant.description); setIsDescModalOpen(true); }}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        title="编辑描述"
                    >
                        <Edit2 size={12} />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2">
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
                                            navigate(`/assistant/${ver.id}`, { state: { versionSwitched: true, version: ver.version } }); 
                                        }} 
                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-start gap-3 transition-colors group"
                                    >
                                        <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${ver.id === assistant.id ? 'border-blue-500' : 'border-slate-300'}`}>
                                            {ver.id === assistant.id && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-slate-700 flex items-center gap-2">v{ver.version}{ver.status === 'PUBLISHED' && <span className="text-[9px] bg-green-100 text-green-600 px-1 rounded border border-green-200">发布版</span>}</div>
                                            <div className="text-[10px] text-slate-400">{new Date(ver.createdAt).toLocaleTimeString([], {year: 'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit'})}</div>
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

                {/* Message / Notification Button Popover */}
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
                                        {executions.map((exec, idx) => (
                                            <div key={idx} className="p-2.5 bg-white border border-slate-100 rounded-lg shadow-sm hover:border-blue-200 transition-colors cursor-pointer group">
                                                <div className="flex items-start gap-2">
                                                    <div className={`mt-0.5 ${exec.type === 'SUCCESS' ? 'text-green-500' : exec.type === 'ERROR' ? 'text-red-500' : 'text-blue-500'}`}>
                                                        {exec.type === 'SUCCESS' ? <CheckCircle2 size={14} /> : exec.type === 'ERROR' ? <AlertCircle size={14} /> : <Info size={14} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <span className="text-xs font-bold text-slate-700">{exec.message}</span>
                                                            <span className="text-[10px] text-slate-400">{exec.time}</span>
                                                        </div>
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
        </header>

        {/* --- Main Content --- */}
        <div className="flex-1 flex overflow-hidden">
            
            {/* Left Column: Assistant Persona */}
            <div className="w-1/3 min-w-[320px] max-w-[480px] bg-white border-r border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-800 text-base">助手人设</h2>
                </div>
                <div className="flex-1 p-0 overflow-y-auto">
                    <textarea 
                        className="w-full h-full p-6 resize-none focus:outline-none text-sm leading-relaxed placeholder:text-slate-300 text-slate-700"
                        placeholder={`请输入：
##角色
1、用一句话描述助手概述和职责
##目标技能
2、为实现目标，助手需要具备的技能
##工作流
3、描述角色工作流程的步骤
##输出格式
4、如果对助手角色输出格式有求、可强调格式输出
##限制
5、描述角色在互动过程中需要限制的地方`}
                        value={systemPrompt}
                        onChange={(e) => handleConfigChange(setSystemPrompt, e.target.value)}
                        disabled={isReadOnly}
                    />
                </div>
            </div>

            {/* Middle Column: Smart Orchestration */}
            <div className="w-1/3 min-w-[320px] max-w-[480px] bg-slate-50 border-r border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-200">
                    <h2 className="font-bold text-slate-800 text-base">智能编排</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    
                    {/* Model Settings */}
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                        <button 
                           onClick={() => toggleSection('model')}
                           className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                            <span className="font-bold text-sm text-slate-700 flex items-center gap-2"><Bot size={16}/> 模型设置</span>
                            {activeSections.model ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
                        </button>
                        
                        {activeSections.model && (
                            <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-1">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">模型</label>
                                    <select 
                                        value={selectedModel}
                                        onChange={(e) => handleConfigChange(setSelectedModel, e.target.value)}
                                        disabled={isReadOnly}
                                        className="w-full text-sm p-2 border border-slate-300 rounded-md outline-none focus:border-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                                    >
                                        <option>DeepSeek V3</option>
                                        <option>GPT-4o</option>
                                        <option>Claude 3.5 Sonnet</option>
                                        <option>Llama 3 70B</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">输入及输出设置</label>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-600 min-w-[80px]">携带上下文轮数</span>
                                            <input 
                                                type="range" min="1" max="20" 
                                                value={contextWindow} 
                                                onChange={(e) => handleConfigChange(setContextWindow, parseInt(e.target.value))}
                                                disabled={isReadOnly}
                                                className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
                                            />
                                            <div className="flex border border-slate-300 rounded bg-white">
                                                <input className="w-8 text-center text-xs p-1 outline-none disabled:bg-slate-50" value={contextWindow} readOnly />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-600 min-w-[80px]">最大回复长度</span>
                                            <input 
                                                type="range" min="1" max="10" 
                                                value={maxOutput} 
                                                onChange={(e) => handleConfigChange(setMaxOutput, parseInt(e.target.value))}
                                                disabled={isReadOnly}
                                                className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
                                            />
                                            <div className="flex border border-slate-300 rounded bg-white">
                                                <input className="w-8 text-center text-xs p-1 outline-none disabled:bg-slate-50" value={maxOutput} readOnly />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Knowledge Base */}
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                        <button 
                           onClick={() => toggleSection('knowledge')}
                           className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                            <span className="font-bold text-sm text-slate-700 flex items-center gap-2"><Database size={16}/> 知识库配置</span>
                            {activeSections.knowledge ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
                        </button>
                        
                        {activeSections.knowledge && (
                            <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1">
                                <label className="text-xs font-bold text-slate-500 mb-1.5 block">知识库</label>
                                <select disabled={isReadOnly} className="w-full text-sm p-2 border border-slate-300 rounded-md outline-none focus:border-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-500">
                                    <option>个人知识库</option>
                                    <option>团队共享文档</option>
                                    <option>产品手册 v2.0</option>
                                    <option>无</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Tools / Capabilities */}
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                        <button 
                           onClick={() => toggleSection('capabilities')}
                           className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                            <span className="font-bold text-sm text-slate-700 flex items-center gap-2"><Wrench size={16}/> 能力</span>
                            {activeSections.capabilities ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
                        </button>
                        
                        {activeSections.capabilities && (
                            <div className="px-4 pb-4 space-y-2 animate-in fade-in slide-in-from-top-1">
                                <div className="mb-1.5">
                                    <label className="text-xs font-bold text-slate-500 block">工具</label>
                                </div>
                                <div className="space-y-4">
                                    {/* Built-in Tools */}
                                    <ToolSelectorRow 
                                        label="内置工具"
                                        tools={classifiedTools.builtin}
                                        selectedIds={selectedToolIds}
                                        onToggle={handleToolToggle}
                                        isReadOnly={isReadOnly}
                                    />
                                    
                                    {/* MCP Tools */}
                                    <ToolSelectorRow 
                                        label="MCP工具"
                                        tools={classifiedTools.mcp}
                                        selectedIds={selectedToolIds}
                                        onToggle={handleToolToggle}
                                        onAdd={() => handleOpenToolRegistry(ToolType.MCP)}
                                        isReadOnly={isReadOnly}
                                    />

                                    {/* API Tools */}
                                    <ToolSelectorRow 
                                        label="API工具"
                                        tools={classifiedTools.api}
                                        selectedIds={selectedToolIds}
                                        onToggle={handleToolToggle}
                                        onAdd={() => handleOpenToolRegistry(ToolType.API)}
                                        isReadOnly={isReadOnly}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Right Column: Preview Debug */}
            <div className="flex-1 flex flex-col bg-white">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="font-bold text-slate-800 text-base">预览调试</h2>
                </div>
                
                {/* Chat Container */}
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/30 relative">
                    {chatMessages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center opacity-50">
                             <Bot size={48} className="mb-4 text-slate-300" />
                             <h3 className="text-base font-bold text-slate-800 mb-2">测试你的智能助手</h3>
                             <p className="text-xs text-slate-500 max-w-[200px]">配置好人设与模型后，在这里发送消息进行实时对话测试。</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatScrollRef}>
                            {chatMessages.map(msg => (
                                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'model' && (
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-1">
                                            <Bot size={16} />
                                        </div>
                                    )}
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                                        msg.role === 'user' 
                                        ? 'bg-slate-900 text-white rounded-br-none' 
                                        : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                                    }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isChatLoading && (
                                <div className="flex gap-3 justify-start">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-1">
                                        <Bot size={16} />
                                    </div>
                                    <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-slate-100">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-2 flex items-center gap-2 px-4 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all">
                         <input 
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            disabled={isChatLoading}
                            className="flex-1 py-2 text-sm outline-none placeholder:text-slate-400 text-slate-700 bg-transparent disabled:bg-transparent"
                            placeholder="发送消息..."
                         />
                         <div className="flex items-center gap-1 text-slate-400 border-l border-slate-200 pl-2">
                            <button onClick={handleFileUpload} disabled={isChatLoading} className="p-1.5 hover:text-slate-600 hover:bg-slate-50 rounded transition-colors disabled:opacity-50"><Paperclip size={14} /></button>
                            <button onClick={handleVoiceInput} disabled={isChatLoading} className={`p-1.5 rounded transition-colors disabled:opacity-50 ${isRecording ? 'text-red-500 bg-red-50' : 'hover:text-slate-600 hover:bg-slate-50'}`}>
                                {isRecording ? <StopCircle size={14} /> : <Mic size={14} />}
                            </button>
                            <button onClick={handleSendMessage} disabled={!inputMessage.trim() || isChatLoading} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg ml-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><Upload size={14} /></button>
                         </div>
                    </div>
                </div>
            </div>

        </div>

        {/* --- Modals --- */}

        {/* Quick Tool Registration Modal */}
        {isToolRegistryOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Plus size={18} className="text-blue-600"/> 注册新工具
                        </h3>
                        <button onClick={() => setIsToolRegistryOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Smart Fill Section */}
                        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-blue-100 p-6 rounded-xl">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-white rounded-lg shadow-sm text-blue-600">
                                    <Sparkles size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-800 mb-2">Gemini AI 智能填充</h3>
                                    <p className="text-sm text-slate-600 mb-4">
                                        粘贴 CURL 命令或描述 API（例如：“通过 POST 请求发送文本到 Slack Webhook”），我们将自动填充表单。
                                    </p>
                                    <div className="relative">
                                        <textarea
                                            value={newToolPrompt}
                                            onChange={(e) => setNewToolPrompt(e.target.value)}
                                            placeholder="curl -X POST https://api.example.com/data -d 'value=123' ..."
                                            className="w-full p-4 pr-32 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] text-sm font-mono bg-white"
                                        />
                                        <button
                                            onClick={handleMagicToolFill}
                                            disabled={isGeneratingTool || !newToolPrompt}
                                            className="absolute bottom-3 right-3 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all"
                                        >
                                            {isGeneratingTool ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
                                            {isGeneratingTool ? '生成中' : '生成配置'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">类型</label>
                                    <div className="flex gap-2">
                                        <button 
                                            type="button"
                                            onClick={() => setNewToolData({...newToolData, type: ToolType.API})}
                                            className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-colors flex items-center justify-center gap-2 ${newToolData.type === ToolType.API ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            <Globe size={16}/> HTTP API
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setNewToolData({...newToolData, type: ToolType.MCP})}
                                            className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-colors flex items-center justify-center gap-2 ${newToolData.type === ToolType.MCP ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            <Cpu size={16}/> MCP 工具
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">分类</label>
                                    <input 
                                        value={newToolData.category}
                                        onChange={(e) => setNewToolData({...newToolData, category: e.target.value})}
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        placeholder="例如：生产力"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">工具名称 (PascalCase)</label>
                                    <input 
                                        value={newToolData.name || ''}
                                        onChange={(e) => setNewToolData({...newToolData, name: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        placeholder="MyNewTool"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">描述</label>
                                    <input 
                                        value={newToolData.description || ''}
                                        onChange={(e) => setNewToolData({...newToolData, description: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        placeholder="简短描述工具功能"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">{newToolData.type === ToolType.API ? 'Base URL' : '连接 Command/URL'}</label>
                                <input 
                                    value={newToolData.baseUrl || ''}
                                    onChange={(e) => setNewToolData({...newToolData, baseUrl: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                                    placeholder={newToolData.type === ToolType.API ? "https://api.example.com" : "stdio://cmd or sse://url"}
                                />
                            </div>

                            <div className="grid grid-cols-4 gap-4">
                                {newToolData.type === ToolType.API && (
                                    <div className="col-span-1 space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Method</label>
                                        <select 
                                            value={newToolData.method}
                                            onChange={(e) => setNewToolData({...newToolData, method: e.target.value as any})}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                        >
                                            <option>GET</option>
                                            <option>POST</option>
                                            <option>PUT</option>
                                            <option>DELETE</option>
                                            <option>PATCH</option>
                                        </select>
                                    </div>
                                )}
                                <div className={`${newToolData.type === ToolType.API ? 'col-span-3' : 'col-span-4'} space-y-2`}>
                                    <label className="text-sm font-medium text-slate-700">{newToolData.type === ToolType.API ? 'Endpoint' : 'Tool Name'}</label>
                                    <input 
                                        value={newToolData.endpoint || ''}
                                        onChange={(e) => setNewToolData({...newToolData, endpoint: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                                        placeholder={newToolData.type === ToolType.API ? "/v1/resource" : "read_file"}
                                    />
                                </div>
                            </div>
                            
                            {/* Parameters Section */}
                            <div className="p-6 border-t border-slate-200 bg-slate-50/50 rounded-xl">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <Sliders size={16} /> 参数配置
                                    </h3>
                                    <button 
                                        type="button"
                                        onClick={addParameter}
                                        className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1"
                                    >
                                        <Plus size={16} /> 添加参数
                                    </button>
                                </div>

                                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                    {toolParameters.length === 0 && (
                                        <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm">
                                            暂无参数。请手动添加或使用智能填充。
                                        </div>
                                    )}
                                    {toolParameters.map((param, index) => (
                                        <div key={param.id} className="flex gap-3 items-start p-3 bg-white border border-slate-200 rounded-lg shadow-sm group">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500 mt-2">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 grid grid-cols-4 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Key</label>
                                                    <input 
                                                        value={param.key}
                                                        onChange={(e) => updateParameter(param.id, 'key', e.target.value)}
                                                        placeholder="key_name"
                                                        className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded focus:border-blue-500 outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Label</label>
                                                    <input 
                                                        value={param.label}
                                                        onChange={(e) => updateParameter(param.id, 'label', e.target.value)}
                                                        placeholder="UI Label"
                                                        className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded focus:border-blue-500 outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Type</label>
                                                    <select 
                                                        value={param.type}
                                                        onChange={(e) => updateParameter(param.id, 'type', e.target.value)}
                                                        className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded focus:border-blue-500 outline-none bg-white"
                                                    >
                                                        {Object.values(ParameterType).map(t => <option key={t} value={t}>{getParameterTypeLabel(t)}</option>)}
                                                    </select>
                                                </div>
                                                <div className="flex items-center gap-3 pt-6">
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={param.required}
                                                            onChange={(e) => updateParameter(param.id, 'required', e.target.checked)}
                                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                        />
                                                        <span className="text-xs text-slate-600">必填</span>
                                                    </label>
                                                    <button 
                                                        type="button"
                                                        onClick={() => removeParameter(param.id)}
                                                        className="ml-auto text-slate-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
                        <button onClick={() => setIsToolRegistryOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">取消</button>
                        <button onClick={handleRegisterTool} className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors shadow-sm">确认注册</button>
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
                                    navigate(`/assistant/${switchVersionModal.newId}`);
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

        {/* Publish Confirmation Modal */}
        {isPublishModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                     <h3 className="text-lg font-bold text-slate-800">
                        确认发布助手
                     </h3>
                     <button onClick={() => setIsPublishModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
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
                      <button onClick={() => setIsPublishModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors">取消</button>
                      <button 
                        onClick={confirmPublish}
                        disabled={!publishName.trim()}
                        className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                         确认发布
                      </button>
                  </div>
               </div>
            </div>
        )}

        {/* Not Executed Warning Modal (NEW) */}
        {notExecutedWarning && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setNotExecutedWarning(false)}>
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                    <div className="p-6 text-center">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">无法发布</h3>
                        <p className="text-sm text-slate-500 mb-6 px-4 leading-relaxed">
                            请在右侧预览区域至少进行一次成功的对话调试（发送消息并收到回复），确保助手配置正确后再发布。
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
                            请先保存当前助手的修改，然后再进行发布操作。
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

        {/* Edit Description Modal */}
        {isDescModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                        <h3 className="text-lg font-bold text-slate-800">描述</h3>
                        <button onClick={handleAiPolish} disabled={isAiPolishing || isReadOnly} className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-2 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50">
                            {isAiPolishing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} AI 润色
                        </button>
                    </div>
                    <div className="p-6 bg-slate-50">
                        <textarea disabled={isReadOnly} value={descDraft} onChange={(e) => setDescDraft(e.target.value)} className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white disabled:bg-slate-100" placeholder="填写简短的助手描述..." />
                    </div>
                    <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
                        <button onClick={() => setIsDescModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">取消</button>
                        <button onClick={handleSaveDescription} disabled={isReadOnly} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50">保存</button>
                    </div>
                </div>
            </div>
        )}

        {/* Share Modal */}
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
                    <span className="font-medium text-sm">{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600"><X size={14} /></button>
                </div>
            </div>
        )}
    </div>
  );
};

export default AssistantEditor;