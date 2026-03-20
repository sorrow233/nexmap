import LZString from 'lz-string';
import { removeUndefined } from '../syncUtils.js';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../customInstructionsService.js';
import { getEffectiveBoardCardCount } from '../boardTitle/metadata.js';
import {
    toEpochMillis,
    toSafeClientRevision,
    toSafeSyncVersion
} from '../boardPersistence/persistenceCursor.js';
import { normalizeBoardContentHash } from '../boardPersistence/boardContentHash.js';
import { buildSyncMutationMetadata, normalizeSyncMutationMetadata } from './boardSyncProtocol.js';

export const CLOUD_SNAPSHOT_ENCODING = 'lz-string-base64';
export const CLOUD_SNAPSHOT_SCHEMA_VERSION = 1;
export const CLOUD_SNAPSHOT_STORAGE_INLINE = 'inline';
export const CLOUD_SNAPSHOT_STORAGE_CHUNKED = 'chunked';

const safeArray = (value) => (Array.isArray(value) ? value : []);

const sanitizeMessagePart = (part) => {
    if (!part || typeof part !== 'object') return part;

    if (part.type === 'image' && part.source) {
        if (part.source.s3Url) {
            return {
                ...part,
                source: {
                    type: 'url',
                    media_type: part.source.media_type,
                    url: part.source.s3Url
                }
            };
        }

        if (part.source.type === 'base64') {
            return null;
        }
    }

    return part;
};

const sanitizeMessage = (message) => {
    if (!message || typeof message !== 'object') return message;
    if (!Array.isArray(message.content)) return message;

    const content = message.content
        .map(sanitizeMessagePart)
        .filter(Boolean);

    return {
        ...message,
        content
    };
};

const sanitizeCard = (card) => {
    if (!card || typeof card !== 'object') return card;

    return {
        ...card,
        data: {
            ...(card.data || {}),
            messages: safeArray(card.data?.messages).map(sanitizeMessage).filter(Boolean)
        }
    };
};

export const sanitizeBoardContentForCloud = (boardContent = {}) => ({
    cards: safeArray(boardContent.cards).map(sanitizeCard),
    connections: safeArray(boardContent.connections),
    groups: safeArray(boardContent.groups),
    boardPrompts: safeArray(boardContent.boardPrompts),
    boardInstructionSettings: normalizeBoardInstructionSettings(
        boardContent.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
    )
});

const encodeSnapshotData = (content = {}) => {
    const json = JSON.stringify(content);
    return {
        snapshotData: LZString.compressToBase64(json),
        snapshotEncoding: CLOUD_SNAPSHOT_ENCODING,
        snapshotSchemaVersion: CLOUD_SNAPSHOT_SCHEMA_VERSION
    };
};

export const encodeBoardSnapshotData = (content = {}) => {
    const normalizedContent = sanitizeBoardContentForCloud(content);
    return encodeSnapshotData(normalizedContent);
};

const decodeSnapshotData = (boardData = {}) => {
    const encoded = typeof boardData.snapshotData === 'string' ? boardData.snapshotData : '';
    if (encoded) {
        try {
            const json = LZString.decompressFromBase64(encoded);
            if (json) {
                const parsed = JSON.parse(json);
                return {
                    cards: safeArray(parsed.cards),
                    connections: safeArray(parsed.connections),
                    groups: safeArray(parsed.groups),
                    boardPrompts: safeArray(parsed.boardPrompts),
                    boardInstructionSettings: normalizeBoardInstructionSettings(
                        parsed.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
                    )
                };
            }
        } catch (error) {
            console.error('[BoardCloudSnapshot] Failed to decode compressed snapshot', error);
        }
    }

    return {
        cards: safeArray(boardData.cards),
        connections: safeArray(boardData.connections),
        groups: safeArray(boardData.groups),
        boardPrompts: safeArray(boardData.boardPrompts),
        boardInstructionSettings: normalizeBoardInstructionSettings(
            boardData.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
        )
    };
};

export const buildCloudBoardMetadata = (boardData = {}) => {
    const normalizedId = boardData.id !== undefined && boardData.id !== null
        ? String(boardData.id)
        : '';

    return removeUndefined({
        id: normalizedId,
        name: boardData.name,
        nameSource: boardData.nameSource,
        autoTitle: boardData.autoTitle,
        autoTitleGeneratedAt: boardData.autoTitleGeneratedAt,
        manualTitleUpdatedAt: boardData.manualTitleUpdatedAt,
        createdAt: toEpochMillis(boardData.createdAt),
        updatedAt: toEpochMillis(boardData.updatedAt),
        lastAccessedAt: toEpochMillis(boardData.lastAccessedAt),
        cardCount: Number.isFinite(Number(boardData.cardCount)) && Number(boardData.cardCount) >= 0
            ? Number(boardData.cardCount)
            : 0,
        summary: boardData.summary,
        backgroundImage: boardData.backgroundImage,
        thumbnail: boardData.thumbnail,
        autoImageTriggeredAt: toEpochMillis(boardData.autoImageTriggeredAt),
        deletedAt: boardData.deletedAt
    });
};

