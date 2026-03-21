import * as Y from 'yjs';
import LZString from 'lz-string';
import { base64ToBytes } from './base64';
import { normalizeBoardSnapshot } from './boardSnapshot';
import {
    createBoardDoc,
    readBoardSnapshotFromDoc,
    syncBoardSnapshotToDoc
} from './boardYDoc';
import { extractLegacyRootSnapshot } from './legacyCloudBoardMigration';

const looksLikeBoardSnapshot = (value) => {
    if (!value || typeof value !== 'object') return false;

    return (
        Array.isArray(value.cards) ||
        Array.isArray(value.connections) ||
        Array.isArray(value.groups) ||
        Array.isArray(value.boardPrompts) ||
        Boolean(value.boardInstructionSettings)
    );
};

const parseBoardSnapshotJson = (text = '') => {
    if (!text || typeof text !== 'string') {
        return null;
    }

    try {
        const parsed = JSON.parse(text);
        if (!looksLikeBoardSnapshot(parsed)) {
            return null;
        }
        return normalizeBoardSnapshot(parsed);
    } catch {
        return null;
    }
};

const decodeBase64Text = (encoded = '') => {
    if (!encoded) {
        return '';
    }

    try {
        return new TextDecoder().decode(base64ToBytes(encoded));
    } catch {
        return '';
    }
};

const recoverSnapshotFromCheckpointPayload = (updateBase64 = '') => {
    const directJsonSnapshot = parseBoardSnapshotJson(updateBase64);
    if (directJsonSnapshot) {
        return {
            snapshot: directJsonSnapshot,
            format: 'json_string_snapshot'
        };
    }

    const base64JsonSnapshot = parseBoardSnapshotJson(decodeBase64Text(updateBase64));
    if (base64JsonSnapshot) {
        return {
            snapshot: base64JsonSnapshot,
            format: 'base64_json_snapshot'
        };
    }

    try {
        const decompressed = LZString.decompressFromBase64(updateBase64);
        const compressedSnapshot = parseBoardSnapshotJson(decompressed || '');
        if (compressedSnapshot) {
            return {
                snapshot: compressedSnapshot,
                format: 'lzstring_snapshot'
            };
        }
    } catch {
        // Ignore and keep trying other compatibility formats.
    }

    return null;
};

const applySnapshotToDoc = (doc, snapshot, origin) => {
    doc.transact(() => {
        syncBoardSnapshotToDoc(doc, snapshot);
    }, origin);
};

export const applyCheckpointPayloadToDoc = ({
    doc,
    updateBase64,
    rootData = null,
    origin
}) => {
    let decodeError = null;

    try {
        Y.applyUpdate(doc, base64ToBytes(updateBase64), origin);
        return {
            format: 'yjs_update',
            recovered: false
        };
    } catch (error) {
        decodeError = error;
    }

    const payloadSnapshot = recoverSnapshotFromCheckpointPayload(updateBase64);
    if (payloadSnapshot?.snapshot) {
        applySnapshotToDoc(doc, payloadSnapshot.snapshot, origin);
        return {
            format: payloadSnapshot.format,
            recovered: true,
            error: decodeError
        };
    }

    const legacyRootSnapshot = extractLegacyRootSnapshot(rootData);
    if (legacyRootSnapshot) {
        applySnapshotToDoc(doc, legacyRootSnapshot, origin);
        return {
            format: 'legacy_root_snapshot',
            recovered: true,
            error: decodeError
        };
    }

    throw decodeError;
};

export const readCheckpointPayloadSnapshot = ({
    updateBase64,
    rootData = null
}) => {
    const tempDoc = createBoardDoc();

    try {
        const result = applyCheckpointPayloadToDoc({
            doc: tempDoc,
            updateBase64,
            rootData
        });

        return {
            snapshot: readBoardSnapshotFromDoc(tempDoc),
            format: result.format,
            recovered: result.recovered
        };
    } finally {
        tempDoc.destroy();
    }
};
