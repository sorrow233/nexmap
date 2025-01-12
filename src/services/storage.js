
const STORAGE_PREFIX = 'chat_canvas_board_';
const BOARDS_LIST_KEY = 'chat_canvas_boards_list';
const CURRENT_BOARD_ID_KEY = 'chat_canvas_current_board_id';

export const StorageService = {
    // --- Boards List ---
    getBoardsList: () => {
        const stored = localStorage.getItem(BOARDS_LIST_KEY);
        return stored ? JSON.parse(stored) : [];
    },

    saveBoardsList: (list) => {
        localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(list));
    },

    // --- Current Board ID ---
    getCurrentBoardId: () => {
        return localStorage.getItem(CURRENT_BOARD_ID_KEY);
    },

    setCurrentBoardId: (id) => {
        if (id) localStorage.setItem(CURRENT_BOARD_ID_KEY, id);
        else localStorage.removeItem(CURRENT_BOARD_ID_KEY);
    },

    // --- Single Board Data ---
    loadBoard: (boardId) => {
        const stored = localStorage.getItem(`${STORAGE_PREFIX}${boardId}`);
        return stored ? JSON.parse(stored) : { cards: [] };
    },

    saveBoard: (boardId, data) => {
        localStorage.setItem(`${STORAGE_PREFIX}${boardId}`, JSON.stringify(data));

        // Update metadata in list
        const list = StorageService.getBoardsList();
        const boardIndex = list.findIndex(b => b.id === boardId);
        if (boardIndex !== -1) {
            list[boardIndex].updatedAt = Date.now();
            list[boardIndex].cardCount = (data.cards || []).length;
            StorageService.saveBoardsList(list);
        }
    },

    // --- Operations ---
    createBoard: (name) => {
        const newId = 'b_' + Date.now();
        const newBoardMeta = {
            id: newId,
            name: name || 'New Board',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            cardCount: 0
        };

        const list = StorageService.getBoardsList();
        list.unshift(newBoardMeta); // Newest first
        StorageService.saveBoardsList(list);

        // Initialize empty board
        StorageService.saveBoard(newId, { cards: [] });
        return newBoardMeta;
    },

    deleteBoard: (boardId) => {
        localStorage.removeItem(`${STORAGE_PREFIX}${boardId}`);
        let list = StorageService.getBoardsList();
        list = list.filter(b => b.id !== boardId);
        StorageService.saveBoardsList(list);
        if (StorageService.getCurrentBoardId() === boardId) {
            StorageService.setCurrentBoardId(null);
        }
    }
};

if (typeof window !== 'undefined') {
    window.StorageService = StorageService;
}
