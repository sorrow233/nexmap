const BOARD_SYNC_PHASE = Object.freeze({
    BOOTING: 'booting',
    IDLE: 'idle',
    LOCAL_DIRTY: 'local_dirty',
    PERSISTING_LOCAL: 'persisting_local',
    SYNC_SCHEDULED: 'sync_scheduled',
    SYNCING: 'syncing',
    REBASING: 'rebasing',
    PAUSED_OFFLINE: 'paused_offline',
    ERROR: 'error'
});

const BOARD_SYNC_EVENT = Object.freeze({
    BOARD_READY: 'BOARD_READY',
    LOCAL_CHANGE: 'LOCAL_CHANGE',
    LOCAL_SAVE_STARTED: 'LOCAL_SAVE_STARTED',
    LOCAL_SAVE_COMPLETED: 'LOCAL_SAVE_COMPLETED',
    CLOUD_SYNC_SCHEDULED: 'CLOUD_SYNC_SCHEDULED',
    CLOUD_SYNC_STARTED: 'CLOUD_SYNC_STARTED',
    CLOUD_SYNC_ACKED: 'CLOUD_SYNC_ACKED',
    CLOUD_SYNC_DEFERRED: 'CLOUD_SYNC_DEFERRED',
    CLOUD_SYNC_FAILED: 'CLOUD_SYNC_FAILED',
    REBASE_STARTED: 'REBASE_STARTED',
    REBASE_COMPLETED: 'REBASE_COMPLETED',
    RESET: 'RESET'
});

const toSafeNumber = (value, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
};

const normalizePhase = (phase) => (
    Object.values(BOARD_SYNC_PHASE).includes(phase) ? phase : BOARD_SYNC_PHASE.BOOTING
);

const buildMetadata = (payload = {}) => ({
    revision: toSafeNumber(payload.revision),
    ackedRevision: toSafeNumber(payload.ackedRevision),
    pendingOperations: toSafeNumber(payload.pendingOperations),
    message: typeof payload.message === 'string' ? payload.message : '',
    offline: payload.offline === true,
    reason: typeof payload.reason === 'string' ? payload.reason : ''
});

export const createBoardSyncState = (boardId, overrides = {}) => ({
    boardId: typeof boardId === 'string' ? boardId : '',
    phase: normalizePhase(overrides.phase || BOARD_SYNC_PHASE.IDLE),
    revision: toSafeNumber(overrides.revision),
    ackedRevision: toSafeNumber(overrides.ackedRevision),
    pendingOperations: toSafeNumber(overrides.pendingOperations),
    lastEvent: typeof overrides.lastEvent === 'string' ? overrides.lastEvent : BOARD_SYNC_EVENT.RESET,
    lastEventAt: toSafeNumber(overrides.lastEventAt, Date.now()),
    message: typeof overrides.message === 'string' ? overrides.message : '',
    reason: typeof overrides.reason === 'string' ? overrides.reason : ''
});

const applyBaseMetadata = (state, eventType, metadata = {}, phase = state.phase) => ({
    ...state,
    phase,
    revision: Math.max(state.revision, metadata.revision || 0),
    ackedRevision: Math.max(state.ackedRevision, metadata.ackedRevision || 0),
    pendingOperations: metadata.pendingOperations !== undefined
        ? toSafeNumber(metadata.pendingOperations)
        : state.pendingOperations,
    lastEvent: eventType,
    lastEventAt: Date.now(),
    message: metadata.message || '',
    reason: metadata.reason || ''
});

