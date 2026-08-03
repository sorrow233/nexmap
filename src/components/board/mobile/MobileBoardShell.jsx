import React, { useMemo } from 'react';
import { MessageSquarePlus } from 'lucide-react';
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
    onOpenCard,
    composer
}) {
    const { language } = useLanguage();
    const copy = getMobileBoardCopy(language);
    const conversations = useMemo(
        () => sortCards(cards.filter((card) => !card.deletedAt && card.type !== 'note')),
        [cards]
    );

    return (
        <main className="absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
            <MobileBoardHeader
                board={board}
                saveStatus={saveStatus}
                conversationCount={conversations.length}
                onBack={onBack}
                untitledLabel={untitledLabel}
            />

            <section className="ios-scroll-fix min-h-0 flex-1 overflow-y-auto px-4" aria-live="polite">
                {conversations.length === 0 ? (
                    <div className="flex min-h-full flex-col items-center justify-center px-8 pb-10 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200/70 text-slate-500 dark:bg-white/10 dark:text-slate-300">
                            <MessageSquarePlus size={21} />
                        </div>
                        <h2 className="mt-4 text-[16px] font-semibold text-slate-900 dark:text-white">
                            {copy.emptyCardsTitle}
                        </h2>
                        <p className="mt-1.5 max-w-xs text-[13px] leading-5 text-slate-500 dark:text-slate-400">
                            {copy.emptyDescription}
                        </p>
                    </div>
                ) : (
                    <MobileBoardWaterfall
                        cards={conversations}
                        generatingCardIds={generatingCardIds}
                        onOpen={onOpenCard}
                    />
                )}
            </section>

            {composer}
        </main>
    );
}
