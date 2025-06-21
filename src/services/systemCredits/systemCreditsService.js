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
    let buffer = '';
    let fullText = ''; // Track complete response

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line

            for (const line of lines) {
                if (line.trim().startsWith('data: ')) {
                    const dataStr = line.trim().substring(6);
                    if (dataStr === '[DONE]') continue;

                    try {
                        const data = JSON.parse(dataStr);

                        if (data.error) {
                            throw new Error(data.error.message || JSON.stringify(data.error));
                        }

                        // OpenAI Format: choices[0].delta.content
                        const delta = data.choices?.[0]?.delta?.content;

                        if (delta) {
                            fullText += delta;
                            onToken(delta);
                        }
                    } catch (jsonErr) {
                        // Ignore parse errors on chunks or non-json lines
                    }
                }
            }
        }

        return fullText;
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
