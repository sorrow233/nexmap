import {
    collection,
    doc,
    getDocs,
    serverTimestamp,
    writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import {
    compareBoardsByGalleryOrder,
    normalizeBoardMetadataList,
    normalizeBoardTitleMeta
} from '../boardTitle/metadata';
import { normalizeBoardSummary } from '../boardTitle/displayMetadata';
import { FIREBASE_SYNC_COLLECTIONS, isSampleBoardId } from './config';
import { toFirestoreMillis } from './firestoreCheckpointStore';
import { buildAuthoritativeRootPayload } from './firestoreRootDocument';

const DISPLAY_METADATA_KEYS = ['summary', 'backgroundImage', 'thumbnail'];
const FIRESTORE_WRITE_BATCH_LIMIT = 450;
const METADATA_RETRY_DELAYS_MS = [0, 300, 900];
const metadataSyncSignatureCache = new Map();

const normalizeOptionalString = (value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return typeof value === 'string' ? value : String(value);
};

const normalizeOptionalMillis = (value, { allowNull = false } = {}) => {
    if (value === undefined) return undefined;
    if (value === null) return allowNull ? null : undefined;

    const normalized = toFirestoreMillis(value, Number.NaN);
    if (!Number.isFinite(normalized) || normalized <= 0) {
        return allowNull ? null : undefined;
    }

    return normalized;
};

const omitUndefinedFields = (payload = {}) => Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
);

const getUserMetadataSignatureCache = (userId) => {
    if (!metadataSyncSignatureCache.has(userId)) {
        metadataSyncSignatureCache.set(userId, new Map());
    }
    return metadataSyncSignatureCache.get(userId);
};

const sleep = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});

