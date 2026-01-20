import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * SearchBar 组件 - 节点搜索栏
 * 基于 n8n 的 SearchBar.vue 转换
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = '搜索节点...',
  value = '',
  onChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // 自动聚焦
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.trim();
    setIsActive(newValue.length > 0);
    onChange?.(newValue);
  };

  const handleClear = () => {
    setIsActive(false);
    onChange?.('');
    inputRef.current?.focus();
  };

  return (
    <div
      className="search-container"
      style={{
        display: 'flex',
        height: '40px',
        padding: '0 8px',
        alignItems: 'center',
        margin: '8px',
        filter: 'drop-shadow(0 2px 5px rgba(46, 46, 50, 0.04))',
        border: '1px solid #e0e0e0',
        backgroundColor: '#f8f9fa',
        color: '#999',
        borderRadius: '4px',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          fontSize: '16px',
          marginRight: '8px',
          color: isActive ? '#6366f1' : '#999',
        }}
      >
        <Search size={16} />
      </div>
      <div style={{ flexGrow: 1 }}>
        <input
          ref={inputRef}
          placeholder={placeholder}
          value={value}
          onChange={handleInput}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            fontSize: '14px',
            appearance: 'none',
            backgroundColor: 'transparent',
            color: '#333',
          }}
          autoFocus
          data-test-id="node-creator-search-bar"
          tabIndex={0}
        />
      </div>
      {value.length > 0 && (
        <div
          onClick={handleClear}
          style={{
            minWidth: '20px',
            textAlign: 'right',
            display: 'inline-block',
            cursor: 'pointer',
            color: '#999',
          }}
        >
          <X size={16} />
        </div>
      )}
    </div>
  );
};

export default SearchBar;

