export const BACKUP_KEY_PREFIX = 'scheduled_backup_';
export const BACKUP_INDEX_KEY = 'scheduled_backup_index';
export const LAST_BACKUP_TIME_KEY = 'scheduled_backup_last_time';
export const LAST_BACKUP_FINGERPRINT_KEY = 'scheduled_backup_last_fingerprint';
export const BACKUP_INTERVAL_MS = 30 * 60 * 1000;
export const MAX_BACKUP_DAYS = 3;
export const MAX_BACKUPS = 3;
export const MAX_TOTAL_BACKUP_BYTES = 512 * 1024 * 1024;

const DAY_MS = 24 * 60 * 60 * 1000;

export const getBackupDayStartTimestamp = (timestamp = Date.now()) => {
    const numericTimestamp = Number(timestamp);
    if (!Number.isFinite(numericTimestamp) || numericTimestamp <= 0) {
        return 0;
    }

    const date = new Date(numericTimestamp);
    if (Number.isNaN(date.getTime())) {
        return 0;
    }

    date.setHours(0, 0, 0, 0);
    return date.getTime();
};

export const generateBackupId = (timestamp = Date.now()) => {
    const dayStartTimestamp = getBackupDayStartTimestamp(timestamp);
    return `${BACKUP_KEY_PREFIX}${dayStartTimestamp || Date.now()}`;
};

export const parseBackupTimestamp = (backupId, fallback = 0) => {
    if (typeof backupId !== 'string') return fallback;
    const raw = backupId.startsWith(BACKUP_KEY_PREFIX)
        ? backupId.slice(BACKUP_KEY_PREFIX.length)
        : '';
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const isScheduledBackupId = (backupId) => (
    typeof backupId === 'string'
    && backupId !== BACKUP_INDEX_KEY
    && backupId.startsWith(BACKUP_KEY_PREFIX)
);

export const normalizeBackupIdList = (backupIds = []) => Array.from(new Set(
    Array.isArray(backupIds) ? backupIds.filter(isScheduledBackupId) : []
)).sort((leftId, rightId) => parseBackupTimestamp(leftId) - parseBackupTimestamp(rightId));

export const getRetentionDayCutoff = (maxAgeDays = MAX_BACKUP_DAYS, referenceTime = Date.now()) => {
    const normalizedMaxAgeDays = Number.isFinite(Number(maxAgeDays))
        ? Math.max(0, Number(maxAgeDays))
        : MAX_BACKUP_DAYS;

    if (normalizedMaxAgeDays <= 0) {
        return Number.POSITIVE_INFINITY;
    }

    const todayStartTimestamp = getBackupDayStartTimestamp(referenceTime);
    return todayStartTimestamp - ((normalizedMaxAgeDays - 1) * DAY_MS);
};

export const selectRetainedBackupIds = (backupIds, options = {}) => {
    const normalizedBackupIds = normalizeBackupIdList(backupIds);
    const maxBackups = Number.isFinite(Number(options.maxBackups))
        ? Math.max(0, Number(options.maxBackups))
        : MAX_BACKUPS;
    const retentionDayCutoff = getRetentionDayCutoff(options.maxAgeDays, options.referenceTime);

    const latestBackupIdByDay = new Map();
    for (const backupId of normalizedBackupIds) {
        const timestamp = parseBackupTimestamp(backupId, 0);
        if (!timestamp) {
            continue;
        }

        latestBackupIdByDay.set(
            getBackupDayStartTimestamp(timestamp),
            backupId
        );
    }

    const latestDailyBackupIds = new Set(latestBackupIdByDay.values());
    const retainedBackupIds = [];
    const deletedBackupIds = [];

    for (const backupId of normalizedBackupIds) {
        const timestamp = parseBackupTimestamp(backupId, 0);
        if (!timestamp) {
            deletedBackupIds.push(backupId);
            continue;
        }

        if (!latestDailyBackupIds.has(backupId)) {
            deletedBackupIds.push(backupId);
            continue;
        }

        const dayStartTimestamp = getBackupDayStartTimestamp(timestamp);
        if (dayStartTimestamp < retentionDayCutoff) {
            deletedBackupIds.push(backupId);
            continue;
        }

        retainedBackupIds.push(backupId);
    }

    let finalRetainedBackupIds = normalizeBackupIdList(retainedBackupIds);
    if (finalRetainedBackupIds.length > maxBackups) {
        const overflowCount = finalRetainedBackupIds.length - maxBackups;
        deletedBackupIds.push(...finalRetainedBackupIds.slice(0, overflowCount));
        finalRetainedBackupIds = finalRetainedBackupIds.slice(overflowCount);
    }

    return {
        retainedBackupIds: finalRetainedBackupIds,
        deletedBackupIds: normalizeBackupIdList(deletedBackupIds)
    };
};
