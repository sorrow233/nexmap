/**
 * Scheduled Backup Service
 * 
 * Provides automatic local backups every 30 minutes while the user is online.
 * Keeps backups for 7 days.
 * 
 * This is INDEPENDENT of cloud sync - cloud operations do not affect these backups.
 */

import { idbGet, idbSet, idbDel } from './db/indexedDB';
import { getRawBoardsList } from './boardService';
import { debugLog } from '../utils/debugLogger';

const BACKUP_KEY_PREFIX = 'scheduled_backup_';
const BACKUP_INDEX_KEY = 'scheduled_backup_index';
const LAST_BACKUP_TIME_KEY = 'scheduled_backup_last_time';
const MAX_BACKUP_DAYS = 7;
const BACKUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_BACKUPS = MAX_BACKUP_DAYS * 24 * 2; // Max possible backups in 7 days at 30min intervals (theoretical max)

let checkIntervalId = null;

/**
 * Generate a unique backup ID based on timestamp
 */
const generateBackupId = (timestamp = Date.now()) => {
    const date = new Date(timestamp);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const hour = date.getHours();
    return `${BACKUP_KEY_PREFIX}${dateStr}_${hour.toString().padStart(2, '0')}`;
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
        const index = await idbGet(BACKUP_INDEX_KEY);
        return Array.isArray(index) ? index : [];
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
        await idbSet(BACKUP_INDEX_KEY, index);
    } catch (e) {
        console.error('[ScheduledBackup] Failed to save backup index:', e);
    }
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
        try {
            const settingsStr = localStorage.getItem('mixboard_settings');
            if (settingsStr) {
                settings = JSON.parse(settingsStr);
            }
        } catch (e) {
            // Settings backup is optional
        }

        // 4. Create backup object
        const backup = {
            id: backupId,
            timestamp: Date.now(),
            boardsList: boardsList,
            boardsData: boardsData,
            settings: settings,
            version: 1
        };

        // 5. Save backup
        await idbSet(backupId, backup);

        // 6. Update last backup time
        localStorage.setItem(LAST_BACKUP_TIME_KEY, Date.now().toString());

        // 7. Update index
        let index = await getBackupIndex();
        if (!index.includes(backupId)) {
            index.push(backupId);
            index.sort(); // Keep sorted by date/time
        }
        await saveBackupIndex(index);

        // 8. Cleanup old backups
        await cleanupOldBackups();

        debugLog.storage(`[ScheduledBackup] Backup complete: ${backupId}, boards: ${boardsList.length}`);

        return { success: true, backupId, boardCount: boardsList.length };
    } catch (e) {
        console.error('[ScheduledBackup] Backup failed:', e);
        return { success: false, error: e.message };
    }
};

/**
 * Clean up backups older than MAX_BACKUP_DAYS
 */
const cleanupOldBackups = async () => {
    try {
        let index = await getBackupIndex();

        // If we have more than MAX_BACKUPS, remove oldest ones
        while (index.length > MAX_BACKUPS) {
            const oldestId = index.shift();
            await idbDel(oldestId);
            debugLog.storage(`[ScheduledBackup] Removed old backup: ${oldestId}`);
        }

        // Also remove backups older than 7 days
        const sevenDaysAgo = Date.now() - (MAX_BACKUP_DAYS * 24 * 60 * 60 * 1000);
        const validBackups = [];

        for (const backupId of index) {
            try {
                const backup = await idbGet(backupId);
                if (backup && backup.timestamp && backup.timestamp >= sevenDaysAgo) {
                    validBackups.push(backupId);
                } else {
                    await idbDel(backupId);
                    debugLog.storage(`[ScheduledBackup] Removed expired backup: ${backupId}`);
                }
            } catch (e) {
                // If we can't read it, try to delete it
                await idbDel(backupId);
            }
        }

        await saveBackupIndex(validBackups);
    } catch (e) {
        console.error('[ScheduledBackup] Cleanup failed:', e);
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
                const backup = await idbGet(backupId);
                if (backup) {
                    backups.push({
                        id: backupId,
                        timestamp: backup.timestamp,
                        boardCount: backup.boardsList?.length || 0,
                        formattedDate: new Date(backup.timestamp).toLocaleString()
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
 * Only restores boards that the user doesn't currently have (non-destructive merge)
 */
export const restoreFromBackup = async (backupId) => {
    try {
        debugLog.storage(`[ScheduledBackup] Restoring from backup: ${backupId}`);

        const backup = await idbGet(backupId);
        if (!backup) {
            throw new Error('Backup not found');
        }

        // Get current boards list
        const currentBoardsStr = localStorage.getItem('mixboard_boards_list');
        const currentBoards = currentBoardsStr ? JSON.parse(currentBoardsStr) : [];
        const currentBoardIds = new Set(currentBoards.map(b => String(b.id)));

        let restoredCount = 0;
        const restoredBoards = [];

        // 1. Only add boards that don't exist in current list
        if (backup.boardsList) {
            for (const board of backup.boardsList) {
                const boardId = String(board.id);
                if (!currentBoardIds.has(boardId)) {
                    // This board doesn't exist in current data, restore it
                    restoredBoards.push(board);
                    currentBoardIds.add(boardId);
                    restoredCount++;
                }
            }

            // Merge and save boards list
            if (restoredBoards.length > 0) {
                const mergedBoards = [...currentBoards, ...restoredBoards];
                localStorage.setItem('mixboard_boards_list', JSON.stringify(mergedBoards));
            }
        }

        // 2. Restore board content only for newly restored boards
        if (backup.boardsData && restoredBoards.length > 0) {
            for (const board of restoredBoards) {
                const boardId = String(board.id);
                if (backup.boardsData[boardId]) {
                    await idbSet(`mixboard_board_${boardId}`, backup.boardsData[boardId]);
                }
            }
        }

        debugLog.storage(`[ScheduledBackup] Restore complete: ${restoredCount} boards restored (non-destructive merge)`);

        return {
            success: true,
            boardCount: restoredCount,
            timestamp: backup.timestamp,
            message: restoredCount > 0
                ? `Restored ${restoredCount} missing boards`
                : 'No new boards to restore - all boards already exist'
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
        await idbDel(backupId);

        let index = await getBackupIndex();
        index = index.filter(id => id !== backupId);
        await saveBackupIndex(index);

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

    // Perform initial check
    checkAndPerformBackup();

    // Check every 5 minutes if we need to backup (every 30 mins actual backup)
    // This is more reliable than scheduling exact times (handles sleep/wake, tab focus, etc.)
    checkIntervalId = setInterval(() => {
        checkAndPerformBackup();
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
