import { useRef } from 'react';
import {
    createEmptyCardSpatialIndex,
    syncCardSpatialIndex
} from '../utils/canvasSpatialIndex';

export function useIncrementalCardSpatialIndex(cards) {
    const spatialIndexRef = useRef(createEmptyCardSpatialIndex());
    const lastCardsRef = useRef(null);

    if (lastCardsRef.current !== cards) {
        syncCardSpatialIndex(spatialIndexRef.current, cards || []);
        lastCardsRef.current = cards;
    }

    return spatialIndexRef.current;
}
