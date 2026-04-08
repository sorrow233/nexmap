const TOKEN_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const TOKEN_AUDIENCE = 'https://oauth2.googleapis.com/token';
const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

function getTokenCache() {
    if (!globalThis.__vertexServiceAccountTokenCache) {
        globalThis.__vertexServiceAccountTokenCache = new Map();
    }

    return globalThis.__vertexServiceAccountTokenCache;
}

function requireEnvValue(env, key) {
    const value = String(env?.[key] || '').trim();
    if (!value) {
        throw new Error(`Missing required Cloudflare secret: ${key}`);
    }

    return value;
}

function normalizePrivateKey(privateKey) {
    return String(privateKey || '').replace(/\\n/g, '\n');
}

function pemToArrayBuffer(pem) {
    const base64 = pem
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/\s+/g, '');

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes.buffer;
}

function base64UrlEncodeBytes(bytes) {
    let binary = '';
    const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    for (let index = 0; index < source.length; index += 1) {
        binary += String.fromCharCode(source[index]);
    }

    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function base64UrlEncodeJson(value) {
    const encoded = new TextEncoder().encode(JSON.stringify(value));
    return base64UrlEncodeBytes(encoded);
}

async function importServiceAccountPrivateKey(privateKey) {
    return crypto.subtle.importKey(
        'pkcs8',
        pemToArrayBuffer(privateKey),
        {
            name: 'RSASSA-PKCS1-v1_5',
            hash: 'SHA-256'
        },
        false,
        ['sign']
    );
}

async function buildSignedJwt({ clientEmail, privateKey }) {
    const now = Math.floor(Date.now() / 1000);
    const header = base64UrlEncodeJson({ alg: 'RS256', typ: 'JWT' });
    const claim = base64UrlEncodeJson({
        iss: clientEmail,
        scope: TOKEN_SCOPE,
        aud: TOKEN_AUDIENCE,
        exp: now + 3600,
        iat: now
    });
    const unsigned = `${header}.${claim}`;
    const signingKey = await importServiceAccountPrivateKey(privateKey);
    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        signingKey,
        new TextEncoder().encode(unsigned)
    );

    return `${unsigned}.${base64UrlEncodeBytes(signature)}`;
}

export async function getVertexAccessToken(env) {
    const clientEmail = requireEnvValue(env, 'VERTEX_CLIENT_EMAIL');
    const privateKey = normalizePrivateKey(requireEnvValue(env, 'VERTEX_PRIVATE_KEY'));
    const cacheKey = clientEmail;
    const cache = getTokenCache();
    const cached = cache.get(cacheKey);

    if (cached && cached.expiresAt - TOKEN_REFRESH_BUFFER_MS > Date.now()) {
        return cached.accessToken;
    }

    const assertion = await buildSignedJwt({ clientEmail, privateKey });
    const body = new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion
    });
    const response = await fetch(TOKEN_AUDIENCE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
    });
    const responseText = await response.text();

    if (!response.ok) {
        throw new Error(`Vertex token exchange failed (${response.status}): ${responseText}`);
    }

    const tokenPayload = JSON.parse(responseText);
    const expiresInMs = Number(tokenPayload.expires_in || 3600) * 1000;

    cache.set(cacheKey, {
        accessToken: tokenPayload.access_token,
        expiresAt: Date.now() + expiresInMs
    });

    return tokenPayload.access_token;
}

export function getVertexProjectId(env) {
    return requireEnvValue(env, 'VERTEX_PROJECT_ID');
}
