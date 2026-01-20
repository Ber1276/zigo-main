/**
 * CanvasNodeToolbar 组件
 * 参照 n8n 的 CanvasNodeToolbar.vue
 * 显示节点的操作按钮（执行、禁用、删除、聚焦等）
 */

import React, { useState, useMemo } from 'react';
import { Play, Power, Trash2, Crosshair, MoreHorizontal } from 'lucide-react';

interface CanvasNodeToolbarProps {
  dataTestId?: string;
  readOnly?: boolean;
  className?: string;
  showStatusIcons?: boolean;
  itemsClass?: string;
  onDelete?: () => void;
  onToggle?: () => void;
  onRun?: () => void;
  onUpdate?: (parameters: Record<string, unknown>) => void;
  onOpenContextMenu?: (event: React.MouseEvent) => void;
  onFocus?: () => void;
  isDisabled?: boolean;
  isExecuting?: boolean;
  renderType?: string;
  isToolNode?: boolean;
  isExperimentalNdvActive?: boolean;
}

export const CanvasNodeToolbar: React.FC<CanvasNodeToolbarProps> = ({
  dataTestId = 'canvas-node-toolbar',
  readOnly = false,
  className = '',
  showStatusIcons = false,
  itemsClass = '',
  onDelete,
  onToggle,
  onRun,
  onUpdate,
  onOpenContextMenu,
  onFocus,
  isDisabled = false,
  isExecuting = false,
  renderType = 'default',
  isToolNode = false,
  isExperimentalNdvActive = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isStickyColorSelectorOpen, setIsStickyColorSelectorOpen] = useState(false);

  const nodeDisabledTitle = useMemo(
    () => isDisabled ? '启用节点' : '禁用节点',
    [isDisabled]
  );

  const isExecuteNodeVisible = useMemo(() => {
    return (
      !readOnly &&
      renderType === 'default' &&
      (!(renderType === 'default') || isToolNode)
    );
  }, [readOnly, renderType, isToolNode]);

  const isDisableNodeVisible = useMemo(() => {
    return !readOnly && renderType === 'default';
  }, [readOnly, renderType]);

  const isDeleteNodeVisible = useMemo(() => !readOnly, [readOnly]);

  const isFocusNodeVisible = useMemo(() => isExperimentalNdvActive, [isExperimentalNdvActive]);

  const isStickyNoteChangeColorVisible = useMemo(
    () => !readOnly && renderType === 'stickyNote',
    [readOnly, renderType]
  );

  const toolbarClasses = useMemo(() => {
    const classes = ['canvas-node-toolbar', className];
    if (readOnly) classes.push('read-only');
    if (isHovered || isStickyColorSelectorOpen) classes.push('force-visible');
    if (isExperimentalNdvActive) classes.push('is-experimental-ndv-active');
    return classes.join(' ');
  }, [readOnly, isHovered, isStickyColorSelectorOpen, isExperimentalNdvActive, className]);

  const itemsClasses = useMemo(() => {
    return `canvas-node-toolbar-items ${itemsClass}`;
  }, [itemsClass]);

  return (
    <div
      data-test-id={dataTestId}
      className={toolbarClasses}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={itemsClasses}>
        {isExecuteNodeVisible && (
          <button
            data-test-id="execute-node-button"
            className="p-1.5 hover:bg-slate-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isExecuting || isDisabled}
            title={isDisabled ? '节点已禁用' : '测试节点'}
            onClick={(e) => {
              e.stopPropagation();
              onRun?.();
            }}
          >
            <Play size={14} className="text-slate-600" />
          </button>
        )}

        {isDisableNodeVisible && (
          <button
            data-test-id="disable-node-button"
            className="p-1.5 hover:bg-slate-100 rounded transition-colors"
            title={nodeDisabledTitle}
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
          >
            <Power size={14} className="text-slate-600" />
          </button>
        )}

        {isDeleteNodeVisible && (
          <button
            data-test-id="delete-node-button"
            className="p-1.5 hover:bg-slate-100 rounded transition-colors"
            title="删除节点"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
          >
            <Trash2 size={14} className="text-slate-600" />
          </button>
        )}

        {isFocusNodeVisible && (
          <button
            className="p-1.5 hover:bg-slate-100 rounded transition-colors"
            title="聚焦节点"
            onClick={(e) => {
              e.stopPropagation();
              onFocus?.();
            }}
          >
            <Crosshair size={14} className="text-slate-600" />
          </button>
        )}

        {isStickyNoteChangeColorVisible && (
          <button
            className="p-1.5 hover:bg-slate-100 rounded transition-colors"
            title="更改颜色"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: 实现颜色选择器
            }}
          >
            <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-yellow-200" />
          </button>
        )}

        <button
          data-test-id="overflow-node-button"
          className="p-1.5 hover:bg-slate-100 rounded transition-colors"
          title="更多选项"
          onClick={(e) => {
            e.stopPropagation();
            onOpenContextMenu?.(e);
          }}
        >
          <MoreHorizontal size={14} className="text-slate-600" />
        </button>
      </div>
    </div>
  );
};

