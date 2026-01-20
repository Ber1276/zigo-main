import React, { useState } from 'react';
import { useAppContext } from '../App';
import { ToolDefinition } from '../types';
import { Play, Zap, MoreHorizontal, Settings, CheckCircle2 } from 'lucide-react';

const WorkflowSimulator: React.FC = () => {
  const { tools } = useAppContext();
  const [selectedNodeTool, setSelectedNodeTool] = useState<ToolDefinition | null>(null);
  const [nodeParams, setNodeParams] = useState<Record<string, any>>({});
  const [executionResult, setExecutionResult] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleToolSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tool = tools.find(t => t.id === e.target.value) || null;
    setSelectedNodeTool(tool);
    setNodeParams({});
    setExecutionResult(null);
  };

  const executeNode = () => {
    if (!selectedNodeTool) return;
    setIsExecuting(true);
    setExecutionResult(null);
    
    // Simulate API delay
    setTimeout(() => {
      setExecutionResult(JSON.stringify({
        status: 'success',
        code: 200,
        data: {
          message: `Executed ${selectedNodeTool.name} successfully`,
          received_params: nodeParams,
          timestamp: new Date().toISOString()
        }
      }, null, 2));
      setIsExecuting(false);
    }, 1200);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden rounded-xl border border-slate-200 shadow-inner">
      {/* Canvas Background Grid */}
      <div className="absolute inset-0 pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          opacity: 0.5
        }}
      />

      <div className="relative z-10 flex h-full">
        {/* Main Canvas Area */}
        <div className="flex-1 p-10 flex flex-col items-center justify-center">
            
            {/* Start Node */}
            <div className="mb-12">
               <div className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg ring-4 ring-slate-200">
                 <Zap fill="currentColor" size={24} />
               </div>
               <div className="h-12 w-0.5 bg-slate-400 mx-auto mt-2"></div>
            </div>

            {/* The Tool Node */}
            <div className="w-80 bg-white rounded-lg shadow-xl border border-orange-500 ring-2 ring-orange-100 flex flex-col overflow-hidden relative group">
                {/* Node Header */}
                <div className="bg-orange-600 px-4 py-2 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                     <span className="font-bold text-sm">自定义工具</span>
                  </div>
                  <Settings size={14} className="opacity-70" />
                </div>
                
                {/* Node Body */}
                <div className="p-4 space-y-4">
                   <div className="space-y-1">
                     <label className="text-xs font-semibold text-slate-500 uppercase">选择工具</label>
                     <select 
                       className="w-full text-sm border-b border-slate-300 py-1 focus:border-orange-500 outline-none bg-transparent"
                       onChange={handleToolSelect}
                       value={selectedNodeTool?.id || ''}
                     >
                       <option value="">-- 请选择 --</option>
                       {tools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                     </select>
                   </div>
                   
                   {selectedNodeTool && (
                     <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                        <p className="font-mono text-orange-600 mb-1">{selectedNodeTool.method} {selectedNodeTool.endpoint}</p>
                        <p>{selectedNodeTool.description.substring(0, 60)}...</p>
                     </div>
                   )}
                </div>

                {/* Connection Points */}
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-slate-400 rounded-full"></div>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-slate-400 rounded-full"></div>
            </div>

            {/* End Node Mock */}
             <div className="mt-2">
               <div className="h-12 w-0.5 bg-slate-300 mx-auto border-l-2 border-dashed border-slate-300"></div>
               <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center mx-auto border border-slate-300">
                  <MoreHorizontal size={20} />
               </div>
            </div>

        </div>

        {/* Right Sidebar: Node Config */}
        <div className="w-96 bg-white border-l border-slate-200 shadow-xl flex flex-col h-full transition-transform transform translate-x-0">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
             <h3 className="font-bold text-slate-800">节点属性</h3>
             <button 
                onClick={executeNode}
                disabled={!selectedNodeTool || isExecuting}
                className="bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors"
             >
               {isExecuting ? '执行中...' : <><Play size={12} fill="currentColor" /> 执行节点</>}
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {!selectedNodeTool ? (
              <div className="text-center text-slate-400 mt-20">
                <Settings size={48} className="mx-auto mb-4 opacity-20" />
                <p>请在画布中选择一个工具以配置参数。</p>
              </div>
            ) : (
              <div className="space-y-6">
                 <div>
                   <h4 className="text-sm font-semibold text-slate-900 mb-4">参数设置</h4>
                   <div className="space-y-4">
                     {selectedNodeTool.parameters.map(param => (
                       <div key={param.id} className="space-y-1">
                          <label className="text-xs font-medium text-slate-600 flex justify-between">
                            {param.label}
                            {param.required && <span className="text-red-400">*</span>}
                          </label>
                          {param.type === 'BOOLEAN' ? (
                            <select
                                className="w-full text-sm p-2 border border-slate-200 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                                onChange={(e) => setNodeParams({...nodeParams, [param.key]: e.target.value === 'true'})}
                            >
                                <option value="false">否 (False)</option>
                                <option value="true">是 (True)</option>
                            </select>
                          ) : (
                            <input 
                              type={param.type === 'NUMBER' ? 'number' : 'text'}
                              className="w-full text-sm p-2 border border-slate-200 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                              placeholder={param.description}
                              onChange={(e) => setNodeParams({...nodeParams, [param.key]: e.target.value})}
                            />
                          )}
                          <p className="text-[10px] text-slate-400 font-mono">key: {param.key}</p>
                       </div>
                     ))}
                   </div>
                 </div>

                 {executionResult && (
                   <div className="animate-in slide-in-from-bottom-5 fade-in duration-300">
                     <div className="flex items-center gap-2 text-green-600 text-sm font-bold mb-2">
                       <CheckCircle2 size={16} /> 输出数据
                     </div>
                     <div className="bg-slate-900 rounded-lg p-3 overflow-x-auto shadow-inner">
                       <pre className="text-xs font-mono text-green-400 leading-relaxed">
                         {executionResult}
                       </pre>
                     </div>
                   </div>
                 )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowSimulator;