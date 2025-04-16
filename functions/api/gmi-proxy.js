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

        // Make the request
        const response = await fetch(url, {
            method: method,
            headers: headers,
            body: requestBody ? JSON.stringify(requestBody) : undefined
        });

        // Handle streaming responses
        if (stream) {
            const { readable, writable } = new TransformStream();
            response.body.pipeTo(writable);

            return new Response(readable, {
                status: response.status,
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': '*',
                    'X-Accel-Buffering': 'no' // Nginx hint to disable buffering
                }
            });
        }

        // Handle regular responses
        const data = await response.json();
        return new Response(JSON.stringify(data), {
            status: response.status,
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
