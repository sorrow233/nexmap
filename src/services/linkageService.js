import { debugLog } from '../utils/debugLogger';

/**
 * LinkageService
 * Handles cross-project data transmission via Background API Call
 */

// Target project API endpoint
export const TARGET_API_URL = 'https://flowstudio.catzz.work/api/import';

export const linkageService = {
    /**
     * Send text to external project via background API call (silent, no redirect)
     * @param {string} text - The content to transmit
     * @returns {Promise<boolean>} - Success status
     */
    sendToExternalProject: async (text) => {
        if (!text) return false;

        try {
            debugLog.ui('Sending to external project via API', { textLength: text.length });

            const response = await fetch(TARGET_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text, source: 'nexmap', timestamp: Date.now() })
            });

            if (response.ok) {
                const data = await response.json();
                debugLog.ui('Successfully sent to FlowStudio', data);

                // 如果 API 返回 redirectUrl，打开它来完成创建
                if (data.redirectUrl) {
                    window.open(data.redirectUrl, '_blank');
                }
                return true;
            } else {
                console.error('[LinkageService] API returned error:', response.status);
                return false;
            }
        } catch (error) {
            console.error('[LinkageService] Failed to send to project', error);
            return false;
        }
    },

    /**
     * Parse incoming import request from URL (for receiving end)
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
