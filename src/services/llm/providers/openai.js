import { LLMProvider } from './base';
import { getKeyPool } from '../keyPoolManager';
import {
    getConfiguredProviderApiKeys,
    providerRequiresApiKey
} from '../providerAccess';
import { resolveChatMaxOutputTokens } from '../outputTokenLimit';
import { settleStreamReader } from '../streamTailGrace.js';
import { resolveAllImages } from '../utils';
import { normalizeOpenAIImagePayloads } from './openai/imagePayload';
import { createThinkingTagFilter, parseOpenAIStreamLine } from './openai/streamProtocol.js';
import {
    KIMI_WEB_SEARCH_MAX_TOOL_ROUNDS,
    appendKimiWebSearchToolMessages,
    getKimiNativeWebSearchBodyFields,
    hasKimiWebSearchToolCall,
    shouldEnableKimiNativeWebSearch
} from './openai/kimiSearch.js';

const hasMeaningfulText = (text) => String(text ?? '').trim().length > 0;
const isPermanentOpenAIStatus = (statusCode) => {
    const code = Number(statusCode);
    return Number.isFinite(code) && code >= 400 && code < 500 && ![401, 403, 408, 409, 429].includes(code);
};

const hasResolvableImageSource = (part = {}) => {
    const source = part?.source;
    if (!source) return false;
    return Boolean(source.data || source.url || source.s3Url || source.id);
};

const sanitizeMessageContent = (content) => {
    if (Array.isArray(content)) {
        const nextParts = content.map((part) => {
            if (!part || typeof part !== 'object') {
                return null;
            }

            if (part.type === 'text') {
                const text = String(part.text ?? '');
                if (!hasMeaningfulText(text)) {
                    return null;
                }
                return {
                    ...part,
                    text
                };
            }

            if (part.type === 'image') {
                if (!hasResolvableImageSource(part)) {
                    return null;
                }
                return part;
            }

            return null;
        }).filter(Boolean);

        return nextParts.length > 0 ? nextParts : null;
    }

    if (typeof content === 'string') {
        return hasMeaningfulText(content) ? content : null;
    }

    return null;
};

const sanitizeMessages = (messages = []) => (
    Array.isArray(messages)
        ? messages.map((msg) => {
            if (!msg || typeof msg !== 'object' || !msg.role) {
                return null;
            }

            const content = sanitizeMessageContent(msg.content);
            if (content == null) {
                return null;
            }

            return {
                ...msg,
                content
            };
        }).filter(Boolean)
        : []
);

export class OpenAIProvider extends LLMProvider {
    /**
     * 获取 KeyPool（支持多 Key 轮询）
     */
    _getKeyPool() {
        const keysString = getConfiguredProviderApiKeys(this.config).join(',');
        return getKeyPool(this.config.id || 'default', keysString);
    }

    _requiresApiKey() {
        return providerRequiresApiKey(this.config);
    }

    _getNextApiKey(keyPool) {
        const apiKey = keyPool.getNextKey();
        if (apiKey) return apiKey;

        if (this._requiresApiKey()) {
            throw new Error('当前提供商缺少可用 API Key');
        }

        return null;
    }

    _buildJsonHeaders(apiKey = null) {
        return {
            'Content-Type': 'application/json',
            ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        };
    }

