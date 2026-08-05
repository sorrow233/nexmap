import { readActivityLog } from './activityLogStorage.js';

export const STATS_SNAPSHOT_VERSION = 3;

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PERIOD_KEYS = ['morning', 'afternoon', 'evening', 'night'];

const toNonNegativeInteger = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
};

const normalizeCounterMap = (value, keyFilter = () => true) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

    return Object.fromEntries(
        Object.entries(value)
            .filter(([key]) => keyFilter(String(key)))
            .map(([key, count]) => [String(key), toNonNegativeInteger(count)])
            .filter(([, count]) => count > 0)
            .sort(([left], [right]) => left.localeCompare(right))
    );
};

const normalizeTimeDistribution = (value = {}) => Object.fromEntries(
    PERIOD_KEYS.map((period) => [period, toNonNegativeInteger(value?.[period])])
);

const buildChecksumPayload = (snapshot) => JSON.stringify({
    v: snapshot.v,
    revision: snapshot.revision,
    updatedAt: snapshot.updatedAt,
    unattributedChars: snapshot.unattributedChars,
    dailyHistory: snapshot.dailyHistory,
    dailySessions: snapshot.dailySessions,
    modelUsage: snapshot.modelUsage,
    timeDistribution: snapshot.timeDistribution
});

const checksum = (input) => {
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
};

export const createEmptyStatsSnapshot = () => ({
    v: STATS_SNAPSHOT_VERSION,
    revision: 0,
    updatedAt: 0,
    unattributedChars: 0,
    dailyHistory: {},
    dailySessions: {},
    modelUsage: {},
    timeDistribution: normalizeTimeDistribution()
});

export const normalizeStatsSnapshot = (value) => {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return {
        v: STATS_SNAPSHOT_VERSION,
        revision: toNonNegativeInteger(source.revision),
        updatedAt: toNonNegativeInteger(source.updatedAt),
        unattributedChars: toNonNegativeInteger(source.unattributedChars),
        dailyHistory: normalizeCounterMap(source.dailyHistory, (key) => DATE_KEY_PATTERN.test(key)),
        dailySessions: normalizeCounterMap(source.dailySessions, (key) => DATE_KEY_PATTERN.test(key)),
        modelUsage: normalizeCounterMap(source.modelUsage, (key) => key.trim().length > 0),
        timeDistribution: normalizeTimeDistribution(source.timeDistribution)
    };
};

export const sealStatsSnapshot = (value) => {
    const normalized = normalizeStatsSnapshot(value);
    return {
        ...normalized,
        checksum: checksum(buildChecksumPayload(normalized))
    };
};

export const parseStatsSnapshot = (rawValue) => {
    if (!rawValue) return null;

    try {
        const parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
        if (!parsed || Number(parsed.v) !== STATS_SNAPSHOT_VERSION || typeof parsed.checksum !== 'string') {
            return null;
        }

        const normalized = normalizeStatsSnapshot(parsed);
        if (checksum(buildChecksumPayload(normalized)) !== parsed.checksum) return null;
        return sealStatsSnapshot(normalized);
    } catch {
        return null;
    }
};

export const getStatsPeriod = (hour) => {
    const normalizedHour = Number(hour);
    if (normalizedHour >= 6 && normalizedHour < 12) return 'morning';
    if (normalizedHour >= 12 && normalizedHour < 18) return 'afternoon';
    if (normalizedHour >= 18 && normalizedHour < 24) return 'evening';
    return 'night';
};

export const getUnicodeCharacterCount = (text) => Array.from(String(text || '')).length;

export const applyGenerationToSnapshot = (snapshot, {
    chars,
    dateKey,
    hour,
    model,
    timestamp = Date.now()
}) => {
    const count = toNonNegativeInteger(chars);
    if (!count || !DATE_KEY_PATTERN.test(String(dateKey || ''))) {
        return sealStatsSnapshot(snapshot);
    }

    const next = normalizeStatsSnapshot(snapshot);
    const period = getStatsPeriod(hour);
    next.revision += 1;
    next.updatedAt = toNonNegativeInteger(timestamp) || Date.now();
    next.dailyHistory[dateKey] = (next.dailyHistory[dateKey] || 0) + count;
    next.dailySessions[dateKey] = (next.dailySessions[dateKey] || 0) + 1;
    next.timeDistribution[period] += count;

    const normalizedModel = String(model || '').trim();
    if (normalizedModel) {
        next.modelUsage[normalizedModel] = (next.modelUsage[normalizedModel] || 0) + 1;
    }

    return sealStatsSnapshot(next);
};

export const applyModelUsageToSnapshot = (snapshot, model, timestamp = Date.now()) => {
    const normalizedModel = String(model || '').trim();
    if (!normalizedModel) return sealStatsSnapshot(snapshot);

    const next = normalizeStatsSnapshot(snapshot);
    next.revision += 1;
    next.updatedAt = toNonNegativeInteger(timestamp) || Date.now();
    next.modelUsage[normalizedModel] = (next.modelUsage[normalizedModel] || 0) + 1;
    return sealStatsSnapshot(next);
};

export const buildStatsSnapshotFromLegacy = ({
    totalChars,
    dailyHistory,
    dailySessions,
    modelUsage,
    activityLog
} = {}) => {
    const history = normalizeCounterMap(dailyHistory, (key) => DATE_KEY_PATTERN.test(key));
    const historyTotal = Object.values(history).reduce((sum, count) => sum + count, 0);
    const legacyTotal = toNonNegativeInteger(totalChars);
    const distribution = normalizeTimeDistribution();

    readActivityLog(typeof activityLog === 'string' ? activityLog : JSON.stringify(activityLog || []))
        .forEach((entry) => {
            distribution[getStatsPeriod(entry.hour)] += toNonNegativeInteger(entry.chars);
        });

    return sealStatsSnapshot({
        ...createEmptyStatsSnapshot(),
        updatedAt: Date.now(),
        unattributedChars: Math.max(0, legacyTotal - historyTotal),
        dailyHistory: history,
        dailySessions,
        modelUsage,
        timeDistribution: distribution
    });
};

export const getStatsSnapshotTotalChars = (snapshot) => {
    const normalized = normalizeStatsSnapshot(snapshot);
    return normalized.unattributedChars
        + Object.values(normalized.dailyHistory).reduce((sum, count) => sum + count, 0);
};
