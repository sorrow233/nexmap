import { normalizeBoardMetadataList, normalizeBoardTitleMeta } from '../boardTitle/metadata';
import { persistBoardThumbnailResource } from './boardThumbnailStorage';
import { syncBoardThumbnailResourceToRemote } from '../sync/boardThumbnailResourceSync';
import { debugLog } from '../../utils/debugLogger';

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

const normalizeLooseString = (value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') {
        return String(value).trim() || null;
    }
    return value.trim() || null;
};

const normalizeThumbnailUpdatedAt = (value, fallback = Date.now()) => {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
        return numeric;
    }
    return fallback;
};

const buildMigrationResult = ({
    record,
    changed = false,
    migrated = false,
    failed = false,
    error = null
}) => ({
    record,
    changed,
    migrated,
    failed,
    error
});

export const hasLegacyInlineThumbnail = (record = {}) => Boolean(
    normalizeLooseString(record?.thumbnail)
);

export const migrateBoardThumbnailRecord = async (boardId, record = {}, options = {}) => {
    if (!boardId || !record || typeof record !== 'object') {
        return buildMigrationResult({ record });
    }

    const legacyThumbnail = normalizeLooseString(record.thumbnail);
    if (!legacyThumbnail) {
        return buildMigrationResult({ record });
    }

    const existingThumbnailRef = normalizeLooseString(record.thumbnailRef);
    const thumbnailUpdatedAt = normalizeThumbnailUpdatedAt(
        record.thumbnailUpdatedAt ?? record.updatedAt,
        Date.now()
    );

    try {
        const storedThumbnail = await persistBoardThumbnailResource(boardId, legacyThumbnail, {
            thumbnailRef: existingThumbnailRef || undefined,
            thumbnailUpdatedAt
        });

        if (!storedThumbnail?.thumbnailRef) {
            throw new Error('缩略图资源持久化未返回 thumbnailRef');
        }

        if (options.syncRemoteResource && options.userId) {
            const synced = await syncBoardThumbnailResourceToRemote(options.userId, {
                id: boardId,
                thumbnailRef: storedThumbnail.thumbnailRef,
                thumbnailUpdatedAt: storedThumbnail.thumbnailUpdatedAt
            });

            if (!synced) {
                throw new Error('缩略图远端资源同步失败');
            }
        }

        const nextRecord = {
            ...record,
            thumbnailRef: storedThumbnail.thumbnailRef,
            thumbnailUpdatedAt: storedThumbnail.thumbnailUpdatedAt
        };
        delete nextRecord.thumbnail;

        return buildMigrationResult({
            record: nextRecord,
            changed: true,
            migrated: true
        });
    } catch (error) {
        debugLog.warn('[ThumbnailMigration] Legacy inline thumbnail migration failed', {
            boardId,
            reason: options.reason || 'unknown',
            error
        });
        return buildMigrationResult({
            record,
            failed: true,
            error
        });
    }
};

export const migrateBoardsThumbnailMetadataList = async (boards = [], options = {}) => {
    const normalizedBoards = normalizeBoardMetadataList(Array.isArray(boards) ? boards : []);
    let changed = false;
    const migratedBoardIds = [];
    const failedBoardIds = [];

    const nextBoards = await Promise.all(normalizedBoards.map(async (board) => {
        if (!board?.id || !hasLegacyInlineThumbnail(board)) {
            return board;
        }

        const result = await migrateBoardThumbnailRecord(board.id, board, options);
        if (result.migrated) {
            changed = true;
            migratedBoardIds.push(board.id);
        }
        if (result.failed) {
            failedBoardIds.push(board.id);
        }

        return normalizeBoardTitleMeta(result.record || board);
    }));

    return {
        boards: nextBoards,
        changed,
        migratedBoardIds,
        failedBoardIds
    };
};

export const buildBoardThumbnailMigrationPatch = async (boardId, metadata = {}, options = {}) => {
    if (!boardId || !metadata || typeof metadata !== 'object') {
        return {};
    }

    const migrated = await migrateBoardThumbnailRecord(boardId, metadata, options);
    const nextPatch = { ...(migrated.record || metadata) };

    if (hasOwn(nextPatch, 'thumbnail') && nextPatch.thumbnail == null) {
        delete nextPatch.thumbnail;
    }

    return nextPatch;
};
