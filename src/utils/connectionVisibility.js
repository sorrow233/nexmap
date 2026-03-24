const CONNECTION_VIEWPORT_MARGIN = 1200;

const expandRect = (rect, margin) => ({
    left: rect.left - margin,
    top: rect.top - margin,
    right: rect.right + margin,
    bottom: rect.bottom + margin
});

const isRectIntersect = (rectA, rectB) => (
    rectA.left < rectB.right &&
    rectA.right > rectB.left &&
    rectA.top < rectB.bottom &&
    rectA.bottom > rectB.top
);

export function createConnectionVisibilityIndex(connections = []) {
    const connectionsByCardId = new Map();
    const neighborsByCardId = new Map();

    connections.forEach((connection, index) => {
        const key = `${connection.from}-${connection.to}`;
        const entry = { key, connection, index };

        let fromConnections = connectionsByCardId.get(connection.from);
        if (!fromConnections) {
            fromConnections = [];
            connectionsByCardId.set(connection.from, fromConnections);
        }
        fromConnections.push(entry);

        let toConnections = connectionsByCardId.get(connection.to);
        if (!toConnections) {
            toConnections = [];
            connectionsByCardId.set(connection.to, toConnections);
        }
        toConnections.push(entry);

        let fromNeighbors = neighborsByCardId.get(connection.from);
        if (!fromNeighbors) {
            fromNeighbors = new Set();
            neighborsByCardId.set(connection.from, fromNeighbors);
        }
        fromNeighbors.add(connection.to);

        let toNeighbors = neighborsByCardId.get(connection.to);
        if (!toNeighbors) {
            toNeighbors = new Set();
            neighborsByCardId.set(connection.to, toNeighbors);
        }
        toNeighbors.add(connection.from);
    });

    return {
        connectionsByCardId,
        neighborsByCardId
    };
}

export function getTargetCardIdsFromIndex(connectionIndex, selectedIdSet) {
    const targets = new Set();
    if (!connectionIndex || !selectedIdSet || selectedIdSet.size === 0) {
        return targets;
    }

    selectedIdSet.forEach((id) => {
        const neighbors = connectionIndex.neighborsByCardId.get(id);
        if (!neighbors) return;
        neighbors.forEach((neighborId) => {
            if (!selectedIdSet.has(neighborId)) {
                targets.add(neighborId);
            }
        });
    });

    return targets;
}

export function getVisibleConnectionDataFromIndex(
    connectionIndex,
    visibleCardIds,
    alwaysIncludeCardIds = new Set(),
    options = {}
) {
    const visibleConnectionEntries = [];
    const connectionCardIds = new Set(alwaysIncludeCardIds);
    const viewportRect = options.viewportRect || null;
    const cardRectMap = options.cardRectMap || null;
    const expandedViewportRect = viewportRect
        ? expandRect(viewportRect, options.viewportMargin || CONNECTION_VIEWPORT_MARGIN)
        : null;

    if (!connectionIndex) {
        return { visibleConnections: [], connectionCardIds };
    }

    const isCardNearViewport = (cardId) => {
        if (!expandedViewportRect || !cardRectMap) return false;
        const rect = cardRectMap.get(cardId);
        return rect ? isRectIntersect(expandedViewportRect, rect) : false;
    };

    const shouldIncludeConnection = (connection) => {
        const { from, to } = connection;

        if (alwaysIncludeCardIds.has(from) || alwaysIncludeCardIds.has(to)) {
            return true;
        }

        const fromVisible = visibleCardIds.has(from);
        const toVisible = visibleCardIds.has(to);

        if (fromVisible && toVisible) {
            return true;
        }

        if (!fromVisible && !toVisible) {
            return false;
        }

        if (!expandedViewportRect || !cardRectMap) {
            return true;
        }

        if (fromVisible) {
            return isCardNearViewport(to);
        }

        return isCardNearViewport(from);
    };

    const seenKeys = new Set();
    const candidateCardIds = new Set(visibleCardIds);
    alwaysIncludeCardIds.forEach((id) => candidateCardIds.add(id));

    candidateCardIds.forEach((cardId) => {
        const relatedConnections = connectionIndex.connectionsByCardId.get(cardId);
        if (!relatedConnections) return;

        relatedConnections.forEach(({ key, connection, index }) => {
            if (seenKeys.has(key)) return;
            if (!shouldIncludeConnection(connection)) return;
            seenKeys.add(key);
            visibleConnectionEntries.push({ connection, index });
            connectionCardIds.add(connection.from);
            connectionCardIds.add(connection.to);
        });
    });

    visibleConnectionEntries.sort((a, b) => a.index - b.index);

    return {
        visibleConnections: visibleConnectionEntries.map((entry) => entry.connection),
        connectionCardIds
    };
}
