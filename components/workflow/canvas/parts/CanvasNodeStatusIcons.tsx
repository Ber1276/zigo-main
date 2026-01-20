/**
 * CanvasNodeStatusIcons 组件
 * 参照 n8n 的 CanvasNodeStatusIcons.vue
 * 显示节点的状态图标（运行中、成功、错误、等待等）
 */

import React, { useMemo } from 'react';
import { Clock, RefreshCw, Power, AlertTriangle, Pin, CheckCircle2 } from 'lucide-react';

interface CanvasNodeStatusIconsProps {
  size?: 'small' | 'medium' | 'large';
  spinnerScrim?: boolean;
  spinnerLayout?: 'absolute' | 'static';
  executionStatus?: 'success' | 'error' | 'running' | 'waiting' | 'unknown' | null;
  executionWaiting?: string | null;
  isNodeExecuting?: boolean;
  isDisabled?: boolean;
  hasExecutionErrors?: boolean;
  hasValidationErrors?: boolean;
  executionErrors?: string[];
  validationErrors?: string[];
  hasPinnedData?: boolean;
  hasRunData?: boolean;
  runDataIterations?: number;
  dirtiness?: string;
  isNotInstalledCommunityNode?: boolean;
  hideNodeIssues?: boolean;
  className?: string;
}

export const CanvasNodeStatusIcons: React.FC<CanvasNodeStatusIconsProps> = ({
  size = 'large',
  spinnerScrim = false,
  spinnerLayout = 'absolute',
  executionStatus,
  executionWaiting,
  isNodeExecuting = false,
  isDisabled = false,
  hasExecutionErrors = false,
  hasValidationErrors = false,
  executionErrors = [],
  validationErrors = [],
  hasPinnedData = false,
  hasRunData = false,
  runDataIterations = 1,
  dirtiness,
  isNotInstalledCommunityNode = false,
  hideNodeIssues = false,
  className = '',
}) => {
  const sizeMap = {
    small: 14,
    medium: 16,
    large: 18,
  };

  const iconSize = sizeMap[size];

  const commonClasses = useMemo(() => {
    const classes = ['canvas-node-status'];
    if (spinnerScrim) classes.push('spinner-scrim');
    if (spinnerLayout === 'absolute') classes.push('absolute-spinner');
    return classes.join(' ');
  }, [spinnerScrim, spinnerLayout]);

  // 等待状态
  if (executionWaiting || executionStatus === 'waiting') {
    return (
      <div className={`${commonClasses} status-waiting ${className}`}>
        <Clock size={iconSize} className="text-blue-500" />
      </div>
    );
  }

  // 未安装的社区节点
  if (isNotInstalledCommunityNode) {
    return (
      <div className={`${commonClasses} status-issues ${className}`} data-test-id="node-not-installed">
        <AlertTriangle size={iconSize} className="text-orange-500" title="需要安装此节点" />
      </div>
    );
  }

  // 运行中
  if (isNodeExecuting) {
    return (
      <div
        className={`${commonClasses} status-running ${className}`}
        data-test-id="canvas-node-status-running"
      >
        <RefreshCw size={iconSize} className="text-blue-500 animate-spin" />
      </div>
    );
  }

  // 已禁用
  if (isDisabled) {
    return (
      <div className={`${commonClasses} status-disabled ${className}`}>
        <Power size={iconSize} className="text-slate-400" />
      </div>
    );
  }

  // 执行错误
  if (hasExecutionErrors && !hideNodeIssues) {
    return (
      <div className={`${commonClasses} status-issues ${className}`} data-test-id="node-issues">
        <AlertTriangle size={iconSize} className="text-red-500" title={executionErrors.join(', ')} />
      </div>
    );
  }

  // 验证错误
  if (hasValidationErrors && !hideNodeIssues) {
    return (
      <div className={`${commonClasses} status-issues ${className}`} data-test-id="node-issues">
        <AlertTriangle size={iconSize} className="text-red-500" title={validationErrors.join(', ')} />
      </div>
    );
  }

  // 未知状态（不显示）
  if (executionStatus === 'unknown') {
    return null;
  }

  // 固定数据
  if (hasPinnedData) {
    return (
      <div className={`${commonClasses} status-pinned-data ${className}`} data-test-id="canvas-node-status-pinned">
        <Pin size={iconSize} className="text-blue-500" />
      </div>
    );
  }

  // 脏数据警告
  if (dirtiness !== undefined) {
    return (
      <div className={`${commonClasses} status-warning ${className}`} data-test-id="canvas-node-status-warning">
        <AlertTriangle size={iconSize} className="text-yellow-500" />
        {runDataIterations > 1 && (
          <span className="text-xs font-semibold ml-1">{runDataIterations}</span>
        )}
      </div>
    );
  }

  // 成功状态
  if (hasRunData && executionStatus === 'success') {
    return (
      <div className={`${commonClasses} status-run-data ${className}`} data-test-id="canvas-node-status-success">
        <CheckCircle2 size={iconSize} className="text-green-500" />
        {runDataIterations > 1 && (
          <span className="text-xs font-semibold ml-1">{runDataIterations}</span>
        )}
      </div>
    );
  }

  return null;
};

