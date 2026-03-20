import { idbDel, idbGet, idbGetEntriesByPrefix, idbSet } from '../db/indexedDB.js';
import { applyBoardOperationEnvelope, buildBoardOperationEnvelope } from './boardOperationEnvelope.js';

const BOARD_OPLOG_ENTRY_PREFIX = 'mixboard_local_first_op_';
const BOARD_OPLOG_META_PREFIX = 'mixboard_local_first_meta_';
const LOCAL_FIRST_ACTOR_KEY = 'mixboard_local_first_actor_id';
const ACKED_KEEP_RECENT = 24;
const operationLogQueues = new Map();

const toSafeNumber = (value, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
};

const getMetaKey = (boardId) => `${BOARD_OPLOG_META_PREFIX}${boardId}`;
const getEntryPrefix = (boardId) => `${BOARD_OPLOG_ENTRY_PREFIX}${boardId}_`;
const getEntryKey = (boardId, toClientRevision, lamport, opId) => (
    `${getEntryPrefix(boardId)}${String(toClientRevision).padStart(12, '0')}_${String(lamport).padStart(12, '0')}_${opId}`
);

const sortEntries = (entries = []) => entries.sort((left, right) => {
    const revisionDelta = toSafeNumber(left?.toClientRevision) - toSafeNumber(right?.toClientRevision);
    if (revisionDelta !== 0) return revisionDelta;
    const lamportDelta = toSafeNumber(left?.lamport) - toSafeNumber(right?.lamport);
    if (lamportDelta !== 0) return lamportDelta;
    return toSafeNumber(left?.createdAt) - toSafeNumber(right?.createdAt);
});

const normalizeMeta = (boardId, meta = {}) => ({
    boardId,
    actorId: typeof meta.actorId === 'string' ? meta.actorId : getLocalActorId(),
    lastLamport: toSafeNumber(meta.lastLamport),
    lastOpId: typeof meta.lastOpId === 'string' ? meta.lastOpId : '',
    latestClientRevision: toSafeNumber(meta.latestClientRevision),
    ackedRevision: toSafeNumber(meta.ackedRevision),
    ackedLamport: toSafeNumber(meta.ackedLamport),
    ackedOpId: typeof meta.ackedOpId === 'string' ? meta.ackedOpId : '',
    pendingOperationCount: toSafeNumber(meta.pendingOperationCount),
    latestCreatedAt: toSafeNumber(meta.latestCreatedAt),
    compactedAt: toSafeNumber(meta.compactedAt)
});

const withBoardOperationQueue = (boardId, task) => {
    const queueKey = boardId || '__global__';
    const previousTask = operationLogQueues.get(queueKey) || Promise.resolve();
    const nextTask = previousTask
        .catch(() => undefined)
        .then(task)
        .finally(() => {
            if (operationLogQueues.get(queueKey) === nextTask) {
                operationLogQueues.delete(queueKey);
            }
        });

    operationLogQueues.set(queueKey, nextTask);
    return nextTask;
};

