/**
 * CanvasNodeSettingsIcons 组件
 * 参照 n8n 的 CanvasNodeSettingsIcons.vue
 * 显示节点的设置图标（始终输出数据、执行一次、重试失败等）
 */

import React from 'react';
import { Database, Repeat, AlertCircle } from 'lucide-react';

interface CanvasNodeSettingsIconsProps {
  alwaysOutputData?: boolean;
  executeOnce?: boolean;
  retryOnFail?: boolean;
  onError?: 'continueRegularOutput' | 'continueErrorOutput';
  className?: string;
}

export const CanvasNodeSettingsIcons: React.FC<CanvasNodeSettingsIconsProps> = ({
  alwaysOutputData = false,
  executeOnce = false,
  retryOnFail = false,
  onError,
  className = '',
}) => {
  const size = 16;

  return (
    <div className={`canvas-node-settings-icons ${className}`}>
      {alwaysOutputData && (
        <div
          data-test-id="canvas-node-status-always-output-data"
          className="p-1 hover:bg-slate-100 rounded transition-colors"
          title="始终输出数据"
        >
          <Database size={size} className="text-slate-600" />
        </div>
      )}

      {executeOnce && (
        <div
          data-test-id="canvas-node-status-execute-once"
          className="p-1 hover:bg-slate-100 rounded transition-colors"
          title="执行一次"
        >
          <Repeat size={size} className="text-slate-600" />
        </div>
      )}

      {retryOnFail && (
        <div
          data-test-id="canvas-node-status-retry-on-fail"
          className="p-1 hover:bg-slate-100 rounded transition-colors"
          title="失败时重试"
        >
          <Repeat size={size} className="text-slate-600" />
        </div>
      )}

      {(onError === 'continueRegularOutput' || onError === 'continueErrorOutput') && (
        <div
          data-test-id="canvas-node-status-continue-on-error"
          className="p-1 hover:bg-slate-100 rounded transition-colors"
          title="错误时继续"
        >
          <AlertCircle size={size} className="text-slate-600" />
        </div>
      )}
    </div>
  );
};

