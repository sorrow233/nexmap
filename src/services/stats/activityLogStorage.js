import { parseStoredJson } from './statsStorage';

const ACTIVITY_LOG_VERSION = 2;
const ACTIVITY_LOG_RETENTION_DAYS = 30;
const MAX_ACTIVITY_BUCKETS = ACTIVITY_LOG_RETENTION_DAYS * 24;

function getHourBucketTimestamp(timestamp) {
    const bucketTime = new Date(timestamp);
    bucketTime.setMinutes(0, 0, 0);
    return bucketTime.getTime();
}

function normalizeActivityEntry(entry) {
    if (Array.isArray(entry)) {
        const [timestamp, hour, chars, events = 1] = entry;
        return {
            timestamp: Number(timestamp) || 0,
            hour: Number(hour) || 0,
            chars: Number(chars) || 0,
            events: Number(events) || 1
        };
    }

    if (!entry || typeof entry !== 'object') {
        return null;
    }

    return {
        timestamp: Number(entry.timestamp) || 0,
        hour: Number(entry.hour) || 0,
        chars: Number(entry.chars) || 0,
        events: Number(entry.events) || 1
    };
}

function normalizeLegacyActivityEntries(entries) {
    const bucketMap = new Map();

    entries.forEach((entry) => {
        const normalized = normalizeActivityEntry(entry);
        if (!normalized || normalized.timestamp <= 0 || normalized.chars <= 0) {
            return;
        }

        const bucketTimestamp = getHourBucketTimestamp(normalized.timestamp);
        const existing = bucketMap.get(bucketTimestamp) || {
            timestamp: bucketTimestamp,
            hour: new Date(bucketTimestamp).getHours(),
            chars: 0,
            events: 0
        };

        existing.chars += normalized.chars;
        existing.events += normalized.events || 1;
        bucketMap.set(bucketTimestamp, existing);
    });

    return Array.from(bucketMap.values());
}

function normalizeActivityPayload(payload) {
    if (Array.isArray(payload)) {
        return normalizeLegacyActivityEntries(payload);
    }

    if (payload?.v === ACTIVITY_LOG_VERSION && Array.isArray(payload.e)) {
        return payload.e
            .map((entry) => normalizeActivityEntry(entry))
            .filter((entry) => entry && entry.timestamp > 0 && entry.chars > 0);
    }

    return [];
}

function pruneActivityEntries(entries, referenceTimestamp = Date.now()) {
    const cutoffTimestamp = referenceTimestamp - (ACTIVITY_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    return entries
        .filter((entry) => entry.timestamp >= cutoffTimestamp && entry.chars > 0)
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-MAX_ACTIVITY_BUCKETS);
}

export function readActivityLog(rawValue) {
    const parsed = parseStoredJson(rawValue, []);
    return pruneActivityEntries(normalizeActivityPayload(parsed));
}

export function serializeActivityLog(entries) {
    const normalizedEntries = pruneActivityEntries(entries);
    return JSON.stringify({
        v: ACTIVITY_LOG_VERSION,
        e: normalizedEntries.map((entry) => [
            entry.timestamp,
            entry.hour,
            entry.chars,
            entry.events || 1
        ])
    });
}

export function createEmptyActivityLogValue() {
    return serializeActivityLog([]);
}

export function normalizeActivityLogStorageValue(rawValue) {
    return serializeActivityLog(readActivityLog(rawValue));
}

export function buildUpdatedActivityLogValue(rawValue, { timestamp = Date.now(), chars = 0 } = {}) {
    if (!chars || chars <= 0) {
        return normalizeActivityLogStorageValue(rawValue);
    }

    const entries = readActivityLog(rawValue);
    const bucketTimestamp = getHourBucketTimestamp(timestamp);
    const bucketMap = new Map(entries.map((entry) => [entry.timestamp, { ...entry }]));
    const currentEntry = bucketMap.get(bucketTimestamp) || {
        timestamp: bucketTimestamp,
        hour: new Date(bucketTimestamp).getHours(),
        chars: 0,
        events: 0
    };

    currentEntry.chars += chars;
    currentEntry.events += 1;
    bucketMap.set(bucketTimestamp, currentEntry);

    return serializeActivityLog(pruneActivityEntries(Array.from(bucketMap.values()), timestamp));
}
