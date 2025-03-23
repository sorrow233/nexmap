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
    onDelete
}) {
    // ... (logic remains same)

    // ... inside return ...
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
                zIndex: isSelected ? 60 : (isTarget ? 55 : 1), // Priority Z-Index
                willChange: isDragging ? 'left, top' : 'auto' // Hint to browser
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onDoubleClick={(e) => { e.stopPropagation(); onExpand(data.id); }}
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
                        onClick={(e) => { e.stopPropagation(); onExpand(data.id); }}
                        className="p-1.5 text-slate-500 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all"
                        title="Expand"
                    >
                        <Maximize2 size={14} />
                    </button>
                </div>
            </div>

            <div className="p-4 h-48 overflow-hidden relative transition-colors">
                <p
                    className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-lxgw select-text cursor-text card-content-text"
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
