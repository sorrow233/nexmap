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

const getBucketKeys = (rect, bucketSize) => {
    const keys = [];
    const { minX, maxX, minY, maxY } = getBucketRange(rect, bucketSize);
    for (let x = minX; x <= maxX; x += 1) {
        for (let y = minY; y <= maxY; y += 1) {
            keys.push(getCellKey(x, y));
        }
    }
    return keys;
};

export function createEmptyCardSpatialIndex(bucketSize = DEFAULT_BUCKET_SIZE) {
    return {
        bucketSize,
        buckets: new Map(),
        cardMap: new Map(),
        rectMap: new Map(),
        invalidCardIds: new Set(),
        orderMap: new Map(),
        bucketKeysByCardId: new Map()
    };
}

const removeCardBuckets = (spatialIndex, id) => {
    const bucketKeys = spatialIndex.bucketKeysByCardId.get(id);
    if (!bucketKeys) return;

    bucketKeys.forEach((key) => {
        const bucket = spatialIndex.buckets.get(key);
        if (!bucket) return;
        bucket.delete(id);
        if (bucket.size === 0) {
            spatialIndex.buckets.delete(key);
        }
    });

    spatialIndex.bucketKeysByCardId.delete(id);
};

const removeCardFromIndex = (spatialIndex, id) => {
    removeCardBuckets(spatialIndex, id);
    spatialIndex.cardMap.delete(id);
    spatialIndex.rectMap.delete(id);
    spatialIndex.invalidCardIds.delete(id);
    spatialIndex.orderMap.delete(id);
};

const upsertCardInIndex = (spatialIndex, card, order) => {
    const previousCard = spatialIndex.cardMap.get(card.id);
    const previousRect = spatialIndex.rectMap.get(card.id);
    const previousBucketKeys = spatialIndex.bucketKeysByCardId.get(card.id) || [];
    const previousWasInvalid = spatialIndex.invalidCardIds.has(card.id);
    const previousOrder = spatialIndex.orderMap.get(card.id);

    if (card.deletedAt) {
        if (!previousCard && !previousWasInvalid) {
            return false;
        }
        removeCardFromIndex(spatialIndex, card.id);
        return true;
    }

    spatialIndex.cardMap.set(card.id, card);
    spatialIndex.orderMap.set(card.id, order);

    if (!Number.isFinite(card.x) || !Number.isFinite(card.y)) {
        removeCardBuckets(spatialIndex, card.id);
        spatialIndex.rectMap.delete(card.id);
        spatialIndex.invalidCardIds.add(card.id);
        return !previousWasInvalid || previousCard !== card;
    }

    spatialIndex.invalidCardIds.delete(card.id);

    const nextRect = getCardRect(card);
    const nextBucketKeys = getBucketKeys(nextRect, spatialIndex.bucketSize);
    const rectChanged =
        !previousRect ||
        previousRect.left !== nextRect.left ||
        previousRect.top !== nextRect.top ||
        previousRect.right !== nextRect.right ||
        previousRect.bottom !== nextRect.bottom;

    if (previousWasInvalid) {
        removeCardBuckets(spatialIndex, card.id);
    }

    if (
        previousBucketKeys.length !== nextBucketKeys.length ||
        previousBucketKeys.some((key, index) => key !== nextBucketKeys[index])
    ) {
        removeCardBuckets(spatialIndex, card.id);
        nextBucketKeys.forEach((key) => {
            let bucket = spatialIndex.buckets.get(key);
            if (!bucket) {
                bucket = new Set();
                spatialIndex.buckets.set(key, bucket);
            }
            bucket.add(card.id);
        });
        spatialIndex.bucketKeysByCardId.set(card.id, nextBucketKeys);
    }

    spatialIndex.rectMap.set(card.id, nextRect);
    return previousCard !== card || rectChanged || previousWasInvalid || previousOrder !== order;
};

export function syncCardSpatialIndex(spatialIndex, cards) {
    const index = spatialIndex || createEmptyCardSpatialIndex();
    const staleIds = new Set(index.cardMap.keys());
    let changed = false;

    cards.forEach((card, order) => {
        staleIds.delete(card.id);
        if (upsertCardInIndex(index, card, order)) {
            changed = true;
        }
    });

    staleIds.forEach((id) => {
        removeCardFromIndex(index, id);
        changed = true;
    });

    return changed;
}

export function createCardSpatialIndex(cards, bucketSize = DEFAULT_BUCKET_SIZE) {
    const spatialIndex = createEmptyCardSpatialIndex(bucketSize);
    syncCardSpatialIndex(spatialIndex, cards);
    return spatialIndex;
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

export function getCardMapByIds(spatialIndex, ids) {
    const cardMap = new Map();
    if (!spatialIndex || !ids) return cardMap;

    ids.forEach((id) => {
        const card = spatialIndex.cardMap.get(id);
        if (card) {
            cardMap.set(id, card);
        }
    });

    return cardMap;
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
