export const BOARD_SYNC_PROTOCOL_VERSION = 2;

const toSafeInt = (value, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? Math.trunc(numeric) : fallback;
};

const toSafeString = (value, fallback = '') => (
    typeof value === 'string' ? value : fallback
);

const toDocIdSegment = (value, fallback = 'na') => {
    const normalized = toSafeString(value, '').trim();
    if (!normalized) return fallback;
    return normalized.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 96) || fallback;
};

export const normalizeSyncMutationMetadata = (value = {}) => ({
    syncProtocolVersion: Math.max(1, toSafeInt(value.syncProtocolVersion, BOARD_SYNC_PROTOCOL_VERSION)),
    mutationActorId: toSafeString(value.mutationActorId),
    mutationOpId: toSafeString(value.mutationOpId),
    mutationLamport: toSafeInt(value.mutationLamport),
    ackedClientRevision: toSafeInt(value.ackedClientRevision),
    ackedLamport: toSafeInt(value.ackedLamport),
    pendingOperationCount: toSafeInt(value.pendingOperationCount),
    mutationSequence: toSafeInt(value.mutationSequence),
    createdAtMs: toSafeInt(value.createdAtMs)
});

export const buildSyncMutationMetadata = (value = {}) => {
    const normalized = normalizeSyncMutationMetadata({
        ...value,
        syncProtocolVersion: BOARD_SYNC_PROTOCOL_VERSION
    });

    return {
        syncProtocolVersion: normalized.syncProtocolVersion,
        mutationActorId: normalized.mutationActorId,
        mutationOpId: normalized.mutationOpId,
        mutationLamport: normalized.mutationLamport,
        ackedClientRevision: normalized.ackedClientRevision,
        ackedLamport: normalized.ackedLamport,
        pendingOperationCount: normalized.pendingOperationCount,
        mutationSequence: normalized.mutationSequence,
        createdAtMs: normalized.createdAtMs
    };
};

export const buildPatchDocumentId = (patch = {}) => {
    const actorId = toDocIdSegment(patch.mutationActorId || patch.actorId, 'actor');
    const opId = toDocIdSegment(patch.mutationOpId || patch.opId, 'op');
    const lamport = String(toSafeInt(patch.mutationLamport || patch.lamport)).padStart(12, '0');
    const revision = String(toSafeInt(patch.toClientRevision)).padStart(12, '0');
    return `${revision}_${lamport}_${actorId}_${opId}`;
};

export const getMutationSequence = (value = {}) => (
    toSafeInt(value.mutationSequence || value.sequence)
);
