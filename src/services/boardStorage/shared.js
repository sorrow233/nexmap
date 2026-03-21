import { debugLog } from '../../utils/debugLogger';
import { buildBoardCursorTrace, logPersistenceTrace } from '../../utils/persistenceTrace';
import { BOARD_PREFIX } from './constants';

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const loadLegacyBoardSnapshot = (id) => {
    try {
        const raw = localStorage.getItem(BOARD_PREFIX + id);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (error) {
        debugLog.error(`Legacy localStorage load failed for board ${id}`, error);
        return null;
    }
};

export const clearLegacyBoardSnapshot = (id) => {
    try {
        localStorage.removeItem(BOARD_PREFIX + id);
    } catch {
        // Ignore cleanup failures for best-effort legacy recovery keys.
    }
};

export const persistBoardToLegacyStorage = (id, payload) => {
    try {
        localStorage.setItem(BOARD_PREFIX + id, JSON.stringify(payload));
        debugLog.warn(`[Storage] IDB save failed, fallback to localStorage for board ${id}`);
        logPersistenceTrace('save:legacy-fallback', {
            boardId: id,
            cursor: buildBoardCursorTrace(payload)
        });
        return true;
    } catch (legacyErr) {
        debugLog.error(`[Storage] Legacy fallback save failed for board ${id}`, legacyErr);
        logPersistenceTrace('save:legacy-fallback-failed', {
            boardId: id,
            error: legacyErr
        });
        return false;
    }
};
