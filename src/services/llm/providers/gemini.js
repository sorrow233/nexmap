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
        const { apiKey, baseUrl = "" } = this.config;
        const modelToUse = model || this.config.model;
        const cleanModel = (baseUrl && baseUrl.indexOf('gmi') !== -1) ? modelToUse.replace('google/', '') : modelToUse;

        const resolvedMessages = await resolveRemoteImages(messages);
        const { contents, systemInstruction } = this.formatMessages(resolvedMessages);

        const requestBody = {
            contents,
            tools: [
                {
                    google_search: {},
                    // code_execution: {} // Confilct with google_search
                }

                // code_execution: {} // Confilct with google_search
            ],
            generationConfig: {
                temperature: options.temperature !== undefined ? options.temperature : 1.0,
                maxOutputTokens: 65536,
                thinkingConfig: {
                    thinkingLevel: options.thinkingLevel || "HIGH"
                },
                mediaResolution: options.mediaResolution || "media_resolution_high"
            }
        };

        console.log('[Gemini] Generation Config:', JSON.stringify(requestBody.generationConfig, null, 2));


        if (systemInstruction) {
            requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        let retries = 1; // Retry once if needed

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
                    const candidate = data.candidates?.[0];
                    const content = candidate?.content?.parts?.[0]?.text || "";

                    // Simple logic: If no search used (groundingMetadata missing) and it's the first attempt,
                    // retry silently once. If second attempt also no search, just return it.
                    const hasSearch = !!candidate?.groundingMetadata;
                    if (!hasSearch && retries > 0) {
                        console.warn('[Gemini] Response missing search grounding. Retrying once in background...');
                        await new Promise(r => setTimeout(r, 1000));
                        retries--;
                        continue;
                    }

                    return content;
                }

                if ([500, 502, 503, 504].indexOf(response.status) !== -1 && retries > 0) {
                    await new Promise(r => setTimeout(r, 2000));
                    retries--; continue;
                }

                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || response.statusText);
            } catch (e) {
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

        const resolvedMessages = await resolveRemoteImages(messages);
        const { contents, systemInstruction } = this.formatMessages(resolvedMessages);

        const requestBody = {
            contents,
            tools: [
                {
                    google_search: {},
                    // code_execution: {} // Confilct with google_search
                }

                // code_execution: {} // Confilct with google_search
            ],
            generationConfig: {
                temperature: options.temperature !== undefined ? options.temperature : 1.0,
                maxOutputTokens: 65536,
                thinkingConfig: {
                    thinkingLevel: options.thinkingLevel || "HIGH"
                },
                mediaResolution: options.mediaResolution || "media_resolution_high"
            }
        };

        console.log('[Gemini] Stream Config:', JSON.stringify(requestBody.generationConfig, null, 2));


        if (systemInstruction) {
            requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        let retries = 0; // No retries, fail fast
        let delay = 1000;

        while (retries >= 0) {
            try {
                console.log(`[Gemini] Starting stream request to ${baseUrl} for model ${cleanModel}`);
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
                    const errStatus = response.status;
                    if ([429, 500, 502, 503, 504].indexOf(errStatus) !== -1 && retries > 0) {
                        console.warn(`[Gemini] Request failed with ${errStatus}, retrying in ${delay}ms...`);
                        await new Promise(r => setTimeout(r, delay));
                        retries--;
                        delay *= 2;
                        continue;
                    }

                    const errData = await response.json().catch(() => ({}));
                    console.error('[Gemini] API Error:', errStatus, errData);
                    throw new Error(errData.error?.message || errData.message || response.statusText);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let lastFullText = ''; // Track cumulative text
                let buffer = '';

                try {
                    console.log('[Gemini] Stream response OK, processing chunks...');
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunkText = decoder.decode(value, { stream: true });
                        buffer += chunkText;

                        const lines = buffer.split('\n');
                        buffer = lines.pop(); // Keep incomplete line in buffer

                        for (const line of lines) {
                            let cleanLine = line.trim();
                            if (!cleanLine) continue;

                            // Handle SSE prefix
                            if (cleanLine.startsWith('data: ')) {
                                cleanLine = cleanLine.substring(6).trim();
                            }

                            // Clean up Python byte string artifacts (common in some proxy responses)
                            if (cleanLine.startsWith("b'") || cleanLine.startsWith('b"')) {
                                cleanLine = cleanLine.replace(/^b['"]|['"]$/g, '');
                                console.warn('[Gemini] Detected Python byte string, auto-cleaning:', cleanLine);
                            }

                            if (!cleanLine || cleanLine === '[DONE]') continue;

                            try {
                                const data = JSON.parse(cleanLine);

                                // CRITICAL: Check for API errors that might be returned as JSON (even with 200 OK)
                                if (data.error) {
                                    throw new Error(data.error.message || JSON.stringify(data.error));
                                }

                                const candidate = data.candidates?.[0];

                                // Gemini stream format: candidate content parts
                                const currentText = candidate?.content?.parts?.[0]?.text;

                                if (currentText) {
                                    // Robust Delta Calculation
                                    let delta = '';
                                    if (currentText.startsWith(lastFullText)) {
                                        delta = currentText.substring(lastFullText.length);
                                        lastFullText = currentText;
                                    } else {
                                        delta = currentText;
                                        lastFullText += currentText;
                                    }

                                    if (delta) {
                                        onToken(delta);
                                    }
                                }
                            } catch (jsonErr) {
                                // If parsing fails or we threw an error above, re-throw if it's our error
                                if (jsonErr.message && !jsonErr.message.includes('JSON')) {
                                    throw jsonErr;
                                }
                                // Try to handle partial JSON or weird provider formats
                                console.warn('[Gemini] Line parse error:', cleanLine.substring(0, 50), jsonErr.message);
                            }
                        }
                    }

                    // Process remaining buffer
                    if (buffer.trim()) {
                        try {
                            let cleanLine = buffer.trim().startsWith('data: ') ? buffer.trim().substring(6) : buffer.trim();
                            if (cleanLine.startsWith("b'") || cleanLine.startsWith('b"')) {
                                cleanLine = cleanLine.replace(/^b['"]|['"]$/g, '');
                            }
                            const data = JSON.parse(cleanLine);
                            if (data.error) throw new Error(data.error.message);

                            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (text) {
                                const delta = text.startsWith(lastFullText) ? text.substring(lastFullText.length) : text;
                                if (delta) {
                                    onToken(delta);
                                }
                            }
                        } catch (e) {
                            if (e.message && !e.message.includes('JSON')) throw e;
                        }
                    }

                    console.log('[Gemini] Stream finished normally.');
                    return;

                } finally {
                    reader.releaseLock();
                }

            } catch (e) {
                // DON'T retry on AbortError!
                if (e.name === 'AbortError' || options.signal?.aborted) {
                    throw e;
                }

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
        console.log('[Gemini] API Key present:', !!apiKey, apiKey ? `(length: ${apiKey.length})` : '');

        // 1. Submit Request
        const payload = {
            model: modelToUse,
            payload: {
                prompt: prompt,
                image_size: "1K", // 1K (approx 1024px width) fits the "max 720p" requirement well enough for performance
                aspect_ratio: "16:9" // Suitable for background
            }
        };

        console.log('[Gemini] Submitting image request with payload:', JSON.stringify(payload, null, 2));

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

        console.log('[Gemini] Submit response status:', submitResponse.status);

        if (!submitResponse.ok) {
            const err = await submitResponse.json().catch(() => ({}));
            console.error('[Gemini] Submit failed:', err);
            throw new Error(`Image Request Failed: ${err.error?.message || err.error || JSON.stringify(err) || submitResponse.statusText}`);
        }

        const submitData = await submitResponse.json();
        console.log('[Gemini] Submit response data:', JSON.stringify(submitData, null, 2));

        const requestId = submitData.request_id;
        if (!requestId) {
            console.error('[Gemini] No request_id in response:', submitData);
            throw new Error(`GMI API did not return a request_id. Response: ${JSON.stringify(submitData)}`);
        }
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

            console.log(`[Gemini] Poll attempt ${attempts}/${maxAttempts}, response status:`, statusResponse.status);

            if (!statusResponse.ok) {
                console.warn(`[Gemini] Poll response not OK:`, statusResponse.status);
                continue;
            }

            const statusData = await statusResponse.json();
            console.log('[Gemini] Poll status:', statusData.status, statusData.error || '');

            if (statusData.status === 'success') {
                const imageUrl = statusData.outcome?.media_urls?.[0]?.url;
                console.log('[Gemini] Image generation success! URL:', imageUrl?.substring(0, 100));
                if (!imageUrl) throw new Error("Image generated but no URL found in response");
                return imageUrl;
            }

            if (statusData.status === 'failed' || statusData.status === 'cancelled') {
                console.error('[Gemini] Image generation failed with status:', statusData);
                throw new Error(`Image Generation ${statusData.status}: ${statusData.error || statusData.message || 'Unknown error'}`);
            }
        }

        console.error('[Gemini] Image generation timed out after', maxAttempts * 2, 'seconds');
        throw new Error("Image generation timed out after 60 seconds");
    }
}


