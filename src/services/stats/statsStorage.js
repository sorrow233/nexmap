export function parseStoredJson(rawValue, fallbackValue) {
    if (typeof rawValue !== 'string' || rawValue.length === 0) {
        return fallbackValue;
    }

    try {
        return JSON.parse(rawValue);
    } catch {
        return fallbackValue;
    }
}

export function isQuotaExceededError(error) {
    if (!error) return false;

    if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
        return error.name === 'QuotaExceededError' || error.code === 22 || error.code === 1014;
    }

    return error.name === 'QuotaExceededError' || error.code === 22 || error.code === 1014;
}

export function persistStorageValue(key, value, { fallbackValue, label = key } = {}) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        if (fallbackValue !== undefined && isQuotaExceededError(error)) {
            try {
                localStorage.setItem(key, fallbackValue);
                return true;
            } catch (fallbackError) {
                console.warn(`[UserStats] Failed to persist ${label}`, fallbackError);
                return false;
            }
        }

        console.warn(`[UserStats] Failed to persist ${label}`, error);
        return false;
    }
}
