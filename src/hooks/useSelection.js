import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import { getIntersectedCardIds } from '../utils/canvasSpatialIndex';

export function useSelection(cardSpatialIndex) {
    const setSelectedIds = useStore(state => state.setSelectedIds);

    const performSelectionCheck = useCallback((rect) => {
        const { toCanvasCoords } = useStore.getState();

        // Calculate intersection
        const xMin = Math.min(rect.x1, rect.x2);
        const xMax = Math.max(rect.x1, rect.x2);
        const yMin = Math.min(rect.y1, rect.y2);
        const yMax = Math.max(rect.y1, rect.y2);

        const canvasTopLeft = toCanvasCoords(xMin, yMin);
        const canvasBottomRight = toCanvasCoords(xMax, yMax);

        const selectionCanvasRect = {
            left: canvasTopLeft.x,
            top: canvasTopLeft.y,
            right: canvasBottomRight.x,
            bottom: canvasBottomRight.y
        };

        setSelectedIds(getIntersectedCardIds(cardSpatialIndex, selectionCanvasRect));
    }, [cardSpatialIndex, setSelectedIds]);

    return { performSelectionCheck };
}
