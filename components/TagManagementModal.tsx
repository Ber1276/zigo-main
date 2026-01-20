import React, { useState, useMemo } from 'react';
import { X, Search, Tag, Pencil, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Workflow, Assistant } from '../types';

interface TagManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableTags: string[];
    workflows: Workflow[];
    assistants: Assistant[];
    onRenameTag: (oldName: string, newName: string) => void;
    onDeleteTag: (tagName: string) => void;
    onCreateTag: (tagName: string) => boolean; // Updated signature to simple void/boolean
}

export const TagManagementModal: React.FC<TagManagementModalProps> = ({ 
    isOpen, onClose, availableTags, workflows, assistants, onRenameTag, onDeleteTag, onCreateTag 
}) => {
    const [search, setSearch] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [editingTag, setEditingTag] = useState<{original: string, current: string} | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const filteredTags = useMemo(() => {
        return availableTags.filter(t => t.toLowerCase().includes(search.toLowerCase()));
    }, [availableTags, search]);

    const getTagUsage = (tagName: string) => {
        const wfNames = workflows.filter(w => w.tags?.includes(tagName)).map(w => w.name);
        const asNames = assistants.filter(a => a.tags?.includes(tagName)).map(a => a.name);
        const allNames = [...wfNames, ...asNames];
        
        if (allNames.length === 0) return '未使用';
        return allNames.join(', ');
    };

    const handleDelete = (tag: string) => {
        setDeleteConfirm(tag);
    };

    const confirmDelete = () => {
        if (deleteConfirm) {
            onDeleteTag(deleteConfirm);
            setDeleteConfirm(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col min-h-[400px] max-h-[80vh] relative">
                 <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                     <h3 className="text-lg font-bold text-slate-800">管理标签</h3>
                     <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                         <X size={20} />
                     </button>
                 </div>
                 
                 {availableTags.length === 0 && !isAdding ? (
                     <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                         <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-6">
                             <Tag size={32} className="text-slate-400" />
                         </div>
                         <p className="text-slate-500 mb-8 max-w-xs">
                             工作流标签可以更好的为您流程创建完美的标签系统
                         </p>
                         <div className="flex-1"></div>
                         <button 
                            onClick={() => setIsAdding(true)}
                            className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all shadow-sm mb-4"
                         >
                             创建标签
                         </button>
                     </div>
                 ) : (
                     <div className="flex-1 flex flex-col overflow-hidden">
                         <div className="p-4 flex items-center gap-2 border-b border-slate-100 bg-white shrink-0">
                             <div className="relative flex-1">
                                 <input 
                                     placeholder="输入搜索关键词" 
                                     value={search}
                                     onChange={(e) => setSearch(e.target.value)}
                                     className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                 />
                                 <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                             </div>
                             <button 
                                onClick={() => setIsAdding(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap shadow-sm"
                             >
                                 添加标签
                             </button>
                         </div>
                         
                         <div className="bg-slate-50 px-6 py-2 flex text-xs font-bold text-slate-500 border-b border-slate-100 shrink-0">
                             <div className="flex-1">名称</div>
                             <div className="w-64">状态/使用情况</div>
                             <div className="w-16 text-right">操作</div>
                         </div>
                         
                         <div className="flex-1 overflow-y-auto">
                             {isAdding && (
                                 <div className="px-6 py-3 border-b border-slate-100 bg-blue-50/50 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                                     <input 
                                         autoFocus
                                         value={newTagName}
                                         onChange={(e) => setNewTagName(e.target.value)}
                                         onKeyDown={(e) => {
                                             if (e.key === 'Enter') {
                                                 // Basic check, app context handles dupe check better logic
                                                 onCreateTag(newTagName);
                                                 setNewTagName('');
                                                 setIsAdding(false);
                                             }
                                         }}
                                         placeholder="输入新标签名称..."
                                         className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-sm outline-none focus:border-blue-500 bg-white"
                                     />
                                     <div className="flex gap-2">
                                         <button 
                                            onClick={() => {
                                                onCreateTag(newTagName);
                                                setNewTagName('');
                                                setIsAdding(false);
                                            }}
                                            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                         >
                                             创建
                                         </button>
                                         <button 
                                            onClick={() => { setIsAdding(false); setNewTagName(''); }}
                                            className="px-3 py-1.5 border border-slate-300 text-slate-600 text-xs rounded hover:bg-slate-50 bg-white"
                                         >
                                             取消
                                         </button>
                                     </div>
                                 </div>
                             )}
                             
                             {filteredTags.map(tag => (
                                 <div key={tag} className="px-6 py-3 border-b border-slate-50 flex items-center hover:bg-slate-50 group transition-colors">
                                     {editingTag?.original === tag ? (
                                         <div className="flex-1 flex items-center gap-2">
                                             <input 
                                                 autoFocus
                                                 value={editingTag.current}
                                                 onChange={(e) => setEditingTag({ ...editingTag, current: e.target.value })}
                                                 className="px-2 py-1 border border-blue-500 rounded text-sm outline-none w-full max-w-xs shadow-sm"
                                                 onKeyDown={(e) => {
                                                     if (e.key === 'Enter') {
                                                         onRenameTag(tag, editingTag.current); 
                                                         setEditingTag(null);
                                                     }
                                                 }}
                                             />
                                             <button onClick={() => { onRenameTag(tag, editingTag.current); setEditingTag(null); }} className="text-green-600 hover:bg-green-50 p-1 rounded"><CheckCircle2 size={16}/></button>
                                             <button onClick={() => setEditingTag(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded"><X size={16}/></button>
                                         </div>
                                     ) : (
                                         <div className="flex-1 text-sm font-medium text-slate-700">{tag}</div>
                                     )}
                                     
                                     <div className="w-64 text-xs text-slate-500 truncate pr-4" title={getTagUsage(tag)}>
                                         {getTagUsage(tag)}
                                     </div>
                                     
                                     <div className="w-16 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button onClick={() => setEditingTag({ original: tag, current: tag })} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors" title="重命名"><Pencil size={14}/></button>
                                         <button onClick={() => handleDelete(tag)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors" title="删除"><Trash2 size={14}/></button>
                                     </div>
                                 </div>
                             ))}
                             
                             {filteredTags.length === 0 && !isAdding && (
                                 <div className="p-8 text-center text-slate-400 text-sm">
                                     没有找到匹配的标签
                                 </div>
                             )}
                         </div>
                     </div>
                 )}
                 
                 <div className="p-4 bg-white border-t border-slate-100 flex justify-end shrink-0">
                     <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                     >
                         完成
                     </button>
                 </div>

                 {/* Delete Confirm Overlay inside Modal */}
                 {deleteConfirm && (
                     <div className="absolute inset-0 bg-white/95 z-50 flex items-center justify-center p-8 animate-in fade-in duration-200 backdrop-blur-sm">
                         <div className="text-center max-w-sm">
                             <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                                 <AlertTriangle size={24} />
                             </div>
                             <h4 className="text-lg font-bold text-slate-900 mb-2">删除标签 "{deleteConfirm}"?</h4>
                             <p className="text-sm text-slate-500 mb-6">
                                 此操作将从所有关联的工作流和助手中移除该标签，且无法撤销。
                             </p>
                             <div className="flex gap-3">
                                 <button 
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium"
                                 >
                                     取消
                                 </button>
                                 <button 
                                    onClick={confirmDelete}
                                    className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium shadow-sm"
                                 >
                                     确认删除
                                 </button>
                             </div>
                         </div>
                     </div>
                 )}
             </div>
        </div>
    );
};