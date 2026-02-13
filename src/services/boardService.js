import { idbGet, idbSet, idbDel } from './db/indexedDB';
import { downloadImageAsBase64 } from './imageStore';
import { debugLog } from '../utils/debugLogger';
import { getSampleBoardData } from '../utils/sampleBoardsData';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from './customInstructionsService';

const BOARD_PREFIX = 'mixboard_board_';
const BOARDS_LIST_KEY = 'mixboard_boards_list';
const CURRENT_BOARD_ID_KEY = 'mixboard_current_board_id';

export const getCurrentBoardId = () => sessionStorage.getItem(CURRENT_BOARD_ID_KEY);
export const setCurrentBoardId = (id) => {
    debugLog.storage(`Setting current board to: ${id}`);
    if (id) sessionStorage.setItem(CURRENT_BOARD_ID_KEY, id);
    else sessionStorage.removeItem(CURRENT_BOARD_ID_KEY);
};

// Shared helper to get ALL boards (Active + Trash)
export const getRawBoardsList = () => {
    const list = localStorage.getItem(BOARDS_LIST_KEY);
    try {
        const parsed = list ? JSON.parse(list) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("Failed to parse boards list", e);
        return [];
    }
};

export const getBoardsList = () => {
    return getRawBoardsList().filter(b => !b.deletedAt);
};

export const getTrashBoards = () => {
    return getRawBoardsList().filter(b => b.deletedAt);
};

export const loadBoardsMetadata = () => {
    debugLog.storage('Loading boards metadata list');
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
        cardCount: 0,
        syncVersion: 0 // Initialize logical clock
    };
    debugLog.storage(`Creating new board: ${newBoard.name}`, { id: newBoard.id });
    const list = getRawBoardsList();
    const newList = [newBoard, ...list];
    localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(newList));
    // Init empty board in IDB with groups field
    await saveBoard(newBoard.id, {
        cards: [],
        connections: [],
        groups: [],
        boardPrompts: [],
        boardInstructionSettings: normalizeBoardInstructionSettings(DEFAULT_BOARD_INSTRUCTION_SETTINGS)
    });
    return newBoard;
};

// Update board metadata (name, etc.) in localStorage
export const updateBoardMetadata = (id, metadata) => {
    debugLog.storage(`Updating metadata for board: ${id}`, metadata);
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
    debugLog.storage(`Saving board: ${id}`, {
        cardsCount: data.cards?.length || 0,
        connectionsCount: data.connections?.length || 0,
        groupsCount: data.groups?.length || 0
    });

    const list = getRawBoardsList();
    const boardIndex = list.findIndex(b => b.id === id);
    if (boardIndex >= 0) {
        // Preserve and increment syncVersion for cloud sync
        const currentVersion = list[boardIndex].syncVersion || 0;
        list[boardIndex] = {
            ...list[boardIndex],
            updatedAt: timestamp,
            cardCount: data.cards?.length || 0,
            syncVersion: data.syncVersion !== undefined ? data.syncVersion : currentVersion,
            ...(data.name && { name: data.name })
        };
        localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(list));
    }
    await idbSet(BOARD_PREFIX + id, { ...data, updatedAt: timestamp, syncVersion: data.syncVersion });
};

export const loadBoard = async (id) => {
    debugLog.storage(`Loading board: ${id}`);

    // Handle sample boards - return static sample data
    if (id && id.startsWith('sample-')) {
        debugLog.storage(`Loading sample board: ${id}`);
        const sampleData = getSampleBoardData(id);
        return {
            ...sampleData,
            boardPrompts: [],
            boardInstructionSettings: normalizeBoardInstructionSettings(DEFAULT_BOARD_INSTRUCTION_SETTINGS)
        };
    }

    let stored = null;
    try {
        stored = await idbGet(BOARD_PREFIX + id);
    } catch (e) {
        debugLog.error(`IDB read failed for board ${id}`, e);
    }

    if (!stored) {
        // Fallback: Check localStorage (Migration path)
        try {
            const legacy = localStorage.getItem(BOARD_PREFIX + id);
            if (legacy) {
                debugLog.storage(`Found legacy data in localStorage for board: ${id}`);
                const parsed = JSON.parse(legacy);
                // Migrate to IDB in background with proper error handling
                try {
                    await idbSet(BOARD_PREFIX + id, parsed);
                    debugLog.storage(`Migrated board ${id} from localStorage to IDB`);
                } catch (migrationErr) {
                    debugLog.error("Migration save failed", migrationErr);
                }
                stored = parsed;
            }
        } catch (e) {
            debugLog.error(`Legacy localStorage load failed for board ${id}`, e);
        }
    }

    if (!stored) {
        debugLog.storage(`Board ${id} not found, returning empty template`);
        return {
            cards: [],
            connections: [],
            groups: [],
            boardPrompts: [],
            boardInstructionSettings: normalizeBoardInstructionSettings(DEFAULT_BOARD_INSTRUCTION_SETTINGS)
        };
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
                                debugLog.sync(`Downloading S3 image: ${part.source.url.substring(0, 50)}...`);
                                const base64 = await downloadImageAsBase64(part.source.url);
                                if (base64) {
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
                                debugLog.error(`S3 Download failed for: ${part.source.url}`);
                            }
                            return part;
                        }));
                        return { ...msg, content: processedContent };
                    }
                    return msg;
                }));
                return { ...card, data: { ...card.data, messages: processedMessages } };
            } catch (e) {
                debugLog.error(`Card processing error in board ${id}`, e);
                return card; // Return original card on error
            }
        }));
        finalBoard = { ...stored, cards: processedCards };
    } catch (e) {
        debugLog.error(`S3 processing error in board ${id}`, e);
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

    debugLog.storage(`Board ${id} loaded successfully`, { cards: finalBoard.cards?.length || 0 });
    return {
        ...finalBoard,
        boardInstructionSettings: normalizeBoardInstructionSettings(finalBoard.boardInstructionSettings)
    };
};

