import { CARD_GEOMETRY } from './geometry';

/**
 * Calculate standard mindmap layout for child cards.
 * Children are positioned to the right of the parent, vertically centered.
 * This is exactly how MindNode/XMind layout their nodes.
 * 
 * @param {Object} parent - Parent card {x, y}
 * @param {number} childCount - Number of children to position
 * @returns {Array} Array of {x, y} positions for each child
 */
export const calculateMindmapChildPositions = (parent, childCount) => {
    const CARD_WIDTH = CARD_GEOMETRY.standard.width;   // 320
    const CARD_HEIGHT = CARD_GEOMETRY.standard.height; // 300
    const HORIZONTAL_GAP = 130; // Gap between parent and children
    const VERTICAL_GAP = 50;    // Gap between siblings

    // All children are at the same X (to the right of parent)
    const childX = parent.x + CARD_WIDTH + HORIZONTAL_GAP;

    // Total height taken by all children
    const totalHeight = childCount * CARD_HEIGHT + (childCount - 1) * VERTICAL_GAP;

    // Start Y: center children around parent's center
    const parentCenterY = parent.y + CARD_HEIGHT / 2;
    const startY = parentCenterY - totalHeight / 2;

    // Generate positions for each child
    const positions = [];
    for (let i = 0; i < childCount; i++) {
        positions.push({
            x: childX,
            y: startY + i * (CARD_HEIGHT + VERTICAL_GAP)
        });
    }

    return positions;
};
