import { db } from './firebase';
import { collection, doc, onSnapshot, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { idbGet } from './db/indexedDB';
import { saveBoard, getRawBoardsList } from './boardService';
import { debugLog } from '../utils/debugLogger';
import { reconcileCards, removeUndefined } from './syncUtils';

const BOARD_PREFIX = 'mixboard_board_';
const BOARDS_LIST_KEY = 'mixboard_boards_list';

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

                            if (localData && boardData.updatedAt && localUpdatedAt >= boardData.updatedAt) {
                                debugLog.sync(`Skipping cloud update for ${boardData.id}: local version is up-to-date`);
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
                            const finalCards = reconcileCards(
                                boardData.cards || [],
                                localCards,
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
            const metadataList = allBoards.map(b => ({
                id: b.id,
                name: b.name || 'Untitled',
                createdAt: b.createdAt || Date.now(),
                updatedAt: b.updatedAt || Date.now(),
                lastAccessedAt: b.lastAccessedAt || b.updatedAt || Date.now(),
                cardCount: b.cards?.length || 0,
                deletedAt: b.deletedAt,
                backgroundImage: b.backgroundImage
            })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(metadataList));
            onUpdate(metadataList, snapshot.docChanges().map(c => c.doc.data().id));
        }, (error) => {
            debugLog.error("Firestore sync error:", error);
        });
    } catch (err) {
        debugLog.error("listenForBoardUpdates fatal error:", err);
        return () => { };
    }
};

// getRawBoardsList is now imported from boardService

export const saveBoardToCloud = async (userId, boardId, boardContent) => {
    if (!db || !userId) return;
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

        const fullBoard = removeUndefined({
            ...meta,
            ...cleanedContent,
            updatedAt: Date.now()
        });

        const boardRef = doc(db, 'users', userId, 'boards', boardId);
        await setDoc(boardRef, fullBoard);
        debugLog.sync(`Board ${boardId} cloud save successful`);
    } catch (e) {
        debugLog.error(`Cloud save failed for board ${boardId}`, e);
    }
};

export const updateBoardMetadataInCloud = async (userId, boardId, metadata) => {
    if (!db || !userId) return;
    try {
        debugLog.sync(`Updating cloud metadata for board ${boardId}`, metadata);
        const boardRef = doc(db, 'users', userId, 'boards', boardId);
        await setDoc(boardRef, metadata, { merge: true });
    } catch (e) {
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
    if (!db || !userId) return;
    try {
        debugLog.auth('Saving user settings to cloud...', settings);
        const configRef = doc(db, 'users', userId, 'settings', 'config');
        await setDoc(configRef, settings); // Overwrite cleanly to handle deletions
    } catch (e) {
        debugLog.error("Save settings failed", e);
    }
};

export const updateUserSettings = async (userId, updates) => {
    if (!db || !userId) return;
    try {
        debugLog.auth('Updating user settings in cloud...', updates);
        const configRef = doc(db, 'users', userId, 'settings', 'config');
        await setDoc(configRef, updates, { merge: true });
    } catch (e) {
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
