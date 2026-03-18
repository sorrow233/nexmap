import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../customInstructionsService';

export const buildBoardContentHash = (boardContent = {}) => JSON.stringify({
    cards: (boardContent.cards || []).map((card) => ({
        id: card.id,
        x: card.x,
        y: card.y,
        type: card.type,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        deletedAt: card.deletedAt,
        data: card.data
    })),
    connections: boardContent.connections || [],
    groups: boardContent.groups || [],
    boardPrompts: boardContent.boardPrompts || [],
    boardInstructionSettings: normalizeBoardInstructionSettings(
        boardContent.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
    )
});
