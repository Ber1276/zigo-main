import React, { useMemo, useState, useEffect } from 'react';
import { NodeIcon } from './NodeIcon';
import { CanvasNodeStatusIcons } from './canvas/parts/CanvasNodeStatusIcons';
import { CanvasNodeSettingsIcons } from './canvas/parts/CanvasNodeSettingsIcons';
import { CanvasNodeDisabledStrikeThrough } from './canvas/parts/CanvasNodeDisabledStrikeThrough';
import { CanvasNodeTooltip } from './canvas/parts/CanvasNodeTooltip';

export interface CanvasNodeDefaultRender {
  type: 'default';
  options: {
    trigger?: boolean;
    configuration?: boolean;
    configurable?: boolean;
    icon?: any;
    tooltip?: string;
    dirtiness?: string;
    inputs?: {
      labelSize?: number;
    };
    outputs?: {
      labelSize?: number;
    };
  };
}

export interface CanvasNodeDefaultProps {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  nodeTypeInfo?: any;
  subtitle?: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  hasError?: boolean;
  hasPinnedData?: boolean;
  executionStatus?: 'success' | 'error' | 'running' | 'waiting' | 'unknown' | null;
  executionWaiting?: string | null;
  executionRunning?: boolean;
  hasRunData?: boolean;
  hasExecutionErrors?: boolean;
  hasValidationErrors?: boolean;
  executionErrors?: string[];
  validationErrors?: string[];
  runDataIterations?: number;
  render: CanvasNodeDefaultRender;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  className?: string;
  alwaysOutputData?: boolean;
  executeOnce?: boolean;
  retryOnFail?: boolean;
  onError?: 'continueRegularOutput' | 'continueErrorOutput';
  mainInputsCount?: number;
  mainOutputsCount?: number;
  isExperimentalNdvActive?: boolean;
}

/**
 * CanvasNodeDefault 组件 - 默认节点渲染
 * 基于 n8n 的 CanvasNodeDefault.vue 转换
 */
