import { useRef } from 'react';
import {
    createEmptyCardSpatialIndex,
    patchCardSpatialIndex,
    syncCardSpatialIndex
} from '../utils/canvasSpatialIndex';
import { useStore } from '../store/useStore';
import { measureSyncPerformance } from '../utils/performanceDiagnostics';

export function useIncrementalCardSpatialIndex(cardIndexMutation) {
    const spatialIndexRef = useRef(createEmptyCardSpatialIndex());
    const lastMutationVersionRef = useRef(null);

    const nextVersion = Number(cardIndexMutation?.version) || 0;

    if (lastMutationVersionRef.current === null) {
        const cards = useStore.getState().cards || [];
        measureSyncPerformance('canvas.spatial-index.initial-sync', () => {
            syncCardSpatialIndex(spatialIndexRef.current, cards);
        }, {
            cardsCount: cards.length,
            mutationVersion: nextVersion
        }, {
            thresholdMs: 8
        });
        lastMutationVersionRef.current = nextVersion;
        return spatialIndexRef.current;
    }

    if (lastMutationVersionRef.current !== nextVersion) {
        if (cardIndexMutation?.mode === 'patch') {
            const updatedIds = cardIndexMutation.updatedIds || [];
            const updatedCards = updatedIds.length > 0
                ? useStore.getState().getCardsByIds?.(updatedIds) || []
                : [];
            measureSyncPerformance('canvas.spatial-index.patch', () => {
                patchCardSpatialIndex(spatialIndexRef.current, updatedCards);
            }, {
                updatedIdsCount: updatedIds.length,
                updatedCardsCount: updatedCards.length,
                mutationVersion: nextVersion,
                mutationScope: cardIndexMutation?.scope || '',
                mutationReason: cardIndexMutation?.reason || ''
            }, {
                thresholdMs: 6
            });
        } else {
            const cards = useStore.getState().cards || [];
            measureSyncPerformance('canvas.spatial-index.bulk-sync', () => {
                syncCardSpatialIndex(spatialIndexRef.current, cards);
            }, {
                cardsCount: cards.length,
                mutationVersion: nextVersion,
                mutationReason: cardIndexMutation?.reason || ''
            }, {
                thresholdMs: 8
            });
        }
        lastMutationVersionRef.current = nextVersion;
    }

    return spatialIndexRef.current;
}