export const getLocalActorId = () => {
    try {
        const existing = localStorage.getItem(LOCAL_FIRST_ACTOR_KEY);
        if (existing) return existing;
        const nextActorId = typeof crypto?.randomUUID === 'function'
            ? crypto.randomUUID()
            : `actor_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem(LOCAL_FIRST_ACTOR_KEY, nextActorId);
        return nextActorId;
    } catch {
        return `actor_${Date.now()}`;
    }
};

export const readBoardOperationLogMeta = async (boardId) => {
    if (!boardId) return normalizeMeta('', {});
    const storedMeta = await idbGet(getMetaKey(boardId));
    return normalizeMeta(boardId, storedMeta || {});
};

const writeBoardOperationLogMeta = async (boardId, meta) => {
    const normalized = normalizeMeta(boardId, meta);
    await idbSet(getMetaKey(boardId), normalized);
    return normalized;
};

export const listBoardOperationEnvelopes = async (boardId, options = {}) => {
    if (!boardId) return [];
    const entries = await idbGetEntriesByPrefix(getEntryPrefix(boardId));
    const minRevision = toSafeNumber(options.afterClientRevision);
    const includeAcked = options.includeAcked === true;

    return sortEntries(entries.map(({ value }) => value).filter((entry) => {
        if (!entry || typeof entry !== 'object') return false;
        if (toSafeNumber(entry.toClientRevision) <= minRevision) return false;
        if (!includeAcked && toSafeNumber(entry.ackedAt) > 0) return false;
        return true;
    }));
};

export const listPendingBoardOperationEnvelopes = async (boardId, options = {}) => (
    listBoardOperationEnvelopes(boardId, {
        ...options,
        includeAcked: false
    })
);

export const appendBoardOperationEnvelope = async ({
    boardId,
    baseBoard,
    nextBoard,
    fromClientRevision = 0,
    toClientRevision = 0
}) => {
    if (!boardId) {
        return { envelope: null, meta: normalizeMeta('', {}) };
    }

    return withBoardOperationQueue(boardId, async () => {
        const previousMeta = await readBoardOperationLogMeta(boardId);
        const actorId = previousMeta.actorId || getLocalActorId();
        const lamport = Math.max(previousMeta.lastLamport, toSafeNumber(fromClientRevision), toSafeNumber(toClientRevision)) + 1;
        const opId = `${actorId}:${lamport}:${toSafeNumber(toClientRevision)}`;

        const envelope = buildBoardOperationEnvelope({
            boardId,
            actorId,
            opId,
            lamport,
            createdAt: Date.now(),
            baseBoard,
            nextBoard,
            fromClientRevision,
            toClientRevision
        });

        if (!envelope) {
            return { envelope: null, meta: previousMeta };
        }

        await idbSet(getEntryKey(boardId, envelope.toClientRevision, lamport, opId), envelope);

        const nextMeta = await writeBoardOperationLogMeta(boardId, {
            ...previousMeta,
            actorId,
            lastLamport: lamport,
            lastOpId: opId,
            latestClientRevision: Math.max(previousMeta.latestClientRevision, envelope.toClientRevision),
            pendingOperationCount: previousMeta.pendingOperationCount + 1,
            latestCreatedAt: Math.max(previousMeta.latestCreatedAt, envelope.createdAt)
        });

        return { envelope, meta: nextMeta };
    });
};

export const markBoardOperationsAcked = async (boardId, ackedRevision) => {
    if (!boardId) return normalizeMeta('', {});

    return withBoardOperationQueue(boardId, async () => {
        const targetRevision = toSafeNumber(ackedRevision);
        const entries = await listBoardOperationEnvelopes(boardId, { afterClientRevision: 0, includeAcked: true });
        let pendingOperationCount = 0;
        const ackedAt = Date.now();
        let latestAckedEntry = null;

        await Promise.all(entries.map(async (entry) => {
            if (!entry || typeof entry !== 'object') return;
            const isAckable = toSafeNumber(entry.toClientRevision) <= targetRevision;
            const nextEntry = isAckable && toSafeNumber(entry.ackedAt) === 0
                ? { ...entry, ackedAt }
                : entry;

            if (toSafeNumber(nextEntry.ackedAt) > 0) {
                if (
                    !latestAckedEntry ||
                    toSafeNumber(nextEntry.toClientRevision) > toSafeNumber(latestAckedEntry.toClientRevision) ||
                    (
                        toSafeNumber(nextEntry.toClientRevision) === toSafeNumber(latestAckedEntry.toClientRevision) &&
                        toSafeNumber(nextEntry.lamport) > toSafeNumber(latestAckedEntry.lamport)
                    )
                ) {
                    latestAckedEntry = nextEntry;
                }
            }

            if (toSafeNumber(nextEntry.ackedAt) === 0) {
                pendingOperationCount += 1;
            }

            if (nextEntry !== entry) {
                await idbSet(getEntryKey(boardId, nextEntry.toClientRevision, nextEntry.lamport, nextEntry.opId), nextEntry);
            }
        }));

        const previousMeta = await readBoardOperationLogMeta(boardId);
        return writeBoardOperationLogMeta(boardId, {
            ...previousMeta,
            ackedRevision: Math.max(previousMeta.ackedRevision, targetRevision),
            ackedLamport: Math.max(previousMeta.ackedLamport, toSafeNumber(latestAckedEntry?.lamport)),
            ackedOpId: latestAckedEntry?.opId || previousMeta.ackedOpId || '',
            pendingOperationCount
        });
    });
};

export const pruneBoardOperationLog = async (boardId, options = {}) => {
    if (!boardId) return normalizeMeta('', {});
    return withBoardOperationQueue(boardId, async () => {
        const keepRecent = Math.max(0, toSafeNumber(options.keepRecent, ACKED_KEEP_RECENT));
        const entries = await listBoardOperationEnvelopes(boardId, { afterClientRevision: 0, includeAcked: true });
        const ackedEntries = entries.filter((entry) => toSafeNumber(entry.ackedAt) > 0);
        const staleAckedEntries = ackedEntries.slice(0, Math.max(0, ackedEntries.length - keepRecent));

        await Promise.all(staleAckedEntries.map((entry) => (
            idbDel(getEntryKey(boardId, entry.toClientRevision, entry.lamport, entry.opId))
        )));

        const latestEntry = entries[entries.length - 1];
        const latestClientRevision = latestEntry ? toSafeNumber(latestEntry.toClientRevision) : 0;
        const latestCreatedAt = latestEntry ? toSafeNumber(latestEntry.createdAt) : 0;
        const pendingOperationCount = entries.filter((entry) => toSafeNumber(entry.ackedAt) === 0).length;
        const previousMeta = await readBoardOperationLogMeta(boardId);

        return writeBoardOperationLogMeta(boardId, {
            ...previousMeta,
            latestClientRevision,
            latestCreatedAt,
            pendingOperationCount,
            compactedAt: Date.now()
        });
    });
};

export const rehydrateBoardFromOperationLog = async (boardId, snapshot) => {
    if (!boardId) {
        return {
            board: snapshot,
            recovered: false,
            appliedEnvelopes: [],
            meta: normalizeMeta('', {})
        };
    }

    const baseSnapshot = snapshot || {
        cards: [],
        connections: [],
        groups: [],
        boardPrompts: [],
        boardInstructionSettings: undefined,
        clientRevision: 0
    };
    const afterClientRevision = toSafeNumber(baseSnapshot?.clientRevision);
    const appliedEnvelopes = await listBoardOperationEnvelopes(boardId, {
        afterClientRevision,
        includeAcked: true
    });
    if (appliedEnvelopes.length === 0) {
        return {
            board: baseSnapshot,
            recovered: false,
            appliedEnvelopes: [],
            meta: await readBoardOperationLogMeta(boardId)
        };
    }

    const recoveredBoard = appliedEnvelopes.reduce((draft, envelope) => {
        const nextBoard = applyBoardOperationEnvelope(draft, envelope);
        return {
            ...draft,
            ...nextBoard,
            updatedAt: Math.max(toSafeNumber(draft?.updatedAt), toSafeNumber(envelope.createdAt)),
            clientRevision: Math.max(toSafeNumber(draft?.clientRevision), toSafeNumber(envelope.toClientRevision))
        };
    }, baseSnapshot);

    return {
        board: recoveredBoard,
        recovered: true,
        appliedEnvelopes,
        meta: await readBoardOperationLogMeta(boardId)
    };
};
