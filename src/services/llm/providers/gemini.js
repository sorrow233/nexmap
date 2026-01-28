import { LLMProvider } from './base';
import { resolveAllImages, getAuthMethod } from '../utils';
import { generateGeminiImage } from '../../image/geminiImageGenerator';
import { isRetryableError } from './gemini/errorUtils';
import { parseGeminiStream } from './gemini/streamParser';
import { getKeyPool } from '../keyPoolManager';

export class GeminiProvider extends LLMProvider {
    /**
     * Gemini 原生协议转换
     */
    formatMessages(messages) {
        const contents = [];
        let systemInstruction = "";

        messages.forEach(msg => {
            if (msg.role === 'system') {
                systemInstruction += (typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)) + "\n";
                return;
            }

            const role = msg.role === 'assistant' ? 'model' : 'user';
            let parts = [];

            if (typeof msg.content === 'string') {
                parts = [{ text: msg.content }];
            } else if (Array.isArray(msg.content)) {
                parts = msg.content.map(part => {
                    if (part.type === 'text') return { text: part.text };
                    if (part.type === 'image') {
                        if (!part.source?.data) {
                            console.warn('[Gemini] Skipping image part due to missing data');
                            return null;
                        }
                        return {
                            inline_data: {
                                mime_type: part.source.media_type || 'image/png',
                                data: part.source.data
                            }
                        };
                    }
                    return null;
                }).filter(Boolean);
            }

            if (contents.length > 0 && contents[contents.length - 1].role === role) {
                contents[contents.length - 1].parts.push(...parts);
            } else {
                contents.push({ role, parts });
            }
        });

        return { contents, systemInstruction };
    }


    /**
     * 获取 KeyPool（支持多 Key 轮询）
     */
    _getKeyPool() {
        const keysString = this.config.apiKeys || this.config.apiKey || '';
        return getKeyPool(this.config.id || 'default', keysString);
    }

    async chat(messages, model, options = {}) {
        const keyPool = this._getKeyPool();
        const { baseUrl = "" } = this.config;
        const modelToUse = model || this.config.model || 'gemini-3-pro-preview';
        const cleanModel = modelToUse.replace('google/', '');

        const resolvedMessages = await resolveAllImages(messages);
        const { contents, systemInstruction } = this.formatMessages(resolvedMessages);

        const requestBody = {
            contents,
            generationConfig: {
                temperature: options.temperature !== undefined ? options.temperature : 1.0,
                maxOutputTokens: 65536
            }
        };

        if (options.tools) {
            requestBody.tools = options.tools;
        } else if (options.useSearch) {
            requestBody.tools = [{ google_search: {} }];
        }

        if (options.thinkingLevel) {
            requestBody.generationConfig.thinkingConfig = { thinkingLevel: options.thinkingLevel };
        }
        if (options.mediaResolution) {
            requestBody.generationConfig.mediaResolution = options.mediaResolution;
        }

        if (systemInstruction) {
            requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        let retries = 3;
        let lastError = null;

        while (retries >= 0) {
            const apiKey = keyPool.getNextKey();
            if (!apiKey) {
                throw new Error('没有可用的 Gemini API Key');
            }

            try {
                const response = await fetch('/api/gmi-serving', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        apiKey,
                        baseUrl,
                        model: cleanModel,
                        endpoint: `/models/${cleanModel}:generateContent`,
                        requestBody
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.error) {
                        const errMsg = data.error.message || JSON.stringify(data.error);
                        if ([401, 403, 429].includes(data.error.code) || isRetryableError(errMsg)) {
                            keyPool.markKeyFailed(apiKey, data.error.code || errMsg);
                            retries--;
                            lastError = new Error(errMsg);
                            continue;
                        }
                        throw new Error(errMsg);
                    }

                    const candidate = data.candidates?.[0];
                    return candidate?.content?.parts?.[0]?.text || "";
                }

                if ([401, 403, 429].includes(response.status)) {
                    keyPool.markKeyFailed(apiKey, response.status);
                    retries--;
                    continue;
                }

                if ([500, 502, 503, 504].indexOf(response.status) !== -1 && retries > 0) {
                    await new Promise(r => setTimeout(r, 1000));
                    retries--; continue;
                }

                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || err.message || `API Error ${response.status}: ${response.statusText}`);
            } catch (e) {
                console.error('[Gemini] Chat error details:', e);
                if (retries > 0) {
                    retries--;
                    lastError = e;
                    continue;
                }
                throw e;
            }
        }
        throw lastError || new Error('Gemini 请求失败');
    }

    async stream(messages, onToken, model, options = {}) {
        const keyPool = this._getKeyPool();
        // 如果 baseUrl 为空，使用 Gemini 官方 API 地址
        const baseUrl = this.config.baseUrl?.trim() || 'https://generativelanguage.googleapis.com/v1beta';
        const modelToUse = model || this.config.model || 'gemini-3-pro-preview';
        const cleanModel = modelToUse.replace('google/', '');

        const resolvedMessages = await resolveAllImages(messages);
        const { contents, systemInstruction } = this.formatMessages(resolvedMessages);

        const requestBody = {
            contents,
            generationConfig: {
                temperature: options.temperature !== undefined ? options.temperature : 1.0,
                maxOutputTokens: 65536
            }
        };

        if (options.tools) {
            requestBody.tools = options.tools;
        } else if (options.useSearch) {
            requestBody.tools = [{ google_search: {} }];
        }

        if (options.thinkingLevel) {
            requestBody.generationConfig.thinkingConfig = { thinkingLevel: options.thinkingLevel };
        }
        if (options.mediaResolution) {
            requestBody.generationConfig.mediaResolution = options.mediaResolution;
        }

        if (systemInstruction) {
            requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        let retries = 3;
        let delay = 1000;

        while (retries >= 0) {
            const apiKey = keyPool.getNextKey();
            if (!apiKey) {
                throw new Error('没有可用的 Gemini API Key');
            }

            try {
                const response = await fetch('/api/gmi-serving', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: options.signal,
                    body: JSON.stringify({
                        apiKey,
                        baseUrl,
                        model: cleanModel,
                        endpoint: `/models/${cleanModel}:streamGenerateContent`,
                        requestBody,
                        stream: true
                    })
                });

                if (!response.ok) {
                    const errStatus = response.status;
                    if ([401, 403, 429].includes(errStatus)) {
                        keyPool.markKeyFailed(apiKey, errStatus);
                        retries--;
                        continue;
                    }

                    if ([500, 502, 503, 504].indexOf(errStatus) !== -1 && retries > 0) {
                        await new Promise(r => setTimeout(r, delay));
                        retries--;
                        delay *= 2;
                        continue;
                    }

                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.error?.message || errData.message || `API Error ${errStatus}: ${response.statusText}`);
                }

                const reader = response.body.getReader();
                try {
                    await parseGeminiStream(reader, onToken, () => { });
                    return;
                } finally {
                    reader.releaseLock();
                }

            } catch (e) {
                if (e.name === 'AbortError' || options.signal?.aborted) throw e;

                if (retries > 0) {
                    retries--;
                    await new Promise(r => setTimeout(r, delay));
                    delay *= 2;
                    continue;
                }
                throw e;
            }
        }
    }

    /**
     * Generate Image using GMI Cloud Async API
     */
    async generateImage(prompt, model, options = {}) {
        const apiKey = this._getKeyPool().getNextKey();
        return generateGeminiImage(apiKey, prompt, model, options);
    }
}
