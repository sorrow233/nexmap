import { useRef } from 'react';
import {
    createEmptyCardSpatialIndex,
    patchCardSpatialIndex,
    syncCardSpatialIndex
} from '../utils/canvasSpatialIndex';
import { useStore } from '../store/useStore';

export function useIncrementalCardSpatialIndex(cardIndexMutation) {
    const spatialIndexRef = useRef(createEmptyCardSpatialIndex());
    const lastMutationVersionRef = useRef(null);

    const nextVersion = Number(cardIndexMutation?.version) || 0;

    if (lastMutationVersionRef.current === null) {
        syncCardSpatialIndex(spatialIndexRef.current, useStore.getState().cards || []);
        lastMutationVersionRef.current = nextVersion;
        return spatialIndexRef.current;
    }

    if (lastMutationVersionRef.current !== nextVersion) {
        if (cardIndexMutation?.mode === 'patch') {
            const updatedIds = cardIndexMutation.updatedIds || [];
            const updatedCards = updatedIds.length > 0
                ? useStore.getState().getCardsByIds?.(updatedIds) || []
                : [];
            patchCardSpatialIndex(spatialIndexRef.current, updatedCards);
        } else {
            syncCardSpatialIndex(spatialIndexRef.current, useStore.getState().cards || []);
        }
        lastMutationVersionRef.current = nextVersion;
    }

    return spatialIndexRef.current;
}