    /**
     * OpenAI 协议转换
     */
    formatMessages(messages) {
        return sanitizeMessages(messages).map(msg => {
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

    _buildChatRequestBody({ modelToUse, messages, options = {}, stream = false, kimiNativeWebSearch = false }) {
        const requestBody = {
            model: modelToUse,
            messages,
            max_tokens: resolveChatMaxOutputTokens(options),
            ...(options.temperature !== undefined && { temperature: options.temperature }),
            ...(stream && { stream: true })
        };

        if (kimiNativeWebSearch) {
            return {
                ...requestBody,
                ...getKimiNativeWebSearchBodyFields()
            };
        }

        return {
            ...requestBody,
            ...(options.tools && { tools: options.tools }),
            ...(options.tool_choice && { tool_choice: options.tool_choice })
        };
    }

    _shouldUseKimiNativeWebSearch(modelToUse, options = {}) {
        return shouldEnableKimiNativeWebSearch({
            config: this.config,
            model: modelToUse,
            options
        });
    }

    _emitResponseMetadata(options = {}, metadata = {}) {
        if (typeof options.onResponseMetadata !== 'function') return;

        try {
            options.onResponseMetadata(metadata);
        } catch (metaError) {
            console.warn('[OpenAI] onResponseMetadata callback failed:', metaError);
        }
    }

    async _stripThinkingContent(content, modelToUse) {
        let nextContent = content || '';
        const { ModelFactory } = await import('../factory');

        if (ModelFactory.isThinkingModel(modelToUse)) {
            const thinkEndIndex = nextContent.indexOf('</think>');
            if (thinkEndIndex !== -1) {
                nextContent = nextContent.substring(thinkEndIndex + 8).trim();
            }
        }

        return nextContent;
    }

    async _requestChatJson({ keyPool, endpoint, requestBody, signal = null }) {
        let retries = 2;
        let lastError = null;

        while (retries >= 0) {
            const apiKey = this._getNextApiKey(keyPool);

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: this._buildJsonHeaders(apiKey),
                    ...(signal && { signal }),
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));

                    if (apiKey && [401, 403, 429].includes(response.status)) {
                        keyPool.markKeyFailed(apiKey, `HTTP ${response.status}`);
                        retries--;
                        lastError = new Error(err.error?.message || `API 错误 ${response.status}`);
                        continue;
                    }

                    const error = new Error(err.error?.message || response.statusText);
                    error.statusCode = response.status;
                    throw error;
                }

                return response.json();
            } catch (e) {
                if (e.name === 'AbortError' || signal?.aborted) {
                    throw e;
                }

                if (retries > 0 && !e.message.includes('没有可用') && !isPermanentOpenAIStatus(e?.statusCode)) {
                    retries--;
                    lastError = e;
                    continue;
                }
                throw e;
            }
        }

