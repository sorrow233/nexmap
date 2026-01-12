/**
 * KeyPoolManager - 多 API Key 池管理器
 * 
 * 功能：
 * - 支持多个 API Key（逗号分隔存储）
 * - 轮询选择下一个可用 Key
 * - 自动标记失效 Key 并跳过
 * - 提供 Key 池状态统计
 */

export class KeyPoolManager {
    constructor(keysString = '') {
        // 解析逗号分隔的 Keys
        this.allKeys = this._parseKeys(keysString);
        this.failedKeys = new Set();
        this.currentIndex = 0;
        this.lastUsedTime = new Map();
    }

    /**
     * 解析 Key 字符串
     * @param {string} keysString - 逗号分隔的 Keys
     * @returns {string[]} Key 数组
     */
    _parseKeys(keysString) {
        if (!keysString || typeof keysString !== 'string') {
            return [];
        }

        return keysString
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);
    }

    /**
     * 获取下一个可用 Key（轮询）
     * @returns {string|null} 可用的 Key，若全部失效则返回 null
     */
    getNextKey() {
        const availableKeys = this.allKeys.filter(k => !this.failedKeys.has(k));

        if (availableKeys.length === 0) {
            // 所有 Key 都失效，重置失效列表尝试恢复
            if (this.allKeys.length > 0) {
                console.warn('[KeyPool] 所有 Key 已标记失效，尝试重置...');
                this.failedKeys.clear();
                return this.allKeys[0];
            }
            return null;
        }

        // 轮询选择
        const key = availableKeys[this.currentIndex % availableKeys.length];
        this.currentIndex = (this.currentIndex + 1) % availableKeys.length;
        this.lastUsedTime.set(key, Date.now());

        return key;
    }

    /**
     * 标记 Key 失效
     * @param {string} key - 失效的 Key
     * @param {string} reason - 失效原因
     */
    markKeyFailed(key, reason = 'unknown') {
        if (key && this.allKeys.includes(key)) {
            this.failedKeys.add(key);
            console.warn(`[KeyPool] Key ${this._maskKey(key)} 已标记失效: ${reason}`);
        }
    }

    /**
     * 恢复 Key
     * @param {string} key - 需要恢复的 Key
     */
    restoreKey(key) {
        if (key) {
            this.failedKeys.delete(key);
            console.log(`[KeyPool] Key ${this._maskKey(key)} 已恢复`);
        }
    }

    /**
     * 获取 Key 池状态
     * @returns {object} 包含总数、可用数、失效数的统计
     */
    getStats() {
        return {
            total: this.allKeys.length,
            available: this.allKeys.length - this.failedKeys.size,
            failed: this.failedKeys.size,
            keys: this.allKeys.map(k => ({
                key: this._maskKey(k),
                status: this.failedKeys.has(k) ? 'failed' : 'active',
                lastUsed: this.lastUsedTime.get(k) || null
            }))
        };
    }

    /**
     * 检查是否有可用 Key
     * @returns {boolean}
     */
    hasAvailableKey() {
        return this.allKeys.some(k => !this.failedKeys.has(k));
    }

    /**
     * 更新 Keys（用于配置变更时）
     * @param {string} newKeysString - 新的逗号分隔 Keys
     */
    updateKeys(newKeysString) {
        const newKeys = this._parseKeys(newKeysString);

        // 保留已知失效的 Keys 状态（如果还在新列表中）
        const newFailedKeys = new Set();
        for (const key of this.failedKeys) {
            if (newKeys.includes(key)) {
                newFailedKeys.add(key);
            }
        }

        this.allKeys = newKeys;
        this.failedKeys = newFailedKeys;
        this.currentIndex = 0;

        console.log(`[KeyPool] Keys 已更新: ${this.allKeys.length} 个`);
    }

    /**
     * 遮蔽 Key 用于日志显示
     * @param {string} key 
     * @returns {string}
     */
    _maskKey(key) {
        if (!key || key.length < 8) return '****';
        return key.slice(0, 4) + '...' + key.slice(-4);
    }

    /**
     * 获取所有 Key（用于存储）
     * @returns {string} 逗号分隔的 Keys
     */
    toStorageString() {
        return this.allKeys.join(',');
    }

    /**
     * 重置所有失效状态
     */
    resetFailedStatus() {
        this.failedKeys.clear();
        this.currentIndex = 0;
        console.log('[KeyPool] 已重置所有失效状态');
    }
}

// 单例缓存，按 provider ID 存储
const keyPoolCache = new Map();

/**
 * 获取或创建 KeyPoolManager 实例
 * @param {string} providerId - Provider 唯一标识
 * @param {string} keysString - 逗号分隔的 Keys
 * @returns {KeyPoolManager}
 */
export function getKeyPool(providerId, keysString) {
    const cacheKey = providerId;

    if (!keyPoolCache.has(cacheKey)) {
        keyPoolCache.set(cacheKey, new KeyPoolManager(keysString));
    } else {
        // 如果 Keys 变化，更新实例
        const pool = keyPoolCache.get(cacheKey);
        if (pool.toStorageString() !== keysString) {
            pool.updateKeys(keysString);
        }
    }

    return keyPoolCache.get(cacheKey);
}

/**
 * 清除 KeyPool 缓存（用于登出等场景）
 */
export function clearKeyPoolCache() {
    keyPoolCache.clear();
    console.log('[KeyPool] 缓存已清除');
}
