import { idbGet, idbSet } from '../db/indexedDB';
import {
    BOARD_DISPLAY_SYNC_KEYS,
    hasBoardDisplayMetadataPatch,
    pickBoardDisplayMetadata
} from '../boardTitle/displayMetadata';

const BOARD_PREFIX = 'mixboard_board_';

const loadLegacyBoardPayload = (boardId) => {
    try {
        const raw = localStorage.getItem(`${BOARD_PREFIX}${boardId}`);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const persistLegacyBoardPayload = (boardId, payload) => {
    try {
        localStorage.setItem(`${BOARD_PREFIX}${boardId}`, JSON.stringify(payload));
    } catch {
        // Best-effort fallback only.
    }
};

export const persistBoardDisplayMetadataSnapshot = async (boardId, metadata = {}) => {
    if (!boardId || !hasBoardDisplayMetadataPatch(metadata)) return false;

    const storageKey = `${BOARD_PREFIX}${boardId}`;
    let existingPayload = null;

    try {
        existingPayload = await idbGet(storageKey);
    } catch {
        existingPayload = null;
    }

    if (!existingPayload) {
        existingPayload = loadLegacyBoardPayload(boardId);
    }

    if (!existingPayload || typeof existingPayload !== 'object') {
        return false;
    }

    const nextDisplayMetadata = pickBoardDisplayMetadata({
        ...existingPayload,
        ...metadata
    });

    const nextPayload = { ...existingPayload };
    BOARD_DISPLAY_SYNC_KEYS.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(nextDisplayMetadata, key)) {
            nextPayload[key] = nextDisplayMetadata[key];
        }
    });

    try {
        await idbSet(storageKey, nextPayload);
        persistLegacyBoardPayload(boardId, nextPayload);
        return true;
    } catch {
        persistLegacyBoardPayload(boardId, nextPayload);
        return false;
    }
};
