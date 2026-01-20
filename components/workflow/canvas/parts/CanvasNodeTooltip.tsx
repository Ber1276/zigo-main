/**
 * CanvasNodeTooltip 组件
 * 参照 n8n 的 CanvasNodeTooltip.vue
 * 显示节点的工具提示
 */

import React from 'react';

interface CanvasNodeTooltipProps {
  visible: boolean;
  tooltip?: string;
  className?: string;
}

export const CanvasNodeTooltip: React.FC<CanvasNodeTooltipProps> = ({
  visible,
  tooltip,
  className = '',
}) => {
  if (!visible || !tooltip) {
    return null;
  }

  return (
    <div
      className={`canvas-node-tooltip ${className}`}
      style={{
        position: 'absolute',
        top: '-100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: '-8px',
        padding: '4px 8px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        borderRadius: '4px',
        fontSize: '12px',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {tooltip}
    </div>
  );
};

