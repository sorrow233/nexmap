
/**
 * Routing utility for obstacle-avoiding connections.
 * Implements A* search on a non-uniform grid.
 */

function isRectIntersect(rectA, rectB) {
    return (
        rectA.left < rectB.right &&
        rectA.right > rectB.left &&
        rectA.top < rectB.bottom &&
        rectA.bottom > rectB.top
    );
}

export function findSmartPath(source, target, obstacles, padding = 40) {
    // 0. Filter relevant obstacles for performance
    const bounds = {
        left: Math.min(source.x, target.x) - padding,
        right: Math.max(source.x, target.x) + padding,
        top: Math.min(source.y, target.y) - padding,
        bottom: Math.max(source.y, target.y) + padding
    };

    const relevantObstacles = obstacles.filter(o => isRectIntersect(bounds, o));

    // 1. Prepare Obstacles (padded rectangles)
    const paddedObstacles = relevantObstacles.map(rect => ({
        left: rect.left - padding,
        right: rect.right + padding,
        top: rect.top - padding,
        bottom: rect.bottom + padding,
        original: rect
    }));

    // 2. Collect Grid Lines (X and Y coordinates)
    const xCoords = new Set([source.x, target.x]);
    const yCoords = new Set([source.y, target.y]);

    paddedObstacles.forEach(rect => {
        xCoords.add(rect.left);
        xCoords.add(rect.right);
        xCoords.add(rect.original.left);
        xCoords.add(rect.original.right);
        xCoords.add((rect.left + rect.right) / 2); // Center line can be useful

        yCoords.add(rect.top);
        yCoords.add(rect.bottom);
        yCoords.add(rect.original.top);
        yCoords.add(rect.original.bottom);
        yCoords.add((rect.top + rect.bottom) / 2);
    });

    const sortedX = Array.from(xCoords).sort((a, b) => a - b);
    const sortedY = Array.from(yCoords).sort((a, b) => a - b);

    // 3. A* Search
    const startNode = { x: source.x, y: source.y };
    const endNode = { x: target.x, y: target.y };

    const nodeKey = (x, y) => `${Math.round(x)},${Math.round(y)}`;
    const endKey = nodeKey(endNode.x, endNode.y);

    const openSet = [startNode];
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const startKey = nodeKey(startNode.x, startNode.y);
    gScore.set(startKey, 0);
    fScore.set(startKey, heuristic(startNode, endNode));

    let iterations = 0;
    while (openSet.length > 0 && iterations < 1000) {
        iterations++;
        // Find node with lowest fScore
        let current = openSet[0];
        let lowestF = fScore.get(nodeKey(current.x, current.y));
        let currentIndex = 0;

        for (let i = 1; i < openSet.length; i++) {
            const f = fScore.get(nodeKey(openSet[i].x, openSet[i].y));
            if (f < lowestF) {
                lowestF = f;
                current = openSet[i];
                currentIndex = i;
            }
        }

        if (nodeKey(current.x, current.y) === endKey) {
            return reconstructPath(cameFrom, current);
        }

        openSet.splice(currentIndex, 1);
        const currentKey = nodeKey(current.x, current.y);

        // Neighbors: Up, Down, Left, Right in the grid
        const xi = sortedX.indexOf(current.x);
        const yi = sortedY.indexOf(current.y);

        const neighbors = [];
        if (xi > 0) neighbors.push({ x: sortedX[xi - 1], y: current.y });
        if (xi < sortedX.length - 1) neighbors.push({ x: sortedX[xi + 1], y: current.y });
        if (yi > 0) neighbors.push({ x: current.x, y: sortedY[yi - 1] });
        if (yi < sortedY.length - 1) neighbors.push({ x: current.x, y: sortedY[yi + 1] });

        for (const neighbor of neighbors) {
            // Check if segment intersects any ORIGINAL obstacle
            if (isSegmentBlocked(current, neighbor, relevantObstacles)) continue;

            const tentativeGScore = gScore.get(currentKey) + distance(current, neighbor);
            const neighborKey = nodeKey(neighbor.x, neighbor.y);

            if (tentativeGScore < (gScore.get(neighborKey) ?? Infinity)) {
                cameFrom.set(neighborKey, current);
                gScore.set(neighborKey, tentativeGScore);
                fScore.set(neighborKey, tentativeGScore + heuristic(neighbor, endNode));

                if (!openSet.find(n => nodeKey(n.x, n.y) === neighborKey)) {
                    openSet.push(neighbor);
                }
            }
        }
    }

    // Fallback if no path found (shouldn't happen with enough grid lines, but just in case)
    return [source, target];
}

function heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); // Manhattan distance
}

function distance(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function isSegmentBlocked(p1, p2, obstacles) {
    // Check if segment (p1, p2) intersects any obstacle rectangle (slightly shrunk to allow close lines)
    const margin = 2;
    for (const rect of obstacles) {
        // If segment is within the rectangle's bounds (with small margin)
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);

        // Simple AABB vs Segment check (standard for orthogonal grids)
        if (p1.x === p2.x) { // Vertical segment
            if (p1.x > rect.left + margin && p1.x < rect.right - margin) {
                if (!(maxY <= rect.top + margin || minY >= rect.bottom - margin)) return true;
            }
        } else { // Horizontal segment
            if (p1.y > rect.top + margin && p1.y < rect.bottom - margin) {
                if (!(maxX <= rect.left + margin || minX >= rect.right - margin)) return true;
            }
        }
    }
    return false;
}

function reconstructPath(cameFrom, current) {
    const totalPath = [current];
    let key = `${Math.round(current.x)},${Math.round(current.y)}`;
    while (cameFrom.has(key)) {
        current = cameFrom.get(key);
        key = `${Math.round(current.x)},${Math.round(current.y)}`;
        totalPath.unshift(current);
    }

    // Simplify path: remove redundant collinear points
    if (totalPath.length <= 2) return totalPath;

    const simplified = [totalPath[0]];
    for (let i = 1; i < totalPath.length - 1; i++) {
        const p1 = totalPath[i - 1];
        const p2 = totalPath[i];
        const p3 = totalPath[i + 1];

        // If p1, p2, p3 are not collinear
        if (!((p1.x === p2.x && p2.x === p3.x) || (p1.y === p2.y && p2.y === p3.y))) {
            simplified.push(p2);
        }
    }
    simplified.push(totalPath[totalPath.length - 1]);

    return simplified;
}

/**
 * Converts a series of points into an SVG path string with rounded corners.
 */
export function generateRoundedPath(points, radius = 12) {
    if (points.length < 2) return "";
    if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length - 1; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const next = points[i + 1];

        // Vector directions
        const d1 = { x: curr.x - prev.x, y: curr.y - prev.y };
        const d2 = { x: next.x - curr.x, y: next.y - curr.y };

        const len1 = Math.sqrt(d1.x * d1.x + d1.y * d1.y);
        const len2 = Math.sqrt(d2.x * d2.x + d2.y * d2.y);

        const r = Math.min(radius, len1 / 2, len2 / 2);

        // Find points on lines for the curve
        const p1 = {
            x: curr.x - (d1.x / len1) * r,
            y: curr.y - (d1.y / len1) * r
        };
        const p2 = {
            x: curr.x + (d2.x / len2) * r,
            y: curr.y + (d2.y / len2) * r
        };

        path += ` L ${p1.x} ${p1.y} Q ${curr.x} ${curr.y}, ${p2.x} ${p2.y}`;
    }

    path += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
    return path;
}
