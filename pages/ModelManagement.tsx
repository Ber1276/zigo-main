import React, { useState, useEffect } from 'react';
import { useAppContext } from '../App';
import { ModelDefinition, ModelProvider, UserRole } from '../types';
import { 
  BrainCircuit, 
  Server, 
  Activity, 
  Plus, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  X, 
  CheckCircle2, 
  XCircle, 
  Save, 
  RefreshCcw,
  Zap,
  Cpu,
  Settings,
  Loader2
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const ModelManagement: React.FC = () => {
  const { models, role, addModel, updateModel, deleteModel, setIsUnsavedChanges, isUnsavedChanges } = useAppContext();
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelDefinition | null>(null);
  
  // Test Connection State
  const [testingId, setTestingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<ModelDefinition>>({});
  
  // Mock Data: Different stats for Admin vs User
  const adminStats = {
    total: models.length,
    online: models.filter(m => m.status === 'ONLINE').length,
    requests24h: '128.5k',
    avgTokensSec: '480',
    healthStatus: '运行良好'
  };

  const userStats = {
    total: models.length, // User can see all models available
    online: models.filter(m => m.status === 'ONLINE').length,
    requests24h: '2.4k', // User's own calls
    avgTokensSec: '45',  // User's throughput
    healthStatus: '正常'
  };

  const stats = role === UserRole.ADMIN ? adminStats : userStats;

  const performanceData = [
    { time: '00:00', latency: 45 },
    { time: '04:00', latency: 42 },
    { time: '08:00', latency: 55 },
    { time: '12:00', latency: 120 },
    { time: '16:00', latency: 85 },
    { time: '20:00', latency: 60 },
    { time: '23:59', latency: 50 },
  ];

  const handleOpenModal = (model?: ModelDefinition) => {
    if (model) {
      setEditingModel(model);
      setFormData(model);
    } else {
      setEditingModel(null);
      setFormData({
        provider: ModelProvider.OLLAMA,
        status: 'ONLINE',
        contextWindow: 4096,
        createdAt: new Date().toISOString()
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isUnsavedChanges) {
      if (!window.confirm("放弃未保存的更改？")) return;
    }
    setIsModalOpen(false);
    setIsUnsavedChanges(false);
    setFormData({});
  };

  const handleFormChange = (key: keyof ModelDefinition, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (!isUnsavedChanges) setIsUnsavedChanges(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.baseUrl || !formData.modelId) return;

    if (editingModel) {
      updateModel({ ...editingModel, ...formData } as ModelDefinition);
    } else {
      addModel({
        id: Math.random().toString(36).substr(2, 9),
        ...formData
      } as ModelDefinition);
    }
    setIsUnsavedChanges(false);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`确定要移除模型 "${name}" 吗？`)) {
      deleteModel(id);
    }
  };

  const handleTestConnection = async (model: ModelDefinition) => {
    setTestingId(model.id);
    
    // Simulate network request delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Randomize success/fail based on existing status (mostly success for simulation)
    const isSuccess = Math.random() > 0.1; 
    
    if (isSuccess) {
        const newLatency = Math.floor(Math.random() * 100) + 20; // 20-120ms
        updateModel({
            ...model,
            status: 'ONLINE',
            latency: newLatency
        });
    } else {
        updateModel({
            ...model,
            status: 'OFFLINE',
            latency: 0
        });
    }
    
    setTestingId(null);
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BrainCircuit className="text-orange-600" /> 
            模型管理
          </h1>
          <p className="text-slate-500 mt-1">
             {role === UserRole.ADMIN 
               ? '管理本地及远程 LLM 推理服务节点，监控全系统调用状态。'
               : '查看可用模型节点及您的个人调用统计。'
             }
          </p>
        </div>
        
        {role === UserRole.ADMIN && (
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-colors shadow-sm"
          >
            <Plus size={18} />
            部署新模型
          </button>
        )}
      </div>

      {/* Dashboard Section within Model Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Key Metrics */}
         <div className="lg:col-span-1 grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
               <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                 <Server size={16} /> 节点状态
               </div>
               <div className="mt-2">
                 <span className="text-3xl font-bold text-slate-900">{stats.online}</span>
                 <span className="text-slate-400 text-sm"> / {stats.total} 在线</span>
               </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
               <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                 <Activity size={16} /> {role === UserRole.ADMIN ? '全网调用 (24h)' : '我的调用 (24h)'}
               </div>
               <div className="mt-2">
                 <span className="text-3xl font-bold text-slate-900">{stats.requests24h}</span>
               </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
               <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                 <Zap size={16} /> {role === UserRole.ADMIN ? '系统吞吐' : '个人吞吐'}
               </div>
               <div className="mt-2">
                 <span className="text-3xl font-bold text-slate-900">{stats.avgTokensSec}</span>
                 <span className="text-xs text-slate-400"> T/s</span>
               </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between bg-gradient-to-br from-green-50 to-white">
               <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                 <CheckCircle2 size={16} /> 健康评分
               </div>
               <div className="mt-2 text-green-600 text-sm font-medium">
                 {stats.healthStatus}
               </div>
            </div>
         </div>

         {/* Mini Chart */}
         <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-4">
             <h3 className="font-semibold text-slate-800">推理延迟监控 (ms) - {role === UserRole.ADMIN ? 'System' : 'Client View'}</h3>
             <select className="text-xs border border-slate-200 rounded px-2 py-1 bg-slate-50 outline-none">
               <option>Llama 3 8B</option>
               <option>Qwen 2.5</option>
             </select>
           </div>
           <div className="h-32 w-full" style={{ minHeight: '128px', minWidth: 0 }}>
             <ResponsiveContainer width="100%" height={128} minHeight={128} minWidth={0}>
               <LineChart data={performanceData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                 <Tooltip contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}} itemStyle={{fontSize: '12px', color: '#334155'}} />
                 <Line type="monotone" dataKey="latency" stroke="#f97316" strokeWidth={2} dot={false} />
               </LineChart>
             </ResponsiveContainer>
           </div>
         </div>
      </div>

      {/* Model List */}
      <div>
         <div className="flex items-center justify-between mb-4">
           <h3 className="text-lg font-bold text-slate-800">已注册模型</h3>
           <button 
             onClick={() => models.forEach(m => handleTestConnection(m))}
             className="text-sm text-slate-500 hover:text-orange-600 flex items-center gap-1"
           >
             <RefreshCcw size={14} /> 刷新全部状态
           </button>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {models.map(model => (
               <div key={model.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                       <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg
                            ${model.provider === ModelProvider.OLLAMA ? 'bg-slate-900 text-white' : 
                              model.provider === ModelProvider.VLLM ? 'bg-blue-100 text-blue-600' :
                              'bg-purple-100 text-purple-600'}
                          `}>
                            {model.provider === ModelProvider.OLLAMA ? '🦙' : <Cpu size={20} />}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">{model.name}</h4>
                            <div className="flex items-center gap-2 text-xs">
                              <span className={`px-1.5 py-0.5 rounded font-medium flex items-center gap-1
                                ${model.status === 'ONLINE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                              `}>
                                <div className={`w-1.5 h-1.5 rounded-full ${model.status === 'ONLINE' ? 'bg-green-600' : 'bg-red-600'}`}></div>
                                {model.status}
                              </span>
                              <span className="text-slate-400">|</span>
                              <span className="text-slate-500">{model.provider}</span>
                            </div>
                          </div>
                       </div>
                       
                       {role === UserRole.ADMIN && (
                         <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleOpenModal(model)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(model.id, model.name)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                         </div>
                       )}
                    </div>

                    <div className="space-y-3 text-sm">
                       <div className="flex items-center justify-between py-1 border-b border-slate-50">
                          <span className="text-slate-500">Model ID</span>
                          <span className="font-mono text-slate-700">{model.modelId}</span>
                       </div>
                       <div className="flex items-center justify-between py-1 border-b border-slate-50">
                          <span className="text-slate-500">Context</span>
                          <span className="font-mono text-slate-700">{model.contextWindow.toLocaleString()}</span>
                       </div>
                       <div className="flex items-center justify-between py-1 border-b border-slate-50">
                          <span className="text-slate-500">Host</span>
                          <span className="font-mono text-slate-700 truncate max-w-[150px]" title={model.baseUrl}>{model.baseUrl}</span>
                       </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                     <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Activity size={12} />
                        Latency: <span className={`font-medium ${model.latency && model.latency > 100 ? 'text-orange-600' : 'text-green-600'}`}>
                            {model.latency ? `${model.latency} ms` : '-'}
                        </span>
                     </div>
                     <button 
                        onClick={() => handleTestConnection(model)}
                        disabled={testingId === model.id}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        {testingId === model.id ? (
                            <>
                                <Loader2 size={10} className="animate-spin" />
                                测试中...
                            </>
                        ) : '测试连接'}
                     </button>
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* Admin Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2">
                   <Settings size={18} className="text-slate-500" />
                   {editingModel ? '配置模型' : '部署新模型'}
                 </h3>
                 <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                   <X size={20} />
                 </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                 <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                       <label className="text-sm font-medium text-slate-700">显示名称</label>
                       <input 
                         required
                         value={formData.name || ''}
                         onChange={(e) => handleFormChange('name', e.target.value)}
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                         placeholder="e.g. Llama 3 Local"
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-sm font-medium text-slate-700">提供商</label>
                       <select 
                         value={formData.provider}
                         onChange={(e) => handleFormChange('provider', e.target.value)}
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm bg-white"
                       >
                         {Object.values(ModelProvider).map(p => <option key={p} value={p}>{p}</option>)}
                       </select>
                    </div>
                    
                    <div className="col-span-2 space-y-1.5">
                       <label className="text-sm font-medium text-slate-700">服务地址 (Base URL)</label>
                       <div className="flex gap-2">
                          <span className="bg-slate-100 text-slate-500 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono flex items-center">
                             http://
                          </span>
                          <input 
                            required
                            value={formData.baseUrl?.replace(/^https?:\/\//, '') || ''}
                            onChange={(e) => handleFormChange('baseUrl', `http://${e.target.value}`)}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm font-mono"
                            placeholder="localhost:11434"
                          />
                       </div>
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-sm font-medium text-slate-700">模型 ID (API Parameter)</label>
                       <input 
                         required
                         value={formData.modelId || ''}
                         onChange={(e) => handleFormChange('modelId', e.target.value)}
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm font-mono"
                         placeholder="e.g. llama3:8b"
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-sm font-medium text-slate-700">上下文窗口 (Tokens)</label>
                       <input 
                         type="number"
                         value={formData.contextWindow || 4096}
                         onChange={(e) => handleFormChange('contextWindow', parseInt(e.target.value))}
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                       />
                    </div>

                    <div className="col-span-2 space-y-1.5">
                       <label className="text-sm font-medium text-slate-700">描述</label>
                       <textarea 
                         rows={2}
                         value={formData.description || ''}
                         onChange={(e) => handleFormChange('description', e.target.value)}
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                         placeholder="模型用途及特性说明..."
                       />
                    </div>

                    <div className="col-span-2 flex items-center gap-4 pt-2">
                       <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={formData.status === 'ONLINE'}
                            onChange={(e) => handleFormChange('status', e.target.checked ? 'ONLINE' : 'OFFLINE')}
                            className="w-4 h-4 text-orange-600 rounded"
                          />
                          <span className="text-sm text-slate-700">立即启用</span>
                       </label>
                    </div>
                 </div>

                 <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                    <button 
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      取消
                    </button>
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Save size={16} />
                      {editingModel ? '保存更改' : '确认部署'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default ModelManagement;