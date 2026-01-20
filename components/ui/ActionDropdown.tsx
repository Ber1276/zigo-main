/**
 * ActionDropdown 组件
 * 基于 n8n 的 N8nActionDropdown 组件转换
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface ActionDropdownItem<T = string> {
  id: T;
  label: string;
  disabled?: boolean;
  checked?: boolean;
}

export interface ActionDropdownProps<T = string> {
  items: ActionDropdownItem<T>[];
  disabled?: boolean;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children?: React.ReactNode;
  onSelect: (id: T) => void;
  className?: string;
  renderMenuItem?: (item: ActionDropdownItem<T>) => React.ReactNode;
}

export const ActionDropdown: React.FC<ActionDropdownProps> = ({
  items,
  disabled = false,
  placement = 'bottom',
  children,
  onSelect,
  className = '',
  renderMenuItem,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (item: ActionDropdownItem) => {
    if (item.disabled) return;
    onSelect(item.id);
    setIsOpen(false);
  };

  const placementClasses = {
    top: 'bottom-full left-0 mb-1',
    bottom: 'top-full left-0 mt-1',
    left: 'right-full top-0 mr-1',
    right: 'left-full top-0 ml-1',
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <div onClick={() => !disabled && setIsOpen(!isOpen)}>
        {children}
      </div>
      {isOpen && (
        <div
          className={`absolute z-50 min-w-[200px] bg-white border border-slate-200 rounded-md shadow-lg ${placementClasses[placement]}`}
        >
          {items.map((item) => (
            <div
              key={String(item.id)}
              onClick={() => handleSelect(item)}
              className={`
                px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 transition-colors flex items-center gap-2
                ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${item.checked ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}
              `}
            >
              {renderMenuItem ? renderMenuItem(item) : item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

