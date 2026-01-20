/**
 * CanvasNodeTrigger 组件
 * 触发器节点的特殊显示
 */

import React from 'react';

interface CanvasNodeTriggerProps {
  name: string;
  type: string;
  hovered?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  isExperimentalNdvActive?: boolean;
}

export const CanvasNodeTrigger: React.FC<CanvasNodeTriggerProps> = ({
  name,
  type,
  hovered = false,
  disabled = false,
  readOnly = false,
  className = '',
  isExperimentalNdvActive = false,
}) => {
  return (
    <div
      className={`canvas-node-trigger ${className}`}
      data-test-id="canvas-node-trigger"
      style={{
        position: 'absolute',
        left: '-36px',
        top: '0',
        width: '36px',
        height: '100%',
        borderRadius: '36px 0 0 36px',
        backgroundColor: disabled ? '#e2e8f0' : '#3b82f6',
        border: '2px solid',
        borderColor: disabled ? '#cbd5e1' : '#2563eb',
        borderRight: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: disabled ? '#94a3b8' : '#ffffff',
        }}
      />
    </div>
  );
};

