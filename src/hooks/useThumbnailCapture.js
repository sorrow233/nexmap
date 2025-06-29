import html2canvas from 'html2canvas';
import { useCallback, useRef, useEffect } from 'react';
import { updateBoardMetadata } from '../services/storage';

/**
 * Calculate the center point and viewport for focusing on card-dense area.
 * @param {Array} cards - Array of card objects
 * @returns {Object|null} - {centerX, centerY, scale} or null
 */
function calculateCardsCenterView(cards) {
    if (!cards || cards.length === 0) return null;

    // Filter valid cards
    const validCards = cards.filter(c =>
        c.position &&
        typeof c.position.x === 'number' &&
        typeof c.position.y === 'number'
    );

    if (validCards.length === 0) return null;

    // Card default size
    const CARD_WIDTH = 320;
    const CARD_HEIGHT = 280;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const card of validCards) {
        minX = Math.min(minX, card.position.x);
        minY = Math.min(minY, card.position.y);
        maxX = Math.max(maxX, card.position.x + CARD_WIDTH);
        maxY = Math.max(maxY, card.position.y + CARD_HEIGHT);
    }

    return {
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        boundingWidth: maxX - minX,
        boundingHeight: maxY - minY,
        minX, minY, maxX, maxY
    };
}

/**
 * Hook for capturing canvas thumbnails.
 * Uses direct html2canvas capture of the canvas container.
 */
export function useThumbnailCapture(cards, currentBoardId, hasBackgroundImage) {
    const captureTimeoutRef = useRef(null);
    const lastCaptureRef = useRef(0);
    const canvasContainerRef = useRef(null);

    // Minimum 60 seconds between captures
    const MIN_CAPTURE_INTERVAL = 60000;

    /**
     * Capture the canvas container directly.
     */
    const captureThumbnail = useCallback(async () => {
        // Skip conditions
        if (!canvasContainerRef.current) {
            console.log('[Thumbnail] No canvas container ref');
            return null;
        }

        if (hasBackgroundImage) {
            console.log('[Thumbnail] Skipping - board has background image');
            return null;
        }

        if (!cards || cards.length === 0) {
            console.log('[Thumbnail] Skipping - no cards');
            return null;
        }

        const now = Date.now();
        if (now - lastCaptureRef.current < MIN_CAPTURE_INTERVAL) {
            console.log('[Thumbnail] Skipping - cooldown');
            return null;
        }

        try {
            console.log('[Thumbnail] Starting capture...');

            // Calculate card center view
            const centerView = calculateCardsCenterView(cards);
            if (!centerView) {
                console.log('[Thumbnail] Could not calculate center view');
                return null;
            }

            console.log('[Thumbnail] Center view:', centerView);

            // Get the canvas internal content (cards layer)
            const canvasEl = canvasContainerRef.current;

            // Capture options - focus on the visible area
            const canvas = await html2canvas(canvasEl, {
                scale: 0.25, // Very low res for thumbnail
                useCORS: true,
                logging: false,
                backgroundColor: '#1e293b', // Dark slate background
                width: Math.min(canvasEl.offsetWidth, 1600),
                height: Math.min(canvasEl.offsetHeight, 1000),
                // Ignore certain elements
                ignoreElements: (el) => {
                    // Skip modals, tooltips, fixed UI elements
                    const classes = el.className || '';
                    if (typeof classes === 'string') {
                        if (classes.includes('fixed') ||
                            classes.includes('modal') ||
                            classes.includes('tooltip') ||
                            classes.includes('z-50') ||
                            classes.includes('z-[200]')) {
                            return true;
                        }
                    }
                    return false;
                }
            });

            // Convert to JPEG data URL
            const dataUrl = canvas.toDataURL('image/jpeg', 0.5);

            // Check size
            const sizeKB = Math.round(dataUrl.length / 1024);
            console.log('[Thumbnail] Captured:', sizeKB, 'KB');

            if (sizeKB > 300) {
                // Too large, use lower quality
                const smallerUrl = canvas.toDataURL('image/jpeg', 0.2);
                console.log('[Thumbnail] Compressed to:', Math.round(smallerUrl.length / 1024), 'KB');
                lastCaptureRef.current = now;
                return smallerUrl;
            }

            lastCaptureRef.current = now;
            return dataUrl;

        } catch (error) {
            console.error('[Thumbnail] Capture failed:', error);
            return null;
        }
    }, [cards, hasBackgroundImage]);

    /**
     * Schedule auto-capture with debounce.
     */
    const scheduleAutoCapture = useCallback(() => {
        if (captureTimeoutRef.current) {
            clearTimeout(captureTimeoutRef.current);
        }

        if (hasBackgroundImage || !cards || cards.length < 1) {
            return;
        }

        // Wait 10 seconds after last card change
        captureTimeoutRef.current = setTimeout(async () => {
            const thumbnail = await captureThumbnail();
            if (thumbnail && currentBoardId) {
                try {
                    updateBoardMetadata(currentBoardId, { thumbnail });
                    console.log('[Thumbnail] ✅ Saved to board metadata');
                } catch (e) {
                    console.error('[Thumbnail] Save failed:', e);
                }
            }
        }, 10000);
    }, [captureThumbnail, currentBoardId, hasBackgroundImage, cards]);

    // Trigger capture when card count changes
    useEffect(() => {
        if (cards && cards.length >= 1 && !hasBackgroundImage && currentBoardId) {
            console.log('[Thumbnail] Card count changed, scheduling capture...');
            scheduleAutoCapture();
        }

        return () => {
            if (captureTimeoutRef.current) {
                clearTimeout(captureTimeoutRef.current);
            }
        };
    }, [cards?.length, currentBoardId, hasBackgroundImage]);

    return {
        canvasContainerRef,
        captureThumbnail,
        scheduleAutoCapture
    };
}

export default useThumbnailCapture;
