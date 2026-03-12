import { getCardRect, isRectIntersect } from './geometry';

const DEFAULT_BUCKET_SIZE = 480;
const DEFAULT_VIEWPORT_MARGIN = 400;

const getCellKey = (x, y) => `${x}:${y}`;

const getBucketRange = (rect, bucketSize) => ({
    minX: Math.floor(rect.left / bucketSize),
    maxX: Math.floor(rect.right / bucketSize),
    minY: Math.floor(rect.top / bucketSize),
    maxY: Math.floor(rect.bottom / bucketSize)
});

export function buildViewportRect(offset, scale, margin = DEFAULT_VIEWPORT_MARGIN) {
    return {
        left: (0 - offset.x) / scale - margin,
        top: (0 - offset.y) / scale - margin,
        right: (window.innerWidth - offset.x) / scale + margin,
        bottom: (window.innerHeight - offset.y) / scale + margin
    };
}

export function createCardSpatialIndex(cards, bucketSize = DEFAULT_BUCKET_SIZE) {
    const buckets = new Map();
    const cardMap = new Map();
    const rectMap = new Map();
    const invalidCardIds = new Set();
    const orderMap = new Map();

    cards.forEach((card, index) => {
        if (card.deletedAt) return;

        cardMap.set(card.id, card);
        orderMap.set(card.id, index);

        if (!Number.isFinite(card.x) || !Number.isFinite(card.y)) {
            invalidCardIds.add(card.id);
            return;
        }

        const rect = getCardRect(card);
        rectMap.set(card.id, rect);

        const { minX, maxX, minY, maxY } = getBucketRange(rect, bucketSize);
        for (let x = minX; x <= maxX; x += 1) {
            for (let y = minY; y <= maxY; y += 1) {
                const key = getCellKey(x, y);
                let ids = buckets.get(key);
                if (!ids) {
                    ids = new Set();
                    buckets.set(key, ids);
                }
                ids.add(card.id);
            }
        }
    });

    return {
        bucketSize,
        buckets,
        cardMap,
        rectMap,
        invalidCardIds,
        orderMap
    };
}

export function queryCardIdsInRect(spatialIndex, rect) {
    if (!spatialIndex) return new Set();

    const result = new Set(spatialIndex.invalidCardIds);
    const { bucketSize, buckets } = spatialIndex;
    const { minX, maxX, minY, maxY } = getBucketRange(rect, bucketSize);

    for (let x = minX; x <= maxX; x += 1) {
        for (let y = minY; y <= maxY; y += 1) {
            const bucket = buckets.get(getCellKey(x, y));
            if (!bucket) continue;
            bucket.forEach((id) => result.add(id));
        }
    }

    return result;
}

export function getCardsInRect(spatialIndex, rect, persistentIds = new Set()) {
    if (!spatialIndex) return [];

    const candidateIds = queryCardIdsInRect(spatialIndex, rect);
    persistentIds.forEach((id) => candidateIds.add(id));

    const cards = [];
    candidateIds.forEach((id) => {
        const card = spatialIndex.cardMap.get(id);
        if (!card) return;

        const cardRect = spatialIndex.rectMap.get(id);
        if (persistentIds.has(id) || !cardRect || isRectIntersect(rect, cardRect)) {
            cards.push(card);
        }
    });

    return cards.sort((a, b) => {
        const orderA = spatialIndex.orderMap.get(a.id) ?? 0;
        const orderB = spatialIndex.orderMap.get(b.id) ?? 0;
        return orderA - orderB;
    });
}

export function getCardsByIds(spatialIndex, ids) {
    if (!spatialIndex || !ids) return [];

    const cards = [];
    ids.forEach((id) => {
        const card = spatialIndex.cardMap.get(id);
        if (card) cards.push(card);
    });

    return cards.sort((a, b) => {
        const orderA = spatialIndex.orderMap.get(a.id) ?? 0;
        const orderB = spatialIndex.orderMap.get(b.id) ?? 0;
        return orderA - orderB;
    });
}

export function getIntersectedCardIds(spatialIndex, rect) {
    if (!spatialIndex) return [];

    const candidateIds = queryCardIdsInRect(spatialIndex, rect);
    const intersectedIds = [];

    candidateIds.forEach((id) => {
        const cardRect = spatialIndex.rectMap.get(id);
        if (!cardRect || isRectIntersect(rect, cardRect)) {
            intersectedIds.push(id);
        }
    });

    return intersectedIds.sort((idA, idB) => {
        const orderA = spatialIndex.orderMap.get(idA) ?? 0;
        const orderB = spatialIndex.orderMap.get(idB) ?? 0;
        return orderA - orderB;
    });
}

export function getVisibleConnectionData(connections, visibleCardIds, alwaysIncludeCardIds = new Set()) {
    const visibleConnections = [];
    const connectionCardIds = new Set(alwaysIncludeCardIds);

    connections.forEach((conn) => {
        const isVisible =
            visibleCardIds.has(conn.from) ||
            visibleCardIds.has(conn.to) ||
            alwaysIncludeCardIds.has(conn.from) ||
            alwaysIncludeCardIds.has(conn.to);

        if (!isVisible) return;

        visibleConnections.push(conn);
        connectionCardIds.add(conn.from);
        connectionCardIds.add(conn.to);
    });

    return { visibleConnections, connectionCardIds };
}
