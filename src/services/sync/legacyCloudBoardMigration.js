import * as Y from 'yjs';
import LZString from 'lz-string';
import { bytesToBase64 } from './base64';
import { createBoardDoc, syncBoardSnapshotToDoc } from './boardYDoc';
import {
    hasRemoteCheckpoint,
    saveBoardCheckpoint
} from './firestoreCheckpointStore';
import {
    isMeaningfullyEmptyBoardSnapshot,
    normalizeBoardSnapshot
} from './boardSnapshot';

const readCompressedLegacySnapshot = (rootData = {}) => {
    const snapshotData = typeof rootData.snapshotData === 'string'
        ? rootData.snapshotData
        : '';

    if (!snapshotData) {
        return null;
    }

    try {
        const json = LZString.decompressFromBase64(snapshotData);
        if (!json) {
            return null;
        }
        return JSON.parse(json);
    } catch (error) {
        console.warn('[FirebaseSync] Failed to decode legacy snapshotData during migration', error);
        return null;
    }
};

export const extractLegacyRootSnapshot = (rootData = {}) => {
    if (!rootData || typeof rootData !== 'object') {
        return null;
    }

    const compressedSnapshot = readCompressedLegacySnapshot(rootData);
    if (compressedSnapshot) {
        return normalizeBoardSnapshot({
            ...compressedSnapshot,
            updatedAt: rootData.updatedAt,
            clientRevision: rootData.clientRevision
        });
    }

    const hasRawBoardPayload = (
        Array.isArray(rootData.cards) ||
        Array.isArray(rootData.connections) ||
        Array.isArray(rootData.groups) ||
        Array.isArray(rootData.boardPrompts)
    );

    if (!hasRawBoardPayload) {
        return null;
    }

    return normalizeBoardSnapshot({
        cards: rootData.cards,
        connections: rootData.connections,
        groups: rootData.groups,
        boardPrompts: rootData.boardPrompts,
        boardInstructionSettings: rootData.boardInstructionSettings,
        updatedAt: rootData.updatedAt,
        clientRevision: rootData.clientRevision
    });
};

export const hasLegacyRootSnapshot = (rootData = {}) => {
    if (!rootData || typeof rootData !== 'object' || hasRemoteCheckpoint(rootData)) {
        return false;
    }

    return Boolean(extractLegacyRootSnapshot(rootData));
};

export const migrateLegacyRootSnapshotToCheckpoint = async ({
    userId,
    boardId,
    deviceId,
    rootData
}) => {
    if (!rootData || typeof rootData !== 'object' || hasRemoteCheckpoint(rootData)) {
        return null;
    }

    const legacySnapshot = extractLegacyRootSnapshot(rootData);
    if (!legacySnapshot || isMeaningfullyEmptyBoardSnapshot(legacySnapshot)) {
        return null;
    }

    const tempDoc = createBoardDoc();
    syncBoardSnapshotToDoc(tempDoc, legacySnapshot);

    try {
        return await saveBoardCheckpoint({
            userId,
            boardId,
            deviceId,
            updateBase64: bytesToBase64(Y.encodeStateAsUpdate(tempDoc)),
            reason: 'legacy_root_migration'
        });
    } finally {
        tempDoc.destroy();
    }
};
