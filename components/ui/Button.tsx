/**
 * Button 组件
 * 基于 n8n 的 N8nButton 组件转换
 */

import React from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  type?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  icon?: LucideIcon | string;
  iconSize?: 'small' | 'medium' | 'large' | number;
  loading?: boolean;
  square?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const sizeClasses = {
  small: 'px-2 py-1 text-xs',
  medium: 'px-3 py-1.5 text-sm',
  large: 'px-4 py-2 text-base',
};

const typeClasses = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
  secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300 active:bg-slate-400',
  tertiary: 'bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
};

export const Button: React.FC<ButtonProps> = ({
  type = 'primary',
  size = 'medium',
  icon: Icon,
  iconSize = 'medium',
  loading = false,
  square = false,
  disabled,
  children,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const sizeClass = sizeClasses[size];
  const typeClass = typeClasses[type];
  const squareClass = square ? 'aspect-square' : '';
  
  const iconSizeValue = typeof iconSize === 'number' ? iconSize : 
    iconSize === 'small' ? 14 : 
    iconSize === 'large' ? 20 : 16;
  
  const finalClassName = `${baseClasses} ${sizeClass} ${typeClass} ${squareClass} ${className}`.trim();

  return (
    <button
      className={finalClassName}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={iconSizeValue} />
      ) : Icon ? (
        typeof Icon === 'string' ? (
          <span className="mr-2">{Icon}</span>
        ) : (
          <Icon size={iconSizeValue} className={children ? 'mr-2' : ''} />
        )
      ) : null}
      {children && <span>{children}</span>}
    </button>
  );
};

