import { LLMProvider } from './base';
import { getKeyPool } from '../keyPoolManager';
import { resolveChatMaxOutputTokens } from '../outputTokenLimit';
import { sanitizeMessagesForGeneration } from '../messageSanitizer';

const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 500, 502, 503, 504, 524]);
const KEY_FAILURE_STATUS_CODES = new Set([401, 403]);
const RETRYABLE_NETWORK_PATTERNS = [
    'network',
    'fetch failed',
    'failed to fetch',
    'timeout',
    'timed out',
    'socket',
    'econnreset',
    'etimedout'
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const computeRetryDelay = (attempt, baseMs = 900, maxMs = 10000) => {
    const exp = Math.min(maxMs, baseMs * (2 ** Math.max(0, attempt - 1)));
    const jitter = Math.floor(Math.random() * 250);
    return exp + jitter;
};

const extractProviderErrorMessage = (body = '', fallback = '') => {
    if (!body) return fallback;

    try {
        const parsed = JSON.parse(body);
        return parsed?.error?.message || fallback || body;
    } catch {
        return body || fallback;
    }
};

const createProviderHttpError = (message, status, body = '') => {
    const error = new Error(message || `HTTP ${status}`);
    error.status = status;
    error.body = body;
    error.retryable = RETRYABLE_STATUS_CODES.has(Number(status));
    return error;
};

const shouldRetryProviderError = (error) => {
    if (!error) return false;
    if (error.name === 'AbortError') return false;
    if (error.retryable === false) return false;
    if (error.retryable === true) return true;

    const message = String(error.message || error).toLowerCase();
    return error instanceof TypeError
        || RETRYABLE_NETWORK_PATTERNS.some((pattern) => message.includes(pattern));
};

export class OpenAIProvider extends LLMProvider {
    /**
     * 获取 KeyPool（支持多 Key 轮询）
     */
    _getKeyPool() {
        const keysString = this.config.apiKeys || this.config.apiKey || '';
        return getKeyPool(this.config.id || 'default', keysString);
    }

    /**
     * OpenAI 协议转换
     */
    formatMessages(messages) {
        return messages.map(msg => {
            if (Array.isArray(msg.content)) {
                return {
                    role: msg.role,
                    content: msg.content.map(part => {
                        if (part.type === 'text') return { type: 'text', text: part.text };
                        if (part.type === 'image') {
                            return {
                                type: 'image_url',
                                image_url: { url: `data:${part.source.media_type};base64,${part.source.data}` }
                            };
                        }
                        return null;
                    }).filter(Boolean)
                };
            }
            return msg;
        });
    }

    async chat(messages, model, options = {}) {
        const keyPool = this._getKeyPool();
        const { baseUrl } = this.config;
        const modelToUse = model || this.config.model;
        const safeBaseUrl = baseUrl || 'https://api.openai.com/v1';
        const endpoint = `${safeBaseUrl.replace(/\/$/, '')}/chat/completions`;
        const formattedMessages = this.formatMessages(sanitizeMessagesForGeneration(messages));

        let retries = 2; // 允许重试 2 次（使用不同 Key）
        let lastError = null;
        let attempt = 0;

        while (retries >= 0) {
            attempt += 1;
            const apiKey = keyPool.getNextKey();
            if (!apiKey) {
                throw new Error('没有可用的 API Key');
            }

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: modelToUse,
                        messages: formattedMessages,
                        max_tokens: resolveChatMaxOutputTokens(options),
                        ...(options.temperature !== undefined && { temperature: options.temperature }),
                        ...(options.tools && { tools: options.tools }),
                        ...(options.tool_choice && { tool_choice: options.tool_choice })
                    })
                });

                if (!response.ok) {
                    const responseText = await response.text();
                    const errorMessage = extractProviderErrorMessage(
                        responseText,
                        response.statusText || `HTTP ${response.status}`
                    );
                    const error = createProviderHttpError(errorMessage, response.status, responseText);

                    if (KEY_FAILURE_STATUS_CODES.has(response.status)) {
                        keyPool.markKeyFailed(apiKey, `HTTP ${response.status}`);
                        lastError = error;
                        if (retries > 0) {
                            retries--;
                            continue;
                        }
                        throw error;
                    }

                    if (error.retryable && retries > 0) {
                        const delay = computeRetryDelay(attempt);
                        retries--;
                        lastError = error;
                        await sleep(delay);
                        continue;
                    }

                    throw error;
                }

                const data = await response.json();
                let content = data.choices[0].message.content || '';

                // 只对 Thinking 模型进行思考内容过滤
                const { ModelFactory } = await import('../factory');
                if (ModelFactory.isThinkingModel(modelToUse)) {
                    const thinkEndIndex = content.indexOf('</think>');
                    if (thinkEndIndex !== -1) {
                        content = content.substring(thinkEndIndex + 8).trim();
                    }
                }

                return content;
            } catch (e) {
                if (retries > 0 && !e.message.includes('没有可用') && shouldRetryProviderError(e)) {
                    retries--;
                    lastError = e;
                    await sleep(computeRetryDelay(attempt));
                    continue;
                }
                throw e;
            }
        }

        throw lastError || new Error('请求失败');
    }

    async stream(messages, onToken, model, options = {}) {
        const keyPool = this._getKeyPool();
        const { baseUrl } = this.config;
        const modelToUse = model || this.config.model;
        const safeBaseUrl = baseUrl || 'https://api.openai.com/v1';
        const endpoint = `${safeBaseUrl.replace(/\/$/, '')}/chat/completions`;
        const formattedMessages = this.formatMessages(sanitizeMessagesForGeneration(messages));

        let retries = 2; // 允许重试（使用不同 Key）
        let attempt = 0;

        while (retries >= 0) {
            attempt += 1;
            const apiKey = keyPool.getNextKey();
            if (!apiKey) {
                throw new Error('没有可用的 API Key');
            }

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    signal: options.signal,
                    body: JSON.stringify({
                        model: modelToUse,
                        messages: formattedMessages,
                        max_tokens: resolveChatMaxOutputTokens(options),
                        ...(options.temperature !== undefined && { temperature: options.temperature }),
                        stream: true,
                        ...(options.tools && { tools: options.tools }),
                        ...(options.tool_choice && { tool_choice: options.tool_choice })
                    })
                });

                if (!response.ok) {
                    const responseText = await response.text();
                    const errorMessage = extractProviderErrorMessage(
                        responseText,
                        response.statusText || `HTTP ${response.status}`
                    );
                    const error = createProviderHttpError(errorMessage, response.status, responseText);

                    if (KEY_FAILURE_STATUS_CODES.has(response.status)) {
                        keyPool.markKeyFailed(apiKey, `HTTP ${response.status}`);
                        if (retries > 0) {
                            retries--;
                            continue;
                        }
                        throw error;
                    }

                    if (error.retryable && retries > 0) {
                        const delay = computeRetryDelay(attempt);
                        console.warn(`[OpenAI] Request failed with ${response.status}, retrying in ${delay}ms...`);
                        retries--;
                        await sleep(delay);
                        continue;
                    }

                    throw error;
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder("utf-8");
                let buffer = '';

                // 思考过程过滤 - 基于模型名预判
                // Thinking 模型 (Kimi-K2.5, DeepSeek-R1) 会输出 <think>...</think>
                // 需要缓冲并过滤，非 thinking 模型直通输出
                const { ModelFactory } = await import('../factory');
                const isThinkingModel = ModelFactory.isThinkingModel(modelToUse);

                let thinkingBuffer = '';
                let foundThinkEnd = !isThinkingModel; // 非 thinking 模型直接标记为已找到

                const processContent = (content) => {
                    if (!content) return;

                    if (foundThinkEnd) {
                        // 非 thinking 模型或已过滤完思考：直通输出
                        onToken(content);
                        return;
                    }

                    // Thinking 模型：缓冲等待 </think>
                    thinkingBuffer += content;

                    const thinkEndIndex = thinkingBuffer.indexOf('</think>');
                    if (thinkEndIndex !== -1) {
                        foundThinkEnd = true;
                        // 只输出 </think> 之后的内容
                        const afterThink = thinkingBuffer.substring(thinkEndIndex + 8);
                        if (afterThink.trim()) {
                            onToken(afterThink);
                        }
                        thinkingBuffer = '';
                    }
                };

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop();

                        for (const line of lines) {
                            const trimmedLine = line.trim();
                            if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
                                try {
                                    const json = JSON.parse(trimmedLine.substring(6));
                                    const content = json.choices[0]?.delta?.content;
                                    processContent(content);
                                } catch (e) { }
                            }
                        }
                    }

                    if (buffer.trim()) {
                        const trimmedLine = buffer.trim();
                        if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
                            try {
                                const json = JSON.parse(trimmedLine.substring(6));
                                const content = json.choices[0]?.delta?.content;
                                processContent(content);
                            } catch (e) { }
                        }
                    }

                    // 如果流结束时还有未输出的缓冲内容（非 thinking 模型），输出它
                    if (!foundThinkEnd && thinkingBuffer) {
                        onToken(thinkingBuffer);
                    }

                    return;
                } finally {
                    reader.releaseLock();
                }

            } catch (e) {
                if (retries > 0 && !e.message.includes('没有可用') && shouldRetryProviderError(e)) {
                    const delay = computeRetryDelay(attempt);
                    console.warn(`[OpenAI] Stream error: ${e.message}, retrying in ${delay}ms...`);
                    retries--;
                    await sleep(delay);
                    continue;
                }
                throw e;
            }
        }
    }

    async generateImage(prompt, model, options = {}) {
        const { apiKey, baseUrl } = this.config;
        const modelToUse = model || this.config.model || 'gpt-4o';

        // Check if this model/provider uses the unified chat completion endpoint for images
        const isUnifiedImageModel = modelToUse.includes('gemini') && modelToUse.includes('image');

        if (isUnifiedImageModel) {
            console.log(`[OpenAI] Redirecting image generation for ${modelToUse} to chat endpoint`);
            const safeBaseUrl = baseUrl || 'https://api.openai.com/v1';
            const endpoint = `${safeBaseUrl.replace(/\/$/, '')}/chat/completions`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: modelToUse,
                    messages: [{ role: 'user', content: prompt }],
                    extra_body: {
                        size: options.size || "1024x1024"
                    }
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || response.statusText);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            // Typically returned as a plain URL string or markdown image in the content
            const urlMatch = content.match(/https?:\/\/[^\s\)]+/);
            return urlMatch ? urlMatch[0] : content;
        }

        // Standard OpenAI DALL-E endpoint
        const safeBaseUrl = baseUrl || 'https://api.openai.com/v1';
        const endpoint = `${safeBaseUrl.replace(/\/$/, '')}/images/generations`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelToUse,
                prompt: prompt,
                n: 1,
                size: options.size || "1024x1024",
                response_format: "url"
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || response.statusText);
        }

        const result = await response.json();
        return result.data[0].url;
    }
}
