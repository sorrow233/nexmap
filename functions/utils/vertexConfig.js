const DEFAULT_VERTEX_BASE_URL = 'https://us-central1-aiplatform.googleapis.com/v1/publishers/google';

function normalizeBaseUrl(baseUrl = '') {
    const trimmed = String(baseUrl || '').trim();
    return trimmed || DEFAULT_VERTEX_BASE_URL;
}

export function parseVertexBaseUrl(baseUrl = '') {
    const normalized = normalizeBaseUrl(baseUrl);
    const url = new URL(normalized);
    const host = url.hostname;

    let location = 'global';
    if (host !== 'aiplatform.googleapis.com') {
        const match = host.match(/^([a-z0-9-]+)-aiplatform\.googleapis\.com$/i);
        if (!match) {
            throw new Error(`Unsupported Vertex base URL host: ${host}`);
        }
        location = match[1];
    }

    const pathParts = url.pathname.split('/').filter(Boolean);
    const version = pathParts[0] || 'v1';
    const publisherIndex = pathParts.indexOf('publishers');
    const publisher = publisherIndex >= 0 ? pathParts[publisherIndex + 1] : 'google';

    return {
        origin: url.origin,
        version,
        location,
        publisher
    };
}

export function normalizeVertexModelName(model = '') {
    return String(model || '').trim().replace(/^google\//, '');
}

export function buildVertexGenerateUrl({ baseUrl, projectId, model, stream = false }) {
    const { origin, version, location, publisher } = parseVertexBaseUrl(baseUrl);
    const cleanModel = normalizeVertexModelName(model);
    const endpoint = stream ? ':streamGenerateContent?alt=sse' : ':generateContent';

    if (!cleanModel) {
        throw new Error('Vertex model is missing');
    }

    return `${origin}/${version}/projects/${projectId}/locations/${location}/publishers/${publisher}/models/${cleanModel}${endpoint}`;
}
