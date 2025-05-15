import { db } from './firebase';
import { collection, doc, onSnapshot, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { idbGet } from './db/indexedDB';
import { saveBoard } from './boardService';

const BOARD_PREFIX = 'mixboard_board_';
const BOARDS_LIST_KEY = 'mixboard_boards_list';

export const listenForBoardUpdates = (userId, onUpdate) => {
    if (!db || !userId) return () => { };

    try {
        const boardsRef = collection(db, 'users', userId, 'boards');
        return onSnapshot(boardsRef, async (snapshot) => {
            const promises = [];
            let hasChanges = false;

            for (const change of snapshot.docChanges()) {
                const boardData = change.doc.data();
                if (!boardData.id) continue;

                if (change.type === 'added' || change.type === 'modified') {
                    promises.push((async () => {
                        try {
                            const localData = await idbGet(BOARD_PREFIX + boardData.id);

                            if (localData && boardData.updatedAt && localData.updatedAt >= boardData.updatedAt) {
                                return;
                            }

                            hasChanges = true;
                            if (!localData || !localData.cards) {
                                await saveBoard(boardData.id, {
                                    cards: boardData.cards || [],
                                    connections: boardData.connections || [],
                                    groups: boardData.groups || [], // CRITICAL: Sync zones from cloud
                                    updatedAt: boardData.updatedAt
                                });
                                return;
                            }

                            // Smart Merge: Preserve local base64 but take cloud structure/S3 URLs
                            const mergedCards = (boardData.cards || []).map(cloudCard => {
                                const localCard = localData.cards.find(c => c.id === cloudCard.id);
                                if (!localCard) return cloudCard;

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

                                return { ...cloudCard, data: { ...cloudCard.data, ...localCard.data, messages: mergedMessages, content: cloudCard.data.content } };
                            });

                            const localOnlyCards = localData.cards.filter(lc => !boardData.cards?.find(cc => cc.id === lc.id));

                            await saveBoard(boardData.id, {
                                cards: [...mergedCards, ...localOnlyCards],
                                connections: boardData.connections || localData.connections || [],
                                groups: boardData.groups || localData.groups || [], // CRITICAL: Sync zones from cloud
                                updatedAt: boardData.updatedAt
                            });
                        } catch (e) {
                            console.error("[Firebase Sync] Merge failed", e);
                        }
                    })());
                }
            }

            if (promises.length > 0) {
                await Promise.all(promises);
                if (hasChanges) console.log(`[Firebase Sync] Hydrated ${promises.length} board(s)`);
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
                deletedAt: b.deletedAt, // Sync deleted status!
                backgroundImage: b.backgroundImage // Sync background image!
            })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(metadataList));

            onUpdate(metadataList, snapshot.docChanges().map(c => c.doc.data().id));
        }, (error) => {
            console.error("Firestore sync error:", error);
        });
    } catch (err) {
        console.error("listenForBoardUpdates fatal error:", err);
        return () => { };
    }
};

// Internal helper to get ALL boards (Active + Trash) - duplicated from boardService because it's not exported for use here easily without circular dep risk if we import everything.
// Actually we can just read localStorage directly here since it's simple.
const getRawBoardsList = () => {
    const list = localStorage.getItem(BOARDS_LIST_KEY);
    return list ? JSON.parse(list) : [];
};

export const saveBoardToCloud = async (userId, boardId, boardContent) => {
    if (!db || !userId) return;
    try {
        const list = getRawBoardsList(); // Get FULL list to find metadata even if deleted
        const meta = list.find(b => b.id === boardId);

        if (!meta) return;

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
            groups: boardContent.groups || [] // CRITICAL: Sync zones to cloud
        };

        // Combine meta (which includes deletedAt) with content
        const fullBoard = removeUndefined({
            ...meta,
            ...cleanedContent
        });

        const boardRef = doc(db, 'users', userId, 'boards', boardId);
        await setDoc(boardRef, fullBoard);
    } catch (e) {
        console.error("Cloud save failed", e);
    }
};

// Update metadata only (for soft deletion sync)
export const updateBoardMetadataInCloud = async (userId, boardId, metadata) => {
    if (!db || !userId) return;
    try {
        const boardRef = doc(db, 'users', userId, 'boards', boardId);
        await setDoc(boardRef, metadata, { merge: true });
    } catch (e) {
        console.error("Cloud metadata update failed", e);
    }
};

export const deleteBoardFromCloud = async (userId, boardId) => {
    if (!db || !userId) return;
    try {
        const boardRef = doc(db, 'users', userId, 'boards', boardId);
        await deleteDoc(boardRef);
    } catch (e) {
        console.error("Cloud delete failed", e);
    }
};

export const saveUserSettings = async (userId, settings) => {
    if (!db || !userId) return;
    try {
        const configRef = doc(db, 'users', userId, 'settings', 'config');
        await setDoc(configRef, settings, { merge: true });
    } catch (e) {
        console.error("Save settings failed", e);
    }
};

export const loadUserSettings = async (userId) => {
    if (!db || !userId) return null;
    try {
        const configRef = doc(db, 'users', userId, 'settings', 'config');
        const docSnap = await getDoc(configRef);
        return docSnap.exists() ? docSnap.data() : null;
    } catch (e) {
        console.error("Load settings failed", e);
        return null;
    }
};
