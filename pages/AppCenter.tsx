import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppContext } from '../App';
import { ToolDefinition, ToolType, ParameterType } from '../types';
import { 
  Search, 
  LayoutGrid, 
  Bot, 
  Heart, 
  ChevronDown, 
  User, 
  X, 
  Clock, 
  Shield, 
  CheckCircle2, 
  ArrowRight, 
  Database,
  Mail,
  FileText,
  Globe,
  Cpu,
  Zap,
  Star,
  ArrowLeft,
  AlertCircle,
  Filter,
  Settings,
  Save,
  Link,
  Loader2,
  HelpCircle,
  Code,
  Copy,
  Terminal,
  FileJson,
  Trash2
} from 'lucide-react';

// --- Helper Icons ---
const NodeIcon = ({ name }: { name: string }) => {
  const iconProps = { size: 14, className: "text-slate-500" };
  switch(name) {
    case 'Database': return <Database {...iconProps} />;
    case 'Mail': return <Mail {...iconProps} />;
    case 'FileText': return <FileText {...iconProps} />;
    case 'Globe': return <Globe {...iconProps} />;
    case 'Cpu': return <Cpu {...iconProps} />;
    default: return <Zap {...iconProps} />;
  }
};

// --- Mock Data Enriched for UI ---
const CREATORS = [
    { name: 'ceshi@huangqing.ai', avatar: 'bg-indigo-100 text-indigo-600' },
    { name: 'admin@system.io', avatar: 'bg-orange-100 text-orange-600' },
    { name: 'dev@team.com', avatar: 'bg-green-100 text-green-600' }
];

