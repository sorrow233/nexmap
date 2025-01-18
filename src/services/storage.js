import { db } from './firebase';

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
    return getBoardsList();
};

export const createBoard = async (name) => {
    const newBoard = {
        id: Date.now().toString(),
        name: name || 'Untitled Board',
        createdAt: Date.now(),
        updatedAt: Date.now(),
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
    // data: { cards, connections }
    const list = getBoardsList();
    const boardIndex = list.findIndex(b => b.id === id);
    if (boardIndex >= 0) {
        list[boardIndex] = {
            ...list[boardIndex],
            updatedAt: Date.now(),
            cardCount: data.cards?.length || 0
        };
        localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(list));
    }
    await idbSet(BOARD_PREFIX + id, data);
};

export const loadBoard = async (id) => {
    let stored = null;
    try {
        stored = await idbGet(BOARD_PREFIX + id);
    } catch (e) {
        console.warn("IDB read failed for board", id, e);
    }

    if (stored) return stored;

    // Fallback: Check localStorage (Migration path)
    // We check this OUTSIDE the first try/catch so that if IDB fails hard, we still try LS.
    try {
        const legacy = localStorage.getItem(BOARD_PREFIX + id);
        if (legacy) {
            console.log("Found legacy data in localStorage for board:", id);
            const parsed = JSON.parse(legacy);
            // Migrate to IDB in background
            idbSet(BOARD_PREFIX + id, parsed).catch(e => console.error("Migration save failed", e));
            return parsed;
        }
    } catch (e) {
        console.error("Legacy localStorage load failed", e);
    }

    return { cards: [], connections: [] };
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
        return db.collection('users').doc(userId).collection('boards')
            .onSnapshot(async (snapshot) => {
                const cloudBoards = [];
                const promises = [];

                snapshot.forEach(doc => {
                    const boardData = doc.data();
                    cloudBoards.push(boardData);

                    // Sync content to local storage (IDB)
                    if (boardData.id) {
                        promises.push(saveBoard(boardData.id, {
                            cards: boardData.cards || [],
                            connections: boardData.connections || []
                        }));
                    }
                });

                // Wait for all IDB writes? No, onSnapshot is sync-ish regarding callback. 
                // We'll let them run.
                // But metadata update should happen.
                // Note: saveBoard above updates metadata list too, which might cause race conditions if we map loop it.
                // Let's optimize: Update metadata LIST once, then fire content updates.

                const metadataList = cloudBoards.map(b => ({
                    id: b.id,
                    name: b.name || 'Untitled',
                    createdAt: b.createdAt || Date.now(),
                    updatedAt: b.updatedAt || Date.now(),
                    cardCount: b.cards?.length || 0
                })).sort((a, b) => b.updatedAt - a.updatedAt);

                localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(metadataList));
                onUpdate(metadataList);

                // Now background sync content to IDB
                for (const b of cloudBoards) {
                    // We directly use idbSet to avoid double metadata update
                    idbSet(BOARD_PREFIX + b.id, {
                        cards: b.cards || [],
                        connections: b.connections || []
                    });
                }

            }, (error) => {
                console.error("Firestore sync error:", error);
            });
    } catch (e) {
        console.error("Setup sync failed", e);
        return () => { };
    }
};

export const saveBoardToCloud = async (userId, boardId, boardContent) => {
    if (!db || !userId) return;
    try {
        const list = getBoardsList();
        const meta = list.find(b => b.id === boardId);

        if (!meta) return;

        const fullBoard = {
            ...meta,
            cards: boardContent.cards || [],
            connections: boardContent.connections || []
        };

        await db.collection('users').doc(userId).collection('boards').doc(boardId).set(fullBoard);
    } catch (e) {
        console.error("Cloud save failed", e);
    }
};

export const deleteBoardFromCloud = async (userId, boardId) => {
    if (!db || !userId) return;
    try {
        await db.collection('users').doc(userId).collection('boards').doc(boardId).delete();
    } catch (e) {
        console.error("Cloud delete failed", e);
    }
};

export const saveUserSettings = async (userId, settings) => {
    if (!db || !userId) return;
    try {
        await db.collection('users').doc(userId).collection('settings').doc('config').set(settings, { merge: true });
    } catch (e) {
        console.error("Save settings failed", e);
    }
};

export const loadUserSettings = async (userId) => {
    if (!db || !userId) return null;
    try {
        const doc = await db.collection('users').doc(userId).collection('settings').doc('config').get();
        return doc.exists ? doc.data() : null;
    } catch (e) {
        console.error("Load settings failed", e);
        return null;
    }
};


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
