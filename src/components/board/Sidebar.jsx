
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStore } from '../../store/useStore';
import { Plus, X, GripVertical } from 'lucide-react';
import { uuid } from '../../utils/uuid';
import { useParams } from 'react-router-dom';

const GLOBAL_PROMPTS_KEY = 'mixboard_global_prompts';
const MAX_PROMPT_LENGTH = 10;
// Notion-like pastel colors
const TAG_COLORS = [
    'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
    'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800',
    'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300 border-pink-200 dark:border-pink-800',
    'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
];

const getRandomColor = () => TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];

export default function Sidebar({ className = "" }) {
    const { t } = useLanguage();
    const { id: boardId } = useParams();
    const boardPrompts = useStore(state => state.boardPrompts || []);
    const addBoardPrompt = useStore(state => state.addBoardPrompt);
    const removeBoardPrompt = useStore(state => state.removeBoardPrompt);

    const [globalPrompts, setGlobalPrompts] = useState([]);
    const [isAdding, setIsAdding] = useState(null); // 'global' | 'board' | null
    const [newPromptText, setNewPromptText] = useState('');

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
    };

    const handleAdd = (type) => {
        if (!newPromptText.trim()) {
            setIsAdding(null);
            return;
        }

        const newPrompt = {
            id: uuid(),
            text: newPromptText.trim().substring(0, MAX_PROMPT_LENGTH), // Enforce limit
            createdAt: Date.now(),
            color: getRandomColor()
        };

        if (type === 'global') {
            saveGlobalPrompts([...globalPrompts, newPrompt]);
        } else {
            addBoardPrompt({ ...newPrompt, text: newPrompt.text }); // Store handles adding
        }
        setNewPromptText('');
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
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'prompt',
            text: prompt.text,
            isInstruction: true
        }));
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', prompt.text);
    };

    const PromptTag = ({ prompt, type }) => {
        const colorClass = prompt.color || getRandomColor();
        return (
            <div
                draggable
                onDragStart={(e) => handleDragStart(e, prompt)}
                className={`
                    group relative flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full cursor-grab active:cursor-grabbing transition-all hover:scale-105 shadow-sm border
                    ${colorClass}
                `}
            >
                <GripVertical size={10} className="opacity-40 group-hover:opacity-100" />
                <span>{prompt.text}</span>
                <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(prompt.id, type); }}
                    className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-all"
                >
                    <X size={10} />
                </button>
            </div>
        );
    };

    const AddInput = ({ type, onCancel }) => (
        <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
            <input
                autoFocus
                type="text"
                value={newPromptText}
                onChange={e => setNewPromptText(e.target.value)}
                maxLength={MAX_PROMPT_LENGTH}
                placeholder={t.sidebar.addPrompt}
                className="w-24 px-2 py-1 text-xs rounded-full bg-white dark:bg-slate-800 border border-brand-300 dark:border-brand-600 focus:ring-1 focus:ring-brand-500 outline-none"
                onKeyDown={e => {
                    if (e.key === 'Enter') handleAdd(type);
                    if (e.key === 'Escape') onCancel();
                }}
                onBlur={() => handleAdd(type)} // Auto-save on blur
            />
            <span className="text-[10px] text-slate-400">{newPromptText.length}/{MAX_PROMPT_LENGTH}</span>
        </div>
    );

    return (
        <div className={`flex flex-col gap-6 pointer-events-none select-none ${className}`} style={{ width: 'fit-content' }}>
            {/* Global Group */}
            <div className="flex flex-col items-start gap-2 pointer-events-auto">
                <div className="flex items-center justify-between w-full gap-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t.sidebar.global}</span>
                </div>
                <div className="flex flex-col items-start gap-2 max-w-[140px] flex-wrap">
                    {globalPrompts.map(p => <PromptTag key={p.id} prompt={p} type="global" />)}

                    {isAdding === 'global' ? (
                        <AddInput type="global" onCancel={() => setIsAdding(null)} />
                    ) : (
                        <button
                            onClick={() => setIsAdding('global')}
                            className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                        >
                            <Plus size={12} /> {t.sidebar.add}
                        </button>
                    )}
                </div>
            </div>

            {/* Board Group */}
            <div className="flex flex-col items-start gap-2 pointer-events-auto">
                <div className="flex items-center justify-between w-full gap-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t.sidebar.board}</span>
                </div>
                <div className="flex flex-col items-start gap-2 max-w-[140px] flex-wrap">
                    {boardPrompts.map(p => <PromptTag key={p.id} prompt={p} type="board" />)}

                    {isAdding === 'board' ? (
                        <AddInput type="board" onCancel={() => setIsAdding(null)} />
                    ) : (
                        <button
                            onClick={() => setIsAdding('board')}
                            className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                        >
                            <Plus size={12} /> {t.sidebar.add}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
