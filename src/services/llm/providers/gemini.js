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
        const cleanModel = (baseUrl.indexOf('gmi') !== -1) ? modelToUse.replace('google/', '') : modelToUse;

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
                const response = await fetch('/api/gmi-proxy', {
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
        const cleanModel = (baseUrl.indexOf('gmi') !== -1) ? modelToUse.replace('google/', '') : modelToUse;

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
        let delay = 1000;

        while (retries >= 0) {
            try {
                const response = await fetch('/api/gmi-proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: options.signal, // Pass AbortSignal
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
                    if ([429, 500, 502, 503, 504].includes(response.status) && retries > 0) {
                        console.warn(`[Gemini] Request failed with ${response.status}, retrying in ${delay}ms...`);
                        await new Promise(r => setTimeout(r, delay));
                        retries--;
                        delay *= 2;
                        continue;
                    }

                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error?.message || response.statusText);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let previousText = ''; // Track cumulative text to calculate deltas
                let buffer = '';

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const chunk = decoder.decode(value, { stream: true });
                        buffer += chunk;
                        const lines = buffer.split('\n');
                        // Keep the last line in the buffer as it might be incomplete
                        buffer = lines.pop();

                        for (const line of lines) {
                            let cleanLine = line.trim();
                            if (!cleanLine) continue;

                            // 1. Remove "data: " prefix (Standard SSE)
                            if (cleanLine.startsWith('data: ')) {
                                cleanLine = cleanLine.substring(6).trim();
                            }

                            if (cleanLine === '[DONE]') continue;

                            try {
                                let data;
                                try {
                                    data = JSON.parse(cleanLine);
                                } catch (jsonError) {
                                    // 2. Handle Python bytes string representation: b'{...}'
                                    // This happens when backend proxies the error bytes directly without decoding
                                    if (cleanLine.startsWith("b'") && cleanLine.endsWith("'")) {
                                        const inner = cleanLine.substring(2, cleanLine.length - 1);
                                        // Try to parse the inner content (assuming it's JSON inside)
                                        data = JSON.parse(inner);
                                    } else {
                                        throw jsonError;
                                    }
                                }

                                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                                if (text) {
                                    const delta = text.substring(previousText.length);
                                    if (delta) {
                                        onToken(delta);
                                        previousText = text;
                                    }
                                }
                            } catch (e) {
                                console.warn('[Gemini] Parse error for line:', line, e);
                            }
                        }
                    }

                    // Process any remaining buffer
                    if (buffer.trim()) {
                        let cleanLine = buffer.trim();
                        if (cleanLine.startsWith('data: ')) {
                            cleanLine = cleanLine.substring(6).trim();
                        }

                        try {
                            let data;
                            try {
                                data = JSON.parse(cleanLine);
                            } catch (jsonError) {
                                if (cleanLine.startsWith("b'") && cleanLine.endsWith("'")) {
                                    const inner = cleanLine.substring(2, cleanLine.length - 1);
                                    data = JSON.parse(inner);
                                } else {
                                    throw jsonError;
                                }
                            }

                            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (text) {
                                const delta = text.substring(previousText.length);
                                if (delta) {
                                    onToken(delta);
                                }
                            }
                        } catch (e) {
                            console.warn('[Gemini] Final buffer parse error:', buffer, e);
                        }
                    }

                    return;
                } finally {
                    reader.releaseLock();
                }

            } catch (e) {
                if (retries > 0) {
                    console.warn(`[Gemini] Stream error: ${e.message}, retrying in ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                    retries--;
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
        const { apiKey } = this.config;
        const modelToUse = model || 'gemini-3-pro-image-preview';

        // Use Cloudflare Function proxy to bypass CORS
        const proxyEndpoint = '/api/image-gen';

        console.log('[Gemini] Starting image generation with model:', modelToUse);

        // 1. Submit Request
        const payload = {
            model: modelToUse,
            payload: {
                prompt: prompt,
                image_size: "2K",
                aspect_ratio: "16:9" // Suitable for background
            }
        };

        const submitResponse = await fetch(proxyEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'submit',
                apiKey: apiKey,
                payload: payload
            })
        });

        if (!submitResponse.ok) {
            const err = await submitResponse.json().catch(() => ({}));
            throw new Error(`Image Request Failed: ${err.error?.message || submitResponse.statusText}`);
        }

        const submitData = await submitResponse.json();
        const requestId = submitData.request_id;
        console.log('[Gemini] Image request queued, ID:', requestId);

        // 2. Poll for Status
        let attempts = 0;
        const maxAttempts = 30; // 60s timeout (2s interval)

        while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 2000));
            attempts++;

            const statusResponse = await fetch(proxyEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'poll',
                    apiKey: apiKey,
                    requestId: requestId
                })
            });

            if (!statusResponse.ok) continue;

            const statusData = await statusResponse.json();
            // console.log('[Gemini] Polling status:', statusData.status);

            if (statusData.status === 'success') {
                const imageUrl = statusData.outcome?.media_urls?.[0]?.url;
                if (!imageUrl) throw new Error("Image generated but no URL found");
                return imageUrl;
            }

            if (statusData.status === 'failed' || statusData.status === 'cancelled') {
                throw new Error(`Image Generation Failed: ${statusData.status}`);
            }
        }

        throw new Error("Image generation timed out");
    }
}


