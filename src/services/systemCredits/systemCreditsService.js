/**
 * System Credits Service
 * 
 * Manages free trial credits for users without their own API key.
 * All AI requests go through the secure /api/system-credits endpoint.
 */

import { auth } from '../firebase';

const ENDPOINT = '/api/system-credits';

/**
 * Get current user's Firebase ID token for authentication
 */
async function getAuthToken() {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('请先登录以使用免费试用积分');
    }
    return user.getIdToken();
}

/**
 * Check user's remaining credits
 * @returns {Promise<{credits: number, initialCredits: number, model: string}>}
 */
export async function checkCredits() {
    const token = await getAuthToken();

    const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'check' })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || '无法获取积分信息');
    }

    return response.json();
}

/**
 * Make a chat completion request using system credits
 * @param {Object} requestBody - Gemini format request body
 * @returns {Promise<Object>} - Response with credits info
 */
export async function chatWithSystemCredits(requestBody) {
    const token = await getAuthToken();

    const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestBody, stream: false })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));

        // Special handling for credits exhausted
        if (response.status === 402) {
            throw new CreditsExhaustedError(error.message);
        }

        throw new Error(error.message || error.error?.message || '请求失败');
    }

    return response.json();
}

/**
 * Stream chat completion using system credits
 * @param {Object} requestBody - Gemini format request body
 * @param {Function} onToken - Callback for each token
 * @param {Object} options - Options including AbortSignal
 */
export async function streamWithSystemCredits(requestBody, onToken, options = {}) {
    const token = await getAuthToken();

    const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        signal: options.signal,
        body: JSON.stringify({ requestBody, stream: true })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));

        if (response.status === 402) {
            throw new CreditsExhaustedError(error.message);
        }

        throw new Error(error.message || error.error?.message || '请求失败');
    }

    // Process stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let lastFullText = '';
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                let cleanLine = line.trim();
                if (!cleanLine) continue;

                if (cleanLine.startsWith('data: ')) {
                    cleanLine = cleanLine.substring(6).trim();
                }

                if (!cleanLine || cleanLine === '[DONE]') continue;

                try {
                    const data = JSON.parse(cleanLine);

                    if (data.error) {
                        throw new Error(data.error.message || JSON.stringify(data.error));
                    }

                    const currentText = data.candidates?.[0]?.content?.parts?.[0]?.text;

                    if (currentText) {
                        let delta = '';
                        if (currentText.startsWith(lastFullText)) {
                            delta = currentText.substring(lastFullText.length);
                            lastFullText = currentText;
                        } else {
                            delta = currentText;
                            lastFullText += currentText;
                        }

                        if (delta) {
                            onToken(delta);
                        }
                    }
                } catch (jsonErr) {
                    if (jsonErr.message && !jsonErr.message.includes('JSON')) {
                        throw jsonErr;
                    }
                }
            }
        }

        // Process remaining buffer
        if (buffer.trim()) {
            try {
                let cleanLine = buffer.trim().startsWith('data: ')
                    ? buffer.trim().substring(6)
                    : buffer.trim();
                const data = JSON.parse(cleanLine);
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    const delta = text.startsWith(lastFullText)
                        ? text.substring(lastFullText.length)
                        : text;
                    if (delta) onToken(delta);
                }
            } catch (e) {
                // Ignore parse errors for incomplete data
            }
        }
    } finally {
        reader.releaseLock();
    }
}

/**
 * Custom error for credits exhausted state
 */
export class CreditsExhaustedError extends Error {
    constructor(message) {
        super(message || '免费试用积分已用完！请在设置中配置您自己的 API Key 继续使用。');
        this.name = 'CreditsExhaustedError';
        this.needsUpgrade = true;
    }
}

/**
 * Check if user should use system credits (no API key configured)
 */
export function shouldUseSystemCredits(providerConfig) {
    // User has no API key configured
    if (!providerConfig?.apiKey || providerConfig.apiKey.trim() === '') {
        return true;
    }
    return false;
}
