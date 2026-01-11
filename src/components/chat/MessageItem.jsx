import React, { useState, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { useStore } from '../../store/useStore';
import { marked } from 'marked';
import { Share2, Star, ChevronDown, ChevronUp, Sprout, GitBranch, Copy, Check, ExternalLink } from 'lucide-react';
import { linkageService } from '../../services/linkageService';
import MessageImage from './MessageImage';
import { useFluidTypewriter } from '../../hooks/useFluidTypewriter';
import DOMPurify from 'dompurify';
import CodeBlock from './CodeBlock';

// Configure marked to use placeholder for code blocks
const codeBlockPlaceholder = '___CODE_BLOCK_PLACEHOLDER_';
let codeBlockCounter = 0;
let codeBlocks = [];

const markedRenderer = new marked.Renderer();
markedRenderer.code = function (code, language) {
    const id = codeBlockCounter++;
    codeBlocks.push({ id, code, language });
    return `<div data-code-block-id="${id}"></div>`;
};

// Component to render message content with code blocks as React components
const MessageContentWithCodeBlocks = React.memo(({ html, codeBlocks, onClick }) => {
    const containerRef = React.useRef(null);

    // Parse HTML and split by code block placeholders
    const parts = React.useMemo(() => {
        if (!html) return [];

        const result = [];
        let lastIndex = 0;
        const regex = /<div data-code-block-id="(\d+)"><\/div>/g;
        let match;

        while ((match = regex.exec(html)) !== null) {
            // Add HTML before this code block
            if (match.index > lastIndex) {
                result.push({
                    type: 'html',
                    content: html.slice(lastIndex, match.index)
                });
            }

            // Add code block
            const blockId = parseInt(match[1], 10);
            const block = codeBlocks.find(b => b.id === blockId);
            if (block) {
                result.push({
                    type: 'code',
                    code: block.code,
                    language: block.language
                });
            }

            lastIndex = match.index + match[0].length;
        }

        // Add remaining HTML
        if (lastIndex < html.length) {
            result.push({
                type: 'html',
                content: html.slice(lastIndex)
            });
        }

        return result;
    }, [html, codeBlocks]);

    return (
        <div
            className="font-sans break-words"
            style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
            onClick={onClick}
        >
            {parts.map((part, index) => (
                part.type === 'html' ? (
                    <span
                        key={index}
                        dangerouslySetInnerHTML={{ __html: part.content }}
                    />
                ) : (
                    <CodeBlock
                        key={index}
                        code={part.code}
                        language={part.language}
                    />
                )
            ))}
        </div>
    );
});

MessageContentWithCodeBlocks.displayName = 'MessageContentWithCodeBlocks';

// 用户消息折叠阈值
const USER_MSG_MAX_LENGTH = 200;

const MessageItem = React.memo(({ message, index, marks, capturedNotes, parseModelOutput, isStreaming, handleRetry, onShare, onToggleFavorite, isFavorite, onContinueTopic, onBranch }) => {
    const isUser = message.role === 'user';
    // Use getState() instead of subscribing to entire cards array to prevent re-renders
    const focusOnCard = useStore(state => state.focusOnCard);

    // 长文本折叠状态
    const [isExpanded, setIsExpanded] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(textContent);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    };

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
        if (!cnt) return { html: '', codeBlocksData: [] };

        // Reset code block tracking for this render
        codeBlockCounter = 0;
        codeBlocks = [];

        let html = marked ? marked.parse(cnt, { renderer: markedRenderer }) : cnt;
        const capturedCodeBlocks = [...codeBlocks];

        if ((!currentMarks || currentMarks.length === 0) && (!currentNotes || currentNotes.length === 0)) {
            return { html, codeBlocksData: capturedCodeBlocks };
        }

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
        return { html: container.innerHTML, codeBlocksData: capturedCodeBlocks };
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

    const { renderedHtml, codeBlocksToRender } = React.useMemo(() => {
        if (isUser) return { renderedHtml: null, codeBlocksToRender: [] };
        const result = content ? renderMessageContent(content, marks, capturedNotes) : { html: '', codeBlocksData: [] };
        return {
            renderedHtml: resolveCardReferences(result.html),
            codeBlocksToRender: result.codeBlocksData
        };
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
        <div id={`message-${index}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up group relative`}>
            {isUser && (
                <div className="flex flex-col justify-end pb-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={handleCopy}
                        className={`p-2 rounded-full transition-all ring-1 ring-inset ${copySuccess
                            ? 'text-emerald-500 bg-emerald-50/80 ring-emerald-200 dark:bg-emerald-500/20 dark:ring-emerald-500/40'
                            : 'text-slate-400 hover:text-emerald-500 bg-white/50 hover:bg-emerald-50 ring-transparent hover:ring-emerald-200 dark:bg-white/5 dark:hover:bg-emerald-500/10'}`}
                        title="Copy message"
                    >
                        {copySuccess ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                </div>
            )}
            <div className={`rounded-3xl p-6 shadow-sm relative ${isUser
                ? 'max-w-[85%] sm:max-w-[75%] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tr-none'
                : 'w-full max-w-full bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 text-slate-800 dark:text-slate-200 rounded-tl-none'
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
                        <MessageContentWithCodeBlocks
                            html={DOMPurify.sanitize(renderedHtml, { ADD_ATTR: ['data-code-block-id'] })}
                            codeBlocks={codeBlocksToRender}
                            onClick={handleMessageClick}
                        />
                    )}
                </div>

                {/* Action Bar (Share, etc.) */}
                {!isUser && !isStreaming && content && !content.includes("⚠️ Error") && (
                    <div className="mt-4 pt-2 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => onToggleFavorite && onToggleFavorite(index, textContent)}
                            className={`p-2 rounded-full transition-all ring-1 ring-inset ${isFavorite
                                ? 'text-orange-500 bg-orange-50/80 ring-orange-200 dark:bg-orange-500/20 dark:ring-orange-500/40'
                                : 'text-slate-400 hover:text-orange-500 bg-slate-50/50 hover:bg-orange-50 ring-transparent hover:ring-orange-200 dark:bg-white/5 dark:hover:bg-orange-500/10'}`}
                            title={isFavorite ? "Unfavorite" : "Favorite Message"}
                        >
                            <Star size={16} fill={isFavorite ? "currentColor" : "none"} />
                        </button>
                        <button
                            onClick={handleCopy}
                            className={`p-2 rounded-full transition-all ring-1 ring-inset ${copySuccess
                                ? 'text-emerald-500 bg-emerald-50/80 ring-emerald-200 dark:bg-emerald-500/20 dark:ring-emerald-500/40'
                                : 'text-slate-400 hover:text-emerald-500 bg-slate-50/50 hover:bg-emerald-50 ring-transparent hover:ring-emerald-200 dark:bg-white/5 dark:hover:bg-emerald-500/10'}`}
                            title="Copy text to clipboard"
                        >
                            {copySuccess ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                        <button
                            onClick={() => onShare && onShare(textContent)}
                            className="p-2 rounded-full text-slate-400 hover:text-blue-500 bg-slate-50/50 hover:bg-blue-50 ring-1 ring-transparent hover:ring-blue-200 dark:bg-white/5 dark:hover:bg-blue-500/10 transition-all ring-inset"
                            title="Share as Image"
                        >
                            <Share2 size={16} />
                        </button>
                        {onContinueTopic && (
                            <button
                                onClick={() => onContinueTopic()}
                                className="p-2 rounded-full text-teal-600 hover:text-teal-700 bg-teal-50/50 hover:bg-teal-100 ring-1 ring-transparent hover:ring-teal-200 dark:bg-teal-500/10 dark:hover:bg-teal-500/20 transition-all ring-inset"
                                title="Sprout - Continue conversation"
                            >
                                <Sprout size={16} />
                            </button>
                        )}
                        {onBranch && (
                            <button
                                onClick={() => onBranch()}
                                className="p-2 rounded-full text-violet-600 hover:text-violet-700 bg-violet-50/50 hover:bg-violet-100 ring-1 ring-transparent hover:ring-violet-200 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 transition-all ring-inset"
                                title="Branch - Extract to card"
                            >
                                <GitBranch size={16} />
                            </button>
                        )}
                        <button
                            onClick={() => linkageService.sendToExternalProject(textContent)}
                            className="p-2 rounded-full text-teal-600 hover:text-teal-700 bg-teal-50/50 hover:bg-teal-100 ring-1 ring-transparent hover:ring-teal-200 dark:bg-teal-500/10 dark:hover:bg-teal-500/20 transition-all ring-inset"
                            title="Send to FlowStudio"
                        >
                            <ExternalLink size={16} />
                        </button>
                    </div>
                )}

                {/* Retry Button (only for assistant messages with error content) */}
                {!isUser && !isStreaming && content && (
                    content.includes("⚠️") && (content.includes("Error") || content.includes("失败") || content.includes("不可用") || content.includes("超时") || content.includes("用完"))
                ) && (
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
