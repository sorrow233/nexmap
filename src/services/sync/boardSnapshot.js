import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../customInstructionsService';
import { normalizeCardTimestamps } from '../cards/cardTimestamps';
import { logBoardLoadStage } from '../../utils/boardLoadDebug';

const DEFAULT_BOARD_SNAPSHOT = Object.freeze({
    cards: [],
    connections: [],
    groups: [],
    boardPrompts: [],
    boardInstructionSettings: normalizeBoardInstructionSettings(DEFAULT_BOARD_INSTRUCTION_SETTINGS),
    updatedAt: 0,
    clientRevision: 0
});

const FNV_OFFSET_A = 0x811c9dc5;
const FNV_OFFSET_B = 0x9e3779b1;
const FNV_PRIME_A = 0x01000193;
const FNV_PRIME_B = 0x85ebca6b;

export const cloneSerializable = (value) => {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
};

const normalizeCardDataForSnapshot = (data) => {
    if (!data || typeof data !== 'object') {
        return data;
    }

    const { runtimeBodyState, ...nextData } = data;
    return nextData;
};

const normalizeCardForSnapshot = (card = {}, options = {}) => {
    const normalizedCard = normalizeCardTimestamps(card, options);
    if (!normalizedCard || typeof normalizedCard !== 'object') {
        return normalizedCard;
    }

    if (!Object.prototype.hasOwnProperty.call(normalizedCard, 'data')) {
        return { ...normalizedCard };
    }

    return {
        ...normalizedCard,
        data: normalizeCardDataForSnapshot(normalizedCard.data)
    };
};

const normalizeCardsForSnapshot = (cards = [], options = {}) => (
    Array.isArray(cards)
        ? cards.map((card) => normalizeCardForSnapshot(card, options))
        : []
);

const getNormalizedBoardSnapshot = (snapshot = {}, options = {}) => (
    options.normalized ? snapshot : normalizeBoardSnapshot(snapshot)
);

const updateHashState = (state, text = '') => {
    const source = String(text);
    for (let index = 0; index < source.length; index += 1) {
        const code = source.charCodeAt(index);
        state.a ^= code;
        state.a = Math.imul(state.a, FNV_PRIME_A) >>> 0;
        state.b ^= code;
        state.b = Math.imul(state.b, FNV_PRIME_B) >>> 0;
    }
};

const hashSerializableValue = (value, state) => {
    if (value == null) {
        updateHashState(state, 'null;');
        return;
    }

    if (Array.isArray(value)) {
        updateHashState(state, `array:${value.length}[`);
        value.forEach((item) => {
            hashSerializableValue(item, state);
            updateHashState(state, ',');
        });
        updateHashState(state, ']');
        return;
    }

    const valueType = typeof value;
    if (valueType === 'string') {
        updateHashState(state, `string:${value.length}:`);
        updateHashState(state, value);
        updateHashState(state, ';');
        return;
    }

    if (valueType === 'number' || valueType === 'boolean') {
        updateHashState(state, `${valueType}:${String(value)};`);
        return;
    }

    if (valueType === 'object') {
        const keys = Object.keys(value).sort();
        updateHashState(state, `object:${keys.length}{`);
        keys.forEach((key) => {
            updateHashState(state, `key:${key};`);
            hashSerializableValue(value[key], state);
            updateHashState(state, ',');
        });
        updateHashState(state, '}');
        return;
    }

    updateHashState(state, `${valueType}:${String(value)};`);
};

const areSerializableValuesEqual = (left, right) => {
    if (left === right) {
        return true;
    }

    if (left == null || right == null) {
        return left === right;
    }

    if (typeof left !== typeof right) {
        return false;
    }

    if (Array.isArray(left) || Array.isArray(right)) {
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
            return false;
        }

        for (let index = 0; index < left.length; index += 1) {
            if (!areSerializableValuesEqual(left[index], right[index])) {
                return false;
            }
        }
        return true;
    }

    if (typeof left === 'object') {
        const leftKeys = Object.keys(left);
        const rightKeys = Object.keys(right);
        if (leftKeys.length !== rightKeys.length) {
            return false;
        }

        for (const key of leftKeys) {
            if (!Object.prototype.hasOwnProperty.call(right, key)) {
                return false;
            }
            if (!areSerializableValuesEqual(left[key], right[key])) {
                return false;
            }
        }
        return true;
    }

    return Number.isNaN(left) && Number.isNaN(right);
};

export const normalizeBoardSnapshot = (snapshot = {}) => {
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const normalized = {
        cards: normalizeCardsForSnapshot(
            snapshot.cards,
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
    };

    const finishedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    logBoardLoadStage('normalizeBoardSnapshot', normalized, {
        durationMs: Number((finishedAt - startedAt).toFixed(2))
    });
    return normalized;
};

export const getEmptyBoardSnapshot = () => cloneSerializable(DEFAULT_BOARD_SNAPSHOT);

export const isMeaningfullyEmptyBoardSnapshot = (snapshot = {}, options = {}) => {
    const normalized = getNormalizedBoardSnapshot(snapshot, options);
    return (
        normalized.cards.length === 0 &&
        normalized.connections.length === 0 &&
        normalized.groups.length === 0 &&
        normalized.boardPrompts.length === 0
    );
};

export const areBoardSnapshotsEquivalent = (
    currentSnapshot = {},
    incomingSnapshot = {},
    options = {}
) => {
    const normalizedCurrent = getNormalizedBoardSnapshot(currentSnapshot, {
        normalized: Boolean(options.normalizedCurrent)
    });
    const normalizedIncoming = getNormalizedBoardSnapshot(incomingSnapshot, {
        normalized: Boolean(options.normalizedIncoming)
    });

    return areSerializableValuesEqual(normalizedCurrent, normalizedIncoming);
};

export const createBoardSnapshotFingerprint = (snapshot = {}, options = {}) => {
    const normalized = getNormalizedBoardSnapshot(snapshot, options);
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const hashState = {
        a: FNV_OFFSET_A,
        b: FNV_OFFSET_B
    };
    hashSerializableValue(normalized, hashState);
    const fingerprint = `${hashState.a.toString(16).padStart(8, '0')}:${hashState.b.toString(16).padStart(8, '0')}`;
    const finishedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

    logBoardLoadStage('createBoardSnapshotFingerprint', normalized, {
        durationMs: Number((finishedAt - startedAt).toFixed(2)),
        fingerprintChars: fingerprint.length
    });

    return fingerprint;
};
