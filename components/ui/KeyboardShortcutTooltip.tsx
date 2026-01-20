/**
 * KeyboardShortcutTooltip 组件
 * 基于 n8n 的 KeyboardShortcutTooltip 组件转换
 */

import React, { useState } from 'react';

export interface KeyboardShortcut {
  metaKey?: boolean; // Command on Mac, Ctrl on Windows/Linux
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  keys: string[];
}

export interface KeyboardShortcutTooltipProps {
  label: string;
  shortcut?: KeyboardShortcut;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  disabled?: boolean;
  children: React.ReactNode;
}

const formatKey = (key: string): string => {
  const keyMap: Record<string, string> = {
    '↵': 'Enter',
    '⌘': 'Cmd',
    '⌃': 'Ctrl',
    '⌥': 'Alt',
    '⇧': 'Shift',
    '⌫': 'Backspace',
    '⇥': 'Tab',
    '⎋': 'Escape',
    ' ': 'Space',
  };
  return keyMap[key] || key;
};

const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];
  
  if (shortcut.metaKey || shortcut.ctrlKey) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  
  if (shortcut.shiftKey) {
    parts.push('Shift');
  }
  
  if (shortcut.altKey) {
    parts.push('Alt');
  }
  
  shortcut.keys.forEach(key => {
    parts.push(formatKey(key));
  });
  
  return parts.join(' + ');
};

export const KeyboardShortcutTooltip: React.FC<KeyboardShortcutTooltipProps> = ({
  label,
  shortcut,
  placement = 'top',
  disabled = false,
  children,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (disabled) {
    return <>{children}</>;
  }

  const tooltipContent = (
    <div className="px-2 py-1 bg-slate-900 text-white text-xs rounded shadow-lg whitespace-nowrap flex items-center gap-2">
      <span>{label}</span>
      {shortcut && (
        <span className="text-slate-400 font-mono">
          {formatShortcut(shortcut)}
        </span>
      )}
    </div>
  );

  const placementClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div
          className={`absolute z-50 ${placementClasses[placement]}`}
          role="tooltip"
        >
          {tooltipContent}
        </div>
      )}
    </div>
  );
};

