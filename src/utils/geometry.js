
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
    // KEY FIX: If there is substantial horizontal separation (> 200px), 
    // we almost ALWAYS want a horizontal connection (MindMap style),
    // even if the vertical distance is larger (e.g., tall tree branches).
    const isHorizontal = Math.abs(dx) > Math.abs(dy) || Math.abs(dx) > 200;

    for (const a of anchorsA) {
        for (const b of anchorsB) {
            let dist = Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

            // Penalty system to enforce semantic flow
            // Add a massive penalty for "wrong" anchors to force the desired connection type
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
    const dy = Math.abs(source.y - target.y);

    const calculateCP = (point, distance) => {
        // Increase horizontal handle length for nicer tree curves
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

    // Adaptive control point distance
    // FIXED: Use dx primarily. Do NOT use dy, otherwise tall vertical gaps cause excessive horizontal bulging.
    // We want a nice S-curve that depends on the horizontal space available.
    // Clamp between 80px (for very close cards) and a reasonable max.
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
