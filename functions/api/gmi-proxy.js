/**
 * Cloudflare Function: Universal GMI API Proxy
 * Handles all GMI Cloud API requests (chat, stream, image) to protect API keys
 */
export async function onRequest(context) {
    const { request } = context;

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

        // Add API key for query-based auth
        if (authMethod === 'query') {
            url += `?key=${apiKey}`;
        }

        // Prepare headers
        const headers = {
            'Content-Type': 'application/json'
        };

        if (authMethod === 'bearer') {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        console.log(`[Proxy] Forwarding to: ${url}`);

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
