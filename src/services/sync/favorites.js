import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { debugLog } from '../../utils/debugLogger';
import { db, handleSyncError } from './core';

export const listenForFavoriteUpdates = (userId, onUpdate) => {
    if (!db || !userId) return () => { };

    try {
        debugLog.sync('Initializing Firestore listener for user favorites');
        const favoritesRef = collection(db, 'users', userId, 'favorites');

        return onSnapshot(favoritesRef, (snapshot) => {
            const changes = [];

            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();
                if (!data.id) return;

                if (change.type === 'added' || change.type === 'modified') {
                    changes.push(data);
                } else if (change.type === 'removed') {
                    changes.push({ id: data.id, _deleted: true });
                }
            });

            if (changes.length > 0) {
                debugLog.sync(`Received ${changes.length} favorite updates from cloud`);
                onUpdate(changes);
            }
        }, (error) => {
            handleSyncError('Firestore favorites sync error:', error);
        });
    } catch (error) {
        debugLog.error('listenForFavoriteUpdates error:', error);
        return () => { };
    }
};

export const saveFavoriteToCloud = async (userId, favorite) => {
    if (!db || !userId || !favorite?.id) return;

    try {
        const favoriteRef = doc(db, 'users', userId, 'favorites', favorite.id);
        await setDoc(favoriteRef, { ...favorite, updatedAt: serverTimestamp() });
    } catch (error) {
        debugLog.error(`Cloud save failed for favorite ${favorite.id}`, error);
    }
};

export const deleteFavoriteFromCloud = async (userId, favoriteId) => {
    if (!db || !userId) return;

    try {
        debugLog.sync(`Deleting favorite ${favoriteId} from cloud`);
        const favoriteRef = doc(db, 'users', userId, 'favorites', favoriteId);
        await deleteDoc(favoriteRef);
    } catch (error) {
        debugLog.error(`Cloud delete failed for favorite ${favoriteId}`, error);
    }
};
