import { stripCardRuntimeBodyState } from '../services/cardClipboardService.js';
import { getCardRect } from './geometry.js';

const REPEATED_PASTE_OFFSET_PX = 24;
const PASTED_CARD_GAP_PX = 24;
const VIEWPORT_EDGE_PADDING_PX = 32;

const cloneSerializable = (value) => {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
};

const buildCompactGrid = (cards, safeScale, viewportWidth) => {
    const gap = PASTED_CARD_GAP_PX / safeScale;
    const edgePadding = VIEWPORT_EDGE_PADDING_PX / safeScale;
    const dimensions = cards.map((card) => {
        const rect = getCardRect({
            ...card,
            x: Number.isFinite(card.x) ? card.x : 0,
            y: Number.isFinite(card.y) ? card.y : 0
        });
        return { width: rect.width, height: rect.height };
    });
    const cellWidth = Math.max(...dimensions.map(({ width }) => width));
    const availableWidth = Math.max(cellWidth, (viewportWidth / safeScale) - (edgePadding * 2));
    const columnCount = Math.min(
        cards.length,
        Math.max(1, Math.floor((availableWidth + gap) / (cellWidth + gap)))
    );
    const rowCount = Math.ceil(cards.length / columnCount);
    const rowHeights = Array.from({ length: rowCount }, (_, rowIndex) => {
        const start = rowIndex * columnCount;
        return Math.max(...dimensions.slice(start, start + columnCount).map(({ height }) => height));
    });
    const groupWidth = (columnCount * cellWidth) + ((columnCount - 1) * gap);
    const groupHeight = rowHeights.reduce((total, height) => total + height, 0)
        + ((rowCount - 1) * gap);
    const rowOffsets = [];
    rowHeights.reduce((offsetY, rowHeight, rowIndex) => {
        rowOffsets[rowIndex] = offsetY;
        return offsetY + rowHeight + gap;
    }, 0);

    return {
        dimensions,
        columnCount,
        cellWidth,
        gap,
        groupWidth,
        groupHeight,
        rowOffsets
    };
};

export const buildPastedCardBatch = ({
    clipboardCards = [],
    offset = { x: 0, y: 0 },
    scale = 1,
    viewportWidth = 0,
    viewportHeight = 0,
    currentPasteSequence = 0,
    createId
} = {}) => {
    const sourceCards = (Array.isArray(clipboardCards) ? clipboardCards : [])
        .filter((card) => card?.id);
    if (sourceCards.length === 0 || typeof createId !== 'function') return [];

    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const layout = buildCompactGrid(sourceCards, safeScale, viewportWidth);
    const repeatOffset = (Math.max(0, currentPasteSequence) * REPEATED_PASTE_OFFSET_PX) / safeScale;
    const targetLeft = ((viewportWidth / 2) - (Number(offset.x) || 0)) / safeScale
        - (layout.groupWidth / 2)
        + repeatOffset;
    const targetTop = ((viewportHeight / 2) - (Number(offset.y) || 0)) / safeScale
        - (layout.groupHeight / 2)
        + repeatOffset;

    return sourceCards.map((card, index) => {
        const snapshot = cloneSerializable(stripCardRuntimeBodyState(card));
        const columnIndex = index % layout.columnCount;
        const rowIndex = Math.floor(index / layout.columnCount);
        return {
            ...snapshot,
            id: createId(),
            x: targetLeft
                + (columnIndex * (layout.cellWidth + layout.gap))
                + ((layout.cellWidth - layout.dimensions[index].width) / 2),
            y: targetTop + layout.rowOffsets[rowIndex],
            data: { ...(snapshot.data || {}) }
        };
    });
};
