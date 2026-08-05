import assert from 'node:assert/strict';
import {
    applyGenerationToSnapshot,
    buildStatsSnapshotFromLegacy,
    createEmptyStatsSnapshot,
    getStatsSnapshotTotalChars,
    getUnicodeCharacterCount,
    parseStatsSnapshot,
    sealStatsSnapshot
} from '../src/services/stats/statsSnapshot.js';

class MemoryStorage {
    constructor(initial = {}) {
        this.values = new Map(Object.entries(initial));
    }

    getItem(key) {
        return this.values.has(key) ? this.values.get(key) : null;
    }

    setItem(key, value) {
        this.values.set(key, String(value));
    }
}

assert.equal(getUnicodeCharacterCount('中文🙂'), 3, 'Unicode code points must not count emoji twice');

const first = applyGenerationToSnapshot(createEmptyStatsSnapshot(), {
    chars: 12,
    dateKey: '2026-08-05',
    hour: 23,
    model: 'test-model',
    timestamp: 1785861000000
});
assert.equal(getStatsSnapshotTotalChars(first), 12);
assert.equal(first.dailyHistory['2026-08-05'], 12);
assert.equal(first.dailySessions['2026-08-05'], 1);
assert.equal(first.timeDistribution.evening, 12);
assert.equal(first.modelUsage['test-model'], 1);
assert.ok(parseStatsSnapshot(JSON.stringify(first)));

const corrupted = JSON.parse(JSON.stringify(first));
corrupted.dailyHistory['2026-08-05'] = 999;
assert.equal(parseStatsSnapshot(JSON.stringify(corrupted)), null, 'Checksum must reject altered data');

const legacy = buildStatsSnapshotFromLegacy({
    totalChars: 120,
    dailyHistory: { '2026-08-04': 50, '2026-08-05': 60 },
    dailySessions: { '2026-08-05': 2 },
    modelUsage: { legacy: 2 }
});
assert.equal(getStatsSnapshotTotalChars(legacy), 120, 'Legacy total gaps must be preserved without assigning a false date');
assert.equal(legacy.unattributedChars, 10);

const storage = new MemoryStorage();
globalThis.localStorage = storage;
let lockQueue = Promise.resolve();
Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
    locks: {
        request(_name, _options, callback) {
            const result = lockQueue.then(callback, callback);
            lockQueue = result.catch(() => undefined);
            return result;
        }
    }
    }
});

const { UserStatsService, STATS_STORAGE_KEYS } = await import('../src/services/stats/userStatsService.js');
const service = new UserStatsService(storage);
const timestamp = new Date(2026, 7, 5, 9, 30).getTime();

await Promise.all(Array.from({ length: 40 }, () => service.recordGeneration({
    text: '中文🙂',
    model: 'parallel-model',
    timestamp
})));

const snapshot = service.exportSnapshot();
assert.equal(snapshot.dailyHistory['2026-08-05'], 120);
assert.equal(snapshot.dailySessions['2026-08-05'], 40);
assert.equal(snapshot.timeDistribution.morning, 120);
assert.equal(snapshot.modelUsage['parallel-model'], 40);
assert.equal(service.getStats().totalChars, 120);
assert.ok(parseStatsSnapshot(storage.getItem(STATS_STORAGE_KEYS.SNAPSHOT_BACKUP)));

const validCurrent = storage.getItem(STATS_STORAGE_KEYS.SNAPSHOT);
storage.setItem(STATS_STORAGE_KEYS.SNAPSHOT_BACKUP, validCurrent);
storage.setItem(STATS_STORAGE_KEYS.SNAPSHOT, JSON.stringify(sealStatsSnapshot({ dailyHistory: { '2026-08-05': 1 } })).slice(0, -4));
assert.equal(service.getStats().totalChars, 120, 'Corrupt primary snapshot must recover from backup');

console.log('[test-user-stats] PASS');
