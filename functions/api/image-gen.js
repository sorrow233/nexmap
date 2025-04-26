/**
 * Cloudflare Function: Image Generation Proxy
 * Proxies requests to GMI Cloud API to bypass CORS restrictions
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
        const { action, apiKey, payload, requestId } = body;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'API key is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let response;

        if (action === 'submit') {
            // Submit image generation request
            response = await fetch('https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey/requests', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
        } else if (action === 'poll') {
            // Poll for status
            if (!requestId) {
                return new Response(JSON.stringify({ error: 'Request ID is required for polling' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            response = await fetch(`https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey/requests/${requestId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
        } else {
            return new Response(JSON.stringify({ error: 'Invalid action. Use "submit" or "poll"' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const data = await response.json().catch(async (jsonError) => {
            // If JSON parsing fails, log the raw response
            const text = await response.text();
            console.error('[Image Gen Proxy] Failed to parse JSON response:', text);
            throw new Error(`GMI API returned invalid JSON: ${text.substring(0, 200)}`);
        });

        // Log successful responses for debugging
        console.log('[Image Gen Proxy] GMI API response status:', response.status);
        console.log('[Image Gen Proxy] GMI API response data:', JSON.stringify(data).substring(0, 200));

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        console.error('[Image Gen Proxy] Detailed error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        return new Response(JSON.stringify({
            error: error.message || 'Internal server error',
            details: error.stack
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}
