/**
 * Text 组件
 * 基于 n8n 的 N8nText 组件转换
 */

import React from 'react';

export interface TextProps {
  bold?: boolean;
  size?: 'mini' | 'small' | 'medium' | 'large';
  className?: string;
  children: React.ReactNode;
}

const sizeClasses = {
  mini: 'text-xs',
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
};

export const Text: React.FC<TextProps> = ({
  bold = false,
  size = 'medium',
  className = '',
  children,
}) => {
  const sizeClass = sizeClasses[size];
  const boldClass = bold ? 'font-semibold' : '';
  
  return (
    <span className={`${sizeClass} ${boldClass} ${className}`.trim()}>
      {children}
    </span>
  );
};

