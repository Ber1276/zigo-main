import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { Workflow } from '../types';
import { 
  History, 
  Globe, 
  Paperclip, 
  Mic, 
  ArrowUp, 
  Bot, 
  User, 
  Plus, 
  MessageSquare, 
  X, 
  CheckCircle2, 
  Database, 
  ChevronDown, 
  CloudUpload, 
  Loader2, 
  FileText, 
  StopCircle, 
  MoreHorizontal, 
  Search, 
  Edit2, 
  Trash2, 
  MessageSquarePlus, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

// --- Types ---
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  preview: string;
  updatedAt: Date; // Used for sorting and grouping
  messages: Message[];
}

interface KnowledgeBase {
  id: string;
  name: string;
  type: 'PERSONAL' | 'TEAM';
}

// --- Mock Data ---
const MODELS = [
  { id: 'deepseek-v3', name: 'DeepSeek V3' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'claude-3.5', name: 'Claude 3.5 Sonnet' },
  { id: 'gemini-1.5', name: 'Gemini Pro 1.5' }
];

const KNOWLEDGE_BASES: KnowledgeBase[] = [
  { id: 'kb1', name: '个人知识库 (My Docs)', type: 'PERSONAL' },
  { id: 'kb2', name: '研发团队技术文档', type: 'TEAM' },
  { id: 'kb3', name: 'Q1 产品需求说明书', type: 'TEAM' },
  { id: 'kb4', name: '2024 会议记录归档', type: 'PERSONAL' },
  { id: 'kb5', name: '竞品分析报告', type: 'TEAM' },
];

const generateDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d;
};

// Enriched Mock Data for Grouping Demo
const MOCK_SESSIONS: ChatSession[] = [
  // Last 7 Days
  { id: 'c1', title: '关于 React Hooks 的讨论', preview: 'useEffect 的依赖项数组...', updatedAt: generateDate(0), messages: [] },
  { id: 'c2', title: '周报生成', preview: '帮我总结一下本周的工作...', updatedAt: generateDate(1), messages: [] },
  { id: 'c3', title: 'SQL 优化建议', preview: '这个查询怎么优化索引...', updatedAt: generateDate(2), messages: [] },
  { id: 'c4', title: '营销文案撰写', preview: '写一篇关于春节活动的...', updatedAt: generateDate(3), messages: [] },
  { id: 'c5', title: 'Python 脚本调试', preview: 'KeyError: "data" not found...', updatedAt: generateDate(4), messages: [] },
  { id: 'c6', title: '翻译文档', preview: 'Translate this to English...', updatedAt: generateDate(5), messages: [] },
  
  // 8-15 Days
  { id: 'c7', title: '架构设计评审', preview: '微服务拆分原则...', updatedAt: generateDate(10), messages: [] },
  { id: 'c8', title: 'API 接口定义', preview: 'GET /v1/users...', updatedAt: generateDate(12), messages: [] },
  
  // 16-30 Days
  { id: 'c9', title: '年度规划草稿', preview: '2025年主要目标...', updatedAt: generateDate(20), messages: [] },
  { id: 'c10', title: '竞品分析', preview: 'Competitor A vs B...', updatedAt: generateDate(25), messages: [] },
];

