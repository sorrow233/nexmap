import { db } from './firebase';
import { collection, doc, onSnapshot, setDoc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';

const BOARD_PREFIX = 'mixboard_board_';
const BOARDS_LIST_KEY = 'mixboard_boards_list';
const CURRENT_BOARD_ID_KEY = 'mixboard_current_board_id';

// --- IndexedDB Helper (Minimal Wrapper) ---
const IDB_NAME = 'MixBoardDB';
const IDB_STORE = 'boards';
const IDB_VERSION = 1;

const initDB = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
        }
    };
});

const idbGet = async (key) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_STORE, 'readonly');
        const store = transaction.objectStore(IDB_STORE);
        const request = store.get(key);
        request.onsuccess = () => {
            // console.log(`[IDB] Get success for ${key}:`, request.result ? 'Found' : 'Not Found');
            resolve(request.result);
        };
        request.onerror = () => {
            console.error(`[IDB] Get error for ${key}:`, request.error);
            reject(request.error);
        };
    });
};

const idbSet = async (key, value) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_STORE, 'readwrite');
        const store = transaction.objectStore(IDB_STORE);
        const request = store.put(value, key);

        transaction.oncomplete = () => {
            // console.log(`[IDB] Transaction complete for ${key}. Data size approx: ${JSON.stringify(value).length} chars`);
            resolve();
        };

        transaction.onerror = () => {
            console.error(`[IDB] Transaction error for ${key}:`, transaction.error);
            reject(transaction.error);
        };
    });
};

const idbDel = async (key) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_STORE, 'readwrite');
        const store = transaction.objectStore(IDB_STORE);
        const request = store.delete(key);

        transaction.oncomplete = () => {
            console.log(`[IDB] Delete complete for ${key}`);
            resolve();
        };
        transaction.onerror = () => reject(transaction.error);
    });
};

// --- Image Storage Wrappers ---
const IMAGE_PREFIX = 'img_';

export const saveImageToIDB = async (imageId, base64Data) => {
    if (!imageId || !base64Data) return;
    try {
        await idbSet(IMAGE_PREFIX + imageId, base64Data);
        return true;
    } catch (e) {
        console.error('[Storage] Failed to save image to IDB', e);
        return false;
    }
};

export const getImageFromIDB = async (imageId) => {
    if (!imageId) return null;
    try {
        return await idbGet(IMAGE_PREFIX + imageId);
    } catch (e) {
        console.error('[Storage] Failed to get image from IDB', e);
        return null;
    }
};

// --- Storage API ---

export const getCurrentBoardId = () => localStorage.getItem(CURRENT_BOARD_ID_KEY);
export const setCurrentBoardId = (id) => {
    if (id) localStorage.setItem(CURRENT_BOARD_ID_KEY, id);
    else localStorage.removeItem(CURRENT_BOARD_ID_KEY);
};

// Internal helper to get ALL boards (Active + Trash)
const getRawBoardsList = () => {
    const list = localStorage.getItem(BOARDS_LIST_KEY);
    return list ? JSON.parse(list) : [];
};

export const getBoardsList = () => {
    return getRawBoardsList().filter(b => !b.deletedAt);
};

export const getTrashBoards = () => {
    return getRawBoardsList().filter(b => b.deletedAt);
};

export const loadBoardsMetadata = () => {
    // Return ALL boards (Active + Trash) sorted by createdAt so UI can filter
    return getRawBoardsList().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
};

export const createBoard = async (name) => {
    const newBoard = {
        id: Date.now().toString(),
        name: name || 'Untitled Board',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastAccessedAt: Date.now(),
        cardCount: 0
    };
    const list = getRawBoardsList();
    const newList = [newBoard, ...list];
    localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(newList));
    // Init empty board in IDB
    await saveBoard(newBoard.id, { cards: [], connections: [] });
    return newBoard;
};

// Update board metadata (name, etc.) in localStorage
export const updateBoardMetadata = (id, metadata) => {
    const list = getRawBoardsList();
    const boardIndex = list.findIndex(b => b.id === id);
    if (boardIndex >= 0) {
        list[boardIndex] = {
            ...list[boardIndex],
            ...metadata,
            updatedAt: Date.now()
        };
        localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(list));
        return true;
    }
    return false;
};

