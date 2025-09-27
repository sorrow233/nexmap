import { db } from './firebase';
import { collection, doc, onSnapshot, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { idbGet } from './db/indexedDB';
import { saveBoard, getRawBoardsList } from './boardService';
import { debugLog } from '../utils/debugLogger';
import { reconcileCards, removeUndefined } from './syncUtils';

const BOARD_PREFIX = 'mixboard_board_';
const BOARDS_LIST_KEY = 'mixboard_boards_list';

// Check if error is quota exhausted and trigger offline mode
const handleQuotaError = async (error, context) => {
    if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota exceeded')) {
        console.error(`[Sync] Quota exhausted during ${context}. Switching to offline mode.`);
        localStorage.setItem('mixboard_offline_mode', 'true');
        localStorage.setItem('mixboard_offline_auto', 'true'); // Mark as auto-triggered
        localStorage.setItem('mixboard_offline_time', Date.now().toString());
        try {
            const { useStore } = await import('../store/useStore');
            useStore.getState().triggerAutoOffline?.();
        } catch (e) {
            // Fallback handled above
        }
        return true;
    }
    return false;
};

// Check if offline mode is enabled
const isOfflineMode = () => {
    // If manually enabled, always respect it
    if (localStorage.getItem('mixboard_offline_mode') === 'true') {
        // Check if auto-triggered and enough time has passed (5 minutes)
        const isAuto = localStorage.getItem('mixboard_offline_auto') === 'true';
        const offlineTime = parseInt(localStorage.getItem('mixboard_offline_time') || '0', 10);
        const elapsed = Date.now() - offlineTime;

        // Auto-triggered offline mode expires after 5 minutes - allow retry
        if (isAuto && elapsed > 5 * 60 * 1000) {
            debugLog.sync('Auto-offline expired (5 min), allowing sync retry...');
            return false; // Allow one sync attempt
        }
        return true;
    }
    return false;
};

// Called when sync succeeds - clear auto-offline state
const onSyncSuccess = () => {
    if (localStorage.getItem('mixboard_offline_auto') === 'true') {
        debugLog.sync('Sync succeeded! Clearing auto-offline mode.');
        localStorage.removeItem('mixboard_offline_mode');
        localStorage.removeItem('mixboard_offline_auto');
        localStorage.removeItem('mixboard_offline_time');
        // Update store if available
        import('../store/useStore').then(({ useStore }) => {
            useStore.getState().setOfflineMode?.(false);
        }).catch(() => { });
    }
};

