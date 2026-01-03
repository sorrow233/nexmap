/**
 * Credits Slice
 * 
 * Manages system credits state for users without their own API key.
 */

import { checkCredits as fetchCredits } from '../../services/systemCredits/systemCreditsService';
import { auth } from '../../services/firebase';

const INITIAL_CREDITS = 100;
const INITIAL_IMAGE_CREDITS = 20;

export const createCreditsSlice = (set, get) => ({
    // Credits State
    systemCredits: null,           // null = not loaded, number = current credits
    systemImageCredits: null,      // null = not loaded, number = remaining image credits
    systemCreditsLoading: false,
    systemCreditsError: null,
    isSystemCreditsUser: false,    // true if user is using system credits (no API key)

    // Actions
    setSystemCredits: (credits) => set({ systemCredits: credits }),
    setSystemImageCredits: (credits) => set({ systemImageCredits: credits }),

    setIsSystemCreditsUser: (value) => set({ isSystemCreditsUser: value }),

    /**
     * Load credits from server
     */
    loadSystemCredits: async () => {
        const user = auth.currentUser;
        if (!user) {
            set({ systemCredits: null, systemImageCredits: null, isSystemCreditsUser: false, systemCreditsLoading: false });
            return;
        }

        // Prevent duplicate loading
        const { systemCreditsLoading } = get();
        if (systemCreditsLoading) {
            return;
        }

        set({ systemCreditsLoading: true, systemCreditsError: null });

        try {
            // Add timeout to prevent infinite loading
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('请求超时，请检查网络连接')), 15000)
            );

            const data = await Promise.race([fetchCredits(), timeoutPromise]);
            const credits = data?.credits ?? 0;
            const imageCredits = data?.imageRemaining ?? INITIAL_IMAGE_CREDITS;
            set({
                systemCredits: credits,
                systemImageCredits: imageCredits,
                systemCreditsLoading: false,
                systemCreditsError: null,
                isSystemCreditsUser: true
            });
            return credits;
        } catch (error) {
            set({
                systemCreditsLoading: false,
                systemCreditsError: error.message,
                // Still mark as system credits user so UI shows error
                isSystemCreditsUser: true
            });
            return null;
        }
    },

    /**
     * Update credits after usage (called from response)
     */
    updateCreditsFromResponse: (creditsInfo) => {
        if (creditsInfo?.remaining !== undefined) {
            const remaining = Number(creditsInfo.remaining);
            set({ systemCredits: remaining });
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
            systemImageCredits: null,
            systemCreditsLoading: false,
            systemCreditsError: null,
            isSystemCreditsUser: false
        });
    }
});
