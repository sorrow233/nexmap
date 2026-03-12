import { useMemo } from 'react';
import {
    buildViewportRect,
    createCardSpatialIndex,
    getCardsByIds,
    getCardsInRect,
    getVisibleConnectionData
} from '../utils/canvasSpatialIndex';

export function useVisibleCanvasData({
    cards,
    connections,
    offset,
    scale,
    selectedIds,
    generatingCardIds
}) {
    const cardSpatialIndex = useMemo(() => createCardSpatialIndex(cards), [cards]);

    const viewportRect = useMemo(
        () => buildViewportRect(offset, scale),
        [offset.x, offset.y, scale]
    );

    const selectedIdSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);

    const persistentVisibleCardIds = useMemo(() => {
        const ids = new Set(selectedIds || []);
        if (generatingCardIds) {
            generatingCardIds.forEach((id) => ids.add(id));
        }
        return ids;
    }, [generatingCardIds, selectedIds]);

    const visibleCards = useMemo(
        () => getCardsInRect(cardSpatialIndex, viewportRect, persistentVisibleCardIds),
        [cardSpatialIndex, viewportRect, persistentVisibleCardIds]
    );

    const visibleCardIds = useMemo(() => {
        const ids = new Set();
        visibleCards.forEach((card) => ids.add(card.id));
        return ids;
    }, [visibleCards]);

    const targetCardIds = useMemo(() => {
        if (selectedIdSet.size === 0) return new Set();

        const targets = new Set();
        connections.forEach((conn) => {
            if (selectedIdSet.has(conn.from)) targets.add(conn.to);
            if (selectedIdSet.has(conn.to)) targets.add(conn.from);
        });
        selectedIdSet.forEach((id) => targets.delete(id));
        return targets;
    }, [connections, selectedIdSet]);

    const { visibleConnections, connectionCardIds } = useMemo(
        () => getVisibleConnectionData(connections, visibleCardIds, selectedIdSet),
        [connections, selectedIdSet, visibleCardIds]
    );

    const connectionCards = useMemo(
        () => getCardsByIds(cardSpatialIndex, connectionCardIds),
        [cardSpatialIndex, connectionCardIds]
    );

    return {
        cardSpatialIndex,
        visibleCards,
        visibleConnections,
        connectionCards,
        selectedIdSet,
        targetCardIds
    };
}
