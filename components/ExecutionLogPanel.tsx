/**
 * 执行日志面板组件
 * 显示工作流执行日志，参考 n8n 的实现
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Terminal,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Info,
  Copy,
  RefreshCw,
} from 'lucide-react';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'error' | 'warning' | 'debug';
  message: string;
  nodeName?: string;
  data?: any;
}

export interface ExecutionLog {
  id: string;
  status: 'running' | 'success' | 'error' | 'waiting';
  startTime: string;
  endTime?: string;
  duration?: number;
  logs: LogEntry[];
  nodeStatuses?: Record<string, 'success' | 'error' | 'running'>;
  data?: any;
}

interface ExecutionLogPanelProps {
  execution: ExecutionLog | null;
  isOpen: boolean;
  onToggle: () => void;
  onRefresh?: () => void;
  autoScroll?: boolean;
}

export const ExecutionLogPanel: React.FC<ExecutionLogPanelProps> = ({
  execution,
  isOpen,
  onToggle,
  onRefresh,
  autoScroll = true,
}) => {
  const [filterLevel, setFilterLevel] = useState<'all' | 'info' | 'error' | 'warning' | 'debug'>('all');
  const [filterNode, setFilterNode] = useState<string>('all');
  const logContainerRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && isOpen && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [execution?.logs, isOpen, autoScroll]);

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return <XCircle size={14} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={14} className="text-yellow-500" />;
      case 'debug':
        return <Info size={14} className="text-blue-500" />;
      default:
        return <Info size={14} className="text-slate-500" />;
    }
  };

  const getStatusIcon = () => {
    if (!execution) return null;

    switch (execution.status) {
      case 'running':
        return <Loader2 size={16} className="animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 size={16} className="text-green-500" />;
      case 'error':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <Info size={16} className="text-slate-500" />;
    }
  };

  const getStatusColor = () => {
    if (!execution) return 'bg-slate-100';

    switch (execution.status) {
      case 'running':
        return 'bg-blue-50 border-blue-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const filteredLogs = execution?.logs.filter((log) => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (filterNode !== 'all' && log.nodeName !== filterNode) return false;
    return true;
  }) || [];

  const uniqueNodes = Array.from(
    new Set(execution?.logs.map((log) => log.nodeName).filter(Boolean))
  );

  const copyLogs = () => {
    const logText = filteredLogs
      .map((log) => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.nodeName ? `[${log.nodeName}] ` : ''}${log.message}`)
      .join('\n');
    
    navigator.clipboard.writeText(logText);
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg transition-transform duration-300 ${
      isOpen ? 'translate-y-0' : 'translate-y-full'
    }`} style={{ height: isOpen ? '400px' : 'auto', zIndex: 100 }}>
      {/* Header */}
      <div className={`px-4 py-3 border-b border-slate-200 flex items-center justify-between ${getStatusColor()}`}>
        <div className="flex items-center gap-3">
          <Terminal size={18} className="text-slate-700" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">执行日志</span>
              {getStatusIcon()}
              {execution && (
                <span className="text-xs text-slate-600">
                  {execution.status === 'running' ? '运行中' :
                   execution.status === 'success' ? '成功' :
                   execution.status === 'error' ? '失败' : '等待中'}
                </span>
              )}
            </div>
            {execution && (
              <div className="text-xs text-slate-500 mt-0.5">
                开始: {formatTimestamp(execution.startTime)} | 
                耗时: {formatDuration(execution.duration)}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 过滤器 */}
          {execution && execution.logs.length > 0 && (
            <>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as any)}
                className="text-xs px-2 py-1 border border-slate-300 rounded bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">所有级别</option>
                <option value="error">错误</option>
                <option value="warning">警告</option>
                <option value="info">信息</option>
                <option value="debug">调试</option>
              </select>

              {uniqueNodes.length > 0 && (
                <select
                  value={filterNode}
                  onChange={(e) => setFilterNode(e.target.value)}
                  className="text-xs px-2 py-1 border border-slate-300 rounded bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">所有节点</option>
                  {uniqueNodes.map((node) => (
                    <option key={node} value={node}>
                      {node}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={copyLogs}
                className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                title="复制日志"
              >
                <Copy size={14} className="text-slate-600" />
              </button>

              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                  title="刷新"
                >
                  <RefreshCw size={14} className="text-slate-600" />
                </button>
              )}
            </>
          )}

          <button
            onClick={onToggle}
            className="p-1.5 hover:bg-slate-100 rounded transition-colors"
            title={isOpen ? '收起' : '展开'}
          >
            {isOpen ? <ChevronDown size={18} className="text-slate-600" /> : <ChevronUp size={18} className="text-slate-600" />}
          </button>
        </div>
      </div>

      {/* Log Content */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-xs"
        style={{ maxHeight: 'calc(400px - 60px)' }}
      >
        {!execution ? (
          <div className="text-center text-slate-400 py-8">
            <Terminal size={32} className="mx-auto mb-2 opacity-50" />
            <p>暂无执行日志</p>
            <p className="text-xs mt-1">执行工作流后，日志将显示在这里</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <Info size={32} className="mx-auto mb-2 opacity-50" />
            <p>没有匹配的日志</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`flex items-start gap-2 py-1 px-2 rounded hover:bg-slate-50 ${
                  log.level === 'error' ? 'bg-red-50/50' :
                  log.level === 'warning' ? 'bg-yellow-50/50' : ''
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {getLogIcon(log.level)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-slate-400">{formatTimestamp(log.timestamp)}</span>
                    {log.nodeName && (
                      <span className="text-blue-600 font-semibold">[{log.nodeName}]</span>
                    )}
                    <span className={`uppercase text-xs ${
                      log.level === 'error' ? 'text-red-600' :
                      log.level === 'warning' ? 'text-yellow-600' :
                      log.level === 'debug' ? 'text-blue-600' :
                      'text-slate-500'
                    }`}>
                      {log.level}
                    </span>
                  </div>
                  <div className="text-slate-900 mt-0.5 break-words">{log.message}</div>
                  {log.data && (
                    <details className="mt-1">
                      <summary className="text-slate-500 cursor-pointer hover:text-slate-700 text-xs">
                        查看数据
                      </summary>
                      <pre className="mt-1 p-2 bg-slate-100 rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
