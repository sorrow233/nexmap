import { db } from './firebase';

const BOARD_PREFIX = 'mixboard_board_';
const BOARDS_LIST_KEY = 'mixboard_boards_list';
const CURRENT_BOARD_ID_KEY = 'mixboard_current_board_id';

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

export const createBoard = (name) => {
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
    return newBoard;
};

export const saveBoard = (id, data) => {
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
    localStorage.setItem(BOARD_PREFIX + id, JSON.stringify(data));
};

export const loadBoard = (id) => {
    const stored = localStorage.getItem(BOARD_PREFIX + id);
    return stored ? JSON.parse(stored) : { cards: [], connections: [] };
};

export const deleteBoard = (id) => {
    const list = getBoardsList();
    const newList = list.filter(b => b.id !== id);
    localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(newList));
    localStorage.removeItem(BOARD_PREFIX + id);
};

// --- Cloud Sync ---

export const listenForBoardUpdates = (userId, onUpdate) => {
    if (!db || !userId) return () => { };

    try {
        // Subscribe to user's boards collection
        // We only listen for metadata updates mostly? 
        // Actually, let's sync the full boards list.
        return db.collection('users').doc(userId).collection('boards')
            .onSnapshot((snapshot) => {
                const cloudBoards = [];
                snapshot.forEach(doc => {
                    const boardData = doc.data(); // This is the FULL board data including cards?
                    // Ideally we split metadata and content.
                    // For simplicity, let's assume we store { id, name, ...metadata... cards: [], connections: [] }

                    cloudBoards.push(boardData);

                    // Sync content to local storage
                    if (boardData.id) {
                        const localKey = BOARD_PREFIX + boardData.id;
                        // Optimization: Check timestamp?
                        localStorage.setItem(localKey, JSON.stringify({
                            cards: boardData.cards || [],
                            connections: boardData.connections || []
                        }));
                    }
                });

                // Update Local Metadata List
                const metadataList = cloudBoards.map(b => ({
                    id: b.id,
                    name: b.name || 'Untitled',
                    createdAt: b.createdAt || Date.now(),
                    updatedAt: b.updatedAt || Date.now(),
                    cardCount: b.cards?.length || 0
                })).sort((a, b) => b.updatedAt - a.updatedAt);

                localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(metadataList));
                onUpdate(metadataList);
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
        // We need the metadata too.
        // Get metadata from list
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


// Compatibility for Local Preview (which expects window.StorageService for legacy reasons or we update App)
// App.jsx now imports named exports.
// But we still expose it just in case.
const StorageService = {
    getCurrentBoardId, setCurrentBoardId, getBoardsList, loadBoardsMetadata,
    createBoard, saveBoard, loadBoard, deleteBoard,
    listenForBoardUpdates, saveBoardToCloud, deleteBoardFromCloud,
    saveUserSettings, loadUserSettings
};

if (typeof window !== 'undefined') {
    window.StorageService = StorageService;
}
