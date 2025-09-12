import React, { useState, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { marked } from 'marked';
import { Share2, Star, ChevronDown, ChevronUp, Sprout } from 'lucide-react';
import MessageImage from './MessageImage';
import { useFluidTypewriter } from '../../hooks/useFluidTypewriter';
import DOMPurify from 'dompurify';

// 用户消息折叠阈值
const USER_MSG_MAX_LENGTH = 200;

const MessageItem = React.memo(({ message, index, marks, capturedNotes, parseModelOutput, isStreaming, handleRetry, onShare, onToggleFavorite, isFavorite, onQuickSprout }) => {
    const isUser = message.role === 'user';
    // Use getState() instead of subscribing to entire cards array to prevent re-renders
    const focusOnCard = useStore(state => state.focusOnCard);
    const contentRef = React.useRef(null);

    // 长文本折叠状态
    const [isExpanded, setIsExpanded] = useState(false);

    let textContent = "";
    let msgImages = [];

    if (Array.isArray(message.content)) {
        message.content.forEach(part => {
            if (part.type === 'text') textContent += part.text;
            if (part.type === 'image') msgImages.push(part);
        });
    } else {
        textContent = message.content || "";
    }

    // Apply fluid typewriter effect for assistant messages while streaming
    const rawFluidText = useFluidTypewriter(textContent, !isUser && isStreaming);

    // "Gray Tail" Effect Logic
    const finalDisplayContent = React.useMemo(() => {
        if (isUser || !isStreaming || !rawFluidText) return rawFluidText || textContent;
        if (rawFluidText === textContent) return rawFluidText; // Finished streaming

        const tailLength = 5; // Number of characters to fade
        if (rawFluidText.length <= tailLength) return rawFluidText;

        // Safety checks to avoid breaking Markdown/Code blocks
        const backtickCount = (rawFluidText.match(/`/g) || []).length;
        const isInsideCodeBlock = backtickCount % 2 !== 0; // Odd number of backticks means we are inside one

        // Also avoid breaking partial HTML tags or complex markdown if near the end
        // Simple heuristic: don't apply if near `<`, `[`, or `(`
        const lastChar = rawFluidText.slice(-1);
        const unsafeChars = ['<', '>', '`', '[', ']', '(', ')', '*', '_', '#'];

        if (isInsideCodeBlock || unsafeChars.includes(lastChar)) {
            return rawFluidText;
        }

        const mainPart = rawFluidText.slice(0, -tailLength);
        const tailPart = rawFluidText.slice(-tailLength);

        // We wrap the tail in a transparent-to-opaque span illusion
        return `${mainPart}<span class="text-slate-400 dark:text-slate-500 opacity-70">${tailPart}</span>`;
    }, [rawFluidText, isUser, isStreaming, textContent]);

    const { thoughts, content } = (isUser || !finalDisplayContent)
        ? { thoughts: null, content: finalDisplayContent }
        : parseModelOutput(finalDisplayContent);

    // Helper to render content with highlights safely
    const renderMessageContent = (cnt, currentMarks, currentNotes) => {
        if (!cnt) return '';
        let html = marked ? marked.parse(cnt) : cnt;

        if ((!currentMarks || currentMarks.length === 0) && (!currentNotes || currentNotes.length === 0)) return html;

        // Sort marks by length descending to match longest phrases first
        const sortedMarks = currentMarks ? [...currentMarks].sort((a, b) => b.length - a.length) : [];
        const sortedNotes = currentNotes ? [...currentNotes].sort((a, b) => b.length - a.length) : [];

        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
        const container = doc.body.firstChild;

        const highlightNode = (node) => {
            if (node.nodeType === 3) { // Text node
                let text = node.nodeValue;
                let hasChange = false;
                let newHtml = text;

                sortedMarks.forEach(mark => {
                    const escapedMark = mark.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`(${escapedMark})`, 'gi');
                    // Avoid matching inside already replaced tags if possible, but simplest is plain replace
                    // Note: This simple replacement might break if marks overlap or are nested ideally.
                    // Given the simple use case, we proceed.
                    if (regex.test(newHtml)) {
                        newHtml = newHtml.replace(regex, '___MARK_START___$1___MARK_END___');
                        hasChange = true;
                    }
                });

                sortedNotes.forEach(note => {
                    const escapedNote = note.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    // We need a regex that matches the text BUT NOT if it is part of our special tags
                    // However, `newHtml` here contains special tags.
                    // If we just replace, we might replace part of a tag.
                    // E.g. "MARK" is in ___MARK_START___.
                    // We should use a regex that matches word boundaries or ensure we don't match tags.
                    // But tags are UPPERCASE with underscores.
                    // As long as user text doesn't look like ___MARK_START___ we describe.
                    const regex = new RegExp(`(${escapedNote})`, 'gi');
                    if (regex.test(newHtml)) {
                        // Check if the match is inside a tag? No, assume text.
                        newHtml = newHtml.replace(regex, '___NOTE_START___$1___NOTE_END___');
                        hasChange = true;
                    }
                });

                if (hasChange) {
                    const span = doc.createElement('span');
                    const escapedText = newHtml
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/___MARK_START___/g, '<mark class="bg-yellow-200/60 dark:bg-yellow-500/30 text-inherit px-1 rounded-sm border-b border-yellow-400/50">')
                        .replace(/___MARK_END___/g, '</mark>')
                        .replace(/___NOTE_START___/g, '<span class="border-b-[1.5px] border-dashed border-slate-400/60 dark:border-slate-400/50 decoration-slate-400/30">')
                        .replace(/___NOTE_END___/g, '</span>');
                    span.innerHTML = escapedText;
                    node.parentNode.replaceChild(span, node);
                }
            } else if (node.nodeType === 1 && node.tagName !== 'MARK') {
                Array.from(node.childNodes).forEach(highlightNode);
            }
        };

        Array.from(container.childNodes).forEach(highlightNode);
        return container.innerHTML;
    };

    // Card Reference Resolution Logic
    const resolveCardReferences = (html) => {
        if (!html) return '';

        // Regex to match UUID: [xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx]
        // This regex looks for UUIDs optionally wrapped in brackets
        const uuidRegex = /\[?([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\]?/gi;

        // Use getState() to avoid re-renders from cards array changes
        const cards = useStore.getState().cards;

        return html.replace(uuidRegex, (match, id) => {
            const card = cards.find(c => c.id === id);
            if (card) {
                const title = card.data?.title || "Untitled Card";
                // Return a styled link-like span with z-index and pointer-events
                return `<span class="card-ref-link relative z-10 text-brand-500 font-bold cursor-pointer hover:underline bg-brand-500/5 px-1.5 py-0.5 rounded-md border border-brand-500/10 shadow-sm transition-all hover:bg-brand-500/10 active:scale-95" data-card-id="${id}" style="pointer-events: auto !important;">@${title}</span>`;
            }
            return match;
        });
    };

    const renderedHtml = React.useMemo(() => {
        if (isUser) return null;
        const html = content ? renderMessageContent(content, marks, capturedNotes) : '';
        return resolveCardReferences(html);
    }, [content, marks, capturedNotes, isUser]);

    const handleMessageClick = (e) => {
        const link = e.target.closest('.card-ref-link');
        if (link) {
            const cardId = link.getAttribute('data-card-id');
            console.log('[DEBUG] Card click caught by handleMessageClick, ID:', cardId);
            if (cardId) {
                focusOnCard(cardId);

                const { setExpandedCardId } = useStore.getState();
                if (setExpandedCardId) {
                    console.log('[DEBUG] Auto-closing modal to show focus');
                    setExpandedCardId(null);
                }
            }
        }
    };

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            <div className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-6 shadow-sm group relative ${isUser
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tr-none'
                : 'bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 text-slate-800 dark:text-slate-200 rounded-tl-none'
                }`}>

                {/* Images in Message (User) */}
                {msgImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {msgImages.map((img, idx) => (
                            <div key={idx} className="relative group/mimg">
                                <MessageImage img={img} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Thoughts/Thinking Block */}
                {thoughts && (
                    <div className="mb-4">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                            Thinking Process
                        </div>
                        <div className="text-slate-500 text-sm italic border-l-2 border-slate-200 dark:border-slate-700 pl-4 py-1 leading-relaxed bg-slate-50/50 dark:bg-black/20 rounded-r-lg">
                            {thoughts}
                        </div>
                    </div>
                )}


                {/* Message Content */}
                <div
                    className="prose prose-slate dark:prose-invert max-w-none leading-loose text-[1.05rem]"
                    ref={contentRef}
                    onClick={handleMessageClick}
                >
                    {isUser ? (
                        <div className="font-sans break-words" style={{ overflowWrap: 'anywhere' }}>
                            {/* 用户消息折叠功能 */}
                            {textContent.length > USER_MSG_MAX_LENGTH ? (
                                <>
                                    <div className="whitespace-pre-wrap break-words" style={{ overflowWrap: 'anywhere' }}>
                                        {isExpanded ? textContent : textContent.slice(0, USER_MSG_MAX_LENGTH) + '...'}
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsExpanded(!isExpanded);
                                        }}
                                        className="mt-2 flex items-center gap-1 text-xs text-slate-400 hover:text-brand-500 transition-colors"
                                    >
                                        {isExpanded ? (
                                            <>
                                                <ChevronUp size={14} />
                                                <span>收起</span>
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown size={14} />
                                                <span>展开全部 ({textContent.length} 字符)</span>
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <div className="whitespace-pre-wrap break-words" style={{ overflowWrap: 'anywhere' }}>{textContent}</div>
                            )}
                        </div>
                    ) : (
                        <div
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderedHtml) }}
                            className="font-sans break-words"
                            style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                        />
                    )}
                </div>

                {/* Action Bar (Share, etc.) */}
                {!isUser && !isStreaming && content && !content.includes("⚠️ Error") && (
                    <div className="mt-4 pt-2 border-t border-slate-100 dark:border-white/5 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => onToggleFavorite && onToggleFavorite(index, textContent)}
                            className={`text-xs font-bold flex items-center gap-1 px-3 py-1.5 rounded-full transition-all ${isFavorite ? 'text-orange-400 bg-orange-50 dark:bg-orange-500/10' : 'text-slate-400 hover:text-orange-400 bg-slate-50 dark:bg-white/5 hover:bg-orange-50 dark:hover:bg-white/10'}`}
                            title={isFavorite ? "Unfavorite" : "Favorite Message"}
                        >
                            <Star size={14} fill={isFavorite ? "currentColor" : "none"} />
                            <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>
                        </button>
                        <button
                            onClick={() => onShare && onShare(textContent)}
                            className="text-xs font-bold text-slate-400 hover:text-brand-500 flex items-center gap-1 bg-slate-50 dark:bg-white/5 hover:bg-brand-50 dark:hover:bg-brand-500/10 px-3 py-1.5 rounded-full transition-all"
                            title="Share as Image"
                        >
                            <Share2 size={14} />
                            <span>Share</span>
                        </button>
                        {onQuickSprout && (
                            <button
                                onClick={() => onQuickSprout()}
                                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-3 py-1.5 rounded-full transition-all"
                                title="Quick Sprout - Generate 3 related cards"
                            >
                                <Sprout size={14} />
                                <span>Sprout</span>
                            </button>
                        )}
                    </div>
                )}

                {/* Retry Button (only for assistant and if it's an error or last message) */}
                {!isUser && !isStreaming && content && content.includes("⚠️ Error") && (
                    <div className="mt-3 pt-3 border-t border-red-100 dark:border-red-900/30 flex justify-end">
                        <button
                            onClick={handleRetry}
                            className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 bg-red-50 dark:bg-red-900/10 px-3 py-1.5 rounded-full transition-colors"
                        >
                            Retry Generation
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

export default MessageItem;
