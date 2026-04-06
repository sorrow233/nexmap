/**
 * Scheduled Backup Service
 * 
 * Provides automatic local backups every 30 minutes while the user is online.
 * Keeps backups for 7 days.
 * 
 * These backups are completely local and are not affected by login state.
 */

import { idbGet, idbSet } from './db/indexedDB';
import { getRawBoardsList } from './boardService';
import { debugLog } from '../utils/debugLogger';
import { normalizeBoardMetadataList, normalizeBoardTitleMeta } from './boardTitle/metadata';
import { persistBoardsMetadataList } from './boardPersistence/boardsListStorage';
import { backupStoreDel, backupStoreGet, backupStoreSet } from './db/backupStore';

const BACKUP_KEY_PREFIX = 'scheduled_backup_';
const BACKUP_INDEX_KEY = 'scheduled_backup_index';
const LAST_BACKUP_TIME_KEY = 'scheduled_backup_last_time';
const LAST_BACKUP_FINGERPRINT_KEY = 'scheduled_backup_last_fingerprint';
const MAX_BACKUP_DAYS = 7;
const BACKUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_BACKUPS = 12;
const MAX_TOTAL_BACKUP_BYTES = 512 * 1024 * 1024;

let checkIntervalId = null;

/**
 * Generate a unique backup ID based on timestamp
 */
const generateBackupId = (timestamp = Date.now()) => {
    return `${BACKUP_KEY_PREFIX}${timestamp}`;
};

