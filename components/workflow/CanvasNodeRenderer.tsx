import React from 'react';
import { CanvasNodeDefault, CanvasNodeDefaultProps } from './CanvasNodeDefault';
import type { CanvasNodeData } from './canvas/canvas.types';

export type CanvasNodeRenderType = 'default' | 'stickyNote' | 'addNodes' | 'choicePrompt';

export interface CanvasNodeData {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  render: {
    type: CanvasNodeRenderType;
    options?: any;
  };
}

export interface CanvasNodeRendererProps {
  node: CanvasNodeData;
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
  onActivate?: (id: string, event: React.MouseEvent) => void;
  onDeactivate?: (id: string) => void;
  onMove?: (position: { x: number; y: number }) => void;
  onUpdate?: (parameters: Record<string, unknown>) => void;
  onOpenContextMenu?: (event: React.MouseEvent) => void;
  onDelete?: () => void;
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
 * CanvasNodeRenderer 组件 - 节点渲染器
 * 基于 n8n 的 CanvasNodeRenderer.vue 转换
 * 根据节点的 render.type 选择不同的渲染组件
 */
export const CanvasNodeRenderer: React.FC<CanvasNodeRendererProps> = ({
  node,
  nodeTypeInfo,
  subtitle,
  isSelected,
  isDisabled,
  hasError,
  hasPinnedData,
  executionStatus,
  executionWaiting,
  executionRunning,
  hasRunData,
  hasExecutionErrors,
  hasValidationErrors,
  executionErrors,
  validationErrors,
  runDataIterations,
  onActivate,
  onDeactivate,
  onMove,
  onUpdate,
  onOpenContextMenu,
  onDelete,
  onDoubleClick,
  onContextMenu,
  style,
  className,
  alwaysOutputData,
  executeOnce,
  retryOnFail,
  onError,
  mainInputsCount,
  mainOutputsCount,
  isExperimentalNdvActive,
}) => {
  const renderType = node.render?.type || 'default';

  // 处理双击激活
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (onActivate) {
      onActivate(node.id, e);
    }
    if (onDoubleClick) {
      onDoubleClick(e);
    }
  };

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent) => {
    if (onOpenContextMenu) {
      onOpenContextMenu(e);
    }
    if (onContextMenu) {
      onContextMenu(e);
    }
  };

  switch (renderType) {
    case 'stickyNote':
      // TODO: 实现 CanvasNodeStickyNote
      return (
        <div className="canvas-node-sticky-note" style={style}>
          Sticky Note (待实现)
        </div>
      );

    case 'addNodes':
      // TODO: 实现 CanvasNodeAddNodes
      return (
        <div className="canvas-node-add-nodes" style={style}>
          Add Nodes (待实现)
        </div>
      );

    case 'choicePrompt':
      // TODO: 实现 CanvasNodeChoicePrompt
      return (
        <div className="canvas-node-choice-prompt" style={style}>
          Choice Prompt (待实现)
        </div>
      );

    case 'default':
    default:
      return (
        <CanvasNodeDefault
          nodeId={node.id}
          nodeName={node.name}
          nodeType={node.type}
          nodeTypeInfo={nodeTypeInfo}
          subtitle={subtitle}
          isSelected={isSelected}
          isDisabled={isDisabled}
          hasError={hasError}
          hasPinnedData={hasPinnedData}
          executionStatus={executionStatus}
          executionWaiting={executionWaiting}
          executionRunning={executionRunning}
          hasRunData={hasRunData}
          hasExecutionErrors={hasExecutionErrors}
          hasValidationErrors={hasValidationErrors}
          executionErrors={executionErrors}
          validationErrors={validationErrors}
          runDataIterations={runDataIterations}
          render={{
            type: 'default',
            options: node.render?.options || {},
          }}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          style={style}
          className={className}
          alwaysOutputData={alwaysOutputData}
          executeOnce={executeOnce}
          retryOnFail={retryOnFail}
          onError={onError}
          mainInputsCount={mainInputsCount}
          mainOutputsCount={mainOutputsCount}
          isExperimentalNdvActive={isExperimentalNdvActive}
        />
      );
  }
};

export default CanvasNodeRenderer;

