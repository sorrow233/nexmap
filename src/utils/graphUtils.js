export const getConnectedGraph = (startId, connections, visited = new Set()) => {
    const queue = [startId];

    // If startId is already visited, we might still need to explore if it was added externally
    // But for typical usage, we just process the queue.

    while (queue.length > 0) {
        const currentId = queue.shift();
        if (visited.has(currentId)) continue;

        visited.add(currentId);

        // Find neighbors
        const neighbors = connections
            .filter(c => c.from === currentId || c.to === currentId)
            .map(c => c.from === currentId ? c.to : c.from);

        for (const neighborId of neighbors) {
            if (!visited.has(neighborId)) {
                queue.push(neighborId);
            }
        }
    }

    return visited;
};
