import {
    collection,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { normalizeBoardMetadataList, normalizeBoardTitleMeta } from '../boardTitle/metadata';
import { FIREBASE_SYNC_COLLECTIONS, isSampleBoardId } from './config';
import { toFirestoreMillis } from './firestoreCheckpointStore';
import { buildAuthoritativeRootPayload } from './firestoreRootDocument';

const pickRemoteBoardMetadata = (board = {}) => ({
    id: board.id,
    name: board.name || '',
    nameSource: board.nameSource || 'placeholder',
    autoTitle: board.autoTitle || '',
    autoTitleGeneratedAt: toFirestoreMillis(board.autoTitleGeneratedAt),
    manualTitleUpdatedAt: toFirestoreMillis(board.manualTitleUpdatedAt),
    createdAt: toFirestoreMillis(board.createdAt, Date.now()),
    updatedAt: toFirestoreMillis(board.updatedAt),
    lastAccessedAt: toFirestoreMillis(board.lastAccessedAt),
    cardCount: Number(board.cardCount) || 0,
    clientRevision: Number(board.clientRevision) || 0,
    deletedAt: toFirestoreMillis(board.deletedAt),
    autoImageTriggeredAt: toFirestoreMillis(board.autoImageTriggeredAt)
});

const getBoardCollectionRef = (userId) => collection(
    db,
    FIREBASE_SYNC_COLLECTIONS.users,
    userId,
    FIREBASE_SYNC_COLLECTIONS.boards
);

const choosePreferredBoardMetadata = (localBoard, remoteBoard) => {
    if (!localBoard) return normalizeBoardTitleMeta(remoteBoard);
    if (!remoteBoard) return normalizeBoardTitleMeta(localBoard);

    const localUpdated = Number(localBoard.updatedAt) || 0;
    const remoteUpdated = Number(remoteBoard.updatedAt) || 0;
    return normalizeBoardTitleMeta(remoteUpdated > localUpdated ? remoteBoard : localBoard);
};

export const loadRemoteBoardMetadataList = async (userId) => {
    if (!db || !userId) return [];
    const snapshot = await getDocs(query(getBoardCollectionRef(userId), orderBy('updatedAt', 'desc')));
    return normalizeBoardMetadataList(snapshot.docs.map((item) => item.data()));
};

export const mergeBoardMetadataLists = (localBoards = [], remoteBoards = []) => {
    const merged = new Map();
    normalizeBoardMetadataList(localBoards).forEach((board) => {
        if (!board?.id || isSampleBoardId(board.id)) return;
        merged.set(board.id, normalizeBoardTitleMeta(board));
    });
    normalizeBoardMetadataList(remoteBoards).forEach((board) => {
        if (!board?.id || isSampleBoardId(board.id)) return;
        merged.set(board.id, choosePreferredBoardMetadata(merged.get(board.id), board));
    });
    return Array.from(merged.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
};

export const syncBoardMetadataListToRemote = async (userId, boards = []) => {
    if (!db || !userId) return;
    const batch = writeBatch(db);
    normalizeBoardMetadataList(boards).forEach((board) => {
        if (!board?.id || isSampleBoardId(board.id)) return;
        batch.set(
            doc(getBoardCollectionRef(userId), board.id),
            buildAuthoritativeRootPayload({
                ...pickRemoteBoardMetadata(board),
                syncedAt: serverTimestamp()
            }),
            { merge: true }
        );
    });
    await batch.commit();
};
