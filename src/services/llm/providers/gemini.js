import { LLMProvider } from './base';
import { resolveRemoteImages, getAuthMethod } from '../utils';

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
                    if (part.type === 'image') return {
                        inline_data: {
                            mime_type: part.source.media_type,
                            data: part.source.data
                        }
                    };
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

    async chat(messages, model, options = {}) {
        const { apiKey, baseUrl } = this.config;
        const modelToUse = model || this.config.model;

        let cleanModel = (baseUrl.indexOf('gmi') !== -1) ? modelToUse.replace('google/', '') : modelToUse;
        const authMethod = getAuthMethod(baseUrl);

        let endpoint = `${baseUrl.replace(/\/$/, '')}/models/${cleanModel}:generateContent`;
        if (authMethod === 'query') endpoint += `?key=${apiKey}`;

        const resolvedMessages = await resolveRemoteImages(messages);
        const { contents, systemInstruction } = this.formatMessages(resolvedMessages);

        const requestBody = {
            contents,
            tools: [{ google_search: {} }],
            generationConfig: {
                temperature: options.temperature !== undefined ? options.temperature : 0.7,
                maxOutputTokens: 65536
            }
        };

        if (systemInstruction) {
            requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        let retries = 3;
        while (retries >= 0) {
            try {
                const headers = { 'Content-Type': 'application/json' };
                if (authMethod === 'bearer') headers['Authorization'] = `Bearer ${apiKey}`;

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(requestBody)
                });

                if (response.ok) {
                    const data = await response.json();
                    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                }

                if ([500, 502, 503, 504].indexOf(response.status) !== -1 && retries > 0) {
                    await new Promise(r => setTimeout(r, 2000));
                    retries--; continue;
                }

                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || response.statusText);
            } catch (e) {
                if (retries > 0) { retries--; await new Promise(r => setTimeout(r, 2000)); continue; }
                throw e;
            }
        }
    }

    async stream(messages, onToken, model, options = {}) {
        const { apiKey, baseUrl } = this.config;
        const modelToUse = model || this.config.model;

        let cleanModel = (baseUrl.indexOf('gmi') !== -1) ? modelToUse.replace('google/', '') : modelToUse;
        const authMethod = getAuthMethod(baseUrl);

        let endpoint = `${baseUrl.replace(/\/$/, '')}/models/${cleanModel}:streamGenerateContent`;
        if (authMethod === 'query') endpoint += `?key=${apiKey}`;

        const resolvedMessages = await resolveRemoteImages(messages);
        const { contents, systemInstruction } = this.formatMessages(resolvedMessages);

        const requestBody = {
            contents,
            tools: [{ google_search: {} }],
            generationConfig: {
                temperature: options.temperature !== undefined ? options.temperature : 0.7,
                maxOutputTokens: 65536
            }
        };

        if (systemInstruction) {
            requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        const headers = { 'Content-Type': 'application/json' };
        if (authMethod === 'bearer') headers['Authorization'] = `Bearer ${apiKey}`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || response.statusText);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) onToken(text);
                    } catch (e) {
                        const jsonMatch = line.match(/\{.*\}/);
                        if (jsonMatch) {
                            try {
                                const data = JSON.parse(jsonMatch[0]);
                                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                                if (text) onToken(text);
                            } catch (e2) { }
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }
}
