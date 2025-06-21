import html2canvas from 'html2canvas';
import { useCallback, useRef } from 'react';

/**
 * Hook for capturing canvas thumbnails.
 * Uses html2canvas to capture a low-resolution preview image.
 */
export function useThumbnailCapture() {
    const canvasRef = useRef(null);

    /**
     * Capture the canvas as a thumbnail image.
     * @param {HTMLElement} targetElement - The element to capture (defaults to canvasRef.current)
     * @returns {Promise<string|null>} - Data URL of the thumbnail or null on failure
     */
    const captureThumbnail = useCallback(async (targetElement) => {
        const element = targetElement || canvasRef.current;
        if (!element) {
            console.warn('[Thumbnail] No element to capture');
            return null;
        }

        try {
            const canvas = await html2canvas(element, {
                // Low-res for performance (thumbnail only, not full quality)
                scale: 0.3,
                // Limit size for storage efficiency
                width: Math.min(element.offsetWidth, 1200),
                height: Math.min(element.offsetHeight, 800),
                // Performance optimizations
                useCORS: true,
                logging: false,
                backgroundColor: null, // Transparent to preserve theme
                // Skip iframe/video for cleaner capture
                ignoreElements: (el) => {
                    return el.tagName === 'IFRAME' || el.tagName === 'VIDEO';
                }
            });

            // Compress as JPEG for smaller file size
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);

            // Check if the result is too large (> 500KB is too big for localStorage)
            if (dataUrl.length > 500000) {
                // Retry with lower quality
                const smallerDataUrl = canvas.toDataURL('image/jpeg', 0.3);
                return smallerDataUrl;
            }

            return dataUrl;
        } catch (error) {
            console.error('[Thumbnail] Capture failed:', error);
            return null;
        }
    }, []);

    return {
        canvasRef,
        captureThumbnail
    };
}

export default useThumbnailCapture;
