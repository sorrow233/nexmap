import { collection, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { FIREBASE_SYNC_COLLECTIONS } from './config';

export const createBoardRootRef = (userId, boardId) => doc(
    db,
    FIREBASE_SYNC_COLLECTIONS.users,
    userId,
    FIREBASE_SYNC_COLLECTIONS.boards,
    boardId
);

export const createUpdatesCollectionRef = (userId, boardId) => collection(
    createBoardRootRef(userId, boardId),
    FIREBASE_SYNC_COLLECTIONS.updates
);

export const createCheckpointSetRef = (userId, boardId, checkpointId) => doc(
    createBoardRootRef(userId, boardId),
    FIREBASE_SYNC_COLLECTIONS.snapshots,
    checkpointId
);

export const createCheckpointSetsCollectionRef = (userId, boardId) => collection(
    createBoardRootRef(userId, boardId),
    FIREBASE_SYNC_COLLECTIONS.snapshots
);

export const createCheckpointPartsCollectionRef = (userId, boardId, checkpointId) => collection(
    createCheckpointSetRef(userId, boardId, checkpointId),
    'parts'
);
