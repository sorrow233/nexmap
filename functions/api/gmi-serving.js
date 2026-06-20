/**
 * Cloudflare Function: Universal GMI API Proxy
 * Handles all GMI Cloud API requests (chat, stream, image) to protect API keys
 */
const THINKING_LEVEL_ALLOWLIST = new Set(['THINKING_LEVEL_UNSPECIFIED', 'LOW', 'HIGH']);
// 429 removed: rate-limit responses must NOT be retried by the proxy — doing so
// multiplies a single user request into N upstream calls and exhausts the key pool.
const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 500, 502, 503, 504, 524]);
const STREAM_MAX_ATTEMPTS = 1;
const STREAM_TIMEOUT_MS = null;
const NON_STREAM_MAX_ATTEMPTS = 2;
const NON_STREAM_TIMEOUT_MS = null;
const RETRYABLE_ERROR_PATTERNS = [
    'temporarily unavailable',
    'service unavailable',
    'overloaded',
    'upstream',
    'timeout',
    'timed out',
    'network',
    'unavailable'
];

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function createRequestId(explicitId = '') {
    const normalized = String(explicitId || '').trim();
    if (normalized) return normalized;
    return `gmi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function previewText(text = '', limit = 220) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return '';
    return normalized.length > limit ? `${normalized.slice(0, limit)}...` : normalized;
}

function classifyApiKey(apiKey = '') {
    const normalized = String(apiKey || '').trim();
    if (!normalized) return 'missing';
    if (normalized.startsWith('AIza')) return 'AIza';
    if (normalized.startsWith('AQ.')) return 'AQ';
    if (normalized.startsWith('sk-')) return 'sk';
    return 'custom';
}

function summarizeTools(tools = []) {
    if (!Array.isArray(tools) || tools.length === 0) return [];
    return tools.map((tool) => {
        if (tool?.google_search) return 'google_search';
        if (tool?.googleSearch) return 'googleSearch';
        return Object.keys(tool || {}).join(',') || 'unknown';
    });
}

function summarizeRequestBody(requestBody = {}) {
    const contents = Array.isArray(requestBody?.contents) ? requestBody.contents : [];
    const lastUserPart = [...contents]
        .reverse()
        .find((item) => item?.role === 'user' && Array.isArray(item?.parts))
        ?.parts?.find((part) => typeof part?.text === 'string');

    return {
        contentsCount: contents.length,
        tools: summarizeTools(requestBody?.tools),
        hasSystemInstruction: Boolean(requestBody?.systemInstruction),
        temperature: requestBody?.generationConfig?.temperature,
        maxOutputTokens: requestBody?.generationConfig?.maxOutputTokens,
        thinkingLevel: requestBody?.generationConfig?.thinkingConfig?.thinkingLevel || '',
        lastUserPreview: previewText(lastUserPart?.text || '')
    };
}

async function logStreamPreview(stream, requestId) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let chunkCount = 0;
    let totalBytes = 0;
    let preview = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunkCount += 1;
            totalBytes += value?.byteLength || 0;
            if (preview.length < 600) {
                preview += decoder.decode(value, { stream: true });
            }
        }
        preview += decoder.decode();
        console.log(`[GMI Proxy][${requestId}] stream_preview ${JSON.stringify({
            chunkCount,
            totalBytes,
            preview: previewText(preview, 600)
        })}`);
    } catch (error) {
        console.error(`[GMI Proxy][${requestId}] stream_preview_error`, error);
    } finally {
        reader.releaseLock();
    }
}

function computeBackoffDelay(attempt, baseMs = 700, maxMs = 8000) {
    const exp = Math.min(maxMs, baseMs * (2 ** Math.max(0, attempt - 1)));
    const jitter = Math.floor(Math.random() * 250);
    return exp + jitter;
}

function isRetryableText(text = '') {
    const lower = String(text).toLowerCase();
    return RETRYABLE_ERROR_PATTERNS.some(pattern => lower.includes(pattern));
}

function shouldRetryUpstream({ statusCode, errorText = '', error = null }) {
    const code = Number(statusCode);

    // 429 / 401 / 403 — never retry, return immediately to the client.
    if (code === 429 || code === 401 || code === 403) {
        return false;
    }

    if (RETRYABLE_STATUS_CODES.has(code)) {
        return true;
    }

    if (isRetryableText(errorText)) {
        return true;
    }

    if (error) {
        if (error.name === 'AbortError') return true;
        if (isRetryableText(error.message || String(error))) return true;
        return true; // Most fetch/network failures are transient in this path.
    }

    return false;
}

function getUpstreamRetryPolicy(stream = false) {
    if (stream) {
        return {
            maxAttempts: STREAM_MAX_ATTEMPTS,
            timeoutMs: STREAM_TIMEOUT_MS
        };
    }

    return {
        maxAttempts: NON_STREAM_MAX_ATTEMPTS,
        timeoutMs: NON_STREAM_TIMEOUT_MS
    };
}

async function fetchUpstreamWithRetry(url, requestInit, { stream = false } = {}) {
    const { maxAttempts, timeoutMs } = getUpstreamRetryPolicy(stream);
    let attempt = 0;
    let lastError = null;

    while (attempt < maxAttempts) {
        attempt += 1;
        const hasTimeout = Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0;
        const controller = hasTimeout ? new AbortController() : null;
        const timer = hasTimeout
            ? setTimeout(() => controller.abort('upstream_timeout'), timeoutMs)
            : null;

        try {
            const response = await fetch(url, {
                ...requestInit,
                ...(controller && { signal: controller.signal })
            });
            if (timer) clearTimeout(timer);

            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                const canRetry = attempt < maxAttempts && shouldRetryUpstream({
                    statusCode: response.status,
                    errorText
                });

                if (canRetry) {
                    await wait(computeBackoffDelay(attempt));
                    continue;
                }

                return { response, errorText };
            }

            return { response, errorText: '' };
        } catch (error) {
            if (timer) clearTimeout(timer);
            const isTimeoutAbort = controller?.signal?.aborted && error?.name === 'AbortError';
            lastError = isTimeoutAbort
                ? new Error(`Upstream timeout after ${timeoutMs}ms`)
                : error;

            const canRetry = attempt < maxAttempts && shouldRetryUpstream({ error: lastError });
            if (canRetry) {
                await wait(computeBackoffDelay(attempt));
                continue;
            }
            throw lastError;
        }
    }

    if (lastError) throw lastError;
    throw new Error('Upstream request failed after retries');
}

function normalizeThinkingLevelInRequest(requestBody) {
    const thinkingConfig = requestBody?.generationConfig?.thinkingConfig;
    const level = thinkingConfig?.thinkingLevel;
    if (typeof level !== 'string') return;

    const normalized = level.trim().toUpperCase();
    if (THINKING_LEVEL_ALLOWLIST.has(normalized)) {
        thinkingConfig.thinkingLevel = normalized;
        return;
    }

    // Drop invalid value to avoid upstream 400 validation errors.
    delete thinkingConfig.thinkingLevel;
    if (Object.keys(thinkingConfig).length === 0) {
        delete requestBody.generationConfig.thinkingConfig;
    }
}

export async function onRequest(context) {
    const { request } = context;
    console.log(`[Proxy] Received request: ${request.method} ${request.url}`);

    // CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await request.json();
        const { apiKey, baseUrl, model, endpoint, method = 'POST', requestBody, stream = false, debugTraceId } = body;
        const requestId = createRequestId(debugTraceId);

        if (!apiKey || !baseUrl || !endpoint) {
            return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Determine authentication method based on baseURL
        const authMethod = baseUrl.indexOf('gmi') !== -1 ? 'bearer' : 'query';

        // Clean model name for GMI
        let cleanModel = model;
        if (baseUrl.indexOf('gmi') !== -1 && model) {
            cleanModel = model.replace('google/', '');
        }

        // Build endpoint URL
        let url = `${baseUrl.replace(/\/$/, '')}${endpoint}`;
        if (cleanModel && endpoint.includes(':')) {
            url = url.replace(':MODEL:', cleanModel);
        }

        // Add API key for query-based auth (Gemini official)
        if (authMethod === 'query') {
            url += `?key=${apiKey}`;
            // Gemini official streaming requires alt=sse parameter
            if (stream) {
                url += '&alt=sse';
            }
        }

        const retryPolicy = getUpstreamRetryPolicy(stream);
        console.log(`[GMI Proxy][${requestId}] incoming ${JSON.stringify({
            method,
            stream,
            baseUrl,
            model: cleanModel || model || '',
            endpoint,
            authMethod,
            keyKind: classifyApiKey(apiKey),
            timeoutMs: retryPolicy.timeoutMs,
            requestBody: summarizeRequestBody(requestBody)
        })}`);

        // Prepare headers - include User-Agent to help pass Cloudflare checks
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'NexMap/1.0 (https://nexmap.catzz.work)',
            'Accept': 'application/json, text/event-stream',
            'Accept-Language': 'en-US,en;q=0.9'
        };

        if (authMethod === 'bearer') {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        console.log(`[Proxy] Forwarding to: ${url}`);

        // Backward-compatibility guard for clients sending lowercase thinkingLevel.
        if (requestBody && typeof requestBody === 'object') {
            normalizeThinkingLevelInRequest(requestBody);
        }

        // Make the upstream request
        const upstreamStartedAt = Date.now();
        const { response: upstreamResponse, errorText } = await fetchUpstreamWithRetry(url, {
            method: method,
            headers: headers,
            body: requestBody ? JSON.stringify(requestBody) : undefined
        }, { stream });
        const upstreamElapsedMs = Date.now() - upstreamStartedAt;
        console.log(`[GMI Proxy][${requestId}] upstream_response ${JSON.stringify({
            status: upstreamResponse.status,
            ok: upstreamResponse.ok,
            elapsedMs: upstreamElapsedMs,
            contentType: upstreamResponse.headers.get('content-type') || '',
            retryAfter: upstreamResponse.headers.get('retry-after') || ''
        })}`);

        // Handle upstream errors immediately
        if (!upstreamResponse.ok) {
            const errText = errorText || '';
            console.error(`[GMI Proxy][${requestId}] upstream_error ${JSON.stringify({
                status: upstreamResponse.status,
                elapsedMs: upstreamElapsedMs,
                errorText: previewText(errText, 600)
            })}`);
            const retryAfter = upstreamResponse.headers.get('retry-after');
            const rateLimitReset = upstreamResponse.headers.get('x-ratelimit-reset');
            const responseHeaders = {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Expose-Headers': 'Retry-After, X-RateLimit-Reset, X-Debug-Trace-Id',
                'X-Debug-Trace-Id': requestId
            };
            if (retryAfter) {
                responseHeaders['Retry-After'] = retryAfter;
            }
            if (rateLimitReset) {
                responseHeaders['X-RateLimit-Reset'] = rateLimitReset;
            }

            return new Response(JSON.stringify({
                error: { message: `Upstream Error ${upstreamResponse.status}: ${errText}` }
            }), {
                status: upstreamResponse.status,
                headers: responseHeaders
            });
        }

        // Handle streaming responses - DIRECT PIPE
        if (stream) {
            const upstreamBody = upstreamResponse.body;
            if (!upstreamBody) {
                throw new Error('Upstream stream body is empty');
            }
            const [logBody, clientBody] = upstreamBody.tee();
            context.waitUntil(logStreamPreview(logBody, requestId));

            return new Response(clientBody, {
                status: upstreamResponse.status,
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Expose-Headers': 'X-Debug-Trace-Id',
                    'X-Debug-Trace-Id': requestId,
                    'X-Accel-Buffering': 'no' // Nginx hint
                }
            });
        }

        // Handle regular responses
        const data = await upstreamResponse.json();
        console.log(`[GMI Proxy][${requestId}] upstream_json ${JSON.stringify({
            candidateCount: Array.isArray(data?.candidates) ? data.candidates.length : 0,
            hasError: Boolean(data?.error),
            usedSearch: Boolean(data?.candidates?.[0]?.groundingMetadata),
            textPreview: previewText(data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join(''))
        })}`);
        return new Response(JSON.stringify(data), {
            status: upstreamResponse.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Expose-Headers': 'X-Debug-Trace-Id',
                'X-Debug-Trace-Id': requestId
            }
        });

    } catch (error) {
        console.error('[GMI Proxy] Error:', error);
        const errorMessage = error?.message || 'Internal server error';
        const statusCode = /upstream timeout/i.test(errorMessage) ? 504 : 500;
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}