const withRetry = async (operation) => {
    let lastError = null;

    for (let attempt = 0; attempt < METADATA_RETRY_DELAYS_MS.length; attempt += 1) {
        if (METADATA_RETRY_DELAYS_MS[attempt] > 0) {
            await sleep(METADATA_RETRY_DELAYS_MS[attempt]);
        }

        try {
            return await operation();
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError;
};

const pickRemoteBoardMetadata = (board = {}) => omitUndefinedFields({
    id: board.id,
    name: board.name || '',
    nameSource: board.nameSource || 'placeholder',
    autoTitle: board.autoTitle || '',
    autoTitleGeneratedAt: normalizeOptionalMillis(board.autoTitleGeneratedAt),
    manualTitleUpdatedAt: normalizeOptionalMillis(board.manualTitleUpdatedAt),
    createdAt: normalizeOptionalMillis(board.createdAt),
    updatedAt: normalizeOptionalMillis(board.updatedAt),
    lastAccessedAt: normalizeOptionalMillis(board.lastAccessedAt),
    cardCount: Number(board.cardCount) || 0,
    clientRevision: Number(board.clientRevision) || 0,
    deletedAt: normalizeOptionalMillis(board.deletedAt, { allowNull: true }),
    autoImageTriggeredAt: normalizeOptionalMillis(board.autoImageTriggeredAt),
    autoSummaryTriggeredAt: normalizeOptionalMillis(board.autoSummaryTriggeredAt),
    autoImageCompletedAt: normalizeOptionalMillis(board.autoImageCompletedAt),
    autoSummaryCompletedAt: normalizeOptionalMillis(board.autoSummaryCompletedAt),
    listOrder: Number.isFinite(Number(board.listOrder)) ? Number(board.listOrder) : null,
    summary: normalizeBoardSummary(board.summary),
    backgroundImage: normalizeOptionalString(board.backgroundImage),
    thumbnail: normalizeOptionalString(board.thumbnail)
});

const buildRemoteBoardMetadataSignature = (board = {}) => {
    try {
        return JSON.stringify(pickRemoteBoardMetadata(board));
    } catch (error) {
        console.warn('[FirebaseSync] Failed to build board metadata signature:', error);
        return String(board?.id || '');
    }
};

const getBoardCollectionRef = (userId) => collection(
    db,
    FIREBASE_SYNC_COLLECTIONS.users,
    userId,
    FIREBASE_SYNC_COLLECTIONS.boards
);

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

const hasUsableDisplayMetadataValue = (key, value) => {
    if (key === 'summary') {
        return Boolean(normalizeBoardSummary(value));
    }
    return typeof value === 'string'
        ? value.trim().length > 0
        : Boolean(value);
};

const mergeFieldByPresence = (preferredBoard, fallbackBoard, key) => {
    if (hasOwn(preferredBoard, key)) {
        return preferredBoard[key];
    }
    return fallbackBoard?.[key];
};

export const loadRemoteBoardMetadataList = async (userId) => {
    if (!db || !userId) return [];
    const snapshot = await withRetry(() => getDocs(getBoardCollectionRef(userId)));
    const boards = normalizeBoardMetadataList(snapshot.docs.map((item) => item.data()));
    const cache = getUserMetadataSignatureCache(userId);

    boards.forEach((board) => {
        cache.set(board.id, buildRemoteBoardMetadataSignature(board));
    });

    return boards.sort(compareBoardsByGalleryOrder);
};

const mergeBoardMetadataRecord = (localBoard, remoteBoard) => {
    if (!localBoard) return normalizeBoardTitleMeta(remoteBoard);
    if (!remoteBoard) return normalizeBoardTitleMeta(localBoard);

    const localUpdated = Number(localBoard.updatedAt) || 0;
    const remoteUpdated = Number(remoteBoard.updatedAt) || 0;
    const localCreated = Number(localBoard.createdAt) || 0;
    const remoteCreated = Number(remoteBoard.createdAt) || 0;
    const localLastAccessed = Number(localBoard.lastAccessedAt) || 0;
    const remoteLastAccessed = Number(remoteBoard.lastAccessedAt) || 0;
    const localRevision = Number(localBoard.clientRevision) || 0;
    const remoteRevision = Number(remoteBoard.clientRevision) || 0;
    const preferredBoard = remoteUpdated > localUpdated ? remoteBoard : localBoard;
    const fallbackBoard = preferredBoard === remoteBoard ? localBoard : remoteBoard;

    const mergedBoard = {
        ...fallbackBoard,
        ...preferredBoard
    };

    DISPLAY_METADATA_KEYS.forEach((key) => {
        const preferredValue = preferredBoard?.[key];
        const fallbackValue = fallbackBoard?.[key];

        if (hasUsableDisplayMetadataValue(key, preferredValue)) {
            mergedBoard[key] = preferredValue;
            return;
        }

        if (hasUsableDisplayMetadataValue(key, fallbackValue)) {
            mergedBoard[key] = fallbackValue;
            return;
        }

        mergedBoard[key] = mergeFieldByPresence(preferredBoard, fallbackBoard, key);
    });

    if (!hasOwn(preferredBoard, 'autoImageTriggeredAt') && hasOwn(fallbackBoard, 'autoImageTriggeredAt')) {
        mergedBoard.autoImageTriggeredAt = fallbackBoard.autoImageTriggeredAt;
    }

    if (!hasOwn(preferredBoard, 'autoSummaryTriggeredAt') && hasOwn(fallbackBoard, 'autoSummaryTriggeredAt')) {
        mergedBoard.autoSummaryTriggeredAt = fallbackBoard.autoSummaryTriggeredAt;
    }

    if (!hasOwn(preferredBoard, 'autoImageCompletedAt') && hasOwn(fallbackBoard, 'autoImageCompletedAt')) {
        mergedBoard.autoImageCompletedAt = fallbackBoard.autoImageCompletedAt;
    }

    if (!hasOwn(preferredBoard, 'autoSummaryCompletedAt') && hasOwn(fallbackBoard, 'autoSummaryCompletedAt')) {
        mergedBoard.autoSummaryCompletedAt = fallbackBoard.autoSummaryCompletedAt;
    }

    if (!hasOwn(preferredBoard, 'listOrder') && hasOwn(fallbackBoard, 'listOrder')) {
        mergedBoard.listOrder = fallbackBoard.listOrder;
    }

    mergedBoard.createdAt = localCreated && remoteCreated
        ? Math.min(localCreated, remoteCreated)
        : (localCreated || remoteCreated || undefined);

    if (remoteRevision > localRevision) {
        mergedBoard.updatedAt = remoteUpdated || localUpdated || undefined;
    } else {
        mergedBoard.updatedAt = localUpdated || remoteUpdated || undefined;
    }

    mergedBoard.lastAccessedAt = Math.max(localLastAccessed, remoteLastAccessed) || undefined;

    return normalizeBoardTitleMeta(mergedBoard);
};

export const mergeBoardMetadataLists = (localBoards = [], remoteBoards = []) => {
    const localOrderedBoards = normalizeBoardMetadataList(localBoards)
        .filter((board) => board?.id && !isSampleBoardId(board.id));
    const remoteOrderedBoards = normalizeBoardMetadataList(remoteBoards)
        .filter((board) => board?.id && !isSampleBoardId(board.id));
    const localById = new Map(localOrderedBoards.map((board) => [board.id, normalizeBoardTitleMeta(board)]));
    const merged = new Map();
    const orderedIds = [];

    remoteOrderedBoards.forEach((remoteBoard) => {
        const localBoard = localById.get(remoteBoard.id);
        merged.set(remoteBoard.id, mergeBoardMetadataRecord(localBoard, remoteBoard));
        orderedIds.push(remoteBoard.id);
        localById.delete(remoteBoard.id);
    });

    localOrderedBoards.forEach((localBoard) => {
        if (!localById.has(localBoard.id)) return;
        merged.set(localBoard.id, normalizeBoardTitleMeta(localBoard));
        orderedIds.push(localBoard.id);
    });

    return orderedIds
        .map((boardId, index) => {
            const board = merged.get(boardId);
            if (!board) return null;
            return normalizeBoardTitleMeta({
                ...board,
                listOrder: index
            });
        })
        .filter(Boolean)
        .sort(compareBoardsByGalleryOrder)
        .map((board, index) => normalizeBoardTitleMeta({
            ...board,
            listOrder: index
        }));
};

export const syncBoardMetadataListToRemote = async (userId, boards = []) => {
    if (!db || !userId) return;
    const syncedBoards = normalizeBoardMetadataList(boards)
        .filter((board) => board?.id && !isSampleBoardId(board.id));
    syncedBoards.sort(compareBoardsByGalleryOrder);
    const cache = getUserMetadataSignatureCache(userId);
    const changedBoards = syncedBoards.flatMap((board, index) => {
        const normalizedBoard = {
            ...board,
            listOrder: index
        };
        const nextSignature = buildRemoteBoardMetadataSignature(normalizedBoard);
        const previousSignature = cache.get(board.id);
        if (previousSignature === nextSignature) {
            return [];
        }

        return [{
            board,
            listOrder: index,
            signature: nextSignature
        }];
    });

    if (changedBoards.length === 0) {
        return;
    }

    for (let offset = 0; offset < changedBoards.length; offset += FIRESTORE_WRITE_BATCH_LIMIT) {
        const currentSlice = changedBoards.slice(offset, offset + FIRESTORE_WRITE_BATCH_LIMIT);
        await withRetry(async () => {
            const batch = writeBatch(db);

            currentSlice.forEach(({ board, listOrder }) => {
                batch.set(
                    doc(getBoardCollectionRef(userId), board.id),
                    buildAuthoritativeRootPayload({
                        ...pickRemoteBoardMetadata({
                            ...board,
                            listOrder
                        }),
                        syncedAt: serverTimestamp()
                    }),
                    { merge: true }
                );
            });

            await batch.commit();
            currentSlice.forEach(({ board, signature }) => {
                cache.set(board.id, signature);
            });
        });
    }
};