const parseBackupTimestamp = (backupId, fallback = 0) => {
    if (typeof backupId !== 'string') return fallback;
    const raw = backupId.startsWith(BACKUP_KEY_PREFIX)
        ? backupId.slice(BACKUP_KEY_PREFIX.length)
        : '';
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeBackupIdList = (index = []) => Array.from(new Set(
    Array.isArray(index) ? index.filter((id) => typeof id === 'string' && id.startsWith(BACKUP_KEY_PREFIX)) : []
)).sort((a, b) => parseBackupTimestamp(a) - parseBackupTimestamp(b));

const hashString = (input = '') => {
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
};

const buildBoardBackupFingerprint = (boardMeta = {}, boardData = {}) => {
    const boardId = String(boardMeta?.id || boardData?.id || '');
    const boardUpdatedAt = Number(boardMeta?.updatedAt) || 0;
    const boardRevision = Number(boardMeta?.clientRevision) || 0;
    const boardDeletedAt = Number(boardMeta?.deletedAt) || 0;
    const boardCardCount = Number(boardMeta?.cardCount) || 0;
    const dataUpdatedAt = Number(boardData?.updatedAt) || 0;
    const dataRevision = Number(boardData?.clientRevision) || 0;
    const cardsCount = Array.isArray(boardData?.cards) ? boardData.cards.length : 0;
    const connectionsCount = Array.isArray(boardData?.connections) ? boardData.connections.length : 0;
    const groupsCount = Array.isArray(boardData?.groups) ? boardData.groups.length : 0;
    const backgroundLength = typeof boardData?.backgroundImage === 'string' ? boardData.backgroundImage.length : 0;

    return [
        boardId,
        boardUpdatedAt,
        boardRevision,
        boardDeletedAt,
        boardCardCount,
        dataUpdatedAt,
        dataRevision,
        cardsCount,
        connectionsCount,
        groupsCount,
        backgroundLength
    ].join(':');
};

const buildBackupFingerprint = (boardsList = [], boardsData = {}, settingsSignature = '') => {
    const boardFingerprints = boardsList
        .map((boardMeta) => buildBoardBackupFingerprint(boardMeta, boardsData?.[boardMeta?.id]))
        .sort()
        .join('|');

    return hashString(`${boardFingerprints}::${settingsSignature || ''}`);
};

const measureBackupSizeBytes = (backup) => {
    try {
        return new Blob([JSON.stringify(backup)]).size;
    } catch (error) {
        console.warn('[ScheduledBackup] Failed to measure backup size', error);
        return 0;
    }
};

const resolveBackupSizeBytes = async (backupId, backup) => {
    const existingSize = Number(backup?.sizeBytes);
    if (Number.isFinite(existingSize) && existingSize > 0) {
        return existingSize;
    }

    const sizeBytes = measureBackupSizeBytes(backup);
    if (sizeBytes > 0 && backupId && backup) {
        try {
            await backupStoreSet(backupId, {
                ...backup,
                sizeBytes
            });
        } catch (error) {
            console.warn(`[ScheduledBackup] Failed to persist size metadata for ${backupId}`, error);
        }
    }
    return sizeBytes;
};

const syncLatestBackupRuntimeMarkers = async (latestBackupId = '') => {
    if (!latestBackupId) {
        localStorage.removeItem(LAST_BACKUP_TIME_KEY);
        localStorage.removeItem(LAST_BACKUP_FINGERPRINT_KEY);
        return;
    }

    try {
        const latestBackup = await backupStoreGet(latestBackupId);
        const timestamp = Number(latestBackup?.timestamp) || parseBackupTimestamp(latestBackupId, Date.now());
        localStorage.setItem(LAST_BACKUP_TIME_KEY, String(timestamp));

        const fingerprint = typeof latestBackup?.fingerprint === 'string'
            ? latestBackup.fingerprint.trim()
            : '';
        if (fingerprint) {
            localStorage.setItem(LAST_BACKUP_FINGERPRINT_KEY, fingerprint);
        } else {
            localStorage.removeItem(LAST_BACKUP_FINGERPRINT_KEY);
        }
    } catch (error) {
        console.warn('[ScheduledBackup] Failed to sync latest runtime markers', error);
    }
};

/**
 * Get the next scheduled backup time (30 minutes from last backup)
 */
export const getNextBackupTime = () => {
    const lastBackupTime = localStorage.getItem(LAST_BACKUP_TIME_KEY);
    const lastTime = lastBackupTime ? parseInt(lastBackupTime, 10) : Date.now();
    return new Date(lastTime + BACKUP_INTERVAL_MS);
};

/**
 * Check if a backup should be performed now (every 30 minutes)
 */
const shouldBackupNow = async () => {
    const lastBackupTime = localStorage.getItem(LAST_BACKUP_TIME_KEY);

    // If no backup has been performed yet, we should backup
    if (!lastBackupTime) {
        return true;
    }

    const lastTime = parseInt(lastBackupTime, 10);
    const elapsed = Date.now() - lastTime;

    // Backup if 30 minutes have passed since the last backup
    return elapsed >= BACKUP_INTERVAL_MS;
};

/**
 * Get the backup index (list of backup IDs)
 */
const getBackupIndex = async () => {
    try {
        const index = await backupStoreGet(BACKUP_INDEX_KEY);
        return normalizeBackupIdList(index);
    } catch (e) {
        console.error('[ScheduledBackup] Failed to get backup index:', e);
        return [];
    }
};

/**
 * Save the backup index
 */
const saveBackupIndex = async (index) => {
    try {
        await backupStoreSet(BACKUP_INDEX_KEY, normalizeBackupIdList(index));
    } catch (e) {
        console.error('[ScheduledBackup] Failed to save backup index:', e);
    }
};

export const cleanupScheduledBackups = async (options = {}) => {
    const maxBackups = Number.isFinite(Number(options.maxBackups))
        ? Math.max(0, Number(options.maxBackups))
        : MAX_BACKUPS;
    const maxAgeDays = Number.isFinite(Number(options.maxAgeDays))
        ? Math.max(0, Number(options.maxAgeDays))
        : MAX_BACKUP_DAYS;
    const maxTotalBytes = Number.isFinite(Number(options.maxTotalBytes))
        ? Math.max(0, Number(options.maxTotalBytes))
        : MAX_TOTAL_BACKUP_BYTES;

    let index = await getBackupIndex();
    const deletedBackupIds = [];
    let reclaimedBytes = 0;

    const now = Date.now();
    const retentionCutoff = maxAgeDays > 0
        ? now - (maxAgeDays * 24 * 60 * 60 * 1000)
        : Number.POSITIVE_INFINITY;

    const retainedByAge = [];
    for (const backupId of index) {
        const backupTimestamp = parseBackupTimestamp(backupId);
        if (backupTimestamp > 0 && backupTimestamp < retentionCutoff) {
            await backupStoreDel(backupId);
            deletedBackupIds.push(backupId);
            continue;
        }
        retainedByAge.push(backupId);
    }
    index = retainedByAge;

    while (index.length > maxBackups) {
        const oldestId = index.shift();
        if (!oldestId) break;
        await backupStoreDel(oldestId);
        deletedBackupIds.push(oldestId);
    }

    let totalBytes = 0;
    if (maxTotalBytes > 0 && index.length > 0) {
        const sizedBackups = [];
        for (const backupId of index) {
            const backup = await backupStoreGet(backupId);
            if (!backup) {
                await backupStoreDel(backupId);
                deletedBackupIds.push(backupId);
                continue;
            }

            const timestamp = Number(backup.timestamp) || parseBackupTimestamp(backupId, 0);
            const sizeBytes = await resolveBackupSizeBytes(backupId, backup);
            totalBytes += sizeBytes;
            sizedBackups.push({
                id: backupId,
                timestamp,
                sizeBytes
            });
        }

        sizedBackups.sort((a, b) => a.timestamp - b.timestamp);
        while (totalBytes > maxTotalBytes && sizedBackups.length > 1) {
            const oldestBackup = sizedBackups.shift();
            if (!oldestBackup) break;
            await backupStoreDel(oldestBackup.id);
            deletedBackupIds.push(oldestBackup.id);
            reclaimedBytes += oldestBackup.sizeBytes;
            totalBytes -= oldestBackup.sizeBytes;
        }

        index = sizedBackups.map((backup) => backup.id);
    }

    await saveBackupIndex(index);
    await syncLatestBackupRuntimeMarkers(index[index.length - 1] || '');

    return {
        deletedBackupIds,
        deletedCount: deletedBackupIds.length,
        remainingBackupCount: index.length,
        reclaimedBytes,
        totalBytes
    };
};

export const clearScheduledBackups = async ({ preserveLatest = false } = {}) => {
    const index = await getBackupIndex();
    const retainedIds = preserveLatest && index.length > 0
        ? [index[index.length - 1]]
        : [];
    const idsToDelete = preserveLatest
        ? index.slice(0, -1)
        : index;

    for (const backupId of idsToDelete) {
        await backupStoreDel(backupId);
    }

    await saveBackupIndex(retainedIds);
    await syncLatestBackupRuntimeMarkers(retainedIds[retainedIds.length - 1] || '');

    return {
        deletedCount: idsToDelete.length,
        remainingBackupCount: retainedIds.length
    };
};

export const getScheduledBackupStorageStats = async () => {
    const index = await getBackupIndex();
    let totalBytes = 0;
    let oldestTimestamp = 0;
    let latestTimestamp = 0;

    for (const backupId of index) {
        const backup = await backupStoreGet(backupId);
        if (!backup) {
            continue;
        }
        const timestamp = Number(backup.timestamp) || parseBackupTimestamp(backupId, 0);
        const sizeBytes = await resolveBackupSizeBytes(backupId, backup);
        totalBytes += sizeBytes;

        if (!oldestTimestamp || timestamp < oldestTimestamp) {
            oldestTimestamp = timestamp;
        }
        if (timestamp > latestTimestamp) {
            latestTimestamp = timestamp;
        }
    }

    return {
        count: index.length,
        totalBytes,
        oldestTimestamp,
        latestTimestamp,
        maxBackups: MAX_BACKUPS,
        maxTotalBytes: MAX_TOTAL_BACKUP_BYTES
    };
};

/**
 * Perform a full backup of all user data
 */
export const performScheduledBackup = async () => {
    try {
        const backupId = generateBackupId();
        debugLog.storage(`[ScheduledBackup] Starting backup: ${backupId}`);

        // 1. Get all board metadata
        const boardsList = getRawBoardsList();

        // 2. Load full content for each board
        const boardsData = {};
        for (const board of boardsList) {
            try {
                const content = await idbGet(`mixboard_board_${board.id}`);
                if (content) {
                    boardsData[board.id] = content;
                }
            } catch (e) {
                console.error(`[ScheduledBackup] Failed to read board ${board.id}:`, e);
            }
        }

        // 3. Get settings
        let settings = null;
        let settingsSignature = '';
        try {
            const settingsStr = localStorage.getItem('mixboard_settings');
            if (settingsStr) {
                settings = JSON.parse(settingsStr);
                settingsSignature = settingsStr;
            }
        } catch (e) {
            // Settings backup is optional
        }

        const fingerprint = buildBackupFingerprint(boardsList, boardsData, settingsSignature);
        const lastFingerprint = localStorage.getItem(LAST_BACKUP_FINGERPRINT_KEY) || '';
        if (lastFingerprint && fingerprint === lastFingerprint) {
            localStorage.setItem(LAST_BACKUP_TIME_KEY, Date.now().toString());
            debugLog.storage('[ScheduledBackup] Skipped backup because board data has not changed since the last snapshot.');
            return { success: true, skipped: true, reason: 'unchanged' };
        }

        // 4. Create backup object
        const backup = {
            id: backupId,
            timestamp: Date.now(),
            boardsList: boardsList,
            boardsData: boardsData,
            settings: settings,
            version: 2,
            fingerprint
        };
        backup.sizeBytes = measureBackupSizeBytes(backup);

        // 5. Save backup
        await backupStoreSet(backupId, backup);

        // 6. Update last backup time
        localStorage.setItem(LAST_BACKUP_TIME_KEY, Date.now().toString());
        localStorage.setItem(LAST_BACKUP_FINGERPRINT_KEY, fingerprint);

        // 7. Update index
        let index = await getBackupIndex();
        if (!index.includes(backupId)) {
            index.push(backupId);
        }
        await saveBackupIndex(index);

        // 8. Cleanup old backups
        await cleanupScheduledBackups();

        debugLog.storage(`[ScheduledBackup] Backup complete: ${backupId}, boards: ${boardsList.length}`);

        return { success: true, backupId, boardCount: boardsList.length };
    } catch (e) {
        console.error('[ScheduledBackup] Backup failed:', e);
        return { success: false, error: e.message };
    }
};

/**
 * Get list of all available backups with metadata
 */
export const getBackupHistory = async () => {
    try {
        const index = await getBackupIndex();
        const backups = [];

        for (const backupId of index) {
            try {
                const backup = await backupStoreGet(backupId);
                if (backup) {
                    const timestamp = Number(backup.timestamp) || parseBackupTimestamp(backupId, 0);
                    backups.push({
                        id: backupId,
                        timestamp,
                        boardCount: backup.boardsList?.length || 0,
                        sizeBytes: await resolveBackupSizeBytes(backupId, backup),
                        formattedDate: new Date(timestamp).toLocaleString()
                    });
                }
            } catch (e) {
                // Skip unreadable backups
            }
        }

        // Return newest first
        return backups.sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
        console.error('[ScheduledBackup] Failed to get backup history:', e);
        return [];
    }
};

/**
 * Restore data from a specific backup
 * Restores board metadata and card content from a snapshot.
 * Existing boards with the same ID are overwritten with the backed-up content.
 */
export const restoreFromBackup = async (backupId) => {
    try {
        debugLog.storage(`[ScheduledBackup] Restoring from backup: ${backupId}`);

        const backup = await backupStoreGet(backupId);
        if (!backup) {
            throw new Error('Backup not found');
        }

        const currentBoardsStr = localStorage.getItem('mixboard_boards_list');
        const currentBoards = currentBoardsStr ? JSON.parse(currentBoardsStr) : [];
        const mergedBoards = new Map(currentBoards.map((board) => [String(board.id), board]));
        let restoredMetadataCount = 0;
        let restoredContentCount = 0;

        for (const board of backup.boardsList || []) {
            const boardId = String(board.id);
            const normalizedBoard = normalizeBoardTitleMeta(board);
            if (normalizedBoard.deletedAt) {
                delete normalizedBoard.deletedAt;
            }
            mergedBoards.set(boardId, normalizedBoard);
            restoredMetadataCount += 1;

            if (backup.boardsData?.[boardId]) {
                await idbSet(`mixboard_board_${boardId}`, backup.boardsData[boardId]);
                restoredContentCount += 1;
            }
        }

        if (restoredMetadataCount > 0) {
            persistBoardsMetadataList(
                normalizeBoardMetadataList(Array.from(mergedBoards.values())),
                { reason: 'restoreFromBackup' }
            );
        }

        debugLog.storage(`[ScheduledBackup] Restore complete: metadata=${restoredMetadataCount}, content=${restoredContentCount}`);

        return {
            success: true,
            boardCount: restoredMetadataCount,
            restoredBoardContentCount: restoredContentCount,
            timestamp: backup.timestamp,
            message: restoredMetadataCount > 0
                ? `Restored ${restoredMetadataCount} boards and ${restoredContentCount} board snapshots`
                : 'Backup contained no boards to restore'
        };
    } catch (e) {
        console.error('[ScheduledBackup] Restore failed:', e);
        return { success: false, error: e.message };
    }
};

/**
 * Delete a specific backup
 */
export const deleteBackup = async (backupId) => {
    try {
        await backupStoreDel(backupId);

        let index = await getBackupIndex();
        index = index.filter(id => id !== backupId);
        await saveBackupIndex(index);
        await syncLatestBackupRuntimeMarkers(index[index.length - 1] || '');

        debugLog.storage(`[ScheduledBackup] Deleted backup: ${backupId}`);
        return { success: true };
    } catch (e) {
        console.error('[ScheduledBackup] Delete failed:', e);
        return { success: false, error: e.message };
    }
};

/**
 * Check and perform backup if needed (called periodically)
 */
export const checkAndPerformBackup = async () => {
    try {
        if (await shouldBackupNow()) {
            debugLog.storage('[ScheduledBackup] Scheduled time reached, performing backup...');
            return await performScheduledBackup();
        }
        return { success: true, skipped: true };
    } catch (e) {
        console.error('[ScheduledBackup] Check failed:', e);
        return { success: false, error: e.message };
    }
};

/**
 * Initialize the scheduled backup system
 * Call this on app startup
 */
export const initScheduledBackup = () => {
    // Clear any existing interval
    if (checkIntervalId) {
        clearInterval(checkIntervalId);
    }

    const nextBackup = getNextBackupTime();
    debugLog.storage(`[ScheduledBackup] Initialized. Next backup at: ${nextBackup.toLocaleString()}`);

    // Prune stale backups before the first scheduled run so old devices recover space immediately.
    void (async () => {
        await cleanupScheduledBackups();
        await checkAndPerformBackup();
    })();

    // Check every 5 minutes if we need to backup (every 30 mins actual backup)
    // This is more reliable than scheduling exact times (handles sleep/wake, tab focus, etc.)
    checkIntervalId = setInterval(() => {
        void checkAndPerformBackup();
    }, 5 * 60 * 1000); // Check every 5 minutes, backup every 30 minutes

    return {
        nextBackupTime: nextBackup,
        checkIntervalMs: 5 * 60 * 1000,
        backupIntervalMs: BACKUP_INTERVAL_MS
    };
};

/**
 * Force an immediate backup (manual trigger)
 */
export const forceBackup = async () => {
    debugLog.storage('[ScheduledBackup] Manual backup triggered');
    return await performScheduledBackup();
};

// Export for debugging via console
if (typeof window !== 'undefined') {
    window.ScheduledBackupService = {
        init: initScheduledBackup,
        forceBackup,
        getHistory: getBackupHistory,
        restore: restoreFromBackup,
        delete: deleteBackup,
        checkAndPerformBackup,
        getNextBackupTime
    };
}