export const saveBoard = async (id, data) => {
    // data: { cards, connections, updatedAt? }
    const timestamp = data.updatedAt || Date.now();
    // console.log('[Storage] saveBoard called. Board:', id, 'Cards:', data.cards?.length || 0);

    const list = getRawBoardsList();
    const boardIndex = list.findIndex(b => b.id === id);
    if (boardIndex >= 0) {
        list[boardIndex] = {
            ...list[boardIndex],
            updatedAt: timestamp,
            cardCount: data.cards?.length || 0,
            ...(data.name && { name: data.name })
        };
        localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(list));
    }
    await idbSet(BOARD_PREFIX + id, { ...data, updatedAt: timestamp });
};

// Helper: Download image from S3 URL and convert to base64
const downloadImageAsBase64 = async (url) => {
    try {
        console.log('[S3 Download] Fetching:', url);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.indexOf('text/html') !== -1) {
            throw new Error('Received HTML content instead of image (fetch likely redirected to SPA index)');
        }

        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                console.log('[S3 Download] Success:', url.substring(0, 50) + '...');
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('[S3 Download] Failed:', error);
        return null;
    }
};

export const loadBoard = async (id) => {
    let stored = null;
    try {
        stored = await idbGet(BOARD_PREFIX + id);
    } catch (e) {
        console.warn("IDB read failed for board", id, e);
    }

    if (!stored) {
        // Fallback: Check localStorage (Migration path)
        try {
            const legacy = localStorage.getItem(BOARD_PREFIX + id);
            if (legacy) {
                console.log("Found legacy data in localStorage for board:", id);
                const parsed = JSON.parse(legacy);
                // Migrate to IDB in background
                idbSet(BOARD_PREFIX + id, parsed).catch(e => console.error("Migration save failed", e));
                stored = parsed;
            }
        } catch (e) {
            console.error("Legacy localStorage load failed", e);
        }
    }

    if (!stored) {
        return { cards: [], connections: [] };
    }

    // Process S3 URL images: download and convert to base64
    let finalBoard = stored;
    try {
        const processedCards = await Promise.all((stored.cards || []).map(async (card) => {
            try {
                const processedMessages = await Promise.all((card.data?.messages || []).map(async (msg) => {
                    if (Array.isArray(msg.content)) {
                        const processedContent = await Promise.all(msg.content.map(async (part) => {
                            // Detect URL type image (from S3 sync)
                            if (part.type === 'image' && part.source?.type === 'url' && part.source?.url) {
                                console.log('[S3 Download] Detected URL image, downloading:', part.source.url.substring(0, 50));
                                const base64 = await downloadImageAsBase64(part.source.url);
                                if (base64) {
                                    // console.log('[S3 Download] Successfully converted to base64');
                                    return {
                                        ...part,
                                        source: {
                                            type: 'base64',
                                            media_type: part.source.media_type,
                                            data: base64,
                                            s3Url: part.source.url // Keep S3 URL reference
                                        }
                                    };
                                }
                                // Download failed, keep URL as fallback
                                console.warn('[S3 Download] Failed, keeping URL fallback:', part.source.url);
                            } else if (part.type === 'image' && part.source?.type === 'base64') {
                                // Base64 image - pass through unchanged
                                // console.log('[Load Board] Base64 image detected, data length:', part.source.data?.length || 0);
                            }
                            return part;
                        }));
                        return { ...msg, content: processedContent };
                    }
                    return msg;
                }));
                return { ...card, data: { ...card.data, messages: processedMessages } };
            } catch (e) {
                console.error('[Load Board] Card processing error:', e);
                return card; // Return original card on error
            }
        }));
        finalBoard = { ...stored, cards: processedCards };
    } catch (e) {
        console.error('[Load Board] S3 processing error:', e);
    }

    // Always update last accessed time if we have a board
    if (finalBoard) {
        const list = getRawBoardsList();
        const boardIndex = list.findIndex(b => b.id === id);
        if (boardIndex >= 0) {
            list[boardIndex] = {
                ...list[boardIndex],
                lastAccessedAt: Date.now()
            };
            localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(list));
        }
    }

    return finalBoard;
};

