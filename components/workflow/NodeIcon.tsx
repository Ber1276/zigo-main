import React from 'react';

export type NodeIconSource = 
  | { type: 'icon'; name: string; color?: string; badge?: NodeIconSource }
  | { type: 'file'; src: string; badge?: NodeIconSource }
  | { type: 'unknown' };

export interface NodeIconProps {
  size?: number;
  disabled?: boolean;
  circle?: boolean;
  colorDefault?: string;
  showTooltip?: boolean;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  nodeName?: string;
  iconSource?: NodeIconSource;
  nodeType?: any;
  node?: any;
}

/**
 * 获取主题化的值（Themed<string>）
 * n8n 的 iconUrl 和 icon 可能是 Themed<string> 类型：{ light?: string, dark?: string } | string
 * 参考：packages/frontend/editor-ui/src/app/utils/nodeTypesUtils.ts
 */
function getThemedValue(value: any, theme: 'light' | 'dark' = 'light'): string | null {
  if (!value) return null;
  
  // 如果是字符串，直接返回
  if (typeof value === 'string') return value;
  
  // 如果是对象（Themed 类型），根据主题获取值
  if (typeof value === 'object' && value !== null) {
    return value[theme] || value.light || value.dark || null;
  }
  
  return null;
}

/**
 * 添加 baseUrl 前缀到相对路径
 * 参考：packages/frontend/editor-ui/src/app/utils/nodeIcon.ts:106
 */
function prefixBaseUrl(url: string): string {
  // 如果已经是绝对 URL，直接返回
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('//')) {
    return url;
  }
  
  // 获取 n8n 的 baseUrl（通常是 http://localhost:5678）
  // 开发环境从环境变量或使用默认值
  const n8nBaseUrl = import.meta.env.VITE_N8N_BASE_URL || 'http://localhost:5678';
  const baseUrl = n8nBaseUrl.startsWith('http') ? n8nBaseUrl : `http://${n8nBaseUrl}`;
  
  // 确保 URL 以 / 开头
  const path = url.startsWith('/') ? url : `/${url}`;
  
  return `${baseUrl}${path}`;
}

/**
 * 获取节点图标源
 * 参考 n8n: packages/frontend/editor-ui/src/app/utils/nodeIcon.ts:142-189
 */
