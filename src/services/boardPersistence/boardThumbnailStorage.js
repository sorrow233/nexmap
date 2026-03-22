import { idbGet, idbSet } from '../db/indexedDB';

const BOARD_THUMBNAIL_PREFIX = 'mixboard_board_thumbnail_';

const thumbnailDataCache = new Map();
const thumbnailLoadCache = new Map();

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

const normalizeLooseString = (value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') {
        return String(value);
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};

const normalizeThumbnailUpdatedAt = (value, fallback = 0) => {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
        return numeric;
    }
    return fallback > 0 ? fallback : Date.now();
};

const hashString = (input = '') => {
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
};

const buildBoardThumbnailStorageKey = (thumbnailRef = '') => (
    `${BOARD_THUMBNAIL_PREFIX}${thumbnailRef}`
);

export const buildBoardThumbnailRef = (boardId, thumbnailData = '') => (
    `${boardId}:${hashString(thumbnailData)}:${thumbnailData.length}`
);

export const persistBoardThumbnailResource = async (boardId, thumbnailData, options = {}) => {
    const normalizedThumbnailData = normalizeLooseString(thumbnailData);
    if (!boardId || !normalizedThumbnailData) return null;

    const thumbnailUpdatedAt = normalizeThumbnailUpdatedAt(
        options.thumbnailUpdatedAt ?? options.updatedAt,
        Date.now()
    );
    const thumbnailRef = normalizeLooseString(options.thumbnailRef)
        || buildBoardThumbnailRef(boardId, normalizedThumbnailData);
    const storageKey = buildBoardThumbnailStorageKey(thumbnailRef);

    const existingRecord = await idbGet(storageKey).catch(() => null);
    if (existingRecord?.dataUrl === normalizedThumbnailData) {
        thumbnailDataCache.set(thumbnailRef, normalizedThumbnailData);
        return {
            thumbnailRef,
            thumbnailUpdatedAt: normalizeThumbnailUpdatedAt(existingRecord.updatedAt, thumbnailUpdatedAt)
        };
    }

    await idbSet(storageKey, {
        boardId,
        thumbnailRef,
        dataUrl: normalizedThumbnailData,
        updatedAt: thumbnailUpdatedAt,
        savedAt: Date.now()
    });

    thumbnailDataCache.set(thumbnailRef, normalizedThumbnailData);

    return {
        thumbnailRef,
        thumbnailUpdatedAt
    };
};

export const loadBoardThumbnailResource = async (thumbnailRef) => {
    const normalizedThumbnailRef = normalizeLooseString(thumbnailRef);
    if (!normalizedThumbnailRef) return '';

    if (thumbnailDataCache.has(normalizedThumbnailRef)) {
        return thumbnailDataCache.get(normalizedThumbnailRef) || '';
    }

    if (thumbnailLoadCache.has(normalizedThumbnailRef)) {
        return thumbnailLoadCache.get(normalizedThumbnailRef);
    }

    const loadPromise = idbGet(buildBoardThumbnailStorageKey(normalizedThumbnailRef))
        .then((record) => {
            const dataUrl = normalizeLooseString(record?.dataUrl) || '';
            if (dataUrl) {
                thumbnailDataCache.set(normalizedThumbnailRef, dataUrl);
            }
            return dataUrl;
        })
        .catch(() => '')
        .finally(() => {
            thumbnailLoadCache.delete(normalizedThumbnailRef);
        });

    thumbnailLoadCache.set(normalizedThumbnailRef, loadPromise);
    return loadPromise;
};

export const prepareBoardThumbnailMetadataPatch = async (boardId, metadata = {}) => {
    if (!boardId || !metadata || typeof metadata !== 'object') {
        return {};
    }

    const patch = {};
    const hasThumbnailRefField = hasOwn(metadata, 'thumbnailRef');
    const hasLegacyThumbnailField = hasOwn(metadata, 'thumbnail');
    const hasThumbnailUpdatedAtField = hasOwn(metadata, 'thumbnailUpdatedAt');
    const normalizedThumbnailRef = normalizeLooseString(metadata.thumbnailRef);
    const normalizedLegacyThumbnail = normalizeLooseString(metadata.thumbnail);
    const thumbnailUpdatedAt = normalizeThumbnailUpdatedAt(
        metadata.thumbnailUpdatedAt ?? metadata.updatedAt,
        Date.now()
    );

    if (normalizedThumbnailRef) {
        patch.thumbnailRef = normalizedThumbnailRef;
        if (hasThumbnailUpdatedAtField) {
            patch.thumbnailUpdatedAt = thumbnailUpdatedAt;
        }
        if (hasLegacyThumbnailField) {
            patch.thumbnail = null;
        }
        return patch;
    }

    if (normalizedLegacyThumbnail) {
        const storedThumbnail = await persistBoardThumbnailResource(boardId, normalizedLegacyThumbnail, {
            thumbnailUpdatedAt
        });

        if (!storedThumbnail) {
            return {};
        }

        return {
            thumbnailRef: storedThumbnail.thumbnailRef,
            thumbnailUpdatedAt: storedThumbnail.thumbnailUpdatedAt,
            thumbnail: null
        };
    }

    if (hasThumbnailRefField) {
        patch.thumbnailRef = null;
    }
    if (hasThumbnailUpdatedAtField) {
        patch.thumbnailUpdatedAt = thumbnailUpdatedAt;
    }
    if (hasLegacyThumbnailField) {
        patch.thumbnail = metadata.thumbnail ?? null;
    }

    return patch;
};
