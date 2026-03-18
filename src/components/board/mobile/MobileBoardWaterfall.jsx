import React, { useMemo } from 'react';
import MobileBoardFeedCard from './MobileBoardFeedCard';
import { estimateCardWeight } from './cardPreviewUtils';

function distributeCards(cards) {
    const columns = [[], []];
    const columnWeights = [0, 0];

    cards.forEach((card) => {
        const nextColumnIndex = columnWeights[0] <= columnWeights[1] ? 0 : 1;
        columns[nextColumnIndex].push(card);
        columnWeights[nextColumnIndex] += estimateCardWeight(card);
    });

    return columns;
}

export default function MobileBoardWaterfall({
    cards,
    generatingCardIds,
    onOpen,
    onQuickSprout,
    onExpandTopics
}) {
    const columns = useMemo(() => distributeCards(cards), [cards]);

    return (
        <div className="grid grid-cols-2 items-start gap-3">
            {columns.map((columnCards, columnIndex) => (
                <div key={columnIndex} className="flex min-w-0 flex-col gap-3">
                    {columnCards.map((card) => (
                        <MobileBoardFeedCard
                            key={card.id}
                            card={card}
                            isGenerating={generatingCardIds.has(card.id)}
                            onOpen={onOpen}
                            onQuickSprout={onQuickSprout}
                            onExpandTopics={onExpandTopics}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}
