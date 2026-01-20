import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { ItemsRenderer, INodeCreateElement } from './ItemsRenderer';
import { NodeIcon } from './NodeIcon';
import { SimplifiedNodeType } from './NodeItem';

export interface NodesListPanelProps {
  nodeTypes: Record<string, SimplifiedNodeType[]>;
  search?: string;
  onSearchChange?: (search: string) => void;
  onNodeSelected?: (nodeType: SimplifiedNodeType) => void;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  nodeIcon?: any;
}

/**
 * NodesListPanel 组件 - 节点列表面板
 * 基于 n8n 的 NodesListPanel.vue 转换
 */
export const NodesListPanel: React.FC<NodesListPanelProps> = ({
  nodeTypes,
  search: externalSearch,
  onSearchChange,
  onNodeSelected,
  onBack,
  title = '选择节点类型',
  subtitle,
  showBackButton = false,
  nodeIcon,
}) => {
  const [internalSearch, setInternalSearch] = useState(externalSearch || '');

  const search = externalSearch !== undefined ? externalSearch : internalSearch;

  const handleSearchChange = (value: string) => {
    if (externalSearch === undefined) {
      setInternalSearch(value);
    }
    onSearchChange?.(value);
  };

  // 将节点类型转换为 INodeCreateElement 格式
  // 参考 n8n 的 subcategorizeItems 逻辑，但简化处理：直接按 category 分类
  const elements = useMemo<INodeCreateElement[]>(() => {
    const result: INodeCreateElement[] = [];

    // 按分类名称排序，确保显示顺序一致
    const sortedCategories = Object.keys(nodeTypes).sort((a, b) => {
      // 将 "Other" 放在最后
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    });

    sortedCategories.forEach((category) => {
      const categoryNodes = nodeTypes[category].filter((node) => {
        // 过滤：必须有有效的 name 字段
        if (!node.name) {
          return false;
        }
        
        // 搜索过滤
        if (!search) return true;
        const searchTerm = search.toLowerCase();
        const displayName = (node.displayName || node.name || '').toLowerCase();
        const description = (node.description || '').toLowerCase();
        return displayName.includes(searchTerm) || description.includes(searchTerm);
      });

      if (categoryNodes.length === 0) return;

      // 添加分类标题
      result.push({
        uuid: `category-${category}`,
        type: 'label',
        title: category,
      });

      // 添加节点项（按 displayName 排序）
      const sortedNodes = [...categoryNodes].sort((a, b) => {
        const nameA = (a.displayName || a.name || '').toLowerCase();
        const nameB = (b.displayName || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      sortedNodes.forEach((node, index) => {
        // 确保节点对象有 name 字段（使用实际的节点类型标识符）
        const nodeWithName = {
          ...node,
          name: node.name, // 必须是有效的节点类型标识符（如 n8n-nodes-base.httpRequest）
        };
        
        // 使用组合 key 确保唯一性：nodeName + category + index
        const uniqueId = `${node.name}-${category}-${index}`;
        
        result.push({
          uuid: `node-${uniqueId}`,
          type: 'node',
          properties: nodeWithName,
          subcategory: category,
        });
      });
    });

    return result;
  }, [nodeTypes, search]);

  const handleNodeSelected = (element: INodeCreateElement) => {
    if (element.type === 'node' && element.properties) {
      onNodeSelected?.(element.properties as SimplifiedNodeType);
    }
  };

  return (
    <aside
      className="nodes-list-panel"
      style={{
        background: '#f8f9fa',
        height: '100%',
        width: '320px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Header */}
      <header
        style={{
          fontSize: '18px',
          fontWeight: 600,
          lineHeight: '1.2',
          padding: '12px 16px',
          borderBottom: subtitle ? 'none' : '1px solid #e0e0e0',
          backgroundColor: subtitle ? 'transparent' : '#f8f9fa',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {showBackButton && (
            <button
              onClick={onBack}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px 0 0',
                color: '#666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeft size={22} />
            </button>
          )}
          {nodeIcon && (
            <div style={{ marginRight: '12px' }}>
              <NodeIcon iconSource={nodeIcon} size={20} />
            </div>
          )}
          <p style={{ margin: 0, lineHeight: '24px', fontWeight: 600, fontSize: '18px' }}>
            {title}
          </p>
        </div>
        {subtitle && (
          <p
            style={{
              marginTop: '4px',
              fontSize: '14px',
              lineHeight: '19px',
              color: '#666',
              fontWeight: 400,
              marginLeft: showBackButton ? 'calc(32px + 4px)' : 0,
            }}
          >
            {subtitle}
          </p>
        )}
      </header>

      {/* Search Bar */}
      <SearchBar
        placeholder="搜索节点..."
        value={search}
        onChange={handleSearchChange}
      />

      {/* Rendered Items */}
      <div
        style={{
          overflow: 'auto',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          scrollbarWidth: 'none',
          paddingBottom: '24px',
        }}
      >
        <ItemsRenderer
          elements={elements}
          onSelected={handleNodeSelected}
        />
      </div>
    </aside>
  );
};

export default NodesListPanel;