export const listenForBoardUpdates = (userId, onUpdate) => {
    if (!db || !userId) return () => { };

    try {
        debugLog.sync('Initializing Firestore listener for user boards');
        const boardsRef = collection(db, 'users', userId, 'boards');
        return onSnapshot(boardsRef, async (snapshot) => {
            const promises = [];
            let hasChanges = false;

            debugLog.sync(`Firestore snapshot received: ${snapshot.size} docs, ${snapshot.docChanges().length} changes`);

            for (const change of snapshot.docChanges()) {
                const boardData = change.doc.data();
                if (!boardData.id) continue;

                if (change.type === 'added' || change.type === 'modified') {
                    promises.push((async () => {
                        try {
                            const localData = await idbGet(BOARD_PREFIX + boardData.id);

                            // Get state for immediate comparison if it's the active board
                            const { useStore } = await import('../store/useStore');
                            const store = useStore.getState();
                            const currentActiveId = localStorage.getItem('mixboard_current_board_id');
                            const isCurrentBoard = boardData.id === currentActiveId;

                            const localCards = isCurrentBoard ? store.cards : (localData?.cards || []);
                            const localConnections = isCurrentBoard ? store.connections : (localData?.connections || []);
                            const localGroups = isCurrentBoard ? store.groups : (localData?.groups || []);
                            const localBoardPrompts = isCurrentBoard ? store.boardPrompts : (localData?.boardPrompts || []);
                            const localUpdatedAt = isCurrentBoard ? (store.lastSavedAt || localData?.updatedAt || 0) : (localData?.updatedAt || 0);

                            // Use syncVersion (logical clock) for conflict detection, fallback to updatedAt for backward compatibility
                            const localVersion = localData?.syncVersion || 0;
                            const cloudVersion = boardData.syncVersion || 0;

                            // If both have syncVersion, use it; otherwise fall back to timestamp comparison
                            if (localData && cloudVersion > 0 && localVersion > 0) {
                                if (localVersion >= cloudVersion) {
                                    debugLog.sync(`Skipping cloud update for ${boardData.id}: local syncVersion ${localVersion} >= cloud ${cloudVersion}`);
                                    return;
                                }
                            } else if (localData && boardData.updatedAt && localUpdatedAt >= boardData.updatedAt) {
                                // Backward compatibility: use timestamp if no syncVersion
                                debugLog.sync(`Skipping cloud update for ${boardData.id}: local version is up-to-date (timestamp fallback)`);
                                return;
                            }

                            debugLog.sync(`Merging cloud updates for board: ${boardData.id}`, { type: change.type });
                            hasChanges = true;

                            if (!localCards || localCards.length === 0) {
                                await saveBoard(boardData.id, {
                                    cards: boardData.cards || [],
                                    connections: boardData.connections || [],
                                    groups: boardData.groups || [],
                                    boardPrompts: boardData.boardPrompts || [],
                                    updatedAt: boardData.updatedAt
                                });
                                return;
                            }

                            // Robust Merge with Deletion Reconciliation
                            // Pass syncVersion for more reliable conflict detection
                            const finalCards = reconcileCards(
                                boardData.cards || [],
                                localCards,
                                localVersion,
                                cloudVersion,
                                localUpdatedAt,
                                boardData.updatedAt || 0
                            );

                            await saveBoard(boardData.id, {
                                cards: finalCards,
                                connections: boardData.connections || localConnections || [],
                                groups: boardData.groups !== undefined ? boardData.groups : (localGroups || []),
                                boardPrompts: boardData.boardPrompts !== undefined ? boardData.boardPrompts : (localBoardPrompts || []),
                                updatedAt: boardData.updatedAt
                            });
                        } catch (e) {
                            debugLog.error(`[Firebase Sync] Merge failed for board ${boardData.id}`, e);
                        }
                    })());
                } else if (change.type === 'removed') {
                    debugLog.sync(`Board removed in cloud: ${boardData.id}`);
                }
            }

            if (promises.length > 0) {
                await Promise.all(promises);
                if (hasChanges) debugLog.sync(`Hydration complete for ${promises.length} board(s)`);
            }

            // Sync Metadata List - FILTER OUT INVALID DOCS (no id or name)
            const allBoards = snapshot.docs.map(doc => doc.data()).filter(b => b && b.id);
            const metadataList = allBoards.map(b => {
                // CRITICAL FIX: Recover createdAt from board ID (timestamp-based) if missing
                // Board IDs are generated with Date.now().toString(), so we can extract the original creation time
                const idAsTimestamp = parseInt(b.id, 10);
                const recoveredCreatedAt = (!isNaN(idAsTimestamp) && idAsTimestamp > 1000000000000) ? idAsTimestamp : null;

                return {
                    id: b.id,
                    name: b.name || 'Untitled',
                    // Prefer explicit createdAt, then recover from ID, lastly use updatedAt (NOT Date.now())
                    createdAt: b.createdAt || recoveredCreatedAt || b.updatedAt || 0,
                    updatedAt: b.updatedAt || recoveredCreatedAt || 0,
                    lastAccessedAt: b.lastAccessedAt || b.updatedAt || recoveredCreatedAt || 0,
                    cardCount: b.cards?.length || 0,
                    deletedAt: b.deletedAt,
                    backgroundImage: b.backgroundImage
                };
            }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(metadataList));
            onUpdate(metadataList, snapshot.docChanges().map(c => c.doc.data().id));
        }, (error) => {
            // Check for quota error and trigger offline mode
            handleQuotaError(error, 'listenForBoardUpdates');
            debugLog.error("Firestore sync error:", error);
        });
    } catch (err) {
        debugLog.error("listenForBoardUpdates fatal error:", err);
        return () => { };
    }
};

// Content hash cache to avoid redundant writes
const lastSyncedContentHash = new Map();

export const saveBoardToCloud = async (userId, boardId, boardContent) => {
    if (!db || !userId) return;

    // Skip cloud sync in offline mode
    if (isOfflineMode()) {
        debugLog.sync(`Skipping cloud save for ${boardId}: offline mode enabled`);
        return;
    }

    // Generate content hash for dirty checking
    const contentHash = JSON.stringify({
        cards: (boardContent.cards || []).map(c => ({
            id: c.id,
            x: c.x,
            y: c.y,
            type: c.type,
            data: c.data
        })),
        connections: boardContent.connections || [],
        groups: boardContent.groups || [],
        boardPrompts: boardContent.boardPrompts || []
    });

    const cacheKey = `${userId}:${boardId}`;
    if (lastSyncedContentHash.get(cacheKey) === contentHash) {
        debugLog.sync(`Skipping cloud save for ${boardId}: content unchanged`);
        return;
    }

    try {
        debugLog.sync(`Saving board ${boardId} to cloud...`);
        const list = getRawBoardsList();
        const meta = list.find(b => b.id === boardId);

        if (!meta) {
            debugLog.error(`Metadata not found for board ${boardId}, cloud save aborted.`);
            return;
        }



        const cleanedContent = {
            cards: (boardContent.cards || []).map(card => ({
                ...card,
                data: {
                    ...card.data,
                    messages: (card.data?.messages || []).map(msg => {
                        if (Array.isArray(msg.content)) {
                            return {
                                ...msg,
                                content: msg.content.map(part => {
                                    if (part.type === 'image' && part.source) {
                                        if (part.source.s3Url) {
                                            return {
                                                type: 'image',
                                                source: {
                                                    type: 'url',
                                                    media_type: part.source.media_type,
                                                    url: part.source.s3Url
                                                }
                                            };
                                        }
                                        if (part.source.type === 'base64' && !part.source.s3Url) {
                                            return null;
                                        }
                                    }
                                    return part;
                                }).filter(Boolean)
                            };
                        }
                        return msg;
                    })
                }
            })),
            connections: boardContent.connections || [],
            groups: boardContent.groups || [],
            boardPrompts: boardContent.boardPrompts || []
        };

        // Increment syncVersion (logical clock) for conflict resolution
        const newSyncVersion = (meta.syncVersion || 0) + 1;

        const fullBoard = removeUndefined({
            ...meta,
            ...cleanedContent,
            updatedAt: Date.now(), // Keep for UI display
            syncVersion: newSyncVersion // Logical clock for conflict detection
        });

        // Use serverTimestamp for authoritative server time
        const boardRef = doc(db, 'users', userId, 'boards', boardId);
        await setDoc(boardRef, { ...fullBoard, serverUpdatedAt: serverTimestamp() });

        // Cache successful sync
        lastSyncedContentHash.set(cacheKey, contentHash);
        onSyncSuccess(); // Clear auto-offline if was triggered
        debugLog.sync(`Board ${boardId} cloud save successful (syncVersion: ${newSyncVersion})`);
    } catch (e) {
        await handleQuotaError(e, 'saveBoardToCloud');
        debugLog.error(`Cloud save failed for board ${boardId}`, e);
    }
};

