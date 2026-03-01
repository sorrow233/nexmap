import { LLMProvider } from './base';
import { resolveAllImages } from '../utils';
import { generateGeminiImage } from '../../image/geminiImageGenerator';
import { isRetryableError, isRetryableStatusCode, sleepWithAbort } from './gemini/errorUtils';
import { parseGeminiStream, didCandidateUseSearch } from './gemini/streamParser';
import { getKeyPool } from '../keyPoolManager';
import { acquireGeminiConcurrencySlot } from './gemini/concurrencyGate';

export class GeminiProvider extends LLMProvider {
    _isGemini3FlashModel(modelName = '') {
        const lower = String(modelName).toLowerCase();
        return lower.includes('gemini-3-flash');
    }

    _normalizeThinkingLevel(level) {
        if (!level) return null;
        const normalized = String(level).trim().toUpperCase();
        if (normalized === 'HIGH' || normalized === 'LOW' || normalized === 'THINKING_LEVEL_UNSPECIFIED') {
            return normalized;
        }
        return null;
    }

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
                temperature: options.temperature !== undefined ? options.temperature : 1.0
            }
        };

        if (options.tools) {
            requestBody.tools = options.tools;
        } else if (options.useSearch !== false) {
            // Default to enabling Google Search unless explicitly disabled.
            requestBody.tools = [{ google_search: {} }];
        }

        // Force Gemini 3 Flash family to always run with HIGH thinking.
        const forcedThinkingLevel = this._isGemini3FlashModel(cleanModel)
            ? 'HIGH'
            : this._normalizeThinkingLevel(options.thinkingLevel);
        if (forcedThinkingLevel) {
            requestBody.generationConfig.thinkingConfig = { thinkingLevel: forcedThinkingLevel };
        }
        if (options.mediaResolution) {
            requestBody.generationConfig.mediaResolution = options.mediaResolution;
        }

        if (systemInstruction) {
            requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        let retries = 3;
        let lastError = null;
        let delay = 1000;

        while (retries >= 0) {
            const apiKey = keyPool.getNextKey();
            if (!apiKey) {
                throw new Error('没有可用的 Gemini API Key');
            }

            const releaseConcurrency = await acquireGeminiConcurrencySlot({
                providerId: this.config.id || 'default',
                baseUrl,
                model: cleanModel,
                stream: false,
                signal: options.signal
            });

            try {
                const response = await fetch('/api/gmi-serving', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: options.signal,
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
                        if (data.error.code === 401 || data.error.code === 403) {
                            keyPool.markKeyFailed(apiKey, data.error.code);
                            throw new Error(errMsg);
                        }
                        if (data.error.code === 429 || isRetryableError(errMsg)) {
                            lastError = new Error(errMsg);
                            if (data.error.code === 429) {
                                keyPool.markKeyFailed(apiKey, data.error.code);
                            }
                            if (retries > 0) {
                                releaseConcurrency();
                                await sleepWithAbort(delay, options.signal);
                                retries--;
                                delay *= 2;
                                continue;
                            }
                            throw lastError;
                        }
                        throw new Error(errMsg);
                    }

                    const candidate = data.candidates?.[0];
                    const usedSearch = didCandidateUseSearch(candidate);
                    if (typeof options.onResponseMetadata === 'function') {
                        try {
                            options.onResponseMetadata({ usedSearch });
                        } catch (metaError) {
                            console.warn('[Gemini] onResponseMetadata callback failed:', metaError);
                        }
                    }
                    return candidate?.content?.parts?.[0]?.text || "";
                }

                if (response.status === 401 || response.status === 403) {
                    keyPool.markKeyFailed(apiKey, response.status);
                    throw new Error(`API Key 已失效 (${response.status})，请更换 Key`);
                }
                if (response.status === 429) {
                    lastError = new Error(`API Error ${response.status}: ${response.statusText || 'Too Many Requests'}`);
                    keyPool.markKeyFailed(apiKey, response.status);
                    if (retries > 0) {
                        releaseConcurrency();
                        await sleepWithAbort(delay, options.signal);
                        retries--;
                        delay *= 2;
                        continue;
                    }
                    throw lastError;
                }

                if (isRetryableStatusCode(response.status) && retries > 0) {
                    lastError = new Error(`API Error ${response.status}: ${response.statusText || 'Temporary upstream failure'}`);
                    releaseConcurrency();
                    await sleepWithAbort(delay, options.signal);
                    retries--;
                    delay *= 2;
                    continue;
                }

                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || err.message || `API Error ${response.status}: ${response.statusText}`);
            } catch (e) {
                if (e.name === 'AbortError' || options.signal?.aborted) {
                    throw e;
                }
                console.error('[Gemini] Chat error details:', e);
                if (retries > 0 && (isRetryableError(e.message) || e instanceof TypeError)) {
                    releaseConcurrency();
                    await sleepWithAbort(delay, options.signal);
                    retries--;
                    delay *= 2;
                    lastError = e;
                    continue;
                }
                throw e;
            } finally {
                releaseConcurrency();
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
                temperature: options.temperature !== undefined ? options.temperature : 1.0
            }
        };

        if (options.tools) {
            requestBody.tools = options.tools;
        } else if (options.useSearch !== false) {
            // Default to enabling Google Search unless explicitly disabled.
            requestBody.tools = [{ google_search: {} }];
        }

        // Force Gemini 3 Flash family to always run with HIGH thinking.
        const forcedThinkingLevel = this._isGemini3FlashModel(cleanModel)
            ? 'HIGH'
            : this._normalizeThinkingLevel(options.thinkingLevel);
        if (forcedThinkingLevel) {
            requestBody.generationConfig.thinkingConfig = { thinkingLevel: forcedThinkingLevel };
        }
        if (options.mediaResolution) {
            requestBody.generationConfig.mediaResolution = options.mediaResolution;
        }

        if (systemInstruction) {
            requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        let retries = 3;
        let lastError = null;
        let delay = 1000;

        while (retries >= 0) {
            const apiKey = keyPool.getNextKey();
            if (!apiKey) {
                throw new Error('没有可用的 Gemini API Key');
            }

            const releaseConcurrency = await acquireGeminiConcurrencySlot({
                providerId: this.config.id || 'default',
                baseUrl,
                model: cleanModel,
                stream: true,
                signal: options.signal
            });

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
                    if (errStatus === 401 || errStatus === 403) {
                        keyPool.markKeyFailed(apiKey, errStatus);
                        throw new Error(`API Key 已失效 (${errStatus})，请更换 Key`);
                    }
                    if (errStatus === 429) {
                        lastError = new Error(`API Error ${errStatus}: ${response.statusText || 'Too Many Requests'}`);
                        keyPool.markKeyFailed(apiKey, errStatus);
                        if (retries > 0) {
                            releaseConcurrency();
                            await sleepWithAbort(delay, options.signal);
                            retries--;
                            delay *= 2;
                            continue;
                        }
                        throw lastError;
                    }

                    if (isRetryableStatusCode(errStatus) && retries > 0) {
                        lastError = new Error(`API Error ${errStatus}: ${response.statusText || 'Temporary upstream failure'}`);
                        releaseConcurrency();
                        await sleepWithAbort(delay, options.signal);
                        retries--;
                        delay *= 2;
                        continue;
                    }

                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.error?.message || errData.message || `API Error ${errStatus}: ${response.statusText}`);
                }

                const reader = response.body.getReader();
                try {
                    const streamMeta = await parseGeminiStream(reader, onToken, () => { });
                    if (typeof options.onResponseMetadata === 'function') {
                        try {
                            options.onResponseMetadata({ usedSearch: !!streamMeta?.usedSearch });
                        } catch (metaError) {
                            console.warn('[Gemini] onResponseMetadata callback failed:', metaError);
                        }
                    }
                    return;
                } finally {
                    reader.releaseLock();
                }

            } catch (e) {
                if (e.name === 'AbortError' || options.signal?.aborted) throw e;

                if (retries > 0 && (isRetryableError(e.message) || e instanceof TypeError)) {
                    lastError = e;
                    releaseConcurrency();
                    await sleepWithAbort(delay, options.signal);
                    retries--;
                    delay *= 2;
                    continue;
                }
                throw e;
            } finally {
                releaseConcurrency();
            }
        }

        throw lastError || new Error('Gemini 流式请求失败');
    }

    /**
     * Generate Image using GMI Cloud Async API
     */
    async generateImage(prompt, model, options = {}) {
        const apiKey = this._getKeyPool().getNextKey();
        return generateGeminiImage(apiKey, prompt, model, options);
    }
}
