/**
 * Cloudflare Function: Image Proxy for S3 Upload
 * 
 * Purpose: Bypass CORS restrictions when downloading GMI-generated images
 * Flow: Browser -> This Proxy -> GMI Storage -> Browser -> S3
 */

export async function onRequest(context) {
    const { request } = context;

    // CORS headers for browser compatibility
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Get image URL from query params
        const url = new URL(request.url);
        const imageUrl = url.searchParams.get('url');

        if (!imageUrl) {
            return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Validate URL is from GMI storage
        if (!imageUrl.startsWith('https://storage.googleapis.com/gmi-video-assests-prod/')) {
            return new Response(JSON.stringify({ error: 'Invalid image URL' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        console.log('[Image Proxy] Fetching:', imageUrl);

        // Fetch image from GMI (server-side, no CORS restrictions)
        const response = await fetch(imageUrl);

        if (!response.ok) {
            console.error('[Image Proxy] Failed to fetch:', response.status, response.statusText);
            return new Response(JSON.stringify({
                error: 'Failed to fetch image',
                status: response.status
            }), {
                status: response.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Get content type
        const contentType = response.headers.get('Content-Type') || 'image/png';

        // Stream the image back to client
        return new Response(response.body, {
            status: 200,
            headers: {
                ...corsHeaders,
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400' // Cache for 24h
            }
        });

    } catch (error) {
        console.error('[Image Proxy] Error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
