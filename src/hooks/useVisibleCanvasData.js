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
import { measureSyncPerformance } from '../utils/performanceDiagnostics';

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
        () => measureSyncPerformance('canvas.visible.viewport-rect', () => (
            buildViewportRect(offset, scale, viewportSize)
        ), {
            scale,
            viewportWidth: viewportSize?.width || 0,
            viewportHeight: viewportSize?.height || 0
        }, {
            thresholdMs: 2
        }),
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
        () => measureSyncPerformance('canvas.visible.connection-index', () => (
            createConnectionVisibilityIndex(connections)
        ), {
            connectionsCount: connections?.length || 0
        }, {
            thresholdMs: 6
        }),
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
        () => measureSyncPerformance('canvas.visible.card-query', () => (
            getCardsInRect(cardSpatialIndex, viewportRect, persistentVisibleCardIds)
                .map((card) => card.id)
        ), {
            indexedCards: cardSpatialIndex?.cardMap?.size || 0,
            indexedBuckets: cardSpatialIndex?.buckets?.size || 0,
            persistentIdsCount: persistentVisibleCardIds.size
        }, {
            thresholdMs: 8
        }),
        [cardSpatialIndex, geometryVersion, persistentVisibleCardIds, viewportRect]
    );

    const visibleCardIds = useMemo(() => {
        const ids = new Set();
        visibleCardIdList.forEach((id) => ids.add(id));
        return ids;
    }, [visibleCardIdList]);

    const visibleCards = useMemo(
        () => measureSyncPerformance('canvas.visible.card-hydration', () => (
            getCardsByIds(cardSpatialIndex, visibleCardIdList)
                .map((card) => applyCardPositionOverride(card, positionOverrides))
        ), {
            visibleCardIdsCount: visibleCardIdList.length,
            positionOverridesCount: positionOverrides?.size || 0
        }, {
            thresholdMs: 8
        }),
        [cardSpatialIndex, contentVersion, positionOverrides, visibleCardIdList]
    );

    const targetCardIds = useMemo(() => {
        if (selectedIdSet.size === 0) return new Set();
        return measureSyncPerformance('canvas.visible.target-card-query', () => (
            getTargetCardIdsFromIndex(connectionIndex, selectedIdSet)
        ), {
            selectedIdsCount: selectedIdSet.size
        }, {
            thresholdMs: 4
        });
    }, [connectionIndex, selectedIdSet]);

    const { visibleConnections, connectionCardIds } = useMemo(
        () => measureSyncPerformance('canvas.visible.connection-query', () => (
            getVisibleConnectionDataFromIndex(connectionIndex, visibleCardIds, selectedIdSet, {
                viewportRect,
                cardRectMap: cardSpatialIndex.rectMap,
                viewportMargin: connectionViewportMargin
            })
        ), {
            visibleCardIdsCount: visibleCardIds.size,
            selectedIdsCount: selectedIdSet.size,
            indexedRects: cardSpatialIndex?.rectMap?.size || 0
        }, {
            thresholdMs: 8
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
        () => measureSyncPerformance('canvas.visible.connection-card-hydration', () => (
            getCardsByIds(cardSpatialIndex, connectionCardIds)
                .map((card) => applyCardPositionOverride(card, positionOverrides))
        ), {
            connectionCardIdsCount: connectionCardIds?.size || connectionCardIds?.length || 0,
            positionOverridesCount: positionOverrides?.size || 0
        }, {
            thresholdMs: 8
        }),
        [cardSpatialIndex, connectionCardIds, geometryVersion, positionOverrides]
    );

    const connectionCardMap = useMemo(() => {
        return measureSyncPerformance('canvas.visible.connection-card-map', () => {
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
        }, {
            connectionCardIdsCount: connectionCardIds?.size || connectionCardIds?.length || 0,
            positionOverridesCount: positionOverrides?.size || 0
        }, {
            thresholdMs: 6
        });
    }, [cardSpatialIndex, connectionCardIds, geometryVersion, positionOverrides]);

    const visibleGroups = useMemo(
        () => measureSyncPerformance('canvas.visible.group-query', () => (
            getVisibleGroups(
                groups,
                cardSpatialIndex.cardMap,
                viewportRect,
                visibleCardIds,
                groupGeometryCacheRef.current,
                positionOverrides
            )
        ), {
            groupsCount: groups?.length || 0,
            visibleCardIdsCount: visibleCardIds.size,
            indexedCards: cardSpatialIndex?.cardMap?.size || 0
        }, {
            thresholdMs: 8
        }),
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