function getNodeIconSource(nodeType: any, node?: any): NodeIconSource {
  if (!nodeType) return { type: 'unknown' };

  // 优先使用 iconUrl（参考 n8n 的 getNodeIconSource，第 160 行）
  // iconUrl 可能是 Themed<string> 类型，需要提取
  const iconUrl = getThemedValue(nodeType.iconUrl);
  if (iconUrl) {
    // 使用 prefixBaseUrl 添加 baseUrl 前缀（参考 n8n 第 161 行）
    const src = prefixBaseUrl(iconUrl);
    return { type: 'file', src };
  }

  // 使用 icon 字段（格式：icon:name 或 file:path）
  // 参考 n8n 的 getNodeIconSource，第 163-185 行
  // icon 可能是 Themed<string> 类型，需要提取
  const icon = getThemedValue(nodeType.icon);
  if (icon) {
    const [iconType, iconName] = icon.split(':');
    
    // 处理 file:path 格式
    if (iconType === 'file' && iconName) {
      // n8n 使用 iconBasePath，如果没有则返回 undefined（参考 n8n 第 174-182 行）
      if (nodeType.iconBasePath) {
        const iconPath = iconName.replace(/^\//, '');
        const src = prefixBaseUrl(`${nodeType.iconBasePath}/${iconPath}`);
        return { type: 'file', src };
      }
      // 如果没有 iconBasePath，返回 undefined（n8n 的行为）
      // 这里返回 unknown，让组件显示占位符
    }
    // 处理 icon:name 格式（如 icon:search）
    else if (iconType === 'icon' && iconName) {
      // 获取图标颜色
      let iconColor: string | undefined;
      if (nodeType.iconColor) {
        // n8n 使用 CSS 变量格式：var(--node--icon--color--${iconColor})
        iconColor = `var(--node--icon--color--${nodeType.iconColor})`;
      } else if (nodeType.defaults?.color) {
        iconColor = typeof nodeType.defaults.color === 'string' 
          ? nodeType.defaults.color 
          : undefined;
      }
      
      return { 
        type: 'icon', 
        name: iconName,
        color: iconColor
      };
    }
  }

  // 如果没有图标，返回 unknown
  return { type: 'unknown' };
}

/**
 * NodeIcon 组件 - 显示节点图标
 * 基于 n8n 的 NodeIcon.vue 转换
 */
export const NodeIcon: React.FC<NodeIconProps> = ({
  size = 24,
  disabled = false,
  circle = false,
  colorDefault = '',
  showTooltip = false,
  tooltipPosition = 'top',
  nodeName = '',
  iconSource,
  nodeType,
  node,
}) => {
  const resolvedIconSource = iconSource || (nodeType ? getNodeIconSource(nodeType, node) : { type: 'unknown' });
  
  const iconType = resolvedIconSource.type;
  const src = iconType === 'file' ? (resolvedIconSource as any).src : undefined;
  const iconName = iconType === 'icon' ? (resolvedIconSource as any).name : undefined;
  const iconColor = iconType === 'icon' ? ((resolvedIconSource as any).color || colorDefault) : undefined;
  const badge = (resolvedIconSource as any).badge;
  
  const displayName = nodeName || nodeType?.displayName || nodeType?.name || '';

  const iconStyle: React.CSSProperties = {
    width: size ? `${size}px` : undefined,
    height: size ? `${size}px` : undefined,
    fontSize: size ? `${size}px` : undefined,
    lineHeight: size ? `${size}px` : undefined,
    color: iconColor || undefined,
  };

  const renderIcon = () => {
    if (iconType === 'file' && src) {
      return (
        <img 
          src={src} 
          alt={displayName}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      );
    } else if (iconType === 'icon' && iconName) {
      // 使用 Lucide React 图标库（zigo 项目使用的图标库）
      // 如果图标名称不在 Lucide 中，显示首字母
      try {
        // 动态导入图标（需要根据实际图标库调整）
        // 这里使用简单的首字母占位符
        return (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size ? `${size * 0.6}px` : '14px',
            fontWeight: 'bold',
            color: iconColor || '#666',
          }}>
            {displayName ? displayName.charAt(0).toUpperCase() : '?'}
          </div>
        );
      } catch {
        return (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size ? `${size * 0.6}px` : '14px',
            fontWeight: 'bold',
            color: iconColor || '#666',
          }}>
            {displayName ? displayName.charAt(0).toUpperCase() : '?'}
          </div>
        );
      }
    } else {
      // Unknown type - 显示首字母占位符
      return (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size ? `${size * 0.6}px` : '14px',
          fontWeight: 'bold',
          color: '#999',
          backgroundColor: '#f0f0f0',
          borderRadius: circle ? '50%' : '4px',
        }}>
          {displayName ? displayName.charAt(0).toUpperCase() : '?'}
        </div>
      );
    }
  };

  const wrapperClassName = `n8n-node-icon ${circle ? 'circle' : ''} ${disabled ? 'disabled' : ''}`;
  const wrapperStyle: React.CSSProperties = {
    ...iconStyle,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  };

  return (
    <div className={wrapperClassName} style={wrapperStyle}>
      {renderIcon()}
      {badge && badge.type === 'file' && (
        <div style={{
          position: 'absolute',
          right: '-6px',
          bottom: '-6px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          border: '2px solid white',
          overflow: 'hidden',
        }}>
          <img 
            src={(badge as any).src} 
            alt="badge"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}
    </div>
  );
};

export default NodeIcon;

