import {
    collection,
    doc,
    getDocs,
    serverTimestamp,
    setDoc,
    writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { normalizeBoardMetadataList, normalizeBoardTitleMeta } from '../boardTitle/metadata';
import { FIREBASE_SYNC_COLLECTIONS, isSampleBoardId } from './config';
import { toFirestoreMillis } from './firestoreCheckpointStore';
import { buildAuthoritativeRootPayload } from './firestoreRootDocument';

const DISPLAY_METADATA_KEYS = ['summary', 'backgroundImage', 'thumbnail'];

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
    listOrder: Number.isFinite(Number(board.listOrder)) ? Number(board.listOrder) : null,
    summary: normalizeOptionalString(board.summary),
    backgroundImage: normalizeOptionalString(board.backgroundImage),
    thumbnail: normalizeOptionalString(board.thumbnail)
});

const getBoardCollectionRef = (userId) => collection(
    db,
    FIREBASE_SYNC_COLLECTIONS.users,
    userId,
    FIREBASE_SYNC_COLLECTIONS.boards
);

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

const mergeFieldByPresence = (preferredBoard, fallbackBoard, key) => {
    if (hasOwn(preferredBoard, key)) {
        return preferredBoard[key];
    }
    return fallbackBoard?.[key];
};

export const loadRemoteBoardMetadataList = async (userId) => {
    if (!db || !userId) return [];
    const snapshot = await getDocs(getBoardCollectionRef(userId));
    const boards = normalizeBoardMetadataList(snapshot.docs.map((item) => item.data()));

    return boards.sort((a, b) => {
        const aOrder = Number.isFinite(Number(a.listOrder)) ? Number(a.listOrder) : Number.POSITIVE_INFINITY;
        const bOrder = Number.isFinite(Number(b.listOrder)) ? Number(b.listOrder) : Number.POSITIVE_INFINITY;
        if (aOrder !== bOrder) {
            return aOrder - bOrder;
        }
        return (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0);
    });
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
        mergedBoard[key] = mergeFieldByPresence(preferredBoard, fallbackBoard, key);
    });

    if (!hasOwn(preferredBoard, 'autoImageTriggeredAt') && hasOwn(fallbackBoard, 'autoImageTriggeredAt')) {
        mergedBoard.autoImageTriggeredAt = fallbackBoard.autoImageTriggeredAt;
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
    const merged = new Map();
    const orderedIds = [];

    normalizeBoardMetadataList(localBoards).forEach((board) => {
        if (!board?.id || isSampleBoardId(board.id)) return;
        merged.set(board.id, normalizeBoardTitleMeta(board));
        orderedIds.push(board.id);
    });

    normalizeBoardMetadataList(remoteBoards).forEach((board) => {
        if (!board?.id || isSampleBoardId(board.id)) return;
        const existing = merged.get(board.id);
        merged.set(board.id, mergeBoardMetadataRecord(existing, board));
        if (!existing) {
            orderedIds.push(board.id);
        }
    });

    return orderedIds
        .map((boardId, index) => {
            const board = merged.get(boardId);
            if (!board) return null;
            return normalizeBoardTitleMeta({
                ...board,
                listOrder: Number.isFinite(Number(board.listOrder)) ? Number(board.listOrder) : index
            });
        })
        .filter(Boolean);
};

export const syncBoardMetadataListToRemote = async (userId, boards = []) => {
    if (!db || !userId) return;
    const batch = writeBatch(db);
    normalizeBoardMetadataList(boards).forEach((board, index) => {
        if (!board?.id || isSampleBoardId(board.id)) return;
        batch.set(
            doc(getBoardCollectionRef(userId), board.id),
            buildAuthoritativeRootPayload({
                ...pickRemoteBoardMetadata({
                    ...board,
                    listOrder: index
                }),
                syncedAt: serverTimestamp()
            }),
            { merge: true }
        );
    });
    await batch.commit();
};
