import { debugLog } from '../../utils/debugLogger';
import {
    normalizeBoardMetadataList,
    normalizeBoardTitleMeta
} from '../boardTitle/metadata';
import { runWhenBrowserIdle } from '../../utils/idleTask';

export const BOARDS_LIST_KEY = 'mixboard_boards_list';
const BOARD_LIST_PERSIST_TIMEOUT_MS = 1800;
const BOARD_LIST_FALLBACK_DELAY_MS = 180;

const CORE_BOARD_METADATA_KEYS = [
    'id',
    'name',
    'nameSource',
    'autoTitle',
    'autoTitleGeneratedAt',
    'manualTitleUpdatedAt',
    'createdAt',
    'updatedAt',
    'lastAccessedAt',
    'cardCount',
    'clientRevision',
    'deletedAt',
    'autoImageTriggeredAt',
    'autoSummaryTriggeredAt',
    'autoImageCompletedAt',
    'autoSummaryCompletedAt'
];

const BOARD_LIST_STORAGE_TIERS = [
    { name: 'full', omitKeys: [] },
    { name: 'without_thumbnail', omitKeys: ['thumbnail'] },
    { name: 'without_visuals', omitKeys: ['thumbnail', 'backgroundImage'] },
    { name: 'without_display_metadata', omitKeys: ['thumbnail', 'backgroundImage', 'summary'] },
    { name: 'core_only', coreOnly: true }
];

const ALWAYS_OMIT_KEYS = ['thumbnail'];
let cachedBoardsList = [];
let cachedSerializedBoardsList = null;
let boardsListCacheHydrated = false;
let pendingBoardsListPersist = null;
let boardsListRuntimeBound = false;

const isQuotaExceededError = (error) => (
    error?.name === 'QuotaExceededError' ||
    error?.code === 22 ||
    error?.code === 1014
);

const getApproxBytes = (value) => {
    if (typeof value !== 'string') return 0;
    try {
        return new TextEncoder().encode(value).length;
    } catch {
        return value.length;
    }
};

const readStoredBoardsListRaw = () => {
    if (boardsListCacheHydrated) {
        return cachedSerializedBoardsList;
    }

    try {
        const raw = localStorage.getItem(BOARDS_LIST_KEY);
        cachedSerializedBoardsList = raw;
        boardsListCacheHydrated = true;
        return raw;
    } catch (error) {
        debugLog.error('[Storage] Failed to read boards list from localStorage', error);
        return null;
    }
};

const cloneBoardsList = (boards = []) => (
    (Array.isArray(boards) ? boards : []).map((board) => ({ ...board }))
);

const setBoardsListCache = (boards = [], serialized = cachedSerializedBoardsList) => {
    cachedBoardsList = cloneBoardsList(normalizeBoardMetadataList(Array.isArray(boards) ? boards : []));
    cachedSerializedBoardsList = typeof serialized === 'string' ? serialized : null;
    boardsListCacheHydrated = true;
    return cloneBoardsList(cachedBoardsList);
};

const hydrateBoardsListCacheFromRaw = (raw) => {
    try {
        const parsed = raw ? JSON.parse(raw) : [];
        return setBoardsListCache(Array.isArray(parsed) ? parsed : [], raw);
    } catch (error) {
        debugLog.error('[Storage] Failed to parse boards list from localStorage', error);
        return setBoardsListCache([], raw);
    }
};

const ensureBoardsListRuntime = () => {
    if (boardsListRuntimeBound || typeof window === 'undefined') {
        return;
    }

    const flushOnBackground = () => {
        void flushPendingBoardsMetadataList();
    };

    window.addEventListener('pagehide', flushOnBackground);
    window.addEventListener('beforeunload', flushOnBackground);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            flushOnBackground();
        }
    });
    window.addEventListener('storage', (event) => {
        if (event.key !== BOARDS_LIST_KEY) return;
        hydrateBoardsListCacheFromRaw(event.newValue || null);
    });

    boardsListRuntimeBound = true;
};

const pickCoreBoardMetadata = (board = {}) => {
    const core = {};
    CORE_BOARD_METADATA_KEYS.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(board, key)) {
            core[key] = board[key];
        }
    });
    return core;
};

const omitBoardKeys = (board = {}, omitKeys = []) => {
    if (!board || typeof board !== 'object') return {};
    const nextBoard = { ...board };
    omitKeys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(nextBoard, key)) {
            delete nextBoard[key];
        }
    });
    return nextBoard;
};

const buildBoardsForStorageTier = (boards = [], tier) => normalizeBoardMetadataList(
    boards.map((board) => normalizeBoardTitleMeta(
        tier.coreOnly
            ? pickCoreBoardMetadata(board)
            : omitBoardKeys(board, [...ALWAYS_OMIT_KEYS, ...tier.omitKeys])
    ))
);

