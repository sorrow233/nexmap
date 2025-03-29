export const getConnectedGraph = (startId, connections, visited = new Set()) => {
    if (visited.has(startId)) return visited;
    visited.add(startId);
    const neighbors = connections
        .filter(c => c.from === startId || c.to === startId)
        .map(c => c.from === startId ? c.to : c.from);
    neighbors.forEach(nid => getConnectedGraph(nid, connections, visited));
    return visited;
};