// --- Deletion Logic ---

// --- Cleanup Logic ---
export const cleanupExpiredTrash = async () => {
    const list = getTrashBoards();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const board of list) {
        if (board.deletedAt && board.deletedAt < thirtyDaysAgo) {
            console.log(`[Cleanup] Board ${board.id} expired (deleted > 30 days ago). Permanently removing.`);
            await permanentlyDeleteBoard(board.id);
            deletedCount++;
        }
    }
    if (deletedCount > 0) {
        console.log(`[Cleanup] Removed ${deletedCount} expired boards from trash.`);
    }
};

// Soft Delete (Rename original function to prevent breaking API but change behavior)
export const deleteBoard = async (id) => {
    const list = getRawBoardsList();
    const boardIndex = list.findIndex(b => b.id === id);
    if (boardIndex >= 0) {
        list[boardIndex] = { ...list[boardIndex], deletedAt: Date.now() };
        localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(list));
        console.log(`[Storage] Board ${id} soft deleted (moved to trash).`);
    } else {
        console.warn(`[Storage] Board ${id} not found for soft deletion.`);
    }
};

export const restoreBoard = async (id) => {
    const list = getRawBoardsList();
    const boardIndex = list.findIndex(b => b.id === id);
    if (boardIndex >= 0) {
        const { deletedAt, ...rest } = list[boardIndex];
        list[boardIndex] = rest; // Remove deletedAt
        localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(list));
        console.log(`[Storage] Board ${id} restored.`);
        return true;
    }
    return false;
};

export const permanentlyDeleteBoard = async (id) => {
    const list = getRawBoardsList();
    const newList = list.filter(b => b.id !== id);
    localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(newList));

    await idbDel(BOARD_PREFIX + id);
    localStorage.removeItem(BOARD_PREFIX + id); // Cleanup legacy
    console.log(`[Storage] Board ${id} permanently deleted.`);
};

// --- Cloud Sync ---

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
                deletedAt: b.deletedAt // Sync deleted status!
            })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(metadataList));

            // onUpdate assumes active boards list? 
            // In App.jsx hook useAppInit, `onUpdate` sets boardsList.
            // If we pass everything, `App` receives trash items too.
            // So we should verify what `boardsList` is expected to be.
            // Typically `useAppInit` wants to display the Active Gallery.
            // So we should Filter here before passing to callback? 
            // OR let App handle it. 
            // `GalleryPage` accepts `boardsList`.
            // If I change `storage.js` to return active only in `getBoardsList`, 
            // `onUpdate` should ideally follow the same pattern or return all and let consumer filter.
            // The safest is to return everything and let App decide, OR return active only if that's what `getBoardsList` does.
            // `getBoardsList` returns active only.
            // So `onUpdate` should probably return Active only to be consistent!

            // Wait, if I filter out trash here, `GalleryPage` won't see trash items unless `useAppInit` has a separate `trashList` state.
            // Since `useAppInit` has only one `boardsList` state, if I filter here, Trash UI is impossible.
            // If I DON'T filter here, `GalleryPage` main view will show trash items unless I modify `GalleryPage` to filter.
            // Modifications needed in `GalleryPage`: Filter `boardsList` for Main view, and Filter for Trash view.
            // So `onUpdate` SHOULD return ALL items (with deletedAt).

            onUpdate(metadataList, snapshot.docChanges().map(c => c.doc.data().id));
        }, (error) => {
            console.error("Firestore sync error:", error);
        });
    } catch (err) {
        console.error("listenForBoardUpdates fatal error:", err);
        return () => { };
    }
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
            connections: boardContent.connections || []
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


// --- Settings API ---



// Compatibility for Local Preview
const StorageService = {
    getCurrentBoardId, setCurrentBoardId, getBoardsList, loadBoardsMetadata,
    createBoard, updateBoardMetadata, saveBoard, loadBoard, deleteBoard,
    listenForBoardUpdates, saveBoardToCloud, deleteBoardFromCloud,
    saveUserSettings, loadUserSettings,
    // New exports
    getTrashBoards, restoreBoard, permanentlyDeleteBoard, updateBoardMetadataInCloud
};

if (typeof window !== 'undefined') {
    window.StorageService = StorageService;
}
