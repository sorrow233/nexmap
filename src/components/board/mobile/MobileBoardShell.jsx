import React, { useMemo, useState } from 'react';
import { Layers3, MessageSquarePlus, StickyNote } from 'lucide-react';
import MobileBoardFeedCard from './MobileBoardFeedCard';
import MobileBoardHeader from './MobileBoardHeader';
import MobileBoardSelectionBar from './MobileBoardSelectionBar';

const FILTERS = [
    { id: 'all', label: '全部' },
    { id: 'conversation', label: '对话' },
    { id: 'note', label: '笔记' }
];

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
    selectedIds,
    generatingCardIds,
    syncStatus,
    untitledLabel,
    onBack,
    onCreateNote,
    onOpenInstructions,
    onOpenSettings,
    onOpenCard,
    onEnterSelectionMode,
    onToggleSelection,
    onClearSelection,
    onQuickSprout,
    onExpandTopics,
    onDeleteSelection
}) {
    const [filter, setFilter] = useState('all');

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

    const openSelectedCard = () => {
        if (selectedIds.length === 0) return;
        onOpenCard(selectedIds[0]);
    };

    const sproutSelectedCards = () => {
        selectedIds.forEach((cardId) => onQuickSprout(cardId));
    };

    const expandSelectedCardTopics = () => {
        if (selectedIds.length !== 1) return;
        onExpandTopics(selectedIds[0]);
    };

    return (
        <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_top,#e0f2fe,transparent_36%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_45%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_top,#0f172a,transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_50%,#020617_100%)]">
            <MobileBoardHeader
                board={board}
                syncStatus={syncStatus}
                cardCount={activeCardCount}
                onBack={onBack}
                onCreateNote={onCreateNote}
                onOpenInstructions={onOpenInstructions}
                onOpenSettings={onOpenSettings}
                untitledLabel={untitledLabel}
            />

            <div className="absolute inset-0 overflow-y-auto px-4 pb-[13rem] pt-[9.5rem] ios-scroll-fix">
                <section className="mb-4 rounded-[1.75rem] border border-white/70 bg-white/72 p-4 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.55)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/48">
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
                        <Layers3 size={14} />
                        iPhone 信息流画板
                    </div>
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                        已为小屏关闭自由画布，卡片改为直接浏览和打开。点按进入全屏，长按进入编辑态。
                    </p>
                </section>

                <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
                    {FILTERS.map((item) => (
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
                            {filter === 'note' ? '还没有笔记' : '还没有卡片'}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            用底部输入框生成新卡片，或者先创建一张便签开始整理想法。
                        </p>
                        <button
                            onClick={onCreateNote}
                            className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white active:scale-95 dark:bg-white dark:text-slate-900"
                        >
                            <StickyNote size={16} />
                            新建便签
                        </button>
                    </section>
                ) : (
                    <div style={{ columnWidth: '17rem', columnGap: '1rem' }}>
                        {visibleCards.map((card) => (
                            <MobileBoardFeedCard
                                key={card.id}
                                card={card}
                                isSelected={selectedIds.includes(card.id)}
                                isSelectionMode={selectedIds.length > 0}
                                isGenerating={generatingCardIds.has(card.id)}
                                onOpen={onOpenCard}
                                onToggleSelect={onToggleSelection}
                                onEnterSelectionMode={onEnterSelectionMode}
                            />
                        ))}
                    </div>
                )}
            </div>

            <MobileBoardSelectionBar
                cards={cards.filter((card) => !card.deletedAt)}
                selectedIds={selectedIds}
                onClearSelection={onClearSelection}
                onOpenSelection={openSelectedCard}
                onQuickSprout={sproutSelectedCards}
                onExpandTopics={expandSelectedCardTopics}
                onDeleteSelection={onDeleteSelection}
            />
        </div>
    );
}
