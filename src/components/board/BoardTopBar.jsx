import React, { useState } from 'react';
import { LayoutGrid, Undo2, Redo2 } from 'lucide-react';
import { useTemporalStore } from '../../store/useStore';

export default function BoardTopBar({ onBack, board, onUpdateTitle }) {
    const undo = useTemporalStore((state) => state.undo);
    const redo = useTemporalStore((state) => state.redo);
    const pastStates = useTemporalStore((state) => state.pastStates);
    const futureStates = useTemporalStore((state) => state.futureStates);

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleJustSaved, setTitleJustSaved] = useState(false);

    const saveTitleWithFeedback = (value) => {
        if (!value || !value.trim()) return;
        onUpdateTitle(value);
        setTitleJustSaved(true);
        setTimeout(() => setTitleJustSaved(false), 1000);
    };

    return (
        <div className="absolute top-3 md:top-6 left-3 md:left-6 z-50 animate-slide-down">
            <div className="flex items-center gap-0 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 p-1 md:p-1.5 rounded-xl md:rounded-2xl shadow-xl">
                <button onClick={onBack} className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-all">
                    <LayoutGrid size={16} className="md:w-[18px] md:h-[18px]" />
                    <span className="hidden sm:inline text-sm">Gallery</span>
                </button>
                <div className="h-5 md:h-6 w-[1px] bg-slate-200 mx-1 md:mx-2" />
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => undo()}
                        disabled={pastStates.length === 0}
                        className={`p-2 rounded-xl transition-all ${pastStates.length === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'}`}
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo2 size={18} />
                    </button>
                    <button
                        onClick={() => redo()}
                        disabled={futureStates.length === 0}
                        className={`p-2 rounded-xl transition-all ${futureStates.length === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'}`}
                        title="Redo (Ctrl+Shift+Z)"
                    >
                        <Redo2 size={18} />
                    </button>
                </div>
                <div className="hidden sm:block h-5 md:h-6 w-[1px] bg-slate-200 mx-1 md:mx-2" />
                <div className="hidden sm:block relative flex items-center group">
                    <input
                        type="text"
                        key={board?.id}
                        defaultValue={board?.name || 'Untitled Board'}
                        onFocus={() => setIsEditingTitle(true)}
                        onBlur={(e) => {
                            setIsEditingTitle(false);
                            saveTitleWithFeedback(e.target.value);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.target.blur(); // This will trigger onBlur which handles save
                            }
                        }}
                        className={`
                            bg-transparent border-none outline-none font-bold text-sm px-2 py-1.5 rounded-lg
                            transition-all duration-200
                            ${isEditingTitle ? 'bg-slate-100 dark:bg-slate-800 ring-2 ring-blue-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                            ${titleJustSaved ? 'ring-2 ring-green-400' : ''}
                        `}
                        style={{ minWidth: '120px' }}
                    />
                    {!isEditingTitle && (
                        <svg
                            className="absolute right-1 w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    )}
                </div>
            </div>
        </div>
    );
}
