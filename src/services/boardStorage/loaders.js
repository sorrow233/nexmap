import { idbGet } from '../db/indexedDB';
import { debugLog } from '../../utils/debugLogger';
import { buildBoardCursorTrace, logPersistenceTrace } from '../../utils/persistenceTrace';
import { getSampleBoardData } from '../../utils/sampleBoardsData';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../customInstructionsService';
import {
    BOARD_DISPLAY_SYNC_KEYS,
    pickBoardDisplayMetadata
} from '../boardTitle/displayMetadata';
import { normalizeBoardTitleMeta } from '../boardTitle/metadata';
import {
    clearBoardShadowSnapshot,
    loadMostRecentBoardShadowSnapshot,
    pickMostRecentBoardSnapshot
} from '../boardPersistence/localBoardShadow';
import { persistBoardsMetadataList } from '../boardPersistence/boardsListStorage';
import { BOARD_PERSISTED_METADATA_KEYS, BOARD_PREFIX } from './constants';
import { getRawBoardsList } from './list';
import { saveBoard } from './persistence';
import { clearLegacyBoardSnapshot, loadLegacyBoardSnapshot } from './shared';

const createEmptyBoardPayload = () => ({
    cards: [],
    connections: [],
    groups: [],
    boardPrompts: [],
    boardInstructionSettings: normalizeBoardInstructionSettings(DEFAULT_BOARD_INSTRUCTION_SETTINGS)
});

export const loadBoard = async (id) => {
    debugLog.storage(`Loading board: ${id}`);

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
    } catch (error) {
        debugLog.error(`IDB read failed for board ${id}`, error);
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
        return createEmptyBoardPayload();
    }

    const list = getRawBoardsList();
    const boardIndex = list.findIndex(board => board.id === id);
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

    const finalBoard = stored;

    if (finalBoard) {
        const nextList = getRawBoardsList();
        const nextBoardIndex = nextList.findIndex(board => board.id === id);
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

export const loadBoardDataForSearch = async (id) => {
    try {
        let stored = await idbGet(BOARD_PREFIX + id);
        if (!stored) {
            const legacy = localStorage.getItem(BOARD_PREFIX + id);
            if (legacy) stored = JSON.parse(legacy);
        }
        return stored;
    } catch (error) {
        console.warn(`[Search] Failed to load board ${id}`, error);
        return null;
    }
};
