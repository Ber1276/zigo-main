import React from 'react';
import { NodeIcon, NodeIconSource } from './NodeIcon';

export interface SimplifiedNodeType {
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  iconUrl?: string;
  iconColor?: string;
  defaults?: {
    color?: string;
  };
  group?: string[];
  tag?: string;
}

export interface NodeItemProps {
  nodeType: SimplifiedNodeType;
  subcategory?: string;
  active?: boolean;
  onClick?: () => void;
}

/**
 * NodeItem 组件 - 节点列表项
 * 基于 n8n 的 NodeItem.vue 转换
 */
export const NodeItem: React.FC<NodeItemProps> = ({
  nodeType,
  subcategory,
  active = false,
  onClick,
}) => {
  const displayName = nodeType.displayName || nodeType.name;
  const description = nodeType.description || '';
  const isTrigger = nodeType.group?.includes('trigger') || false;

  return (
    <div
      className={`node-item ${active ? 'active' : ''}`}
      onClick={onClick}
      style={{
        marginLeft: '15px',
        marginRight: '12px',
        userSelect: 'none',
        cursor: 'pointer',
        padding: '8px 12px',
        borderRadius: '4px',
        backgroundColor: active ? '#f0f4ff' : 'transparent',
        borderLeft: active ? '2px solid #6366f1' : '2px solid transparent',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = '#f8f9fa';
          e.currentTarget.style.borderLeftColor = '#e0e0e0';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.borderLeftColor = 'transparent';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <NodeIcon
            nodeType={nodeType}
            size={24}
            colorDefault="var(--color--foreground--shade-2)"
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#333',
              marginBottom: description ? '2px' : 0,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {displayName}
            {isTrigger && (
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  borderRadius: '4px',
                  fontWeight: 500,
                }}
              >
                Trigger
              </span>
            )}
          </div>
          {description && (
            <div
              style={{
                fontSize: '12px',
                color: '#666',
                lineHeight: '1.4',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {description}
            </div>
          )}
        </div>
        {/* Action arrow indicator */}
        <div
          style={{
            flexShrink: 0,
            color: '#999',
            fontSize: '12px',
          }}
        >
          →
        </div>
      </div>
    </div>
  );
};

export default NodeItem;

