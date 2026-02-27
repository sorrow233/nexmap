/**
 * Cloudflare Function: Universal GMI API Proxy
 * Handles all GMI Cloud API requests (chat, stream, image) to protect API keys
 */
const THINKING_LEVEL_ALLOWLIST = new Set(['THINKING_LEVEL_UNSPECIFIED', 'LOW', 'HIGH']);
const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504, 524]);
const STREAM_MAX_ATTEMPTS = 1;
const STREAM_TIMEOUT_MS = 22000;
const NON_STREAM_MAX_ATTEMPTS = 3;
const NON_STREAM_TIMEOUT_MS = 45000;
const RETRYABLE_ERROR_PATTERNS = [
    'temporarily unavailable',
    'service unavailable',
    'overloaded',
    'upstream',
    'timeout',
    'timed out',
    'network',
    'rate limit',
    'too many requests',
    'unavailable'
];

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    if (RETRYABLE_STATUS_CODES.has(Number(statusCode))) {
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
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort('upstream_timeout'), timeoutMs);

        try {
            const response = await fetch(url, {
                ...requestInit,
                signal: controller.signal
            });
            clearTimeout(timer);

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
            clearTimeout(timer);
            const isTimeoutAbort = controller.signal.aborted && error?.name === 'AbortError';
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
        const { apiKey, baseUrl, model, endpoint, method = 'POST', requestBody, stream = false } = body;

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
        const { response: upstreamResponse, errorText } = await fetchUpstreamWithRetry(url, {
            method: method,
            headers: headers,
            body: requestBody ? JSON.stringify(requestBody) : undefined
        }, { stream });

        // Handle upstream errors immediately
        if (!upstreamResponse.ok) {
            const errText = errorText || '';
            console.error(`[Proxy] Upstream error ${upstreamResponse.status}:`, errText);
            return new Response(JSON.stringify({
                error: { message: `Upstream Error ${upstreamResponse.status}: ${errText}` }
            }), {
                status: upstreamResponse.status,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // Handle streaming responses - DIRECT PIPE
        if (stream) {
            const { readable, writable } = new TransformStream();
            upstreamResponse.body.pipeTo(writable);

            return new Response(readable, {
                status: upstreamResponse.status,
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': '*',
                    'X-Accel-Buffering': 'no' // Nginx hint
                }
            });
        }

        // Handle regular responses
        const data = await upstreamResponse.json();
        return new Response(JSON.stringify(data), {
            status: upstreamResponse.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        console.error('[GMI Proxy] Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}
