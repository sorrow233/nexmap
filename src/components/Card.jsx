import React, { useState, useEffect, useRef } from 'react';
import { Maximize2, Link, ArrowRight, Copy, Sparkles, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { formatTime } from '../utils/format';
import { marked } from 'marked';
import { isSafari, isIOS } from '../utils/browser';

import { useStore } from '../store/useStore';

const Card = React.memo(function Card({

    data, // Now contains id, x, y, and actual data
    isSelected,
    isTarget, // NEW: Luminous Guide prop
    onSelect,
    onMove,
    onExpand,
    isConnectionStart,
    isConnecting,
    onConnect,
    onDragEnd,
    onDelete,
    onCardFullScreen // NEW Prop
}) { // Line 22
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const cardRef = useRef(null);
    const clickTimeoutRef = useRef(null); // Ref for double click detection

    // Refs to hold latest values
    const stateRef = useRef({ data, onMove, dragOffset, onDragEnd, isSelected, onSelect, onExpand, onCardFullScreen });
    useEffect(() => {
        stateRef.current = { data, onMove, dragOffset, onDragEnd, isSelected, onSelect, onExpand, onCardFullScreen };
    }, [data, onMove, dragOffset, onDragEnd, isSelected, onSelect, onExpand, onCardFullScreen]);

    // Track if we should possibly deselect other cards on mouse up (if it was a click, not a drag)
    const pendingDeselectRef = useRef(false);
    const hasDraggedRef = useRef(false);

    const handleMouseDown = (e) => {
        if (e.target.closest('button') || e.target.closest('.no-drag')) return;

        // CRITICAL: Prevent event from bubbling to Canvas (which would deselect all)
        e.stopPropagation();

        const isAdditive = e.shiftKey || e.metaKey || e.ctrlKey;

        // Selection Logic Refined:
        // 1. Additive (Shift/Ctrl/Meta): Toggle or Add. We let onSelect handle the toggle logic immediately.
        // 2. Not Additive + Not Selected: Select immediately (clearing others).
        // 3. Not Additive + Already Selected: Do NOTHING yet. Defer deselect to MouseUp.
        //    This prevents losing the multi-selection when starting to drag a group.

        if (isAdditive) {
            onSelect(data.id, e);
            pendingDeselectRef.current = false;
        } else if (!isSelected) {
            onSelect(data.id, e);
            pendingDeselectRef.current = false;
        } else {
            // Already selected, no modifiers. 
            // We MIGHT be clicking to select just this one (deselect others), OR starting a drag.
            // Assume drag first. Defer deselect to mouse up.
            pendingDeselectRef.current = true;
        }

        // Initial setup for drag
        const initialDragOffset = {
            startX: e.clientX,
            startY: e.clientY,
            origX: data.x,
            origY: data.y
        };

        setIsDragging(true);
        setDragOffset(initialDragOffset);
        hasDraggedRef.current = false;

        // Update ref immediately for the listener that will start
        stateRef.current.dragOffset = initialDragOffset;
    };

    // Prevent native drag (ghost image) on images or text
    const handleDragStart = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const lastTouchTimeRef = useRef(0);

    // Touch event handler
    const handleTouchStart = (e) => {
        if (e.target.closest('button') || e.target.closest('.no-drag')) return;

        // Double-tap detection for touch devices
        const now = Date.now();
        if (now - lastTouchTimeRef.current < 300) {
            e.preventDefault(); // Prevent default zoom/scroll
            e.stopPropagation();
            onExpand(data.id);
            lastTouchTimeRef.current = 0;
            return;
        }
        lastTouchTimeRef.current = now;

        const touch = e.touches[0];
        handleMouseDown({
            ...e,
            clientX: touch.clientX,
            clientY: touch.clientY,
            stopPropagation: () => e.stopPropagation(),
            preventDefault: () => e.preventDefault(),
            target: e.target,
            shiftKey: e.shiftKey,
            metaKey: e.metaKey,
            ctrlKey: e.ctrlKey
        });
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            const { dragOffset, data, onMove } = stateRef.current;

            // Calculate delta
            const currentScale = useStore.getState().scale || 1;
            const dx = (e.clientX - dragOffset.startX) / currentScale;
            const dy = (e.clientY - dragOffset.startY) / currentScale;

            // Check if actually moved (threshold > 3px)
            // We use hasDraggedRef to latch the state. Once verified as drag, it stays verified.
            if (!hasDraggedRef.current && (Math.abs(e.clientX - dragOffset.startX) > 3 || Math.abs(e.clientY - dragOffset.startY) > 3)) {
                hasDraggedRef.current = true;
                pendingDeselectRef.current = false; // We are definitively dragging. Cancel any pending deselect.
            }

            // Move only if verified as a drag or if we want responsive micro-movement (but risks deselect issue)
            // Safer to wait for threshold validation.
            if (hasDraggedRef.current && onMove) {
                onMove(data.id, dragOffset.origX + dx, dragOffset.origY + dy);
            }
        };

        const handleMouseUp = (e) => {
            setIsDragging(false);

            // Handle deferred deselect
            // Condition: We wanted to deselect (click on selected), BUT we didn't drag.
            if (pendingDeselectRef.current && !hasDraggedRef.current) {
                const { onSelect, data } = stateRef.current;
                // Force "clean" selection (no modifiers) to trigger exclusive select
                onSelect(data.id, { ...e, shiftKey: false, metaKey: false, ctrlKey: false });
            }

            // Click Logic (Single vs Double)
            if (!hasDraggedRef.current) { // Allow click even if we just handled deselect logic
                // Actually, even if we deselected, we clicked. So we should probably Expand.
                const { onExpand, onCardFullScreen, data } = stateRef.current;

                if (clickTimeoutRef.current) {
                    // Double Click Detected
                    clearTimeout(clickTimeoutRef.current);
                    clickTimeoutRef.current = null;
                    if (onCardFullScreen) onCardFullScreen(data.id);
                } else {
                    // Single Click - wait for potential double click
                    clickTimeoutRef.current = setTimeout(() => {
                        if (onExpand) onExpand(data.id);
                        clickTimeoutRef.current = null;
                    }, 250); // 250ms tolerance
                }
            }

            pendingDeselectRef.current = false;

            // Finalize drag
            const { dragOffset, data, onDragEnd } = stateRef.current;

            if (hasDraggedRef.current && onDragEnd) {
                const currentScale = useStore.getState().scale || 1;
                const dx = (e.clientX - dragOffset.startX) / currentScale;
                const dy = (e.clientY - dragOffset.startY) / currentScale;
                const finalX = dragOffset.origX + dx;
                const finalY = dragOffset.origY + dy;
                onDragEnd(data.id, finalX, finalY);
            }
        };

        const handleTouchMove = (e) => {
            if (e.cancelable) e.preventDefault();
            const touch = e.touches[0];
            handleMouseMove({
                clientX: touch.clientX,
                clientY: touch.clientY
            });
        };

        // Simplified TouchEnd
        const handleTouchEnd = (e) => {
            setIsDragging(false);

            if (cardRef.current) {
                // If we used transform logic (which we aren't, we are using onMove store updates directly),
                // we would need cleanup. But here we just finalize.
                // Since we don't have clientX/Y in touchend easily without tracking, 
                // and we've been updating the store onMove, the last onMove was correct.
                // We just need to trigger onDragEnd with the *current* data coordinates.
                // BUT data coordinates in props might be stale compared to store if React didn't re-render fast enough?
                // Actually, onMove updates store -> triggers re-render -> new data props.
                // So stateRef.current.data should be reasonably fresh.

                // However, to be precise, we should track last known coordinates in ref.
                // For now, using the last calculated delta from dragOffset works best.
                // But touchEnd has no coordinates. We rely on the movement having happened.
            }

            // Handle deferred deselect for touch
            if (pendingDeselectRef.current && !hasDraggedRef.current) {
                const { onSelect, data } = stateRef.current;
                onSelect(data.id, { shiftKey: false, ctrlKey: false, metaKey: false });
            }

            if (hasDraggedRef.current && stateRef.current.onDragEnd) {
                // We can't calc new delta easily without last touch. 
                // Assuming the last onMove was handled, the state is updated.
                // onDragEnd is mostly for "saving" logic (undo/redo checkpoint).
                // passing current x/y is fine.
                const { x, y } = stateRef.current.data;
                stateRef.current.onDragEnd(stateRef.current.data.id, x, y);
            }

            pendingDeselectRef.current = false;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isDragging]); // Only re-run if isDragging changes state

    // Safety access
    const cardContent = data.data || {};
    const messages = cardContent.messages || [];

    // Generate preview text (last message from assistant or user)
    const lastMessage = messages[messages.length - 1];

    // Helper to extract text from multimodal content
    const getPreviewContent = (content) => {
        if (!content) return "No messages yet";
        if (typeof content === 'string') return content;
        if (Array.isArray(content)) {
            const text = content.filter(p => p.type === 'text').map(p => p.text).join(' ');
            const hasImage = content.some(p => p.type === 'image' || p.type === 'image_url');
            return (hasImage ? '[Image] ' : '') + text;
        }
        return "Unknown content";
    };

    let previewText = "";
    const marks = data.data?.marks || [];

    if (marks.length > 0) {
        // If there are marks, show them joined by "..."
        previewText = marks.join(' ... ');
    } else {
        // Fallback to existing last message logic
        previewText = getPreviewContent(lastMessage?.content);
        // Clean up thinking tags for preview
        previewText = previewText.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
    }

    if (!previewText) previewText = "Thinking...";

    // Show truncated preview (END of content)
    if (previewText.length > 150) {
        previewText = marks.length > 0
            ? previewText.slice(0, 150) + "..."
            : "..." + previewText.slice(-120);
    }

    // Copy handler
    const handleCopy = async (e) => {
        e.stopPropagation();
        const textToCopy = getPreviewContent(lastMessage?.content) || '';
        try {
            await navigator.clipboard.writeText(textToCopy);
            // Optional: Show a brief success indicator
            console.log('✅ Copied to clipboard');
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };


    const zIndex = isSelected ? 60 : (isTarget ? 55 : 1);

    return (
        <div
            ref={cardRef}
            className={`absolute w-[320px] rounded-2xl flex flex-col select-none pointer-events-auto group shadow-xl dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)]
                ${isSafari || isIOS ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-white/20' : 'bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border-slate-300 dark:border-white/10'}
                ${isDragging ? 'shadow-2xl scale-[1.02] cursor-grabbing' : 'transition-all duration-300 cursor-grab'}
                ${isSelected ? 'card-sharp-selected' : 'hover:scale-[1.01] hover:border-brand-300 dark:hover:border-white/20'}
                ${isTarget ? 'card-target-breathing' : ''}
                ${isConnectionStart ? 'ring-2 ring-green-500 ring-dashed cursor-crosshair' : ''}
                ${isConnecting && !isConnectionStart ? 'hover:ring-2 hover:ring-green-400 hover:cursor-crosshair' : ''}`}
            style={{
                left: data.x,
                top: data.y,
                zIndex: zIndex,
                willChange: isDragging ? 'left, top' : 'auto' // Hint to browser
            }}
            onPrivateKey={() => { }} // Placeholder if needed
            onDragStart={handleDragStart}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
        // onDoubleClick removed - handled in mouseUp
        >
            {/* Top Bar - Model + Buttons */}
            <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2 max-w-[60%]">
                    <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={cardContent.title}>
                        {cardContent.title || 'New Conversation'}
                    </div>
                </div>
                <div className="flex gap-1 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                        onClick={handleCopy}
                        className="p-1.5 text-slate-500 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all"
                        title="Copy response"
                    >
                        <Copy size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onConnect(data.id); }}
                        className="p-1.5 text-slate-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-white/5 rounded-lg transition-all"
                        title="Create connection"
                    >
                        <Link size={14} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            // Direct click on Expand button should just expand immediately
                            onExpand(data.id);
                        }}
                        className="p-1.5 text-slate-500 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all"
                        title="Expand"
                    >
                        <Maximize2 size={14} />
                    </button>
                </div>
            </div>

            <div className="p-4 h-48 overflow-hidden relative transition-colors">
                <p
                    className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-lxgw select-none cursor-grab card-content-text"
                    style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                >
                    {previewText}
                </p>
                <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white via-white/40 dark:from-slate-900/90 dark:via-slate-900/40 to-transparent pointer-events-none"></div>
            </div>

            {data.type === 'image_gen' && (
                <div className="px-4 pb-4">
                    <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 flex items-center justify-center relative group/image">
                        {cardContent.loading ? (
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Generating...</span>
                            </div>
                        ) : cardContent.error ? (
                            <div className="flex flex-col items-center gap-2 p-4 text-center">
                                <AlertCircle className="w-8 h-8 text-red-500/50" />
                                <span className="text-xs text-red-500/70 font-medium">{cardContent.error}</span>
                            </div>
                        ) : cardContent.imageUrl ? (
                            <>
                                <img
                                    src={cardContent.imageUrl}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-110"
                                    alt={cardContent.prompt}
                                    draggable="false"
                                    onMouseDown={(e) => e.preventDefault()}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); window.open(cardContent.imageUrl, '_blank'); }}
                                        className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all transform hover:scale-110"
                                    >
                                        <Maximize2 size={16} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                <ImageIcon size={24} className="opacity-20" />
                                <span className="text-[10px] uppercase font-bold tracking-tighter opacity-30">No Image</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="px-4 py-2 text-[10px] text-slate-500 flex justify-between items-center border-t border-white/5">
                <span className="font-medium bg-white/5 px-2 py-0.5 rounded-full">{messages.length} messages</span>
                <span className="flex items-center gap-1 font-semibold text-brand-500/70 truncate max-w-[120px]" title={cardContent.model}>
                    <Sparkles size={8} />
                    {cardContent.model?.split('/').pop() || 'AI'}
                </span>
            </div>
        </div>
    );
});

export default Card;

// Local Loader Compatibility
if (typeof window !== 'undefined') window.Card = Card;
