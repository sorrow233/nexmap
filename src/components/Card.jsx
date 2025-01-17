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
            className={`absolute w-[320px] bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col transition-shadow duration-200 select-none pointer-events-auto group
                ${isSelected ? 'ring-2 ring-brand-500 shadow-2xl shadow-brand-500/20' : ''}
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
            <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-slate-100">
                <div className="text-xs font-mono text-slate-400 truncate flex-shrink">
                    {cardContent.model || 'No model'}
                </div>
                <div className="flex gap-1 ml-2 flex-shrink-0">
                    <button
                        onClick={handleCopy}
                        className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title="Copy response"
                    >
                        <Copy size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onConnect(data.id); }}
                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Create connection"
                    >
                        <Link size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onExpand(data.id); }}
                        className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title="Expand"
                    >
                        <Maximize2 size={16} />
                    </button>
                </div>
            </div>

            <div className="p-4 bg-slate-50/50 h-48 overflow-hidden relative group-hover:bg-slate-50 transition-colors">
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap text-xs font-lxgw">
                    {previewText}
                </p>
                <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none"></div>
            </div>

            <div className="px-4 py-2 bg-white text-xs text-slate-400 flex justify-between items-center border-t border-slate-50">
                <span>{messages.length} msgs</span>
                <span className="uppercase tracking-wider font-bold text-[10px]">{cardContent.model || 'GPT-3.5'}</span>
            </div>
        </div>
    );
}

// Local Loader Compatibility
if (typeof window !== 'undefined') window.Card = Card;
