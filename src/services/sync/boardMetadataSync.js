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

const pickRemoteBoardMetadata = (board = {}) => ({
    id: board.id,
    name: board.name || '',
    nameSource: board.nameSource || 'placeholder',
    autoTitle: board.autoTitle || '',
    autoTitleGeneratedAt: Number(board.autoTitleGeneratedAt) || 0,
    manualTitleUpdatedAt: Number(board.manualTitleUpdatedAt) || 0,
    createdAt: Number(board.createdAt) || Date.now(),
    updatedAt: Number(board.updatedAt) || 0,
    lastAccessedAt: Number(board.lastAccessedAt) || 0,
    cardCount: Number(board.cardCount) || 0,
    clientRevision: Number(board.clientRevision) || 0,
    deletedAt: Number(board.deletedAt) || 0,
    autoImageTriggeredAt: Number(board.autoImageTriggeredAt) || 0
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
            {
                ...pickRemoteBoardMetadata(board),
                syncedAt: serverTimestamp()
            },
            { merge: true }
        );
    });
    await batch.commit();
};
