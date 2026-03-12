import { useCallback, useEffect, useRef } from 'react';

export function useCanvasPanSync({ canvasRef, contentRef, stateRef, setOffset }) {
    const frameRef = useRef(null);
    const pendingOffsetRef = useRef(null);

    const applyVisualTransform = useCallback((x, y, scale = stateRef.current.scale) => {
        if (canvasRef.current) {
            canvasRef.current.style.backgroundPosition = `${x}px ${y}px`;
        }

        if (contentRef.current) {
            contentRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
        }
    }, [canvasRef, contentRef, stateRef]);

    const flushPanSync = useCallback(() => {
        if (frameRef.current) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
        }

        const nextOffset = pendingOffsetRef.current || stateRef.current.offset;
        pendingOffsetRef.current = null;

        if (!nextOffset) return;

        setOffset((currentOffset) => {
            if (currentOffset.x === nextOffset.x && currentOffset.y === nextOffset.y) {
                return currentOffset;
            }
            return nextOffset;
        });
    }, [setOffset, stateRef]);

    const schedulePanSync = useCallback((nextOffset) => {
        pendingOffsetRef.current = nextOffset;

        if (frameRef.current) return;

        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            const latestOffset = pendingOffsetRef.current;
            pendingOffsetRef.current = null;

            if (!latestOffset) return;

            setOffset((currentOffset) => {
                if (currentOffset.x === latestOffset.x && currentOffset.y === latestOffset.y) {
                    return currentOffset;
                }
                return latestOffset;
            });
        });
    }, [setOffset]);

    const applyPanDelta = useCallback((deltaX, deltaY) => {
        if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return;
        if (deltaX === 0 && deltaY === 0) return;

        const currentScale = stateRef.current.scale ?? 1;
        const currentOffset = stateRef.current.offset ?? { x: 0, y: 0 };
        const nextOffset = {
            x: currentOffset.x + deltaX,
            y: currentOffset.y + deltaY
        };

        stateRef.current = {
            ...stateRef.current,
            offset: nextOffset
        };

        applyVisualTransform(nextOffset.x, nextOffset.y, currentScale);
        schedulePanSync(nextOffset);
    }, [applyVisualTransform, schedulePanSync, stateRef]);

    useEffect(() => {
        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, []);

    return {
        applyPanDelta,
        applyVisualTransform,
        flushPanSync
    };
}
