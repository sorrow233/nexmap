import { maybeHandleCorsPreflight, jsonResponse, buildCorsHeaders } from '../utils/http.js';
import { fetchUpstreamWithRetry } from '../utils/upstreamRetry.js';
import { getVertexAccessToken, getVertexProjectId } from '../utils/vertexAuth.js';
import { buildVertexGenerateUrl } from '../utils/vertexConfig.js';

function createErrorResponse(status, message, extraHeaders = {}) {
    return jsonResponse({
        error: {
            message
        }
    }, {
        status,
        headers: extraHeaders
    });
}

export async function onRequest(context) {
    const preflightResponse = maybeHandleCorsPreflight(context.request);
    if (preflightResponse) {
        return preflightResponse;
    }

    if (context.request.method !== 'POST') {
        return createErrorResponse(405, 'Method not allowed');
    }

    try {
        const body = await context.request.json();
        const {
            baseUrl,
            model,
            requestBody,
            method = 'POST',
            stream = false
        } = body || {};

        if (!model || !requestBody) {
            return createErrorResponse(400, 'Missing required Vertex proxy parameters');
        }

        const projectId = getVertexProjectId(context.env);
        const accessToken = await getVertexAccessToken(context.env);
        const upstreamUrl = buildVertexGenerateUrl({
            baseUrl,
            projectId,
            model,
            stream
        });

        const { response, errorText } = await fetchUpstreamWithRetry(upstreamUrl, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': stream ? 'text/event-stream, application/json' : 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': 'aimainmap-vertex-proxy/1.0'
            },
            body: JSON.stringify(requestBody)
        }, { stream });

        if (!response.ok) {
            const retryAfter = response.headers.get('retry-after');
            const responseHeaders = {};
            if (retryAfter) {
                responseHeaders['Retry-After'] = retryAfter;
                responseHeaders['Access-Control-Expose-Headers'] = 'Retry-After';
            }

            return createErrorResponse(
                response.status,
                `Upstream Error ${response.status}: ${errorText || response.statusText || 'Vertex request failed'}`,
                responseHeaders
            );
        }

        if (stream) {
            const { readable, writable } = new TransformStream();
            response.body?.pipeTo(writable);

            return new Response(readable, {
                status: response.status,
                headers: buildCorsHeaders({
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no'
                })
            });
        }

        const responseText = await response.text();
        return new Response(responseText, {
            status: response.status,
            headers: buildCorsHeaders({
                'Content-Type': 'application/json'
            })
        });
    } catch (error) {
        const message = error?.message || 'Vertex proxy failed';
        const statusCode = /timeout/i.test(message) ? 504 : 500;
        return createErrorResponse(statusCode, message);
    }
}
