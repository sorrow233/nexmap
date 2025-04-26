import React, { useState, useRef, useEffect } from 'react';
import { Maximize2, Link, Copy, Sparkles, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { isSafari, isIOS } from '../utils/browser';

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
    onDelete
}) {
    const [isDragging, setIsDragging] = useState(false);
    const dragStateRef = useRef(null);

    const handleMouseDown = (e) => {
        if (e.target.closest('button') || e.target.closest('.no-drag')) return;
        e.stopPropagation();
        onSelect(data.id, e);

        dragStateRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            origX: data.x,
            origY: data.y
        };
        setIsDragging(true);
    };

    const handleTouchStart = (e) => {
        if (e.target.closest('button') || e.target.closest('.no-drag')) return;
        const touch = e.touches[0];
        handleMouseDown({
            ...e,
            clientX: touch.clientX,
            clientY: touch.clientY,
            stopPropagation: () => e.stopPropagation()
        });
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            if (!dragStateRef.current) return;
            const { startX, startY, origX, origY } = dragStateRef.current;

            // Get current scale from store
            const getState = require('../store/useStore').useStore.getState;
            const currentScale = getState().scale || 1;

            const dx = (e.clientX - startX) / currentScale;
            const dy = (e.clientY - startY) / currentScale;

            // Directly update position in real-time via onMove
            if (onMove) {
                onMove(data.id, origX + dx, origY + dy);
            }
        };

        const handleMouseUp = (e) => {
            if (!dragStateRef.current) return;
            const { startX, startY, origX, origY } = dragStateRef.current;

            const getState = require('../store/useStore').useStore.getState;
            const currentScale = getState().scale || 1;

            const dx = (e.clientX - startX) / currentScale;
            const dy = (e.clientY - startY) / currentScale;
            const finalX = origX + dx;
            const finalY = origY + dy;

            setIsDragging(false);
            dragStateRef.current = null;

            // Final position update
            if (onDragEnd) {
                onDragEnd(data.id, finalX, finalY);
            }
        };

        const handleTouchMove = (e) => {
            if (e.cancelable) e.preventDefault();
            const touch = e.touches[0];
            handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        };

        const handleTouchEnd = (e) => {
            const touch = e.changedTouches[0];
            handleMouseUp({ clientX: touch.clientX, clientY: touch.clientY });
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
    }, [isDragging, data.id, data.x, data.y, onMove, onDragEnd]);

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
        previewText = previewText.replace(/\u003cthinking\u003e[\s\S]*?\u003c\/thinking\u003e/g, '').trim();
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
            console.log('✅ Copied to clipboard');
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const zIndex = isSelected ? 60 : (isTarget ? 55 : 1);

    return (
\u003cdiv
className = {`absolute w-[320px] rounded-2xl flex flex-col select-none pointer-events-auto group shadow-xl dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)]
                ${isSafari || isIOS ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-white/20' : 'bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border-slate-300 dark:border-white/10'}
                ${isDragging ? 'shadow-2xl scale-[1.02] cursor-grabbing' : 'transition-all duration-300 cursor-grab'}
                ${isSelected ? 'card-sharp-selected' : 'hover:scale-[1.01] hover:border-brand-300 dark:hover:border-white/20'}
                ${isTarget ? 'card-target-breathing' : ''}
                ${isConnectionStart ? 'ring-2 ring-green-500 ring-dashed cursor-crosshair' : ''}
                ${isConnecting && !isConnectionStart ? 'hover:ring-2 hover:ring-green-400 hover:cursor-crosshair' : ''}`}
style = {{
    left: data.x,
        top: data.y,
            zIndex: zIndex,
                willChange: isDragging ? 'left, top' : 'auto' // Hint to browser
}}
onMouseDown = { handleMouseDown }
onTouchStart = { handleTouchStart }
onDoubleClick = {(e) => { e.stopPropagation(); onExpand(data.id); }}
        >
    {/* Top Bar - Model + Buttons */ }
\u003cdiv className = "px-4 pt-3 pb-2 flex items-center justify-between border-b border-slate-100 dark:border-white/5" >
\u003cdiv className = "flex items-center gap-2 max-w-[60%]" >
\u003cdiv className = "w-2 h-2 rounded-full bg-brand-500 animate-pulse" >\u003c / div >
\u003cdiv className = "text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title = { cardContent.title } >
    { cardContent.title || 'New Conversation' }
\u003c / div >
\u003c / div >
\u003cdiv className = "flex gap-1 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" >
\u003cbutton
onClick = { handleCopy }
className = "p-1.5 text-slate-500 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all"
title = "Copy response"
    >
\u003cCopy size = { 14} />
\u003c / button >
\u003cbutton
onClick = {(e) => { e.stopPropagation(); onConnect(data.id); }}
className = "p-1.5 text-slate-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-white/5 rounded-lg transition-all"
title = "Create connection"
    >
\u003cLink size = { 14} />
\u003c / button >
\u003cbutton
onClick = {(e) => { e.stopPropagation(); onExpand(data.id); }}
className = "p-1.5 text-slate-500 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all"
title = "Expand"
    >
\u003cMaximize2 size = { 14} />
\u003c / button >
\u003c / div >
\u003c / div >

\u003cdiv className = "p-4 h-48 overflow-hidden relative transition-colors" >
\u003cp
className = "text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-lxgw select-text cursor-text card-content-text"
    >
    { previewText }
\u003c / p >
\u003cdiv className = "absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white via-white/40 dark:from-slate-900/90 dark:via-slate-900/40 to-transparent pointer-events-none" >\u003c / div >
\u003c / div >

    {
        data.type === 'image_gen' && (
        \u003cdiv className="px-4 pb-4" >
        \u003cdiv className="aspect-square w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 flex items-center justify-center relative group/image" >
        {
            cardContent.loading ? (
            \u003cdiv className="flex flex-col items-center gap-3" >
            \u003cLoader2 className="w-8 h-8 text-brand-500 animate-spin" />
            \u003cspan className="text-[10px] font-bold text-slate-500 uppercase tracking-widest" > Generating...\u003c/ span >
        \u003c/ div >
                        ) : cardContent.error ? (
\u003cdiv className = "flex flex-col items-center gap-2 p-4 text-center" >
\u003cAlertCircle className = "w-8 h-8 text-red-500/50" />
\u003cspan className = "text-xs text-red-500/70 font-medium" > { cardContent.error }\u003c / span >
\u003c / div >
                        ) : cardContent.imageUrl ? (
                            <>
        \u003cimg
        src={cardContent.imageUrl}
        className="w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-110"
        alt={cardContent.prompt}
        draggable="false"
        onMouseDown={(e) => e.preventDefault()}
                                />
                                \u003cdiv className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
        \u003cbutton
        onClick={(e) => { e.stopPropagation(); window.open(cardContent.imageUrl, '_blank'); }}
        className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all transform hover:scale-110"
                                    >
        \u003cMaximize2 size={16} />
                                    \u003c/button>
                                \u003c/div>
                            <>
            ) : (
                            \u003cdiv className="flex flex-col items-center gap-2 text-slate-400">
            \u003cImageIcon size={24} className="opacity-20" />
                                \u003cspan className="text-[10px] uppercase font-bold tracking-tighter opacity-30">No Image\u003c/span>
                            \u003c/div>
                        )}
                    \u003c/div>
                \u003c/div>
            )}

            \u003cdiv className="px-4 py-2 text-[10px] text-slate-500 flex justify-between items-center border-t border-white/5">
                \u003cspan className="font-medium bg-white/5 px-2 py-0.5 rounded-full">{messages.length} messages\u003c/span>
            \u003cspan className="flex items-center gap-1 font-semibold text-brand-500/70 truncate max-w-[120px]" title={cardContent.model}>
            \u003cSparkles size={8} />
            {cardContent.model?.split('/').pop() || 'AI'}
                \u003c/span>
            \u003c/div>
        \u003c/div>
            );
});

            export default Card;

            // Local Loader Compatibility
            if (typeof window !== 'undefined') window.Card = Card;
