import { idbGet } from '../db/indexedDB';
import { getRawBoardsList } from '../boardService';
import { debugLog } from '../../utils/debugLogger';
import { pickMostRecentBoardSnapshot } from '../boardPersistence/localBoardShadow';
import {
    toEpochMillis,
    toSafeClientRevision,
    toSafeSyncVersion
} from '../boardPersistence/persistenceCursor';
import {
    getEffectiveBoardCardCount,
    normalizeBoardMetadataList,
    normalizeBoardTitleMeta
} from '../boardTitle/metadata';

export const BOARD_PREFIX = 'mixboard_board_';
export const BOARDS_LIST_KEY = 'mixboard_boards_list';

export const ensureArray = (value) => (Array.isArray(value) ? value : []);

export const pickLocalArray = (storeValue, persistedValue) => {
    const storeArr = ensureArray(storeValue);
    const persistedArr = ensureArray(persistedValue);
    if (storeArr.length === 0 && persistedArr.length > 0) {
        return persistedArr;
    }
    return storeArr.length > 0 ? storeArr : persistedArr;
};

export const singleBoardSnapshotCursor = new Map();
export const singleBoardPatchCursor = new Map();
export const deprecatedBoardSnapshotCursor = new Map();

const loadLegacyBoardSnapshotForSync = (boardId) => {
    try {
        const raw = localStorage.getItem(BOARD_PREFIX + boardId);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (error) {
        debugLog.error(`[Sync] Legacy board snapshot load failed for ${boardId}`, error);
        return null;
    }
};

export const loadPersistedBoardSnapshotForSync = async (boardId) => {
    let idbSnapshot = null;
    try {
        idbSnapshot = await idbGet(BOARD_PREFIX + boardId);
    } catch (error) {
        debugLog.error(`[Sync] IDB board snapshot load failed for ${boardId}`, error);
    }

    const legacySnapshot = loadLegacyBoardSnapshotForSync(boardId);
    return pickMostRecentBoardSnapshot([
        { snapshot: idbSnapshot, source: 'idb' },
        { snapshot: legacySnapshot, source: 'legacy' }
    ]);
};

export const buildBoardMetadataListFromCloud = (allBoards = []) => {
    const existingLocalBoards = getRawBoardsList();
    return normalizeBoardMetadataList(
        allBoards
            .map((board) => {
                const idAsTimestamp = parseInt(board.id, 10);
                const recoveredCreatedAt = (!isNaN(idAsTimestamp) && idAsTimestamp > 1000000000000)
                    ? idAsTimestamp
                    : null;
                const existingLocal = existingLocalBoards.find((localBoard) => localBoard.id === board.id);
                const summaryToUse = board.summary || existingLocal?.summary;
                const thumbnailToUse = board.thumbnail || existingLocal?.thumbnail;
                const autoImageTriggeredAt = toEpochMillis(board.autoImageTriggeredAt) || toEpochMillis(existingLocal?.autoImageTriggeredAt) || 0;
                const cardCountValue = Number(board.cardCount);
                const cardCount = Number.isFinite(cardCountValue) && cardCountValue >= 0
                    ? cardCountValue
                    : getEffectiveBoardCardCount(board.cards);
                const updatedAt = toEpochMillis(board.updatedAt) || recoveredCreatedAt || 0;
                const createdAt = toEpochMillis(board.createdAt) || recoveredCreatedAt || updatedAt || 0;
                const lastAccessedAt = toEpochMillis(board.lastAccessedAt) || updatedAt || createdAt || 0;

                return normalizeBoardTitleMeta({
                    id: board.id,
                    name: typeof board.name === 'string' ? board.name : '',
                    nameSource: board.nameSource,
                    autoTitle: board.autoTitle,
                    autoTitleGeneratedAt: board.autoTitleGeneratedAt,
                    manualTitleUpdatedAt: board.manualTitleUpdatedAt,
                    createdAt,
                    updatedAt,
                    lastAccessedAt,
                    cardCount,
                    syncVersion: toSafeSyncVersion(board.syncVersion),
                    clientRevision: toSafeClientRevision(board.clientRevision),
                    deletedAt: board.deletedAt,
                    backgroundImage: board.backgroundImage,
                    thumbnail: thumbnailToUse,
                    summary: summaryToUse,
                    autoImageTriggeredAt
                });
            })
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    );
};
