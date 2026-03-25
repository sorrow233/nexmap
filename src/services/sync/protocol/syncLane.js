export const SYNC_LANES = Object.freeze({
    NONE: 'none',
    SKELETON: 'skeleton',
    BODY: 'body',
    FULL: 'full'
});

const VALID_SYNC_LANES = new Set(Object.values(SYNC_LANES));

export const normalizeSyncLane = (value) => (
    VALID_SYNC_LANES.has(value) ? value : SYNC_LANES.FULL
);

export const isSkeletonSyncLane = (value) => normalizeSyncLane(value) === SYNC_LANES.SKELETON;
export const isBodySyncLane = (value) => normalizeSyncLane(value) === SYNC_LANES.BODY;
export const isFullSyncLane = (value) => normalizeSyncLane(value) === SYNC_LANES.FULL;

export const mergeSyncLanes = (currentLane = SYNC_LANES.NONE, nextLane = SYNC_LANES.NONE) => {
    const current = normalizeSyncLane(currentLane);
    const next = normalizeSyncLane(nextLane);

    if (current === SYNC_LANES.NONE) return next;
    if (next === SYNC_LANES.NONE) return current;
    if (current === next) return current;
    if (current === SYNC_LANES.FULL || next === SYNC_LANES.FULL) {
        return SYNC_LANES.FULL;
    }

    return SYNC_LANES.FULL;
};

export const resolveSafeModeDebounceByLane = (lane, fallbackMs) => {
    switch (normalizeSyncLane(lane)) {
    case SYNC_LANES.SKELETON:
        return 650;
    case SYNC_LANES.BODY:
        return 1200;
    case SYNC_LANES.FULL:
    default:
        return fallbackMs;
    }
};
