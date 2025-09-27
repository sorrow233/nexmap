import { useRef, useCallback } from 'react';
import { getCardRect, isRectIntersect } from '../utils/geometry';
import { useStore } from '../store/useStore';

export function useSelection() {
    const { cards, setSelectedIds, toCanvasCoords } = useStore(state => ({
        cards: state.cards,
        setSelectedIds: state.setSelectedIds,
        toCanvasCoords: state.toCanvasCoords
    }));

    // We keep this locally to throttle checks if needed, but it's pure logic now.
    // The previous implementation used a ref for throttling.

    const performSelectionCheck = useCallback((rect) => {
        // Calculate intersection
        const xMin = Math.min(rect.x1, rect.x2);
        const xMax = Math.max(rect.x1, rect.x2);
        const yMin = Math.min(rect.y1, rect.y2);
        const yMax = Math.max(rect.y1, rect.y2);

        // Uses store's toCanvasCoords which uses current store state (via get())
        // Wait, toCanvasCoords in store uses get(), but here we are using the one from the hook which wraps the store action.
        // The store action `toCanvasCoords` calls `get()`, so it works with fresh state.

        const canvasTopLeft = toCanvasCoords(xMin, yMin);
        const canvasBottomRight = toCanvasCoords(xMax, yMax);

        const selectionCanvasRect = {
            left: canvasTopLeft.x,
            top: canvasTopLeft.y,
            right: canvasBottomRight.x,
            bottom: canvasBottomRight.y
        };

        const intersectedIds = cards
            .filter(card => isRectIntersect(selectionCanvasRect, getCardRect(card)))
            .map(card => card.id);

        setSelectedIds(intersectedIds);
    }, [cards, setSelectedIds, toCanvasCoords]);

    return { performSelectionCheck };
}
