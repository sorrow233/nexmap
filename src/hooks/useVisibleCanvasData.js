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
    getVisibleConnectionDataFromIndex,
    resolveConnectionViewportMargin
} from '../utils/connectionVisibility';

const EMPTY_POSITION_OVERRIDES = new Map();

export function useVisibleCanvasData({
    cardIndexMutation,
    connections,
    groups,
    offset,
    scale,
    viewportSize,
    selectedIds,
    generatingCardIds,
    positionOverrides = EMPTY_POSITION_OVERRIDES
}) {
    const cardSpatialIndex = useIncrementalCardSpatialIndex(cardIndexMutation);
    const groupGeometryCacheRef = useRef(createGroupGeometryCache());
    const mutationVersion = Number(cardIndexMutation?.version) || 0;
    const mutationScope = cardIndexMutation?.scope || 'bulk';
    const geometryVersionRef = useRef(0);

    if (mutationScope !== 'content') {
        geometryVersionRef.current = mutationVersion;
    }

    const geometryVersion = geometryVersionRef.current;
    const contentVersion = mutationVersion;

    const viewportRect = useMemo(
        () => buildViewportRect(offset, scale, viewportSize),
        [offset.x, offset.y, scale, viewportSize?.height, viewportSize?.width]
    );
    const connectionViewportMargin = useMemo(
        () => resolveConnectionViewportMargin(viewportSize, scale),
        [scale, viewportSize?.height, viewportSize?.width]
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

    const visibleCardIdList = useMemo(
        () => getCardsInRect(cardSpatialIndex, viewportRect, persistentVisibleCardIds)
            .map((card) => card.id),
        [cardSpatialIndex, geometryVersion, persistentVisibleCardIds, viewportRect]
    );

    const visibleCardIds = useMemo(() => {
        const ids = new Set();
        visibleCardIdList.forEach((id) => ids.add(id));
        return ids;
    }, [visibleCardIdList]);

    const visibleCards = useMemo(
        () => getCardsByIds(cardSpatialIndex, visibleCardIdList)
            .map((card) => applyCardPositionOverride(card, positionOverrides)),
        [cardSpatialIndex, contentVersion, positionOverrides, visibleCardIdList]
    );

    const targetCardIds = useMemo(() => {
        if (selectedIdSet.size === 0) return new Set();
        return getTargetCardIdsFromIndex(connectionIndex, selectedIdSet);
    }, [connectionIndex, selectedIdSet]);

    const { visibleConnections, connectionCardIds } = useMemo(
        () => getVisibleConnectionDataFromIndex(connectionIndex, visibleCardIds, selectedIdSet, {
            viewportRect,
            cardRectMap: cardSpatialIndex.rectMap,
            viewportMargin: connectionViewportMargin
        }),
        [
            cardSpatialIndex.rectMap,
            connectionIndex,
            connectionViewportMargin,
            geometryVersion,
            selectedIdSet,
            viewportRect,
            visibleCardIds
        ]
    );

    const connectionCards = useMemo(
        () => getCardsByIds(cardSpatialIndex, connectionCardIds)
            .map((card) => applyCardPositionOverride(card, positionOverrides)),
        [cardSpatialIndex, connectionCardIds, geometryVersion, positionOverrides]
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
    }, [cardSpatialIndex, connectionCardIds, geometryVersion, positionOverrides]);

    const visibleGroups = useMemo(
        () => getVisibleGroups(
            groups,
            cardSpatialIndex.cardMap,
            viewportRect,
            visibleCardIds,
            groupGeometryCacheRef.current,
            positionOverrides
        ),
        [geometryVersion, groups, positionOverrides, viewportRect, visibleCardIds]
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