export const transitionBoardSyncState = (currentState, event) => {
    const state = createBoardSyncState(currentState?.boardId, currentState);
    const eventType = event?.type;
    const metadata = buildMetadata(event?.payload);

    switch (eventType) {
    case BOARD_SYNC_EVENT.BOARD_READY:
        return applyBaseMetadata(state, eventType, metadata, BOARD_SYNC_PHASE.IDLE);

    case BOARD_SYNC_EVENT.LOCAL_CHANGE:
        return applyBaseMetadata(state, eventType, metadata, BOARD_SYNC_PHASE.LOCAL_DIRTY);

    case BOARD_SYNC_EVENT.LOCAL_SAVE_STARTED:
        return applyBaseMetadata(state, eventType, metadata, BOARD_SYNC_PHASE.PERSISTING_LOCAL);

    case BOARD_SYNC_EVENT.LOCAL_SAVE_COMPLETED:
        if (metadata.pendingOperations > 0) {
            return applyBaseMetadata(state, eventType, metadata, BOARD_SYNC_PHASE.SYNC_SCHEDULED);
        }
        return applyBaseMetadata(state, eventType, metadata, BOARD_SYNC_PHASE.IDLE);

    case BOARD_SYNC_EVENT.CLOUD_SYNC_SCHEDULED:
        return applyBaseMetadata(state, eventType, metadata, BOARD_SYNC_PHASE.SYNC_SCHEDULED);

    case BOARD_SYNC_EVENT.CLOUD_SYNC_STARTED:
        return applyBaseMetadata(state, eventType, metadata, BOARD_SYNC_PHASE.SYNCING);

    case BOARD_SYNC_EVENT.CLOUD_SYNC_ACKED:
        if (metadata.pendingOperations > 0) {
            return applyBaseMetadata(state, eventType, metadata, BOARD_SYNC_PHASE.SYNC_SCHEDULED);
        }
        return applyBaseMetadata(state, eventType, metadata, BOARD_SYNC_PHASE.IDLE);

    case BOARD_SYNC_EVENT.CLOUD_SYNC_DEFERRED:
        if (metadata.offline) {
            return applyBaseMetadata(state, eventType, metadata, BOARD_SYNC_PHASE.PAUSED_OFFLINE);
        }
        return applyBaseMetadata(state, eventType, metadata, BOARD_SYNC_PHASE.SYNC_SCHEDULED);

    case BOARD_SYNC_EVENT.CLOUD_SYNC_FAILED:
        return applyBaseMetadata(state, eventType, metadata, BOARD_SYNC_PHASE.ERROR);

    case BOARD_SYNC_EVENT.REBASE_STARTED:
        return applyBaseMetadata(state, eventType, metadata, BOARD_SYNC_PHASE.REBASING);

    case BOARD_SYNC_EVENT.REBASE_COMPLETED:
        if (metadata.pendingOperations > 0) {
            return applyBaseMetadata(state, eventType, metadata, BOARD_SYNC_PHASE.SYNC_SCHEDULED);
        }
        return applyBaseMetadata(state, eventType, metadata, BOARD_SYNC_PHASE.IDLE);

    case BOARD_SYNC_EVENT.RESET:
        return createBoardSyncState(state.boardId, { phase: BOARD_SYNC_PHASE.IDLE });

    default:
        return state;
    }
};

export const mapBoardSyncPhaseToUiStatus = (phase) => {
    switch (phase) {
    case BOARD_SYNC_PHASE.BOOTING:
        return 'syncing';
    case BOARD_SYNC_PHASE.LOCAL_DIRTY:
        return 'local_dirty';
    case BOARD_SYNC_PHASE.PERSISTING_LOCAL:
        return 'persisting_local';
    case BOARD_SYNC_PHASE.SYNC_SCHEDULED:
        return 'sync_scheduled';
    case BOARD_SYNC_PHASE.SYNCING:
        return 'syncing';
    case BOARD_SYNC_PHASE.REBASING:
        return 'rebasing';
    case BOARD_SYNC_PHASE.PAUSED_OFFLINE:
        return 'offline';
    case BOARD_SYNC_PHASE.ERROR:
        return 'error';
    case BOARD_SYNC_PHASE.IDLE:
    default:
        return 'synced';
    }
};

export { BOARD_SYNC_EVENT, BOARD_SYNC_PHASE };
