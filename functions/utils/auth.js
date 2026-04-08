/**
 * Authentication Utilities
 * 
 * Shared utility functions for Firebase authentication in Cloudflare Functions.
 */

const FIREBASE_PROJECT_ID_FALLBACK = 'amecatzz';
const FIREBASE_JWK_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const JWK_CACHE_TTL_MS = 60 * 60 * 1000;

function getJwkCache() {
    if (!globalThis.__firebaseJwkCache) {
        globalThis.__firebaseJwkCache = {
            fetchedAt: 0,
            keysById: new Map()
        };
    }

    return globalThis.__firebaseJwkCache;
}

function decodeBase64UrlToString(value) {
    const normalized = String(value || '')
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(String(value || '').length / 4) * 4, '=');

    return atob(normalized);
}

function decodeBase64UrlToBytes(value) {
    const decoded = decodeBase64UrlToString(value);
    const bytes = new Uint8Array(decoded.length);

    for (let index = 0; index < decoded.length; index += 1) {
        bytes[index] = decoded.charCodeAt(index);
    }

    return bytes;
}

async function fetchFirebaseJwks() {
    const cache = getJwkCache();
    if (cache.fetchedAt && Date.now() - cache.fetchedAt < JWK_CACHE_TTL_MS && cache.keysById.size > 0) {
        return cache.keysById;
    }

    const response = await fetch(FIREBASE_JWK_URL);
    const payload = await response.json();
    const nextMap = new Map();

    for (const jwk of payload.keys || []) {
        if (jwk.kid) {
            nextMap.set(jwk.kid, jwk);
        }
    }

    cache.fetchedAt = Date.now();
    cache.keysById = nextMap;
    return nextMap;
}

async function verifyJwtSignature({ signingInput, signature, jwk }) {
    const cryptoKey = await crypto.subtle.importKey(
        'jwk',
        jwk,
        {
            name: 'RSASSA-PKCS1-v1_5',
            hash: 'SHA-256'
        },
        false,
        ['verify']
    );

    return crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        signature,
        new TextEncoder().encode(signingInput)
    );
}

export async function verifyFirebaseToken(token, env = {}) {
    if (!token) return null;

    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [encodedHeader, encodedPayload, encodedSignature] = parts;
        const header = JSON.parse(decodeBase64UrlToString(encodedHeader));
        const payload = JSON.parse(decodeBase64UrlToString(encodedPayload));
        const signature = decodeBase64UrlToBytes(encodedSignature);
        const projectId = String(env.FIREBASE_PROJECT_ID || FIREBASE_PROJECT_ID_FALLBACK).trim();

        if (!header?.kid || header.alg !== 'RS256') {
            return null;
        }

        const expectedIssuer = `https://securetoken.google.com/${projectId}`;
        const now = Math.floor(Date.now() / 1000);
        if (payload.aud !== projectId || payload.iss !== expectedIssuer) {
            return null;
        }
        if (!payload.sub || typeof payload.sub !== 'string') {
            return null;
        }
        if (payload.exp && payload.exp < now) {
            return null;
        }
        if (payload.iat && payload.iat > now + 300) {
            return null;
        }

        const jwks = await fetchFirebaseJwks();
        const jwk = jwks.get(header.kid);
        if (!jwk) {
            return null;
        }

        const isValid = await verifyJwtSignature({
            signingInput: `${encodedHeader}.${encodedPayload}`,
            signature,
            jwk
        });

        if (!isValid) {
            return null;
        }

        return payload.user_id || payload.sub;
    } catch (e) {
        console.error('[Auth] Token verification failed:', e);
        return null;
    }
}

export function readUidAllowlist(env = {}, ...envKeys) {
    return envKeys
        .flatMap((envKey) => String(env?.[envKey] || '').split(','))
        .map((id) => id.trim())
        .filter(Boolean);
}
