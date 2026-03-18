import { ensureLatestBuildOrRefresh, CURRENT_BUILD_ID, forceHardRefresh } from './buildVersion';

const CHUNK_RELOAD_STORAGE_KEY = 'nexmap_chunk_reload_fingerprint';
const CHUNK_RELOAD_COOLDOWN_MS = 15000;

const CHUNK_ERROR_PATTERNS = [
    'Failed to fetch dynamically imported module',
    'error loading dynamically imported module',
    'Importing a module script failed',
    'Expected a JavaScript-or-Wasm module script',
    'Failed to load module script'
];

let recoveryInstalled = false;

const stringifyReason = (reason) => {
    if (!reason) return '';
    if (typeof reason === 'string') return reason;
    if (typeof reason?.message === 'string') return reason.message;
    if (typeof reason?.toString === 'function') return reason.toString();
    return '';
};

const isAssetLikeUrl = (value) => {
    if (typeof value !== 'string' || !value) return false;

    const sameOrigin = typeof window === 'undefined' ||
        value.startsWith('/') ||
        value.startsWith(window.location.origin);

    if (!sameOrigin) return false;

    return (
        value.includes('/assets/') ||
        value.includes('/src/') ||
        value.endsWith('.js') ||
        value.endsWith('.mjs')
    );
};

export const isLikelyChunkLoadError = (reason, resourceUrl = '') => {
    const message = stringifyReason(reason);

    if (isAssetLikeUrl(resourceUrl)) {
        return true;
    }

    return CHUNK_ERROR_PATTERNS.some(pattern => message.includes(pattern));
};

const canAttemptRecovery = (fingerprint) => {
    if (typeof window === 'undefined') return false;

    const raw = window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY);
    if (!raw) return true;

    try {
        const payload = JSON.parse(raw);
        if (payload?.fingerprint !== fingerprint) return true;
        return Date.now() - Number(payload.timestamp || 0) > CHUNK_RELOAD_COOLDOWN_MS;
    } catch {
        return true;
    }
};

const markRecoveryAttempt = (fingerprint) => {
    if (typeof window === 'undefined') return;

    window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, JSON.stringify({
        fingerprint,
        timestamp: Date.now()
    }));
};

const clearRecoveryAttempt = () => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(CHUNK_RELOAD_STORAGE_KEY);
};

export async function recoverFromChunkLoadError({ reason, resourceUrl = '', source = 'unknown' } = {}) {
    if (typeof window === 'undefined') return false;
    if (!isLikelyChunkLoadError(reason, resourceUrl)) return false;

    const message = stringifyReason(reason) || 'chunk_load_error';
    const fingerprint = `${CURRENT_BUILD_ID}|${source}|${resourceUrl || message}`;

    if (!canAttemptRecovery(fingerprint)) {
        console.error('[ChunkLoadRecovery] Recovery skipped because cooldown is active', {
            source,
            resourceUrl,
            message,
            fingerprint
        });
        return false;
    }

    markRecoveryAttempt(fingerprint);
    console.error('[ChunkLoadRecovery] Detected chunk load failure, starting recovery', {
        source,
        resourceUrl,
        message,
        currentBuildId: CURRENT_BUILD_ID
    });

    const switchedToNewBuild = !(await ensureLatestBuildOrRefresh({ force: true }));
    if (switchedToNewBuild) {
        return true;
    }

    forceHardRefresh({
        latestBuildId: CURRENT_BUILD_ID,
        reason: 'chunk-load-fallback'
    });

    return true;
}

export function installChunkLoadRecovery() {
    if (recoveryInstalled || typeof window === 'undefined') return;
    recoveryInstalled = true;

    window.addEventListener('load', () => {
        window.setTimeout(() => {
            clearRecoveryAttempt();
        }, 1500);
    }, { once: true });

    window.addEventListener('error', (event) => {
        const target = event?.target;
        const resourceUrl = target?.src || event?.filename || '';
        const reason = event?.error || event?.message || '';

        if (!isLikelyChunkLoadError(reason, resourceUrl)) {
            return;
        }

        void recoverFromChunkLoadError({
            reason,
            resourceUrl,
            source: 'window.error'
        });
    }, true);

    window.addEventListener('unhandledrejection', (event) => {
        const reason = event?.reason;
        if (!isLikelyChunkLoadError(reason)) return;

        void recoverFromChunkLoadError({
            reason,
            source: 'window.unhandledrejection'
        });
    });
}
