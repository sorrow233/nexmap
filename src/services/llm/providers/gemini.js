import { LLMProvider } from './base';
import { resolveAllImages, getAuthMethod } from '../utils';
import { generateGeminiImage } from '../../image/geminiImageGenerator';
import { isRetryableError } from './gemini/errorUtils';
import { parseGeminiStream } from './gemini/streamParser';

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
                        // CRITICAL: Only include if data is actually present to avoid 400 Validation Error
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


    async chat(messages, model, options = {}) {
        const { apiKey, baseUrl = "" } = this.config;
        const modelToUse = model || this.config.model;
        const cleanModel = (baseUrl && baseUrl.indexOf('gmi') !== -1) ? modelToUse.replace('google/', '') : modelToUse;

        const resolvedMessages = await resolveAllImages(messages);
        const { contents, systemInstruction } = this.formatMessages(resolvedMessages);

        const requestBody = {
            contents,
            generationConfig: {
                temperature: options.temperature !== undefined ? options.temperature : 1.0,
                maxOutputTokens: 65536
            }
        };

        // Add tools ONLY if explicitly requested in options
        if (options.tools) {
            requestBody.tools = options.tools;
        } else if (options.useSearch) {
            requestBody.tools = [{ google_search: {} }];
        }

        // Add experimental features ONLY if explicitly requested
        if (options.thinkingLevel) {
            requestBody.generationConfig.thinkingConfig = { thinkingLevel: options.thinkingLevel };
        }
        if (options.mediaResolution) {
            requestBody.generationConfig.mediaResolution = options.mediaResolution;
        }

        // console.log('[Gemini] Generation Config:', JSON.stringify(requestBody.generationConfig, null, 2));


        if (systemInstruction) {
            requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        let retries = 5; // Allow 5 retries (6 total attempts) - GMI Cloud can be unstable

        while (retries >= 0) {
            try {
                // console.log(`[Gemini] Sending chat request to /api/gmi-serving for model ${cleanModel}`);
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

                // console.log(`[Gemini] Response status: ${response.status} ${response.statusText}`);

                if (response.ok) {
                    const data = await response.json();

                    // Check for errors in response body
                    if (data.error) {
                        const errMsg = data.error.message || JSON.stringify(data.error);
                        if (isRetryableError(errMsg) && retries > 0) {
                            console.warn(`[Gemini] Retryable error: ${errMsg}, retrying... (${retries} left)`);
                            await new Promise(r => setTimeout(r, 2000));
                            retries--;
                            continue;
                        }
                        throw new Error(errMsg);
                    }

                    const candidate = data.candidates?.[0];
                    return candidate?.content?.parts?.[0]?.text || "";
                }

                if (response.status === 404) {
                    throw new Error("API Proxy endpoint not found (404). This might be a deployment or routing issue.");
                }

                if ([500, 502, 503, 504].indexOf(response.status) !== -1 && retries > 0) {
                    console.warn(`[Gemini] Server error ${response.status}, retrying... (${retries} left)`);
                    await new Promise(r => setTimeout(r, 2000));
                    retries--; continue;
                }

                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || err.message || `API Error ${response.status}: ${response.statusText}`);
            } catch (e) {
                console.error('[Gemini] Chat error details:', e);

                // Check if error is retryable
                if (isRetryableError(e.message) && retries > 0) {
                    console.warn(`[Gemini] Retryable error: ${e.message}, retrying... (${retries} left)`);
                    await new Promise(r => setTimeout(r, 2000));
                    retries--;
                    continue;
                }

                if (retries > 0) {
                    await new Promise(r => setTimeout(r, 2000));
                    retries--;
                    continue;
                }
                throw e;
            }
        }
    }

    async stream(messages, onToken, model, options = {}) {
        const { apiKey, baseUrl = "" } = this.config;
        const modelToUse = model || this.config.model;
        const cleanModel = (baseUrl && baseUrl.indexOf('gmi') !== -1) ? modelToUse.replace('google/', '') : modelToUse;

        const resolvedMessages = await resolveAllImages(messages);
        const { contents, systemInstruction } = this.formatMessages(resolvedMessages);

        const requestBody = {
            contents,
            generationConfig: {
                temperature: options.temperature !== undefined ? options.temperature : 1.0,
                maxOutputTokens: 65536
            }
        };

        // Add tools ONLY if explicitly requested
        if (options.tools) {
            requestBody.tools = options.tools;
        } else if (options.useSearch) {
            requestBody.tools = [{ google_search: {} }];
        }

        // Add experimental features ONLY if explicitly requested
        if (options.thinkingLevel) {
            requestBody.generationConfig.thinkingConfig = { thinkingLevel: options.thinkingLevel };
        }
        if (options.mediaResolution) {
            requestBody.generationConfig.mediaResolution = options.mediaResolution;
        }

        // console.log('[Gemini] Stream Config:', JSON.stringify(requestBody.generationConfig, null, 2));


        if (systemInstruction) {
            requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        let retries = 5; // Allow 5 retries (6 total attempts) - GMI Cloud can be unstable
        let delay = 2000; // Start with 2 seconds, will increase each retry

        while (retries >= 0) {
            try {
                // console.log(`[Gemini] Starting stream request to ${baseUrl} for model ${cleanModel} (attempts left: ${retries + 1})`);
                const response = await fetch('/api/gmi-serving', {
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
                    const errStatus = response.status;
                    console.error(`[Gemini] Stream response error: ${errStatus} ${response.statusText}`);

                    if (errStatus === 404) {
                        throw new Error("Stream API Proxy endpoint not found (404). This might be a deployment or routing issue.");
                    }

                    if ([429, 500, 502, 503, 504].indexOf(errStatus) !== -1 && retries > 0) {
                        console.warn(`[Gemini] Request failed with ${errStatus}, retrying in ${delay}ms... (${retries} left)`);
                        await new Promise(r => setTimeout(r, delay));
                        retries--;
                        delay *= 1.5;
                        continue;
                    }

                    const errData = await response.json().catch(() => ({}));
                    console.error('[Gemini] API Error:', errStatus, errData);
                    throw new Error(errData.error?.message || errData.message || `API Error ${errStatus}: ${response.statusText}`);
                }

                const reader = response.body.getReader();
                try {
                    await parseGeminiStream(reader, onToken, (msg) => {
                        // Optional: suppress verbose logs or route elsewhere
                        // console.log(msg); 
                    });
                    // console.log('[Gemini] Stream finished normally.');
                    return;
                } finally {
                    reader.releaseLock();
                }

            } catch (e) {
                // DON'T retry on AbortError!
                if (e.name === 'AbortError' || options.signal?.aborted) {
                    throw e;
                }

                // Handle retryable errors (including our custom {retryable: true} objects)
                if ((e.retryable || isRetryableError(e.message)) && retries > 0) {
                    console.warn(`[Gemini] Retryable error: ${e.message}, retrying in ${delay / 1000}s... (${retries} left)`);
                    await new Promise(r => setTimeout(r, delay));
                    retries--;
                    delay *= 2; // Double the delay each retry
                    continue;
                }

                if (retries > 0) {
                    console.warn(`[Gemini] Stream error: ${e.message}, retrying in ${delay / 1000}s... (${retries} left)`);
                    await new Promise(r => setTimeout(r, delay));
                    retries--;
                    delay *= 2; // Double the delay each retry
                    continue;
                }

                // Final failure - throw the actual error
                if (e.retryable) {
                    throw new Error(e.message);
                }
                throw e;
            }
        }
    }


    /**
     * Generate Image using GMI Cloud Async API
     */
    async generateImage(prompt, model, options = {}) {
        return generateGeminiImage(this.config.apiKey, prompt, model, options);
    }
}
