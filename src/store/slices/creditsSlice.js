/**
 * Credits Slice
 * 
 * Manages system credits state for users without their own API key.
 */

import { checkCredits as fetchCredits } from '../../services/systemCredits/systemCreditsService';
import { auth } from '../../services/firebase';

const INITIAL_CREDITS = 100;

export const createCreditsSlice = (set, get) => ({
    // Credits State
    systemCredits: null,           // null = not loaded, number = current credits
    systemCreditsLoading: false,
    systemCreditsError: null,
    isSystemCreditsUser: false,    // true if user is using system credits (no API key)

    // Actions
    setSystemCredits: (credits) => set({ systemCredits: credits }),

    setIsSystemCreditsUser: (value) => set({ isSystemCreditsUser: value }),

    /**
     * Load credits from server
     */
    loadSystemCredits: async () => {
        const user = auth.currentUser;
        if (!user) {
            set({ systemCredits: null, isSystemCreditsUser: false });
            return;
        }

        set({ systemCreditsLoading: true, systemCreditsError: null });

        try {
            const data = await fetchCredits();
            set({
                systemCredits: data.credits,
                systemCreditsLoading: false,
                isSystemCreditsUser: true
            });
            console.log(`[Credits] Loaded: ${data.credits.toFixed(2)} credits`);
            return data.credits;
        } catch (error) {
            console.error('[Credits] Failed to load:', error);
            set({
                systemCreditsLoading: false,
                systemCreditsError: error.message
            });
            return null;
        }
    },

    /**
     * Update credits after usage (called from response)
     */
    updateCreditsFromResponse: (creditsInfo) => {
        if (creditsInfo?.remaining !== undefined) {
            set({ systemCredits: creditsInfo.remaining });
            console.log(`[Credits] Updated: ${creditsInfo.remaining.toFixed(2)} remaining`);
        }
    },

    /**
     * Check if user has enough credits
     */
    hasCredits: () => {
        const { systemCredits } = get();
        return systemCredits !== null && systemCredits > 0;
    },

    /**
     * Get credits percentage for display
     */
    getCreditsPercentage: () => {
        const { systemCredits } = get();
        if (systemCredits === null) return 0;
        return Math.round((systemCredits / INITIAL_CREDITS) * 100);
    },

    /**
     * Reset credits state (on logout)
     */
    resetCreditsState: () => {
        set({
            systemCredits: null,
            systemCreditsLoading: false,
            systemCreditsError: null,
            isSystemCreditsUser: false
        });
    }
});