export const readBoardsMetadataListFromStorage = () => {
    ensureBoardsListRuntime();

    if (!boardsListCacheHydrated) {
        return hydrateBoardsListCacheFromRaw(readStoredBoardsListRaw());
    }

    return cloneBoardsList(cachedBoardsList);
};

const persistBoardsMetadataListNow = (boards = [], options = {}) => {
    const { reason = 'unknown', rethrow = false } = options;
    const normalizedBoards = normalizeBoardMetadataList(Array.isArray(boards) ? boards : []);
    const currentSerialized = boardsListCacheHydrated
        ? cachedSerializedBoardsList
        : readStoredBoardsListRaw();
    let lastError = null;

    for (const tier of BOARD_LIST_STORAGE_TIERS) {
        const candidateBoards = buildBoardsForStorageTier(normalizedBoards, tier);
        const serialized = JSON.stringify(candidateBoards);
        const approxBytes = getApproxBytes(serialized);

        if (serialized === currentSerialized) {
            setBoardsListCache(normalizedBoards, serialized);
            return {
                storedBoards: candidateBoards,
                tier: tier.name,
                skipped: true,
                approxBytes
            };
        }

        try {
            localStorage.setItem(BOARDS_LIST_KEY, serialized);
            setBoardsListCache(normalizedBoards, serialized);
            if (tier.name !== 'full') {
                debugLog.warn(
                    `[Storage] Boards list persisted with compact tier "${tier.name}" during ${reason}`,
                    { boardCount: candidateBoards.length, approxBytes }
                );
            }
            return {
                storedBoards: candidateBoards,
                tier: tier.name,
                skipped: false,
                approxBytes
            };
        } catch (error) {
            lastError = error;
            if (!isQuotaExceededError(error)) {
                debugLog.error(
                    `[Storage] Boards list persistence failed during ${reason} with tier "${tier.name}"`,
                    error
                );
                if (rethrow) {
                    throw error;
                }
                return {
                    storedBoards: normalizedBoards,
                    tier: 'memory_only',
                    skipped: false,
                    failed: true,
                    approxBytes,
                    error
                };
            }

            debugLog.warn(
                `[Storage] Boards list quota exceeded at tier "${tier.name}" during ${reason}`,
                { boardCount: candidateBoards.length, approxBytes }
            );
        }
    }

    setBoardsListCache(normalizedBoards, currentSerialized);
    debugLog.error(
        `[Storage] Boards list persistence failed after exhausting compact tiers during ${reason}`,
        lastError
    );

    if (rethrow && lastError) {
        throw lastError;
    }

    return {
        storedBoards: normalizedBoards,
        tier: 'memory_only',
        skipped: false,
        failed: true,
        error: lastError
    };
};

export const flushPendingBoardsMetadataList = async () => {
    const pending = pendingBoardsListPersist;
    if (!pending) {
        return null;
    }

    pendingBoardsListPersist = null;
    pending.cancel?.();
    return persistBoardsMetadataListNow(pending.boards, pending.options);
};

export const persistBoardsMetadataList = (boards = [], options = {}) => {
    const { immediate = true, reason = 'unknown' } = options;
    const normalizedBoards = normalizeBoardMetadataList(Array.isArray(boards) ? boards : []);

    ensureBoardsListRuntime();
    setBoardsListCache(normalizedBoards, cachedSerializedBoardsList);

    if (immediate) {
        if (pendingBoardsListPersist) {
            pendingBoardsListPersist.cancel?.();
            pendingBoardsListPersist = null;
        }

        return persistBoardsMetadataListNow(normalizedBoards, options);
    }

    if (pendingBoardsListPersist) {
        pendingBoardsListPersist.cancel?.();
    }

    const pendingEntry = {
        boards: cloneBoardsList(normalizedBoards),
        options,
        cancel: null
    };

    pendingEntry.cancel = runWhenBrowserIdle(() => {
        if (pendingBoardsListPersist !== pendingEntry) {
            return;
        }

        pendingBoardsListPersist = null;
        void persistBoardsMetadataListNow(pendingEntry.boards, pendingEntry.options);
    }, {
        timeout: options.timeoutMs ?? BOARD_LIST_PERSIST_TIMEOUT_MS,
        fallbackDelay: options.fallbackDelay ?? BOARD_LIST_FALLBACK_DELAY_MS
    });

    pendingBoardsListPersist = pendingEntry;

    return {
        storedBoards: cloneBoardsList(normalizedBoards),
        tier: 'deferred',
        skipped: false,
        deferred: true,
        reason
    };
};
