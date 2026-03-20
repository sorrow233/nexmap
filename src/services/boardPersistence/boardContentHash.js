import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../customInstructionsService.js';
import { buildConnectionKey, normalizeConnection } from '../sync/boardPatchStructuralOps.js';

const BOARD_CONTENT_HASH_PREFIX = 'bh2';
const MAX_EMBEDDED_CONTENT_HASH_LENGTH = 160;

const safeArray = (value) => (Array.isArray(value) ? value : []);

const sortByStringKey = (items = [], getKey) => (
    safeArray(items)
        .slice()
        .sort((left, right) => String(getKey(left)).localeCompare(String(getKey(right))))
);

const normalizeCardForHash = (card = {}) => ({
    id: card.id,
    x: card.x,
    y: card.y,
    type: card.type,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    deletedAt: card.deletedAt,
    data: card.data
});

const serializeBoardContentForHash = (boardContent = {}) => JSON.stringify({
    cards: sortByStringKey(boardContent.cards, (card) => card?.id || '').map(normalizeCardForHash),
    connections: sortByStringKey(
        safeArray(boardContent.connections)
            .map(normalizeConnection)
            .filter(Boolean),
        (connection) => buildConnectionKey(connection)
    ),
    groups: sortByStringKey(boardContent.groups, (group) => group?.id || ''),
    boardPrompts: sortByStringKey(boardContent.boardPrompts, (prompt) => prompt?.id || ''),
    boardInstructionSettings: normalizeBoardInstructionSettings(
        boardContent.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
    )
});

const hashString53 = (value = '', seed = 0) => {
    let hashA = 0xdeadbeef ^ seed;
    let hashB = 0x41c6ce57 ^ seed;

    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        hashA = Math.imul(hashA ^ code, 2654435761);
        hashB = Math.imul(hashB ^ code, 1597334677);
    }

    hashA = Math.imul(hashA ^ (hashA >>> 16), 2246822507) ^ Math.imul(hashB ^ (hashB >>> 13), 3266489909);
    hashB = Math.imul(hashB ^ (hashB >>> 16), 2246822507) ^ Math.imul(hashA ^ (hashA >>> 13), 3266489909);

    return 4294967296 * (2097151 & hashB) + (hashA >>> 0);
};

const buildSerializedContentHash = (serializedContent = '') => {
    const primaryHash = hashString53(serializedContent, 0).toString(36);
    const secondaryHash = hashString53(serializedContent, 1).toString(36);
    return `${BOARD_CONTENT_HASH_PREFIX}_${serializedContent.length.toString(36)}_${primaryHash}_${secondaryHash}`;
};

export const isBoardContentHashCompact = (value) => (
    typeof value === 'string' &&
    value.startsWith(`${BOARD_CONTENT_HASH_PREFIX}_`) &&
    value.length <= MAX_EMBEDDED_CONTENT_HASH_LENGTH
);

export const buildBoardContentHash = (boardContent = {}) => (
    buildSerializedContentHash(serializeBoardContentForHash(boardContent))
);

export const normalizeBoardContentHash = (contentHash, boardContent = null) => {
    if (isBoardContentHashCompact(contentHash)) {
        return contentHash;
    }

    if (boardContent && typeof boardContent === 'object') {
        return buildBoardContentHash(boardContent);
    }

    if (typeof contentHash === 'string' && contentHash) {
        return buildSerializedContentHash(contentHash);
    }

    return '';
};