export const buildCloudBoardDocument = (boardData = {}) => {
    const content = sanitizeBoardContentForCloud(boardData);
    const metadata = buildCloudBoardMetadata(boardData);
    const snapshotPayload = boardData.snapshotPayload && typeof boardData.snapshotPayload === 'object'
        ? boardData.snapshotPayload
        : encodeSnapshotData(content);
    const snapshotStorage = snapshotPayload.snapshotStorage || CLOUD_SNAPSHOT_STORAGE_INLINE;
    const snapshotChunkCount = Number.isFinite(Number(snapshotPayload.snapshotChunkCount)) && Number(snapshotPayload.snapshotChunkCount) >= 0
        ? Number(snapshotPayload.snapshotChunkCount)
        : 0;
    const snapshotBytes = Number.isFinite(Number(snapshotPayload.snapshotBytes)) && Number(snapshotPayload.snapshotBytes) >= 0
        ? Number(snapshotPayload.snapshotBytes)
        : undefined;
    const inferredCardCount = getEffectiveBoardCardCount(content.cards);
    const cardCount = Number.isFinite(Number(metadata.cardCount)) && Number(metadata.cardCount) > 0
        ? Number(metadata.cardCount)
        : inferredCardCount;
    const syncMetadata = buildSyncMutationMetadata({
        ...(boardData.syncMetadata || {}),
        mutationSequence: boardData.mutationSequence ?? boardData.syncMetadata?.mutationSequence
    });
    const contentHash = normalizeBoardContentHash(boardData.contentHash, content);

    return removeUndefined({
        ...metadata,
        cardCount,
        snapshotData: snapshotPayload.snapshotData,
        snapshotEncoding: snapshotPayload.snapshotEncoding || CLOUD_SNAPSHOT_ENCODING,
        snapshotSchemaVersion: snapshotPayload.snapshotSchemaVersion || CLOUD_SNAPSHOT_SCHEMA_VERSION,
        snapshotStorage,
        snapshotSetId: snapshotPayload.snapshotSetId,
        snapshotChunkCount,
        snapshotBytes,
        serverUpdatedAt: boardData.serverUpdatedAt,
        syncVersion: toSafeSyncVersion(boardData.syncVersion),
        clientRevision: toSafeClientRevision(boardData.clientRevision),
        mutationSequence: syncMetadata.mutationSequence,
        ...syncMetadata,
        contentHash: contentHash || undefined
    });
};

export const materializeCloudBoardSnapshot = (boardData = {}) => {
    const content = decodeSnapshotData(boardData);
    const metadata = buildCloudBoardMetadata(boardData);
    const syncMetadata = normalizeSyncMutationMetadata(boardData);
    const contentHash = normalizeBoardContentHash(boardData.contentHash, content);

    return removeUndefined({
        ...metadata,
        ...content,
        updatedAt: toEpochMillis(boardData.updatedAt),
        syncVersion: toSafeSyncVersion(boardData.syncVersion),
        clientRevision: toSafeClientRevision(boardData.clientRevision),
        mutationSequence: syncMetadata.mutationSequence,
        syncMetadata,
        contentHash: contentHash || undefined,
        snapshotStorage: typeof boardData.snapshotStorage === 'string'
            ? boardData.snapshotStorage
            : CLOUD_SNAPSHOT_STORAGE_INLINE,
        snapshotSetId: typeof boardData.snapshotSetId === 'string' ? boardData.snapshotSetId : '',
        snapshotChunkCount: Number.isFinite(Number(boardData.snapshotChunkCount)) && Number(boardData.snapshotChunkCount) >= 0
            ? Number(boardData.snapshotChunkCount)
            : 0,
        snapshotBytes: Number.isFinite(Number(boardData.snapshotBytes)) && Number(boardData.snapshotBytes) >= 0
            ? Number(boardData.snapshotBytes)
            : undefined
    });
};

export const isCloudBoardSnapshotCompressed = (boardData = {}) => (
    typeof boardData.snapshotData === 'string' && boardData.snapshotData.length > 0
);
