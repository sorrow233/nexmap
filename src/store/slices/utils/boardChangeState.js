const toSafeCounter = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
};

const toSafeTimestamp = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : Date.now();
};

const CHANGE_FIELD_MAP = Object.freeze({
    card_content: 'contentRevision',
    card_add: 'structureRevision',
    card_delete: 'structureRevision',
    card_restore: 'structureRevision',
    card_move: 'geometryRevision',
    connection_change: 'structureRevision',
    group_change: 'structureRevision',
    board_prompt_change: 'metadataRevision',
    board_instruction_change: 'metadataRevision',
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
        lastChangedAt: toSafeTimestamp(seed.lastChangedAt)
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

    const targetField = CHANGE_FIELD_MAP[changeType] || null;
    if (targetField) {
        nextState[targetField] = previous[targetField] + 1;
    }

    return nextState;
};

export const syncBoardChangeStateToCursor = (previousState, cursor = {}, changeType = 'sync_apply') => {
    const revision = toSafeCounter(cursor.clientRevision ?? cursor.revision);
    const lastChangedAt = toSafeTimestamp(cursor.updatedAt ?? cursor.lastChangedAt);

    return {
        revision,
        contentRevision: revision,
        geometryRevision: revision,
        structureRevision: revision,
        metadataRevision: revision,
        lastChangeType: changeType,
        lastChangedAt
    };
};
