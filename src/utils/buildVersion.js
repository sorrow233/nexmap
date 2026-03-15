import packageJson from '../../package.json';

export const CURRENT_BUILD_VERSION = packageJson.version;

const VERSION_ENDPOINT = '/version.json';
const VERSION_CHECK_COOLDOWN_MS = 15000;
const RELOAD_MARKER_KEY = 'nexmap-build-reload-target';

let activeVersionCheck = null;
let lastVersionCheckAt = 0;

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
            return payload?.version || null;
        })
        .catch(() => null)
        .finally(() => {
            globalThis.setTimeout(() => {
                activeVersionCheck = null;
            }, VERSION_CHECK_COOLDOWN_MS);
        });

    return activeVersionCheck;
}

function reloadToLatestBuild(latestVersion) {
    if (typeof window === 'undefined') return;

    const reloadMarker = `${CURRENT_BUILD_VERSION}->${latestVersion}`;
    window.sessionStorage.setItem(RELOAD_MARKER_KEY, JSON.stringify({
        marker: reloadMarker,
        timestamp: Date.now()
    }));
    window.location.reload();
}

function canRetryReload(latestVersion) {
    if (typeof window === 'undefined') return true;

    const reloadMarker = `${CURRENT_BUILD_VERSION}->${latestVersion}`;
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

export async function ensureLatestBuildOrRefresh({ force = false } = {}) {
    const latestVersion = await fetchLatestBuildVersion(force);

    if (!latestVersion || latestVersion === CURRENT_BUILD_VERSION) {
        if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem(RELOAD_MARKER_KEY);
        }
        return true;
    }

    if (!canRetryReload(latestVersion)) {
        return true;
    }

    reloadToLatestBuild(latestVersion);
    return false;
}
