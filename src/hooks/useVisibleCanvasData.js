import { useMemo, useRef } from 'react';
import {
    buildViewportRect,
    getCardMapByIds,
    getCardsByIds,
    getCardsInRect
} from '../utils/canvasSpatialIndex';
import { createGroupGeometryCache, getVisibleGroups } from '../utils/groupGeometry';
import { useIncrementalCardSpatialIndex } from './useIncrementalCardSpatialIndex';
import {
    createConnectionVisibilityIndex,
    getTargetCardIdsFromIndex,
    getVisibleConnectionDataFromIndex
} from '../utils/connectionVisibility';

export function useVisibleCanvasData({
    cards,
    connections,
    groups,
    offset,
    scale,
    selectedIds,
    generatingCardIds
}) {
    const cardSpatialIndex = useIncrementalCardSpatialIndex(cards);
    const groupGeometryCacheRef = useRef(createGroupGeometryCache());

    const viewportRect = useMemo(
        () => buildViewportRect(offset, scale),
        [offset.x, offset.y, scale]
    );

    const selectedIdSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
    const connectionIndex = useMemo(
        () => createConnectionVisibilityIndex(connections),
        [connections]
    );

    const persistentVisibleCardIds = useMemo(() => {
        const ids = new Set(selectedIds || []);
        if (generatingCardIds) {
            generatingCardIds.forEach((id) => ids.add(id));
        }
        return ids;
    }, [generatingCardIds, selectedIds]);

    const visibleCards = useMemo(
        () => getCardsInRect(cardSpatialIndex, viewportRect, persistentVisibleCardIds),
        [cardSpatialIndex, cards, viewportRect, persistentVisibleCardIds]
    );

    const visibleCardIds = useMemo(() => {
        const ids = new Set();
        visibleCards.forEach((card) => ids.add(card.id));
        return ids;
    }, [visibleCards]);

    const targetCardIds = useMemo(() => {
        if (selectedIdSet.size === 0) return new Set();
        return getTargetCardIdsFromIndex(connectionIndex, selectedIdSet);
    }, [connectionIndex, selectedIdSet]);

    const { visibleConnections, connectionCardIds } = useMemo(
        () => getVisibleConnectionDataFromIndex(connectionIndex, visibleCardIds, selectedIdSet),
        [connectionIndex, selectedIdSet, visibleCardIds]
    );

    const connectionCards = useMemo(
        () => getCardsByIds(cardSpatialIndex, connectionCardIds),
        [cardSpatialIndex, cards, connectionCardIds]
    );

    const connectionCardMap = useMemo(
        () => getCardMapByIds(cardSpatialIndex, connectionCardIds),
        [cardSpatialIndex, cards, connectionCardIds]
    );

    const visibleGroups = useMemo(
        () => getVisibleGroups(
            groups,
            cardSpatialIndex.cardMap,
            viewportRect,
            visibleCardIds,
            groupGeometryCacheRef.current
        ),
        [cardSpatialIndex.cardMap, cards, groups, viewportRect, visibleCardIds]
    );

    return {
        cardSpatialIndex,
        visibleCards,
        visibleConnections,
        connectionCards,
        connectionCardMap,
        visibleGroups,
        selectedIdSet,
        targetCardIds
    };
}
