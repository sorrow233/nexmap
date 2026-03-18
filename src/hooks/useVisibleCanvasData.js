import { useMemo, useRef } from 'react';
import {
    buildViewportRect,
    getCardMapByIds,
    getCardsByIds,
    getCardsInRect
} from '../utils/canvasSpatialIndex';
import { applyCardPositionOverride } from '../utils/cardDrag';
import { createGroupGeometryCache, getVisibleGroups } from '../utils/groupGeometry';
import { useIncrementalCardSpatialIndex } from './useIncrementalCardSpatialIndex';
import {
    createConnectionVisibilityIndex,
    getTargetCardIdsFromIndex,
    getVisibleConnectionDataFromIndex
} from '../utils/connectionVisibility';

const EMPTY_POSITION_OVERRIDES = new Map();

export function useVisibleCanvasData({
    cards,
    connections,
    groups,
    offset,
    scale,
    selectedIds,
    generatingCardIds,
    positionOverrides = EMPTY_POSITION_OVERRIDES
}) {
    const cardSpatialIndex = useIncrementalCardSpatialIndex(cards);
    const groupGeometryCacheRef = useRef(createGroupGeometryCache());

    const viewportRect = useMemo(
        () => buildViewportRect(offset, scale),
        [offset.x, offset.y, scale]
    );

    const selectedIdSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
    const positionOverrideIds = useMemo(
        () => new Set(positionOverrides ? positionOverrides.keys() : []),
        [positionOverrides]
    );
    const connectionIndex = useMemo(
        () => createConnectionVisibilityIndex(connections),
        [connections]
    );

    const persistentVisibleCardIds = useMemo(() => {
        const ids = new Set(selectedIds || []);
        if (generatingCardIds) {
            generatingCardIds.forEach((id) => ids.add(id));
        }
        positionOverrideIds.forEach((id) => ids.add(id));
        return ids;
    }, [generatingCardIds, positionOverrideIds, selectedIds]);

    const visibleCards = useMemo(
        () => getCardsInRect(cardSpatialIndex, viewportRect, persistentVisibleCardIds)
            .map((card) => applyCardPositionOverride(card, positionOverrides)),
        [cardSpatialIndex, persistentVisibleCardIds, positionOverrides, viewportRect]
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
        () => getCardsByIds(cardSpatialIndex, connectionCardIds)
            .map((card) => applyCardPositionOverride(card, positionOverrides)),
        [cardSpatialIndex, connectionCardIds, positionOverrides]
    );

    const connectionCardMap = useMemo(() => {
        const cardMap = getCardMapByIds(cardSpatialIndex, connectionCardIds);
        if (!positionOverrides || positionOverrides.size === 0) return cardMap;

        const previewCardMap = new Map(cardMap);
        positionOverrides.forEach((override, id) => {
            const card = previewCardMap.get(id);
            if (!card) return;

            previewCardMap.set(id, {
                ...card,
                x: override.x,
                y: override.y
            });
        });

        return previewCardMap;
    }, [cardSpatialIndex, connectionCardIds, positionOverrides]);

    const visibleGroups = useMemo(
        () => getVisibleGroups(
            groups,
            cardSpatialIndex.cardMap,
            viewportRect,
            visibleCardIds,
            groupGeometryCacheRef.current,
            positionOverrides
        ),
        [cardSpatialIndex.cardMap, groups, positionOverrides, viewportRect, visibleCardIds]
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
