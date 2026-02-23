/**
 * Cloudflare Function: Universal GMI API Proxy
 * Handles all GMI Cloud API requests (chat, stream, image) to protect API keys
 */
const THINKING_LEVEL_ALLOWLIST = new Set(['THINKING_LEVEL_UNSPECIFIED', 'LOW', 'HIGH']);

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
        const upstreamResponse = await fetch(url, {
            method: method,
            headers: headers,
            body: requestBody ? JSON.stringify(requestBody) : undefined
        });

        // Handle upstream errors immediately
        if (!upstreamResponse.ok) {
            const errText = await upstreamResponse.text();
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
