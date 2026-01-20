import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Activity, Server, Database, Zap, ArrowLeft, Cpu, Globe, BrainCircuit, Users, Lock } from 'lucide-react';
import { ToolType, UserRole } from '../types';

const Dashboard: React.FC = () => {
  const { tools, models, role } = useAppContext();
  const navigate = useNavigate();

  // Mock data for Admin (Global)
  const adminActivityData = [
    { name: '周一', calls: 400, errors: 24 },
    { name: '周二', calls: 300, errors: 13 },
    { name: '周三', calls: 550, errors: 38 },
    { name: '周四', calls: 450, errors: 20 },
    { name: '周五', calls: 700, errors: 45 },
    { name: '周六', calls: 200, errors: 10 },
    { name: '周日', calls: 150, errors: 5 },
  ];

  // Mock data for User (Personal) - Significantly lower
  const userActivityData = [
    { name: '周一', calls: 12, errors: 0 },
    { name: '周二', calls: 45, errors: 1 },
    { name: '周三', calls: 32, errors: 2 },
    { name: '周四', calls: 18, errors: 0 },
    { name: '周五', calls: 60, errors: 3 },
    { name: '周六', calls: 5, errors: 0 },
    { name: '周日', calls: 2, errors: 0 },
  ];

  const activityData = role === UserRole.ADMIN ? adminActivityData : userActivityData;

  const categoryData = tools.reduce((acc: any[], tool) => {
    // If user, only count user's tools for this specific chart if strictly required, 
    // but usually category distribution is interesting globally or filtered by "My Tools".
    // For this requirement "User panel can only see their own model data", we'll adjust the top stats mainly.
    // Let's filter tools for users to show "My Tools" distribution.
    
    if (role === UserRole.USER && tool.createdBy !== 'User') return acc;

    const existing = acc.find(i => i.name === tool.category);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ name: tool.category, count: 1 });
    }
    return acc;
  }, []);

  // Stats Logic
  const apiCount = role === UserRole.ADMIN 
    ? tools.filter(t => t.type === ToolType.API).length
    : tools.filter(t => t.type === ToolType.API && t.createdBy === 'User').length;

  const mcpCount = role === UserRole.ADMIN 
    ? tools.filter(t => t.type === ToolType.MCP).length
    : tools.filter(t => t.type === ToolType.MCP && t.createdBy === 'User').length;

  // For models, users can usually "see" all available models, but the stat here represents "My Usage" or "Models I deployed" (if they could).
  // Let's assume this stat card shows "Available Models" for Admin, and "My Model Calls" for User.
  
  const stats = [
    { 
      label: role === UserRole.ADMIN ? 'API 工具总数' : '我的 API 工具', 
      value: apiCount, 
      icon: Globe, 
      color: 'text-blue-600', 
      bg: 'bg-blue-100' 
    },
    { 
      label: role === UserRole.ADMIN ? 'MCP 工具总数' : '我的 MCP 工具', 
      value: mcpCount, 
      icon: Cpu, 
      color: 'text-purple-600', 
      bg: 'bg-purple-100' 
    },
    { 
      label: role === UserRole.ADMIN ? '在线 AI 模型' : '我的 AI 调用', 
      value: role === UserRole.ADMIN ? models.length : '174', // Mock call count for user
      icon: BrainCircuit, 
      color: 'text-pink-600', 
      bg: 'bg-pink-100' 
    },
    { 
      label: role === UserRole.ADMIN ? '全平台调用' : '个人总调用', 
      value: role === UserRole.ADMIN ? '45.2k' : '1.2k', 
      icon: Activity, 
      color: 'text-green-600', 
      bg: 'bg-green-100' 
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/tools')}
            className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
             <h2 className="text-xl font-bold text-slate-800">数据看板</h2>
             <p className="text-sm text-slate-500">
               {role === UserRole.ADMIN ? '全局系统监控与统计' : '个人工作空间使用统计'}
             </p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg text-xs font-mono text-slate-500">
           {role === UserRole.ADMIN ? <Users size={14} /> : <Lock size={14} />}
           Viewing as: {role}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1 duration-300">
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[400px]">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">
            {role === UserRole.ADMIN ? '全平台调用趋势' : '个人调用趋势'}
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="calls" stroke="#f97316" strokeWidth={3} dot={{r: 4}} activeDot={{r: 8}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[400px]">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">
             {role === UserRole.ADMIN ? '全平台工具分布' : '我的工具分类'}
          </h3>
          <div className="h-[300px] w-full">
             {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                    <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                    <Bar dataKey="count" fill={role === UserRole.ADMIN ? "#3b82f6" : "#8b5cf6"} radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
             ) : (
               <div className="flex flex-col items-center justify-center h-full text-slate-400">
                 <div className="bg-slate-50 p-4 rounded-full mb-3">
                    <Globe size={24} className="opacity-20" />
                 </div>
                 <p>暂无工具数据</p>
                 {role === UserRole.USER && <p className="text-xs mt-1">您还没有创建任何自定义工具</p>}
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;