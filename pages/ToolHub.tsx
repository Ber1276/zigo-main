import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { ToolDefinition, UserRole, ToolType } from '../types';
import { simulateApiCall } from '../services/geminiService';
import { 
  Search, 
  Globe, 
  Tag, 
  Clock, 
  Trash, 
  X, 
  ExternalLink,
  PlusCircle,
  LayoutDashboard,
  PlayCircle,
  Code,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Settings,
  Lock,
  User as UserIcon,
  Server,
  Cpu,
  Pencil,
  Terminal,
  Copy
} from 'lucide-react';

type TabType = 'ALL' | 'API_LIB' | 'MCP_LIB' | 'MY_TOOLS';

const ToolHub: React.FC = () => {
  const { tools, deleteTool, role } = useAppContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(null);
  
  // Tab State: Default Admin sees all, User sees API Lib
  const [currentToolTab, setCurrentToolTab] = useState<TabType>(role === UserRole.ADMIN ? 'ALL' : 'API_LIB');

  // Test Run State
  const [activeModalTab, setActiveModalTab] = useState<'overview' | 'test'>('overview');
  const [testParams, setTestParams] = useState<Record<string, any>>({});
  const [testLoading, setTestLoading] = useState(false);
  const [testResponse, setTestResponse] = useState<any>(null);

  // API Docs Modal
  const [showApiDocs, setShowApiDocs] = useState(false);

  // Filter Logic
  const filteredTools = tools.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || 
                          t.description.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;

    if (role === UserRole.ADMIN) {
        if (currentToolTab === 'ALL') return true;
        if (currentToolTab === 'API_LIB') return t.type === ToolType.API; // "API Tools" for Admin
        if (currentToolTab === 'MCP_LIB') return t.type === ToolType.MCP; // "MCP Tools" for Admin
    } else {
        // User Role
        // API Library: API Tools created by System
        if (currentToolTab === 'API_LIB') return t.type === ToolType.API && t.createdBy === 'System';
        // MCP Library: MCP Tools created by System
        if (currentToolTab === 'MCP_LIB') return t.type === ToolType.MCP && t.createdBy === 'System';
        // My Tools: Any tool created by User
        if (currentToolTab === 'MY_TOOLS') return t.createdBy === 'User';
    }
    return false;
  });

  const handleOpenTool = (tool: ToolDefinition) => {
    setSelectedTool(tool);
    setActiveModalTab('overview');
    setTestParams({});
    setTestResponse(null);
  };

  const handleEdit = (e: React.MouseEvent, tool: ToolDefinition) => {
    e.stopPropagation();
    // Navigate to registry with tool data in state for editing
    navigate('/register', { state: { tool: tool } });
  };

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`确定要删除工具 "${name}" 吗？此操作无法撤销。`)) {
      deleteTool(id);
      if (selectedTool?.id === id) {
        setSelectedTool(null);
      }
    }
  };

  const runTest = async () => {
    if (!selectedTool) return;
    setTestLoading(true);
    setTestResponse(null);
    try {
      const result = await simulateApiCall(selectedTool, testParams);
      setTestResponse(result);
    } catch (e) {
      setTestResponse({ error: "Failed to run test", details: String(e) });
    } finally {
      setTestLoading(false);
    }
  };

  // Determine which tabs to show based on role
  const renderTabs = () => {
    if (role === UserRole.ADMIN) {
        return (
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setCurrentToolTab('ALL')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${currentToolTab === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>全部</button>
                <button onClick={() => setCurrentToolTab('API_LIB')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${currentToolTab === 'API_LIB' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>API 工具库</button>
                <button onClick={() => setCurrentToolTab('MCP_LIB')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${currentToolTab === 'MCP_LIB' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>MCP 工具库</button>
            </div>
        );
    } else {
        return (
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setCurrentToolTab('API_LIB')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${currentToolTab === 'API_LIB' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>API 工具库</button>
                <button onClick={() => setCurrentToolTab('MCP_LIB')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${currentToolTab === 'MCP_LIB' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>MCP 工具库</button>
                <button onClick={() => setCurrentToolTab('MY_TOOLS')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${currentToolTab === 'MY_TOOLS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>我的工具</button>
            </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">工具中心</h1>
          <p className="text-slate-500 mt-1">
             {role === UserRole.ADMIN ? '全系统 API 与 MCP 工具管理。' : '探索系统工具或管理您的私有扩展。'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowApiDocs(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
          >
            <Code size={18} />
            API 文档
          </button>
          {role === UserRole.ADMIN && (
              <button 
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
              >
                <LayoutDashboard size={18} />
                数据看板
              </button>
          )}
          
          <button 
            onClick={() => navigate('/register')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors shadow-sm"
          >
            <PlusCircle size={18} />
            注册工具
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
         {renderTabs()}
         
         <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="搜索工具..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none shadow-sm text-sm"
            />
         </div>
      </div>

      {/* Tool Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map(tool => {
            // Permission Logic: Admin edits all, User edits own
            const isOwner = tool.createdBy === 'User';
            const canEdit = role === UserRole.ADMIN || isOwner;

            return (
              <div 
                key={tool.id}
                onClick={() => handleOpenTool(tool)}
                className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:shadow-lg hover:border-orange-200 transition-all group duration-300 relative overflow-hidden"
              >
                <div className="flex items-start justify-between mb-3">
                   <div className="flex items-center gap-3">
                     <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-bold text-xl group-hover:text-white transition-colors shadow-sm
                        ${tool.type === ToolType.API 
                            ? 'bg-blue-50 border-blue-100 text-blue-600 group-hover:bg-blue-600' 
                            : 'bg-purple-50 border-purple-100 text-purple-600 group-hover:bg-purple-600'
                        }
                     `}>
                       {tool.type === ToolType.API ? <Globe size={24} /> : <Cpu size={24} />}
                     </div>
                     <div>
                       <h3 className="font-bold text-slate-900 text-lg group-hover:text-orange-600 transition-colors">{tool.name}</h3>
                       <div className="flex items-center gap-2">
                           <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">{tool.category}</span>
                           <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-medium ${
                               tool.type === ToolType.MCP ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                           }`}>
                               {tool.type === ToolType.MCP ? 'MCP' : 'API'}
                           </span>
                       </div>
                     </div>
                   </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                         tool.method === 'GET' ? 'bg-green-50 text-green-700 border-green-200' : 
                         tool.method === 'POST' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                         tool.method === 'MCP' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                         'bg-gray-50 text-gray-600 border-gray-200'
                     }`}>
                         {tool.method}
                     </span>
                     {tool.createdBy === 'System' && (
                        <span className="text-[10px] flex items-center gap-0.5 text-slate-400">
                            <Lock size={10} /> 官方
                        </span>
                     )}
                     {tool.createdBy === 'User' && (
                        <span className="text-[10px] flex items-center gap-0.5 text-slate-400">
                            <UserIcon size={10} /> 自定义
                        </span>
                     )}
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2 h-10 leading-relaxed">
                    {tool.description}
                  </p>
                </div>
    
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                   <div className="flex items-center gap-1 text-xs text-slate-400">
                     <Clock size={12} />
                     <span>v{tool.version}</span>
                   </div>
                   <div className="flex items-center gap-2">
                     {canEdit && (
                       <>
                           <button 
                            onClick={(e) => handleEdit(e, tool)}
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                            title="编辑工具"
                           >
                             <Pencil size={14} />
                           </button>
                           <button 
                            onClick={(e) => handleDelete(e, tool.id, tool.name)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="删除工具"
                           >
                             <Trash size={14} />
                           </button>
                       </>
                     )}
                   </div>
                </div>
              </div>
            );
        })}

        {filteredTools.length === 0 && (
          <div className="col-span-full text-center py-16 bg-white rounded-xl border border-slate-200 border-dashed">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
               <Search className="text-slate-300" size={32} />
            </div>
            <p className="text-slate-500">此分类下暂无工具。</p>
            {(role === UserRole.ADMIN || currentToolTab === 'MY_TOOLS') && (
                <button onClick={() => navigate('/register')} className="mt-4 text-orange-600 font-medium hover:underline">
                  去注册一个？
                </button>
            )}
          </div>
        )}
      </div>

      {/* API Docs Modal */}
      {showApiDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden transform transition-all scale-100">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Terminal size={18} className="text-slate-500" />
                    开发者 API 访问
                 </h3>
                 <button onClick={() => setShowApiDocs(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              
              <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                 <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700 leading-relaxed border border-blue-100">
                    您可以通过 REST API 编程访问工具中心，获取可用工具列表及其详细定义。
                    请在请求头中包含您的 API 令牌。
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">获取所有工具</label>
                    <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-slate-300 relative group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-green-400 font-bold">GET</span>
                            <span className="text-slate-500">https://api.zigo.dev/v1/tools</span>
                        </div>
                        <div className="pl-4 border-l-2 border-slate-700">
                            curl -X GET https://api.zigo.dev/v1/tools \<br/>
                            &nbsp;&nbsp;-H "Authorization: Bearer <span className="text-yellow-400">YOUR_API_TOKEN</span>"
                        </div>
                        <button className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-white bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            <Copy size={14} />
                        </button>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">响应示例</label>
                    <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-blue-300 overflow-x-auto">
{`{
  "data": [
    {
      "id": "1",
      "name": "SlackNotifier",
      "description": "Post messages to Slack",
      "method": "POST",
      "baseUrl": "https://hooks.slack.com",
      "endpoint": "/services/...",
      "parameters": [
        {
          "key": "text",
          "type": "STRING",
          "required": true
        }
      ]
    },
    ...
  ],
  "meta": {
    "total": 24,
    "page": 1
  }
}`}
                    </div>
                 </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                  <button onClick={() => setShowApiDocs(false)} className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-medium text-sm transition-colors">
                      关闭
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* Tool Detail & Test Modal */}
      {selectedTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/80 backdrop-blur">
               <div className="flex gap-4">
                  <div className={`w-16 h-16 rounded-2xl shadow-md border border-slate-100 flex items-center justify-center text-3xl font-bold
                    ${selectedTool.type === ToolType.API ? 'text-blue-600 bg-blue-50' : 'text-purple-600 bg-purple-50'}
                  `}>
                     {selectedTool.type === ToolType.API ? <Globe size={32} /> : <Cpu size={32} />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{selectedTool.name}</h2>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-200 rounded-md"><Tag size={12} /> {selectedTool.category}</span>
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-200 rounded-md font-mono">
                          {selectedTool.type === ToolType.API ? <Globe size={12} /> : <Server size={12} />}
                          {selectedTool.baseUrl}
                      </span>
                      {selectedTool.type === ToolType.MCP && <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded text-xs font-medium">MCP Protocol</span>}
                    </div>
                  </div>
               </div>
               <button onClick={() => setSelectedTool(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition-colors">
                 <X size={24} />
               </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-6">
              <button 
                onClick={() => setActiveModalTab('overview')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeModalTab === 'overview' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                概览
              </button>
              <button 
                onClick={() => setActiveModalTab('test')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeModalTab === 'test' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <PlayCircle size={16} />
                调试运行
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-0 bg-slate-50">
               {activeModalTab === 'overview' ? (
                 <div className="p-8 space-y-8">
                   <section>
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                         {selectedTool.type === ToolType.API ? 'API Endpoint' : 'MCP Capability'}
                     </h4>
                     <div className="flex items-center gap-3 font-mono text-sm bg-slate-900 text-slate-300 p-4 rounded-xl shadow-inner border border-slate-800">
                       <span className={`font-bold px-2 py-1 rounded ${
                           selectedTool.method === 'GET' ? 'bg-blue-500/20 text-blue-400' : 
                           selectedTool.method === 'POST' ? 'bg-green-500/20 text-green-400' :
                           'bg-purple-500/20 text-purple-400'
                       }`}>{selectedTool.method}</span>
                       <span className="text-white">{selectedTool.endpoint}</span>
                     </div>
                     <p className="mt-3 text-slate-600 leading-relaxed">{selectedTool.description}</p>
                   </section>

                   <section>
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">参数定义</h4>
                     <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50/50 text-slate-600 font-medium border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-3">Key</th>
                              <th className="px-6 py-3">Type</th>
                              <th className="px-6 py-3">必填</th>
                              <th className="px-6 py-3">描述</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedTool.parameters.map(param => (
                              <tr key={param.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-3 font-mono text-slate-700 font-medium">{param.key}</td>
                                <td className="px-6 py-3">
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">{param.type}</span>
                                </td>
                                <td className="px-6 py-3">
                                  {param.required ? 
                                    <span className="text-red-600 text-xs font-bold flex items-center gap-1"><AlertCircle size={12}/> 是</span> : 
                                    <span className="text-slate-400 text-xs">否</span>
                                  }
                                </td>
                                <td className="px-6 py-3 text-slate-600">{param.description || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                     </div>
                   </section>

                   <section>
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Payload 示例</h4>
                     <div className="bg-slate-900 rounded-xl p-5 shadow-inner">
                        <pre className="text-xs font-mono text-blue-300 overflow-x-auto">
    {JSON.stringify({
      tool: selectedTool.name,
      type: selectedTool.type,
      method: selectedTool.method,
      params: selectedTool.parameters.reduce((acc: any, p) => {
        acc[p.key] = p.type === 'NUMBER' ? 0 : p.type === 'BOOLEAN' ? false : '<value>';
        return acc;
      }, {})
    }, null, 2)}
                        </pre>
                     </div>
                   </section>
                 </div>
               ) : (
                 <div className="p-8 h-full flex flex-col">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                      {/* Left: Input Form */}
                      <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2">
                         <div>
                            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                              <Settings size={16} /> 配置请求参数
                            </h4>
                            <div className="space-y-4">
                              {selectedTool.parameters.map(param => (
                                <div key={param.id} className="space-y-1.5">
                                  <label className="text-xs font-medium text-slate-600 flex justify-between">
                                    <span>{param.label} <span className="text-slate-400 font-normal">({param.key})</span></span>
                                    {param.required && <span className="text-red-500 text-[10px]">必填</span>}
                                  </label>
                                  {param.type === 'BOOLEAN' ? (
                                    <select
                                      className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                      onChange={(e) => setTestParams({...testParams, [param.key]: e.target.value === 'true'})}
                                    >
                                      <option value="false">False</option>
                                      <option value="true">True</option>
                                    </select>
                                  ) : (
                                    <input 
                                      type={param.type === 'NUMBER' ? 'number' : 'text'}
                                      className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-slate-300"
                                      placeholder={`输入 ${param.key}...`}
                                      onChange={(e) => setTestParams({...testParams, [param.key]: e.target.value})}
                                    />
                                  )}
                                </div>
                              ))}
                              {selectedTool.parameters.length === 0 && (
                                <p className="text-sm text-slate-400 italic">此工具无需参数。</p>
                              )}
                            </div>
                         </div>
                         <button 
                            onClick={runTest}
                            disabled={testLoading}
                            className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium shadow-sm transition-all flex items-center justify-center gap-2"
                         >
                            {testLoading ? <Loader2 className="animate-spin" size={18} /> : <PlayCircle size={18} />}
                            {testLoading ? '请求中...' : '发送请求 (模拟)'}
                         </button>
                      </div>

                      {/* Right: Console Output */}
                      <div className="lg:col-span-2 flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-800">
                         <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
                            <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
                              <Code size={12} /> 控制台输出
                            </span>
                            {testResponse && (
                               <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                                 200 OK
                               </span>
                            )}
                         </div>
                         <div className="flex-1 p-4 overflow-auto font-mono text-sm">
                            {!testResponse && !testLoading && (
                              <div className="h-full flex flex-col items-center justify-center text-slate-600">
                                <Code size={48} className="mb-4 opacity-20" />
                                <p>等待请求...</p>
                              </div>
                            )}
                            {testLoading && (
                               <div className="h-full flex items-center justify-center space-x-2 text-slate-400">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                               </div>
                            )}
                            {testResponse && (
                               <pre className="text-green-400 whitespace-pre-wrap animate-in fade-in slide-in-from-bottom-2">
                                 {JSON.stringify(testResponse, null, 2)}
                               </pre>
                            )}
                         </div>
                      </div>
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolHub;