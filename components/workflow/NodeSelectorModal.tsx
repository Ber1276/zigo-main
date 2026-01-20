import React, { useState, useCallback, useMemo } from 'react';
import { X, ChevronLeft, Plus, Zap, Clock, Webhook, Search, FolderOpen, Folder, Cpu, MousePointerClick, FileInput, ArrowRightCircle, MessageSquare, Target, Database, Code, Globe, Mail, MessageCircle, BarChart3, Layers, Box, Hash, PenTool } from 'lucide-react';
import { SimplifiedNodeType } from './NodeItem';
import { ItemsRenderer, INodeCreateElement } from './ItemsRenderer';

export interface TriggerNodeType {
  key: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  category?: string;
  nodeType?: string;
}

export interface NodeCategory {
  key: string;
  title: string;
  icon: React.ReactNode;
  description?: string;
}

interface NodeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasTrigger: boolean;
  onNodeSelected: (nodeType: SimplifiedNodeType | TriggerNodeType) => void;
  onAddTrigger?: () => void;
  nodeTypesByCategory?: Record<string, SimplifiedNodeType[]>;
  triggerNodes?: TriggerNodeType[];
  nodeCategories?: NodeCategory[];
}

type ModalView = 'root' | 'category' | 'subcategory' | 'trigger';

interface CategoryState {
  category: string;
  nodes: SimplifiedNodeType[];
  search: string;
}

const categoryIconMap: Record<string, React.ReactNode> = {
  'AI': <Cpu size={20} />,
  'ai': <Cpu size={20} />,
  'Core Nodes': <Layers size={20} />,
  'core nodes': <Layers size={20} />,
  'Communication': <MessageCircle size={20} />,
  'communication': <MessageCircle size={20} />,
  'Marketing': <Target size={20} />,
  'marketing': <Target size={20} />,
  'Productivity': <FolderOpen size={20} />,
  'productivity': <FolderOpen size={20} />,
  'Development': <Code size={20} />,
  'development': <Code size={20} />,
  'Database': <Database size={20} />,
  'database': <Database size={20} />,
  'Helpers': <Box size={20} />,
  'helpers': <Box size={20} />,
  'Other': <Folder size={20} />,
  'other': <Folder size={20} />,
  'Custom Nodes': <Code size={20} />,
  'custom nodes': <Code size={20} />,
  'Data Transformation': <PenTool size={20} />,
  'data transformation': <PenTool size={20} />,
  'Flow': <ArrowRightCircle size={20} />,
  'flow': <ArrowRightCircle size={20} />,
  'Files': <FileInput size={20} />,
  'files': <FileInput size={20} />,
  'Apps': <Zap size={20} />,
  'apps': <Zap size={20} />,
};

function formatCategoryTitle(key: string): string {
  const titleMap: Record<string, string> = {
    'AI': 'AI 节点',
    'Core Nodes': '核心节点',
    'Communication': '通信',
    'Marketing': '营销',
    'Productivity': '生产力',
    'Development': '开发工具',
    'Database': '数据库',
    'Helpers': '辅助工具',
    'Other': '其他',
    'Custom Nodes': '自定义节点',
    'Data Transformation': '数据转换',
    'Flow': '流程控制',
    'Files': '文件处理',
    'Apps': '应用触发',
  };
  
  return titleMap[key] || titleMap[key.toLowerCase()] || key.charAt(0).toUpperCase() + key.slice(1);
}

const defaultTriggerNodes: TriggerNodeType[] = [
  {
    key: 'manual',
    icon: <MousePointerClick />,
    title: '手动触发',
    description: '在智构中点击按钮时运行，适合快速入门',
    nodeType: 'n8n-nodes-base.manualTrigger',
  },
  {
    key: 'schedule',
    icon: <Clock />,
    title: '按计划',
    description: '每天、每小时或自定义间隔运行流',
    category: 'schedule',
    nodeType: 'n8n-nodes-base.scheduleTrigger',
  },
  {
    key: 'webhook',
    icon: <Webhook />,
    title: '在Webhook调用时',
    description: '在收到HTTP请求时运行流',
    category: 'webhook',
    nodeType: 'n8n-nodes-base.webhook',
  },
  {
    key: 'form',
    icon: <FileInput />,
    title: '在表单提交时',
    description: '在智构中生成Web表单并将它们的响应传递到工作流',
    category: 'form',
    nodeType: 'n8n-nodes-base.formTrigger',
  },
  {
    key: 'chat',
    icon: <MessageSquare />,
    title: '在聊天消息时',
    description: '当用户发送聊天消息时运行流。用于AI节点',
    category: 'chat',
    nodeType: 'n8n-nodes-base.chatTrigger',
  },
  {
    key: 'workflow',
    icon: <ArrowRightCircle />,
    title: '由另一个工作流执行时',
    description: '当由不同工作流的"执行工作流"节点调用时，运行流',
    category: 'workflow',
    nodeType: 'n8n-nodes-base.workflowTrigger',
  },
  {
    key: 'other',
    icon: <FolderOpen />,
    title: '其他方式...',
    description: '在工作流错误、文件更改等情况下运行流',
    category: 'other',
    nodeType: 'n8n-nodes-base.errorTrigger',
  },
];

