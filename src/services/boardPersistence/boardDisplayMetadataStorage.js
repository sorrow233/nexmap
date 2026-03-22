import { idbGet, idbSet } from '../db/indexedDB';
import {
    BOARD_DISPLAY_SYNC_KEYS,
    hasBoardDisplayMetadataPatch,
    normalizeBoardSummary,
    pickBoardDisplayMetadata
} from '../boardTitle/displayMetadata';
import { normalizeBoardMetadataList, normalizeBoardTitleMeta } from '../boardTitle/metadata';
import {
    buildBoardThumbnailMigrationPatch,
    migrateBoardThumbnailRecord,
    migrateBoardsThumbnailMetadataList
} from './boardThumbnailMigration';

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

const stripLegacyThumbnailField = (payload = {}) => {
    if (!payload || typeof payload !== 'object' || !Object.prototype.hasOwnProperty.call(payload, 'thumbnail')) {
        return payload;
    }

    const nextPayload = { ...payload };
    delete nextPayload.thumbnail;
    return nextPayload;
};

export const prepareBoardDisplayMetadataPatch = async (boardId, metadata = {}) => {
    if (!boardId || !metadata || typeof metadata !== 'object') {
        return {};
    }

    const thumbnailPatch = await buildBoardThumbnailMigrationPatch(boardId, metadata);
    const nextPatch = {
        ...metadata,
        ...thumbnailPatch
    };

    if (Object.prototype.hasOwnProperty.call(nextPatch, 'thumbnail') && nextPatch.thumbnail == null) {
        delete nextPatch.thumbnail;
    }

    return nextPatch;
};

const resolveBoardDisplayMetadataSnapshot = async (boardId, payload = {}) => {
    if (!payload || typeof payload !== 'object') {
        return {
            payload: null,
            metadata: null,
            changed: false
        };
    }

    const migratedPayloadResult = await migrateBoardThumbnailRecord(boardId, payload, {
        reason: 'resolveBoardDisplayMetadataSnapshot'
    });
    const basePayload = migratedPayloadResult.record || payload;
    const preparedPatch = await prepareBoardDisplayMetadataPatch(boardId, basePayload);
    const nextPayload = {
        ...stripLegacyThumbnailField(basePayload),
        ...preparedPatch
    };
    const nextMetadata = pickBoardDisplayMetadata(nextPayload);
    const changed = (
        JSON.stringify(pickBoardDisplayMetadata(payload)) !== JSON.stringify(nextMetadata)
        || migratedPayloadResult.changed
        || Object.prototype.hasOwnProperty.call(payload, 'thumbnail')
    );

    return {
        payload: nextPayload,
        metadata: nextMetadata,
        changed
    };
};

const hasUsableDisplayValue = (key, value) => {
    if (key === 'summary') {
        return Boolean(normalizeBoardSummary(value));
    }
    return typeof value === 'string'
        ? value.trim().length > 0
        : Boolean(value);
};

const buildMissingDisplayMetadataPatch = (board = {}, snapshotMetadata = {}) => {
    const patch = {};

    BOARD_DISPLAY_SYNC_KEYS.forEach((key) => {
        const boardValue = board?.[key];
        const snapshotValue = snapshotMetadata?.[key];
        const hasBoardValue = hasUsableDisplayValue(key, boardValue);
        const hasSnapshotValue = hasUsableDisplayValue(key, snapshotValue);
        if (!hasBoardValue && hasSnapshotValue) {
            patch[key] = snapshotMetadata[key];
        }
    });

    return patch;
};

export const loadBoardDisplayMetadataSnapshot = async (boardId) => {
    const payload = await loadBoardPayload(boardId);
    if (!payload) return null;

    const resolved = await resolveBoardDisplayMetadataSnapshot(boardId, payload);
    if (resolved.changed && resolved.payload) {
        const storageKey = `${BOARD_PREFIX}${boardId}`;
        try {
            await idbSet(storageKey, resolved.payload);
            persistLegacyBoardPayload(boardId, resolved.payload);
        } catch {
            persistLegacyBoardPayload(boardId, resolved.payload);
        }
    }

    return resolved.metadata;
};

export const hydrateBoardsDisplayMetadataList = async (boards = []) => {
    const migratedList = await migrateBoardsThumbnailMetadataList(boards, {
        reason: 'hydrateBoardsDisplayMetadataList'
    });
    const normalizedBoards = normalizeBoardMetadataList(migratedList.boards);
    let changed = false;

    if (migratedList.changed) {
        changed = true;
    }

    const hydratedBoards = await Promise.all(normalizedBoards.map(async (board) => {
        const needsHydration = BOARD_DISPLAY_SYNC_KEYS.some((key) => (
            !hasUsableDisplayValue(key, board?.[key])
        ));

        if (!needsHydration || !board?.id) {
            return board;
        }

        const snapshot = await loadBoardPayload(board.id);
        if (!snapshot) {
            return board;
        }

        const resolved = await resolveBoardDisplayMetadataSnapshot(board.id, snapshot);
        if (resolved.changed && resolved.payload) {
            const storageKey = `${BOARD_PREFIX}${board.id}`;
            try {
                await idbSet(storageKey, resolved.payload);
                persistLegacyBoardPayload(board.id, resolved.payload);
            } catch {
                persistLegacyBoardPayload(board.id, resolved.payload);
            }
        }

        const patch = buildMissingDisplayMetadataPatch(board, resolved.metadata || {});
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

    const preparedMetadata = await prepareBoardDisplayMetadataPatch(boardId, metadata);
    const nextDisplayMetadata = pickBoardDisplayMetadata({
        ...existingPayload,
        ...preparedMetadata
    });

    const nextPayload = stripLegacyThumbnailField({ ...existingPayload });
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
