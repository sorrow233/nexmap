import { idbGet, idbSet } from '../db/indexedDB';
import {
    BOARD_DISPLAY_SYNC_KEYS,
    hasBoardDisplayMetadataPatch,
    pickBoardDisplayMetadata
} from '../boardTitle/displayMetadata';
import { normalizeBoardMetadataList, normalizeBoardTitleMeta } from '../boardTitle/metadata';

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

const loadBoardPayload = async (boardId) => {
    if (!boardId) return null;

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

    return existingPayload && typeof existingPayload === 'object'
        ? existingPayload
        : null;
};

const buildMissingDisplayMetadataPatch = (board = {}, snapshot = {}) => {
    const snapshotMetadata = pickBoardDisplayMetadata(snapshot);
    const patch = {};

    BOARD_DISPLAY_SYNC_KEYS.forEach((key) => {
        const hasBoardValue = Object.prototype.hasOwnProperty.call(board, key);
        const hasSnapshotValue = Object.prototype.hasOwnProperty.call(snapshotMetadata, key);
        if (!hasBoardValue && hasSnapshotValue) {
            patch[key] = snapshotMetadata[key];
        }
    });

    return patch;
};

export const loadBoardDisplayMetadataSnapshot = async (boardId) => {
    const payload = await loadBoardPayload(boardId);
    if (!payload) return null;
    return pickBoardDisplayMetadata(payload);
};

export const hydrateBoardsDisplayMetadataList = async (boards = []) => {
    const normalizedBoards = normalizeBoardMetadataList(Array.isArray(boards) ? boards : []);
    let changed = false;

    const hydratedBoards = await Promise.all(normalizedBoards.map(async (board) => {
        const needsHydration = BOARD_DISPLAY_SYNC_KEYS.some((key) => (
            !Object.prototype.hasOwnProperty.call(board, key)
        ));

        if (!needsHydration || !board?.id) {
            return board;
        }

        const snapshot = await loadBoardPayload(board.id);
        if (!snapshot) {
            return board;
        }

        const patch = buildMissingDisplayMetadataPatch(board, snapshot);
        if (Object.keys(patch).length === 0) {
            return board;
        }

        changed = true;
        return normalizeBoardTitleMeta({
            ...board,
            ...patch
        });
    }));

    return {
        boards: hydratedBoards,
        changed
    };
};

export const persistBoardDisplayMetadataSnapshot = async (boardId, metadata = {}) => {
    if (!boardId || !hasBoardDisplayMetadataPatch(metadata)) return false;

    const storageKey = `${BOARD_PREFIX}${boardId}`;
    const existingPayload = await loadBoardPayload(boardId);

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
