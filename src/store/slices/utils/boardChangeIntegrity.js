import { normalizeBoardSnapshot } from '../../../services/sync/boardSnapshot';

const INTEGRITY_HASH_VERSION = 'board-integrity:v2:';
const FNV_OFFSET_A = 0x811c9dc5;
const FNV_OFFSET_B = 0x9e3779b1;
const FNV_PRIME_A = 0x01000193;
const FNV_PRIME_B = 0x85ebca6b;

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

const buildTrackedBoardIntegrityFingerprint = (payload = {}) => {
    const hashState = {
        a: FNV_OFFSET_A,
        b: FNV_OFFSET_B
    };
    hashSerializableValue(payload, hashState);
    return `${hashState.a.toString(16).padStart(8, '0')}:${hashState.b.toString(16).padStart(8, '0')}`;
};

export const hasBoardChangeIntegrityHashVersion = (hash = '') => (
    typeof hash === 'string' && hash.startsWith(INTEGRITY_HASH_VERSION)
);

export const pickTrackedBoardIntegrityPayload = (snapshot = {}, options = {}) => {
    const normalized = options.normalized
        ? snapshot
        : normalizeBoardSnapshot(snapshot);
    return {
        cards: normalized.cards,
        connections: normalized.connections,
        groups: normalized.groups,
        boardPrompts: normalized.boardPrompts,
        boardInstructionSettings: normalized.boardInstructionSettings
    };
};

export const buildBoardChangeIntegrityHash = (snapshot = {}, options = {}) => (
    `${INTEGRITY_HASH_VERSION}${buildTrackedBoardIntegrityFingerprint(
        pickTrackedBoardIntegrityPayload(snapshot, options)
    )}`
);
