import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import SmartWorkflows from './SmartWorkflows';
import SmartAssistants from './SmartAssistants';
import { LayoutGrid, Bot, Sparkles } from 'lucide-react';

const SmartStudio: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'workflow' | 'assistant'>(() => {
      const params = new URLSearchParams(location.search);
      return (params.get('tab') as 'workflow' | 'assistant') || 'workflow';
  });

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
           <Sparkles className="text-orange-600" /> 智能工坊
        </h1>
        <p className="text-slate-500 mt-1">
           构建、管理和发布您的自动化工作流与 AI 智能助手。
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
         <button 
           onClick={() => setActiveTab('workflow')}
           className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium transition-all duration-200 ${
             activeTab === 'workflow' 
               ? 'border-orange-500 text-orange-600 bg-orange-50/50' 
               : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
           }`}
         >
            <LayoutGrid size={18} />
            工作流
         </button>
         <button 
           onClick={() => setActiveTab('assistant')}
           className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium transition-all duration-200 ${
             activeTab === 'assistant' 
               ? 'border-orange-500 text-orange-600 bg-orange-50/50' 
               : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
           }`}
         >
            <Bot size={18} />
            智能助手
         </button>
      </div>

      {/* Content Area */}
      <div className="pt-2 min-h-[500px]">
        {activeTab === 'workflow' ? (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
             <SmartWorkflows />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <SmartAssistants />
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartStudio;