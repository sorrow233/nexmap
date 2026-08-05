/**
 * Durable local usage statistics.
 *
 * All counters live in one checksummed snapshot so a generation is committed
 * atomically. A second snapshot is kept for corruption recovery, and Web Locks
 * serialize writes made by multiple tabs.
 */
import { buildLocalDateKeyFromDate, buildMonthActivityData, buildYearActivityData } from './activityHistory.js';
import { parseStoredJson } from './statsStorage.js';
import {
    applyGenerationToSnapshot,
    applyModelUsageToSnapshot,
    buildStatsSnapshotFromLegacy,
    createEmptyStatsSnapshot,
    getStatsSnapshotTotalChars,
    getUnicodeCharacterCount,
    normalizeStatsSnapshot,
    parseStatsSnapshot,
    sealStatsSnapshot
} from './statsSnapshot.js';

export const STATS_STORAGE_KEYS = Object.freeze({
    SNAPSHOT: 'nexmap_stats_snapshot_v3',
    SNAPSHOT_BACKUP: 'nexmap_stats_snapshot_v3_backup',
    TOTAL_CHARS: 'nexmap_stats_total_chars',
    DAILY_HISTORY: 'nexmap_stats_daily_history',
    ACTIVITY_LOG: 'nexmap_stats_activity_log',
    DAILY_SESSIONS: 'nexmap_stats_daily_sessions',
    MODEL_USAGE: 'nexmap_stats_model_usage'
});

const LOCK_NAME = 'nexmap-user-stats-v3';

const readJsonObject = (storage, key) => parseStoredJson(storage?.getItem?.(key), {});

const buildLegacySnapshotFromStorage = (storage) => buildStatsSnapshotFromLegacy({
    totalChars: storage?.getItem?.(STATS_STORAGE_KEYS.TOTAL_CHARS),
    dailyHistory: readJsonObject(storage, STATS_STORAGE_KEYS.DAILY_HISTORY),
    dailySessions: readJsonObject(storage, STATS_STORAGE_KEYS.DAILY_SESSIONS),
    modelUsage: readJsonObject(storage, STATS_STORAGE_KEYS.MODEL_USAGE),
    activityLog: storage?.getItem?.(STATS_STORAGE_KEYS.ACTIVITY_LOG)
});

class UserStatsService {
    constructor(storage = globalThis.localStorage) {
        this.storage = storage;
        this.listeners = new Set();
        this.mutationQueue = Promise.resolve();
        this._initializeSnapshot();

        if (typeof window !== 'undefined') {
            window.addEventListener('storage', (event) => {
                if (event.key === STATS_STORAGE_KEYS.SNAPSHOT) this._notify();
            });
        }
    }

    _initializeSnapshot() {
        if (!this.storage) return;
        if (parseStatsSnapshot(this.storage.getItem(STATS_STORAGE_KEYS.SNAPSHOT))) return;

        const backup = parseStatsSnapshot(this.storage.getItem(STATS_STORAGE_KEYS.SNAPSHOT_BACKUP));
        const initial = backup || buildLegacySnapshotFromStorage(this.storage);
        this._persistSnapshot(initial, { preserveCurrent: false });
    }

    _readSnapshot() {
        if (!this.storage) return sealStatsSnapshot(createEmptyStatsSnapshot());

        const current = parseStatsSnapshot(this.storage.getItem(STATS_STORAGE_KEYS.SNAPSHOT));
        if (current) return current;

        const backup = parseStatsSnapshot(this.storage.getItem(STATS_STORAGE_KEYS.SNAPSHOT_BACKUP));
        if (backup) {
            this._persistSnapshot(backup, { preserveCurrent: false });
            return backup;
        }

        const migrated = buildLegacySnapshotFromStorage(this.storage);
        this._persistSnapshot(migrated, { preserveCurrent: false });
        return migrated;
    }

    _persistSnapshot(snapshot, { preserveCurrent = true } = {}) {
        if (!this.storage) return false;
        const sealed = sealStatsSnapshot(snapshot);
        const serialized = JSON.stringify(sealed);

        try {
            if (preserveCurrent) {
                const current = parseStatsSnapshot(this.storage.getItem(STATS_STORAGE_KEYS.SNAPSHOT));
                if (current) {
                    this.storage.setItem(STATS_STORAGE_KEYS.SNAPSHOT_BACKUP, JSON.stringify(current));
                }
            }

            this.storage.setItem(STATS_STORAGE_KEYS.SNAPSHOT, serialized);
            if (!parseStatsSnapshot(this.storage.getItem(STATS_STORAGE_KEYS.SNAPSHOT))) {
                throw new Error('Stats snapshot verification failed');
            }
            return true;
        } catch (error) {
            console.warn('[UserStats] Failed to persist atomic stats snapshot', error);
            return false;
        }
    }

    async _mutate(mutator) {
        const run = async () => {
            const current = this._readSnapshot();
            const next = mutator(current);
            const persisted = this._persistSnapshot(next);
            if (persisted) this._notify();
            return persisted;
        };

        if (globalThis.navigator?.locks?.request) {
            return globalThis.navigator.locks.request(LOCK_NAME, { mode: 'exclusive' }, run);
        }

        const queued = this.mutationQueue.then(run, run);
        this.mutationQueue = queued.catch(() => undefined);
        return queued;
    }

