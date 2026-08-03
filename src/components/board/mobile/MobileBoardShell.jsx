import React, { useMemo, useState } from 'react';
import { MessageSquarePlus, StickyNote } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import MobileBoardHeader from './MobileBoardHeader';
import MobileBoardWaterfall from './MobileBoardWaterfall';
import { getMobileBoardCopy } from './mobileBoardCopy';

const sortCards = (cards) => [...cards].sort((left, right) => {
    const leftTime = left.updatedAt || left.createdAt || 0;
    const rightTime = right.updatedAt || right.createdAt || 0;
    return rightTime - leftTime;
});

export default function MobileBoardShell({
    board,
    cards,
    generatingCardIds,
    saveStatus,
    untitledLabel,
    onBack,
    onOpenSettings,
    onOpenCard,
    composer
}) {
    const [filter, setFilter] = useState('conversation');
    const { language } = useLanguage();
    const copy = getMobileBoardCopy(language);
    const filters = useMemo(() => ([
        { id: 'conversation', label: copy.filters.conversation },
        { id: 'all', label: copy.filters.all },
        { id: 'note', label: copy.filters.note }
    ]), [copy]);

    const activeCards = useMemo(
        () => cards.filter((card) => !card.deletedAt),
        [cards]
    );
    const visibleCards = useMemo(() => sortCards(activeCards.filter((card) => {
        if (filter === 'conversation') return card.type !== 'note';
        if (filter === 'note') return card.type === 'note';
        return true;
    })), [activeCards, filter]);

    return (
        <main className="absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
            <MobileBoardHeader
                board={board}
                saveStatus={saveStatus}
                cardCount={activeCards.length}
                onBack={onBack}
                onOpenSettings={onOpenSettings}
                untitledLabel={untitledLabel}
            />

            <nav className="shrink-0 border-b border-slate-200/70 bg-white px-4 py-2 dark:border-white/10 dark:bg-slate-950" aria-label={copy.filtersLabel}>
                <div className="flex gap-5">
                    {filters.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setFilter(item.id)}
                            className={`min-h-9 border-b-2 px-0.5 text-[13px] font-medium transition-colors ${filter === item.id
                                ? 'border-cyan-500 text-slate-950 dark:text-white'
                                : 'border-transparent text-slate-500 dark:text-slate-400'
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </nav>

            <section className="ios-scroll-fix min-h-0 flex-1 overflow-y-auto px-4 py-3" aria-live="polite">
                {visibleCards.length === 0 ? (
                    <div className="flex min-h-full flex-col items-center justify-center px-8 pb-10 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200/70 text-slate-500 dark:bg-white/10 dark:text-slate-300">
                            {filter === 'note' ? <StickyNote size={21} /> : <MessageSquarePlus size={21} />}
                        </div>
                        <h2 className="mt-4 text-[16px] font-semibold text-slate-900 dark:text-white">
                            {filter === 'note' ? copy.emptyNotesTitle : copy.emptyCardsTitle}
                        </h2>
                        <p className="mt-1.5 max-w-xs text-[13px] leading-5 text-slate-500 dark:text-slate-400">
                            {copy.emptyDescription}
                        </p>
                    </div>
                ) : (
                    <MobileBoardWaterfall
                        cards={visibleCards}
                        generatingCardIds={generatingCardIds}
                        onOpen={onOpenCard}
                    />
                )}
            </section>

            {composer}
        </main>
    );
}
