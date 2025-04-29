/**
 * Calculates a MindNode-style Left-to-Right tree layout.
 * 
 * @param {Array} cards - Array of card objects {id, x, y, width, height, ...}
 * @param {Array} connections - Array of connection objects {from, to}
 * @returns {Map} Map of cardId -> {x, y}
 */
export function calculateLayout(cards, connections) {
    if (!cards || cards.length === 0) return new Map();

    // Constants
    const CARD_WIDTH = 320;
    const CARD_HEIGHT = 300; // Increased to match actual rendered height (approx 280px) + safety
    const HORIZONTAL_GAP = 300; // Gap between columns (parents and children)
    const VERTICAL_GAP = 60;    // Gap between siblings

    const cardMap = new Map(cards.map(c => [c.id, c]));
    const positions = new Map();

    // 1. Build Adjacency List (Directed) and Reverse List (for finding roots)
    const adj = new Map();
    const reverseAdj = new Map();

    cards.forEach(c => {
        adj.set(c.id, []);
        reverseAdj.set(c.id, []);
    });

    connections.forEach(conn => {
        if (cardMap.has(conn.from) && cardMap.has(conn.to)) {
            adj.get(conn.from).push(conn.to);
            reverseAdj.get(conn.to).push(conn.from);
        }
    });

    // 2. Identify Roots
    // A root is a node with in-degree 0.
    // If a cycle exists, we might need to arbitrarily pick a start (simplistic approach for now).
    // Better approach for cycles: standard graph cycle breaking, but for now let's stick to simple in-degree check.
    const roots = [];
    const visited = new Set();
    const processed = new Set(); // For layout calculation

    cards.forEach(c => {
        if (reverseAdj.get(c.id).length === 0) {
            roots.push(c.id);
        }
    });

    // If no roots found but cards exist (full cycle), pick the first one as root.
    if (roots.length === 0 && cards.length > 0) {
        roots.push(cards[0].id);
    }

    // Sort roots by their current Y position to maintain some relative user intent
    roots.sort((a, b) => cardMap.get(a).y - cardMap.get(b).y);

    // 3. Layout Recursive Function
    // We need to calculate the "height" of each subtree to know where to place siblings.

    // Memoization for subtree heights
    const subtreeHeights = new Map();

    const getSubtreeHeight = (nodeId, currentVisited) => {
        if (subtreeHeights.has(nodeId)) return subtreeHeights.get(nodeId);

        // Cycle detection in height calc
        if (currentVisited.has(nodeId)) return CARD_HEIGHT + VERTICAL_GAP;
        const newVisited = new Set(currentVisited).add(nodeId);

        const children = adj.get(nodeId) || [];

        if (children.length === 0) {
            subtreeHeights.set(nodeId, CARD_HEIGHT + VERTICAL_GAP);
            return CARD_HEIGHT + VERTICAL_GAP;
        }

        let totalHeight = 0;
        children.forEach(childId => {
            totalHeight += getSubtreeHeight(childId, newVisited);
        });

        subtreeHeights.set(nodeId, totalHeight);
        return totalHeight;
    };

    // Calculate initial heights
    roots.forEach(rootId => getSubtreeHeight(rootId, new Set()));

    let currentRootY = 0; // Starting Y position for the first forest tree

    // Recursive layout assignment
    const layoutNode = (nodeId, x, y, currentVisited) => {
        if (processed.has(nodeId)) return; // Already placed (e.g. multi-parent DAG, simplifying to tree for now)
        // Note: Handling DAGs properly in tree layout is hard. We treat second occurrence as a leaf or just ignore re-layout.
        // For MindNode feel, we generally want tree structure. If A->B and C->B, B moves to whichever parent is "primary" or first processed.

        processed.add(nodeId);
        positions.set(nodeId, { x, y });

        // Cycle detection during placement
        if (currentVisited.has(nodeId)) return;
        const newVisited = new Set(currentVisited).add(nodeId);

        const children = adj.get(nodeId);
        if (!children || children.length === 0) return;

        // Place children stacked vertically, centered relative to parent's subtree center?
        // Actually, MindNode usually centers the parent relative to children.
        // Let's calculate total children height.

        let childrenTotalHeight = 0;
        children.forEach(childId => {
            // We use the pre-calculated subtree heights (treating them as if they are fresh trees)
            childrenTotalHeight += subtreeHeights.get(childId);
        });

        // Starting Y for the first child
        // Center the children block relative to parent Y center
        // Parent Center Y = y + CARD_HEIGHT/2
        // Children Block Center Y = startChildY + childrenTotalHeight/2
        // So: startChildY = (y + CARD_HEIGHT/2) - childrenTotalHeight/2

        // BUT, we also want to avoid overlapping with previous root trees.
        // Simple approach: Flow top-down. Parent is centered relative to its OWN children.

        let currentChildY = y - (childrenTotalHeight / 2) + (CARD_HEIGHT / 2);

        const nextX = x + CARD_WIDTH + HORIZONTAL_GAP;

        children.forEach(childId => {
            const childHeight = subtreeHeights.get(childId);
            // Center the child within its allocated vertical slot
            // The slot starts at currentChildY and is childHeight tall.
            // Child centerY should be currentChildY + childHeight/2
            // Child topY should be (currentChildY + childHeight/2) - CARD_HEIGHT/2

            const childY = currentChildY + (childHeight / 2) - (CARD_HEIGHT / 2);

            layoutNode(childId, nextX, childY, newVisited);

            currentChildY += childHeight;
        });
    };

    // Layout each root
    // We place roots vertically stacked.
    let globalOffsetY = 0; // To stack separate forests

    // Calculate initial bounding box of existing selection to try to keep it roughly in place?
    // Or just start at 0,0 and let user pan. 0,0 is safer.

    roots.forEach(rootId => {
        const height = subtreeHeights.get(rootId);
        // Center root in its slot
        const rootY = globalOffsetY + (height / 2) - (CARD_HEIGHT / 2);

        layoutNode(rootId, 0, rootY, new Set());

        globalOffsetY += height + VERTICAL_GAP; // Add gap between forests
    });

    // Handle any unvisited nodes (islands that were part of cycles or disconnected components not found by root search?)
    // Our root search should find all components unless they are pure cycles.
    // For pure cycles, we haven't handled them yet in the roots list logic fully.

    // Check for remaining unvisited nodes
    const remaining = cards.filter(c => !processed.has(c.id));
    if (remaining.length > 0) {
        // Just stack them to the side or bottom
        let extraY = globalOffsetY + VERTICAL_GAP;
        remaining.forEach(c => {
            positions.set(c.id, { x: 0, y: extraY });
            extraY += CARD_HEIGHT + VERTICAL_GAP;
        });
    }

    // Normalize positions to user's current view center? 
    // Usually calculating relative to 0,0 is fine, store handles viewport.
    // However, it might jump far away. Ideally we find the centroid of the original cards and offset the new layout to match.

    if (cards.length > 0) {
        let oldCenterX = 0, oldCenterY = 0;
        let newCenterX = 0, newCenterY = 0;

        cards.forEach(c => {
            oldCenterX += c.x;
            oldCenterY += c.y;
        });
        oldCenterX /= cards.length;
        oldCenterY /= cards.length;

        let count = 0;
        positions.forEach(pos => {
            newCenterX += pos.x;
            newCenterY += pos.y;
            count++;
        });
        if (count > 0) {
            newCenterX /= count;
            newCenterY /= count;

            const dx = oldCenterX - newCenterX;
            const dy = oldCenterY - newCenterY;

            // shift all
            for (const [id, pos] of positions) {
                pos.x += dx;
                pos.y += dy;
            }
        }
    }

    return positions;
}

