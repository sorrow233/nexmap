export const FIREBASE_SYNC_ENABLED = import.meta.env.VITE_FIREBASE_SYNC_ENABLED !== 'false';
export const FIREBASE_SYNC_SAFE_MODE = import.meta.env.VITE_FIREBASE_SYNC_SAFE_MODE !== 'false';
export const FIREBASE_SYNC_SAFE_MODE_UPLOAD_DEBOUNCE_MS = Number(
    import.meta.env.VITE_FIREBASE_SYNC_SAFE_MODE_UPLOAD_DEBOUNCE_MS
) || 1800;

export const FIREBASE_SYNC_COLLECTIONS = {
    users: import.meta.env.VITE_FIREBASE_SYNC_USERS_COLLECTION || 'users',
    boards: import.meta.env.VITE_FIREBASE_SYNC_BOARDS_COLLECTION || 'boards',
    cardBodies: import.meta.env.VITE_FIREBASE_SYNC_CARD_BODIES_COLLECTION || 'cardBodies',
    thumbnails: import.meta.env.VITE_FIREBASE_SYNC_THUMBNAILS_COLLECTION || 'board_thumbnails',
    updates: import.meta.env.VITE_FIREBASE_SYNC_UPDATES_COLLECTION || 'updates',
    snapshots: import.meta.env.VITE_FIREBASE_SYNC_SNAPSHOTS_COLLECTION || 'snapshots'
};

export const FIREBASE_SYNC_LIMITS = {
    enableDeltaUpdateLog: import.meta.env.VITE_FIREBASE_SYNC_ENABLE_DELTA_UPDATE_LOG !== 'false',
    uploadDebounceMs: Number(import.meta.env.VITE_FIREBASE_SYNC_UPLOAD_DEBOUNCE_MS) || 2500,
    maxPendingUpdateBytes: Number(import.meta.env.VITE_FIREBASE_SYNC_MAX_PENDING_UPDATE_BYTES) || (24 * 1024),
    snapshotAfterFlushes: Number(import.meta.env.VITE_FIREBASE_SYNC_SNAPSHOT_AFTER_FLUSHES) || 24,
    metadataSyncDebounceMs: Number(import.meta.env.VITE_FIREBASE_SYNC_METADATA_DEBOUNCE_MS) || 3000
};

export const FIREBASE_SYNC_ORIGINS = {
    localSeed: 'firebase-sync-local-seed',
    firestore: 'firebase-sync-firestore',
    store: 'firebase-sync-store-full',
    storeFull: 'firebase-sync-store-full',
    storeSkeleton: 'firebase-sync-store-skeleton',
    storeBody: 'firebase-sync-store-body',
    runtime: 'firebase-sync-runtime',
    indexeddb: 'firebase-sync-indexeddb',
    forceOverride: 'firebase-sync-force-override'
};

export const isSampleBoardId = (boardId) => typeof boardId === 'string' && boardId.startsWith('sample-');
