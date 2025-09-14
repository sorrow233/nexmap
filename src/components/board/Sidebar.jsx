
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStore } from '../../store/useStore';
import { Plus, Trash2, GripVertical, Save, X, MessageSquare, Layout } from 'lucide-react';
import { uuid } from '../../utils/uuid';
import { useToast } from '../Toast';
import { useParams } from 'react-router-dom';

const GLOBAL_PROMPTS_KEY = 'mixboard_global_prompts';

export default function Sidebar({ className = "" }) {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('global'); // 'global' | 'board'
    const [isAdding, setIsAdding] = useState(false);
    const [newPromptText, setNewPromptText] = useState('');
    const toast = useToast();
    const { id: boardId } = useParams();

    // Board Prompts from Store
    // Ensure we are reading prompts for the *current board* (store state is board-scoped mostly, but boardPrompts is global in store? 
    // Wait, useStore is global. When we switch boards, the store state is replaced/loaded.
    // So boardPrompts in store refers to the current board's prompts.
    const boardPrompts = useStore(state => state.boardPrompts || []);
    const addBoardPrompt = useStore(state => state.addBoardPrompt);
    const removeBoardPrompt = useStore(state => state.removeBoardPrompt);

    // Global Prompts (Local State + LocalStorage)
    const [globalPrompts, setGlobalPrompts] = useState([]);

    useEffect(() => {
        const stored = localStorage.getItem(GLOBAL_PROMPTS_KEY);
        if (stored) {
            try {
                setGlobalPrompts(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to load global prompts", e);
            }
        }
    }, []);

    const saveGlobalPrompts = (prompts) => {
        setGlobalPrompts(prompts);
        localStorage.setItem(GLOBAL_PROMPTS_KEY, JSON.stringify(prompts));
    };

    const handleAddPrompt = () => {
        if (!newPromptText.trim()) return;

        if (activeTab === 'global') {
            const newPrompt = { id: uuid(), text: newPromptText, createdAt: Date.now() };
            saveGlobalPrompts([...globalPrompts, newPrompt]);
        } else {
            addBoardPrompt(newPromptText);
        }
        setNewPromptText('');
        setIsAdding(false);
    };

    const handleDelete = (id) => {
        if (confirm(t.sidebar.deleteConfirm)) {
            if (activeTab === 'global') {
                saveGlobalPrompts(globalPrompts.filter(p => p.id !== id));
            } else {
                removeBoardPrompt(id);
            }
        }
    };

    const handleDragStart = (e, prompt) => {
        // Set drag data
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'prompt',
            text: prompt.text,
            isInstruction: true
        }));
        e.dataTransfer.effectAllowed = 'copy';

        // Also set plain text for generic drop targets
        e.dataTransfer.setData('text/plain', prompt.text);
    };

    const currentPrompts = activeTab === 'global' ? globalPrompts : boardPrompts;

    return (
        <div className={`flex flex-col h-full bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md border-r border-slate-200 dark:border-slate-800 w-64 transition-all z-20 pointer-events-auto ${className}`}>
            {/* Header / Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 shrink-0">
                <button
                    onClick={() => setActiveTab('global')}
                    className={`flex-1 py-3 text-xs font-medium transition-colors flex items-center justify-center gap-2 relative ${activeTab === 'global'
                            ? 'text-brand-600 bg-brand-50/50 dark:bg-slate-800'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                >
                    <Layout size={14} />
                    {t.sidebar.global}
                    {activeTab === 'global' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-brand-600"></div>}
                </button>
                <div className="w-px bg-slate-200 dark:bg-slate-800"></div>
                <button
                    onClick={() => setActiveTab('board')}
                    className={`flex-1 py-3 text-xs font-medium transition-colors flex items-center justify-center gap-2 relative ${activeTab === 'board'
                            ? 'text-brand-600 bg-brand-50/50 dark:bg-slate-800'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                >
                    <MessageSquare size={14} />
                    {t.sidebar.board}
                    {activeTab === 'board' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-brand-600"></div>}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {t.sidebar.myPrompts}
                    </div>
                    {/* Add Button (Icon only) */}
                    {!isAdding && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="p-1 text-slate-500 hover:text-brand-600 rounded-md hover:bg-brand-50 dark:hover:bg-slate-800 transition-all"
                            title={t.sidebar.addPrompt}
                        >
                            <Plus size={14} />
                        </button>
                    )}
                </div>

                {isAdding && (
                    <div className="bg-white dark:bg-slate-800 border border-brand-300 dark:border-brand-700 rounded-lg p-2 shadow-md animate-in fade-in zoom-in-95 duration-200">
                        <textarea
                            autoFocus
                            value={newPromptText}
                            onChange={e => setNewPromptText(e.target.value)}
                            placeholder={t.chatBar.typeToCreate}
                            className="w-full text-sm bg-transparent border-none focus:ring-0 p-0 text-slate-700 dark:text-slate-200 resize-none min-h-[60px]"
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddPrompt();
                                } else if (e.key === 'Escape') {
                                    setIsAdding(false);
                                }
                            }}
                        />
                        <div className="flex justify-end gap-1 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                            <button
                                onClick={() => setIsAdding(false)}
                                className="p-1 px-2 text-xs text-slate-500 hover:text-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                {t.sidebar.cancel}
                            </button>
                            <button
                                onClick={handleAddPrompt}
                                disabled={!newPromptText.trim()}
                                className="p-1 px-3 text-xs bg-brand-500 text-white rounded hover:bg-brand-600 disabled:opacity-50 font-medium"
                            >
                                {t.sidebar.save}
                            </button>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    {currentPrompts.length === 0 && !isAdding && (
                        <div className="text-center py-8 text-slate-400 text-xs italic border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                            {t.card.noMessagesYet}
                        </div>
                    )}

                    {currentPrompts.map(prompt => (
                        <div
                            key={prompt.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, prompt)}
                            className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-sm hover:shadow-md hover:border-brand-300 dark:hover:border-brand-700 transition-all cursor-grab active:cursor-grabbing select-none"
                        >
                            <div className="text-sm text-slate-700 dark:text-slate-200 line-clamp-3">
                                {prompt.text}
                            </div>
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/90 dark:bg-slate-800/90 rounded backdrop-blur-sm shadow-sm ring-1 ring-black/5">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(prompt.id); }}
                                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                            <div className="absolute top-1/2 -left-2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-slate-300 pointer-events-none">
                                <GripVertical size={12} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-2 bg-slate-100/50 dark:bg-slate-900/30 text-[10px] text-slate-400 text-center border-t border-slate-200 dark:border-slate-800 shrink-0 select-none">
                {t.sidebar.dragHelp}
            </div>
        </div>
    );
}
