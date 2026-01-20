import React from 'react';
import { Workflow, WorkflowNode as N8nWorkflowNode } from '../../types';
import { ExecutionLog } from '../ExecutionLogPanel';

interface WorkflowEditorLayoutProps {
  workflow: Workflow;
  readOnly?: boolean;
  activeNode?: N8nWorkflowNode | null;
  sidebarCollapsed?: boolean;
  onSidebarToggle?: () => void;
  isLogOpen?: boolean;
  execution?: ExecutionLog | null;
  onLogToggle?: () => void;
  onLogRefresh?: () => void;
  onTabChange?: (tab: string) => void;
  children: React.ReactNode;
}

/**
 * WorkflowEditorLayout - 工作流编辑器布局组件
 * 类似 n8n 的 NodeView 布局结构
 * 提供统一的编辑器页面布局，包括头部、侧边栏、主内容区域和底部日志面板
 */
export const WorkflowEditorLayout: React.FC<WorkflowEditorLayoutProps> = ({
  children,
  workflow,
  readOnly = false,
  activeNode,
  sidebarCollapsed = false,
  onSidebarToggle,
  isLogOpen = true,
  execution,
  onLogToggle,
  onLogRefresh,
  onTabChange,
}) => {
  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-slate-50">
      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col relative">
        {children}
      </div>
      
      {/* Log Panel would be rendered here if needed */}
    </div>
  );
};