export const NodeSelectorModal: React.FC<NodeSelectorModalProps> = ({
  isOpen,
  onClose,
  hasTrigger,
  onNodeSelected,
  onAddTrigger,
  nodeTypesByCategory = {},
  triggerNodes = [],
  nodeCategories = [],
}) => {
  const [currentView, setCurrentView] = useState<ModalView>('root');
  const [selectedCategory, setSelectedCategory] = useState<CategoryState | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const effectiveTriggerNodes = triggerNodes.length > 0 ? triggerNodes : defaultTriggerNodes;

  const availableCategories = useMemo(() => {
    if (nodeCategories.length > 0) {
      return nodeCategories;
    }
    return Object.keys(nodeTypesByCategory)
      .filter(key => nodeTypesByCategory[key] && nodeTypesByCategory[key].length > 0)
      .map(key => ({
        key,
        title: formatCategoryTitle(key),
        icon: categoryIconMap[key] || categoryIconMap[key.toLowerCase()] || <Folder size={20} />,
        description: `${nodeTypesByCategory[key].length} 个节点`,
      }));
  }, [nodeTypesByCategory, nodeCategories]);

  const handleBack = useCallback(() => {
    if (currentView === 'subcategory') {
      setCurrentView('category');
      setSelectedCategory(null);
    } else if (currentView === 'category') {
      setCurrentView('root');
    } else if (currentView === 'trigger') {
      setCurrentView('root');
    }
  }, [currentView]);

  const handleCategorySelect = useCallback((category: { key: string; title: string }) => {
    const nodes = nodeTypesByCategory[category.key] || [];
    setSelectedCategory({
      category: category.key,
      nodes,
      search: '',
    });
    setCurrentView('subcategory');
    setSearchQuery('');
  }, [nodeTypesByCategory]);

  const handleNodeSelect = useCallback((nodeType: SimplifiedNodeType | TriggerNodeType) => {
    onNodeSelected(nodeType);
    onClose();
  }, [onNodeSelected, onClose]);

  const handleTriggerSelect = useCallback((trigger: TriggerNodeType) => {
    onNodeSelected(trigger);
    onClose();
  }, [onNodeSelected, onClose]);

  const handleAddAnotherTrigger = useCallback(() => {
    setCurrentView('trigger');
  }, []);

  if (!isOpen) return null;

  const renderTriggerSelector = () => {
    const filteredTriggers = effectiveTriggerNodes.filter(trigger => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return trigger.title.toLowerCase().includes(query) || 
             trigger.description.toLowerCase().includes(query);
    });

    const elements: INodeCreateElement[] = filteredTriggers.map((trigger, index) => ({
      uuid: `trigger-${trigger.key}-${index}`,
      type: 'node' as const,
      properties: {
        name: trigger.nodeType || trigger.key,
        displayName: trigger.title,
        description: trigger.description,
        icon: trigger.icon,
      } as SimplifiedNodeType,
    }));

    return (
      <div className="modal-content">
        <div className="modal-header">
          {hasTrigger && (
            <button className="back-button" onClick={handleBack}>
              <ChevronLeft size={20} />
            </button>
          )}
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
              添加触发器
            </h2>
            <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0 0' }}>
              选择触发工作流的方式
            </p>
          </div>
        </div>

        <div className="modal-search">
          <Search size={16} style={{ color: '#999' }} />
          <input
            type="text"
            placeholder="搜索触发器..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              background: 'transparent',
              padding: '0 8px',
            }}
          />
        </div>

        <div className="modal-body">
          <ItemsRenderer
            elements={elements}
            onSelected={(element) => {
              if (element.type === 'node' && element.properties) {
                handleTriggerSelect({
                  key: element.properties.name || '',
                  icon: element.properties.icon || <Zap />,
                  title: element.properties.displayName || '',
                  description: element.properties.description || '',
                  nodeType: element.properties.name,
                });
              }
            }}
          />
        </div>
      </div>
    );
  };

  const renderCategorySelector = () => {
    const filteredCategories = availableCategories.filter(cat => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return cat.title.toLowerCase().includes(query) || 
             (cat.description?.toLowerCase().includes(query) ?? false);
    });

    const elements: INodeCreateElement[] = filteredCategories.map((category, index) => ({
      uuid: `category-${category.key}-${index}`,
      type: 'node' as const,
      properties: {
        name: category.key,
        displayName: category.title,
        description: category.description || '',
        icon: category.icon,
      } as SimplifiedNodeType,
    }));

    return (
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
              选择节点类型
            </h2>
            <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0 0' }}>
              浏览分类或搜索节点
            </p>
          </div>
        </div>

        <div className="modal-search">
          <Search size={16} style={{ color: '#999' }} />
          <input
            type="text"
            placeholder="搜索分类..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              background: 'transparent',
              padding: '0 8px',
            }}
          />
        </div>

        <div className="modal-body">
          <ItemsRenderer
            elements={elements}
            onSelected={(element) => {
              if (element.type === 'node' && element.properties) {
                handleCategorySelect({
                  key: element.properties.name || '',
                  title: element.properties.displayName || '',
                });
              }
            }}
          />

          {hasTrigger && (
            <div className="add-trigger-section">
              <div className="add-trigger-divider">
                <span>或</span>
              </div>
              <button
                className="add-trigger-button"
                onClick={handleAddAnotherTrigger}
              >
                <Plus size={16} />
                <span>添加另一个触发器</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSubcategorySelector = () => {
    if (!selectedCategory) return null;

    const filteredNodes = selectedCategory.nodes.filter(node => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (node.displayName || node.name || '').toLowerCase().includes(query) || 
             (node.description?.toLowerCase().includes(query) ?? false);
    });

    const elements: INodeCreateElement[] = [
      {
        uuid: `label-${selectedCategory.category}`,
        type: 'label',
        title: selectedCategory.category.charAt(0).toUpperCase() + selectedCategory.category.slice(1),
      },
      ...filteredNodes.map((node, index) => ({
        uuid: `node-${node.name}-${index}`,
        type: 'node' as const,
        properties: node,
        subcategory: selectedCategory.category,
      })),
    ];

    return (
      <div className="modal-content">
        <div className="modal-header">
          <button className="back-button" onClick={handleBack}>
            <ChevronLeft size={20} />
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
            {selectedCategory.category.charAt(0).toUpperCase() + selectedCategory.category.slice(1)}
          </h2>
        </div>

        <div className="modal-search">
          <Search size={16} style={{ color: '#999' }} />
          <input
            type="text"
            placeholder="搜索节点..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              background: 'transparent',
              padding: '0 8px',
            }}
          />
        </div>

        <div className="modal-body">
          <ItemsRenderer
            elements={elements}
            onSelected={(element) => {
              if (element.type === 'node' && element.properties) {
                handleNodeSelect(element.properties);
              }
            }}
          />
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (!hasTrigger) {
      return renderTriggerSelector();
    }

    switch (currentView) {
      case 'category':
        return renderCategorySelector();
      case 'subcategory':
        return renderSubcategorySelector();
      case 'trigger':
        return renderTriggerSelector();
      default:
        return renderCategorySelector();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="node-selector-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>
          <X size={20} />
        </button>
        {renderContent()}
      </div>
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .node-selector-modal {
          background: white;
          border-radius: 16px;
          width: 520px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          position: relative;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }
        .close-button {
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          color: #999;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }
        .close-button:hover {
          background: #f0f0f0;
          color: #666;
        }
        .modal-content {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
        }
        .modal-header {
          padding: 20px 20px 12px;
          border-bottom: 1px solid #f0f0f0;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          flex-shrink: 0;
        }
        .back-button {
          background: none;
          border: none;
          cursor: pointer;
          color: #666;
          padding: 4px;
          margin: -4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }
        .back-button:hover {
          background: #f0f0f0;
        }
        .modal-search {
          margin: 12px 20px;
          padding: 8px 12px;
          background: #f5f5f5;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .modal-body {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 0 12px 12px;
          min-height: 0;
        }
        .category-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .category-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .category-item:hover {
          background: #f5f5f5;
        }
        .category-icon {
          width: 40px;
          height: 40px;
          background: #f0f0f0;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
        }
        .category-content {
          flex: 1;
        }
        .category-title {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }
        .category-description {
          font-size: 12px;
          color: #999;
          margin-top: 2px;
        }
        .add-trigger-section {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #f0f0f0;
        }
        .add-trigger-divider {
          text-align: center;
          color: #999;
          font-size: 12px;
          margin-bottom: 12px;
          position: relative;
        }
        .add-trigger-divider::before,
        .add-trigger-divider::after {
          content: '';
          position: absolute;
          top: 50%;
          width: 40%;
          height: 1px;
          background: #f0f0f0;
        }
        .add-trigger-divider::before {
          left: 0;
        }
        .add-trigger-divider::after {
          right: 0;
        }
        .add-trigger-button {
          width: 100%;
          padding: 10px;
          background: #f5f5f5;
          border: 1px dashed #ddd;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #666;
          font-size: 14px;
          transition: all 0.15s;
        }
        .add-trigger-button:hover {
          background: #f0f0f0;
          border-color: #ccc;
          color: #333;
        }
      `}</style>
    </div>
  );
};
