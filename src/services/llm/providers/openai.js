import { LLMProvider } from './base';

export class OpenAIProvider extends LLMProvider {
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
        const { apiKey, baseUrl } = this.config;
        const modelToUse = model || this.config.model;
        const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

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
            throw new Error(err.error?.message || response.statusText);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async stream(messages, onToken, model, options = {}) {
        const { apiKey, baseUrl } = this.config;
        const modelToUse = model || this.config.model;
        const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

        let retries = 1; // Retry once on network error
        let delay = 1000;

        while (retries >= 0) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    signal: options.signal, // Pass AbortSignal
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
                    if ([429, 500, 502, 503, 504].includes(response.status) && retries > 0) {
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

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                                try {
                                    const json = JSON.parse(line.substring(6));
                                    const content = json.choices[0]?.delta?.content;
                                    if (content) onToken(content);
                                } catch (e) { }
                            }
                        }
                    }
                    return; // Success
                } finally {
                    reader.releaseLock();
                }

            } catch (e) {
                if (retries > 0) {
                    console.warn(`[OpenAI] Stream error: ${e.message}, retrying in ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                    retries--;
                    delay *= 2;
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
            const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

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
        const endpoint = `${baseUrl.replace(/\/$/, '')}/images/generations`;

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
