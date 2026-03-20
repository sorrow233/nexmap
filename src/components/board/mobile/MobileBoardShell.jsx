import React, { useMemo, useState } from 'react';
import { MessageSquarePlus, StickyNote } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import MobileBoardHeader from './MobileBoardHeader';
import MobileBoardWaterfall from './MobileBoardWaterfall';
import { getMobileBoardCopy } from './mobileBoardCopy';

const sortCards = (cards) => {
    return [...cards].sort((left, right) => {
        const leftTime = left.createdAt || left.updatedAt || 0;
        const rightTime = right.createdAt || right.updatedAt || 0;
        return rightTime - leftTime;
    });
};

export default function MobileBoardShell({
    board,
    cards,
    generatingCardIds,
    saveStatus,
    untitledLabel,
    onBack,
    onOpenInstructions,
    onOpenSettings,
    onOpenCard,
    onQuickSprout,
    onExpandTopics
}) {
    const [filter, setFilter] = useState('all');
    const { language } = useLanguage();
    const copy = getMobileBoardCopy(language);
    const filters = useMemo(() => ([
        { id: 'all', label: copy.filters.all },
        { id: 'conversation', label: copy.filters.conversation },
        { id: 'note', label: copy.filters.note }
    ]), [copy]);

    const visibleCards = useMemo(() => {
        const activeCards = cards.filter((card) => !card.deletedAt);
        const filteredCards = activeCards.filter((card) => {
            if (filter === 'conversation') return card.type !== 'note';
            if (filter === 'note') return card.type === 'note';
            return true;
        });
        return sortCards(filteredCards);
    }, [cards, filter]);

    const activeCardCount = useMemo(
        () => cards.filter((card) => !card.deletedAt).length,
        [cards]
    );

    return (
        <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_top,#e0f2fe,transparent_36%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_45%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_top,#0f172a,transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_50%,#020617_100%)]">
            <MobileBoardHeader
                board={board}
                saveStatus={saveStatus}
                cardCount={activeCardCount}
                onBack={onBack}
                onOpenInstructions={onOpenInstructions}
                onOpenSettings={onOpenSettings}
                untitledLabel={untitledLabel}
            />

            <div className="absolute inset-0 overflow-y-auto px-4 pb-[7.25rem] pt-[5.9rem] ios-scroll-fix">
                <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
                    {filters.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setFilter(item.id)}
                            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all active:scale-95 ${filter === item.id
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                : 'bg-white/80 text-slate-600 dark:bg-white/5 dark:text-slate-300'
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {visibleCards.length === 0 ? (
                    <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/50">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200">
                            {filter === 'note' ? <StickyNote size={24} /> : <MessageSquarePlus size={24} />}
                        </div>
                        <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                            {filter === 'note' ? copy.emptyNotesTitle : copy.emptyCardsTitle}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {copy.emptyDescription}
                        </p>
                    </section>
                ) : (
                    <MobileBoardWaterfall
                        cards={visibleCards}
                        generatingCardIds={generatingCardIds}
                        onOpen={onOpenCard}
                        onQuickSprout={onQuickSprout}
                        onExpandTopics={onExpandTopics}
                    />
                )}
            </div>
        </div>
    );
}
