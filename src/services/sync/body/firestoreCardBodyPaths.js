import { collection, doc } from 'firebase/firestore';
import { FIREBASE_SYNC_COLLECTIONS } from '../config';
import { createBoardRootRef } from '../firestoreSyncPaths';

export const createCardBodiesCollectionRef = (userId, boardId) => collection(
    createBoardRootRef(userId, boardId),
    FIREBASE_SYNC_COLLECTIONS.cardBodies
);

export const createCardBodyRef = (userId, boardId, cardId) => doc(
    createCardBodiesCollectionRef(userId, boardId),
    cardId
);
