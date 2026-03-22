const toSafeCounter = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
};

const toSafeTimestamp = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : Date.now();
};

const toSafeOptionalTimestamp = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
};

const CHANGE_FIELD_MAP = Object.freeze({
    card_content: ['contentRevision'],
    card_add: ['structureRevision'],
    card_delete: ['structureRevision'],
    card_restore: ['structureRevision'],
    card_move: ['geometryRevision'],
    connection_change: ['structureRevision'],
    group_change: ['structureRevision'],
    board_prompt_change: ['metadataRevision'],
    board_instruction_change: ['metadataRevision'],
    undo: ['contentRevision', 'geometryRevision', 'structureRevision', 'metadataRevision'],
    redo: ['contentRevision', 'geometryRevision', 'structureRevision', 'metadataRevision'],
    integrity_repair: ['contentRevision', 'geometryRevision', 'structureRevision', 'metadataRevision'],
    sync_apply: null,
    local_load: null,
    manual_force_override: null
});

export const createBoardChangeState = (seed = {}) => {
    const revision = toSafeCounter(seed.revision);
    return {
        revision,
        contentRevision: toSafeCounter(seed.contentRevision ?? revision),
        geometryRevision: toSafeCounter(seed.geometryRevision ?? revision),
        structureRevision: toSafeCounter(seed.structureRevision ?? revision),
        metadataRevision: toSafeCounter(seed.metadataRevision ?? revision),
        lastChangeType: typeof seed.lastChangeType === 'string' ? seed.lastChangeType : 'init',
        lastChangedAt: toSafeTimestamp(seed.lastChangedAt),
        lastIntegrityHash: typeof seed.lastIntegrityHash === 'string' ? seed.lastIntegrityHash : '',
        lastValidatedRevision: toSafeCounter(seed.lastValidatedRevision),
        lastValidatedAt: toSafeOptionalTimestamp(seed.lastValidatedAt)
    };
};

export const bumpBoardChangeState = (previousState, changeType, options = {}) => {
    const previous = createBoardChangeState(previousState);
    if (typeof changeType !== 'string' || !changeType) {
        return previous;
    }

    const nextRevision = previous.revision + 1;
    const nextState = {
        ...previous,
        revision: nextRevision,
        lastChangeType: changeType,
        lastChangedAt: toSafeTimestamp(options.changedAt)
    };

    const targetFields = CHANGE_FIELD_MAP[changeType] || null;
    if (Array.isArray(targetFields)) {
        targetFields.forEach((fieldName) => {
            nextState[fieldName] = previous[fieldName] + 1;
        });
    }

    return nextState;
};

export const markBoardChangeStateValidated = (previousState, options = {}) => {
    const previous = createBoardChangeState(previousState);
    const nextValidatedAt = options.validatedAt ?? Date.now();

    return {
        ...previous,
        lastIntegrityHash: typeof options.integrityHash === 'string'
            ? options.integrityHash
            : previous.lastIntegrityHash,
        lastValidatedRevision: options.revision === undefined
            ? previous.revision
            : toSafeCounter(options.revision),
        lastValidatedAt: toSafeOptionalTimestamp(nextValidatedAt)
    };
};

export const repairBoardChangeStateIntegrity = (previousState, options = {}) => {
    const changedAt = options.validatedAt ?? Date.now();
    const repairedState = bumpBoardChangeState(previousState, 'integrity_repair', {
        changedAt
    });
    return markBoardChangeStateValidated(repairedState, {
        integrityHash: options.integrityHash,
        validatedAt: changedAt
    });
};

export const syncBoardChangeStateToCursor = (previousState, cursor = {}, changeType = 'sync_apply', options = {}) => {
    const revision = toSafeCounter(cursor.clientRevision ?? cursor.revision);
    const lastChangedAt = toSafeTimestamp(cursor.updatedAt ?? cursor.lastChangedAt);

    return {
        revision,
        contentRevision: revision,
        geometryRevision: revision,
        structureRevision: revision,
        metadataRevision: revision,
        lastChangeType: changeType,
        lastChangedAt,
        lastIntegrityHash: typeof options.integrityHash === 'string' ? options.integrityHash : '',
        lastValidatedRevision: revision,
        lastValidatedAt: toSafeOptionalTimestamp(options.validatedAt ?? lastChangedAt)
    };
};
