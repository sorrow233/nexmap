import React, { useState, useEffect, useRef } from 'react';
import { Maximize2, Link, ArrowRight, Copy } from 'lucide-react';
import { formatTime } from '../utils/format';
import { marked } from 'marked';

export default function Card({
    data, // Now contains id, x, y, and actual data
    isSelected,
    onSelect,
    onMove,
    onExpand,
    isConnectionStart,
    isConnecting,
    onConnect,
    onDragEnd,
    onDelete,
    scale // Assuming scale is passed as a prop
}) {
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const cardRef = useRef(null);

    // Refs to hold latest values for event handlers to avoid re-binding
    const stateRef = useRef({ data, onMove, scale, dragOffset, onDragEnd });
    useEffect(() => {
        stateRef.current = { data, onMove, scale, dragOffset, onDragEnd };
    }, [data, onMove, scale, dragOffset, onDragEnd]);

    const handleMouseDown = (e) => {
        if (e.target.closest('button') || e.target.closest('.no-drag')) return;

        e.stopPropagation();
        onSelect(data.id);

        // Initial setup
        const initialDragOffset = {
            startX: e.clientX,
            startY: e.clientY,
            origX: data.x,
            origY: data.y
        };

        setIsDragging(true);
        setDragOffset(initialDragOffset);

        // Update ref immediately for the listener that will start
        stateRef.current.dragOffset = initialDragOffset;
    };

    // Touch event handler for mobile/iPad support - JS Only, no CSS changes
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
            const { onMove, data, scale, dragOffset } = stateRef.current;

            // Apply scale to delta
            const currentScale = scale || 1;
            const dx = (e.clientX - dragOffset.startX) / currentScale;
            const dy = (e.clientY - dragOffset.startY) / currentScale;

            onMove(data.id, dragOffset.origX + dx, dragOffset.origY + dy);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            if (stateRef.current.onDragEnd) {
                stateRef.current.onDragEnd(stateRef.current.data.id);
            }
        };



        const handleTouchMove = (e) => {
            // Prevent default only if dragging to stop scrolling
            if (e.cancelable) e.preventDefault();
            const touch = e.touches[0];
            handleMouseMove({
                clientX: touch.clientX,
                clientY: touch.clientY
            });
        };

        const handleTouchEnd = () => {
            handleMouseUp();
        };

        // Add listeners to window so we can drag outside the card
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        // Add passive: false to allow preventDefault
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);

        // Only explicitly remove on cleanup (stop dragging)
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
    let previewText = lastMessage?.content || "No messages yet";

    // Clean up thinking tags for preview
    previewText = previewText.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
    if (!previewText) previewText = "Thinking..."; // If only thought exists

    // Show truncated preview (END of content)
    // If longer than 100 chars, show "..." then the end
    if (previewText.length > 100) {
        previewText = "..." + previewText.slice(-100);
    }

    // Copy handler
    const handleCopy = async (e) => {
        e.stopPropagation();
        const textToCopy = lastMessage?.content || '';
        try {
            await navigator.clipboard.writeText(textToCopy);
            // Optional: Show a brief success indicator
            console.log('✅ Copied to clipboard');
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };


    const zIndex = isSelected ? 50 : 1;

    return (
        <div
            ref={cardRef}
            className={`absolute w-[320px] bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/40 flex flex-col transition-all duration-300 select-none pointer-events-auto group
                ${isSelected ? 'ring-2 ring-brand-500/50 shadow-[0_20px_50px_rgba(37,99,235,0.25)] scale-[1.02]' : 'hover:scale-[1.01] hover:shadow-[0_15px_40px_rgba(0,0,0,0.1)]'}
                ${isConnectionStart ? 'ring-2 ring-green-500 ring-dashed cursor-crosshair' : ''}
                ${isConnecting && !isConnectionStart ? 'hover:ring-2 hover:ring-green-400 hover:cursor-crosshair' : ''}`}
            style={{
                left: data.x,
                top: data.y,
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: zIndex
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onDoubleClick={(e) => { e.stopPropagation(); onExpand(data.id); }}
        >
            {/* Top Bar - Model + Buttons */}
            <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-slate-200/20">
                <div className="flex items-center gap-2 max-w-[60%]">
                    <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate">
                        {cardContent.model?.replace('google/', '') || 'Gemini'}
                    </div>
                </div>
                <div className="flex gap-1 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                        onClick={handleCopy}
                        className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-white/50 rounded-lg transition-all"
                        title="Copy response"
                    >
                        <Copy size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onConnect(data.id); }}
                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-white/50 rounded-lg transition-all"
                        title="Create connection"
                    >
                        <Link size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onExpand(data.id); }}
                        className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-white/50 rounded-lg transition-all"
                        title="Expand"
                    >
                        <Maximize2 size={14} />
                    </button>
                </div>
            </div>

            <div className="p-4 h-48 overflow-hidden relative transition-colors">
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-lxgw">
                    {previewText}
                </p>
                <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white/90 via-white/40 to-transparent pointer-events-none"></div>
            </div>

            <div className="px-4 py-2 text-[10px] text-slate-400 flex justify-between items-center border-t border-slate-100/50">
                <span className="font-medium bg-slate-100/50 px-2 py-0.5 rounded-full">{messages.length} messages</span>
                <span className="flex items-center gap-1 font-semibold text-brand-600/70">
                    <Sparkles size={8} />
                    {cardContent.model?.includes('flash') ? 'FAST' : 'PRO'}
                </span>
            </div>
        </div>
    );
}

// Local Loader Compatibility
if (typeof window !== 'undefined') window.Card = Card;
