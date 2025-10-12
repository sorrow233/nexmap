import React, { useMemo } from 'react';
import { Hash, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function ChatIndexSidebar({ messages, onScrollTo }) {
    const { t } = useLanguage();

    const userMessages = useMemo(() => {
        return messages
            .map((m, i) => ({ m, i }))
            .filter(({ m }) => m.role === 'user');
    }, [messages]);

    if (userMessages.length === 0) return null;

    return (
        <div className="absolute right-2 top-24 bottom-32 w-32 hidden xl:flex flex-col gap-1 pointer-events-none opacity-0 animate-fade-in animation-delay-500" style={{ animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-300 dark:text-slate-600 select-none">
                <Hash size={10} />
                <span>INDEX</span>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar pr-1 pointer-events-auto space-y-1">
                {userMessages.map(({ m, i }) => {
                    let preview = '';
                    if (typeof m.content === 'string') {
                        preview = m.content.slice(0, 15);
                    } else if (Array.isArray(m.content)) {
                        const textPart = m.content.find(c => c.type === 'text');
                        preview = textPart ? textPart.text.slice(0, 15) : '[Image]';
                    }

                    if (!preview) preview = '...';

                    return (
                        <button
                            key={i}
                            onClick={() => onScrollTo(i)}
                            className="w-full group flex items-start text-left px-3 py-2 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 transition-all outline-none border border-transparent hover:border-slate-100 dark:hover:border-white/5"
                        >
                            <div className="mt-1 w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-brand-500 transition-colors shrink-0 mr-2" />
                            <span className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 font-medium leading-relaxed break-all line-clamp-2">
                                {preview}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
