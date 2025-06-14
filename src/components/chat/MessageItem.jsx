import React from 'react';
import { useStore } from '../../store/useStore';
import { marked } from 'marked';
import ErrorBoundary from '../ErrorBoundary';
import { getImageFromIDB } from '../../services/storage';

const MessageImage = ({ img }) => {
    const [imgSrc, setImgSrc] = React.useState(null);

    React.useEffect(() => {
        let active = true;
        const load = async () => {
            // 1. S3 URL (Primary)
            if (img.source?.s3Url) {
                if (active) setImgSrc(img.source.s3Url);
                return;
            }
            // 2. IDB (Async)
            if (img.source?.type === 'idb' && img.source.id) {
                const data = await getImageFromIDB(img.source.id);
                if (active && data) setImgSrc(`data:${img.source.media_type};base64,${data}`);
                return;
            }
            // 3. Base64 (Legacy/Fallback)
            if (img.source?.data) {
                if (active) setImgSrc(`data:${img.source.media_type};base64,${img.source.data}`);
            }
        };
        load();
        return () => { active = false; };
    }, [img]);

    if (!imgSrc) return <div className="h-32 w-32 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl border border-slate-200 dark:border-white/10" />;

    return (
        <img
            src={imgSrc}
            alt="Uploaded"
            className="h-32 w-auto rounded-xl border border-slate-200 dark:border-white/10"
            onError={(e) => {
                console.warn("Image load failed, trying fallbacks");
                // If S3 failed, try IDB or Base64 fallback if available
                if (img.source?.s3Url) {
                    if (img.source?.type === 'idb' && img.source.id) {
                        getImageFromIDB(img.source.id).then(data => {
                            if (data) e.target.src = `data:${img.source.media_type};base64,${data}`;
                        });
                    } else if (img.source?.data) {
                        e.target.src = `data:${img.source.media_type};base64,${img.source.data}`;
                    }
                }
            }}
        />
    );
};

import { Share2, Star } from 'lucide-react';

/**
 * Physics-based "Fluid Typewriter" hook.
 * Instead of linear increments, this uses a spring-like ease-out function:
 * Speed is proportional to the distance left.
 * This creates a "pushing" effect where large chunks accelerate the text,
 * then it naturally slows down as it settles, feeling like water flowing.
 */
const useFluidTypewriter = (targetContent, isStreaming) => {
    const [displayedContent, setDisplayedContent] = React.useState(() => {
        return isStreaming ? '' : targetContent;
    });

    // Use a ref to track the float value of length for smoother math
    // (We only render integer substrings, but math needs floats)
    const currentLength = React.useRef(isStreaming ? 0 : targetContent.length);
    const frameRef = React.useRef();

    React.useEffect(() => {
        if (!isStreaming) {
            setDisplayedContent(targetContent);
            currentLength.current = targetContent.length;
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
            return;
        }

        const animate = () => {
            const targetLen = targetContent.length;
            const currentLen = currentLength.current;
            const diff = targetLen - currentLen;

            // Updated physics for "Flash" speed and liquid feel
            if (diff <= 0.5) {
                if (currentLen !== targetLen) {
                    currentLength.current = targetLen;
                    setDisplayedContent(targetContent);
                }
                frameRef.current = requestAnimationFrame(animate);
                return;
            }

            // High tension (0.8) for fast response, higher base (1.5) for constant flow
            const velocity = (diff * 0.8) + 1.5;

            currentLength.current += velocity;

            if (currentLength.current > targetLen) currentLength.current = targetLen;

            setDisplayedContent(targetContent.substring(0, Math.floor(currentLength.current)));
            frameRef.current = requestAnimationFrame(animate);
        };

        frameRef.current = requestAnimationFrame(animate);

        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [targetContent, isStreaming]);

    return displayedContent;
};

const MessageItem = React.memo(({ message, index, marks, capturedNotes, parseModelOutput, isStreaming, handleRetry, onShare, onToggleFavorite, isFavorite }) => {
    const isUser = message.role === 'user';
    const { cards, focusOnCard } = useStore();
    const contentRef = React.useRef(null);
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
    }, [content, marks, capturedNotes, isUser, cards]);

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
                        <div className="whitespace-pre-wrap font-sans">{textContent}</div>
                    ) : (
                        <div
                            dangerouslySetInnerHTML={{ __html: renderedHtml }}
                            className="font-sans"
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
