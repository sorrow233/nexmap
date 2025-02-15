
export const CARD_GEOMETRY = {
    standard: { width: 320, height: 240 },
    note: { width: 280, height: 320 },
    image_gen: { width: 320, height: 400 }
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

    for (const a of anchorsA) {
        for (const b of anchorsB) {
            const dist = Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
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

    // Curvature heuristic: 
    // If predominantly horizontal, horizontal pull.
    // If predominantly vertical, vertical pull.
    // But better: use the anchor type!

    const calculateCP = (point, distance) => {
        switch (point.type) {
            case 'top': return { x: point.x, y: point.y - distance };
            case 'bottom': return { x: point.x, y: point.y + distance };
            case 'left': return { x: point.x - distance, y: point.y };
            case 'right': return { x: point.x + distance, y: point.y };
            default: return point;
        }
    };

    // Distance for CPs: adaptive but capped to avoid extreme loops
    const distance = Math.min(Math.max(dx / 2, dy / 2, 80), 120);

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
