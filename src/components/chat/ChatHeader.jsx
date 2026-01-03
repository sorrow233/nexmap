import React from 'react';
import { X, Star, StickyNote, Loader2, Sprout } from 'lucide-react';

const ChatHeader = ({
    card,
    onClose,
    onUpdate,
    onSprout,
    isSprouting,
    t
}) => {
    return (
        <div className="shrink-0 z-20 w-full h-20 px-6 flex flex-row items-center justify-between border-b border-slate-100 dark:border-white/5
        lg:w-16 lg:h-full lg:flex-col lg:justify-between lg:py-8 lg:px-0 lg:border-none transition-all group/sidebar">

            {/* Top/Left Section: Icon & Title */}
            <div className="flex items-center gap-4 lg:flex-col lg:gap-8 opacity-40 group-hover/sidebar:opacity-100 transition-all duration-500">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-500 shrink-0 ${card.type === 'note' ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/20' : 'bg-gradient-to-br from-brand-600 to-brand-700 shadow-brand-500/20'}`}>
                    {card.type === 'note' ? <StickyNote size={24} className="text-white" /> : <Star size={24} className="text-white" />}
                </div>

                <div className="flex flex-col min-w-0 lg:hidden">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg tracking-tight leading-tight truncate font-sans">
                        {card.data.title || (card.type === 'note' ? t.chat.insightArchive : t.chat.conversation)}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-600 dark:text-brand-400">
                            {card.type === 'note' ? t.chat.neuralNotepad : t.chat.neuralReader}
                        </span>
                    </div>
                </div>

                {/* Desktop Vertical Title */}
                <div className="hidden lg:block [writing-mode:vertical-rl] text-center font-bold text-slate-300 dark:text-slate-600 tracking-[0.4em] text-xs select-none cursor-default opacity-0 group-hover/sidebar:opacity-100 transition-all duration-700 max-h-[50vh] overflow-hidden whitespace-nowrap">
                    {card.data.title || (card.type === 'note' ? t.chat.insightArchive : t.chat.conversation)}
                </div>
            </div>

            {/* Bottom/Right Section: Actions */}
            <div className="flex items-center gap-3 lg:flex-col lg:gap-4 lg:mb-2 opacity-30 group-hover/sidebar:opacity-100 transition-all duration-500">
                {card.data.marks?.length > 0 && (
                    <button
                        onClick={() => onUpdate(card.id, (currentData) => ({ ...currentData, marks: [] }))}
                        className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                        title="Clear Marks"
                    >
                        <span className="text-[10px] font-bold">{card.data.marks.length}</span>
                    </button>
                )}

                {/* Sprout Button */}
                <button
                    onClick={onSprout}
                    disabled={isSprouting}
                    className={`group flex items-center justify-center gap-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all
                    ${isSprouting
                            ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 w-10 h-10 lg:w-12 lg:h-12'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 h-10 px-4 lg:px-0 lg:w-12 lg:h-12'
                        }`}
                    title="Sprout Ideas"
                >
                    {isSprouting ? <Loader2 size={18} className="animate-spin" /> : <Sprout size={18} />}
                    <span className="lg:hidden">{isSprouting ? 'Thinking...' : 'Sprout'}</span>
                </button>

                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all"
                >
                    <X size={24} />
                </button>
            </div>
        </div>
    );
};

export default ChatHeader;
