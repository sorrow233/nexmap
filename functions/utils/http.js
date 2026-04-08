const DEFAULT_ALLOWED_HEADERS = 'Content-Type, Authorization';
const DEFAULT_ALLOWED_METHODS = 'POST, OPTIONS';

export function buildCorsHeaders(extraHeaders = {}) {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': DEFAULT_ALLOWED_METHODS,
        'Access-Control-Allow-Headers': DEFAULT_ALLOWED_HEADERS,
        ...extraHeaders
    };
}

export function maybeHandleCorsPreflight(request) {
    if (request.method !== 'OPTIONS') {
        return null;
    }

    return new Response(null, {
        headers: buildCorsHeaders()
    });
}

export function jsonResponse(payload, { status = 200, headers = {} } = {}) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: buildCorsHeaders({
            'Content-Type': 'application/json',
            ...headers
        })
    });
}
