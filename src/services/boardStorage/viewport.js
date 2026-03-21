import { debugLog } from '../../utils/debugLogger';
import { VIEWPORT_PREFIX } from './constants';

export const saveViewportState = (boardId, viewport) => {
    if (!boardId) return;
    debugLog.storage(`Saving viewport for board ${boardId}`, viewport);
    try {
        localStorage.setItem(VIEWPORT_PREFIX + boardId, JSON.stringify(viewport));
    } catch (error) {
        debugLog.error(`Failed to save viewport state for board ${boardId}`, error);
    }
};

export const loadViewportState = (boardId) => {
    if (!boardId) return { offset: { x: 0, y: 0 }, scale: 1 };
    debugLog.storage(`Loading viewport for board ${boardId}`);
    try {
        const stored = localStorage.getItem(VIEWPORT_PREFIX + boardId);
        if (stored) {
            const parsed = JSON.parse(stored);
            debugLog.storage(`Viewport loaded for board ${boardId}`, parsed);
            return parsed;
        }
    } catch (error) {
        debugLog.error(`Failed to load viewport state for board ${boardId}`, error);
    }
    return { offset: { x: 0, y: 0 }, scale: 1 };
};
