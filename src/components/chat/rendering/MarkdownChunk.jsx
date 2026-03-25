import React from 'react';
import { useStore } from '../../../store/useStore';
import CodeBlock from '../CodeBlock';
import {
    createMarkdownRenderer,
    parseMarkdown,
    sanitizeMarkdownHtml
} from '../../../utils/markdownRenderer';
import { MESSAGE_CHUNK_LAZY_ROOT_MARGIN } from './useMessageChunks';

let codeBlockCounter = 0;
let codeBlocks = [];

const escapeHtmlFragment = (text = '') => (
    String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
);

const markedRenderer = createMarkdownRenderer();
markedRenderer.code = function (code, language) {
    const id = codeBlockCounter++;
    codeBlocks.push({ id, code, language });
    return `<div data-code-block-id="${id}"></div>`;
};

const highlightHtmlContent = (html = '', marks = [], capturedNotes = []) => {
    if ((!marks || marks.length === 0) && (!capturedNotes || capturedNotes.length === 0)) {
        return html;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const container = doc.body.firstChild;
    if (!container) return html;

    const sortedMarks = Array.isArray(marks)
        ? [...marks].sort((left, right) => right.length - left.length)
        : [];
    const sortedNotes = Array.isArray(capturedNotes)
        ? [...capturedNotes].sort((left, right) => right.length - left.length)
        : [];

    const highlightNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.nodeValue;
            let hasChange = false;
            let nextHtml = text;

            sortedMarks.forEach((mark) => {
                const escapedMark = mark.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(${escapedMark})`, 'gi');
                if (regex.test(nextHtml)) {
                    nextHtml = nextHtml.replace(regex, '___MARK_START___$1___MARK_END___');
                    hasChange = true;
                }
            });

            sortedNotes.forEach((note) => {
                const escapedNote = note.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(${escapedNote})`, 'gi');
                if (regex.test(nextHtml)) {
                    nextHtml = nextHtml.replace(regex, '___NOTE_START___$1___NOTE_END___');
                    hasChange = true;
                }
            });

            if (!hasChange) {
                return;
            }

            const span = doc.createElement('span');
            const escapedText = nextHtml
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/___MARK_START___/g, '<mark class="bg-yellow-200/60 dark:bg-yellow-500/30 text-inherit px-1 rounded-sm border-b border-yellow-400/50">')
                .replace(/___MARK_END___/g, '</mark>')
                .replace(/___NOTE_START___/g, '<span class="border-b-[1.5px] border-dashed border-slate-400/60 dark:border-slate-400/50 decoration-slate-400/30">')
                .replace(/___NOTE_END___/g, '</span>');

            span.innerHTML = escapedText;
            node.parentNode.replaceChild(span, node);
            return;
        }

        if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'MARK') {
            Array.from(node.childNodes).forEach(highlightNode);
        }
    };

    Array.from(container.childNodes).forEach(highlightNode);
    return container.innerHTML;
};

const resolveCardReferences = (html = '') => {
    if (!html) return '';

    const uuidRegex = /\[?([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\]?/gi;
    const cardMap = useStore.getState().getCardMap?.() || new Map();

    return html.replace(uuidRegex, (match, id) => {
        const card = cardMap.get(id);
        if (!card) {
            return match;
        }

        const title = card.data?.title || 'Untitled Card';
        return `<span class="card-ref-link relative z-10 text-brand-500 font-bold cursor-pointer hover:underline bg-brand-500/5 px-1.5 py-0.5 rounded-md border border-brand-500/10 shadow-sm transition-all hover:bg-brand-500/10 active:scale-95" data-card-id="${id}" style="pointer-events: auto !important;">@${title}</span>`;
    });
};

const splitHtmlIntoParts = (html = '', chunk = {}) => {
    if (!html) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const container = doc.body.firstChild;
    if (!container) return [];

    const blocksById = new Map(codeBlocks.map((block) => [block.id, block]));

    return Array.from(container.childNodes).reduce((parts, node, index) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const textContent = node.textContent?.trim();
            if (!textContent) {
                return parts;
            }

            parts.push({
                id: `${chunk.id}-text-${index}`,
                type: 'html',
                content: `<p>${escapeHtmlFragment(textContent)}</p>`
            });
            return parts;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return parts;
        }

        const element = /** @type {HTMLElement} */ (node);
        const blockIdAttr = element.getAttribute('data-code-block-id');
        if (blockIdAttr) {
            const blockId = parseInt(blockIdAttr, 10);
            const block = blocksById.get(blockId);
            if (block) {
                parts.push({
                    id: `${chunk.id}-code-${index}`,
                    type: 'code',
                    code: block.code,
                    language: block.language,
                    deferHighlight: chunk.deferCodeHighlight === true
                });
            }
            return parts;
        }

        parts.push({
            id: `${chunk.id}-html-${index}`,
            type: 'html',
            content: element.outerHTML
        });
        return parts;
    }, []);
};

