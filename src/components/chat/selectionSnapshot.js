export function getSelectionSnapshot({ rootElement, domSelection }) {
    if (!rootElement || !domSelection || domSelection.rangeCount === 0) {
        return null;
    }

    const text = domSelection.toString().trim();
    if (!text) {
        return null;
    }

    try {
        const range = domSelection.getRangeAt(0);
        const ancestorNode = range.commonAncestorContainer;

        if (!rootElement.contains(ancestorNode)) {
            return null;
        }

        const rect = range.getBoundingClientRect();
        const fallbackRect = range.getClientRects?.()[0];
        const effectiveRect = rect?.width || rect?.height ? rect : fallbackRect;

        if (!effectiveRect) {
            return null;
        }

        return {
            text,
            html: range.cloneContents(),
            rect: {
                top: effectiveRect.top,
                left: effectiveRect.left + effectiveRect.width / 2
            }
        };
    } catch (error) {
        console.warn('[Selection] Failed to build selection snapshot', error);
        return null;
    }
}
