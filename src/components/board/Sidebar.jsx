
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStore } from '../../store/useStore';
import { Plus, X, GripVertical, Check } from 'lucide-react';
import { uuid } from '../../utils/uuid';
import { useParams } from 'react-router-dom';
import { updateUserSettings } from '../../services/syncService';
import { auth } from '../../services/firebase';

const GLOBAL_PROMPTS_KEY = 'mixboard_global_prompts';
const MAX_NAME_LENGTH = 10;

// Notion-like clear vibrant colors
const TAG_COLORS = [
    'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
    'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 border-sky-200 dark:border-sky-500/20',
    'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20',
];

const getRandomColor = () => TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];

// Moved outside Sidebar to prevent re-creation on every render
const AddInput = ({ type, onCancel, newName, setNewName, newContent, setNewContent, onSubmit, t }) => (
    <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-sm"
        onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
        <div
            className="flex flex-col gap-2 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl w-72 animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
        >
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.sidebar.newPrompt || "NEW PROMPT"}</div>

            {/* Name Input */}
            <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Label</span>
                    <span>{newName.length}/{MAX_NAME_LENGTH}</span>
                </div>
                <input
                    autoFocus
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    maxLength={MAX_NAME_LENGTH}
                    placeholder="Tag Name"
                    className="w-full px-2 py-1.5 text-xs rounded border border-brand-300 dark:border-brand-700 focus:ring-1 focus:ring-brand-500 outline-none bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    onKeyDown={e => {
                        if (e.key === 'Enter') document.getElementById('prompt-content-input')?.focus();
                        if (e.key === 'Escape') onCancel();
                    }}
                />
            </div>

            {/* Content Input */}
            <div>
                <div className="text-[10px] text-slate-400 mb-1">Prompt Content</div>
                <textarea
                    id="prompt-content-input"
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    placeholder="Enter the full instruction..."
                    className="w-full px-2 py-1.5 text-xs rounded border border-brand-300 dark:border-brand-700 focus:ring-1 focus:ring-brand-500 outline-none bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-[80px] resize-none"
                    onKeyDown={e => {
                        if (e.key === 'Enter' && e.metaKey) onSubmit();
                        if (e.key === 'Escape') onCancel();
                    }}
                />
            </div>

            <div className="flex justify-end gap-2 pt-1">
                <button onClick={onCancel} className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                    <X size={14} />
                </button>
                <button
                    onClick={onSubmit}
                    disabled={!newName.trim()}
                    className="p-1.5 bg-brand-500 text-white rounded hover:bg-brand-600 disabled:opacity-50"
                >
                    <Check size={14} />
                </button>
            </div>
        </div>
    </div>
);
export default function Sidebar({ className = "" }) {
    const { t } = useLanguage();
    const { id: boardId } = useParams();
    const boardPrompts = useStore(state => state.boardPrompts || []);
    const addBoardPrompt = useStore(state => state.addBoardPrompt);
    const removeBoardPrompt = useStore(state => state.removeBoardPrompt);

    const [globalPrompts, setGlobalPrompts] = useState([]);
    const [isAdding, setIsAdding] = useState(null); // 'global' | 'board' | null

    // Adding Form State
    const [newName, setNewName] = useState('');
    const [newContent, setNewContent] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem(GLOBAL_PROMPTS_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Ensure prompts have colors if legacy data didn't have them
                const withColors = parsed.map(p => p.color ? p : { ...p, color: getRandomColor() });
                setGlobalPrompts(withColors);
            } catch (e) {
                console.error("Failed to load global prompts", e);
            }
        }
    }, []);

    const saveGlobalPrompts = (prompts) => {
        setGlobalPrompts(prompts);
        localStorage.setItem(GLOBAL_PROMPTS_KEY, JSON.stringify(prompts));

        // Cloud sync
        if (auth?.currentUser) {
            updateUserSettings(auth.currentUser.uid, { globalPrompts: prompts });
        }
    };

    const handleAdd = (type) => {
        // Require at least a name
        if (!newName.trim()) {
            setIsAdding(null);
            return;
        }

        const newPrompt = {
            id: uuid(),
            name: newName.trim().substring(0, MAX_NAME_LENGTH),
            content: newContent.trim() || newName.trim(), // Fallback content to name if empty
            text: newName.trim().substring(0, MAX_NAME_LENGTH), // Legacy text field for compatibility, using name
            createdAt: Date.now(),
            color: getRandomColor()
        };

        if (type === 'global') {
            saveGlobalPrompts([...globalPrompts, newPrompt]);
        } else {
            addBoardPrompt(newPrompt);
        }

        // Reset
        setNewName('');
        setNewContent('');
        setIsAdding(null);
    };

    const handleDelete = (id, type) => {
        if (type === 'global') {
            saveGlobalPrompts(globalPrompts.filter(p => p.id !== id));
        } else {
            removeBoardPrompt(id);
        }
    };

    const handleDragStart = (e, prompt) => {
        // Use prompt.content as the payload, fallback to prompt.text (legacy name/content mix)
        const payloadText = prompt.content || prompt.text;

        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'prompt',
            text: payloadText,
            isInstruction: true
        }));
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', payloadText);
    };

    // Editing state
    const [editingPrompt, setEditingPrompt] = useState(null); // { id, name, content, type }

    const handleEdit = (prompt, type) => {
        setEditingPrompt({
            id: prompt.id,
            name: prompt.name || prompt.text,
            content: prompt.content || prompt.text,
            type
        });
    };

    const handleSaveEdit = () => {
        if (!editingPrompt || !editingPrompt.name.trim()) {
            setEditingPrompt(null);
            return;
        }

        const updatedPrompt = {
            id: editingPrompt.id,
            name: editingPrompt.name.trim().substring(0, MAX_NAME_LENGTH),
            content: editingPrompt.content.trim() || editingPrompt.name.trim(),
            text: editingPrompt.name.trim().substring(0, MAX_NAME_LENGTH),
        };

        if (editingPrompt.type === 'global') {
            const updated = globalPrompts.map(p =>
                p.id === editingPrompt.id ? { ...p, ...updatedPrompt } : p
            );
            saveGlobalPrompts(updated);
        } else {
            // Call updateBoardPrompt from store
            const updateBoardPrompt = useStore.getState().updateBoardPrompt;
            if (updateBoardPrompt) {
                updateBoardPrompt(editingPrompt.id, updatedPrompt);
            }
        }
        setEditingPrompt(null);
    };

    const PromptTag = ({ prompt, type }) => {
        const colorClass = prompt.color || getRandomColor();
        // Use prompt.name for display, fallback to prompt.text
        const displayName = prompt.name || prompt.text;

        return (
            <div
                draggable
                onDragStart={(e) => handleDragStart(e, prompt)}
                onDoubleClick={() => handleEdit(prompt, type)}
                className={`
                    group relative flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full cursor-grab active:cursor-grabbing transition-all hover:scale-105 shadow-sm border
                    ${colorClass}
                `}
                title={`Double-click to edit\n\n${prompt.content || prompt.text}`}
            >
                <GripVertical size={10} className="opacity-40 group-hover:opacity-100" />
                <span>{displayName}</span>
                <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(prompt.id, type); }}
                    className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-all"
                >
                    <X size={10} />
                </button>
            </div>
        );
    };

    return (
        <div className={`flex flex-col gap-6 pointer-events-none select-none ${className}`} style={{ width: 'fit-content' }}>
            {/* Global Group */}
            <div className={`flex flex-col items-start gap-2 pointer-events-auto relative ${isAdding === 'global' ? 'z-50' : ''}`}>
                <div className="flex items-center justify-between w-full gap-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t.sidebar.global}</span>
                </div>
                <div className="flex flex-col items-start gap-2 max-w-[140px] flex-wrap">
                    {globalPrompts.map(p => <PromptTag key={p.id} prompt={p} type="global" />)}

                    <div className="relative">
                        <button
                            onClick={() => { setIsAdding('global'); setNewName(''); setNewContent(''); }}
                            className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                        >
                            <Plus size={12} /> {t.sidebar.add}
                        </button>
                        {isAdding === 'global' && createPortal(<AddInput type="global" onCancel={() => setIsAdding(null)} newName={newName} setNewName={setNewName} newContent={newContent} setNewContent={setNewContent} onSubmit={() => handleAdd('global')} t={t} />, document.body)}
                    </div>
                </div>
            </div>

            {/* Board Group */}
            <div className={`flex flex-col items-start gap-2 pointer-events-auto relative ${isAdding === 'board' ? 'z-50' : ''}`}>
                <div className="flex items-center justify-between w-full gap-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t.sidebar.board}</span>
                </div>
                <div className="flex flex-col items-start gap-2 max-w-[140px] flex-wrap">
                    {boardPrompts.map(p => <PromptTag key={p.id} prompt={p} type="board" />)}

                    <div className="relative">
                        <button
                            onClick={() => { setIsAdding('board'); setNewName(''); setNewContent(''); }}
                            className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                        >
                            <Plus size={12} /> {t.sidebar.add}
                        </button>
                        {isAdding === 'board' && createPortal(<AddInput type="board" onCancel={() => setIsAdding(null)} newName={newName} setNewName={setNewName} newContent={newContent} setNewContent={setNewContent} onSubmit={() => handleAdd('board')} t={t} />, document.body)}
                    </div>
                </div>
            </div>

            {/* Edit Modal - Rendered via Portal to escape pointer-events-none parent */}
            {editingPrompt && createPortal(
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-sm"
                    onClick={e => { if (e.target === e.currentTarget) setEditingPrompt(null); }}
                >
                    <div
                        className="flex flex-col gap-2 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl w-72 animate-in fade-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.sidebar.editPrompt || "EDIT PROMPT"}</div>

                        {/* Name Input */}
                        <div>
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                <span>Label</span>
                                <span>{editingPrompt.name.length}/{MAX_NAME_LENGTH}</span>
                            </div>
                            <input
                                autoFocus
                                type="text"
                                value={editingPrompt.name}
                                onChange={e => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
                                maxLength={MAX_NAME_LENGTH}
                                placeholder="Tag Name"
                                className="w-full px-2 py-1.5 text-xs rounded border border-brand-300 dark:border-brand-700 focus:ring-1 focus:ring-brand-500 outline-none bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                onKeyDown={e => {
                                    if (e.key === 'Enter') document.getElementById('edit-prompt-content')?.focus();
                                    if (e.key === 'Escape') setEditingPrompt(null);
                                }}
                            />
                        </div>

                        {/* Content Input */}
                        <div>
                            <div className="text-[10px] text-slate-400 mb-1">Prompt Content</div>
                            <textarea
                                id="edit-prompt-content"
                                value={editingPrompt.content}
                                onChange={e => setEditingPrompt({ ...editingPrompt, content: e.target.value })}
                                placeholder="Enter the full instruction..."
                                className="w-full px-2 py-1.5 text-xs rounded border border-brand-300 dark:border-brand-700 focus:ring-1 focus:ring-brand-500 outline-none bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-[80px] resize-none"
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && e.metaKey) handleSaveEdit();
                                    if (e.key === 'Escape') setEditingPrompt(null);
                                }}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <button onClick={() => setEditingPrompt(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                                <X size={14} />
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={!editingPrompt.name.trim()}
                                className="p-1.5 bg-brand-500 text-white rounded hover:bg-brand-600 disabled:opacity-50"
                            >
                                <Check size={14} />
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
