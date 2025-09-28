import { useCallback, useRef, useEffect } from 'react';
import { updateBoardMetadata } from '../services/storage';

/**
 * Calculate the bounding box for all cards.
 * @param {Array} cards - Array of card objects with x, y positions
 * @returns {Object|null} - Bounding box info or null
 */
function calculateCardsBoundingBox(cards) {
    if (!cards || !Array.isArray(cards) || cards.length === 0) {
        if (cards && !Array.isArray(cards)) console.warn('[Thumbnail] calculateCardsBoundingBox: cards is not an array', cards);
        return null;
    }

    // Filter valid cards - cards store position as x, y directly
    const validCards = cards.filter(c =>
        typeof c.x === 'number' &&
        typeof c.y === 'number'
    );

    if (validCards.length === 0) return null;

    // Card default size
    const CARD_WIDTH = 320;
    const CARD_HEIGHT = 200;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const card of validCards) {
        const width = card.width || CARD_WIDTH;
        const height = card.height || CARD_HEIGHT;
        minX = Math.min(minX, card.x);
        minY = Math.min(minY, card.y);
        maxX = Math.max(maxX, card.x + width);
        maxY = Math.max(maxY, card.y + height);
    }

    const PADDING = 40;
    return {
        minX: minX - PADDING,
        minY: minY - PADDING,
        maxX: maxX + PADDING,
        maxY: maxY + PADDING,
        width: maxX - minX + PADDING * 2,
        height: maxY - minY + PADDING * 2
    };
}

/**
 * Draw a rounded rectangle on canvas.
 */
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * Get card color or fallback.
 */
function getCardColor(card) {
    if (card.data?.color) return card.data.color;
    if (card.type === 'note') return '#6366f1'; // Indigo for notes
    return '#f97316'; // Orange for chat cards
}

/**
 * Render cards and connections as simplified thumbnail using Canvas 2D API.
 * Works on all platforms including mobile.
 */
