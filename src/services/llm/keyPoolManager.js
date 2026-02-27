/**
 * KeyPoolManager - 多 API Key 池管理器
 *
 * 功能：
 * - 支持多个 API Key（逗号分隔存储）
 * - 轮询选择下一个可用 Key
 * - 区分临时挂起（429/限流）和持久失效（401/403）
 * - 提供 Key 池状态统计
 */

const TEMP_SUSPEND_MS = 60 * 1000;
const MIN_TEMP_SUSPEND_MS = 5 * 1000;
const MAX_TEMP_SUSPEND_MS = 5 * 60 * 1000;

export class KeyPoolManager {
    constructor(keysString = '') {
        this.allKeys = this._parseKeys(keysString);
        this.permanentFailedKeys = new Set();
        this.suspendedUntil = new Map();
        this.currentIndex = 0;
        this.lastUsedTime = new Map();
        this.lastCooldownLogAt = 0;
    }

    _parseKeys(keysString) {
        if (!keysString || typeof keysString !== 'string') {
            return [];
        }

        return keysString
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);
    }

    _isTemporaryReason(reason = '') {
        if (reason && typeof reason === 'object') {
            const statusCode = Number(reason.statusCode);
            if (Number.isFinite(statusCode)) {
                if ([408, 409, 425, 429, 500, 502, 503, 504, 524].includes(statusCode)) {
                    return true;
                }
                if ([401, 403].includes(statusCode)) {
                    return false;
                }
            }
        }

        const text = this._formatReason(reason).toLowerCase();
        return text.includes('429') ||
            text.includes('rate_limit') ||
            text.includes('rate limit') ||
            text.includes('too many requests') ||
            text.includes('temporarily') ||
            text.includes('timeout') ||
            text.includes('timed out') ||
            text.includes('503') ||
            text.includes('524') ||
            text.includes('unavailable');
    }

    _formatReason(reason) {
        if (!reason) return 'unknown';
        if (typeof reason === 'string' || typeof reason === 'number') {
            return String(reason);
        }
        if (typeof reason === 'object') {
            const status = Number(reason.statusCode);
            const statusText = Number.isFinite(status) ? `HTTP ${status}` : '';
            const detail = String(
                reason.reason ||
                reason.message ||
                reason.errorMessage ||
                reason.detail ||
                ''
            ).trim();
            if (statusText && detail) return `${statusText} ${detail}`;
            return statusText || detail || 'unknown';
        }
        return String(reason);
    }

    _clampSuspendMs(ms) {
        const n = Number(ms);
        if (!Number.isFinite(n) || n <= 0) return TEMP_SUSPEND_MS;
        return Math.min(MAX_TEMP_SUSPEND_MS, Math.max(MIN_TEMP_SUSPEND_MS, Math.round(n)));
    }

    _parseRetryDelayMsFromText(text = '') {
        const source = String(text || '');
        if (!source) return null;

        const unitMatch = source.match(/retry(?:\s+after|\s+in)?\s+(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|sec|secs|seconds?|m|min|mins|minutes?)/i);
        if (unitMatch) {
            const value = Number(unitMatch[1]);
            const unit = unitMatch[2].toLowerCase();
            if (!Number.isFinite(value)) return null;
            if (unit.startsWith('m')) return Math.ceil(value * 60 * 1000);
            if (unit.startsWith('s')) return Math.ceil(value * 1000);
            return Math.ceil(value);
        }

        const retryDelayMatch = source.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i);
        if (retryDelayMatch) {
            const sec = Number(retryDelayMatch[1]);
            return Number.isFinite(sec) ? Math.ceil(sec * 1000) : null;
        }

        const retryAfterMatch = source.match(/retry[-_ ]?after["'\s:=]+(\d+(?:\.\d+)?)/i);
        if (retryAfterMatch) {
            const sec = Number(retryAfterMatch[1]);
            return Number.isFinite(sec) ? Math.ceil(sec * 1000) : null;
        }

        return null;
    }

    _extractSuspendMsFromReason(reason) {
        if (reason && typeof reason === 'object') {
            const explicitMs = Number(
                reason.suspendMs ??
                reason.retryAfterMs ??
                reason.cooldownMs
            );
            if (Number.isFinite(explicitMs) && explicitMs > 0) {
                return this._clampSuspendMs(explicitMs);
            }

            const objectText = this._formatReason(reason);
            const parsedObjectDelay = this._parseRetryDelayMsFromText(objectText);
            if (parsedObjectDelay !== null) {
                return this._clampSuspendMs(parsedObjectDelay);
            }
        }

        const parsedDelay = this._parseRetryDelayMsFromText(reason);
        if (parsedDelay !== null) {
            return this._clampSuspendMs(parsedDelay);
        }

        return TEMP_SUSPEND_MS;
    }

    _cleanupExpiredSuspensions(now = Date.now()) {
        for (const [key, until] of this.suspendedUntil.entries()) {
            if (until <= now) {
                this.suspendedUntil.delete(key);
            }
        }
    }

    getShortestSuspendMs(now = Date.now()) {
        this._cleanupExpiredSuspensions(now);

        let shortest = Infinity;
        for (const key of this.allKeys) {
            if (this.permanentFailedKeys.has(key)) continue;
            const until = this.suspendedUntil.get(key) || 0;
            if (until > now) {
                shortest = Math.min(shortest, until - now);
            }
        }

        return Number.isFinite(shortest) ? shortest : 0;
    }

    /**
     * 获取下一个可用 Key（轮询）
     * @returns {string|null} 可用的 Key，若当前无可用则返回 null
     */
    getNextKey() {
        const now = Date.now();
        this._cleanupExpiredSuspensions(now);

        const availableKeys = this.allKeys.filter(key => {
            if (this.permanentFailedKeys.has(key)) return false;
            const until = this.suspendedUntil.get(key) || 0;
            return until <= now;
        });

        if (availableKeys.length === 0) {
            const cooldownMs = this.getShortestSuspendMs(now);
            if (cooldownMs > 0 && now - this.lastCooldownLogAt > 5000) {
                this.lastCooldownLogAt = now;
                console.warn(`[KeyPool] 所有 Key 正在冷却中，最短 ${Math.ceil(cooldownMs / 1000)}s 后可用`);
            }
            return null;
        }

        const key = availableKeys[this.currentIndex % availableKeys.length];
        this.currentIndex = (this.currentIndex + 1) % availableKeys.length;
        this.lastUsedTime.set(key, now);

        return key;
    }

    /**
     * 标记 Key 失效
     * @param {string} key - 失效的 Key
     * @param {string|number} reason - 失效原因
     */
    markKeyFailed(key, reason = 'unknown') {
        if (!key || !this.allKeys.includes(key)) return;

        const now = Date.now();
        const temporary = this._isTemporaryReason(reason);
        const reasonText = this._formatReason(reason);

        if (temporary) {
            const suspendMs = this._extractSuspendMsFromReason(reason);
            const prevUntil = this.suspendedUntil.get(key) || 0;
            const nextUntil = Math.max(prevUntil, now + suspendMs);
            this.suspendedUntil.set(key, nextUntil);
            const remainSec = Math.ceil((nextUntil - now) / 1000);
            console.warn(`[KeyPool] Key ${this._maskKey(key)} 已挂起 ${remainSec}s (临时限流): ${reasonText}`);
            return;
        }

        this.permanentFailedKeys.add(key);
        this.suspendedUntil.delete(key);
        console.error(`[KeyPool] Key ${this._maskKey(key)} 已标记失效 (持久错误): ${reasonText}`);
    }

    restoreKey(key) {
        if (!key) return;
        this.permanentFailedKeys.delete(key);
        this.suspendedUntil.delete(key);
        console.log(`[KeyPool] Key ${this._maskKey(key)} 已恢复`);
    }

    getStats() {
        const now = Date.now();
        this._cleanupExpiredSuspensions(now);

        const keys = this.allKeys.map(key => {
            const permanentFailed = this.permanentFailedKeys.has(key);
            const suspendedMs = Math.max(0, (this.suspendedUntil.get(key) || 0) - now);
            const status = permanentFailed ? 'failed' : suspendedMs > 0 ? 'suspended' : 'active';

            return {
                key: this._maskKey(key),
                status,
                suspendedMs,
                lastUsed: this.lastUsedTime.get(key) || null
            };
        });

        return {
            total: this.allKeys.length,
            available: keys.filter(k => k.status === 'active').length,
            failed: keys.filter(k => k.status === 'failed').length,
            suspended: keys.filter(k => k.status === 'suspended').length,
            keys
        };
    }

    hasAvailableKey() {
        const now = Date.now();
        this._cleanupExpiredSuspensions(now);
        return this.allKeys.some(key => {
            if (this.permanentFailedKeys.has(key)) return false;
            const until = this.suspendedUntil.get(key) || 0;
            return until <= now;
        });
    }

    updateKeys(newKeysString) {
        const newKeys = this._parseKeys(newKeysString);

        const newPermanentFailedKeys = new Set();
        const newSuspendedUntil = new Map();

        for (const key of newKeys) {
            if (this.permanentFailedKeys.has(key)) {
                newPermanentFailedKeys.add(key);
            }
            if (this.suspendedUntil.has(key)) {
                newSuspendedUntil.set(key, this.suspendedUntil.get(key));
            }
        }

        this.allKeys = newKeys;
        this.permanentFailedKeys = newPermanentFailedKeys;
        this.suspendedUntil = newSuspendedUntil;
        this.currentIndex = 0;

        console.log(`[KeyPool] Keys 已更新: ${this.allKeys.length} 个`);
    }

    _maskKey(key) {
        if (!key || key.length < 8) return '****';
        return key.slice(0, 4) + '...' + key.slice(-4);
    }

    toStorageString() {
        return this.allKeys.join(',');
    }

    resetFailedStatus() {
        this.permanentFailedKeys.clear();
        this.suspendedUntil.clear();
        this.currentIndex = 0;
        console.log('[KeyPool] 已重置所有失效状态');
    }
}

const keyPoolCache = new Map();

export function getKeyPool(providerId, keysString) {
    const cacheKey = providerId;

    if (!keyPoolCache.has(cacheKey)) {
        keyPoolCache.set(cacheKey, new KeyPoolManager(keysString));
    } else {
        const pool = keyPoolCache.get(cacheKey);
        if (pool.toStorageString() !== keysString) {
            pool.updateKeys(keysString);
        }
    }

    return keyPoolCache.get(cacheKey);
}

export function clearKeyPoolCache() {
    keyPoolCache.clear();
    console.log('[KeyPool] 缓存已清除');
}
