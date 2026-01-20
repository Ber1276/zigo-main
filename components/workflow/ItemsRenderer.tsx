import React, { useState, useEffect, useMemo } from 'react';
import { NodeItem, SimplifiedNodeType } from './NodeItem';

export interface INodeCreateElement {
  uuid: string;
  type: 'node' | 'subcategory' | 'label' | 'action' | 'view' | 'link' | 'openTemplate' | 'section';
  properties?: SimplifiedNodeType | any;
  title?: string;
  children?: INodeCreateElement[];
  subcategory?: string;
}

export interface ItemsRendererProps {
  elements?: INodeCreateElement[];
  activeIndex?: number;
  disabled?: boolean;
  lazyRender?: boolean;
  onSelected?: (element: INodeCreateElement, event?: Event) => void;
}

const LAZY_LOAD_THRESHOLD = 20;
const LAZY_LOAD_ITEMS_PER_TICK = 5;

/**
 * ItemsRenderer 组件 - 渲染节点列表项
 * 基于 n8n 的 ItemsRenderer.vue 转换
 */
export const ItemsRenderer: React.FC<ItemsRendererProps> = ({
  elements = [],
  activeIndex,
  disabled = false,
  lazyRender = true,
  onSelected,
}) => {
  const [renderedItems, setRenderedItems] = useState<Set<string>>(new Set());
  const renderAnimationRequestRef = React.useRef<number | null>(null);
  const currentRenderedCountRef = React.useRef<number>(0);

  // 使用 ref 来跟踪渲染进度，避免闭包问题
  const renderItems = React.useCallback(() => {
    // 如果元素数量小于阈值或禁用 lazy render，直接渲染所有元素
    if (elements.length <= LAZY_LOAD_THRESHOLD || !lazyRender) {
      const allUuids = new Set(elements.map(item => item.uuid));
      setRenderedItems(allUuids);
      currentRenderedCountRef.current = elements.length;
      return;
    }

    // 如果已全部渲染，停止
    if (currentRenderedCountRef.current >= elements.length) {
      return;
    }

    // 获取下一批要渲染的元素
    const nextBatch = elements.slice(
      currentRenderedCountRef.current,
      currentRenderedCountRef.current + LAZY_LOAD_ITEMS_PER_TICK,
    );
    
    // 使用函数式更新来添加新批次的 UUID
    setRenderedItems((prevRendered) => {
      const newRenderedUuids = new Set(prevRendered);
      nextBatch.forEach(item => newRenderedUuids.add(item.uuid));
      return newRenderedUuids;
    });
    
    // 更新已渲染数量
    currentRenderedCountRef.current += nextBatch.length;
    
    // 如果还有更多元素，继续渲染下一批
    if (currentRenderedCountRef.current < elements.length) {
      renderAnimationRequestRef.current = requestAnimationFrame(renderItems);
    } else {
      renderAnimationRequestRef.current = null;
    }
  }, [elements, lazyRender]);

  useEffect(() => {
    // 重置并开始渲染（参考 n8n 的 watch 逻辑）
    if (renderAnimationRequestRef.current !== null) {
      cancelAnimationFrame(renderAnimationRequestRef.current);
      renderAnimationRequestRef.current = null;
    }
    
    // 重置状态和计数器
    setRenderedItems(new Set());
    currentRenderedCountRef.current = 0;
    
    // 延迟一帧开始渲染，确保状态已重置
    renderAnimationRequestRef.current = requestAnimationFrame(() => {
      renderItems();
    });
    
    return () => {
      if (renderAnimationRequestRef.current !== null) {
        cancelAnimationFrame(renderAnimationRequestRef.current);
        renderAnimationRequestRef.current = null;
      }
    };
  }, [elements, renderItems]);

  const handleItemClick = (item: INodeCreateElement, event?: React.MouseEvent) => {
    if (disabled) return;
    onSelected?.(item, event?.nativeEvent);
  };

  if (elements.length === 0) {
    return (
      <div style={{ padding: '8px 16px' }}>
        <div style={{ color: '#999', fontSize: '14px', textAlign: 'center' }}>
          没有找到节点
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {elements.map((item, index) => {
        // 使用 UUID 检查是否已渲染（而不是对象引用）
        const isRendered = renderedItems.has(item.uuid);
        const isActive = activeIndex === index;

        // 如果启用 lazy render 且当前项未渲染，显示骨架屏
        // 注意：只在元素数量超过阈值时才显示骨架屏
        if (!isRendered && lazyRender && elements.length > LAZY_LOAD_THRESHOLD) {
          return (
            <div
              key={item.uuid}
              style={{
                height: '50px',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  backgroundColor: '#f0f0f0',
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    width: '60%',
                    height: '12px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '2px',
                    marginBottom: '4px',
                  }}
                />
                <div
                  style={{
                    width: '40%',
                    height: '10px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '2px',
                  }}
                />
              </div>
            </div>
          );
        }

        // 如果未渲染但不需要 lazy render，跳过（不渲染）
        if (!isRendered && lazyRender) {
          return null;
        }

        if (item.type === 'section' && item.children) {
          return (
            <div key={item.uuid} style={{ marginTop: '8px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#666',
                  textTransform: 'uppercase',
                  padding: '8px 16px',
                  backgroundColor: '#f8f9fa',
                }}
              >
                {item.title || '分类'}
              </div>
              <ItemsRenderer
                elements={item.children}
                activeIndex={activeIndex}
                disabled={disabled}
                lazyRender={lazyRender}
                onSelected={onSelected}
              />
            </div>
          );
        }

        if (item.type === 'node' && item.properties) {
          return (
            <div
              key={item.uuid}
              onClick={(e) => handleItemClick(item, e)}
              style={{
                position: 'relative',
                marginLeft: '1px',
              }}
            >
              <NodeItem
                nodeType={item.properties as SimplifiedNodeType}
                subcategory={item.subcategory}
                active={isActive}
                onClick={() => handleItemClick(item)}
              />
            </div>
          );
        }

        if (item.type === 'subcategory') {
          return (
            <div
              key={item.uuid}
              onClick={(e) => handleItemClick(item, e)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                backgroundColor: isActive ? '#f0f4ff' : 'transparent',
                borderLeft: isActive ? '2px solid #6366f1' : '2px solid transparent',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>
                {item.properties?.displayName || item.title || '子分类'}
              </div>
            </div>
          );
        }

        if (item.type === 'label') {
          return (
            <div
              key={item.uuid}
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#999',
                textTransform: 'uppercase',
              }}
            >
              {item.title || '标签'}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};

export default ItemsRenderer;