// Optimized loader for Search (Direct IDB access, NO S3 processing)
export const loadBoardDataForSearch = async (id) => {
    try {
        let stored = await idbGet(BOARD_PREFIX + id);
        if (!stored) {
            // Fallback to legacy only if needed (rare case now)
            const legacy = localStorage.getItem(BOARD_PREFIX + id);
            if (legacy) stored = JSON.parse(legacy);
        }
        // Return raw stored data (we just need text content for search, no base64 conversion needed)
        return stored;
    } catch (e) {
        console.warn(`[Search] Failed to load board ${id}`, e);
        return null;
    }
};



// --- Cleanup Logic ---
export const cleanupExpiredTrash = async () => {
    const list = getTrashBoards();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const board of list) {
        if (board.deletedAt && board.deletedAt < thirtyDaysAgo) {
            debugLog.storage(`Board ${board.id} expired (deleted > 30 days ago). Permanently removing.`);
            await permanentlyDeleteBoard(board.id);
            deletedCount++;
        }
    }
    if (deletedCount > 0) {
        debugLog.storage(`Cleanup removed ${deletedCount} expired boards from trash.`);
    }
};

/**
 * Cleanup soft-deleted cards from a board that are older than retention period.
 * Call this during board load to keep data clean.
 * 
 * @param {string} boardId - The board ID to clean up
 * @param {object} boardData - The board data object with cards array
 * @param {number} retentionDays - Number of days to retain soft-deleted cards (default: 30)
 * @returns {object} - Cleaned board data
 */
export const cleanupExpiredCards = (boardData, retentionDays = 30) => {
    if (!boardData?.cards) return boardData;

    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    const originalCount = boardData.cards.length;

    // Permanently remove cards deleted more than retentionDays ago
    const cleanedCards = boardData.cards.filter(card => {
        if (!card.deletedAt) return true; // Keep active cards
        if (card.deletedAt > cutoffTime) return true; // Keep recently deleted (for sync)
        // Card was deleted more than retentionDays ago - remove permanently
        debugLog.storage(`Card ${card.id} expired (deleted > ${retentionDays} days ago). Permanently removing.`);
        return false;
    });

    const removedCount = originalCount - cleanedCards.length;
    if (removedCount > 0) {
        debugLog.storage(`Cleanup removed ${removedCount} expired cards from board.`);
    }

    return { ...boardData, cards: cleanedCards };
};

// Soft Delete (Rename original function to prevent breaking API but change behavior)
export const deleteBoard = async (id) => {
    debugLog.storage(`Soft deleting board: ${id}`);
    const list = getRawBoardsList();
    const boardIndex = list.findIndex(b => b.id === id);
    if (boardIndex >= 0) {
        list[boardIndex] = { ...list[boardIndex], deletedAt: Date.now() };
        localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(list));
    } else {
        debugLog.error(`Board ${id} not found for soft deletion.`);
    }
};

export const restoreBoard = async (id) => {
    debugLog.storage(`Restoring board: ${id}`);
    const list = getRawBoardsList();
    const boardIndex = list.findIndex(b => b.id === id);
    if (boardIndex >= 0) {
        const { deletedAt, ...rest } = list[boardIndex];
        list[boardIndex] = rest; // Remove deletedAt
        localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(list));
        return true;
    }
    return false;
};

export const permanentlyDeleteBoard = async (id) => {
    debugLog.storage(`Permanently deleting board: ${id}`);
    const list = getRawBoardsList();
    const newList = list.filter(b => b.id !== id);
    localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(newList));

    await idbDel(BOARD_PREFIX + id);
    localStorage.removeItem(BOARD_PREFIX + id); // Cleanup legacy
    localStorage.removeItem(`mixboard_viewport_${id}`); // Cleanup viewport state
};

// Viewport State Management
const VIEWPORT_PREFIX = 'mixboard_viewport_';

export const saveViewportState = (boardId, viewport) => {
    if (!boardId) return;
    debugLog.storage(`Saving viewport for board ${boardId}`, viewport);
    try {
        localStorage.setItem(VIEWPORT_PREFIX + boardId, JSON.stringify(viewport));
    } catch (e) {
        debugLog.error(`Failed to save viewport state for board ${boardId}`, e);
    }
};

export const loadViewportState = (boardId) => {
    if (!boardId) return { offset: { x: 0, y: 0 }, scale: 1 };
    debugLog.storage(`Loading viewport for board ${boardId}`);
    try {
        const stored = localStorage.getItem(VIEWPORT_PREFIX + boardId);
        if (stored) {
            const parsed = JSON.parse(stored);
            debugLog.storage(`Viewport loaded for board ${boardId}`, parsed);
            return parsed;
        }
    } catch (e) {
        debugLog.error(`Failed to load viewport state for board ${boardId}`, e);
    }
    return { offset: { x: 0, y: 0 }, scale: 1 };
};