const renderMarkdownChunk = (chunk, marks = [], capturedNotes = []) => {
    codeBlockCounter = 0;
    codeBlocks = [];

    const parsedHtml = parseMarkdown(chunk?.markdown || '', { renderer: markedRenderer });
    const highlightedHtml = highlightHtmlContent(parsedHtml, marks, capturedNotes);
    const decoratedHtml = resolveCardReferences(highlightedHtml);
    const sanitizedHtml = sanitizeMarkdownHtml(decoratedHtml, {
        ADD_ATTR: ['data-code-block-id']
    });

    return splitHtmlIntoParts(sanitizedHtml, chunk);
};

function MarkdownChunkComponent({
    chunk,
    marks = [],
    capturedNotes = [],
    shouldRenderImmediately = false
}) {
    const placeholderRef = React.useRef(null);
    const [isRendered, setIsRendered] = React.useState(shouldRenderImmediately);

    React.useEffect(() => {
        if (shouldRenderImmediately) {
            setIsRendered(true);
        }
    }, [shouldRenderImmediately]);

    React.useEffect(() => {
        if (isRendered || !placeholderRef.current) {
            return undefined;
        }

        if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') {
            setIsRendered(true);
            return undefined;
        }

        const root = placeholderRef.current.closest('.chat-messages-viewport');
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting) {
                    setIsRendered(true);
                    observer.disconnect();
                }
            },
            {
                root: root || null,
                threshold: 0.01,
                rootMargin: MESSAGE_CHUNK_LAZY_ROOT_MARGIN
            }
        );

        observer.observe(placeholderRef.current);
        return () => observer.disconnect();
    }, [isRendered]);

    const parts = React.useMemo(() => {
        if (!isRendered) {
            return [];
        }

        return renderMarkdownChunk(chunk, marks, capturedNotes);
    }, [capturedNotes, chunk, isRendered, marks]);

    if (!isRendered) {
        return (
            <div
                ref={placeholderRef}
                className="chat-message-chunk my-2"
                data-rendered="false"
            >
                <div
                    className="rounded-2xl border border-dashed border-slate-200/70 bg-slate-50/40 dark:border-white/8 dark:bg-white/[0.03]"
                    style={{ minHeight: `${chunk.estimatedMinHeight}px` }}
                >
                    <div className="px-4 py-3 text-[11px] tracking-wide text-slate-400 dark:text-slate-500">
                        滚动到这里时继续渲染...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="chat-message-chunk my-2"
            data-rendered="true"
            data-chunk-type={chunk.type}
        >
            {parts.map((part) => (
                part.type === 'html' ? (
                    <div
                        key={part.id}
                        className="chat-message-block"
                        dangerouslySetInnerHTML={{ __html: part.content }}
                    />
                ) : (
                    <div key={part.id} className="chat-message-block chat-message-block--code">
                        <CodeBlock
                            code={part.code}
                            language={part.language}
                            deferHighlight={part.deferHighlight}
                        />
                    </div>
                )
            ))}
        </div>
    );
}

const areMarkdownChunkPropsEqual = (prevProps, nextProps) => (
    prevProps.chunk === nextProps.chunk &&
    prevProps.marks === nextProps.marks &&
    prevProps.capturedNotes === nextProps.capturedNotes &&
    prevProps.shouldRenderImmediately === nextProps.shouldRenderImmediately
);

const MarkdownChunk = React.memo(MarkdownChunkComponent, areMarkdownChunkPropsEqual);

export default MarkdownChunk;