export const CanvasNodeDefault: React.FC<CanvasNodeDefaultProps> = ({
  nodeId,
  nodeName,
  nodeType,
  nodeTypeInfo,
  subtitle,
  isSelected = false,
  isDisabled = false,
  hasError = false,
  hasPinnedData = false,
  executionStatus = null,
  executionWaiting = null,
  executionRunning = false,
  hasRunData = false,
  hasExecutionErrors = false,
  hasValidationErrors = false,
  executionErrors = [],
  validationErrors = [],
  runDataIterations = 1,
  render,
  onDoubleClick,
  onContextMenu,
  style,
  className = '',
  alwaysOutputData = false,
  executeOnce = false,
  retryOnFail = false,
  onError,
  mainInputsCount = 0,
  mainOutputsCount = 0,
  isExperimentalNdvActive = false,
}) => {
  const renderOptions = render.options;
  const iconSize = renderOptions.configuration ? 30 : 40;
  const [showTooltip, setShowTooltip] = useState(false);

  // 计算节点样式类
  const nodeClasses = useMemo(() => {
    const classes = ['canvas-node', 'canvas-node-default'];
    
    if (isSelected) classes.push('selected');
    if (isDisabled) classes.push('disabled');
    if (executionStatus === 'success') classes.push('success');
    if (hasError) classes.push('error');
    if (hasPinnedData) classes.push('pinned');
    if (executionStatus === 'waiting') classes.push('waiting');
    if (executionStatus === 'running') classes.push('running');
    if (renderOptions.configurable) classes.push('configurable');
    if (renderOptions.configuration) classes.push('configuration');
    // 移除 trigger 的特殊样式
    if (renderOptions.dirtiness) classes.push('warning');
    
    return classes.join(' ');
  }, [isSelected, isDisabled, hasError, hasPinnedData, executionStatus, renderOptions]);

  // 节点尺寸计算（参照 n8n）
  const nodeSize = useMemo(() => {
    if (renderOptions.configuration) {
      return { width: 60, height: 60 };
    }
    // 根据输入输出数量计算宽度
    const baseWidth = 180;
    const minWidth = 160;
    const maxWidth = 240;
    const width = Math.max(minWidth, Math.min(maxWidth, baseWidth));
    return { width, height: 100 };
  }, [renderOptions.configuration, mainInputsCount, mainOutputsCount]);

  // 判断是否显示删除线
  const isStrikethroughVisible = useMemo(() => {
    return isDisabled && mainInputsCount === 1 && mainOutputsCount === 1;
  }, [isDisabled, mainInputsCount, mainOutputsCount]);

  // 判断是否显示设置图标
  const showSettingsIcons = useMemo(() => {
    return !renderOptions.configuration && !isDisabled && !(hasPinnedData && !isExperimentalNdvActive);
  }, [renderOptions.configuration, isDisabled, hasPinnedData, isExperimentalNdvActive]);

  // 判断是否正在执行
  const isNodeExecuting = useMemo(() => {
    return executionRunning || executionStatus === 'running';
  }, [executionRunning, executionStatus]);

  // 工具提示显示逻辑
  useEffect(() => {
    if (renderOptions.tooltip) {
      setShowTooltip(true);
    }
  }, [renderOptions.tooltip]);

  const nodeStyles: React.CSSProperties = {
    ...style,
    width: `${nodeSize.width}px`,
    height: `${nodeSize.height}px`,
    '--canvas-node--width': `${nodeSize.width}px`,
    '--canvas-node--height': `${nodeSize.height}px`,
    '--node--icon--size': `${iconSize}px`,
  } as React.CSSProperties;

  return (
    <div
      className={`${nodeClasses} ${className} relative flex items-center justify-center bg-white border-2 border-gray-300 rounded-lg shadow-sm transition-all duration-200 ${isSelected ? 'ring-4 ring-blue-300' : ''} ${isDisabled ? 'opacity-60' : ''} ${executionStatus === 'success' ? 'border-green-500' : ''} ${hasError ? 'border-red-500' : ''} ${executionStatus === 'running' ? 'bg-blue-50 border-blue-500' : ''}`}
      style={nodeStyles}
      data-test-id={`canvas-${renderOptions.configuration ? 'configuration' : renderOptions.configurable ? 'configurable' : 'default'}-node`}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      {/* 工具提示 */}
      {renderOptions.tooltip && (
        <CanvasNodeTooltip visible={showTooltip} tooltip={renderOptions.tooltip} />
      )}

      {/* 节点图标 */}
      <div className="canvas-node-icon" style={{ flexShrink: 0 }}>
        <NodeIcon
          nodeType={nodeTypeInfo}
          iconSource={renderOptions.icon}
          size={iconSize}
          disabled={isDisabled}
        />
      </div>

      {/* 设置图标 */}
      {showSettingsIcons && (
        <CanvasNodeSettingsIcons
          alwaysOutputData={alwaysOutputData}
          executeOnce={executeOnce}
          retryOnFail={retryOnFail}
          onError={onError}
          className="absolute top-1 right-1"
        />
      )}

      {/* 禁用删除线 */}
      {isStrikethroughVisible && (
        <CanvasNodeDisabledStrikeThrough
          hasRunData={hasRunData}
          hasWarning={!!renderOptions.dirtiness}
        />
      )}

      {/* 节点描述 */}
      <div className="absolute top-full w-full min-w-[320px] mt-1 flex flex-col gap-1 pointer-events-none">
        <div className="text-sm text-center text-ellipsis line-clamp-2 overflow-hidden break-words font-medium leading-tight" title={nodeName}>
          {nodeName}
        </div>
        {isDisabled && (
          <div className="text-sm text-center text-gray-500">
            (已禁用)
          </div>
        )}
        {subtitle && (
          <div className="text-xs text-center text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis leading-tight font-normal" title={subtitle}>
            {subtitle}
          </div>
        )}
      </div>

      {/* 状态图标 */}
      {!isDisabled && (
        <CanvasNodeStatusIcons
          executionStatus={executionStatus}
          executionWaiting={executionWaiting}
          isNodeExecuting={isNodeExecuting}
          isDisabled={isDisabled}
          hasExecutionErrors={hasExecutionErrors}
          hasValidationErrors={hasValidationErrors}
          executionErrors={executionErrors}
          validationErrors={validationErrors}
          hasPinnedData={hasPinnedData}
          hasRunData={hasRunData}
          runDataIterations={runDataIterations}
          dirtiness={renderOptions.dirtiness}
          className="absolute bottom-1 right-1"
        />
      )}
    </div>
  );
};

export default CanvasNodeDefault;

