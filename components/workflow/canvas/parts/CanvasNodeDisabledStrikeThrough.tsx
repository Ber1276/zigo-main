/**
 * CanvasNodeDisabledStrikeThrough 组件
 * 参照 n8n 的 CanvasNodeDisabledStrikeThrough.vue
 * 显示禁用节点的删除线
 */

import React, { useMemo } from 'react';

interface CanvasNodeDisabledStrikeThroughProps {
  hasRunData?: boolean;
  hasWarning?: boolean;
  className?: string;
}

export const CanvasNodeDisabledStrikeThrough: React.FC<CanvasNodeDisabledStrikeThroughProps> = ({
  hasRunData = false,
  hasWarning = false,
  className = '',
}) => {
  const classes = useMemo(() => {
    const baseClasses = ['canvas-node-disabled-strike-through'];
    if (hasRunData) baseClasses.push('success');
    if (hasWarning) baseClasses.push('warning');
    return baseClasses.join(' ');
  }, [hasRunData, hasWarning]);

  return (
    <div
      className={`${classes} ${className}`}
      style={{
        border: '1px solid',
        borderColor: hasRunData 
          ? '#10b981' 
          : hasWarning 
            ? '#f59e0b' 
            : '#cbd5e1',
        position: 'absolute',
        top: '50%',
        left: '-4px',
        width: 'calc(100% + 12px)',
        pointerEvents: 'none',
        transform: 'translateY(-50%)',
      }}
    />
  );
};

