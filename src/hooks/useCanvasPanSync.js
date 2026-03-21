import { useCallback, useEffect, useRef } from 'react';

const STORE_SYNC_INTERVAL_MS = 34;

export function useCanvasPanSync({ canvasRef, contentRef, stateRef, setOffset }) {
    const timerRef = useRef(null);
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
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
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

        if (timerRef.current) return;

        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            const latestOffset = pendingOffsetRef.current;
            pendingOffsetRef.current = null;

            if (!latestOffset) return;

            setOffset((currentOffset) => {
                if (currentOffset.x === latestOffset.x && currentOffset.y === latestOffset.y) {
                    return currentOffset;
                }
                return latestOffset;
            });
        }, STORE_SYNC_INTERVAL_MS);
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
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return {
        applyPanDelta,
        applyVisualTransform,
        flushPanSync
    };
}
