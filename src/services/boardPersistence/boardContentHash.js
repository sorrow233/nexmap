import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../customInstructionsService.js';
import { buildConnectionKey, normalizeConnection } from '../sync/boardPatchStructuralOps.js';

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

export const buildBoardContentHash = (boardContent = {}) => JSON.stringify({
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