const Home: React.FC = () => {
  const { setWorkflows } = useAppContext();
  const navigate = useNavigate();

  // --- State ---
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'DAILY' | 'ZIGO'>('DAILY');
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  
  // Zigo Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  // History State
  const [sessions, setSessions] = useState<ChatSession[]>(MOCK_SESSIONS);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [isSearchingHistory, setIsSearchingHistory] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  
  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean, sessionId: string | null }>({ isOpen: false, sessionId: null });

  // Toolbar States
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isWebSearch, setIsWebSearch] = useState(false);
  const [selectedKBs, setSelectedKBs] = useState<string[]>([]);
  
  // Modal/Panel States
  const [isKBModalOpen, setIsKBModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  // Interaction States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages, isTyping]);

  // Focus input on load
  useEffect(() => {
      inputRef.current?.focus();
  }, []);

  // Focus edit input when editing starts
  useEffect(() => {
      if (editingSessionId && editInputRef.current) {
          editInputRef.current.focus();
      }
  }, [editingSessionId]);

  // --- Logic: History Grouping ---
  const groupedSessions = useMemo<Record<string, ChatSession[]>>(() => {
      const filtered = sessions.filter(s => s.title.toLowerCase().includes(historySearch.toLowerCase()));
      const now = new Date();
      const groups: Record<string, ChatSession[]> = {
          '近 7 天': [],
          '近 15 天': [],
          '近 30 天': [],
          '更早以前': []
      };

      filtered.forEach(session => {
          const diffTime = Math.abs(now.getTime() - session.updatedAt.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 7) groups['近 7 天'].push(session);
          else if (diffDays <= 15) groups['近 15 天'].push(session);
          else if (diffDays <= 30) groups['近 30 天'].push(session);
          else groups['更早以前'].push(session);
      });

      return groups;
  }, [sessions, historySearch]);

  // --- Handlers ---

  const handleSendMessage = () => {
    if (!input.trim()) return;

    if (mode === 'ZIGO') {
        const currentInput = input;
        setIsGenerating(true);
        let currentProgress = 0;
        const totalDuration = 2500; // 2.5s generation
        const intervalTime = 50;
        const step = 100 / (totalDuration / intervalTime);

        const interval = setInterval(() => {
            currentProgress += step;
            if (currentProgress >= 100) {
                currentProgress = 100;
                clearInterval(interval);
                
                // Create Workflow
                const newId = Math.random().toString(36).substr(2, 9);
                const newWorkflow: Workflow = {
                    id: newId,
                    name: currentInput.length > 20 ? currentInput.substring(0, 20) + '...' : currentInput,
                    description: `由智构模式自动生成：${currentInput}`,
                    status: 'DRAFT',
                    version: '0.0.1',
                    owner: 'User',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    nodesPreview: ['Zap', 'BrainCircuit', 'FileText'],
                    tags: ['Zigo生成']
                };
                setWorkflows(prev => [newWorkflow, ...prev]);

                // Navigate with initialPrompt state
                setTimeout(() => {
                    navigate(`/editor/${newId}?openBuild=true`, { state: { initialPrompt: currentInput } });
                }, 500);
            }
            setProgress(currentProgress);
        }, intervalTime);
        return;
    }

    // Daily Mode Logic
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setCurrentMessages(prev => [...prev, newUserMsg]);
    setInput('');
    setIsTyping(true);

    // If new session, create it in history
    if (!currentSessionId) {
        const newSessionId = Date.now().toString();
        const newSession: ChatSession = {
            id: newSessionId,
            title: input.length > 20 ? input.substring(0, 20) + '...' : input,
            preview: input,
            updatedAt: new Date(),
            messages: [newUserMsg]
        };
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSessionId);
    }

    // Simulate AI Response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `这是 **${selectedModel.name}** 的模拟回复。\n\n${isWebSearch ? '🌐 已启用联网搜索，正在检索相关信息...' : ''}\n${selectedKBs.length > 0 ? `📚 已参考 ${selectedKBs.length} 个知识库内容。` : ''}\n\n您刚才说的是：“${newUserMsg.content}”`,
        timestamp: new Date()
      };
      setCurrentMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1200);
  };

  const loadHistorySession = (session: ChatSession) => {
      setCurrentSessionId(session.id);
      setCurrentMessages(session.messages.length > 0 ? session.messages : [
          { id: 'm1', role: 'user', content: session.preview, timestamp: session.updatedAt },
          { id: 'm2', role: 'assistant', content: '这是一个历史对话的模拟回复内容...', timestamp: new Date(session.updatedAt.getTime() + 1000) }
      ]); 
      setIsHistoryVisible(false);
  };

  const startNewChat = () => {
      setCurrentSessionId(null);
      setCurrentMessages([]);
      setInput('');
      setIsHistoryVisible(false);
      inputRef.current?.focus();
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setDeleteConfirm({ isOpen: true, sessionId: id });
  };

  const confirmDelete = () => {
      if (deleteConfirm.sessionId) {
          const id = deleteConfirm.sessionId;
          setSessions(prev => prev.filter(s => s.id !== id));
          if (currentSessionId === id) {
              startNewChat();
          }
      }
      setDeleteConfirm({ isOpen: false, sessionId: null });
  };

  const startRenaming = (e: React.MouseEvent, session: ChatSession) => {
      e.stopPropagation();
      setEditingSessionId(session.id);
      setEditTitle(session.title);
  };

  const saveRename = () => {
      if (editingSessionId && editTitle.trim()) {
          setSessions(prev => prev.map(s => s.id === editingSessionId ? { ...s, title: editTitle } : s));
      }
      setEditingSessionId(null);
  };

  const toggleGroup = (groupName: string) => {
      setExpandedGroups(prev => ({
          ...prev,
          [groupName]: !prev[groupName]
      }));
  };

  const toggleKB = (id: string) => {
    setSelectedKBs(prev => 
      prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
    );
  };

  const handleFileUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
        setIsUploading(false);
        setUploadSuccess(true);
        setTimeout(() => {
            setUploadSuccess(false);
            setIsUploadModalOpen(false);
            alert("文件已成功上传并解析");
        }, 1200);
    }, 2000);
  };

  const handleVoiceInput = () => {
      if (!isRecording) {
          setIsRecording(true);
          setTimeout(() => {
              setIsRecording(false);
              setInput(prev => prev + " (语音转文字内容...)");
              inputRef.current?.focus();
          }, 2000);
      } else {
          setIsRecording(false);
      }
  };

  // --- Components ---

  const renderInputArea = (variant: 'centered' | 'bottom') => {
    if (mode === 'ZIGO' && isGenerating) {
        return (
            <div className={`w-full bg-white border border-slate-200 rounded-[24px] shadow-sm p-8 flex flex-col items-center justify-center transition-all ${variant === 'bottom' ? 'mx-auto max-w-4xl' : ''}`}>
                <div className="w-full max-w-md">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Sparkles size={16} className="text-orange-500 animate-pulse" /> 
                            正在生成工作流...
                        </span>
                        <span className="text-xs font-mono text-slate-500">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden w-full">
                        <div 
                            className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-100 ease-linear rounded-full"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-3 text-center animate-pulse">
                        正在解析需求、构建节点连接、配置参数...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full bg-white border border-slate-200 rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-3 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 relative group z-20 ${variant === 'bottom' ? 'mx-auto max-w-4xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)]' : ''}`}>
            <textarea 
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                }
            }}
            placeholder={mode === 'ZIGO' ? "描述您的需求，AI 将自动生成工作流..." : "请发送消息 (Shift+Enter 换行)"}
            className="w-full min-h-[50px] max-h-[200px] resize-none outline-none text-slate-700 placeholder:text-slate-400 text-lg bg-transparent px-3 py-2 scrollbar-hide"
            style={{ height: 'auto' }}
            disabled={isGenerating}
            />
            
            <div className="flex items-center justify-between mt-2 px-1">
            {/* Left Toolbar - Only show in DAILY mode */}
            <div className="flex items-center gap-2 relative">
                {mode === 'DAILY' && (
                    <>
                        {/* Model Selector */}
                        <div className="relative">
                            <button 
                                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                                <span>{selectedModel.name}</span>
                                <ChevronDown size={12} className="text-slate-400" />
                            </button>
                            {isModelMenuOpen && (
                                <div className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                    {MODELS.map(m => (
                                        <button 
                                            key={m.id}
                                            onClick={() => { setSelectedModel(m); setIsModelMenuOpen(false); }}
                                            className={`w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 ${selectedModel.id === m.id ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-700'}`}
                                        >
                                            {m.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Web Search */}
                        <button 
                            onClick={() => setIsWebSearch(!isWebSearch)}
                            className={`p-2 rounded-full transition-all flex items-center gap-1 ${isWebSearch ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                            title="联网搜索"
                        >
                            <Globe size={18} strokeWidth={2} />
                        </button>

                        {/* Knowledge Base */}
                        <button 
                            onClick={() => setIsKBModalOpen(true)}
                            className={`p-2 rounded-full transition-all flex items-center gap-1 relative ${selectedKBs.length > 0 ? 'bg-purple-100 text-purple-600' : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'}`}
                            title="选择知识库"
                        >
                            <Database size={18} strokeWidth={2} />
                            {selectedKBs.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 text-white text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-sm font-bold">
                                    {selectedKBs.length}
                                </span>
                            )}
                        </button>
                    </>
                )}
            </div>

            {/* Right Toolbar */}
            <div className="flex items-center gap-1">
                <button 
                    onClick={() => setIsUploadModalOpen(true)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    title="上传文件"
                >
                    <Paperclip size={18} strokeWidth={2} />
                </button>
                
                <button 
                    onClick={handleVoiceInput}
                    className={`p-2 rounded-full transition-colors ${isRecording ? 'text-red-500 bg-red-50 animate-pulse' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                    title="语音输入"
                >
                    {isRecording ? <StopCircle size={18} strokeWidth={2} /> : <Mic size={18} strokeWidth={2} />}
                </button>
                
                <button 
                    onClick={handleSendMessage}
                    disabled={!input.trim()}
                    className={`p-2 text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed ml-2 ${mode === 'ZIGO' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                >
                    {mode === 'ZIGO' ? <Sparkles size={20} strokeWidth={2} /> : <ArrowUp size={20} strokeWidth={3} />}
                </button>
            </div>
            </div>
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col relative bg-white overflow-hidden">
      
      {/* Top Right Controls - Hide in ZIGO mode for cleaner "dialog only" look as requested */}
      {mode === 'DAILY' && (
          <div className="absolute top-6 right-6 z-30 flex items-center gap-3">
            <button 
                onClick={startNewChat}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white border border-transparent rounded-xl text-sm font-medium hover:bg-slate-800 shadow-sm transition-all hover:shadow-md"
            >
                <MessageSquarePlus size={16} />
                新建对话
            </button>
            <button 
                onClick={() => setIsHistoryVisible(!isHistoryVisible)}
                className={`flex items-center gap-2 px-4 py-2 bg-white border rounded-xl text-sm font-medium transition-all shadow-sm
                    ${isHistoryVisible ? 'border-blue-500 text-blue-600 ring-2 ring-blue-100' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}
                `}
            >
            <History size={16} />
            {isHistoryVisible ? '关闭记录' : '历史记录'}
            </button>
        </div>
      )}

      {/* --- Floating History Window --- */}
      {isHistoryVisible && mode === 'DAILY' && (
          <div className="absolute top-20 right-6 w-80 bg-white shadow-2xl rounded-2xl border border-slate-200 z-40 flex flex-col max-h-[calc(100vh-120px)] animate-in fade-in slide-in-from-top-4 duration-200 origin-top-right">
              {/* Header with Search */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                  {isSearchingHistory ? (
                      <div className="flex items-center gap-2 bg-white border border-blue-500 rounded-lg px-2 py-1.5 shadow-sm animate-in fade-in zoom-in-95">
                          <Search size={14} className="text-slate-400" />
                          <input 
                            autoFocus
                            value={historySearch}
                            onChange={(e) => setHistorySearch(e.target.value)}
                            placeholder="搜索对话标题..."
                            className="flex-1 text-sm outline-none bg-transparent"
                            onBlur={() => !historySearch && setIsSearchingHistory(false)}
                          />
                          <button onClick={() => { setHistorySearch(''); setIsSearchingHistory(false); }} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                      </div>
                  ) : (
                      <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-800 text-sm">历史对话</h3>
                          <div className="flex gap-1">
                              <button onClick={() => setIsSearchingHistory(true)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><Search size={16}/></button>
                              <button onClick={() => setIsHistoryVisible(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><X size={16}/></button>
                          </div>
                      </div>
                  )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                  {Object.entries(groupedSessions).map(([groupName, groupList]: [string, ChatSession[]]) => {
                      if (groupList.length === 0) return null;
                      
                      const isExpanded = expandedGroups[groupName] || false;
                      const displayList = isExpanded || groupList.length <= 5 ? groupList : groupList.slice(0, 5);
                      
                      return (
                          <div key={groupName}>
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1 flex items-center justify-between">
                                  {groupName}
                                  <span className="bg-slate-100 text-slate-500 px-1.5 rounded-md text-[10px]">{groupList.length}</span>
                              </h4>
                              <div className="space-y-1">
                                  {displayList.map(session => (
                                      <div 
                                        key={session.id} 
                                        onClick={() => loadHistorySession(session)}
                                        className={`group relative p-2.5 rounded-xl cursor-pointer transition-all border text-left flex items-start gap-2
                                            ${currentSessionId === session.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50 border-transparent hover:border-slate-100'}
                                        `}
                                      >
                                          <MessageSquare size={16} className={`mt-0.5 shrink-0 ${currentSessionId === session.id ? 'text-blue-600' : 'text-slate-400'}`} />
                                          
                                          {editingSessionId === session.id ? (
                                              <div className="flex-1 flex items-center gap-1 min-w-0" onClick={e => e.stopPropagation()}>
                                                  <input 
                                                    ref={editInputRef}
                                                    value={editTitle}
                                                    onChange={e => setEditTitle(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && saveRename()}
                                                    onBlur={saveRename}
                                                    className="w-full text-sm px-1 py-0.5 border border-blue-500 rounded bg-white outline-none"
                                                  />
                                              </div>
                                          ) : (
                                              <div className="flex-1 min-w-0">
                                                  <div className={`font-medium text-sm truncate ${currentSessionId === session.id ? 'text-blue-700' : 'text-slate-700'}`}>
                                                      {session.title}
                                                  </div>
                                                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{session.preview}</div>
                                              </div>
                                          )}

                                          {/* Hover Actions (Only show if not editing) */}
                                          {editingSessionId !== session.id && (
                                              <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-slate-100">
                                                  <button 
                                                    onClick={(e) => startRenaming(e, session)}
                                                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                    title="重命名"
                                                  >
                                                      <Edit2 size={12} />
                                                  </button>
                                                  <button 
                                                    onClick={(e) => handleDeleteClick(e, session.id)}
                                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                    title="删除"
                                                  >
                                                      <Trash2 size={12} />
                                                  </button>
                                              </div>
                                          )}
                                      </div>
                                  ))}
                              </div>
                              {/* Show More Button */}
                              {groupList.length > 5 && (
                                  <button 
                                    onClick={() => toggleGroup(groupName)}
                                    className="w-full text-center text-xs text-slate-400 hover:text-blue-600 mt-1 py-1 flex items-center justify-center gap-1 transition-colors"
                                  >
                                      {isExpanded ? '收起' : `查看更多 (${groupList.length - 5})`}
                                      <ChevronRight size={12} className={`transform transition-transform ${isExpanded ? '-rotate-90' : 'rotate-90'}`} />
                                  </button>
                              )}
                          </div>
                      );
                  })}
                  
                  {(sessions as ChatSession[]).length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-sm">
                          暂无历史对话
                      </div>
                  )}
                  {(sessions as ChatSession[]).length > 0 && Object.values(groupedSessions).every((arr: ChatSession[]) => arr.length === 0) && (
                      <div className="text-center py-8 text-slate-400 text-sm">
                          未找到匹配的对话
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setDeleteConfirm({ isOpen: false, sessionId: null })}>
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                  <div className="p-6 text-center">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                          <Trash2 size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">删除对话</h3>
                      <p className="text-sm text-slate-500 mb-6">
                          确定要删除此对话记录吗？此操作无法撤销。
                      </p>
                      <div className="flex gap-3">
                          <button 
                            onClick={() => setDeleteConfirm({ isOpen: false, sessionId: null })}
                            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
                          >
                              取消
                          </button>
                          <button 
                            onClick={confirmDelete}
                            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-medium shadow-md transition-colors"
                          >
                              确认删除
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- Modals --- */}
      
      {/* Knowledge Base Modal */}
      {isKBModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <Database size={20} className="text-purple-600"/> 引用知识库
                      </h3>
                      <button onClick={() => setIsKBModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                  </div>
                  <div className="p-4 overflow-y-auto flex-1 bg-slate-50/30">
                      <div className="space-y-4">
                          <div>
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">个人知识库</h4>
                              {KNOWLEDGE_BASES.filter(k => k.type === 'PERSONAL').map(kb => (
                                  <div 
                                    key={kb.id} 
                                    onClick={() => toggleKB(kb.id)}
                                    className={`flex items-center p-3 rounded-xl cursor-pointer transition-all mb-2 border shadow-sm ${selectedKBs.includes(kb.id) ? 'bg-purple-50 border-purple-200' : 'bg-white border-slate-200 hover:border-purple-200'}`}
                                  >
                                      <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${selectedKBs.includes(kb.id) ? 'bg-purple-600 border-purple-600' : 'border-slate-300 bg-white'}`}>
                                          {selectedKBs.includes(kb.id) && <CheckCircle2 size={14} className="text-white" />}
                                      </div>
                                      <div className="flex-1">
                                          <div className={`text-sm font-medium ${selectedKBs.includes(kb.id) ? 'text-purple-700' : 'text-slate-700'}`}>{kb.name}</div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                          <div>
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">团队知识库</h4>
                              {KNOWLEDGE_BASES.filter(k => k.type === 'TEAM').map(kb => (
                                  <div 
                                    key={kb.id} 
                                    onClick={() => toggleKB(kb.id)}
                                    className={`flex items-center p-3 rounded-xl cursor-pointer transition-all mb-2 border shadow-sm ${selectedKBs.includes(kb.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-200'}`}
                                  >
                                      <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${selectedKBs.includes(kb.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                          {selectedKBs.includes(kb.id) && <CheckCircle2 size={14} className="text-white" />}
                                      </div>
                                      <div className="flex-1">
                                          <div className={`text-sm font-medium ${selectedKBs.includes(kb.id) ? 'text-blue-700' : 'text-slate-700'}`}>{kb.name}</div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
                      <button 
                        onClick={() => setSelectedKBs([])}
                        className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium"
                      >
                          清空选择
                      </button>
                      <button 
                        onClick={() => setIsKBModalOpen(false)}
                        className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                      >
                          确认引用 ({selectedKBs.length})
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* File Upload Modal */}
      {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center transform transition-all">
                  {!uploadSuccess ? (
                      <>
                          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors ${isUploading ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                              {isUploading ? <Loader2 size={40} className="animate-spin" /> : <CloudUpload size={40} strokeWidth={1.5} />}
                          </div>
                          <h3 className="text-xl font-bold text-slate-800 mb-2">{isUploading ? '正在上传...' : '上传文件'}</h3>
                          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                              支持 PDF, Word, Excel, TXT 格式<br/>
                              <span className="text-xs text-slate-400">单文件最大 20MB</span>
                          </p>
                          
                          {!isUploading && (
                              <div className="flex gap-3">
                                  <button 
                                    onClick={() => setIsUploadModalOpen(false)}
                                    className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
                                  >
                                      取消
                                  </button>
                                  <button 
                                    onClick={handleFileUpload}
                                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium shadow-md transition-colors"
                                  >
                                      选择文件
                                  </button>
                              </div>
                          )}
                      </>
                  ) : (
                      <div className="py-6 animate-in zoom-in-95">
                          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                              <CheckCircle2 size={40} />
                          </div>
                          <h3 className="text-xl font-bold text-slate-800 mb-2">上传成功！</h3>
                          <p className="text-sm text-slate-500">文件已添加至当前对话上下文</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* --- Main Content Logic --- */}
      {/* If Zigo Mode, ignore messages and show centered input/progress always. */}
      {mode === 'ZIGO' || currentMessages.length === 0 ? (
          /* Greeting/Zigo View */
          <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full px-6 animate-fade-in pb-20">
            {/* Logo/Greeting */}
            <div className="flex items-center gap-5 mb-10">
               <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-white shadow-lg transition-colors duration-500 ${mode === 'ZIGO' ? 'bg-gradient-to-br from-orange-500 to-red-500 shadow-orange-200' : 'bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] shadow-blue-200'}`}>
                  {mode === 'ZIGO' ? (
                      <Sparkles className="w-10 h-10" />
                  ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                  )}
               </div>
               <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                 {mode === 'ZIGO' ? '我是智构，您的 AI 编排专家' : 'Hi，我是智构 Zigo，很高兴见到你！'}
               </h1>
            </div>

            {/* Mode Toggle */}
            <div className={`p-1 rounded-full flex mb-12 shadow-lg transition-colors duration-300 ${mode === 'ZIGO' ? 'bg-orange-600 shadow-orange-200/50' : 'bg-[#007AFF] shadow-blue-200/50'}`}>
               <button 
                 onClick={() => setMode('DAILY')}
                 className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${mode === 'DAILY' ? 'bg-white text-[#007AFF] shadow-sm' : 'text-blue-100 hover:text-white'}`}
               >
                 日常模式
               </button>
               <button 
                 onClick={() => setMode('ZIGO')}
                 className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${mode === 'ZIGO' ? 'bg-white text-orange-600 shadow-sm' : 'text-blue-100 hover:text-white'}`}
               >
                 智构模式
               </button>
            </div>

            {/* Input Component */}
            {renderInputArea('centered')}
          </div>
      ) : (
          /* Chat View (Only for Daily Mode with messages) */
          <div className="flex-1 flex flex-col h-full relative">
              {/* Message List */}
              <div className="flex-1 overflow-y-auto px-4 md:px-0 py-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                  <div className="max-w-4xl mx-auto space-y-8 pb-48">
                      {currentMessages.map((msg) => (
                          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              {/* Bot Avatar */}
                              {msg.role === 'assistant' && (
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex-shrink-0 flex items-center justify-center text-white shadow-sm mt-1">
                                      <Bot size={20} />
                                  </div>
                              )}
                              
                              {/* Message Bubble */}
                              <div className={`max-w-[80%] rounded-2xl px-6 py-4 text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                                  msg.role === 'user' 
                                    ? 'bg-[#007AFF] text-white rounded-br-sm' 
                                    : 'bg-white border border-slate-100 text-slate-700 rounded-bl-sm'
                              }`}>
                                  {msg.content}
                              </div>

                              {/* User Avatar */}
                              {msg.role === 'user' && (
                                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex-shrink-0 flex items-center justify-center text-slate-500 mt-1">
                                      <User size={20} />
                                  </div>
                              )}
                          </div>
                      ))}
                      
                      {/* Typing Indicator */}
                      {isTyping && (
                          <div className="flex gap-4 justify-start animate-fade-in">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex-shrink-0 flex items-center justify-center text-white shadow-sm mt-1">
                                  <Bot size={20} />
                              </div>
                              <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-6 py-5 shadow-sm flex items-center gap-1.5">
                                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                              </div>
                          </div>
                      )}
                      <div ref={messagesEndRef} />
                  </div>
              </div>

              {/* Bottom Input */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pb-8 pt-12 px-4">
                  {renderInputArea('bottom')}
                  <p className="text-center text-[10px] text-slate-400 mt-3 select-none">
                      内容由 AI 生成，请仔细甄别。
                  </p>
              </div>
          </div>
      )}
    </div>
  );
};

export default Home;