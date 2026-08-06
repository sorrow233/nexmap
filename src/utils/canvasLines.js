const DEFAULT_LINE_COLOR = '#64748b';
const DEFAULT_LINE_WIDTH = 2;

const toFiniteNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

export const normalizeCanvasLine = (line = {}) => ({
    id: typeof line.id === 'string' ? line.id : '',
    x1: toFiniteNumber(line.x1),
    y1: toFiniteNumber(line.y1),
    x2: toFiniteNumber(line.x2),
    y2: toFiniteNumber(line.y2),
    color: typeof line.color === 'string' && line.color.trim()
        ? line.color.trim()
        : DEFAULT_LINE_COLOR,
    width: Math.min(8, Math.max(1, toFiniteNumber(line.width, DEFAULT_LINE_WIDTH)))
});

export const normalizeCanvasLines = (lines = []) => (
    Array.isArray(lines)
        ? lines
            .map((line) => normalizeCanvasLine(line))
            .filter((line) => line.id)
        : []
);

export const getCanvasLineLength = (line = {}) => Math.hypot(
    toFiniteNumber(line.x2) - toFiniteNumber(line.x1),
    toFiniteNumber(line.y2) - toFiniteNumber(line.y1)
);

export const snapCanvasLineEnd = (start, end, shouldSnap = false) => {
    if (!shouldSnap) return end;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return end;

    const snapStep = Math.PI / 4;
    const snappedAngle = Math.round(Math.atan2(dy, dx) / snapStep) * snapStep;
    return {
        x: start.x + Math.cos(snappedAngle) * length,
        y: start.y + Math.sin(snappedAngle) * length
    };
};

export const createCanvasLineDraft = (start, end = start, options = {}) => normalizeCanvasLine({
    id: options.id || '',
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
    color: options.color,
    width: options.width
});