/**
 * Calculates a Grid layout for selected cards.
 * 
 * @param {Array} cards - Array of selected card objects {id, x, y, width, height, ...}
 * @param {number} startX - Top-left X coordinate for the grid
 * @param {number} startY - Top-left Y coordinate for the grid
 * @returns {Map} Map of cardId -> {x, y}
 */
export function calculateGridLayout(cards, startX, startY) {
    if (!cards || cards.length === 0) return new Map();

    const CARD_WIDTH = 320;
    const CARD_HEIGHT = 300;
    const GAP = 40; // Spacing between cards

    const positions = new Map();

    // Determine grid dimensions
    // For a nice square-ish grid, we want columns ~= sqrt(N)
    const count = cards.length;
    const columns = Math.ceil(Math.sqrt(count));

    // Sort cards by their original visual order (Top-Left to Bottom-Right)
    // This makes the transition feel more natural than ID-based sorting
    const sortedCards = [...cards].sort((a, b) => {
        // Rough row banding for sorting: prioritize Y, then X
        // Allow for some "slop" in Y so cards on roughly the same line are treated as same row
        const rowHeight = 100;
        const rowA = Math.round(a.y / rowHeight);
        const rowB = Math.round(b.y / rowHeight);

        if (rowA !== rowB) return rowA - rowB;
        return a.x - b.x;
    });

    sortedCards.forEach((card, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);

        const x = startX + (col * (CARD_WIDTH + GAP));
        const y = startY + (row * (CARD_HEIGHT + GAP));

        positions.set(card.id, { x, y });
    });

    return positions;
}
