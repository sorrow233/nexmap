import React from 'react';
import MobileBoardFeedCard from './MobileBoardFeedCard';

export default function MobileBoardWaterfall({
    cards,
    generatingCardIds,
    onOpen
}) {
    return (
        <div className="divide-y divide-slate-200/80 dark:divide-white/10">
            {cards.map((card) => (
                <MobileBoardFeedCard
                    key={card.id}
                    card={card}
                    isGenerating={generatingCardIds?.has(card.id)}
                    onOpen={onOpen}
                />
            ))}
        </div>
    );
}
