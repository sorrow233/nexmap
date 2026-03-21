import { idbSet } from '../db/indexedDB';
import { debugLog } from '../../utils/debugLogger';
import { buildBoardCursorTrace, logPersistenceTrace } from '../../utils/persistenceTrace';
import {
    getEffectiveBoardCardCount,
    hasBoardTitleMetadataPatch,
    normalizeBoardTitleMeta,
    pickBoardTitleMetadata
} from '../boardTitle/metadata';
import { persistBoardsMetadataList } from '../boardPersistence/boardsListStorage';
import {
    BOARD_PREFIX,
    BOARD_PERSISTED_METADATA_KEYS,
    IDB_RETRY_DELAY_MS,
    MAX_IDB_SAVE_RETRIES,
    TITLE_METADATA_KEYS
} from './constants';
import { getRawBoardsList } from './list';
import { persistBoardToLegacyStorage, sleep } from './shared';

export const emergencyLocalSave = (id, data) => {
    if (!id || !data) return false;

    try {
        const timestamp = Date.now();
        const list = getRawBoardsList();
        const boardIndex = list.findIndex(board => board.id === id);
        const currentClientRevision = boardIndex >= 0 ? (list[boardIndex].clientRevision || 0) : 0;
        const effectiveClientRevision = data.clientRevision !== undefined ? data.clientRevision : currentClientRevision;
        const payload = {
            ...data,
            updatedAt: timestamp,
            clientRevision: effectiveClientRevision
        };

        localStorage.setItem(BOARD_PREFIX + id, JSON.stringify(payload));

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
    } catch (error) {
        debugLog.error(`[Storage] Emergency save failed for board ${id}`, error);
        return false;
    }
};

export const saveBoard = async (id, data) => {
    const timestamp = Number.isFinite(Number(data?.updatedAt))
        ? Number(data.updatedAt)
        : Date.now();

    debugLog.storage(`Saving board: ${id}`, {
        cardsCount: data.cards?.length || 0,
        connectionsCount: data.connections?.length || 0,
        groupsCount: data.groups?.length || 0
    });

    const list = getRawBoardsList();
    const boardIndex = list.findIndex(board => board.id === id);
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
        } catch (error) {
            lastError = error;
            debugLog.error(`[Storage] IDB save attempt ${attempt}/${MAX_IDB_SAVE_RETRIES} failed for board ${id}`, error);
            logPersistenceTrace('save:idb-retry-failed', {
                boardId: id,
                attempt,
                cursor: buildBoardCursorTrace(payload),
                error
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
