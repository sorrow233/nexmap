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

export function getVisibleConnectionDataFromIndex(connectionIndex, visibleCardIds, alwaysIncludeCardIds = new Set()) {
    const visibleConnectionEntries = [];
    const connectionCardIds = new Set(alwaysIncludeCardIds);

    if (!connectionIndex) {
        return { visibleConnections: [], connectionCardIds };
    }

    const seenKeys = new Set();
    const candidateCardIds = new Set(visibleCardIds);
    alwaysIncludeCardIds.forEach((id) => candidateCardIds.add(id));

    candidateCardIds.forEach((cardId) => {
        const relatedConnections = connectionIndex.connectionsByCardId.get(cardId);
        if (!relatedConnections) return;

        relatedConnections.forEach(({ key, connection, index }) => {
            if (seenKeys.has(key)) return;
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
