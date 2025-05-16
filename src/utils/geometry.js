
export const CARD_GEOMETRY = {
    standard: { width: 320, height: 300 },
    note: { width: 280, height: 320 },
    image_gen: { width: 320, height: 580 }
};

export function getCardRect(card) {
    const geo = CARD_GEOMETRY[card.type || 'standard'] || CARD_GEOMETRY.standard;
    return {
        left: card.x,
        top: card.y,
        right: card.x + geo.width,
        bottom: card.y + geo.height,
        width: geo.width,
        height: geo.height,
        centerX: card.x + geo.width / 2,
        centerY: card.y + geo.height / 2
    };
}

export function getAnchorPoints(rect) {
    return [
        { x: rect.left + rect.width / 2, y: rect.top, type: 'top' },
        { x: rect.right, y: rect.top + rect.height / 2, type: 'right' },
        { x: rect.left + rect.width / 2, y: rect.bottom, type: 'bottom' },
        { x: rect.left, y: rect.top + rect.height / 2, type: 'left' }
    ];
}

export function getBestAnchorPair(cardA, cardB) {
    const rectA = getCardRect(cardA);
    const rectB = getCardRect(cardB);

    const anchorsA = getAnchorPoints(rectA);
    const anchorsB = getAnchorPoints(rectB);

    let minSource = anchorsA[0];
    let minTarget = anchorsB[0];
    let minDistance = Infinity;

    // Determine primary axis
    const cxA = rectA.centerX;
    const cxB = rectB.centerX;
    const cyA = rectA.centerY;
    const cyB = rectB.centerY;

    const dx = cxB - cxA;
    const dy = cyB - cyA;

    // Bias towards horizontal layout if horizontal distance is significantly larger
    // or if the cards are roughly on the same level.
    const isHorizontal = Math.abs(dx) > Math.abs(dy) || Math.abs(dx) > 200;

    for (const a of anchorsA) {
        for (const b of anchorsB) {
            let dist = Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

            // Penalty system to enforce semantic flow
            const penalty = 5000;

            if (isHorizontal) {
                // If A is Left of B, strictly prefer Right -> Left
                if (dx > 0) {
                    if (a.type !== 'right') dist += penalty;
                    if (b.type !== 'left') dist += penalty;
                }
                // If A is Right of B, strictly prefer Left -> Right
                else {
                    if (a.type !== 'left') dist += penalty;
                    if (b.type !== 'right') dist += penalty;
                }
            } else {
                // Vertical layout
                // If A is Above B, strictly prefer Bottom -> Top
                if (dy > 0) {
                    if (a.type !== 'bottom') dist += penalty;
                    if (b.type !== 'top') dist += penalty;
                }
                // If A is Below B, strictly prefer Top -> Bottom
                else {
                    if (a.type !== 'top') dist += penalty;
                    if (b.type !== 'bottom') dist += penalty;
                }
            }

            if (dist < minDistance) {
                minDistance = dist;
                minSource = a;
                minTarget = b;
            }
        }
    }

    return { source: minSource, target: minTarget };
}

export function generateBezierPath(source, target) {
    const dx = Math.abs(source.x - target.x);
    const calculateCP = (point, distance) => {
        const hFactor = 0.6; // 60% of distance
        const vFactor = 0.5;

        switch (point.type) {
            case 'top': return { x: point.x, y: point.y - distance * vFactor };
            case 'bottom': return { x: point.x, y: point.y + distance * vFactor };
            case 'left': return { x: point.x - distance * hFactor, y: point.y };
            case 'right': return { x: point.x + distance * hFactor, y: point.y };
            default: return point;
        }
    };

    const distance = Math.max(dx * 0.5, 80);
    const cp1 = calculateCP(source, distance);
    const cp2 = calculateCP(target, distance);

    return `M ${source.x} ${source.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${target.x} ${target.y}`;
}

export function isRectIntersect(rectA, rectB) {
    return (
        rectA.left < rectB.right &&
        rectA.right > rectB.left &&
        rectA.top < rectB.bottom &&
        rectA.bottom > rectB.top
    );
}

/**
 * Smart position finder for new cards to avoid overlaps and follow selection context.
 */
export function findOptimalPosition(cards, offset, scale, selectedIds) {
    const CARD_WIDTH = 320;
    const CARD_HEIGHT = 200;
    const MARGIN = 50;

    // Calculate viewport range
    const viewportLeft = -offset.x / scale;
    const viewportTop = -offset.y / scale;
    const viewportCenterX = viewportLeft + (window.innerWidth / 2) / scale;
    const viewportCenterY = viewportTop + (window.innerHeight / 2) / scale;

    // If there are selected cards, find position near them
    const selectedCards = cards.filter(c => selectedIds?.includes(c.id));

    if (selectedCards.length > 0) {
        // Strategy 1: Find space to the right of selected cards
        const rightMost = Math.max(...selectedCards.map(c => c.x));
        const avgY = selectedCards.reduce((sum, c) => sum + c.y, 0) / selectedCards.length;

        let candidateX = rightMost + CARD_WIDTH + MARGIN;
        let candidateY = avgY;

        // Check for overlap and shift down if needed
        let attempts = 0;
        while (attempts < 10) {
            const hasOverlap = cards.some(c =>
                Math.abs(c.x - candidateX) < CARD_WIDTH &&
                Math.abs(c.y - candidateY) < CARD_HEIGHT
            );

            if (!hasOverlap) {
                return { x: candidateX, y: candidateY };
            }

            candidateY += CARD_HEIGHT + MARGIN;
            attempts++;
        }
    }

    // Strategy 2: Spiral search around viewport center
    const gridSize = CARD_WIDTH + MARGIN;
    const searchRadius = 3;

    for (let ring = 0; ring < searchRadius; ring++) {
        for (let angle = 0; angle < 360; angle += 45) {
            const rad = (angle * Math.PI) / 180;
            const testX = viewportCenterX + Math.cos(rad) * ring * gridSize;
            const testY = viewportCenterY + Math.sin(rad) * ring * gridSize;

            const hasOverlap = cards.some(c =>
                Math.abs(c.x - testX) < CARD_WIDTH &&
                Math.abs(c.y - testY) < CARD_HEIGHT
            );

            if (!hasOverlap) {
                return { x: testX - CARD_WIDTH / 2, y: testY - CARD_HEIGHT / 2 };
            }
        }
    }

    // Strategy 3: Fallback to random offset near center
    return {
        x: viewportCenterX - CARD_WIDTH / 2 + (Math.random() * 100 - 50),
        y: viewportCenterY - CARD_HEIGHT / 2 + (Math.random() * 100 - 50)
    };
}
