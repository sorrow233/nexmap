import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Maximize2, Link, ArrowRight, Copy, Sparkles, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { formatTime } from '../utils/format';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { isSafari, isIOS } from '../utils/browser';

import { useStore } from '../store/useStore';
import { useDraggable } from '../hooks/useDraggable';
import { useContextMenu } from './ContextMenu';
import { useLanguage } from '../contexts/LanguageContext';

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
    onCustomSprout, // NEW,
    onSummarize // NEW: Manual trigger for testing
}) {
    const { t } = useLanguage();
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
            className={`absolute w-[calc(100vw-2rem)] xs:w-[300px] sm:w-[320px] rounded-3xl flex flex-col select-none pointer-events-auto group 
                ${isDragging ? 'transition-none duration-0 shadow-2xl scale-[1.02] cursor-grabbing z-[100]' : 'transition-all duration-300 cursor-grab hover:glass-card-hover'}
                glass-card
                ${isSafari || isIOS ? 'bg-white/90 dark:bg-slate-900/90' : ''}
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
            {/* Quick Actions (Absolute Top Right) - Fade in on hover */}
            <div className="absolute top-4 right-4 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                    onClick={(e) => { e.stopPropagation(); onSummarize && onSummarize(data.id); }}
                    className="p-1.5 text-slate-400 hover:text-violet-500 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-all"
                    title={t.card?.aiSummary || "Generate AI Summary"}
                >
                    <Sparkles size={14} />
                </button>
                <button
                    onClick={handleCopy}
                    className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-all"
                    title={t.card?.copyResponse || "Copy response"}
                >
                    <Copy size={14} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onConnect(data.id); }}
                    className="p-1.5 text-slate-400 hover:text-green-500 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-all"
                    title={t.card?.createConnection || "Create connection"}
                >
                    <Link size={14} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onExpand(data.id); }}
                    className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-all"
                    title={t.card?.expand || "Expand"}
                >
                    <Maximize2 size={14} />
                </button>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex flex-col h-full relative overflow-hidden p-6 pb-4">

                {/* 1. HERO TITLE (Top ~1/3) */}
                {/* Use AI Title if available, else Card Title */}
                <div className="mb-4 pr-4 relative z-10 w-full">
                    <div className="text-[10px] font-bold text-slate-400/70 uppercase tracking-widest mb-1">
                        {data.summary ? 'Topic' : 'Conversation'}
                    </div>
                    <h3 className="text-3xl font-thin leading-none tracking-wide text-slate-800 dark:text-slate-100 font-sans break-words">
                        {(data.summary?.title || cardContent.title || 'Untitled')
                            .replace(/^#+\s*/, '')
                            .replace(/\*\*/g, '')
                            .replace(/__/, '')
                            .replace(/^\d+\.\s*/, '') // Remove numbering for cleaner look
                            .trim()}
                    </h3>
                </div>

                {/* 2. FADED CONTENT (Bottom ~2/3) */}
                {/* Use AI Summary lines if available, else PreviewText */}
                <div className="flex-1 min-h-[80px] relative z-10">
                    {data.summary ? (
                        <div className="space-y-2 p-3 bg-violet-50/50 dark:bg-violet-900/10 rounded-xl border border-violet-100/50 dark:border-violet-500/10 transition-all hover:bg-violet-50 dark:hover:bg-violet-900/20">
                            {data.summary.summary.split('\n').map((line, i) => (
                                <div key={i} className="text-[11px] text-violet-900/70 dark:text-violet-200/70 font-mono leading-tight flex items-start gap-2">
                                    <Sparkles size={10} className="mt-0.5 shrink-0 opacity-40 text-violet-500" />
                                    <span>{line.replace(/^[•-]\s*/, '')}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div
                            className="text-sm font-light text-slate-600 dark:text-slate-400 leading-relaxed opacity-60 line-clamp-4 font-sans"
                            style={{ maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)' }}
                        >
                            {/* Render plain text preview but with better typography */}
                            {previewText}
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-white/5 flex justify-between items-center text-[10px] text-slate-400/60 font-medium z-10">
                    <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                        {formatTime(cardContent.timestamp || Date.now())}
                    </span>
                    <span className="flex items-center gap-1 uppercase tracking-wider">
                        <Sparkles size={8} />
                        {cardContent.model?.split('/').pop() || 'AI'}
                    </span>
                </div>

                {/* Ambient Gradient Background for visual depth */}
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-brand-500/5 dark:bg-brand-400/5 blur-3xl rounded-full pointer-events-none"></div>

            </div>

            {/* Image Gen Handling (Special Case - Keep existing logic but integrated?) 
                 For now, if it's image gen, we might want to overlay the image? 
                 Let's keep text hierarchy first. If image exists, maybe show small thumbnail or background?
                 User asked for text hierarchy. Let's stick to that. 
                 If image card, the previewText usually describes prompt.
             */}
            {data.type === 'image_gen' && cardContent.imageUrl && (
                <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
                    <img src={cardContent.imageUrl} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/90 to-white/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-900/40"></div>
                </div>
            )}

        </div >
    );
});

export default Card;

// Local Loader Compatibility
if (typeof window !== 'undefined') window.Card = Card;
