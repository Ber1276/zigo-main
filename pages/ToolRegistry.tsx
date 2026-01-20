import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../App';
import { ToolDefinition, ToolParameter, ParameterType, ToolType } from '../types';
import { generateToolFromDescription } from '../services/geminiService';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  Wand2, 
  Code,
  ArrowLeft,
  Globe,
  Cpu
} from 'lucide-react';

const ToolRegistry: React.FC = () => {
  const { addTool, updateTool, setIsUnsavedChanges, isUnsavedChanges } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [originalCreatedAt, setOriginalCreatedAt] = useState<string | null>(null);

  // Form State
  const [toolType, setToolType] = useState<ToolType>(ToolType.API);
  const [toolName, setToolName] = useState('');
  const [description, setDescription] = useState('');
  const [method, setMethod] = useState<'GET'|'POST'|'PUT'|'DELETE'|'PATCH'|'MCP'>('GET');
  const [baseUrl, setBaseUrl] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [category, setCategory] = useState('通用');
  const [parameters, setParameters] = useState<ToolParameter[]>([]);

  // Initialize form if editing
  useEffect(() => {
    if (location.state && location.state.tool) {
      const tool = location.state.tool as ToolDefinition;
      setEditingId(tool.id);
      setOriginalCreatedAt(tool.createdAt);
      setToolType(tool.type);
      setToolName(tool.name);
      setDescription(tool.description);
      setMethod(tool.method);
      setBaseUrl(tool.baseUrl);
      setEndpoint(tool.endpoint);
      setCategory(tool.category);
      setParameters(tool.parameters);
    }
    
    // Cleanup: Ensure flag is reset when unmounting
    return () => setIsUnsavedChanges(false);
  }, [location.state, setIsUnsavedChanges]);

  // Helper to mark dirty
  const markDirty = () => {
    if (!isUnsavedChanges) setIsUnsavedChanges(true);
  };

  const handleMagicFill = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const generated = await generateToolFromDescription(prompt);
      if (generated) {
        if (generated.name) setToolName(generated.name);
        if (generated.description) setDescription(generated.description);
        if (generated.method) setMethod(generated.method);
        if (generated.baseUrl) setBaseUrl(generated.baseUrl);
        if (generated.endpoint) setEndpoint(generated.endpoint);
        if (generated.parameters) setParameters(generated.parameters as ToolParameter[]);
        markDirty();
      }
    } catch (e) {
      console.error(e);
      alert('生成配置失败，请检查 API Key。');
    } finally {
      setIsGenerating(false);
    }
  };

  const addParameter = () => {
    setParameters([
      ...parameters,
      {
        id: Math.random().toString(36).substr(2, 9),
        key: '',
        label: '',
        type: ParameterType.STRING,
        required: false
      }
    ]);
    markDirty();
  };

  const updateParameter = (id: string, field: keyof ToolParameter, value: any) => {
    setParameters(parameters.map(p => p.id === id ? { ...p, [field]: value } : p));
    markDirty();
  };

  const removeParameter = (id: string) => {
    setParameters(parameters.filter(p => p.id !== id));
    markDirty();
  };

  const handleCancel = () => {
    if (isUnsavedChanges) {
        if (!window.confirm('您有未保存的更改，确定要取消吗？')) {
            return;
        }
    }
    setIsUnsavedChanges(false);
    navigate('/tools');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const toolPayload: ToolDefinition = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      name: toolName,
      description,
      method: toolType === ToolType.MCP ? 'MCP' : method,
      baseUrl,
      endpoint,
      category,
      version: '1.0.0',
      parameters,
      createdBy: 'User', // In a real app, preserve the original creator if editing
      type: toolType,
      status: 'ACTIVE',
      createdAt: originalCreatedAt || new Date().toISOString()
    };

    if (editingId) {
        updateTool(toolPayload);
    } else {
        addTool(toolPayload);
    }
    
    setIsUnsavedChanges(false);
    navigate('/tools'); // Return to Tool Hub
  };

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

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center gap-4">
        <button 
            onClick={handleCancel}
            className="p-2 text-slate-500 hover:bg-slate-200 rounded-full transition-colors"
        >
            <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{editingId ? '编辑工具' : '注册新工具'}</h1>
          <p className="text-slate-500 mt-1">
              {editingId ? '修改现有的工具定义。' : '配置可在工作流中使用的外部 API 或 MCP 协议工具。'}
          </p>
        </div>
      </div>

      {/* AI Assistant Section */}
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
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="curl -X POST https://api.example.com/data -d 'value=123' ..."
                className="w-full p-4 pr-32 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] text-sm font-mono"
              />
              <button
                onClick={handleMagicFill}
                disabled={isGenerating || !prompt}
                className="absolute bottom-3 right-3 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
                {isGenerating ? '生成中' : '生成配置'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Code size={18} className="text-slate-500" />
            基本信息
          </h3>
        </div>
        
        <div className="p-6 space-y-6">
           {/* Tool Type Selector */}
           <div className="grid grid-cols-2 gap-4">
             <div 
               onClick={() => { setToolType(ToolType.API); markDirty(); }}
               className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${toolType === ToolType.API ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'}`}
             >
               <div className={`p-2 rounded-lg ${toolType === ToolType.API ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                 <Globe size={24} />
               </div>
               <div>
                 <p className={`font-bold ${toolType === ToolType.API ? 'text-blue-700' : 'text-slate-700'}`}>HTTP API</p>
                 <p className="text-xs text-slate-500">传统的 RESTful 接口集成</p>
               </div>
             </div>
             <div 
               onClick={() => { setToolType(ToolType.MCP); markDirty(); }}
               className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${toolType === ToolType.MCP ? 'border-purple-500 bg-purple-50/50' : 'border-slate-200 hover:border-slate-300'}`}
             >
               <div className={`p-2 rounded-lg ${toolType === ToolType.MCP ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                 <Cpu size={24} />
               </div>
               <div>
                 <p className={`font-bold ${toolType === ToolType.MCP ? 'text-purple-700' : 'text-slate-700'}`}>MCP 工具</p>
                 <p className="text-xs text-slate-500">Model Context Protocol 集成</p>
               </div>
             </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">工具名称 (PascalCase)</label>
                <input 
                  required
                  value={toolName}
                  onChange={(e) => { setToolName(e.target.value); markDirty(); }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                  placeholder={toolType === ToolType.API ? "例如：WeatherFetcher" : "例如：FileSystemAccess"}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">分类</label>
                <input 
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); markDirty(); }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                  placeholder="例如：生产力"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium text-slate-700">描述</label>
                <textarea 
                  required
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); markDirty(); }}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                  placeholder="这个工具是做什么的？"
                />
              </div>

              {toolType === ToolType.API && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">HTTP 方法</label>
                  <select 
                    value={method}
                    onChange={(e) => { setMethod(e.target.value as any); markDirty(); }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                  >
                    <option>GET</option>
                    <option>POST</option>
                    <option>PUT</option>
                    <option>PATCH</option>
                    <option>DELETE</option>
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">{toolType === ToolType.API ? 'Base URL' : '连接 URL / Command'}</label>
                <input 
                  required
                  value={baseUrl}
                  onChange={(e) => { setBaseUrl(e.target.value); markDirty(); }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-mono text-sm" 
                  placeholder={toolType === ToolType.API ? "https://api.example.com" : "stdio://cmd or sse://url"}
                />
              </div>

              <div className={toolType === ToolType.API ? "col-span-2 space-y-2" : "col-span-1 space-y-2"}>
                <label className="text-sm font-medium text-slate-700">{toolType === ToolType.API ? 'Endpoint 路径' : '工具/能力名称'}</label>
                <div className="flex items-center">
                  {toolType === ToolType.API && (
                    <span className="bg-slate-100 border border-r-0 border-slate-300 text-slate-500 px-3 py-2 rounded-l-lg font-mono text-sm">
                      {method}
                    </span>
                  )}
                  <input 
                    required
                    value={endpoint}
                    onChange={(e) => { setEndpoint(e.target.value); markDirty(); }}
                    className={`flex-1 px-3 py-2 border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none font-mono text-sm ${toolType === ToolType.API ? 'rounded-r-lg' : 'rounded-lg'}`}
                    placeholder={toolType === ToolType.API ? "/v1/resource" : "read_file"}
                  />
                </div>
              </div>
           </div>
        </div>

        {/* Dynamic Parameters */}
        <div className="p-6 border-t border-slate-200 bg-slate-50/30">
          <div className="flex items-center justify-between mb-4">
             <h3 className="font-semibold text-slate-800">参数配置</h3>
             <button 
              type="button"
              onClick={addParameter}
              className="text-sm text-orange-600 font-medium hover:text-orange-700 flex items-center gap-1"
             >
               <Plus size={16} /> 添加参数
             </button>
          </div>

          <div className="space-y-3">
            {parameters.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm">
                暂无参数。请手动添加或使用智能填充。
              </div>
            )}
            {parameters.map((param, index) => (
              <div key={param.id} className="flex gap-3 items-start p-3 bg-white border border-slate-200 rounded-lg shadow-sm animate-fade-in group">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500 mt-2">
                  {index + 1}
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                   <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">参数键 (Key)</label>
                      <input 
                        value={param.key}
                        onChange={(e) => updateParameter(param.id, 'key', e.target.value)}
                        placeholder="例如：city_name"
                        className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded focus:border-orange-500 outline-none"
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">标签 (UI Label)</label>
                      <input 
                        value={param.label}
                        onChange={(e) => updateParameter(param.id, 'label', e.target.value)}
                        placeholder="例如：城市名称"
                        className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded focus:border-orange-500 outline-none"
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">类型</label>
                      <select 
                        value={param.type}
                        onChange={(e) => updateParameter(param.id, 'type', e.target.value)}
                        className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded focus:border-orange-500 outline-none"
                      >
                        {Object.values(ParameterType).map(t => <option key={t} value={t}>{getParameterTypeLabel(t)}</option>)}
                      </select>
                   </div>
                   <div className="flex items-center gap-4 pt-5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={param.required}
                          onChange={(e) => updateParameter(param.id, 'required', e.target.checked)}
                          className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                        />
                        <span className="text-xs text-slate-600">必填</span>
                      </label>
                      <button 
                        type="button"
                        onClick={() => removeParameter(param.id)}
                        className="ml-auto text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button 
            type="submit" 
            className="px-6 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2"
          >
            <Save size={16} />
            {editingId ? '保存更改' : '注册工具'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ToolRegistry;