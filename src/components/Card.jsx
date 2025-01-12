import React, { useState, useEffect, useRef } from 'react';
import { Maximize2, Link, ArrowRight } from 'lucide-react';
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
    onDelete,
    scale // Assuming scale is passed as a prop
}) {
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const cardRef = useRef(null);

    // Refs to hold latest values for event handlers to avoid re-binding
    const stateRef = useRef({ data, onMove, scale, dragOffset });
    useEffect(() => {
        stateRef.current = { data, onMove, scale, dragOffset };
    }, [data, onMove, scale, dragOffset]);

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
        };

        // Add listeners to window so we can drag outside the card
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        // Only explicitly remove on cleanup (stop dragging)
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
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


    const zIndex = isSelected ? 50 : 1;

    return (
        <div
            ref={cardRef}
            className={`absolute w-[320px] bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col transition-shadow duration-200 select-none pointer-events-auto group
                ${isSelected ? 'ring-2 ring-brand-500 shadow-2xl shadow-brand-500/20' : ''}
                ${isConnectionStart ? 'ring-2 ring-green-500 ring-dashed cursor-crosshair' : ''}
                ${isConnecting && !isConnectionStart ? 'hover:ring-2 hover:ring-green-400 hover:cursor-crosshair' : ''}
            `}
            style={{
                left: data.x,
                top: data.y,
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: zIndex
            }}
            onMouseDown={handleMouseDown}
            onDoubleClick={(e) => { e.stopPropagation(); onExpand(data.id); }}
        >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl backdrop-blur-sm">
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 animate-pulse"></div>
                    <h3 className="font-bold text-slate-700 truncate text-sm" title={cardContent.title}>
                        {cardContent.title || "New Card"}
                    </h3>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); onConnect && onConnect(data.id); }}
                        className={`p-1.5 rounded-lg transition-colors ${isConnecting ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-brand-600 hover:bg-brand-50'}`}
                        title={isConnecting ? "Click to connect" : "Link this card"}
                    >
                        <Link size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onExpand(data.id); }}
                        className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title="Expand"
                    >
                        <Maximize2 size={14} />
                    </button>
                </div>
            </div>

            <div className="p-4 bg-slate-50/50 flex-grow min-h-[100px] max-h-[200px] overflow-hidden relative">
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap font-mono text-xs">
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
