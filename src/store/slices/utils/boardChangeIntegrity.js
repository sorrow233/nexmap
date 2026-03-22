import { normalizeBoardSnapshot } from '../../../services/sync/boardSnapshot';

const INTEGRITY_HASH_VERSION = 'board-integrity:v1:';

export const pickTrackedBoardIntegrityPayload = (snapshot = {}) => {
    const normalized = normalizeBoardSnapshot(snapshot);
    return {
        cards: normalized.cards,
        connections: normalized.connections,
        groups: normalized.groups,
        boardPrompts: normalized.boardPrompts,
        boardInstructionSettings: normalized.boardInstructionSettings
    };
};

export const buildBoardChangeIntegrityHash = (snapshot = {}) => (
    `${INTEGRITY_HASH_VERSION}${JSON.stringify(pickTrackedBoardIntegrityPayload(snapshot))}`
);
