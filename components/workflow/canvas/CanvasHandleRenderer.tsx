/**
 * CanvasHandleRenderer 组件
 * 参照 n8n 的 CanvasHandleRenderer.vue
 * 渲染节点的连接点（输入/输出）
 */

import React, { useMemo } from 'react';
import type { CanvasElementPortWithRenderData, CanvasConnectionMode } from './canvas.types';

interface CanvasHandleRendererProps extends CanvasElementPortWithRenderData {
  mode: CanvasConnectionMode;
  isReadOnly?: boolean;
  isValidConnection?: (connection: any) => boolean;
  dataNodeName?: string;
  dataTestId?: string;
  dataIndex?: number;
  dataConnectionType?: string;
  onAdd?: (handle: string) => void;
}

export const CanvasHandleRenderer: React.FC<CanvasHandleRendererProps> = ({
  handleId,
  type,
  index,
  position = 'left',
  offset = {},
  connectionsCount,
  isConnecting,
  mode,
  isReadOnly = false,
  isValidConnection,
  dataNodeName,
  dataTestId,
  dataIndex,
  dataConnectionType,
  onAdd,
  required,
  maxConnections,
  label,
}) => {
  const handleType = useMemo(
    () => mode === 'input' ? 'target' : 'source',
    [mode]
  );

  // 计算连接限制
  const connectionsLimitReached = useMemo(() => {
    return maxConnections !== undefined && connectionsCount >= maxConnections;
  }, [maxConnections, connectionsCount]);

  // 判断是否可以连接（作为起点）
  // 输出连接点可以作为起点，非 main 类型的连接点也可以作为起点
  const isConnectableStart = useMemo(() => {
    if (isReadOnly || connectionsLimitReached) return false;
    return mode === 'output';
  }, [isReadOnly, connectionsLimitReached, mode]);

  // 判断是否可以连接（作为终点）
  // 输入连接点可以作为终点，但需要验证连接类型是否匹配
  const isConnectableEnd = useMemo(() => {
    if (isReadOnly || connectionsLimitReached) return false;
    return mode === 'input';
  }, [isReadOnly, connectionsLimitReached, mode]);

  const isConnected = connectionsCount > 0;

  // 计算连接点样式
  const handleClasses = useMemo(() => {
    const classes = ['canvas-handle', `handle-${type}`, `handle-${mode}`];
    if (isConnecting) classes.push('connecting');
    if (isConnected) classes.push('connected');
    if (required && !isConnected) classes.push('required');
    return classes.join(' ');
  }, [type, mode, isConnecting, isConnected, required]);

  // 计算位置样式
  const positionStyles = useMemo(() => {
    const styles: React.CSSProperties = {
      position: 'absolute',
      ...offset,
    };

    switch (position) {
      case 'left':
        styles.left = '-8px';
        styles.top = '50%';
        styles.transform = 'translateY(-50%)';
        break;
      case 'right':
        styles.right = '-8px';
        styles.top = '50%';
        styles.transform = 'translateY(-50%)';
        break;
      case 'top':
        styles.top = '-8px';
        styles.left = '50%';
        styles.transform = 'translateX(-50%)';
        break;
      case 'bottom':
        styles.bottom = '-8px';
        styles.left = '50%';
        styles.transform = 'translateX(-50%)';
        break;
    }

    return styles;
  }, [position, offset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isReadOnly) return;
    e.stopPropagation();
    e.preventDefault();
    
    if (mode === 'output' && isConnectableStart) {
      onAdd?.(handleId);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isReadOnly) return;
    e.stopPropagation();
    e.preventDefault();
    
    if (mode === 'input' && isConnectableEnd) {
      onAdd?.(handleId);
    }
  };

  return (
    <div
      className={handleClasses}
      style={positionStyles}
      data-test-id={dataTestId}
      data-node-name={dataNodeName}
      data-index={dataIndex}
      data-connection-type={dataConnectionType}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      title={label || (mode === 'input' ? '输入连接点' : '输出连接点')}
    >
      <div
        className={`handle-indicator ${
          isConnecting ? 'connecting' : ''
        } ${isConnected ? 'connected' : ''} ${required && !isConnected ? 'required' : ''}`}
        style={{
          width: type === 'main' && mode === 'input' ? '8px' : '16px',
          height: type === 'main' && mode === 'input' ? '8px' : '16px',
          borderRadius: '50%',
          backgroundColor: isConnecting 
            ? '#3b82f6' 
            : isConnected 
              ? '#10b981' 
              : required && !isConnected
                ? '#ef4444'
                : '#e2e8f0',
          border: `2px solid ${
            isConnecting 
              ? '#3b82f6' 
              : isConnected 
                ? '#10b981' 
                : required && !isConnected
                  ? '#ef4444'
                  : '#cbd5e1'
          }`,
          transition: 'all 0.2s ease-in-out',
          cursor: isReadOnly ? 'default' : 'pointer',
        }}
      />
      {label && (
        <div
          className="handle-label"
          style={{
            position: 'absolute',
            ...(position === 'left' ? { right: '100%', marginRight: '4px' } : {}),
            ...(position === 'right' ? { left: '100%', marginLeft: '4px' } : {}),
            ...(position === 'top' ? { bottom: '100%', marginBottom: '4px' } : {}),
            ...(position === 'bottom' ? { top: '100%', marginTop: '4px' } : {}),
            fontSize: '10px',
            color: '#64748b',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};

