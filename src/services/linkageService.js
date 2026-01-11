import { debugLog } from '../utils/debugLogger';

/**
 * LinkageService
 * Handles cross-project data transmission via Deep Linking (URL Parameters)
 */

// Target project URL for cross-project linkage
export const TARGET_PROJECT_URL = 'https://flowstudio.catzz.work/inspiration';

export const linkageService = {
    /**
     * Send text to another project via URL redirect
     * @param {string} text - The content to transmit
     * @param {string} targetUrl - Optional target URL override
     */
    sendToExternalProject: (text, targetUrl = TARGET_PROJECT_URL) => {
        if (!text) return;

        try {
            const encodedText = encodeURIComponent(text);
            const finalUrl = new URL(targetUrl);
            finalUrl.searchParams.set('import_text', text); // searchParams.set handles encoding

            debugLog.ui('Redirecting to external project', { url: finalUrl.toString() });

            // Open in new tab to keep current context
            window.open(finalUrl.toString(), '_blank');
        } catch (error) {
            console.error('[LinkageService] Failed to send to project', error);
        }
    },

    /**
     * Parse incoming import request from URL
     * @returns {string|null} - The imported text or null
     */
    getIncomingText: () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('import_text');
    },

    /**
     * Clean up import parameters from URL without refreshing
     */
    clearUrlParams: () => {
        const url = new URL(window.location);
        url.searchParams.delete('import_text');
        window.history.replaceState({}, '', url);
    }
};
