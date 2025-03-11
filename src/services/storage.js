import { db } from './firebase';
import { collection, doc, onSnapshot, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

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
            console.log(`[IDB] Get success for ${key}:`, request.result ? 'Found' : 'Not Found');
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
            console.log(`[IDB] Transaction complete for ${key}. Data size approx: ${JSON.stringify(value).length} chars`);
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

// --- Storage API ---

export const getCurrentBoardId = () => localStorage.getItem(CURRENT_BOARD_ID_KEY);
export const setCurrentBoardId = (id) => {
    if (id) localStorage.setItem(CURRENT_BOARD_ID_KEY, id);
    else localStorage.removeItem(CURRENT_BOARD_ID_KEY);
};

export const getBoardsList = () => {
    const list = localStorage.getItem(BOARDS_LIST_KEY);
    return list ? JSON.parse(list) : [];
};

export const loadBoardsMetadata = () => {
    return getBoardsList().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
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
    const list = getBoardsList();
    const newList = [newBoard, ...list];
    localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(newList));
    // Init empty board in IDB
    await saveBoard(newBoard.id, { cards: [], connections: [] });
    return newBoard;
};

export const saveBoard = async (id, data) => {
    // data: { cards, connections, updatedAt? }
    const timestamp = data.updatedAt || Date.now();
    console.log('[Storage] saveBoard called. Board:', id, 'Cards:', data.cards?.length || 0, 'Total data size:', JSON.stringify(data).length);

    const list = getBoardsList();
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
    console.log('[Storage] saveBoard complete for', id);
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
                                    console.log('[S3 Download] Successfully converted to base64');
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
                                console.log('[Load Board] Base64 image detected, data length:', part.source.data?.length || 0);
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
        const list = getBoardsList();
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

export const deleteBoard = async (id) => {
    const list = getBoardsList();
    const newList = list.filter(b => b.id !== id);
    localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(newList));

    await idbDel(BOARD_PREFIX + id);
    // Also clear legacy if exists
    localStorage.removeItem(BOARD_PREFIX + id);
};

// --- Cloud Sync ---

export const listenForBoardUpdates = (userId, onUpdate) => {
    if (!db || !userId) return () => { };

    try {
        const boardsRef = collection(db, 'users', userId, 'boards');
        return onSnapshot(boardsRef, async (snapshot) => {
            const promises = [];
            let hasChanges = false;

            // Only process actual changes to prevent infinite loops
            for (const change of snapshot.docChanges()) {
                const boardData = change.doc.data();
                if (!boardData.id) continue;

                if (change.type === 'added' || change.type === 'modified') {
                    promises.push((async () => {
                        try {
                            const localData = await idbGet(BOARD_PREFIX + boardData.id);

                            // Optimization: If local data exists and cloud data is not newer, skip hydration
                            // This is the key to breaking the "autosave -> cloud -> sync -> local" loop
                            if (localData && boardData.updatedAt && localData.updatedAt >= boardData.updatedAt) {
                                // console.log(`[Firebase Sync] Skipping hydration for ${boardData.id}, local is up to date`);
                                return;
                            }

                            hasChanges = true;
                            if (!localData || !localData.cards) {
                                // First time loading or missing local data
                                await saveBoard(boardData.id, {
                                    cards: boardData.cards || [],
                                    connections: boardData.connections || [],
                                    updatedAt: boardData.updatedAt // Preserving cloud timestamp
                                });
                                return;
                            }

                            // Smart Merge: Preserve local base64 but take cloud structure/S3 URLs
                            const mergedCards = (boardData.cards || []).map(cloudCard => {
                                const localCard = localData.cards.find(c => c.id === cloudCard.id);
                                if (!localCard) return cloudCard;

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

                                return { ...cloudCard, data: { ...cloudCard.data, messages: mergedMessages } };
                            });

                            const localOnlyCards = localData.cards.filter(lc => !boardData.cards?.find(cc => cc.id === lc.id));

                            await saveBoard(boardData.id, {
                                cards: [...mergedCards, ...localOnlyCards],
                                connections: boardData.connections || localData.connections || [],
                                updatedAt: boardData.updatedAt // Prevent immediate re-trigger by keeping timestamp
                            });
                        } catch (e) {
                            console.error("[Firebase Sync] Merge failed", e);
                        }
                    })());
                }
            }

            // Wait for all IDB writes to complete
            if (promises.length > 0) {
                await Promise.all(promises);
                if (hasChanges) console.log(`[Firebase Sync] Hydrated ${promises.length} board(s)`);
            }

            // Update metadata list in localStorage for gallery view
            const allBoards = snapshot.docs.map(doc => doc.data());
            const metadataList = allBoards.map(b => ({
                id: b.id,
                name: b.name || 'Untitled',
                createdAt: b.createdAt || Date.now(),
                updatedAt: b.updatedAt || Date.now(),
                lastAccessedAt: b.lastAccessedAt || b.updatedAt || Date.now(),
                cardCount: b.cards?.length || 0
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

export const saveBoardToCloud = async (userId, boardId, boardContent) => {
    if (!db || !userId) return;
    try {
        const list = getBoardsList();
        const meta = list.find(b => b.id === boardId);

        if (!meta) return;

        // Clean base64 data before syncing to Firebase
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
                                    // Strip base64 from all images before Firebase sync
                                    // This prevents "nested entity" errors
                                    if (part.type === 'image' && part.source) {
                                        // Has S3 URL: use URL type
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
                                        // No S3 URL yet (upload pending): DON'T sync to Firebase
                                        // Return a placeholder to avoid errors
                                        if (part.source.type === 'base64' && !part.source.s3Url) {
                                            console.warn('[Cloud Save] Skipping image without S3 URL (upload pending)');
                                            return null; // Will be filtered out
                                        }
                                    }
                                    // Keep base64 for non-image or users without S3
                                    return part;
                                }).filter(Boolean) // Remove nulls
                            };
                        }
                        return msg;
                    })
                }
            })),
            connections: boardContent.connections || []
        };

        const fullBoard = {
            ...meta,
            ...cleanedContent
        };

        const boardRef = doc(db, 'users', userId, 'boards', boardId);
        await setDoc(boardRef, fullBoard);
    } catch (e) {
        console.error("Cloud save failed", e);
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
    createBoard, saveBoard, loadBoard, deleteBoard,
    listenForBoardUpdates, saveBoardToCloud, deleteBoardFromCloud,
    saveUserSettings, loadUserSettings

};

if (typeof window !== 'undefined') {
    window.StorageService = StorageService;
}
