import React from 'react';
import { useAppContext } from '../../App';
import { UserRole } from '../../types';
import { Navigate } from 'react-router-dom';
import { 
  AppWindow, 
  Search, 
  Filter, 
  MoreHorizontal, 
  LayoutGrid, 
  Bot, 
  Users, 
  Activity,
  Trash2,
  Eye,
  Edit
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const AppManagement: React.FC = () => {
  const { role, workflows, assistants, setWorkflows, setAssistants } = useAppContext();

  if (role !== UserRole.ADMIN) {
    return <Navigate to="/" />;
  }

  // Stats Data
  const totalApps = workflows.length + assistants.length;
  const publishedApps = workflows.filter(w => w.status === 'PUBLISHED').length + assistants.filter(a => a.status === 'PUBLISHED').length;
  const activeUsers = 142; // Mock

  const distributionData = [
    { name: '工作流', value: workflows.length, color: '#f97316' }, // Orange
    { name: '智能助手', value: assistants.length, color: '#3b82f6' }, // Blue
  ];

  const usageData = [
    { name: '周一', workflows: 120, assistants: 80 },
    { name: '周二', workflows: 132, assistants: 90 },
    { name: '周三', workflows: 101, assistants: 110 },
    { name: '周四', workflows: 134, assistants: 105 },
    { name: '周五', workflows: 190, assistants: 130 },
    { name: '周六', workflows: 90, assistants: 40 },
    { name: '周日', workflows: 85, assistants: 35 },
  ];

  const deleteResource = (type: 'workflow' | 'assistant', id: string) => {
    if (window.confirm('管理员操作：确定要强制删除此资源吗？')) {
        if (type === 'workflow') {
            setWorkflows(prev => prev.filter(w => w.id !== id));
        } else {
            setAssistants(prev => prev.filter(a => a.id !== id));
        }
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Header */}
      <div>
         <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AppWindow className="text-orange-600" /> 应用管理中心
         </h1>
         <p className="text-slate-500 mt-1">全局管理所有用户创建的工作流与智能助手，监控运行状态。</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2"><LayoutGrid size={16}/> 总应用数</div>
            <div className="text-3xl font-bold text-slate-900">{totalApps}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2"><Activity size={16}/> 已发布/活跃</div>
            <div className="text-3xl font-bold text-green-600">{publishedApps}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2"><Users size={16}/> 活跃创作者</div>
            <div className="text-3xl font-bold text-blue-600">{activeUsers}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2"><Activity size={16}/> 今日调用</div>
            <div className="text-3xl font-bold text-slate-900">8.2k</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">应用活跃趋势</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={usageData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                        <Tooltip contentStyle={{borderRadius: '8px', border:'none'}} />
                        <Bar dataKey="workflows" name="工作流" fill="#f97316" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="assistants" name="智能助手" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
         </div>
         <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">应用类型分布</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie 
                            data={distributionData} 
                            cx="50%" 
                            cy="50%" 
                            innerRadius={60} 
                            outerRadius={80} 
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {distributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-sm">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-orange-500"></div> 工作流</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div> 智能助手</div>
            </div>
         </div>
      </div>

      {/* Combined Resource List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
             <div className="flex items-center gap-3">
                 <h3 className="font-bold text-slate-800">所有资源列表</h3>
                 <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{totalApps}</span>
             </div>
             <div className="flex gap-2">
                 <div className="relative">
                     <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input placeholder="搜索应用或创建者..." className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
                 </div>
                 <button className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500"><Filter size={16}/></button>
             </div>
         </div>
         
         <table className="w-full text-sm text-left">
             <thead className="bg-slate-50 text-slate-500 font-medium">
                 <tr>
                     <th className="px-6 py-3">应用名称</th>
                     <th className="px-6 py-3">类型</th>
                     <th className="px-6 py-3">所有者</th>
                     <th className="px-6 py-3">状态</th>
                     <th className="px-6 py-3">版本</th>
                     <th className="px-6 py-3">更新时间</th>
                     <th className="px-6 py-3 text-right">操作</th>
                 </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                 {/* Render Workflows */}
                 {workflows.map(wf => (
                     <tr key={`w-${wf.id}`} className="hover:bg-slate-50 group">
                         <td className="px-6 py-3">
                             <div className="font-medium text-slate-900">{wf.name}</div>
                             <div className="text-xs text-slate-400 truncate max-w-[150px]">{wf.description}</div>
                         </td>
                         <td className="px-6 py-3"><span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-0.5 rounded w-fit text-xs"><LayoutGrid size={12}/> 工作流</span></td>
                         <td className="px-6 py-3 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-500">U</div>
                            {wf.owner}
                         </td>
                         <td className="px-6 py-3">
                             <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                 wf.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                                 wf.status === 'DRAFT' ? 'bg-slate-100 text-slate-600' :
                                 'bg-blue-100 text-blue-700'
                             }`}>{wf.status}</span>
                         </td>
                         <td className="px-6 py-3 font-mono text-slate-500">{wf.version}</td>
                         <td className="px-6 py-3 text-slate-500">{new Date(wf.updatedAt).toLocaleDateString()}</td>
                         <td className="px-6 py-3 text-right">
                             <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="查看"><Eye size={16}/></button>
                                <button className="p-1 text-slate-500 hover:bg-slate-100 rounded" title="编辑"><Edit size={16}/></button>
                                <button onClick={() => deleteResource('workflow', wf.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="强制删除"><Trash2 size={16}/></button>
                             </div>
                         </td>
                     </tr>
                 ))}
                 {/* Render Assistants */}
                 {assistants.map(as => (
                     <tr key={`a-${as.id}`} className="hover:bg-slate-50 group">
                         <td className="px-6 py-3">
                             <div className="font-medium text-slate-900 flex items-center gap-2">
                                 <span>{as.avatar}</span> {as.name}
                             </div>
                             <div className="text-xs text-slate-400 truncate max-w-[150px]">{as.description}</div>
                         </td>
                         <td className="px-6 py-3"><span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit text-xs"><Bot size={12}/> 助手</span></td>
                         <td className="px-6 py-3 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-500">U</div>
                            {as.owner}
                         </td>
                         <td className="px-6 py-3">
                             <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                 as.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                                 as.status === 'DRAFT' ? 'bg-slate-100 text-slate-600' :
                                 'bg-blue-100 text-blue-700'
                             }`}>{as.status}</span>
                         </td>
                         <td className="px-6 py-3 font-mono text-slate-500">{as.version}</td>
                         <td className="px-6 py-3 text-slate-500">{new Date(as.createdAt).toLocaleDateString()}</td>
                         <td className="px-6 py-3 text-right">
                             <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="查看"><Eye size={16}/></button>
                                <button className="p-1 text-slate-500 hover:bg-slate-100 rounded" title="编辑"><Edit size={16}/></button>
                                <button onClick={() => deleteResource('assistant', as.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="强制删除"><Trash2 size={16}/></button>
                             </div>
                         </td>
                     </tr>
                 ))}
             </tbody>
         </table>
      </div>
    </div>
  );
};

export default AppManagement;