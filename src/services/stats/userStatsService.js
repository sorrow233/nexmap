/**
 * User Stats Service
 * Tracks client-side usage statistics like generated characters/tokens.
 * Data is persisted in localStorage AND synced to Firebase for cloud backup.
 */

import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth } from '../firebase';

const STORAGE_KEYS = {
    TOTAL_CHARS: 'nexmap_stats_total_chars',
    DAILY_HISTORY: 'nexmap_stats_daily_history',
    ACTIVITY_LOG: 'nexmap_stats_activity_log',
    DAILY_SESSIONS: 'nexmap_stats_daily_sessions',
    LAST_SYNC: 'nexmap_stats_last_sync'
};

class UserStatsService {
    constructor() {
        this._initLocalStorage();
        this._pendingSync = null;
        this._syncDebounceMs = 60000; // Sync to cloud every 60 seconds (optimized for quota)

        // Sync on page exit
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                this.syncToCloud();
            });
        }
    }

    _initLocalStorage() {
        if (!localStorage.getItem(STORAGE_KEYS.TOTAL_CHARS)) {
            localStorage.setItem(STORAGE_KEYS.TOTAL_CHARS, '0');
        }
        if (!localStorage.getItem(STORAGE_KEYS.DAILY_HISTORY)) {
            localStorage.setItem(STORAGE_KEYS.DAILY_HISTORY, '{}');
        }
        if (!localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOG)) {
            localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOG, '[]');
        }
        if (!localStorage.getItem(STORAGE_KEYS.DAILY_SESSIONS)) {
            localStorage.setItem(STORAGE_KEYS.DAILY_SESSIONS, '{}');
        }
    }

    /**
     * Increment the character count stats
     * @param {number} count - Number of characters to add
     */
    incrementCharCount(count) {
        if (!count || count <= 0) return;

        const now = new Date();
        const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const hour = now.getHours();

        // 1. Update Total
        const currentTotal = parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_CHARS) || '0', 10);
        const newTotal = currentTotal + count;
        localStorage.setItem(STORAGE_KEYS.TOTAL_CHARS, newTotal.toString());

        // 2. Update Daily History (永久保存所有日期数据)
        const history = this._getHistory();
        const todayCount = (history[today] || 0) + count;
        history[today] = todayCount;
        localStorage.setItem(STORAGE_KEYS.DAILY_HISTORY, JSON.stringify(history));

        // 3. Log activity with timestamp for time distribution analysis
        const activityLog = this._getActivityLog();
        activityLog.push({ timestamp: now.getTime(), hour, chars: count });
        // Keep only last 30 days of activity logs for time distribution
        const thirtyDaysAgo = now.getTime() - (30 * 24 * 60 * 60 * 1000);
        const prunedLog = activityLog.filter(a => a.timestamp >= thirtyDaysAgo);
        localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOG, JSON.stringify(prunedLog));

        // 4. Update daily session count
        const sessions = this._getDailySessions();
        sessions[today] = (sessions[today] || 0) + 1;
        localStorage.setItem(STORAGE_KEYS.DAILY_SESSIONS, JSON.stringify(sessions));

        // 5. Trigger debounced cloud sync
        this._debouncedSyncToCloud();
    }

    /**
     * Sync stats to Firebase (debounced)
     */
    _debouncedSyncToCloud() {
        if (this._pendingSync) {
            clearTimeout(this._pendingSync);
        }
        this._pendingSync = setTimeout(() => {
            this.syncToCloud();
        }, this._syncDebounceMs);
    }

    /**
     * Sync all stats to Firebase
     */
    async syncToCloud() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const statsRef = doc(db, 'users', user.uid, 'stats', 'activity');
            const statsData = {
                totalChars: parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_CHARS) || '0', 10),
                dailyHistory: this._getHistory(),
                dailySessions: this._getDailySessions(),
                lastUpdated: new Date().toISOString()
            };

            await setDoc(statsRef, statsData, { merge: true });
            localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
            console.log('[UserStats] Synced to cloud');
        } catch (error) {
            console.error('[UserStats] Failed to sync to cloud:', error);
        }
    }

    /**
     * Load stats from Firebase (on login)
     */
    async loadFromCloud() {
        const user = auth.currentUser;
        if (!user) return false;

        try {
            const statsRef = doc(db, 'users', user.uid, 'stats', 'activity');
            const snapshot = await getDoc(statsRef);

            if (snapshot.exists()) {
                const cloudData = snapshot.data();

                // Merge cloud data with local data (cloud wins for conflicts)
                const localHistory = this._getHistory();
                const cloudHistory = cloudData.dailyHistory || {};
                const mergedHistory = { ...localHistory };

                // Merge histories - take the larger value for each day
                Object.keys(cloudHistory).forEach(date => {
                    if (!mergedHistory[date] || cloudHistory[date] > mergedHistory[date]) {
                        mergedHistory[date] = cloudHistory[date];
                    }
                });

                // Calculate new total from merged history
                const newTotal = Object.values(mergedHistory).reduce((sum, val) => sum + val, 0);

                // Merge sessions
                const localSessions = this._getDailySessions();
                const cloudSessions = cloudData.dailySessions || {};
                const mergedSessions = { ...localSessions };
                Object.keys(cloudSessions).forEach(date => {
                    if (!mergedSessions[date] || cloudSessions[date] > mergedSessions[date]) {
                        mergedSessions[date] = cloudSessions[date];
                    }
                });

                // Save merged data locally
                localStorage.setItem(STORAGE_KEYS.TOTAL_CHARS, newTotal.toString());
                localStorage.setItem(STORAGE_KEYS.DAILY_HISTORY, JSON.stringify(mergedHistory));
                localStorage.setItem(STORAGE_KEYS.DAILY_SESSIONS, JSON.stringify(mergedSessions));

                console.log('[UserStats] Loaded and merged from cloud');
                return true;
            }
        } catch (error) {
            console.error('[UserStats] Failed to load from cloud:', error);
        }
        return false;
    }

    /**
     * Get current statistics
     * @returns {Object} { totalChars, todayChars, yesterdayChars }
     */
    getStats() {
        const totalChars = parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_CHARS) || '0', 10);
        const history = this._getHistory();

        const today = new Date().toISOString().split('T')[0];
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = yesterdayDate.toISOString().split('T')[0];

        return {
            totalChars,
            todayChars: history[today] || 0,
            yesterdayChars: history[yesterday] || 0
        };
    }

    /**
     * Get weekly history (last 7 days)
     * @returns {Array} [{ date, chars, dayOfWeek }]
     */
    getWeeklyHistory() {
        const history = this._getHistory();
        const result = [];
        const now = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ...
            result.push({
                date: dateKey,
                chars: history[dateKey] || 0,
                dayOfWeek
            });
        }

        return result;
    }

    /**
     * Get full history (all dates)
     * @returns {Object} { 'YYYY-MM-DD': charCount, ... }
     */
    getFullHistory() {
        return this._getHistory();
    }

    /**
     * Get monthly summary
     * @returns {Array} [{ month: 'YYYY-MM', totalChars, activeDays }]
     */
    getMonthlySummary() {
        const history = this._getHistory();
        const monthlyData = {};

        Object.entries(history).forEach(([date, chars]) => {
            const month = date.substring(0, 7); // 'YYYY-MM'
            if (!monthlyData[month]) {
                monthlyData[month] = { totalChars: 0, activeDays: 0 };
            }
            monthlyData[month].totalChars += chars;
            monthlyData[month].activeDays += 1;
        });

        return Object.entries(monthlyData)
            .map(([month, data]) => ({ month, ...data }))
            .sort((a, b) => b.month.localeCompare(a.month));
    }

    /**
     * Get active time distribution
     * @returns {Object} { morning, afternoon, evening, night }
     */
    getActiveTimeDistribution() {
        const activityLog = this._getActivityLog();
        const distribution = {
            morning: 0,   // 6:00-12:00
            afternoon: 0, // 12:00-18:00
            evening: 0,   // 18:00-24:00
            night: 0      // 0:00-6:00
        };

        activityLog.forEach(activity => {
            const hour = activity.hour;
            if (hour >= 6 && hour < 12) {
                distribution.morning += activity.chars;
            } else if (hour >= 12 && hour < 18) {
                distribution.afternoon += activity.chars;
            } else if (hour >= 18 && hour < 24) {
                distribution.evening += activity.chars;
            } else {
                distribution.night += activity.chars;
            }
        });

        return distribution;
    }

    /**
     * Get today's session count
     * @returns {number}
     */
    getTodaySessions() {
        const sessions = this._getDailySessions();
        const today = new Date().toISOString().split('T')[0];
        return sessions[today] || 0;
    }

    /**
     * Get streak days (consecutive active days)
     * @returns {number}
     */
    getStreakDays() {
        const history = this._getHistory();
        const dates = Object.keys(history).sort().reverse();

        if (dates.length === 0) return 0;

        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // Check if user was active today or yesterday (to continue streak)
        if (!history[today] && !history[yesterdayStr]) {
            return 0;
        }

        let streak = 0;
        const startDate = history[today] ? new Date() : yesterday;

        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(startDate);
            checkDate.setDate(checkDate.getDate() - i);
            const dateKey = checkDate.toISOString().split('T')[0];

            if (history[dateKey] && history[dateKey] > 0) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    }

    /**
     * Get extended stats including all new metrics
     * @returns {Object}
     */
    getExtendedStats() {
        const basicStats = this.getStats();
        return {
            ...basicStats,
            weeklyHistory: this.getWeeklyHistory(),
            timeDistribution: this.getActiveTimeDistribution(),
            todaySessions: this.getTodaySessions(),
            streakDays: this.getStreakDays()
        };
    }

    _getHistory() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_HISTORY) || '{}');
        } catch (e) {
            console.error('Failed to parse stats history', e);
            return {};
        }
    }

    _getActivityLog() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOG) || '[]');
        } catch (e) {
            console.error('Failed to parse activity log', e);
            return [];
        }
    }

    _getDailySessions() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_SESSIONS) || '{}');
        } catch (e) {
            console.error('Failed to parse daily sessions', e);
            return {};
        }
    }
}

export const userStatsService = new UserStatsService();
