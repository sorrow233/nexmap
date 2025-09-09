/**
 * Scheduled Backup Service
 * 
 * Provides automatic local backups at fixed times (3:00 AM and 4:00 PM daily).
 * Keeps backups for 5 days (max 10 snapshots).
 * 
 * This is INDEPENDENT of cloud sync - cloud operations do not affect these backups.
 */

import { idbGet, idbSet, idbDel } from './db/indexedDB';
import { getRawBoardsList } from './boardService';
import { debugLog } from '../utils/debugLogger';

const BACKUP_KEY_PREFIX = 'scheduled_backup_';
const BACKUP_INDEX_KEY = 'scheduled_backup_index';
const MAX_BACKUP_DAYS = 5;
const MAX_BACKUPS = MAX_BACKUP_DAYS * 2; // 2 backups per day

// Backup schedule: 3:00 and 16:00 (4PM)
const BACKUP_HOURS = [3, 16];

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
 * Get the next scheduled backup time
 */
export const getNextBackupTime = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Find the next backup hour
    for (const hour of BACKUP_HOURS) {
        const backupTime = new Date(today.getTime() + hour * 60 * 60 * 1000);
        if (backupTime > now) {
            return backupTime;
        }
    }

    // If all today's backup times passed, return first backup time tomorrow
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    return new Date(tomorrow.getTime() + BACKUP_HOURS[0] * 60 * 60 * 1000);
};

/**
 * Check if a backup should be performed now
 */
const shouldBackupNow = async () => {
    const now = new Date();
    const currentHour = now.getHours();

    // Only backup at scheduled hours
    if (!BACKUP_HOURS.includes(currentHour)) {
        return false;
    }

    // Check if we already have a backup for this time slot
    const backupId = generateBackupId();
    const index = await getBackupIndex();

    return !index.includes(backupId);
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

        // 6. Update index
        let index = await getBackupIndex();
        if (!index.includes(backupId)) {
            index.push(backupId);
            index.sort(); // Keep sorted by date/time
        }
        await saveBackupIndex(index);

        // 7. Cleanup old backups
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

        // Also remove backups older than 5 days
        const fiveDaysAgo = Date.now() - (MAX_BACKUP_DAYS * 24 * 60 * 60 * 1000);
        const validBackups = [];

        for (const backupId of index) {
            try {
                const backup = await idbGet(backupId);
                if (backup && backup.timestamp && backup.timestamp >= fiveDaysAgo) {
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
 */
export const restoreFromBackup = async (backupId) => {
    try {
        debugLog.storage(`[ScheduledBackup] Restoring from backup: ${backupId}`);

        const backup = await idbGet(backupId);
        if (!backup) {
            throw new Error('Backup not found');
        }

        // 1. Restore boards list
        if (backup.boardsList) {
            localStorage.setItem('mixboard_boards_list', JSON.stringify(backup.boardsList));
        }

        // 2. Restore each board's content
        if (backup.boardsData) {
            for (const [boardId, content] of Object.entries(backup.boardsData)) {
                await idbSet(`mixboard_board_${boardId}`, content);
            }
        }

        debugLog.storage(`[ScheduledBackup] Restore complete: ${backup.boardsList?.length || 0} boards`);

        return {
            success: true,
            boardCount: backup.boardsList?.length || 0,
            timestamp: backup.timestamp
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

    // Check every 5 minutes if we need to backup
    // This is more reliable than scheduling exact times (handles sleep/wake, tab focus, etc.)
    checkIntervalId = setInterval(() => {
        checkAndPerformBackup();
    }, 5 * 60 * 1000); // 5 minutes

    return {
        nextBackupTime: nextBackup,
        checkIntervalMs: 5 * 60 * 1000
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
