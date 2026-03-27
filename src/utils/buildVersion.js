import packageJson from '../../package.json';

export const CURRENT_BUILD_VERSION = packageJson.version;
export const CURRENT_BUILD_TIMESTAMP = __APP_BUILD_TIMESTAMP__;
export const CURRENT_BUILD_ID = `${CURRENT_BUILD_VERSION}@${CURRENT_BUILD_TIMESTAMP}`;

const VERSION_ENDPOINT = '/version.json';
const VERSION_CHECK_COOLDOWN_MS = 15000;
const RELOAD_MARKER_KEY = 'nexmap-build-reload-target';
const PENDING_BUILD_UPDATE_KEY = 'nexmap-pending-build-update';
const FORCE_RELOAD_QUERY_KEY = '__nexmap_reload__';
const FORCE_RELOAD_BUILD_KEY = '__nexmap_build__';
const FORCE_RELOAD_REASON_KEY = '__nexmap_reason__';

let activeVersionCheck = null;
let lastVersionCheckAt = 0;

function persistPendingBuildUpdate(latestBuild) {
    if (typeof window === 'undefined' || !latestBuild?.buildId) return;

    const payload = {
        version: latestBuild.version,
        builtAt: latestBuild.builtAt || null,
        buildId: latestBuild.buildId,
        detectedAt: Date.now()
    };

    window.localStorage.setItem(PENDING_BUILD_UPDATE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('build-update-available', { detail: payload }));
}

function clearPendingBuildUpdate() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(PENDING_BUILD_UPDATE_KEY);
}

async function fetchLatestBuildVersion(force = false) {
    const now = Date.now();

    if (!force && activeVersionCheck && now - lastVersionCheckAt < VERSION_CHECK_COOLDOWN_MS) {
        return activeVersionCheck;
    }

    lastVersionCheckAt = now;
    activeVersionCheck = fetch(`${VERSION_ENDPOINT}?t=${now}`, {
        cache: 'no-store',
        headers: {
            'cache-control': 'no-cache, no-store, must-revalidate',
            pragma: 'no-cache'
        }
    })
        .then(async (response) => {
            if (!response.ok) return null;
            const payload = await response.json().catch(() => null);
            if (!payload?.version) return null;

            return {
                version: payload.version,
                builtAt: payload.builtAt || null,
                buildId: payload.builtAt ? `${payload.version}@${payload.builtAt}` : payload.version
            };
        })
        .catch(() => null)
        .finally(() => {
            globalThis.setTimeout(() => {
                activeVersionCheck = null;
            }, VERSION_CHECK_COOLDOWN_MS);
        });

    return activeVersionCheck;
}

function buildForceReloadUrl({ latestBuildId, reason = 'reload' } = {}) {
    if (typeof window === 'undefined') return '/';

    const url = new URL(window.location.href);
    url.searchParams.set(FORCE_RELOAD_QUERY_KEY, String(Date.now()));
    url.searchParams.set(FORCE_RELOAD_BUILD_KEY, latestBuildId || CURRENT_BUILD_ID);
    url.searchParams.set(FORCE_RELOAD_REASON_KEY, reason);
    return url.toString();
}

export function stripBuildReloadParams() {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    let changed = false;

    [FORCE_RELOAD_QUERY_KEY, FORCE_RELOAD_BUILD_KEY, FORCE_RELOAD_REASON_KEY].forEach((key) => {
        if (!url.searchParams.has(key)) return;
        url.searchParams.delete(key);
        changed = true;
    });

    if (!changed) return;

    const normalizedUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, document.title, normalizedUrl);
}

function reloadToLatestBuild(latestVersion, reason = 'new-build-detected') {
    if (typeof window === 'undefined') return;

    const reloadMarker = `${CURRENT_BUILD_ID}->${latestVersion}`;
    window.sessionStorage.setItem(RELOAD_MARKER_KEY, JSON.stringify({
        marker: reloadMarker,
        timestamp: Date.now()
    }));
    window.location.replace(buildForceReloadUrl({
        latestBuildId: latestVersion,
        reason
    }));
}

function canRetryReload(latestVersion) {
    if (typeof window === 'undefined') return true;

    const reloadMarker = `${CURRENT_BUILD_ID}->${latestVersion}`;
    const rawMarker = window.sessionStorage.getItem(RELOAD_MARKER_KEY);
    if (!rawMarker) return true;

    try {
        const payload = JSON.parse(rawMarker);
        if (payload?.marker !== reloadMarker) return true;
        return Date.now() - Number(payload.timestamp || 0) > VERSION_CHECK_COOLDOWN_MS;
    } catch {
        return true;
    }
}

export async function ensureLatestBuildOrRefresh({ force = false, reload = true } = {}) {
    const latestBuild = await fetchLatestBuildVersion(force);
    const latestBuildId = latestBuild?.buildId || null;

    if (!latestBuildId || latestBuildId === CURRENT_BUILD_ID) {
        if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem(RELOAD_MARKER_KEY);
        }
        clearPendingBuildUpdate();
        return true;
    }

    persistPendingBuildUpdate(latestBuild);

    if (!reload) {
        return true;
    }

    if (!canRetryReload(latestBuildId)) {
        return true;
    }

    reloadToLatestBuild(latestBuildId);
    return false;
}

export function forceHardRefresh({ latestBuildId = CURRENT_BUILD_ID, reason = 'hard-refresh' } = {}) {
    if (typeof window === 'undefined') return false;

    reloadToLatestBuild(latestBuildId, reason);
    return true;
}