        throw lastError || new Error('请求失败');
    }

    async _chatWithKimiNativeWebSearch({ keyPool, endpoint, modelToUse, formattedMessages, options = {} }) {
        let toolRounds = 0;
        let usedSearch = false;
        let messagesWithToolResults = [...formattedMessages];

        while (toolRounds <= KIMI_WEB_SEARCH_MAX_TOOL_ROUNDS) {
            const data = await this._requestChatJson({
                keyPool,
                endpoint,
                requestBody: this._buildChatRequestBody({
                    modelToUse,
                    messages: messagesWithToolResults,
                    options,
                    kimiNativeWebSearch: true
                }),
                signal: options.signal
            });

            const choice = data.choices?.[0] || {};

            if (hasKimiWebSearchToolCall(choice)) {
                usedSearch = true;
                toolRounds += 1;

                if (toolRounds > KIMI_WEB_SEARCH_MAX_TOOL_ROUNDS) {
                    throw new Error('Kimi 联网搜索工具调用超过最大轮数');
                }

                messagesWithToolResults = appendKimiWebSearchToolMessages(messagesWithToolResults, choice);
                continue;
            }

            this._emitResponseMetadata(options, { usedSearch });
            return this._stripThinkingContent(choice.message?.content || '', modelToUse);
        }

        throw new Error('Kimi 联网搜索工具调用超过最大轮数');
    }

    async chat(messages, model, options = {}) {
        const keyPool = this._getKeyPool();
        const { baseUrl } = this.config;
        const modelToUse = model || this.config.model;
        const safeBaseUrl = baseUrl || 'https://api.openai.com/v1';
        const endpoint = `${safeBaseUrl.replace(/\/$/, '')}/chat/completions`;
        const resolvedMessages = await resolveAllImages(messages);
        const normalizedMessages = await normalizeOpenAIImagePayloads(resolvedMessages);
        const formattedMessages = this.formatMessages(normalizedMessages);

        if (formattedMessages.length === 0) {
            throw new Error('没有可发送的有效消息');
        }

        if (this._shouldUseKimiNativeWebSearch(modelToUse, options)) {
            return this._chatWithKimiNativeWebSearch({
                keyPool,
                endpoint,
                modelToUse,
                formattedMessages,
                options
            });
        }

        const data = await this._requestChatJson({
            keyPool,
            endpoint,
            requestBody: this._buildChatRequestBody({
                modelToUse,
                messages: formattedMessages,
                options
            }),
            signal: options.signal
        });
        const content = data.choices?.[0]?.message?.content || '';
        return this._stripThinkingContent(content, modelToUse);
    }

    async stream(messages, onToken, model, options = {}) {
        const keyPool = this._getKeyPool();
        const { baseUrl } = this.config;
        const modelToUse = model || this.config.model;
        const safeBaseUrl = baseUrl || 'https://api.openai.com/v1';
        const endpoint = `${safeBaseUrl.replace(/\/$/, '')}/chat/completions`;
        const resolvedMessages = await resolveAllImages(messages);
        const normalizedMessages = await normalizeOpenAIImagePayloads(resolvedMessages);
        const formattedMessages = this.formatMessages(normalizedMessages);

        if (formattedMessages.length === 0) {
            throw new Error('没有可发送的有效消息');
        }

        if (options?.useSearch === true && this._shouldUseKimiNativeWebSearch(modelToUse, options)) {
            const content = await this._chatWithKimiNativeWebSearch({
                keyPool,
                endpoint,
                modelToUse,
                formattedMessages,
                options
            });
            if (content) {
                onToken(content);
            }
            return;
        }

        let retries = 2; // 允许重试（使用不同 Key）
        let delay = 1000;

        while (retries >= 0) {
            const apiKey = this._getNextApiKey(keyPool);

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: this._buildJsonHeaders(apiKey),
                    signal: options.signal,
                    body: JSON.stringify(this._buildChatRequestBody({
                        modelToUse,
                        messages: formattedMessages,
                        options,
                        stream: true
                    }))
                });

                if (!response.ok) {
                    // Key 无效或超限，标记失效并切换
                    if (apiKey && [401, 403, 429].includes(response.status)) {
                        keyPool.markKeyFailed(apiKey, `HTTP ${response.status}`);
                        retries--;
                        continue;
                    }
                    if ([500, 502, 503, 504].includes(response.status) && retries > 0) {
                        console.warn(`[OpenAI] Request failed with ${response.status}, retrying in ${delay}ms...`);
                        await new Promise(r => setTimeout(r, delay));
                        retries--;
                        delay *= 2;
                        continue;
                    }
                    const error = new Error(await response.text());
                    error.statusCode = response.status;
                    throw error;
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder("utf-8");
                let buffer = '';
                let sawTerminal = false;

                // 思考过程过滤 - 基于模型名预判
                // Thinking 模型 (Kimi-K2.5, DeepSeek-R1) 会输出 <think>...</think>
                // 需要缓冲并过滤，非 thinking 模型直通输出
                const { ModelFactory } = await import('../factory');
                const isThinkingModel = ModelFactory.isThinkingModel(modelToUse);

                const contentFilter = createThinkingTagFilter({
                    enabled: isThinkingModel,
                    onToken
                });

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            try {
                                const parsed = parseOpenAIStreamLine(line);
                                if (parsed.delta) {
                                    contentFilter.push(parsed.delta);
                                }
                                if (parsed.isTerminal) {
                                    sawTerminal = true;
                                    break;
                                }
                            } catch (e) {
                                if (!(e instanceof SyntaxError)) {
                                    throw e;
                                }
                            }
                        }

                        if (sawTerminal) {
                            break;
                        }
                    }

                    if (!sawTerminal && buffer.trim()) {
                        try {
                            const parsed = parseOpenAIStreamLine(buffer);
                            if (parsed.delta) {
                                contentFilter.push(parsed.delta);
                            }
                            sawTerminal = parsed.isTerminal;
                        } catch (e) {
                            if (!(e instanceof SyntaxError)) {
                                throw e;
                            }
                        }
                    }

                    if (sawTerminal) {
                        await settleStreamReader(reader);
                    }

                    contentFilter.flush();

                    return;
                } finally {
                    reader.releaseLock();
                }

            } catch (e) {
                if (retries > 0 && !e.message.includes('没有可用') && !isPermanentOpenAIStatus(e?.statusCode)) {
                    console.warn(`[OpenAI] Stream error: ${e.message}, retrying...`);
                    retries--;
                    continue;
                }
                throw e;
            }
        }
    }

    async generateImage(prompt, model, options = {}) {
        const keyPool = this._getKeyPool();
        const apiKey = this._getNextApiKey(keyPool);
        const { baseUrl } = this.config;
        const modelToUse = model || this.config.model || 'gpt-4o';

        // Check if this model/provider uses the unified chat completion endpoint for images
        const isUnifiedImageModel = modelToUse.includes('gemini') && modelToUse.includes('image');

        if (isUnifiedImageModel) {
            console.log(`[OpenAI] Redirecting image generation for ${modelToUse} to chat endpoint`);
            const safeBaseUrl = baseUrl || 'https://api.openai.com/v1';
            const endpoint = `${safeBaseUrl.replace(/\/$/, '')}/chat/completions`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: this._buildJsonHeaders(apiKey),
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
            headers: this._buildJsonHeaders(apiKey),
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
