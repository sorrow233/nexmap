import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Maximize2, Link, ArrowRight, Copy, Sparkles, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { formatTime } from '../utils/format';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { isSafari, isIOS } from '../utils/browser';

import { useStore } from '../store/useStore';
import { useDraggable } from '../hooks/useDraggable';
import { useContextMenu } from './ContextMenu';

const Card = React.memo(function Card({
    data, // Now contains id, x, y, and actual data
    isSelected,
    isTarget, // NEW: Luminous Guide prop
    onSelect,
    onMove,
    onExpand,
    isConnectionStart,
    isConnecting,
    onDragEnd,
    onDelete,
    onConnect,
    onUpdate,
    onCreateNote,
    onPromptDrop,
    onCustomSprout // NEW
}) {
    const [isDragOver, setIsDragOver] = useState(false);
    const cardRef = useRef(null);
    const {
        isDragging,
        handleMouseDown,
        handleTouchStart
    } = useDraggable({
        id: data.id,
        x: data.x,
        y: data.y,
        isSelected,
        onSelect,
        onMove,
        onDragEnd,
        disabled: false // Can add more logic here if needed
    });

    const handleDragStart = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const lastTouchTimeRef = useRef(0);
    const handleTouchStartWithDoubleTap = (e) => {
        const now = Date.now();
        if (now - lastTouchTimeRef.current < 300) {
            e.preventDefault();
            e.stopPropagation();
            onExpand(data.id);
            lastTouchTimeRef.current = 0;
            return;
        }
        lastTouchTimeRef.current = now;
        handleTouchStart(e);
    };


    const handleCardDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        try {
            const dropData = JSON.parse(e.dataTransfer.getData('application/json'));
            if (dropData.type === 'prompt') {
                if (onPromptDrop) {
                    onPromptDrop(data.id, dropData);
                }
            }
        } catch (err) {
            console.error("Card drop error", err);
        }
    };

    // Safety access
    const cardContent = data.data || {};
    const messages = cardContent.messages || [];

    // Generate preview text (last message from assistant or user)
    const lastMessage = messages[messages.length - 1];

    // ... (rest of imports)

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
        // Format as markdown list for better visual
        previewText = marks.map(m => `- **${m}**`).join('\n');
    } else {
        // Fallback to existing last message logic
        previewText = getPreviewContent(lastMessage?.content);
        // Clean up thinking tags for preview
        previewText = previewText.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
    }

    if (!previewText) previewText = "_Thinking..._";

    // Truncate logic - but keep it markdown friendly if possible
    // Simple slice might break markdown syntax, but for preview it's acceptable trade-off
    // or we render first then truncate visual height (CSS line-clamp).
    // Let's stick to CSS line-clamp for safer rich text truncation usually, 
    // but here we are rendering HTML. 
    // Let's truncate source text to a reasonable length to avoid huge parsing overhead, 
    // then let CSS handle the visual overflow.
    if (previewText.length > 300) {
        previewText = previewText.slice(0, 300) + "...";
    }

    // Render Markdown
    const renderMarkdown = () => {
        try {
            const rawHtml = marked.parse(previewText, { breaks: true, gfm: true });
            return { __html: DOMPurify.sanitize(rawHtml) };
        } catch (e) {
            return { __html: previewText };
        }
    };

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

    // Context menu for card
    const { showContextMenu, getCardMenuItems } = useContextMenu();

    const handleContextMenu = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        const menuItems = getCardMenuItems(data, {
            onCopy: async () => {
                const textToCopy = data.data?.messages?.[data.data.messages.length - 1]?.content || '';
                const text = typeof textToCopy === 'string' ? textToCopy : '';
                try { await navigator.clipboard.writeText(text); } catch (err) { console.error(err); }
            },
            onDelete: () => onDelete && onDelete(data.id),
            onToggleFavorite: () => { /* TODO: implement if needed */ },
            onExpand: () => onExpand && onExpand(data.id),
            onCustomSprout: () => onCustomSprout && onCustomSprout(data.id),
            onConnect: () => onConnect && onConnect(data.id),
            onSetColor: (color) => {
                if (onUpdate) {
                    onUpdate(data.id, { cardColor: color });
                }
            },
            isFavorite: false
        });

        showContextMenu(e.clientX, e.clientY, menuItems);
    }, [data, onDelete, onExpand, onConnect, onUpdate, showContextMenu, getCardMenuItems]);

    return (
        <div
            ref={cardRef}
            className={`absolute w-[calc(100vw-2rem)] xs:w-[300px] sm:w-[320px] rounded-3xl flex flex-col select-none pointer-events-auto group transition-all duration-300
                glass-card
                ${isSafari || isIOS ? 'bg-white/90 dark:bg-slate-900/90' : ''}
                ${isDragging ? 'shadow-2xl scale-[1.02] cursor-grabbing z-[100]' : 'cursor-grab hover:glass-card-hover'}
                ${isSelected ? 'card-sharp-selected ring-2 ring-brand-500/50' : 'hover:border-brand-300/50 dark:hover:border-white/20'}
                ${isConnecting && !isConnectionStart ? 'hover:ring-4 hover:ring-green-400/30 hover:cursor-crosshair' : ''}
                ${isDragOver ? 'ring-2 ring-brand-500 scale-[1.02] bg-brand-50/80 dark:bg-brand-900/20' : ''}`}
            style={{
                left: data.x,
                top: data.y,
                zIndex: zIndex,
                willChange: isDragging ? 'left, top' : 'auto'
            }}
            onDragStart={handleDragStart}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStartWithDoubleTap}
            onDoubleClick={(e) => { e.stopPropagation(); onExpand(data.id); }}
            onContextMenu={handleContextMenu}

            onDrop={handleCardDrop}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
        >
            {/* Top Bar - Model + Buttons */}
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 max-w-[60%]">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${isSelected ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate font-sans tracking-wide" title={cardContent.title}>
                        {cardContent.title || 'New Conversation'}
                    </div>
                </div>
                <div className="flex gap-1 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                        onClick={handleCopy}
                        className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-white/5 rounded-lg transition-all"
                        title="Copy response"
                    >
                        <Copy size={13} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onConnect(data.id); }}
                        className="p-1.5 text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-white/5 rounded-lg transition-all"
                        title="Create connection"
                    >
                        <Link size={13} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onExpand(data.id); }}
                        className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-white/5 rounded-lg transition-all"
                        title="Expand"
                    >
                        <Maximize2 size={13} />
                    </button>
                </div>
            </div>

            <div className="px-5 py-3 h-40 overflow-hidden relative">
                <div
                    className="prose prose-xs dark:prose-invert max-w-none 
                        text-slate-600 dark:text-slate-300 
                        leading-relaxed 
                        prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0
                        font-sans select-none pointer-events-none" // pointer-events-none ensures drag works over text
                    dangerouslySetInnerHTML={renderMarkdown()}
                >
                </div>
                <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-white via-white/80 dark:from-slate-900 dark:via-slate-900/80 to-transparent pointer-events-none rounded-b-3xl"></div>
            </div>

            {
                data.type === 'image_gen' && (
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
                )
            }

            <div className="px-4 py-2 text-[10px] text-slate-500 flex justify-between items-center border-t border-white/5">
                <span className="font-medium bg-white/5 px-2 py-0.5 rounded-full">{messages.length} messages</span>
                <span className="flex items-center gap-1 font-semibold text-brand-500/70 truncate max-w-[120px]" title={cardContent.model}>
                    <Sparkles size={8} />
                    {cardContent.model?.split('/').pop() || 'AI'}
                </span>
            </div>

            {/* AI Summary Label - Floating Left with Connector */}
            {data.summary && (
                <div
                    className="absolute right-full top-6 mr-6 w-72 pointer-events-none select-none transition-opacity duration-500 animate-slide-up group-hover:opacity-100"
                    style={{ opacity: isDragging ? 0 : 1 }}
                >
                    <div className="flex items-start justify-end relative">
                        {/* Text Container */}
                        <div className="flex flex-col items-end text-right">
                            {/* Title - Large, Thin, Elegant - Intent Focus */}
                            <div className="text-4xl text-slate-800 dark:text-slate-100 font-thin tracking-wide leading-none mb-4 opacity-90 font-sans whitespace-nowrap">
                                {data.summary.title}
                            </div>

                            {/* Summary Lines - Precise, Mono, Technical feel */}
                            <div className="space-y-2 py-3 pr-2 border-r-[0.5px] border-slate-300 dark:border-white/20 ">
                                {data.summary.summary.split('\n').map((line, i) => (
                                    <div key={i} className="text-[11px] text-slate-500 dark:text-slate-400 font-mono leading-tight flex justify-end gap-2 opacity-60">
                                        <span>{line.replace(/^[•-]\s*/, '')}</span>
                                        {/* <span className="text-brand-300 dark:text-brand-700 select-none">•</span> */}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Visual Connector - Curved Line to Card */}
                        <svg className="absolute -right-6 top-6 w-6 h-12 pointer-events-none overflow-visible" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M -20 10 C 0 10, 0 10, 24 10" // Simple straight connector for cleaner look, or curve
                                stroke="currentColor"
                                strokeWidth="0.5"
                                fill="none"
                                className="text-slate-300 dark:text-white/20"
                            />
                            <circle cx="-20" cy="10" r="1.5" className="fill-brand-500" />
                        </svg>
                    </div>
                </div>
            )}
        </div >
    );
});

export default Card;

// Local Loader Compatibility
if (typeof window !== 'undefined') window.Card = Card;