    subscribe(listener) {
        if (typeof listener !== 'function') return () => {};
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    _notify() {
        this.listeners.forEach((listener) => {
            try {
                listener();
            } catch (error) {
                console.warn('[UserStats] Stats subscriber failed', error);
            }
        });
    }

    async recordGeneration({ text = '', chars, model = '', timestamp = Date.now() } = {}) {
        const count = Number.isFinite(Number(chars))
            ? Math.max(0, Math.floor(Number(chars)))
            : getUnicodeCharacterCount(text);
        if (count <= 0) return false;

        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) return false;

        return this._mutate((snapshot) => applyGenerationToSnapshot(snapshot, {
            chars: count,
            dateKey: buildLocalDateKeyFromDate(date),
            hour: date.getHours(),
            model,
            timestamp: date.getTime()
        }));
    }

    incrementCharCount(count) {
        return this.recordGeneration({ chars: count });
    }

    incrementModelUsage(modelName) {
        if (!String(modelName || '').trim()) return Promise.resolve(false);
        return this._mutate((snapshot) => applyModelUsageToSnapshot(snapshot, modelName));
    }

    exportSnapshot() {
        return this._readSnapshot();
    }

    importSnapshot(snapshot) {
        const normalized = snapshot?.checksum
            ? parseStatsSnapshot(snapshot)
            : sealStatsSnapshot(normalizeStatsSnapshot(snapshot));
        if (!normalized) return Promise.resolve(false);
        return this._mutate(() => normalized);
    }

    importStorageValues(storageValues = {}) {
        const rawSnapshot = storageValues[STATS_STORAGE_KEYS.SNAPSHOT];
        const importedSnapshot = parseStatsSnapshot(
            typeof rawSnapshot === 'string' ? rawSnapshot : JSON.stringify(rawSnapshot || '')
        );
        if (importedSnapshot) return this.importSnapshot(importedSnapshot);

        const getValue = (key) => {
            const value = storageValues[key];
            return typeof value === 'string' ? value : JSON.stringify(value ?? '');
        };
        return this.importSnapshot(buildStatsSnapshotFromLegacy({
            totalChars: storageValues[STATS_STORAGE_KEYS.TOTAL_CHARS],
            dailyHistory: parseStoredJson(getValue(STATS_STORAGE_KEYS.DAILY_HISTORY), {}),
            dailySessions: parseStoredJson(getValue(STATS_STORAGE_KEYS.DAILY_SESSIONS), {}),
            modelUsage: parseStoredJson(getValue(STATS_STORAGE_KEYS.MODEL_USAGE), {}),
            activityLog: getValue(STATS_STORAGE_KEYS.ACTIVITY_LOG)
        }));
    }

    getStats() {
        const snapshot = this._readSnapshot();
        const todayDate = new Date();
        const yesterdayDate = new Date(todayDate);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const today = buildLocalDateKeyFromDate(todayDate);
        const yesterday = buildLocalDateKeyFromDate(yesterdayDate);

        return {
            totalChars: getStatsSnapshotTotalChars(snapshot),
            todayChars: snapshot.dailyHistory[today] || 0,
            yesterdayChars: snapshot.dailyHistory[yesterday] || 0
        };
    }

    getWeeklyHistory() {
        return this.getHistoryForDays(7);
    }

    getHistoryForDays(days = 7) {
        const history = this._readSnapshot().dailyHistory;
        const result = [];
        const now = new Date();
        const normalizedDays = Math.max(0, Math.floor(Number(days) || 0));

        for (let index = normalizedDays - 1; index >= 0; index -= 1) {
            const date = new Date(now);
            date.setDate(date.getDate() - index);
            const dateKey = buildLocalDateKeyFromDate(date);
            result.push({
                date: dateKey,
                chars: history[dateKey] || 0,
                dayOfWeek: date.getDay(),
                isToday: index === 0
            });
        }
        return result;
    }

    getFullHistory() {
        return { ...this._readSnapshot().dailyHistory };
    }

    getMonthlySummary() {
        const monthlyData = {};
        Object.entries(this._readSnapshot().dailyHistory).forEach(([date, chars]) => {
            const month = date.substring(0, 7);
            if (!monthlyData[month]) monthlyData[month] = { totalChars: 0, activeDays: 0 };
            monthlyData[month].totalChars += chars;
            monthlyData[month].activeDays += 1;
        });
        return Object.entries(monthlyData)
            .map(([month, data]) => ({ month, ...data }))
            .sort((left, right) => right.month.localeCompare(left.month));
    }

    getActiveTimeDistribution() {
        return { ...this._readSnapshot().timeDistribution };
    }

    getTodaySessions() {
        const snapshot = this._readSnapshot();
        return snapshot.dailySessions[buildLocalDateKeyFromDate(new Date())] || 0;
    }

    getTotalSessions() {
        return Object.values(this._readSnapshot().dailySessions).reduce((sum, count) => sum + count, 0);
    }

    getStreakDays() {
        const history = this._readSnapshot().dailyHistory;
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const startDate = history[buildLocalDateKeyFromDate(today)] ? today : yesterday;

        if (!history[buildLocalDateKeyFromDate(startDate)]) return 0;

        let streak = 0;
        let cursor = new Date(startDate);
        while (history[buildLocalDateKeyFromDate(cursor)] > 0) {
            streak += 1;
            cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
        }
        return streak;
    }

    getExtendedStats() {
        return {
            ...this.getStats(),
            weeklyHistory: this.getWeeklyHistory(),
            timeDistribution: this.getActiveTimeDistribution(),
            todaySessions: this.getTodaySessions(),
            totalSessions: this.getTotalSessions(),
            streakDays: this.getStreakDays()
        };
    }

    getDataForMonth(year, month) {
        return buildMonthActivityData(this._readSnapshot().dailyHistory, year, month);
    }

    getDataForYear(year) {
        return buildYearActivityData(this._readSnapshot().dailyHistory, year);
    }

    getModelUsageStats() {
        return { ...this._readSnapshot().modelUsage };
    }
}

export { UserStatsService };
export const userStatsService = new UserStatsService();