function renderCardsThumbnail(cards, connections = [], targetWidth = 400, targetHeight = 300) {
    if (!Array.isArray(cards)) {
        console.warn('[Thumbnail] renderCardsThumbnail: cards is not an array', cards);
        return null;
    }
    const bbox = calculateCardsBoundingBox(cards);
    if (!bbox) return null;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    // Calculate scale to fit cards in thumbnail
    const scaleX = targetWidth / bbox.width;
    const scaleY = targetHeight / bbox.height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 1x

    // Background - soft warm gradient
    const gradient = ctx.createLinearGradient(0, 0, targetWidth, targetHeight);
    gradient.addColorStop(0, '#faf8f5'); // Warm cream
    gradient.addColorStop(1, '#f1ede6'); // Soft beige
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Draw dot grid pattern
    ctx.fillStyle = 'rgba(148, 163, 184, 0.12)';
    const dotSpacing = 12;
    for (let x = 0; x < targetWidth; x += dotSpacing) {
        for (let y = 0; y < targetHeight; y += dotSpacing) {
            ctx.beginPath();
            ctx.arc(x, y, 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Center offset
    const scaledWidth = bbox.width * scale;
    const scaledHeight = bbox.height * scale;
    const offsetX = (targetWidth - scaledWidth) / 2 - bbox.minX * scale;
    const offsetY = (targetHeight - scaledHeight) / 2 - bbox.minY * scale;

    // Default card dimensions
    const CARD_WIDTH = 320;
    const CARD_HEIGHT = 200;

    // Create card lookup for connections
    const cardMap = new Map();
    for (const card of cards) {
        if (typeof card.x === 'number' && typeof card.y === 'number') {
            const w = card.width || CARD_WIDTH;
            const h = card.height || CARD_HEIGHT;
            cardMap.set(card.id, {
                centerX: (card.x + w / 2) * scale + offsetX,
                centerY: (card.y + h / 2) * scale + offsetY
            });
        }
    }

    // Draw connections first (behind cards)
    if (connections && connections.length > 0) {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 2 * scale;
        ctx.lineCap = 'round';

        for (const conn of connections) {
            const fromCard = cardMap.get(conn.from);
            const toCard = cardMap.get(conn.to);
            if (fromCard && toCard) {
                ctx.beginPath();
                ctx.moveTo(fromCard.centerX, fromCard.centerY);

                // Bezier curve for smooth connection
                const midX = (fromCard.centerX + toCard.centerX) / 2;
                const midY = (fromCard.centerY + toCard.centerY) / 2;
                const ctrlOffset = Math.abs(toCard.centerY - fromCard.centerY) * 0.3;

                ctx.bezierCurveTo(
                    midX, fromCard.centerY + ctrlOffset,
                    midX, toCard.centerY - ctrlOffset,
                    toCard.centerX, toCard.centerY
                );
                ctx.stroke();
            }
        }
    }

    // Draw each card
    for (const card of cards) {
        if (typeof card.x !== 'number' || typeof card.y !== 'number') continue;

        const cardX = card.x * scale + offsetX;
        const cardY = card.y * scale + offsetY;
        const cardW = (card.width || CARD_WIDTH) * scale;
        const cardH = (card.height || CARD_HEIGHT) * scale;
        const radius = 8 * scale;

        // Card shadow (softer for light background)
        ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
        ctx.shadowBlur = 12 * scale;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 6 * scale;

        // Card background
        const cardColor = getCardColor(card);
        roundRect(ctx, cardX, cardY, cardW, cardH, radius);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Color accent bar at top
        roundRect(ctx, cardX, cardY, cardW, 6 * scale, radius);
        ctx.fillStyle = cardColor;
        ctx.fill();
        // Cover bottom of accent bar to make it flat
        ctx.fillRect(cardX, cardY + 3 * scale, cardW, 3 * scale);

        // Title text (if available)
        const title = card.data?.title || (card.type === 'note' ? 'Note' : 'Card');
        const maxTitleLength = 20;
        const displayTitle = title.length > maxTitleLength ? title.slice(0, maxTitleLength) + '...' : title;

        ctx.font = `bold ${10 * scale}px system-ui, sans-serif`;
        ctx.fillStyle = '#1e293b';
        ctx.textBaseline = 'top';
        ctx.fillText(displayTitle, cardX + 8 * scale, cardY + 12 * scale, cardW - 16 * scale);

        // Content preview lines (simulate text)
        ctx.fillStyle = '#94a3b8';
        const lineY = cardY + 28 * scale;
        const lineCount = Math.min(3, Math.floor((cardH - 40 * scale) / (8 * scale)));
        for (let i = 0; i < lineCount; i++) {
            const lineWidth = cardW * (0.5 + Math.random() * 0.4);
            ctx.fillRect(cardX + 8 * scale, lineY + i * 8 * scale, lineWidth - 16 * scale, 4 * scale);
        }
    }

    // Export as JPEG
    try {
        return canvas.toDataURL('image/jpeg', 0.7);
    } catch (e) {
        console.error('[Thumbnail] Export failed:', e);
        return null;
    }
}

/**
 * Hook for capturing canvas thumbnails using Canvas 2D API.
 * Cross-platform compatible - works on desktop and mobile.
 */
export function useThumbnailCapture(cards, connections, currentBoardId, hasBackgroundImage) {
    const captureTimeoutRef = useRef(null);
    const lastCaptureRef = useRef(0);
    const canvasContainerRef = useRef(null); // Keep for API compatibility

    // Minimum 30 seconds between captures
    const MIN_CAPTURE_INTERVAL = 30000;

    /**
     * Generate thumbnail using Canvas 2D API.
     */
    const captureThumbnail = useCallback(() => {
        // Skip conditions
        if (hasBackgroundImage) {
            return null;
        }

        if (!cards || cards.length === 0) {
            return null;
        }

        const now = Date.now();
        if (now - lastCaptureRef.current < MIN_CAPTURE_INTERVAL) {
            return null;
        }

        try {
            const thumbnail = renderCardsThumbnail(cards, connections);
            if (thumbnail) {
                lastCaptureRef.current = now;
            }
            return thumbnail;
        } catch (error) {
            console.error('[Thumbnail] Capture failed:', error);
            return null;
        }
    }, [cards, connections, hasBackgroundImage]);

    /**
     * Save thumbnail to board metadata.
     */
    const saveThumbnail = useCallback((thumbnail) => {
        if (thumbnail && currentBoardId) {
            try {
                updateBoardMetadata(currentBoardId, { thumbnail });
            } catch (e) {
                console.error('[Thumbnail] Save failed:', e);
            }
        }
    }, [currentBoardId]);

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

        // Wait 3 seconds after last card change (faster for mobile)
        captureTimeoutRef.current = setTimeout(() => {
            const thumbnail = captureThumbnail();
            saveThumbnail(thumbnail);
        }, 3000);
    }, [captureThumbnail, saveThumbnail, hasBackgroundImage, cards]);

    // Trigger capture when card count changes
    useEffect(() => {
        if (cards && cards.length >= 1 && !hasBackgroundImage && currentBoardId) {
            scheduleAutoCapture();
        }

        return () => {
            if (captureTimeoutRef.current) {
                clearTimeout(captureTimeoutRef.current);
            }
        };
    }, [cards?.length, currentBoardId, hasBackgroundImage, scheduleAutoCapture]);

    // Force capture on page visibility change (user leaving)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && cards && cards.length > 0 && !hasBackgroundImage && currentBoardId) {
                // Immediate capture when user leaves
                const thumbnail = renderCardsThumbnail(cards, connections);
                if (thumbnail) {
                    try {
                        updateBoardMetadata(currentBoardId, { thumbnail });
                    } catch (e) {
                        console.error('[Thumbnail] Save on exit failed:', e);
                    }
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [cards, connections, currentBoardId, hasBackgroundImage]);

    return {
        canvasContainerRef,
        captureThumbnail,
        scheduleAutoCapture
    };
}

export default useThumbnailCapture;
