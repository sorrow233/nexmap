import { debugLog } from '../../utils/debugLogger';
import {
    normalizeBoardMetadataList,
    normalizeBoardTitleMeta
} from '../boardTitle/metadata';

export const BOARDS_LIST_KEY = 'mixboard_boards_list';

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
    'autoImageTriggeredAt'
];

const BOARD_LIST_STORAGE_TIERS = [
    { name: 'full', omitKeys: [] },
    { name: 'without_thumbnail', omitKeys: ['thumbnail'] },
    { name: 'without_visuals', omitKeys: ['thumbnail', 'backgroundImage'] },
    { name: 'without_display_metadata', omitKeys: ['thumbnail', 'backgroundImage', 'summary'] },
    { name: 'core_only', coreOnly: true }
];

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
    try {
        return localStorage.getItem(BOARDS_LIST_KEY);
    } catch (error) {
        debugLog.error('[Storage] Failed to read boards list from localStorage', error);
        return null;
    }
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
            : omitBoardKeys(board, tier.omitKeys)
    ))
);

export const readBoardsMetadataListFromStorage = () => {
    const raw = readStoredBoardsListRaw();
    try {
        const parsed = raw ? JSON.parse(raw) : [];
        return normalizeBoardMetadataList(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
        debugLog.error('[Storage] Failed to parse boards list from localStorage', error);
        return [];
    }
};

export const persistBoardsMetadataList = (boards = [], options = {}) => {
    const { reason = 'unknown', rethrow = false } = options;
    const normalizedBoards = normalizeBoardMetadataList(Array.isArray(boards) ? boards : []);
    const currentSerialized = readStoredBoardsListRaw();
    let lastError = null;

    for (const tier of BOARD_LIST_STORAGE_TIERS) {
        const candidateBoards = buildBoardsForStorageTier(normalizedBoards, tier);
        const serialized = JSON.stringify(candidateBoards);
        const approxBytes = getApproxBytes(serialized);

        if (serialized === currentSerialized) {
            return {
                storedBoards: candidateBoards,
                tier: tier.name,
                skipped: true,
                approxBytes
            };
        }

        try {
            localStorage.setItem(BOARDS_LIST_KEY, serialized);
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
