import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../customInstructionsService';
import { normalizeCardsTimestamps } from '../cards/cardTimestamps';

const DEFAULT_BOARD_SNAPSHOT = Object.freeze({
    cards: [],
    connections: [],
    groups: [],
    boardPrompts: [],
    boardInstructionSettings: normalizeBoardInstructionSettings(DEFAULT_BOARD_INSTRUCTION_SETTINGS),
    updatedAt: 0,
    clientRevision: 0
});

export const cloneSerializable = (value) => {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
};

export const normalizeBoardSnapshot = (snapshot = {}) => ({
    cards: normalizeCardsTimestamps(
        Array.isArray(snapshot.cards) ? cloneSerializable(snapshot.cards) : [],
        { boardCreatedAt: Number(snapshot.createdAt) || 0 }
    ),
    connections: Array.isArray(snapshot.connections) ? cloneSerializable(snapshot.connections) : [],
    groups: Array.isArray(snapshot.groups) ? cloneSerializable(snapshot.groups) : [],
    boardPrompts: Array.isArray(snapshot.boardPrompts) ? cloneSerializable(snapshot.boardPrompts) : [],
    boardInstructionSettings: normalizeBoardInstructionSettings(
        snapshot.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
    ),
    updatedAt: Number(snapshot.updatedAt) || 0,
    clientRevision: Number(snapshot.clientRevision) || 0
});

export const getEmptyBoardSnapshot = () => cloneSerializable(DEFAULT_BOARD_SNAPSHOT);

export const isMeaningfullyEmptyBoardSnapshot = (snapshot = {}) => {
    const normalized = normalizeBoardSnapshot(snapshot);
    return (
        normalized.cards.length === 0 &&
        normalized.connections.length === 0 &&
        normalized.groups.length === 0 &&
        normalized.boardPrompts.length === 0
    );
};

export const createBoardSnapshotFingerprint = (snapshot = {}) => {
    const normalized = normalizeBoardSnapshot(snapshot);
    return JSON.stringify(normalized);
};
