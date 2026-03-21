import { idbGet, idbSet, idbDel } from './db/indexedDB';
import { downloadImageAsBase64 } from './imageStore';
import { debugLog } from '../utils/debugLogger';
import { buildBoardCursorTrace, logPersistenceTrace } from '../utils/persistenceTrace';
import { getSampleBoardData } from '../utils/sampleBoardsData';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from './customInstructionsService';
import {
    getEffectiveBoardCardCount,
    hasBoardTitleMetadataPatch,
    normalizeBoardMetadataList,
    normalizeBoardTitleMeta,
    pickBoardTitleMetadata
} from './boardTitle/metadata';
import {
    BOARD_DISPLAY_SYNC_KEYS,
    pickBoardDisplayMetadata
} from './boardTitle/displayMetadata';
import {
    clearBoardShadowSnapshot,
    loadMostRecentBoardShadowSnapshot,
    pickMostRecentBoardSnapshot
} from './boardPersistence/localBoardShadow';
import {
    persistBoardsMetadataList,
    readBoardsMetadataListFromStorage
} from './boardPersistence/boardsListStorage';

const BOARD_PREFIX = 'mixboard_board_';
const CURRENT_BOARD_ID_KEY = 'mixboard_current_board_id';
const MAX_IDB_SAVE_RETRIES = 2;
const IDB_RETRY_DELAY_MS = 80;
const TITLE_METADATA_KEYS = ['name', 'nameSource', 'autoTitle', 'autoTitleGeneratedAt', 'manualTitleUpdatedAt'];
const BOARD_PERSISTED_METADATA_KEYS = [
    'summary',
    'backgroundImage',
    'thumbnail',
    'deletedAt',
    'autoImageTriggeredAt',
    'autoSummaryTriggeredAt',
    'autoImageCompletedAt',
    'autoSummaryCompletedAt'
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const loadLegacyBoardSnapshot = (id) => {
    try {
        const raw = localStorage.getItem(BOARD_PREFIX + id);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (error) {
        debugLog.error(`Legacy localStorage load failed for board ${id}`, error);
        return null;
    }
};

const clearLegacyBoardSnapshot = (id) => {
    try {
        localStorage.removeItem(BOARD_PREFIX + id);
    } catch {
        // Ignore cleanup failures for best-effort legacy recovery keys.
    }
};

const persistBoardToLegacyStorage = (id, payload) => {
    try {
        localStorage.setItem(BOARD_PREFIX + id, JSON.stringify(payload));
        debugLog.warn(`[Storage] IDB save failed, fallback to localStorage for board ${id}`);
        logPersistenceTrace('save:legacy-fallback', {
            boardId: id,
            cursor: buildBoardCursorTrace(payload)
        });
        return true;
    } catch (legacyErr) {
        debugLog.error(`[Storage] Legacy fallback save failed for board ${id}`, legacyErr);
        logPersistenceTrace('save:legacy-fallback-failed', {
            boardId: id,
            error: legacyErr
        });
        return false;
    }
};

export const getCurrentBoardId = () => sessionStorage.getItem(CURRENT_BOARD_ID_KEY);
export const setCurrentBoardId = (id) => {
    debugLog.storage(`Setting current board to: ${id}`);
    if (id) sessionStorage.setItem(CURRENT_BOARD_ID_KEY, id);
    else sessionStorage.removeItem(CURRENT_BOARD_ID_KEY);
};

// Emergency Synchronous Save for iOS/Safari Pagehide events
export const emergencyLocalSave = (id, data) => {
    if (!id || !data) return false;
    try {
        const timestamp = Date.now();
        const list = getRawBoardsList();
        const boardIndex = list.findIndex(b => b.id === id);
        const currentClientRevision = boardIndex >= 0 ? (list[boardIndex].clientRevision || 0) : 0;
        const effectiveClientRevision = data.clientRevision !== undefined ? data.clientRevision : currentClientRevision;
        const payload = {
            ...data,
            updatedAt: timestamp,
            clientRevision: effectiveClientRevision
        };

        // Save to fallback localStorage immediately (synchronous)
        localStorage.setItem(BOARD_PREFIX + id, JSON.stringify(payload));

        // Update list metadata
        if (boardIndex >= 0) {
            list[boardIndex] = normalizeBoardTitleMeta({
                ...list[boardIndex],
                updatedAt: timestamp,
                cardCount: getEffectiveBoardCardCount(data.cards),
                clientRevision: effectiveClientRevision
            });
            persistBoardsMetadataList(list, { reason: `emergencyLocalSave:${id}` });
        }
        debugLog.storage(`[Storage] Emergency synchronous local save for board ${id}`);
        return true;
    } catch (e) {
        debugLog.error(`[Storage] Emergency save failed for board ${id}`, e);
        return false;
    }
};


// Shared helper to get ALL boards (Active + Trash)
export const getRawBoardsList = () => {
    return readBoardsMetadataListFromStorage();
};

export const getBoardsList = () => {
    return getRawBoardsList().filter(b => !b.deletedAt);
};

export const getTrashBoards = () => {
    return getRawBoardsList().filter(b => b.deletedAt);
};

export const loadBoardsMetadata = () => {
    debugLog.storage('Loading boards metadata list');
    // Preserve the persisted list order as the authoritative gallery order.
    return getRawBoardsList();
};

export const createBoard = async (name) => {
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const newBoard = normalizeBoardTitleMeta({
        id: Date.now().toString(),
        name: normalizedName,
        nameSource: normalizedName ? 'manual' : 'placeholder',
        autoTitle: '',
        autoTitleGeneratedAt: 0,
        manualTitleUpdatedAt: normalizedName ? Date.now() : 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastAccessedAt: Date.now(),
        cardCount: 0,
        clientRevision: 0
    });
    debugLog.storage(`Creating new board: ${newBoard.name}`, { id: newBoard.id });
    const list = getRawBoardsList();
    const newList = normalizeBoardMetadataList([newBoard, ...list]);
    persistBoardsMetadataList(newList, { reason: `createBoard:${newBoard.id}` });
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
        list[boardIndex] = normalizeBoardTitleMeta({
            ...list[boardIndex],
            ...metadata,
            updatedAt: Date.now()
        });
        persistBoardsMetadataList(list, { reason: `updateBoardMetadata:${id}` });
        return true;
    }
    return false;
};

export const saveBoard = async (id, data) => {
    // data: { cards, connections, updatedAt? }
    const timestamp = Number.isFinite(Number(data?.updatedAt))
        ? Number(data.updatedAt)
        : Date.now();
    debugLog.storage(`Saving board: ${id}`, {
        cardsCount: data.cards?.length || 0,
        connectionsCount: data.connections?.length || 0,
        groupsCount: data.groups?.length || 0
    });

    const list = getRawBoardsList();
    const boardIndex = list.findIndex(b => b.id === id);
    const currentClientRevision = boardIndex >= 0 ? (list[boardIndex].clientRevision || 0) : 0;
    const effectiveClientRevision = data.clientRevision !== undefined ? data.clientRevision : currentClientRevision;
    const payload = {
        ...data,
        updatedAt: timestamp,
        clientRevision: effectiveClientRevision
    };
    logPersistenceTrace('save:start', {
        boardId: id,
        cursor: buildBoardCursorTrace(payload),
        source: 'local_persistence'
    });

    if (boardIndex >= 0) {
        BOARD_PERSISTED_METADATA_KEYS.forEach((key) => {
            if (!Object.prototype.hasOwnProperty.call(payload, key) && Object.prototype.hasOwnProperty.call(list[boardIndex], key)) {
                payload[key] = list[boardIndex][key];
            }
        });

        const nextBoardMeta = {
            ...list[boardIndex],
            updatedAt: timestamp,
            cardCount: getEffectiveBoardCardCount(data.cards),
            clientRevision: effectiveClientRevision
        };

        if (hasBoardTitleMetadataPatch(data)) {
            Object.assign(nextBoardMeta, pickBoardTitleMetadata({
                ...list[boardIndex],
                ...data
            }));
        } else {
            TITLE_METADATA_KEYS.forEach((key) => {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    nextBoardMeta[key] = data[key];
                }
            });
        }

        BOARD_PERSISTED_METADATA_KEYS.forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                nextBoardMeta[key] = data[key];
            }
        });

        list[boardIndex] = normalizeBoardTitleMeta(nextBoardMeta);
        persistBoardsMetadataList(list, { reason: `saveBoard:${id}` });
    }

    let lastError = null;
    for (let attempt = 1; attempt <= MAX_IDB_SAVE_RETRIES; attempt += 1) {
        try {
            await idbSet(BOARD_PREFIX + id, payload);
            localStorage.removeItem(BOARD_PREFIX + id);
            logPersistenceTrace('save:idb-success', {
                boardId: id,
                cursor: buildBoardCursorTrace(payload)
            });
            return;
        } catch (e) {
            lastError = e;
            debugLog.error(`[Storage] IDB save attempt ${attempt}/${MAX_IDB_SAVE_RETRIES} failed for board ${id}`, e);
            logPersistenceTrace('save:idb-retry-failed', {
                boardId: id,
                attempt,
                cursor: buildBoardCursorTrace(payload),
                error: e
            });
            if (attempt < MAX_IDB_SAVE_RETRIES) {
                await sleep(IDB_RETRY_DELAY_MS * attempt);
            }
        }
    }

    const fallbackOk = persistBoardToLegacyStorage(id, payload);
    if (!fallbackOk) {
        throw (lastError || new Error(`Failed to save board ${id}`));
    }
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

    const legacySnapshot = loadLegacyBoardSnapshot(id);
    const { snapshot: shadowSnapshot, source: shadowSource } = loadMostRecentBoardShadowSnapshot(id);
    const { snapshot: preferredSnapshot, source: preferredSource } = pickMostRecentBoardSnapshot([
        { snapshot: stored, source: 'idb' },
        { snapshot: legacySnapshot, source: 'legacy' },
        { snapshot: shadowSnapshot, source: shadowSource }
    ]);

    logPersistenceTrace('load:source-selection', {
        boardId: id,
        preferredSource,
        idb: buildBoardCursorTrace(stored),
        legacy: buildBoardCursorTrace(legacySnapshot),
        shadow: buildBoardCursorTrace(shadowSnapshot)
    });

    stored = preferredSnapshot;

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

    const list = getRawBoardsList();
    const boardIndex = list.findIndex((board) => board.id === id);
    if (boardIndex >= 0) {
        const boardMeta = list[boardIndex];
        BOARD_PERSISTED_METADATA_KEYS.forEach((key) => {
            if (!Object.prototype.hasOwnProperty.call(stored, key) && Object.prototype.hasOwnProperty.call(boardMeta, key)) {
                stored[key] = boardMeta[key];
            }
        });
    }

    if (preferredSource !== 'idb') {
        debugLog.storage(`[Storage] Recovering board ${id} from ${preferredSource}`);
        try {
            await saveBoard(id, stored);
            clearLegacyBoardSnapshot(id);
            clearBoardShadowSnapshot(id);
            debugLog.storage(`[Storage] Recovered board ${id} promoted back to durable storage from ${preferredSource}`);
            logPersistenceTrace('load:promotion-success', {
                boardId: id,
                preferredSource,
                cursor: buildBoardCursorTrace(stored)
            });
        } catch (migrationErr) {
            debugLog.error(`[Storage] Failed to promote recovered board ${id} from ${preferredSource}`, migrationErr);
            logPersistenceTrace('load:promotion-failed', {
                boardId: id,
                preferredSource,
                cursor: buildBoardCursorTrace(stored),
                error: migrationErr
            });
        }
    } else {
        if (legacySnapshot) {
            clearLegacyBoardSnapshot(id);
        }
        if (shadowSnapshot) {
            clearBoardShadowSnapshot(id);
        }
        logPersistenceTrace('load:idb-direct', {
            boardId: id,
            cursor: buildBoardCursorTrace(stored)
        });
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
        const nextList = getRawBoardsList();
        const nextBoardIndex = nextList.findIndex(b => b.id === id);
        let shouldPersistMetadataBackfill = false;
        if (nextBoardIndex >= 0) {
            const nextBoardMeta = {
                ...nextList[nextBoardIndex],
                lastAccessedAt: Date.now()
            };

            pickBoardDisplayMetadata(finalBoard);
            BOARD_DISPLAY_SYNC_KEYS.forEach((key) => {
                if (
                    Object.prototype.hasOwnProperty.call(finalBoard, key) &&
                    !Object.prototype.hasOwnProperty.call(nextBoardMeta, key)
                ) {
                    nextBoardMeta[key] = finalBoard[key];
                    shouldPersistMetadataBackfill = true;
                }
            });

            nextList[nextBoardIndex] = normalizeBoardTitleMeta(nextBoardMeta);
            persistBoardsMetadataList(nextList, {
                reason: shouldPersistMetadataBackfill
                    ? `loadBoard:metadata_backfill:${id}`
                    : `loadBoard:lastAccessed:${id}`
            });
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
        list[boardIndex] = normalizeBoardTitleMeta({ ...list[boardIndex], deletedAt: Date.now() });
        persistBoardsMetadataList(list, { reason: `deleteBoard:${id}` });
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
        list[boardIndex] = normalizeBoardTitleMeta(rest); // Remove deletedAt
        persistBoardsMetadataList(list, { reason: `restoreBoard:${id}` });
        return true;
    }
    return false;
};

export const permanentlyDeleteBoard = async (id) => {
    debugLog.storage(`Permanently deleting board: ${id}`);
    const list = getRawBoardsList();
    const newList = list.filter(b => b.id !== id);
    persistBoardsMetadataList(newList, { reason: `permanentlyDeleteBoard:${id}` });

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
