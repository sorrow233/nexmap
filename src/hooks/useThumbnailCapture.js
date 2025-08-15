import html2canvas from 'html2canvas';
import { useCallback, useRef, useEffect } from 'react';
import { updateBoardMetadata } from '../services/storage';

/**
 * Calculate the bounding box of all cards (the area with most cards).
 * @param {Array} cards - Array of card objects with position {x, y} and size
 * @returns {Object|null} - {x, y, width, height} of the bounding box, or null if no cards
 */
function calculateCardsBoundingBox(cards) {
    if (!cards || cards.length === 0) return null;

    // Filter out cards without valid positions
    const validCards = cards.filter(c =>
        c.position &&
        typeof c.position.x === 'number' &&
        typeof c.position.y === 'number'
    );

    if (validCards.length === 0) return null;

    // Card default size (approximate)
    const CARD_WIDTH = 320;
    const CARD_HEIGHT = 200;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const card of validCards) {
        const cardWidth = card.size?.width || CARD_WIDTH;
        const cardHeight = card.size?.height || CARD_HEIGHT;

        minX = Math.min(minX, card.position.x);
        minY = Math.min(minY, card.position.y);
        maxX = Math.max(maxX, card.position.x + cardWidth);
        maxY = Math.max(maxY, card.position.y + cardHeight);
    }

    // Add padding around the bounding box
    const PADDING = 50;

    return {
        x: minX - PADDING,
        y: minY - PADDING,
        width: maxX - minX + PADDING * 2,
        height: maxY - minY + PADDING * 2,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2
    };
}

/**
 * Hook for capturing canvas thumbnails based on card density.
 * Automatically captures the card-dense area during user activity.
 */
export function useThumbnailCapture(cards, currentBoardId, hasBackgroundImage) {
    const captureTimeoutRef = useRef(null);
    const lastCaptureRef = useRef(0);
    const canvasContainerRef = useRef(null);

    // Minimum interval between captures (30 seconds)
    const MIN_CAPTURE_INTERVAL = 30000;

    /**
     * Capture the card-dense area as a thumbnail.
     */
    const captureThumbnail = useCallback(async () => {
        // Skip if:
        // 1. No canvas container
        // 2. Already has AI-generated background
        // 3. Not enough cards (need at least 1)
        // 4. Too soon after last capture
        if (!canvasContainerRef.current) {
            console.log('[Thumbnail] No canvas container ref');
            return null;
        }

        if (hasBackgroundImage) {
            console.log('[Thumbnail] Skipping - already has background image');
            return null;
        }

        if (!cards || cards.length === 0) {
            console.log('[Thumbnail] Skipping - no cards');
            return null;
        }

        const now = Date.now();
        if (now - lastCaptureRef.current < MIN_CAPTURE_INTERVAL) {
            console.log('[Thumbnail] Skipping - too soon after last capture');
            return null;
        }

        try {
            console.log('[Thumbnail] Starting capture for board:', currentBoardId);

            // Calculate bounding box of cards
            const boundingBox = calculateCardsBoundingBox(cards);
            if (!boundingBox) {
                console.log('[Thumbnail] Could not calculate bounding box');
                return null;
            }

            console.log('[Thumbnail] Bounding box:', boundingBox);

            // Find all card elements in the DOM
            const cardElements = canvasContainerRef.current.querySelectorAll('[data-card-id]');
            if (cardElements.length === 0) {
                console.log('[Thumbnail] No card DOM elements found');
                return null;
            }

            // Create a temporary container for capturing
            const tempContainer = document.createElement('div');
            tempContainer.style.cssText = `
                position: fixed;
                left: -9999px;
                top: 0;
                width: 600px;
                height: 400px;
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                overflow: hidden;
                border-radius: 16px;
            `;
            document.body.appendChild(tempContainer);

            // Clone card elements and position them
            const scale = Math.min(
                500 / boundingBox.width,
                350 / boundingBox.height,
                1
            );

            for (const cardEl of cardElements) {
                const clone = cardEl.cloneNode(true);
                const rect = cardEl.getBoundingClientRect();
                const containerRect = canvasContainerRef.current.getBoundingClientRect();

                // Calculate position relative to bounding box
                const relX = (rect.left - containerRect.left) - boundingBox.x;
                const relY = (rect.top - containerRect.top) - boundingBox.y;

                clone.style.cssText = `
                    position: absolute;
                    left: ${50 + relX * scale}px;
                    top: ${25 + relY * scale}px;
                    transform: scale(${scale});
                    transform-origin: top left;
                    pointer-events: none;
                `;

                tempContainer.appendChild(clone);
            }

            // Capture the temp container
            const canvas = await html2canvas(tempContainer, {
                scale: 0.5,
                useCORS: true,
                logging: false,
                backgroundColor: '#1e293b',
                width: 600,
                height: 400
            });

            // Cleanup temp container
            document.body.removeChild(tempContainer);

            // Convert to data URL
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

            // Check size (max 200KB for localStorage efficiency)
            if (dataUrl.length > 200000) {
                const smallerDataUrl = canvas.toDataURL('image/jpeg', 0.4);
                console.log('[Thumbnail] Compressed to:', Math.round(smallerDataUrl.length / 1024), 'KB');

                lastCaptureRef.current = now;
                return smallerDataUrl;
            }

            console.log('[Thumbnail] Captured:', Math.round(dataUrl.length / 1024), 'KB');
            lastCaptureRef.current = now;

            return dataUrl;
        } catch (error) {
            console.error('[Thumbnail] Capture failed:', error);
            return null;
        }
    }, [cards, currentBoardId, hasBackgroundImage]);

    /**
     * Trigger auto-capture with debounce.
     * This is called when cards change.
     */
    const scheduleAutoCapture = useCallback(() => {
        // Clear any pending capture
        if (captureTimeoutRef.current) {
            clearTimeout(captureTimeoutRef.current);
        }

        // Skip if already has background or not enough cards
        if (hasBackgroundImage || !cards || cards.length < 1) {
            return;
        }

        // Schedule capture after 5 seconds of inactivity
        captureTimeoutRef.current = setTimeout(async () => {
            const thumbnail = await captureThumbnail();
            if (thumbnail && currentBoardId) {
                try {
                    updateBoardMetadata(currentBoardId, { thumbnail });
                    console.log('[Thumbnail] Saved to board metadata');
                } catch (e) {
                    console.error('[Thumbnail] Failed to save:', e);
                }
            }
        }, 5000);
    }, [captureThumbnail, currentBoardId, hasBackgroundImage, cards]);

    // Auto-capture when cards change significantly
    useEffect(() => {
        // Only trigger if we have at least 1 card and no background image
        if (cards && cards.length >= 1 && !hasBackgroundImage && currentBoardId) {
            scheduleAutoCapture();
        }

        return () => {
            if (captureTimeoutRef.current) {
                clearTimeout(captureTimeoutRef.current);
            }
        };
    }, [cards?.length, currentBoardId, hasBackgroundImage]); // Trigger on card count change

    return {
        canvasContainerRef,
        captureThumbnail,
        scheduleAutoCapture
    };
}

export default useThumbnailCapture;
