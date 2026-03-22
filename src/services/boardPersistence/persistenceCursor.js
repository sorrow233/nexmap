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
        }
    }
    return 0;
};

export const toSafeClientRevision = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
};

export const buildPersistenceCursor = (boardData = {}) => ({
    clientRevision: toSafeClientRevision(boardData.clientRevision),
    updatedAt: toEpochMillis(boardData.updatedAt)
});

export const buildPersistenceVersionKey = (boardData = {}) => {
    const cursor = buildPersistenceCursor(boardData);
    return `${cursor.clientRevision}:${cursor.updatedAt}`;
};

export const isPersistenceSnapshotNewer = (nextSnapshot, prevSnapshot) => {
    if (!prevSnapshot) return true;

    const next = buildPersistenceCursor(nextSnapshot);
    const prev = buildPersistenceCursor(prevSnapshot);

    if (next.clientRevision !== prev.clientRevision) {
        return next.clientRevision > prev.clientRevision;
    }

    return next.updatedAt > prev.updatedAt;
};
