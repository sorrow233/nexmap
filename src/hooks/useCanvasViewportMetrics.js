import React from 'react';

const readViewportSize = (element) => {
    if (element) {
        return {
            width: element.clientWidth || window.innerWidth || 0,
            height: element.clientHeight || window.innerHeight || 0
        };
    }

    return {
        width: window.innerWidth || 0,
        height: window.innerHeight || 0
    };
};

export function useCanvasViewportMetrics(containerRef) {
    const [viewportSize, setViewportSize] = React.useState(() => (
        typeof window === 'undefined'
            ? { width: 0, height: 0 }
            : readViewportSize(containerRef?.current || null)
    ));

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const node = containerRef?.current || null;
        const updateViewport = () => {
            const nextSize = readViewportSize(node);
            setViewportSize((currentSize) => (
                currentSize.width === nextSize.width && currentSize.height === nextSize.height
                    ? currentSize
                    : nextSize
            ));
        };

        updateViewport();

        let resizeObserver = null;
        if (node && typeof window.ResizeObserver === 'function') {
            resizeObserver = new window.ResizeObserver(updateViewport);
            resizeObserver.observe(node);
        }

        window.addEventListener('resize', updateViewport);

        return () => {
            window.removeEventListener('resize', updateViewport);
            resizeObserver?.disconnect();
        };
    }, [containerRef]);

    return viewportSize;
}
