import { LLMProvider } from './base';
import { getKeyPool } from '../keyPoolManager';

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

        let retries = 2; // 允许重试 2 次（使用不同 Key）
        let lastError = null;

        while (retries >= 0) {
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
                        messages: this.formatMessages(messages),
                        max_tokens: 16384,
                        ...(options.temperature !== undefined && { temperature: options.temperature }),
                        ...(options.tools && { tools: options.tools }),
                        ...(options.tool_choice && { tool_choice: options.tool_choice })
                    })
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));

                    // Key 无效或超限，标记失效
                    if ([401, 403, 429].includes(response.status)) {
                        keyPool.markKeyFailed(apiKey, `HTTP ${response.status}`);
                        retries--;
                        lastError = new Error(err.error?.message || `API 错误 ${response.status}`);
                        continue;
                    }
                    throw new Error(err.error?.message || response.statusText);
                }

                const data = await response.json();
                let content = data.choices[0].message.content || '';

                // 过滤思考内容：移除 </think> 之前的所有内容（包括标签本身）
                const thinkEndIndex = content.indexOf('</think>');
                if (thinkEndIndex !== -1) {
                    content = content.substring(thinkEndIndex + 8).trim(); // 8 = '</think>'.length
                }

                return content;
            } catch (e) {
                if (retries > 0 && !e.message.includes('没有可用')) {
                    retries--;
                    lastError = e;
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

        let retries = 2; // 允许重试（使用不同 Key）
        let delay = 1000;

        while (retries >= 0) {
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
                        messages: this.formatMessages(messages),
                        max_tokens: 16384,
                        ...(options.temperature !== undefined && { temperature: options.temperature }),
                        stream: true,
                        ...(options.tools && { tools: options.tools }),
                        ...(options.tool_choice && { tool_choice: options.tool_choice })
                    })
                });

                if (!response.ok) {
                    // Key 无效或超限，标记失效并切换
                    if ([401, 403, 429].includes(response.status)) {
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
                    throw new Error(await response.text());
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder("utf-8");
                let buffer = '';

                // 思考过程过滤状态
                // Kimi 等 thinking 模型会输出 <think>...</think> 包裹的思考内容
                // 我们需要跳过这些内容，只输出 </think> 之后的实际回答
                let thinkingBuffer = '';
                let foundThinkEnd = false;
                let checkedForThinking = false; // 是否已检测过是否为 thinking 模型

                const processContent = (content) => {
                    if (!content) return;

                    if (foundThinkEnd) {
                        // 已经找到 </think> 或已确认不是 thinking 模型，直接输出
                        onToken(content);
                        return;
                    }

                    // 累积内容检测 </think>
                    thinkingBuffer += content;

                    // 快速检测：前50个字符内如果没有 "<" 开头，基本可以确定不是 thinking 模型
                    if (!checkedForThinking && thinkingBuffer.length >= 50) {
                        checkedForThinking = true;
                        // 检查开头是否可能是思考内容
                        const trimmedStart = thinkingBuffer.trimStart();
                        // 思考内容通常以空格、大写字母或 "<think>" 开头
                        // 如果开头是 markdown（#、*、-）或数字，大概率不是思考
                        if (/^[#\*\-0-9\[]/.test(trimmedStart)) {
                            // 快速判定为非 thinking 模型
                            foundThinkEnd = true;
                            onToken(thinkingBuffer);
                            thinkingBuffer = '';
                            return;
                        }
                    }

                    // 检查是否包含 </think> 标签
                    const thinkEndIndex = thinkingBuffer.indexOf('</think>');
                    if (thinkEndIndex !== -1) {
                        foundThinkEnd = true;
                        // 只输出 </think> 之后的内容
                        const afterThink = thinkingBuffer.substring(thinkEndIndex + 8); // 8 = '</think>'.length
                        if (afterThink.trim()) {
                            onToken(afterThink);
                        }
                        thinkingBuffer = ''; // 清空缓冲
                        return;
                    }

                    // 如果累积了超过 500 字符还没找到 </think>，判定为非 thinking 模型
                    // 直接输出所有累积内容并切换到直通模式
                    if (thinkingBuffer.length > 500) {
                        foundThinkEnd = true;
                        onToken(thinkingBuffer);
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
                if (retries > 0 && !e.message.includes('没有可用')) {
                    console.warn(`[OpenAI] Stream error: ${e.message}, retrying...`);
                    retries--;
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
