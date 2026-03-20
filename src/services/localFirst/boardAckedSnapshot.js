import { idbDel, idbGet, idbSet } from '../db/indexedDB.js';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../customInstructionsService.js';
import { buildSyncMutationMetadata, normalizeSyncMutationMetadata } from '../sync/boardSyncProtocol.js';

const ACKED_SNAPSHOT_PREFIX = 'mixboard_local_first_acked_';

const safeArray = (value) => (Array.isArray(value) ? value : []);

const toSafeInt = (value, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? Math.trunc(numeric) : fallback;
};

const getAckedSnapshotKey = (boardId) => `${ACKED_SNAPSHOT_PREFIX}${boardId}`;

export const normalizeAckedBoardSnapshot = (value = {}) => {
    if (!value || typeof value !== 'object') return null;
    return {
        boardId: typeof value.boardId === 'string' ? value.boardId : '',
        cards: safeArray(value.cards),
        connections: safeArray(value.connections),
        groups: safeArray(value.groups),
        boardPrompts: safeArray(value.boardPrompts),
        boardInstructionSettings: normalizeBoardInstructionSettings(
            value.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
        ),
        updatedAt: toSafeInt(value.updatedAt),
        syncVersion: toSafeInt(value.syncVersion),
        clientRevision: toSafeInt(value.clientRevision),
        mutationSequence: toSafeInt(value.mutationSequence),
        syncMetadata: normalizeSyncMutationMetadata(value.syncMetadata || value)
    };
};

export const loadAckedBoardSnapshot = async (boardId) => {
    if (!boardId) return null;
    const stored = await idbGet(getAckedSnapshotKey(boardId));
    return normalizeAckedBoardSnapshot(stored);
};

export const persistAckedBoardSnapshot = async (boardId, snapshot, options = {}) => {
    if (!boardId || !snapshot || typeof snapshot !== 'object') return null;

    const normalized = normalizeAckedBoardSnapshot({
        boardId,
        ...snapshot,
        syncMetadata: buildSyncMutationMetadata({
            ...(snapshot.syncMetadata || {}),
            ...(options.syncMetadata || {}),
            mutationSequence: options.mutationSequence ?? snapshot.mutationSequence ?? snapshot.syncMetadata?.mutationSequence,
            createdAtMs: options.createdAtMs ?? snapshot.syncMetadata?.createdAtMs ?? Date.now()
        })
    });

    await idbSet(getAckedSnapshotKey(boardId), normalized);
    return normalized;
};

export const clearAckedBoardSnapshot = async (boardId) => {
    if (!boardId) return;
    await idbDel(getAckedSnapshotKey(boardId));
};
