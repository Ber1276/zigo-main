import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, ChevronDown, Settings, Check, Search, Plus, Edit2, Tag } from 'lucide-react';

interface TagInputProps {
    selectedTags: string[];
    onChange: (tags: string[]) => void;
    availableTags: string[];
    onManageTags: () => void;
    onCreateTag?: (tag: string) => void;
    placeholder?: string;
    variant?: 'default' | 'header'; // 'default' for modal inputs, 'header' for editor header
}

export const TagInput: React.FC<TagInputProps> = ({ 
    selectedTags, onChange, availableTags, onManageTags, onCreateTag, placeholder = "选择或创建标签", variant = 'default' 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [viewMode, setViewMode] = useState<'RECENT' | 'ALL'>('RECENT');
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setInputValue('');
                setViewMode('RECENT');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectTag = (tag: string) => {
        if (!selectedTags.includes(tag)) {
            onChange([...selectedTags, tag]);
        } else {
            onChange(selectedTags.filter(t => t !== tag));
        }
        setInputValue('');
        setIsOpen(false);
    };

    const handleCreateTag = () => {
        const tag = inputValue.trim();
        if (tag) {
            // If tag doesn't exist in available tags, create it globally first
            if (onCreateTag && !availableTags.includes(tag)) {
                onCreateTag(tag);
            }
            
            // Add to selection if not already selected
            if (!selectedTags.includes(tag)) {
                onChange([...selectedTags, tag]);
            }
        }
        setInputValue('');
        setIsOpen(false);
    };

    const handleRemoveTag = (tag: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(selectedTags.filter(t => t !== tag));
    };

    const filteredTags = useMemo(() => {
        const lowerInput = inputValue.toLowerCase();
        return availableTags.filter(t => t.toLowerCase().includes(lowerInput));
    }, [availableTags, inputValue]);

    // Top 5 recent tags (simulated by taking first 5 available, assume availableTags is sorted by usage/recency)
    const recentTags = availableTags.slice(0, 5);
    const displayTags = inputValue ? filteredTags : (viewMode === 'ALL' ? availableTags : recentTags);

    return (
        <div className="relative" ref={containerRef}>
            {/* Trigger Area */}
            {variant === 'default' ? (
                <div 
                    onClick={() => { setIsOpen(!isOpen); if(!isOpen) setInputValue(''); }}
                    className={`w-full min-h-[42px] px-3 py-1.5 border rounded-lg bg-white flex flex-wrap items-center gap-2 cursor-text transition-all ${isOpen ? 'ring-2 ring-blue-100 border-blue-400' : 'border-slate-300 hover:border-slate-400'}`}
                >
                    {selectedTags.map(tag => (
                        <span key={tag} className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded flex items-center gap-1 border border-slate-200">
                            {tag}
                            <button onClick={(e) => handleRemoveTag(tag, e)} className="hover:text-red-500 rounded-full hover:bg-slate-200 p-0.5"><X size={10}/></button>
                        </span>
                    ))}
                    <div className="flex-1 flex items-center min-w-[120px]">
                        <input 
                            value={inputValue}
                            onChange={(e) => { setInputValue(e.target.value); setIsOpen(true); }}
                            onFocus={() => setIsOpen(true)}
                            placeholder={selectedTags.length === 0 ? placeholder : ""}
                            className="w-full text-sm outline-none bg-transparent placeholder:text-slate-400 text-slate-700 h-full py-1"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleCreateTag();
                                }
                                if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
                                    handleRemoveTag(selectedTags[selectedTags.length - 1], e as any);
                                }
                            }}
                        />
                    </div>
                    <div className="text-slate-400 flex items-center gap-1 border-l border-slate-100 pl-2">
                        {isOpen ? <Edit2 size={12} className="text-blue-500"/> : <ChevronDown size={14}/>}
                    </div>
                </div>
            ) : (
                // Header Variant
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-slate-100"
                >
                    <Plus size={12} /> 
                    {selectedTags.length > 0 ? (
                        <div className="flex gap-1">
                            {selectedTags.slice(0, 2).map(t => <span key={t} className="bg-slate-200 px-1 rounded text-slate-700">{t}</span>)}
                            {selectedTags.length > 2 && <span>+{selectedTags.length - 2}</span>}
                        </div>
                    ) : '添加标签'}
                </button>
            )}

            {/* Dropdown Portal */}
            {isOpen && (
                <div className={`absolute top-full left-0 mt-1 w-full min-w-[280px] bg-white border border-slate-200 rounded-lg shadow-xl z-[60] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-left`}>
                    
                    {/* Header Input (only if header variant or to refine search inside dropdown) */}
                    {variant === 'header' && (
                        <div className="p-2 border-b border-slate-100">
                            <input 
                                autoFocus
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="输入以创建或搜索..."
                                className="w-full text-sm px-2 py-1.5 bg-slate-50 border border-slate-200 rounded focus:border-blue-500 focus:bg-white outline-none transition-colors"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleCreateTag();
                                    }
                                }}
                            />
                        </div>
                    )}

                    <div className="max-h-[240px] overflow-y-auto py-1">
                        {/* Create Option */}
                        {inputValue && !filteredTags.some(t => t.toLowerCase() === inputValue.toLowerCase()) && (
                            <button 
                                onClick={handleCreateTag}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 text-blue-600 font-medium flex items-center gap-2"
                            >
                                <Plus size={14} /> 创建 "{inputValue}"
                            </button>
                        )}

                        {/* Recent / Filtered List */}
                        {displayTags.length > 0 ? (
                            <>
                                {!inputValue && viewMode === 'RECENT' && (
                                    <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">最近使用</div>
                                )}
                                {displayTags.map(tag => (
                                    <button 
                                        key={tag}
                                        onClick={() => handleSelectTag(tag)}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700 flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Tag size={14} className="text-slate-400 group-hover:text-blue-500" />
                                            {tag}
                                        </div>
                                        {selectedTags.includes(tag) && <Check size={14} className="text-blue-600" />}
                                    </button>
                                ))}
                            </>
                        ) : (
                            !inputValue && (
                                <div className="px-4 py-3 text-center text-xs text-slate-400">暂无最近标签</div>
                            )
                        )}
                        
                        {/* View All Button */}
                        {!inputValue && viewMode === 'RECENT' && availableTags.length > 5 && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); setViewMode('ALL'); }}
                                className="w-full text-left px-4 py-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-slate-50 font-medium border-t border-slate-50"
                            >
                                查看全部标签 ({availableTags.length})
                            </button>
                        )}
                         {!inputValue && viewMode === 'ALL' && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); setViewMode('RECENT'); }}
                                className="w-full text-left px-4 py-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-medium border-t border-slate-50"
                            >
                                收起
                            </button>
                        )}
                    </div>

                    {/* Footer Manage */}
                    <div className="border-t border-slate-100 p-1 bg-slate-50">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onManageTags(); setIsOpen(false); }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-200 hover:text-slate-800 rounded flex items-center gap-2 font-medium transition-colors"
                        >
                            <Settings size={14} /> 管理标签
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};