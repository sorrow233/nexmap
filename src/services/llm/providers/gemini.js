import { LLMProvider } from './base';
import { resolveAllImages } from '../utils';
import { generateGeminiImage } from '../../image/geminiImageGenerator';
import {
    isRetryableError,
    isRetryableStatus,
    isKeyFailureStatus,
    isRetryableNetworkError,
    computeBackoffDelay,
    isAbortError
} from './gemini/errorUtils';
import { parseGeminiStream, didCandidateUseSearch } from './gemini/streamParser';
import { getKeyPool } from '../keyPoolManager';

const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

    _normalizeStatusCode(statusLike) {
        const n = Number(statusLike);
        return Number.isFinite(n) ? n : null;
    }

    _shouldFallbackToProxyStatus(statusCode) {
        const code = Number(statusCode);
        return code === 408 || code === 500 || code === 502 || code === 503 || code === 504 || code === 524;
    }

    _extractRetryDelayMs(errorMessage = '') {
        const text = String(errorMessage || '');
        const directMatch = text.match(/retry in\s+(\d+(?:\.\d+)?)s/i);
        if (directMatch) {
            return Math.max(1000, Math.ceil(Number(directMatch[1]) * 1000));
        }

        const jsonMatch = text.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
        if (jsonMatch) {
            return Math.max(1000, Number(jsonMatch[1]) * 1000);
        }

        return null;
    }

    _extractStatusCodeFromMessage(message = '') {
        const str = String(message || '');
        const tagged = str.match(/(?:API Error|Upstream Error)\s+(\d{3})/i);
        if (tagged) return Number(tagged[1]);

        const generic = str.match(/\b([45]\d{2})\b/);
        if (generic) return Number(generic[1]);
        return null;
    }

    _getResolvedBaseUrl() {
        const base = this.config?.baseUrl?.trim();
        const keysString = this.config?.apiKeys || this.config?.apiKey || '';
        const hasGoogleKey = String(keysString)
            .split(',')
            .map(k => k.trim())
            .some(k => k.startsWith('AIza'));

        if (base && base.includes('api.gmi-serving.com') && hasGoogleKey) {
            console.warn('[Gemini] Legacy GMI baseUrl detected with Google API key, auto-switching to official Gemini endpoint');
            return DEFAULT_GEMINI_BASE_URL;
        }

        return base || DEFAULT_GEMINI_BASE_URL;
    }

    _shouldTryDirect(baseUrl = '') {
        return String(baseUrl).includes('generativelanguage.googleapis.com');
    }

    _buildDirectUrl(baseUrl, cleanModel, stream = false) {
        const endpoint = stream ? ':streamGenerateContent' : ':generateContent';
        const query = stream ? '?alt=sse' : '';
        return `${baseUrl.replace(/\/$/, '')}/models/${cleanModel}${endpoint}${query}`;
    }

    /**
     * Gemini 原生协议转换
     */
    formatMessages(messages) {
        const contents = [];
        let systemInstruction = '';

        messages.forEach(msg => {
            if (msg.role === 'system') {
                systemInstruction += (typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)) + '\n';
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

    async _fetchDirect({ apiKey, baseUrl, cleanModel, requestBody, stream = false, signal }) {
        const rawUrl = this._buildDirectUrl(baseUrl, cleanModel, stream);
        const sep = rawUrl.includes('?') ? '&' : '?';
        const url = `${rawUrl}${sep}key=${encodeURIComponent(apiKey)}`;

        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': stream ? 'text/event-stream, application/json' : 'application/json'
            },
            signal,
            body: JSON.stringify(requestBody)
        });
    }

    async _fetchProxy({ apiKey, baseUrl, cleanModel, requestBody, stream = false, signal }) {
        const endpoint = stream
            ? `/models/${cleanModel}:streamGenerateContent`
            : `/models/${cleanModel}:generateContent`;

        return fetch('/api/gmi-serving', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal,
            body: JSON.stringify({
                apiKey,
                baseUrl,
                model: cleanModel,
                endpoint,
                requestBody,
                stream
            })
        });
    }

    async _requestWithTransportFallback({ apiKey, baseUrl, cleanModel, requestBody, stream = false, signal }) {
        const transports = this._shouldTryDirect(baseUrl)
            ? ['direct', 'proxy']
            : ['proxy'];

        let lastNetworkError = null;

        for (const transport of transports) {
            try {
                const response = transport === 'direct'
                    ? await this._fetchDirect({ apiKey, baseUrl, cleanModel, requestBody, stream, signal })
                    : await this._fetchProxy({ apiKey, baseUrl, cleanModel, requestBody, stream, signal });

                if (
                    !response.ok &&
                    transport === 'direct' &&
                    transports.length > 1 &&
                    this._shouldFallbackToProxyStatus(response.status)
                ) {
                    console.warn(`[Gemini] Direct request returned ${response.status}, fallback to proxy`);
                    continue;
                }

                return response;
            } catch (error) {
                if (isAbortError(error) || signal?.aborted) {
                    throw error;
                }

                lastNetworkError = error;
                if (transport === 'direct' && transports.length > 1 && isRetryableNetworkError(error)) {
                    console.warn('[Gemini] Direct transport failed, fallback to proxy:', error?.message || error);
                    continue;
                }

                throw error;
            }
        }

        throw lastNetworkError || new Error('Gemini transport failed');
    }

    async _readErrorMessage(response) {
        const rawText = await response.text().catch(() => '');
        if (!rawText) return response.statusText || 'Unknown error';

        try {
            const parsed = JSON.parse(rawText);
            return parsed?.error?.message || parsed?.message || rawText;
        } catch {
            return rawText;
        }
    }

    _shouldRetry({ statusCode, errorMessage, error }) {
        if (isRetryableStatus(statusCode)) return true;
        if (isRetryableError(errorMessage)) return true;
        if (isRetryableNetworkError(error)) return true;
        return false;
    }

    _isFallbackEligible(error) {
        if (!error) return false;
        const errorMessage = error?.message || String(error);
        const statusCode = this._extractStatusCodeFromMessage(errorMessage);
        return this._shouldRetry({ statusCode, errorMessage, error }) || error?.retryable === true;
    }

    async chat(messages, model, options = {}) {
        const keyPool = this._getKeyPool();
        const baseUrl = this._getResolvedBaseUrl();
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
        } else if (options.useSearch === true) {
            // Search tool is opt-in for stability under heavy context/concurrency workloads.
            requestBody.tools = [{ google_search: {} }];
        }

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

        const maxAttempts = 6;
        let attempt = 0;
        let lastError = null;

        while (attempt < maxAttempts) {
            attempt += 1;
            const apiKey = keyPool.getNextKey();
            if (!apiKey) {
                const cooldownMs = typeof keyPool.getShortestSuspendMs === 'function'
                    ? keyPool.getShortestSuspendMs()
                    : 0;
                if (attempt < maxAttempts && cooldownMs > 0) {
                    await wait(Math.min(Math.max(cooldownMs, 1000), 15000));
                    continue;
                }
                throw new Error('没有可用的 Gemini API Key');
            }

            try {
                const response = await this._requestWithTransportFallback({
                    apiKey,
                    baseUrl,
                    cleanModel,
                    requestBody,
                    stream: false,
                    signal: options.signal
                });

                if (!response.ok) {
                    const statusCode = this._normalizeStatusCode(response.status);
                    const errorMessage = await this._readErrorMessage(response);

                    if (isKeyFailureStatus(statusCode)) {
                        keyPool.markKeyFailed(apiKey, statusCode);
                    }

                    const canRetry = attempt < maxAttempts && this._shouldRetry({ statusCode, errorMessage });
                    if (canRetry) {
                        const retryDelayMs = this._extractRetryDelayMs(errorMessage);
                        await wait(retryDelayMs || computeBackoffDelay(attempt));
                        lastError = new Error(`API Error ${statusCode || 'unknown'}: ${errorMessage}`);
                        continue;
                    }

                    throw new Error(`API Error ${statusCode || 'unknown'}: ${errorMessage}`);
                }

                const data = await response.json();
                if (data.error) {
                    const statusCode = this._normalizeStatusCode(data.error.code);
                    const errorMessage = data.error.message || JSON.stringify(data.error);

                    if (isKeyFailureStatus(statusCode)) {
                        keyPool.markKeyFailed(apiKey, statusCode);
                    }

                    const canRetry = attempt < maxAttempts && this._shouldRetry({ statusCode, errorMessage });
                    if (canRetry) {
                        const retryDelayMs = this._extractRetryDelayMs(errorMessage);
                        await wait(retryDelayMs || computeBackoffDelay(attempt));
                        lastError = new Error(errorMessage);
                        continue;
                    }

                    throw new Error(errorMessage);
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
                return candidate?.content?.parts?.[0]?.text || '';
            } catch (error) {
                if (isAbortError(error) || options.signal?.aborted) throw error;

                const errorMessage = error?.message || String(error);
                const statusCode = this._extractStatusCodeFromMessage(errorMessage);
                if (isKeyFailureStatus(statusCode)) {
                    keyPool.markKeyFailed(apiKey, statusCode);
                }

                const canRetry = attempt < maxAttempts && this._shouldRetry({ statusCode, errorMessage, error });
                if (canRetry) {
                    const retryDelayMs = this._extractRetryDelayMs(errorMessage);
                    await wait(retryDelayMs || computeBackoffDelay(attempt));
                    lastError = error;
                    continue;
                }

                console.error('[Gemini] Chat error details:', error);
                throw error;
            }
        }

        throw lastError || new Error('Gemini 请求失败');
    }

    async stream(messages, onToken, model, options = {}) {
        const keyPool = this._getKeyPool();
        const baseUrl = this._getResolvedBaseUrl();
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
        } else if (options.useSearch === true) {
            // Search tool is opt-in for stability under heavy context/concurrency workloads.
            requestBody.tools = [{ google_search: {} }];
        }

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

        const maxAttempts = 6;
        let attempt = 0;
        let lastError = null;

        while (attempt < maxAttempts) {
            attempt += 1;
            const apiKey = keyPool.getNextKey();
            if (!apiKey) {
                const cooldownMs = typeof keyPool.getShortestSuspendMs === 'function'
                    ? keyPool.getShortestSuspendMs()
                    : 0;
                if (attempt < maxAttempts && cooldownMs > 0) {
                    await wait(Math.min(Math.max(cooldownMs, 1000), 15000));
                    continue;
                }
                throw new Error('没有可用的 Gemini API Key');
            }

            try {
                const response = await this._requestWithTransportFallback({
                    apiKey,
                    baseUrl,
                    cleanModel,
                    requestBody,
                    stream: true,
                    signal: options.signal
                });

                if (!response.ok) {
                    const statusCode = this._normalizeStatusCode(response.status);
                    const errorMessage = await this._readErrorMessage(response);

                    if (isKeyFailureStatus(statusCode)) {
                        keyPool.markKeyFailed(apiKey, statusCode);
                    }

                    const canRetry = attempt < maxAttempts && this._shouldRetry({ statusCode, errorMessage });
                    if (canRetry) {
                        const retryDelayMs = this._extractRetryDelayMs(errorMessage);
                        await wait(retryDelayMs || computeBackoffDelay(attempt));
                        lastError = new Error(`API Error ${statusCode || 'unknown'}: ${errorMessage}`);
                        continue;
                    }

                    throw new Error(`API Error ${statusCode || 'unknown'}: ${errorMessage}`);
                }

                const reader = response.body?.getReader?.();
                if (!reader) {
                    throw new Error('Stream response body is empty');
                }

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
            } catch (error) {
                if (isAbortError(error) || options.signal?.aborted) throw error;

                const errorMessage = error?.message || String(error);
                const statusCode = this._extractStatusCodeFromMessage(errorMessage);
                if (isKeyFailureStatus(statusCode)) {
                    keyPool.markKeyFailed(apiKey, statusCode);
                }

                const retryableLike = error?.retryable === true ||
                    this._shouldRetry({ statusCode, errorMessage, error });
                const canRetry = attempt < maxAttempts && retryableLike;

                if (canRetry) {
                    const retryDelayMs = this._extractRetryDelayMs(errorMessage);
                    await wait(retryDelayMs || computeBackoffDelay(attempt));
                    lastError = error;
                    continue;
                }

                lastError = error;
                if (options.allowNonStreamFallback !== false && retryableLike) {
                    break;
                }

                throw error;
            }
        }

        if (!options.signal?.aborted && options.allowNonStreamFallback !== false && this._isFallbackEligible(lastError)) {
            console.warn('[Gemini] Stream failed after retries, fallback to non-stream generateContent');
            const text = await this.chat(messages, model, {
                ...options,
                signal: options.signal
            });
            if (text) {
                onToken(text);
            }
            return;
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
