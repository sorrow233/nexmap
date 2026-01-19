import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Apple Pencil 划线高亮 Hook
 * 检测 Pencil 在文字上划过，返回选中的文字
 * 
 * @param {Object} options
 * @param {Function} options.onCapture - 划线结束时的回调，参数为选中的文字
 * @param {boolean} options.enabled - 是否启用（默认 true）
 * @returns {Object} - { bindEvents, highlightStyle, isHighlighting }
 */
export function usePencilHighlight({ onCapture, enabled = true } = {}) {
    const [isHighlighting, setIsHighlighting] = useState(false);
    const [highlightRect, setHighlightRect] = useState(null);

    // 追踪起始和当前位置
    const startPosRef = useRef(null);
    const currentPosRef = useRef(null);
    const containerRef = useRef(null);
    const isActiveRef = useRef(false);

    /**
     * 获取指定点下的文字范围
     */
    const getCaretRangeFromPoint = useCallback((x, y) => {
        // 标准 API (Chrome, Safari)
        if (document.caretRangeFromPoint) {
            return document.caretRangeFromPoint(x, y);
        }
        // Firefox 备用方案
        if (document.caretPositionFromPoint) {
            const pos = document.caretPositionFromPoint(x, y);
            if (pos && pos.offsetNode) {
                const range = document.createRange();
                range.setStart(pos.offsetNode, pos.offset);
                range.setEnd(pos.offsetNode, pos.offset);
                return range;
            }
        }
        return null;
    }, []);

    /**
     * 从起点到终点创建选区并获取文字
     */
    const getTextBetweenPoints = useCallback((startX, startY, endX, endY) => {
        const startRange = getCaretRangeFromPoint(startX, startY);
        const endRange = getCaretRangeFromPoint(endX, endY);

        if (!startRange || !endRange) return '';

        try {
            const selection = window.getSelection();
            selection.removeAllRanges();

            const range = document.createRange();

            // 确保起点在终点之前
            const startNode = startRange.startContainer;
            const endNode = endRange.startContainer;

            // 比较两个位置
            const comparePos = startRange.compareBoundaryPoints(Range.START_TO_START, endRange);

            if (comparePos <= 0) {
                range.setStart(startRange.startContainer, startRange.startOffset);
                range.setEnd(endRange.startContainer, endRange.startOffset);
            } else {
                range.setStart(endRange.startContainer, endRange.startOffset);
                range.setEnd(startRange.startContainer, startRange.startOffset);
            }

            const text = range.toString().trim();

            // 获取选区的视觉边界
            if (text) {
                const rects = range.getClientRects();
                if (rects.length > 0) {
                    // 合并所有 rects 为一个边界框
                    let minTop = Infinity, maxBottom = 0, minLeft = Infinity, maxRight = 0;
                    for (const rect of rects) {
                        minTop = Math.min(minTop, rect.top);
                        maxBottom = Math.max(maxBottom, rect.bottom);
                        minLeft = Math.min(minLeft, rect.left);
                        maxRight = Math.max(maxRight, rect.right);
                    }
                    setHighlightRect({
                        top: minTop,
                        left: minLeft,
                        width: maxRight - minLeft,
                        height: maxBottom - minTop
                    });
                }
            }

            selection.removeAllRanges();
            return text;
        } catch (e) {
            console.warn('[Pencil] Failed to get text range:', e);
            return '';
        }
    }, [getCaretRangeFromPoint]);

    /**
     * Pointer Down - Pencil 落笔
     */
    const handlePointerDown = useCallback((e) => {
        if (!enabled) return;

        // 只响应 Apple Pencil (pen)
        if (e.pointerType !== 'pen') return;

        // 检查是否在消息内容区域
        const target = e.target;
        const isInMessage = target.closest('.prose') || target.closest('.message-content');
        if (!isInMessage) return;

        console.log('[Pencil] Start highlighting');
        isActiveRef.current = true;
        startPosRef.current = { x: e.clientX, y: e.clientY };
        currentPosRef.current = { x: e.clientX, y: e.clientY };
        setIsHighlighting(true);

        // 防止触发滚动
        e.preventDefault();
    }, [enabled]);

    /**
     * Pointer Move - Pencil 移动
     */
    const handlePointerMove = useCallback((e) => {
        if (!isActiveRef.current || e.pointerType !== 'pen') return;

        currentPosRef.current = { x: e.clientX, y: e.clientY };

        // 实时更新高亮区域
        const start = startPosRef.current;
        const current = currentPosRef.current;

        if (start && current) {
            getTextBetweenPoints(start.x, start.y, current.x, current.y);
        }

        e.preventDefault();
    }, [getTextBetweenPoints]);

    /**
     * Pointer Up - Pencil 抬起
     */
    const handlePointerUp = useCallback((e) => {
        if (!isActiveRef.current) return;
        if (e.pointerType !== 'pen') return;

        const start = startPosRef.current;
        const end = currentPosRef.current;

        if (start && end) {
            const text = getTextBetweenPoints(start.x, start.y, end.x, end.y);

            if (text && text.length > 0 && onCapture) {
                console.log('[Pencil] Captured text:', text.substring(0, 50) + '...');

                // 触发成功动画
                setTimeout(() => {
                    onCapture(text);
                }, 100);
            }
        }

        // 重置状态
        isActiveRef.current = false;
        startPosRef.current = null;
        currentPosRef.current = null;

        // 延迟隐藏高亮，让用户看到效果
        setTimeout(() => {
            setIsHighlighting(false);
            setHighlightRect(null);
        }, 300);
    }, [getTextBetweenPoints, onCapture]);

    /**
     * Pointer Cancel - 取消
     */
    const handlePointerCancel = useCallback(() => {
        isActiveRef.current = false;
        startPosRef.current = null;
        currentPosRef.current = null;
        setIsHighlighting(false);
        setHighlightRect(null);
    }, []);

    // 绑定事件的对象
    const bindEvents = {
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        onPointerCancel: handlePointerCancel,
        // 触控时阻止默认行为（防止滚动干扰）
        style: { touchAction: 'none' }
    };

    // 高亮 Overlay 的样式
    const highlightOverlayStyle = highlightRect ? {
        position: 'fixed',
        top: highlightRect.top,
        left: highlightRect.left,
        width: highlightRect.width,
        height: highlightRect.height,
        background: 'rgba(134, 239, 172, 0.35)', // 淡绿色
        borderRadius: '3px',
        pointerEvents: 'none',
        zIndex: 9999,
        transition: isHighlighting ? 'none' : 'opacity 0.3s',
        opacity: isHighlighting ? 1 : 0,
    } : null;

    return {
        bindEvents,
        highlightOverlayStyle,
        isHighlighting,
        highlightRect
    };
}

export default usePencilHighlight;
