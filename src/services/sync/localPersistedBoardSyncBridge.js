const listeners = new Set();
const queuedPayloads = new Map();
const lastDispatchedCursorByBoard = new Map();

const IMMEDIATE_SYNC_SOURCES = new Set([
    'generation_complete_flush',
    'visibility_hidden_flush',
    'pagehide_flush',
    'beforeunload_flush',
    'freeze_flush',
    'unmount_flush'
]);

const REMOTE_SYNC_DELAY_MS = {
    small: 4000,
    medium: 10000,
    large: 18000
};

const toSafeBoardId = (value) => (
    typeof value === 'string' && value.trim() ? value.trim() : ''
);

const estimateSnapshotBytes = (snapshot = {}) => {
    try {
        return new TextEncoder().encode(JSON.stringify(snapshot)).byteLength;
    } catch (error) {
        console.warn('[LocalPersistedBoardSyncBridge] Failed to estimate snapshot bytes:', error);
        return 0;
    }
};

const resolveSyncDelay = (snapshot = {}) => {
    const estimatedBytes = estimateSnapshotBytes(snapshot);

    if (estimatedBytes >= 256 * 1024) {
        return REMOTE_SYNC_DELAY_MS.large;
    }

    if (estimatedBytes >= 64 * 1024) {
        return REMOTE_SYNC_DELAY_MS.medium;
    }

    return REMOTE_SYNC_DELAY_MS.small;
};

const createCursorSignature = (payload = {}) => {
    const revision = Number(payload?.snapshot?.clientRevision) || 0;
    const updatedAt = Number(payload?.snapshot?.updatedAt) || 0;
    return `${revision}:${updatedAt}`;
};

const dispatchPayload = (payload = {}) => {
    const boardId = toSafeBoardId(payload.boardId);
    if (!boardId || !payload.snapshot) return;

    const cursorSignature = createCursorSignature(payload);
    if (lastDispatchedCursorByBoard.get(boardId) === cursorSignature) {
        return;
    }

    lastDispatchedCursorByBoard.set(boardId, cursorSignature);
    listeners.forEach((listener) => {
        try {
            listener(payload);
        } catch (error) {
            console.error('[LocalPersistedBoardSyncBridge] Listener failed:', error);
        }
    });
};

const clearQueuedPayload = (boardId) => {
    const queued = queuedPayloads.get(boardId);
    if (queued?.timer) {
        clearTimeout(queued.timer);
    }
    queuedPayloads.delete(boardId);
};

export const emitPersistedBoardSyncSnapshot = (payload = {}) => {
    const boardId = toSafeBoardId(payload.boardId);
    if (!boardId || !payload.snapshot) {
        return;
    }

    const normalizedPayload = {
        ...payload,
        boardId
    };

    if (IMMEDIATE_SYNC_SOURCES.has(normalizedPayload.source)) {
        clearQueuedPayload(boardId);
        dispatchPayload(normalizedPayload);
        return;
    }

    clearQueuedPayload(boardId);
    const timer = setTimeout(() => {
        queuedPayloads.delete(boardId);
        dispatchPayload(normalizedPayload);
    }, resolveSyncDelay(normalizedPayload.snapshot));

    queuedPayloads.set(boardId, {
        timer,
        payload: normalizedPayload
    });
};

export const subscribePersistedBoardSyncSnapshot = (listener) => {
    if (typeof listener !== 'function') {
        return () => { };
    }

    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};
