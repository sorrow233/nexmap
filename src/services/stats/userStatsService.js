/**
 * User Stats Service
 * Tracks client-side usage statistics like generated characters/tokens.
 * Data is persisted in localStorage.
 */

const STORAGE_KEYS = {
    TOTAL_CHARS: 'nexmap_stats_total_chars',
    DAILY_HISTORY: 'nexmap_stats_daily_history'
};

class UserStatsService {
    constructor() {
        if (!localStorage.getItem(STORAGE_KEYS.TOTAL_CHARS)) {
            localStorage.setItem(STORAGE_KEYS.TOTAL_CHARS, '0');
        }
        if (!localStorage.getItem(STORAGE_KEYS.DAILY_HISTORY)) {
            localStorage.setItem(STORAGE_KEYS.DAILY_HISTORY, '{}');
        }
    }

    /**
     * Increment the character count stats
     * @param {number} count - Number of characters to add
     */
    incrementCharCount(count) {
        if (!count || count <= 0) return;

        // 1. Update Total
        const currentTotal = parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_CHARS) || '0', 10);
        const newTotal = currentTotal + count;
        localStorage.setItem(STORAGE_KEYS.TOTAL_CHARS, newTotal.toString());

        // 2. Update Daily History
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const history = this._getHistory();

        const todayCount = (history[today] || 0) + count;
        history[today] = todayCount;

        // Optional: Prune old history (keep last 30 days) to save space
        // For now, keeping it simple as JSON size is negligible for a year

        localStorage.setItem(STORAGE_KEYS.DAILY_HISTORY, JSON.stringify(history));
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

    _getHistory() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_HISTORY) || '{}');
        } catch (e) {
            console.error('Failed to parse stats history', e);
            return {};
        }
    }
}

export const userStatsService = new UserStatsService();
