import { normalizeBoardDisplayMetadata } from './displayMetadata';

const BOARD_NAME_SOURCES = new Set(['manual', 'auto', 'placeholder']);

const PLACEHOLDER_TITLES = new Set([
    '',
    'untitled',
    'untitled board',
    'new board',
    '未命名画布',
    '未命名看板',
    '新建画板',
    '新しいボード',
    '새 보드'
]);

const BOARD_NUMBER_PATTERN = /^board\s+\d+$/i;

const normalizeTitleString = (value) => {
    if (typeof value !== 'string') return '';
    return value.replace(/\s+/g, ' ').trim();
};

const normalizeTimestamp = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};

const normalizeListOrder = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? Math.trunc(numeric) : Number.NaN;
};

export const isPlaceholderBoardTitle = (value) => {
    const normalized = normalizeTitleString(value).toLowerCase();
    if (!normalized) return true;
    return PLACEHOLDER_TITLES.has(normalized) || BOARD_NUMBER_PATTERN.test(normalized);
};

export const inferNameSource = (board = {}) => {
    const explicitSource = typeof board.nameSource === 'string' ? board.nameSource : '';
    const name = normalizeTitleString(board.name);
    const autoTitle = normalizeTitleString(board.autoTitle);
    const autoTitleGeneratedAt = normalizeTimestamp(board.autoTitleGeneratedAt);

    if (BOARD_NAME_SOURCES.has(explicitSource)) {
        if (explicitSource === 'auto' && !name && !autoTitle) {
            return 'placeholder';
        }
        return explicitSource;
    }

    if (autoTitleGeneratedAt > 0 || (autoTitle && name === autoTitle)) {
        return 'auto';
    }

    if (isPlaceholderBoardTitle(name)) {
        return 'placeholder';
    }

    return 'manual';
};

export const normalizeBoardTitleMeta = (board = {}) => {
    const normalizedDisplayBoard = normalizeBoardDisplayMetadata(board);
    const normalizedName = normalizeTitleString(board.name);
    const normalizedAutoTitle = normalizeTitleString(board.autoTitle);
    const autoTitleGeneratedAt = normalizeTimestamp(board.autoTitleGeneratedAt);
    const manualTitleUpdatedAt = normalizeTimestamp(board.manualTitleUpdatedAt);

    let nameSource = inferNameSource({
        ...board,
        name: normalizedName,
        autoTitle: normalizedAutoTitle,
        autoTitleGeneratedAt,
        manualTitleUpdatedAt
    });

    let name = normalizedName;
    if (nameSource === 'auto' && !name && normalizedAutoTitle) {
        name = normalizedAutoTitle;
    }
    if (nameSource === 'placeholder' && autoTitleGeneratedAt > 0 && normalizedAutoTitle && !name) {
        nameSource = 'auto';
        name = normalizedAutoTitle;
    }

    const listOrder = normalizeListOrder(board.listOrder);

    return {
        ...normalizedDisplayBoard,
        name,
        nameSource,
        autoTitle: normalizedAutoTitle,
        autoTitleGeneratedAt,
        manualTitleUpdatedAt,
        listOrder: Number.isFinite(listOrder) ? listOrder : undefined
    };
};

export const normalizeBoardMetadataList = (boards = []) => {
    if (!Array.isArray(boards)) return [];
    return boards
        .filter(Boolean)
        .map(board => normalizeBoardTitleMeta(board));
};

export const pickBoardTitleMetadata = (board = {}) => {
    const normalized = normalizeBoardTitleMeta(board);
    return {
        name: normalized.name,
        nameSource: normalized.nameSource,
        autoTitle: normalized.autoTitle,
        autoTitleGeneratedAt: normalized.autoTitleGeneratedAt,
        manualTitleUpdatedAt: normalized.manualTitleUpdatedAt
    };
};

export const hasBoardTitleMetadataPatch = (metadata = {}) => (
    Object.prototype.hasOwnProperty.call(metadata, 'name') ||
    Object.prototype.hasOwnProperty.call(metadata, 'nameSource') ||
    Object.prototype.hasOwnProperty.call(metadata, 'autoTitle') ||
    Object.prototype.hasOwnProperty.call(metadata, 'autoTitleGeneratedAt') ||
    Object.prototype.hasOwnProperty.call(metadata, 'manualTitleUpdatedAt')
);

export const getBoardDisplayName = (board, fallbackTitle = 'Untitled Board') => {
    const normalized = normalizeBoardTitleMeta(board);
    return normalized.name || fallbackTitle;
};

export const compareBoardsByGalleryOrder = (left, right) => {
    const leftListOrder = normalizeListOrder(left?.listOrder);
    const rightListOrder = normalizeListOrder(right?.listOrder);
    const leftHasListOrder = Number.isFinite(leftListOrder);
    const rightHasListOrder = Number.isFinite(rightListOrder);

    if (leftHasListOrder && rightHasListOrder && leftListOrder !== rightListOrder) {
        return leftListOrder - rightListOrder;
    }

    if (leftHasListOrder !== rightHasListOrder) {
        return leftHasListOrder ? -1 : 1;
    }

    const leftUpdatedAt = normalizeTimestamp(left?.updatedAt);
    const rightUpdatedAt = normalizeTimestamp(right?.updatedAt);
    if (rightUpdatedAt !== leftUpdatedAt) {
        return rightUpdatedAt - leftUpdatedAt;
    }

    const leftCreatedAt = normalizeTimestamp(left?.createdAt);
    const rightCreatedAt = normalizeTimestamp(right?.createdAt);
    if (rightCreatedAt !== leftCreatedAt) {
        return rightCreatedAt - leftCreatedAt;
    }

    const leftLastAccessedAt = normalizeTimestamp(left?.lastAccessedAt);
    const rightLastAccessedAt = normalizeTimestamp(right?.lastAccessedAt);
    if (rightLastAccessedAt !== leftLastAccessedAt) {
        return rightLastAccessedAt - leftLastAccessedAt;
    }

    return String(right?.id || '').localeCompare(String(left?.id || ''));
};

export const getEffectiveBoardCardCount = (cards = []) => {
    if (!Array.isArray(cards)) return 0;
    return cards.filter(card => card && !card.deletedAt).length;
};

export const shouldAutoNameBoard = (board, effectiveCardCount = 0) => {
    const normalized = normalizeBoardTitleMeta(board);
    return normalized.nameSource !== 'manual' &&
        normalized.autoTitleGeneratedAt === 0 &&
        Number(effectiveCardCount) > 5;
};

export const buildBoardTitleUpdatePatch = (board, rawTitle) => {
    const normalizedBoard = normalizeBoardTitleMeta(board);
    const nextTitle = normalizeTitleString(rawTitle);

    if (nextTitle) {
        return {
            name: nextTitle,
            nameSource: 'manual',
            manualTitleUpdatedAt: Date.now()
        };
    }

    if (normalizedBoard.autoTitle) {
        return {
            name: normalizedBoard.autoTitle,
            nameSource: 'auto'
        };
    }

    return {
        name: '',
        nameSource: 'placeholder'
    };
};
