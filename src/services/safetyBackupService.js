import { idbGet, idbSet } from './db/indexedDB';
import { backupStoreDel, backupStoreGet, backupStoreSet } from './db/backupStore';
import { getBoardsList } from './storage';
import { normalizeBoardMetadataList, normalizeBoardTitleMeta } from './boardTitle/metadata';
import { persistBoardsMetadataList } from './boardPersistence/boardsListStorage';

export const SAFETY_BACKUP_META_KEY = 'mixboard_safety_backup';

const SAFETY_BACKUP_RECORD_KEY = 'safety_backup_latest';
const SAFETY_BACKUP_VERSION = 2;
const BOARD_PREFIX = 'mixboard_board_';

const readLegacyBoardSnapshot = (boardId) => {
    try {
        const raw = localStorage.getItem(`${BOARD_PREFIX}${boardId}`);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.error(`[SafetyBackup] Failed to parse legacy snapshot for board ${boardId}:`, error);
        return null;
    }
};

const readSafetyBackupMeta = () => {
    try {
        const raw = localStorage.getItem(SAFETY_BACKUP_META_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.error('[SafetyBackup] Failed to parse safety backup metadata:', error);
        return null;
    }
};

const writeSafetyBackupMeta = (meta) => {
    localStorage.setItem(SAFETY_BACKUP_META_KEY, JSON.stringify(meta));
};

const collectBoardSnapshot = async (boardMeta) => {
    const boardId = String(boardMeta.id);
    let data = null;

    try {
        data = await idbGet(`${BOARD_PREFIX}${boardId}`);
    } catch (error) {
        console.error(`[SafetyBackup] Failed to read board ${boardId} from IndexedDB:`, error);
    }

    if (!data) {
        data = readLegacyBoardSnapshot(boardId);
    }

    return {
        id: boardId,
        meta: normalizeBoardTitleMeta(boardMeta),
        data
    };
};

export const createSafetyBackup = async () => {
    const boards = getBoardsList();
    const boardSnapshots = await Promise.all(boards.map((boardMeta) => collectBoardSnapshot(boardMeta)));
    const backup = {
        id: SAFETY_BACKUP_RECORD_KEY,
        timestamp: Date.now(),
        version: SAFETY_BACKUP_VERSION,
        boards: boardSnapshots
    };

    await backupStoreSet(SAFETY_BACKUP_RECORD_KEY, backup);
    writeSafetyBackupMeta({
        id: SAFETY_BACKUP_RECORD_KEY,
        timestamp: backup.timestamp,
        version: SAFETY_BACKUP_VERSION,
        boardCount: boardSnapshots.length
    });

    return backup;
};

const restoreLegacySafetyBackup = async (legacyBackup) => {
    const currentBoards = getBoardsList();
    const mergedBoards = new Map(currentBoards.map((board) => [String(board.id), board]));
    let restoredCount = 0;
    let restoredCardsBoards = 0;

    if (Array.isArray(legacyBackup.boards)) {
        for (const board of legacyBackup.boards) {
            const normalizedBoard = normalizeBoardTitleMeta(board);
            if (normalizedBoard.deletedAt) {
                delete normalizedBoard.deletedAt;
            }
            mergedBoards.set(String(normalizedBoard.id), normalizedBoard);
            restoredCount += 1;
        }
    }

    if (legacyBackup.activeBoardData?.id) {
        await idbSet(`${BOARD_PREFIX}${legacyBackup.activeBoardData.id}`, legacyBackup.activeBoardData);
        restoredCardsBoards = 1;
    }

    persistBoardsMetadataList(
        normalizeBoardMetadataList(Array.from(mergedBoards.values())),
        { reason: 'safety-backup:legacy-restore' }
    );

    return {
        success: true,
        restoredBoardCount: restoredCount,
        restoredBoardContentCount: restoredCardsBoards
    };
};

export const restoreSafetyBackup = async () => {
    const meta = readSafetyBackupMeta();

    if (!meta) {
        throw new Error('No safety backup found');
    }

    if (!meta.id) {
        return restoreLegacySafetyBackup(meta);
    }

    const backup = await backupStoreGet(meta.id);
    if (!backup) {
        throw new Error('Safety backup data not found');
    }

    const mergedBoards = new Map(getBoardsList().map((board) => [String(board.id), board]));
    let restoredBoardCount = 0;
    let restoredBoardContentCount = 0;

    for (const snapshot of backup.boards || []) {
        const normalizedBoard = normalizeBoardTitleMeta(snapshot.meta || { id: snapshot.id });
        if (normalizedBoard.deletedAt) {
            delete normalizedBoard.deletedAt;
        }
        mergedBoards.set(String(normalizedBoard.id), normalizedBoard);
        restoredBoardCount += 1;

        if (snapshot.data) {
            await idbSet(`${BOARD_PREFIX}${snapshot.id}`, snapshot.data);
            restoredBoardContentCount += 1;
        }
    }

    persistBoardsMetadataList(
        normalizeBoardMetadataList(Array.from(mergedBoards.values())),
        { reason: 'safety-backup:restore' }
    );

    return {
        success: true,
        restoredBoardCount,
        restoredBoardContentCount,
        timestamp: backup.timestamp
    };
};

export const clearSafetyBackup = async () => {
    const meta = readSafetyBackupMeta();
    localStorage.removeItem(SAFETY_BACKUP_META_KEY);
    if (meta?.id) {
        await backupStoreDel(meta.id);
    }
};

export const hasSafetyBackup = () => {
    return !!localStorage.getItem(SAFETY_BACKUP_META_KEY);
};