// --- Credential Schemas (n8n Style) ---
const CREDENTIAL_SCHEMAS: Record<string, { title: string, fields: { key: string, label: string, type: string, placeholder?: string, required?: boolean }[] }> = {
    'db': {
        title: 'PostgreSQL Connection',
        fields: [
            { key: 'host', label: 'Host', type: 'text', placeholder: 'localhost', required: true },
            { key: 'port', label: 'Port', type: 'number', placeholder: '5432', required: true },
            { key: 'database', label: 'Database Name', type: 'text', placeholder: 'my_db', required: true },
            { key: 'user', label: 'User', type: 'text', placeholder: 'postgres', required: true },
            { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••', required: true },
            { key: 'ssl', label: 'SSL Mode', type: 'select', placeholder: 'disable', required: false } // Mock select as text for simple UI
        ]
    },
    'mail': {
        title: 'SMTP Account',
        fields: [
            { key: 'host', label: 'SMTP Host', type: 'text', placeholder: 'smtp.gmail.com', required: true },
            { key: 'port', label: 'Port', type: 'number', placeholder: '465', required: true },
            { key: 'user', label: 'User / Email', type: 'text', placeholder: 'user@example.com', required: true },
            { key: 'pass', label: 'Password / App Password', type: 'password', placeholder: '••••••••', required: true },
            { key: 'secure', label: 'Use TLS/SSL', type: 'checkbox', required: false }
        ]
    },
    'api': {
        title: 'REST API Authentication',
        fields: [
            { key: 'baseUrl', label: 'Base URL', type: 'text', placeholder: 'https://api.service.com', required: true },
            { key: 'authType', label: 'Authentication', type: 'text', placeholder: 'Bearer Token', required: true },
            { key: 'apiKey', label: 'API Key / Token', type: 'password', placeholder: 'sk-...', required: true }
        ]
    },
    'llm': {
        title: 'Model Provider Credentials',
        fields: [
            { key: 'provider', label: 'Provider', type: 'text', placeholder: 'OpenAI / Anthropic', required: true },
            { key: 'baseUrl', label: 'Base URL (Optional)', type: 'text', placeholder: 'https://api.openai.com/v1' },
            { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...', required: true }
        ]
    },
    'basic': {
        title: 'Basic Authentication',
        fields: [
            { key: 'username', label: 'Username', type: 'text', required: true },
            { key: 'password', label: 'Password', type: 'password', required: true }
        ]
    }
};

// --- Helper: Dynamic Credentials ---
const getAppCredentials = (app: any) => {
    const creds = [];
    const nodes = app.nodesPreview || [];
    const tags = app.tags || [];
    const type = app.type;

    // Deduce credentials based on app metadata
    if (nodes.includes('Database') || tags.includes('SQL') || tags.includes('Data')) {
        creds.push({ id: 'db', title: 'PostgreSQL 数据库 (PostgreSQL Database)', icon: <Database size={20} className="text-blue-600"/>, desc: '用于读取和写入业务数据。' });
    }
    if (nodes.includes('Mail') || tags.includes('邮件')) {
        creds.push({ id: 'mail', title: 'SMTP 邮件服务 (SMTP Service)', icon: <Mail size={20} className="text-orange-600"/>, desc: '用于发送通知邮件。' });
    }
    if (nodes.includes('Globe') || nodes.includes('Webhook') || tags.includes('API')) {
        creds.push({ id: 'api', title: 'REST API 认证 (REST API Auth)', icon: <Globe size={20} className="text-green-600"/>, desc: '访问外部第三方服务接口。' });
    }
    // Assistants usually need LLM
    if (type === 'ASSISTANT' || nodes.includes('Bot') || nodes.includes('BrainCircuit')) {
        creds.push({ id: 'llm', title: 'LLM 模型服务 (LLM Model Service)', icon: <Zap size={20} className="text-purple-600"/>, desc: '提供智能对话能力的模型服务连接。' });
    }
    
    // Fallback if no specific needs found but it's an app
    if (creds.length === 0) {
        creds.push({ id: 'basic', title: '基础应用凭证 (Basic Auth)', icon: <Shield size={20} className="text-slate-600"/>, desc: '应用运行所需的基础访问权限。' });
    }

    return creds;
};

interface AppCardProps {
    app: any;
    handleAppClick: (app: any) => void;
    favorites: Set<string>;
    toggleFavorite: (e: React.MouseEvent, id: string) => void;
    onRemoveFromHistory?: (e: React.MouseEvent, id: string) => void;
}

const AppCard: React.FC<AppCardProps> = ({ app, handleAppClick, favorites, toggleFavorite, onRemoveFromHistory }) => (
      <div 
        onClick={() => handleAppClick(app)}
        className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-all cursor-pointer group relative flex flex-col h-[240px]"
      >
          {/* Header: Icon + Tags */}
          <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm border
                  ${app.type === 'WORKFLOW' 
                    ? 'bg-blue-50 border-blue-100 text-blue-600' 
                    : 'bg-green-50 border-green-100 text-green-600'
                  }
              `}>
                  {app.type === 'WORKFLOW' ? <LayoutGrid size={24} /> : (app.avatar || <Bot size={24} />)}
              </div>
              <div className="flex flex-wrap gap-1 justify-end max-w-[50%]">
                  {app.tags?.slice(0, 2).map((tag: string, i: number) => (
                      <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#C25E5E] text-white">
                          {tag}
                      </span>
                  ))}
              </div>
          </div>

          {/* Body: Title + Desc */}
          <div className="flex-1">
              <h3 className="font-bold text-slate-900 text-base mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                  {app.name}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                  {app.description || "暂无应用描述..."}
              </p>
          </div>

          {/* Footer: Creator */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${app.creator.avatar}`}>
                  <User size={12} />
              </div>
              <span className="text-xs text-slate-500 font-medium truncate">
                  创建用户 <span className="text-slate-700">{app.creator.name}</span>
              </span>
          </div>

          {/* Favorite Button (Absolute) */}
          <button 
             onClick={(e) => toggleFavorite(e, app.id)}
             className="absolute bottom-4 right-4 text-slate-300 hover:text-red-500 hover:scale-110 transition-all"
          >
              <Heart size={18} fill={favorites.has(app.id) ? "currentColor" : "none"} className={favorites.has(app.id) ? "text-red-500" : ""} />
          </button>

          {/* Remove From History Button */}
          {onRemoveFromHistory && (
            <button 
                onClick={(e) => onRemoveFromHistory(e, app.id)}
                className="absolute top-3 right-3 text-slate-300 hover:text-red-500 hover:bg-slate-100 p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
                title="从历史记录中移除"
            >
                <X size={14} />
            </button>
          )}
      </div>
  );

// --- Dropdown Helper ---
const FilterDropdown = ({ label, value, options, onSelect, isOpen, setIsOpen, onCloseOther, width = 'w-32' }: any) => (
    <div className="relative">
        <button 
            onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); if(!isOpen && onCloseOther) onCloseOther(); }}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors min-w-[110px] justify-between ${value !== 'ALL' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'}`}
        >
            {value === 'ALL' ? label : value}
            <ChevronDown size={14} className={value !== 'ALL' ? "text-blue-400" : "text-slate-400"} />
        </button>
        {isOpen && (
            <div className={`absolute top-full left-0 mt-1 ${width} bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-75 max-h-60 overflow-y-auto`}>
                <button onClick={() => { onSelect('ALL'); setIsOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">{label}</button>
                {options.map((opt: string | { label: string, value: string }) => {
                    const display = typeof opt === 'string' ? opt : opt.label;
                    const val = typeof opt === 'string' ? opt : opt.value;
                    return (
                        <button key={val} onClick={() => { onSelect(val); setIsOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">
                            {display}
                        </button>
                    );
                })}
            </div>
        )}
    </div>
);

const AppCenter: React.FC = () => {
  const { workflows, assistants, tools, addTool, updateTool } = useAppContext();
  
  // State
  const [viewMode, setViewMode] = useState<'LIST' | 'DETAIL'>('LIST');
  const [selectedAppGroup, setSelectedAppGroup] = useState<any[]>([]); // All versions of selected app
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  
  // Filters (Main Page)
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'WORKFLOW' | 'ASSISTANT'>('ALL');
  const [tagFilter, setTagFilter] = useState<string>('ALL');
  
  // Dropdown States (Main Page)
  const [isMainTypeOpen, setIsMainTypeOpen] = useState(false);
  const [isMainTagOpen, setIsMainTagOpen] = useState(false);

  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  // Note: historyExpanded state removed in favor of Modal "View All"
  const [historyIds, setHistoryIds] = useState<string[]>(() => {
      try {
          const saved = localStorage.getItem('zigo_app_history');
          return saved ? JSON.parse(saved) : [];
      } catch { return []; }
  });
  
  const [activeTab, setActiveTab] = useState<'ALL' | 'FAVORITES'>('ALL');
  const [isAllAppsModalOpen, setIsAllAppsModalOpen] = useState(false);
  
  // Modal Filters & Mode
  const [modalSearch, setModalSearch] = useState('');
  const [modalTypeFilter, setModalTypeFilter] = useState<'ALL' | 'WORKFLOW' | 'ASSISTANT'>('ALL');
  const [modalTagFilter, setModalTagFilter] = useState<string>('ALL');
  const [modalMode, setModalMode] = useState<'ALL' | 'HISTORY'>('ALL');
  
  // Modal Dropdown States
  const [isModalTypeOpen, setIsModalTypeOpen] = useState(false);
  const [isModalTagOpen, setIsModalTagOpen] = useState(false);

  // Detail View State
  const [detailTab, setDetailTab] = useState<'DETAILS' | 'USAGE'>('DETAILS');
  const [usageSubTab, setUsageSubTab] = useState<'API' | 'NO_AUTH' | 'LOGIN'>('API');

  // Config States
  const [configuredCredentials, setConfiguredCredentials] = useState<Record<string, boolean>>({});
  const [activeCredential, setActiveCredential] = useState<{id: string, title: string} | null>(null);
  const [credFormData, setCredFormData] = useState<Record<string, any>>({});
  const [isSavingCred, setIsSavingCred] = useState(false);
  
  // Tooltip State
  const [hoveredHintId, setHoveredHintId] = useState<string | null>(null);

  // Refs for click outside
  const mainFiltersRef = useRef<HTMLDivElement>(null);
  const modalFiltersRef = useRef<HTMLDivElement>(null);

  // --- Effects ---
  
  // Persist history
  useEffect(() => {
      localStorage.setItem('zigo_app_history', JSON.stringify(historyIds));
  }, [historyIds]);

  // Close dropdowns on click outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (mainFiltersRef.current && !mainFiltersRef.current.contains(event.target as Node)) {
              setIsMainTypeOpen(false);
              setIsMainTagOpen(false);
          }
          if (modalFiltersRef.current && !modalFiltersRef.current.contains(event.target as Node)) {
              setIsModalTypeOpen(false);
              setIsModalTagOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Data Preparation ---
  const allApps = useMemo(() => {
    const wfs = workflows.filter(w => w.status === 'PUBLISHED').map(w => ({ ...w, type: 'WORKFLOW' as const, creator: CREATORS[0] }));
    const asts = assistants.filter(a => a.status === 'PUBLISHED').map(a => ({ ...a, type: 'ASSISTANT' as const, creator: CREATORS[0] }));
    return [...wfs, ...asts];
  }, [workflows, assistants]);

  // Group by Name to find versions
  const groupedApps = useMemo(() => {
      const groups: Record<string, any[]> = {};
      allApps.forEach(app => {
          if (!groups[app.name]) groups[app.name] = [];
          groups[app.name].push(app);
      });
      // Sort each group by version descending
      Object.keys(groups).forEach(key => {
          groups[key].sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
      });
      return groups;
  }, [allApps]);

  const latestApps = useMemo(() => {
      return Object.values(groupedApps).map(group => group[0]);
  }, [groupedApps]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    latestApps.forEach(app => app.tags?.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [latestApps]);

  const historyApps = useMemo(() => {
      const list = [];
      const seen = new Set();
      // Validate historyIds against latestApps to ensure we don't show deleted apps
      const validHistoryIds = historyIds.filter(id => latestApps.some(app => app.id === id));
      
      for (const id of validHistoryIds) {
          const app = latestApps.find(a => a.id === id);
          if (app && !seen.has(app.id)) {
              list.push(app);
              seen.add(app.id);
          }
      }
      return list;
  }, [latestApps, historyIds]);

  const filteredApps = useMemo(() => {
    return latestApps.filter(app => {
      // Tab Filter
      if (activeTab === 'FAVORITES' && !favorites.has(app.id)) return false;

      // Search & Dropdown Filters
      const matchesSearch = app.name.toLowerCase().includes(search.toLowerCase()) || 
                            app.description.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'ALL' || app.type === typeFilter;
      const matchesTag = tagFilter === 'ALL' || app.tags?.includes(tagFilter);

      return matchesSearch && matchesType && matchesTag;
    });
  }, [latestApps, search, typeFilter, tagFilter, activeTab, favorites]);

  // Filter logic for Modal - UPDATED to handle both ALL and HISTORY modes
  const modalFilteredApps = useMemo(() => {
      const sourceApps = modalMode === 'HISTORY' ? historyApps : latestApps;
      return sourceApps.filter(app => {
          const matchesSearch = app.name.toLowerCase().includes(modalSearch.toLowerCase()) || 
                                app.description.toLowerCase().includes(modalSearch.toLowerCase());
          const matchesType = modalTypeFilter === 'ALL' || app.type === modalTypeFilter;
          const matchesTag = modalTagFilter === 'ALL' || app.tags?.includes(modalTagFilter);
          return matchesSearch && matchesType && matchesTag;
      });
  }, [latestApps, historyApps, modalSearch, modalTypeFilter, modalTagFilter, modalMode]);

  // --- Handlers ---
  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newFavs = new Set(favorites);
    if (newFavs.has(id)) {
        newFavs.delete(id);
    } else {
        newFavs.add(id);
    }
    setFavorites(newFavs);
  };

  const handleAppClick = (app: any) => {
      // Add to history when clicked (Persist to LocalStorage via state effect)
      setHistoryIds(prev => [app.id, ...prev.filter(id => id !== app.id)].slice(0, 8));

      const group = groupedApps[app.name] || [app];
      setSelectedAppGroup(group);
      setSelectedVersionId(group[0].id); // Default to latest version
      setViewMode('DETAIL');
      setDetailTab('DETAILS');
      setUsageSubTab('API'); // Reset usage sub tab
      window.scrollTo(0, 0);
  };

  const clearAllHistory = () => {
      if (historyIds.length === 0) return;
      if (window.confirm('确定要清空所有历史记录吗？')) {
          setHistoryIds([]);
      }
  };

  const removeFromHistory = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setHistoryIds(prev => prev.filter(hid => hid !== id));
  };

  const handleBack = () => {
      setViewMode('LIST');
      setSelectedAppGroup([]);
      setSelectedVersionId('');
      setConfiguredCredentials({}); // Reset local config state
  };

  const openCredentialModal = (id: string, title: string) => {
      setActiveCredential({ id, title });
      setCredFormData({});
  };

  const handleSaveCredential = async () => {
      if (!activeCredential) return;
      setIsSavingCred(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 1. Update Local UI State
      setConfiguredCredentials(prev => ({
          ...prev,
          [activeCredential.id]: true
      }));

      // 2. Sync to Tool Center (Simulated)
      // Check if a tool with this name exists, if not create a mock one to represent the credential sync
      const toolName = activeCredential.title; 
      const existingTool = tools.find(t => t.name === toolName);
      
      if (existingTool) {
          // Update existing tool (Mock: update last modified or status)
          updateTool({
              ...existingTool,
              description: `${existingTool.description} (Updated via App Center)`
          });
      } else {
          // Create new tool entry in Tool Center
          const schema = CREDENTIAL_SCHEMAS[activeCredential.id];
          const newTool: ToolDefinition = {
              id: `tool-${Date.now()}`,
              name: toolName,
              description: `Auto-generated from App Center configuration.`,
              method: 'POST', // Default mock
              baseUrl: credFormData.host || credFormData.baseUrl || 'https://api.example.com',
              endpoint: '/v1',
              category: '已配置',
              version: '1.0.0',
              parameters: schema ? schema.fields.map(f => ({
                  id: `p-${f.key}`,
                  key: f.key,
                  label: f.label,
                  type: f.type === 'number' ? ParameterType.NUMBER : ParameterType.STRING,
                  required: f.required || false,
                  description: f.label
              })) : [],
              createdBy: 'User',
              type: ToolType.API,
              status: 'ACTIVE',
              createdAt: new Date().toISOString()
          };
          addTool(newTool);
      }

      setIsSavingCred(false);
      setActiveCredential(null);
  };

  const selectedApp = useMemo(() => {
      return selectedAppGroup.find(a => a.id === selectedVersionId) || selectedAppGroup[0];
  }, [selectedAppGroup, selectedVersionId]);

  if (viewMode === 'DETAIL' && selectedApp) {
    const requiredCredentials = getAppCredentials(selectedApp);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[calc(100vh-140px)] flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header */}
            <div className="h-14 border-b border-slate-200 flex items-center px-4 justify-between bg-white rounded-t-xl sticky top-0 z-10">
                <div className="flex items-center gap-6 h-full">
                    <button 
                    onClick={handleBack}
                    className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <div className="flex gap-6 h-full">
                        <button 
                        onClick={() => setDetailTab('DETAILS')}
                        className={`h-full border-b-2 px-2 text-sm font-bold transition-colors ${detailTab === 'DETAILS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            应用详情
                        </button>
                        <button 
                        onClick={() => setDetailTab('USAGE')}
                        className={`h-full border-b-2 px-2 text-sm font-bold transition-colors ${detailTab === 'USAGE' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            使用方式
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">版本:</span>
                    <div className="relative">
                        <select 
                            value={selectedVersionId}
                            onChange={(e) => setSelectedVersionId(e.target.value)}
                            className="appearance-none bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg py-1.5 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            {selectedAppGroup.map((v) => (
                                <option key={v.id} value={v.id}>
                                    v{v.version}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Body Container */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                {detailTab === 'DETAILS' ? (
                    /* Details - Split Layout */
                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden h-full">
                        {/* Left Column (Details) */}
                        <div className="w-full lg:w-[400px] xl:w-[440px] overflow-y-auto p-6 lg:p-8 border-r border-slate-200 bg-white flex-shrink-0 z-10 flex flex-col">
                            {/* App Header Info */}
                            <div className="flex items-start gap-6 mb-8">
                                <div className={`w-20 h-20 rounded-2xl flex-shrink-0 flex items-center justify-center text-3xl shadow-sm border bg-slate-50 border-slate-200 text-slate-600`}>
                                    {selectedApp.type === 'WORKFLOW' ? <LayoutGrid size={32} /> : (selectedApp.avatar || <Bot size={32} />)}
                                </div>
                                <div className="pt-1">
                                    <h1 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                                        {selectedApp.name}
                                    </h1>
                                    <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded font-medium">v{selectedApp.version}</span>
                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {selectedApp.tags?.map((t: string) => (
                                            <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium border border-slate-200">{t}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Detail Content */}
                            <div className="space-y-8 text-slate-700 leading-relaxed">
                                <section>
                                    <h3 className="font-bold text-slate-900 mb-3 text-sm">应用简介</h3>
                                    <div className="space-y-4">
                                        <p className="text-xs text-slate-600 leading-6">
                                            {selectedApp.description || "这是一个高效的自动化应用，集成了多种智能能力。"}
                                        </p>
                                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                            <h4 className="font-bold text-xs text-slate-800 mb-2">功能亮点</h4>
                                            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1.5 ml-1">
                                                <li>多格式适配</li>
                                                <li>智能信息提取</li>
                                                <li>结构化输出</li>
                                            </ul>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Footer Meta */}
                            <div className="mt-auto pt-10 flex items-center justify-between text-slate-400">
                                <div className="flex items-center gap-2">
                                    <Clock size={16} />
                                    <span className="text-sm">最后更新时间：{new Date(selectedApp.updatedAt || selectedApp.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <User size={16} />
                                    <span className="text-sm">作者：{selectedApp.creator?.name || '未知用户'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Column (Configuration) */}
                        <div className="flex-1 bg-slate-50 flex flex-col min-w-0 overflow-y-auto">
                            <div className="p-8 lg:p-10 max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="mb-8">
                                    <h2 className="text-xl font-bold text-slate-900 mb-2">配置与使用</h2>
                                    <p className="text-slate-500 text-sm">在此配置应用的运行参数与凭证信息。</p>
                                </div>

                                {/* Dynamic Credential List */}
                                <div className="space-y-6">
                                    {requiredCredentials.map((cred, index) => (
                                        <div 
                                            key={cred.id} 
                                            className={`bg-white border rounded-xl p-6 shadow-sm relative group transition-all duration-300 hover:z-20 ${configuredCredentials[cred.id] ? 'border-green-200 ring-1 ring-green-100' : 'border-slate-200 hover:border-blue-300'}`}
                                            style={{ zIndex: hoveredHintId === cred.id ? 50 : undefined }}
                                        >
                                            {/* Number Badge */}
                                            <div className={`absolute top-0 left-0 text-xs font-bold px-3 py-1 rounded-tl-xl rounded-br-lg border-b border-r transition-colors ${configuredCredentials[cred.id] ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100'}`}>
                                                Step {index + 1}
                                            </div>
                                            <div className="flex items-start gap-5 mt-3">
                                                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${configuredCredentials[cred.id] ? 'bg-green-50 border-green-100 text-green-600' : 'bg-slate-50 border-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                                                    {configuredCredentials[cred.id] ? <CheckCircle2 size={24}/> : cred.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1 relative">
                                                        <h3 className="text-base font-bold text-slate-900">{cred.title}</h3>
                                                        <div className="relative">
                                                            <HelpCircle 
                                                                size={14} 
                                                                className="text-slate-400 cursor-help hover:text-blue-500 transition-colors"
                                                                onMouseEnter={() => setHoveredHintId(cred.id)}
                                                                onMouseLeave={() => setHoveredHintId(null)}
                                                            />
                                                            {hoveredHintId === cred.id && (
                                                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-lg z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                                                                    {cred.desc}
                                                                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-800"></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-slate-500 mb-4">{cred.desc}</p>
                                                    <div className="flex items-center gap-3">
                                                        <button 
                                                            onClick={() => openCredentialModal(cred.id, cred.title)}
                                                            className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2 ${configuredCredentials[cred.id] ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-white border-slate-300 hover:border-blue-500 hover:text-blue-600 text-slate-700'}`}
                                                        >
                                                            {configuredCredentials[cred.id] ? (
                                                                <><Settings size={14} /> 修改配置</>
                                                            ) : (
                                                                <><Settings size={14} /> 配置凭证</>
                                                            )}
                                                        </button>
                                                        {configuredCredentials[cred.id] ? (
                                                            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100 flex items-center gap-1">
                                                                <CheckCircle2 size={12}/> 已配置
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded border border-orange-100">
                                                                未配置
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Action Footer */}
                                <div className="mt-10 flex justify-end gap-4 border-t border-slate-200 pt-6">
                                    <button className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                                        测试连接
                                    </button>
                                    <button className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg shadow-blue-500/20 transition-colors flex items-center gap-2">
                                        <ArrowRight size={18} /> 开始运行
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Usage - Full Width Layout */
                    <div className="flex-1 overflow-y-auto h-full w-full bg-slate-50">
                        {/* ... (Usage content kept same as previous) ... */}
                        <div className="max-w-5xl mx-auto p-6 lg:p-10">
                            {/* Sub Tabs for Usage Models */}
                            <div className="flex items-center gap-8 border-b border-slate-200 mb-8">
                                <button
                                    onClick={() => setUsageSubTab('API')}
                                    className={`pb-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${usageSubTab === 'API' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    API发布
                                </button>
                                <button
                                    onClick={() => setUsageSubTab('NO_AUTH')}
                                    className={`pb-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${usageSubTab === 'NO_AUTH' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    免密登录 <span className="bg-blue-100 text-blue-600 px-1 py-0.5 rounded text-[10px]"><Zap size={10} fill="currentColor"/></span>
                                </button>
                                <button
                                    onClick={() => setUsageSubTab('LOGIN')}
                                    className={`pb-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${usageSubTab === 'LOGIN' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    登录访问 <span className="bg-blue-100 text-blue-600 px-1 py-0.5 rounded text-[10px]"><Zap size={10} fill="currentColor"/></span>
                                </button>
                            </div>

                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                {/* API Request Example Section */}
                                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                        <Terminal size={18} className="text-slate-500"/> API请求示例
                                    </h3>
                                    
                                    {/* Endpoint Bar */}
                                    <div className="flex items-center gap-3 bg-slate-100 p-3 rounded-lg border border-slate-200 font-mono text-sm mb-4 overflow-x-auto">
                                        <span className={`bg-blue-600 text-white px-2 py-0.5 rounded font-bold text-xs shrink-0`}>POST</span>
                                        <span className="text-slate-600 whitespace-nowrap">
                                            {usageSubTab === 'API' ? `/api/v2/assistant/chat/${selectedApp.id}` : 
                                             usageSubTab === 'NO_AUTH' ? `/api/v2/public/chat/${selectedApp.id}` : 
                                             `/api/v2/secure/chat/${selectedApp.id}`}
                                        </span>
                                    </div>
                                    
                                    <p className="text-sm text-slate-500 mb-4 leading-relaxed">
                                        {usageSubTab === 'API' && '可以直接使用 OpenAI 官方 SDK 中的 ChatOpenAI 组件去使用助手（只支持文档内有的参数）。需提供 API Key。'}
                                        {usageSubTab === 'NO_AUTH' && '免密登录模式允许通过公开链接或特定白名单IP直接访问，无需鉴权头。适用于内网集成或公开演示。'}
                                        {usageSubTab === 'LOGIN' && '登录访问模式需要用户通过 OAuth2 或 Session Cookie 进行身份验证后方可调用接口。'}
                                    </p>

                                    <div className="mb-2 text-xs font-bold text-slate-700">示例代码:</div>

                                    {/* Code Block Tabs */}
                                    <div className="bg-slate-900 rounded-xl overflow-hidden shadow-md">
                                        <div className="flex border-b border-slate-700">
                                            <button className="px-4 py-2 text-xs font-medium text-white bg-slate-800 border-r border-slate-700 flex items-center gap-2">
                                                <div className="w-4 h-4 bg-white rounded flex items-center justify-center text-[8px] text-slate-900 font-bold">C</div> cURL
                                            </button>
                                            <button className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">Python API</button>
                                        </div>
                                        <div className="p-4 overflow-x-auto relative group">
                                            <button className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Copy size={14} />
                                            </button>
                                            <pre className="text-xs font-mono leading-relaxed text-blue-300">
{`curl -X POST ${usageSubTab === 'NO_AUTH' ? 'https://api.zigo.dev/api/v2/public/chat/' : 'https://api.zigo.dev/api/v2/assistant/chat/'}${selectedApp.id} \\
  ${usageSubTab === 'API' ? '-H "Authorization: Bearer YOUR_API_KEY" \\' : usageSubTab === 'LOGIN' ? '-H "Authorization: Bearer USER_ACCESS_TOKEN" \\' : ''}
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${selectedApp.id}",
    "messages": [
      {
        "role": "user",
        "content": "你好"
      }
    ],
    "stream": true,
    "temperature": 0.7
  }'`}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Credential Configuration Modal */}
            {activeCredential && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Shield size={18} className="text-blue-600" />
                                配置 {activeCredential.title}
                            </h3>
                            <button onClick={() => setActiveCredential(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>
                        
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            {CREDENTIAL_SCHEMAS[activeCredential.id] ? (
                                CREDENTIAL_SCHEMAS[activeCredential.id].fields.map((field) => (
                                    <div key={field.key} className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700 flex gap-1">
                                            {field.label}
                                            {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                        <input 
                                            type={field.type}
                                            placeholder={field.placeholder}
                                            value={credFormData[field.key] || ''}
                                            onChange={(e) => setCredFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        />
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-slate-500 py-4">此类型凭证暂无配置项。</div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                            <button onClick={() => setActiveCredential(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors">取消</button>
                            <button 
                                onClick={handleSaveCredential}
                                disabled={isSavingCred}
                                className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium text-sm transition-colors disabled:opacity-70 flex items-center gap-2"
                            >
                                {isSavingCred ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {isSavingCred ? '保存中...' : '保存配置'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  }

  return (
    <div className="min-h-full pb-12 animate-fade-in relative">
      {/* --- Top Filter Bar --- */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur py-4 border-b border-slate-200 mb-6 -mx-6 px-6 flex flex-col md:flex-row gap-4 justify-between items-center">
         <div className="flex gap-3 w-full md:w-auto flex-wrap" ref={mainFiltersRef}>
             <FilterDropdown 
                label="全部应用"
                value={typeFilter === 'WORKFLOW' ? '工作流' : typeFilter === 'ASSISTANT' ? '智能助手' : 'ALL'}
                options={[
                    { label: '工作流', value: 'WORKFLOW' },
                    { label: '智能助手', value: 'ASSISTANT' }
                ]}
                onSelect={(val: any) => setTypeFilter(val)}
                isOpen={isMainTypeOpen}
                setIsOpen={setIsMainTypeOpen}
                onCloseOther={() => setIsMainTagOpen(false)}
             />
             
             <FilterDropdown 
                label="全部标签"
                value={tagFilter}
                options={allTags}
                onSelect={(val: any) => setTagFilter(val)}
                isOpen={isMainTagOpen}
                setIsOpen={setIsMainTagOpen}
                onCloseOther={() => setIsMainTypeOpen(false)}
                width="w-40"
             />
         </div>

         {/* Search Bar */}
         <div className="relative w-full md:w-80">
            <input 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               placeholder="搜索应用"
               className="w-full pl-4 pr-10 py-1.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
         </div>
      </div>

      <div className="space-y-10">
          {/* --- History Section --- */}
          <section>
              <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900">历史使用</h2>
                  <div className="flex items-center gap-3">
                      <button 
                        onClick={clearAllHistory}
                        disabled={historyApps.length === 0}
                        className={`text-xs flex items-center gap-1 transition-colors ${historyApps.length === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-red-500'}`}
                      >
                          <Trash2 size={12} /> 清空
                      </button>
                      <div className="w-px h-3 bg-slate-300"></div>
                      <button 
                        onClick={() => { 
                            setIsAllAppsModalOpen(true); 
                            setModalMode('HISTORY'); 
                            setModalSearch(''); 
                            setModalTypeFilter('ALL'); 
                            setModalTagFilter('ALL'); 
                        }}
                        disabled={historyApps.length === 0}
                        className={`text-sm font-medium transition-colors ${historyApps.length === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-blue-600'}`}
                      >
                          查看全部
                      </button>
                  </div>
              </div>
              
              {historyApps.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 transition-all">
                      {historyApps.slice(0, 4).map((app, idx) => (
                          <AppCard 
                            key={`hist-${idx}-${app.id}`} 
                            app={app} 
                            handleAppClick={handleAppClick} 
                            favorites={favorites} 
                            toggleFavorite={toggleFavorite}
                            onRemoveFromHistory={removeFromHistory}
                          />
                      ))}
                  </div>
              ) : (
                  <div className="py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-300 mb-3">
                          <Clock size={20} />
                      </div>
                      <p className="text-sm text-slate-400">空空如也，暂无使用记录</p>
                  </div>
              )}
          </section>

          {/* --- Main Apps Section --- */}
          <section>
              <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-6">
                      <button 
                        onClick={() => setActiveTab('ALL')}
                        className={`text-lg font-bold pb-2 border-b-2 transition-colors ${activeTab === 'ALL' ? 'text-slate-900 border-slate-900' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                      >
                          全部应用
                      </button>
                      <button 
                        onClick={() => setActiveTab('FAVORITES')}
                        className={`text-lg font-bold pb-2 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'FAVORITES' ? 'text-slate-900 border-slate-900' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                      >
                          我的收藏
                          {favorites.size > 0 && <span className="text-xs bg-slate-100 text-slate-600 px-1.5 rounded-full">{favorites.size}</span>}
                      </button>
                  </div>
                  {/* Updated View All Button for All Apps */}
                  <button 
                    onClick={() => { 
                        setIsAllAppsModalOpen(true); 
                        setModalMode('ALL'); // Added Mode
                        setModalSearch(''); 
                        setModalTypeFilter('ALL'); 
                        setModalTagFilter('ALL'); 
                    }} 
                    className="text-sm text-slate-500 hover:text-blue-600"
                  >查看全部</button>
              </div>

              {filteredApps.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                      {filteredApps.map(app => (
                          <AppCard 
                            key={app.id} 
                            app={app} 
                            handleAppClick={handleAppClick} 
                            favorites={favorites} 
                            toggleFavorite={toggleFavorite} 
                          />
                      ))}
                  </div>
              ) : (
                  <div className="py-20 text-center bg-white rounded-xl border border-slate-200 border-dashed">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                          {activeTab === 'FAVORITES' ? <Heart size={32} /> : <Search size={32} />}
                      </div>
                      <p className="text-slate-500">
                          {activeTab === 'FAVORITES' ? '暂无收藏的应用' : '没有找到匹配的应用'}
                      </p>
                  </div>
              )}
          </section>
      </div>

      {/* --- All Apps Modal (New) --- */}
      {isAllAppsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
               {/* Header */}
               <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white z-10">
                  <h2 className="text-xl font-bold text-slate-800">{modalMode === 'HISTORY' ? '历史记录' : '所有应用'}</h2>
                  <button onClick={() => setIsAllAppsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                      <X size={20} />
                  </button>
               </div>
               
               {/* Filter Bar */}
               <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center">
                   <div className="relative flex-1 w-full">
                       <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input 
                         type="text" 
                         placeholder="搜索应用名称或描述..." 
                         value={modalSearch}
                         onChange={(e) => setModalSearch(e.target.value)}
                         className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                       />
                   </div>
                   <div className="flex gap-3 w-full md:w-auto" ref={modalFiltersRef}>
                        <FilterDropdown 
                            label="全部类型"
                            value={modalTypeFilter === 'WORKFLOW' ? '工作流' : modalTypeFilter === 'ASSISTANT' ? '智能助手' : 'ALL'}
                            options={[
                                { label: '工作流', value: 'WORKFLOW' },
                                { label: '智能助手', value: 'ASSISTANT' }
                            ]}
                            onSelect={(val: any) => setModalTypeFilter(val)}
                            isOpen={isModalTypeOpen}
                            setIsOpen={setIsModalTypeOpen}
                            onCloseOther={() => setIsModalTagOpen(false)}
                        />
                        
                        <FilterDropdown 
                            label="全部标签"
                            value={modalTagFilter}
                            options={allTags}
                            onSelect={(val: any) => setModalTagFilter(val)}
                            isOpen={isModalTagOpen}
                            setIsOpen={setIsModalTagOpen}
                            onCloseOther={() => setIsModalTypeOpen(false)}
                            width="w-40"
                        />
                   </div>
               </div>

               {/* Grid Content */}
               <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                   {modalFilteredApps.length > 0 ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                           {modalFilteredApps.map(app => (
                               <AppCard 
                                    key={`modal-${app.id}`} 
                                    app={app} 
                                    handleAppClick={(app) => { setIsAllAppsModalOpen(false); handleAppClick(app); }} 
                                    favorites={favorites} 
                                    toggleFavorite={toggleFavorite} 
                                    onRemoveFromHistory={modalMode === 'HISTORY' ? removeFromHistory : undefined}
                                />
                           ))}
                       </div>
                   ) : (
                       <div className="h-full flex flex-col items-center justify-center text-slate-400">
                           <Filter size={48} className="mb-4 opacity-20" />
                           <p>没有找到匹配的应用。</p>
                       </div>
                   )}
               </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AppCenter;