export const updateBoardMetadataInCloud = async (userId, boardId, metadata) => {
    if (!db || !userId || isOfflineMode()) return;
    try {
        debugLog.sync(`Updating cloud metadata for board ${boardId}`, metadata);
        const boardRef = doc(db, 'users', userId, 'boards', boardId);
        await setDoc(boardRef, metadata, { merge: true });
    } catch (e) {
        await handleQuotaError(e, 'updateBoardMetadataInCloud');
        debugLog.error(`Cloud metadata update failed for board ${boardId}`, e);
    }
};

export const deleteBoardFromCloud = async (userId, boardId) => {
    if (!db || !userId) return;
    try {
        debugLog.sync(`Deleting board ${boardId} from cloud`);
        const boardRef = doc(db, 'users', userId, 'boards', boardId);
        await deleteDoc(boardRef);
    } catch (e) {
        debugLog.error(`Cloud delete failed for board ${boardId}`, e);
    }
};

export const saveUserSettings = async (userId, settings) => {
    if (!db || !userId || isOfflineMode()) return;
    try {
        debugLog.auth('Saving user settings to cloud...', settings);
        const configRef = doc(db, 'users', userId, 'settings', 'config');
        await setDoc(configRef, settings);
    } catch (e) {
        await handleQuotaError(e, 'saveUserSettings');
        debugLog.error("Save settings failed", e);
    }
};

export const updateUserSettings = async (userId, updates) => {
    if (!db || !userId || isOfflineMode()) return;
    try {
        debugLog.auth('Updating user settings in cloud...', updates);
        const configRef = doc(db, 'users', userId, 'settings', 'config');
        await setDoc(configRef, updates, { merge: true });
    } catch (e) {
        await handleQuotaError(e, 'updateUserSettings');
        debugLog.error("Update settings failed", e);
    }
};

export const loadUserSettings = async (userId) => {
    if (!db || !userId) return null;
    try {
        debugLog.auth('Loading user settings from cloud');
        const configRef = doc(db, 'users', userId, 'settings', 'config');
        const docSnap = await getDoc(configRef);
        const data = docSnap.exists() ? docSnap.data() : null;
        debugLog.auth(data ? 'Settings loaded' : 'No cloud settings found');
        return data;
    } catch (e) {
        debugLog.error("Load settings failed", e);
        return null;
    }
};

// --- Favorites Sync ---

export const listenForFavoriteUpdates = (userId, onUpdate) => {
    if (!db || !userId) return () => { };

    try {
        debugLog.sync('Initializing Firestore listener for user favorites');
        const favoritesRef = collection(db, 'users', userId, 'favorites');
        return onSnapshot(favoritesRef, (snapshot) => {
            const changes = [];

            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();
                // Ensure ID is present
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
            handleQuotaError(error, 'listenForFavoriteUpdates');
            debugLog.error("Firestore favorites sync error:", error);
        });
    } catch (err) {
        debugLog.error("listenForFavoriteUpdates error:", err);
        return () => { };
    }
};

export const saveFavoriteToCloud = async (userId, favorite) => {
    if (!db || !userId || !favorite || !favorite.id) return;
    try {
        // debugLog.sync(`Saving favorite ${favorite.id} to cloud`);
        const favRef = doc(db, 'users', userId, 'favorites', favorite.id);
        await setDoc(favRef, { ...favorite, updatedAt: serverTimestamp() });
    } catch (e) {
        debugLog.error(`Cloud save failed for favorite ${favorite.id}`, e);
    }
};

export const deleteFavoriteFromCloud = async (userId, favoriteId) => {
    if (!db || !userId) return;
    try {
        debugLog.sync(`Deleting favorite ${favoriteId} from cloud`);
        const favRef = doc(db, 'users', userId, 'favorites', favoriteId);
        await deleteDoc(favRef);
    } catch (e) {
        debugLog.error(`Cloud delete failed for favorite ${favoriteId}`, e);
    }
};
