import { idbGet, idbSet, idbDel } from './db/indexedDB';
import { downloadImageAsBase64 } from './imageStore';

const BOARD_PREFIX = 'mixboard_board_';
const BOARDS_LIST_KEY = 'mixboard_boards_list';
const CURRENT_BOARD_ID_KEY = 'mixboard_current_board_id';

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
    // Init empty board in IDB with groups field
    await saveBoard(newBoard.id, { cards: [], connections: [], groups: [] });
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
        return { cards: [], connections: [], groups: [] };
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
