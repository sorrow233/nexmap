export const toEpochMillis = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const asNumber = Number(value);
        if (Number.isFinite(asNumber)) return asNumber;
        const asDate = Date.parse(value);
        return Number.isFinite(asDate) ? asDate : 0;
    }
    if (value && typeof value.toMillis === 'function') {
        try {
            return value.toMillis();
        } catch (error) {
            console.error('[PersistenceCursor] Failed to read timestamp via toMillis()', error);
            return 0;
        }
    }
    return 0;
};

export const toSafeSyncVersion = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
};

export const toSafeClientRevision = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
};

export const toSafeMutationSequence = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
};

const hasUsableSyncVersion = (cursor = {}) => cursor.syncVersion > 0;
const hasUsableClientRevision = (cursor = {}) => cursor.clientRevision > 0;
const hasUsableMutationSequence = (cursor = {}) => cursor.mutationSequence > 0;

export const buildPersistenceCursor = (boardData = {}) => ({
    clientRevision: toSafeClientRevision(boardData.clientRevision),
    syncVersion: toSafeSyncVersion(boardData.syncVersion),
    mutationSequence: toSafeMutationSequence(boardData.mutationSequence),
    updatedAt: toEpochMillis(boardData.updatedAt)
});

export const comparePersistenceCursorFreshness = (nextCursor, prevCursor) => {
    if (!prevCursor) return 1;

    const next = buildPersistenceCursor(nextCursor);
    const prev = buildPersistenceCursor(prevCursor);
    const nextHasVersion = hasUsableSyncVersion(next);
    const prevHasVersion = hasUsableSyncVersion(prev);
    const nextHasClientRevision = hasUsableClientRevision(next);
    const prevHasClientRevision = hasUsableClientRevision(prev);
    const nextHasMutationSequence = hasUsableMutationSequence(next);
    const prevHasMutationSequence = hasUsableMutationSequence(prev);

    if (nextHasMutationSequence && prevHasMutationSequence && next.mutationSequence !== prev.mutationSequence) {
        return next.mutationSequence > prev.mutationSequence ? 1 : -1;
    }

    if (nextHasClientRevision && prevHasClientRevision && next.clientRevision !== prev.clientRevision) {
        return next.clientRevision > prev.clientRevision ? 1 : -1;
    }

    if (nextHasVersion && prevHasVersion && next.syncVersion !== prev.syncVersion) {
        return next.syncVersion > prev.syncVersion ? 1 : -1;
    }

    if (next.updatedAt !== prev.updatedAt) {
        return next.updatedAt > prev.updatedAt ? 1 : -1;
    }

    if (nextHasVersion !== prevHasVersion) {
        return nextHasVersion ? 1 : -1;
    }

    if (nextHasClientRevision !== prevHasClientRevision) {
        return nextHasClientRevision ? 1 : -1;
    }

    if (nextHasMutationSequence !== prevHasMutationSequence) {
        return nextHasMutationSequence ? 1 : -1;
    }

    if (next.clientRevision !== prev.clientRevision) {
        return next.clientRevision > prev.clientRevision ? 1 : -1;
    }

    if (next.syncVersion !== prev.syncVersion) {
        return next.syncVersion > prev.syncVersion ? 1 : -1;
    }

    if (next.mutationSequence !== prev.mutationSequence) {
        return next.mutationSequence > prev.mutationSequence ? 1 : -1;
    }

    return 0;
};

export const isIncomingCursorNewer = (nextCursor, prevCursor) => (
    comparePersistenceCursorFreshness(nextCursor, prevCursor) > 0
);

export const isSnapshotClearlyNewer = (nextSnapshot, prevSnapshot) => {
    const next = buildPersistenceCursor(nextSnapshot);
    const prev = buildPersistenceCursor(prevSnapshot);

    if (next.mutationSequence !== prev.mutationSequence) {
        return next.mutationSequence > prev.mutationSequence;
    }

    if (next.clientRevision !== prev.clientRevision) {
        return next.clientRevision > prev.clientRevision;
    }

    if (next.syncVersion !== prev.syncVersion) {
        return next.syncVersion > prev.syncVersion;
    }

    return false;
};

export const shouldSkipApplyingIncomingSnapshot = ({
    localClientRevision = 0,
    incomingClientRevision = 0,
    localVersion = 0,
    incomingVersion = 0,
    localMutationSequence = 0,
    incomingMutationSequence = 0,
    localUpdatedAt = 0,
    incomingUpdatedAt = 0
} = {}) => {
    if (localMutationSequence !== incomingMutationSequence) {
        if (localMutationSequence > incomingMutationSequence) return true;
        if (localMutationSequence < incomingMutationSequence) return false;
    }

    if (localClientRevision !== incomingClientRevision) {
        if (localClientRevision > incomingClientRevision) return true;
        if (localClientRevision < incomingClientRevision) return false;
    }

    if (localVersion !== incomingVersion) {
        if (localVersion > incomingVersion) return true;
        if (localVersion < incomingVersion) return false;
    }

    if (
        localClientRevision === 0 &&
        incomingClientRevision === 0 &&
        localVersion === 0 &&
        incomingVersion === 0 &&
        incomingUpdatedAt > 0
    ) {
        return localUpdatedAt >= incomingUpdatedAt;
    }

    return false;
};

export const isPersistenceSnapshotNewer = (nextSnapshot, prevSnapshot) => {
    if (!prevSnapshot) return true;
    return comparePersistenceCursorFreshness(nextSnapshot, prevSnapshot) > 0;
};
