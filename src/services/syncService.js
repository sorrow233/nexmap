import { db } from './firebase';
import { collection, doc, onSnapshot, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { idbGet } from './db/indexedDB';
import { saveBoard } from './boardService';
import { debugLog } from '../utils/debugLogger';

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
                                    updatedAt: boardData.updatedAt
                                });
                                return;
                            }

                            // Robust Merge with Deletion Reconciliation
                            const cloudCards = boardData.cards || [];

                            // 1. Reconcile Cloud Cards (Keep unless locally deleted)
                            const mergedCards = cloudCards.map(cloudCard => {
                                const localCard = localCards.find(c => c.id === cloudCard.id);
                                if (!localCard) {
                                    // RECONCILIATION: Is this a remote addition or a local deletion?
                                    if (cloudCard.createdAt && cloudCard.createdAt > localUpdatedAt) {
                                        return cloudCard; // Remote addition
                                    }
                                    return null; // Likely local deletion
                                }

                                // Robust content merging for 'note' type cards
                                if (cloudCard.type === 'note' && localCard.type === 'note') {
                                    const cloudContent = cloudCard.data?.content || '';
                                    const localContent = localCard.data?.content || '';
                                    if (cloudContent !== localContent) {
                                        const cloudCount = (cloudContent.match(/^\d+\./gm) || []).length;
                                        const localCount = (localContent.match(/^\d+\./gm) || []).length;
                                        if (localCount > cloudCount) {
                                            cloudCard.data.content = localContent;
                                        }
                                    }
                                }

                                const mergedMessages = (cloudCard.data?.messages || []).map((cloudMsg, msgIdx) => {
                                    const localMsg = localCard.data?.messages?.[msgIdx];
                                    if (!localMsg || !Array.isArray(cloudMsg.content) || !Array.isArray(localMsg.content)) return cloudMsg;

                                    const mergedContent = cloudMsg.content.map((cloudPart, partIdx) => {
                                        const localPart = localMsg.content[partIdx];
                                        if (cloudPart.type === 'image' && localPart?.type === 'image') {
                                            return {
                                                ...cloudPart,
                                                source: {
                                                    ...cloudPart.source,
                                                    ...(localPart.source?.type === 'base64' ? {
                                                        type: 'base64',
                                                        data: localPart.source.data
                                                    } : {}),
                                                    ...(cloudPart.source?.url ? { s3Url: cloudPart.source.url } : {})
                                                }
                                            };
                                        }
                                        return cloudPart;
                                    });
                                    return { ...cloudMsg, content: mergedContent };
                                });

                                return {
                                    ...cloudCard,
                                    data: {
                                        ...cloudCard.data,
                                        ...localCard.data,
                                        messages: mergedMessages,
                                        content: cloudCard.data.content
                                    }
                                };
                            }).filter(Boolean);

                            // 2. Reconcile Local Cards (Keep new local additions)
                            const localOnlyCards = localCards.filter(lc => {
                                const inCloud = cloudCards.find(cc => cc.id === lc.id);
                                if (inCloud) return false;

                                // RECONCILIATION: Is this a new local card or a remote deletion?
                                if (lc.createdAt && lc.createdAt > (boardData.updatedAt || 0)) {
                                    return true; // New local addition
                                }
                                return false; // Likely remote deletion
                            });

                            await saveBoard(boardData.id, {
                                cards: [...mergedCards, ...localOnlyCards],
                                connections: boardData.connections || localConnections || [],
                                groups: boardData.groups !== undefined ? boardData.groups : (localGroups || []),
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

            // Sync Metadata List
            const allBoards = snapshot.docs.map(doc => doc.data());
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

// Internal helper to get ALL boards (Active + Trash)
const getRawBoardsList = () => {
    const list = localStorage.getItem(BOARDS_LIST_KEY);
    return list ? JSON.parse(list) : [];
};

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

        const removeUndefined = (obj) => {
            if (Array.isArray(obj)) {
                return obj.map(removeUndefined).filter(item => item !== undefined);
            }
            if (obj !== null && typeof obj === 'object') {
                return Object.entries(obj).reduce((acc, [key, value]) => {
                    if (value !== undefined) {
                        acc[key] = removeUndefined(value);
                    }
                    return acc;
                }, {});
            }
            return obj;
        };

        const cleanedContent = {
            cards: (boardContent.cards || []).map(card => ({
                ...card,
                data: {
                    ...card.data,
                    messages: (card.data.messages || []).map(msg => {
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
            groups: boardContent.groups || []
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
