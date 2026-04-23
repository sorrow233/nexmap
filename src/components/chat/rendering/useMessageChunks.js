import React from 'react';

export const MESSAGE_CHUNK_INITIAL_CHAR_BUDGET = 12_000;
export const MESSAGE_CHUNK_MIN_INITIAL_COUNT = 2;
export const MESSAGE_CHUNK_MAX_INITIAL_COUNT = 6;
export const MESSAGE_CHUNK_LAZY_ROOT_MARGIN = '900px 0px';
export const MESSAGE_CHUNK_IDLE_WARMUP_BASE_DELAY_MS = 180;
export const MESSAGE_CHUNK_IDLE_WARMUP_STEP_DELAY_MS = 160;
export const MESSAGE_CHUNK_IDLE_WARMUP_MAX_DELAY_MS = 2200;
const SOFT_CHUNK_TARGET_CHARS = 4_000;
const SOFT_CHUNK_MAX_CHARS = 6_000;

const LIST_START_PATTERN = /^(\s*)([-*+]|\d+\.)\s+/;
const HEADING_PATTERN = /^\s{0,3}#{1,6}\s+/;
const QUOTE_PATTERN = /^\s{0,3}>\s?/;
const FENCE_PATTERN = /^\s*(```+|~~~+)/;
const RULE_PATTERN = /^\s{0,3}((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})\s*$/;

const isBlankLine = (line = '') => line.trim() === '';
const isHeadingLine = (line = '') => HEADING_PATTERN.test(line);
const isQuoteLine = (line = '') => QUOTE_PATTERN.test(line);
const isListStartLine = (line = '') => LIST_START_PATTERN.test(line);
const isFenceStartLine = (line = '') => FENCE_PATTERN.test(line);
const isRuleLine = (line = '') => RULE_PATTERN.test(line);
const isIndentedContinuation = (line = '') => /^\s{2,}\S/.test(line);

const normalizeMarkdown = (markdown = '') => String(markdown || '').replace(/\r\n?/g, '\n');

const estimateChunkHeight = (type, markdown = '') => {
    const textLength = markdown.length;
    const lineCount = markdown.split('\n').length;

    if (type === 'code') {
        return Math.min(1200, 120 + lineCount * 22);
    }

    if (type === 'list') {
        return Math.min(960, 96 + lineCount * 22);
    }

    if (type === 'quote') {
        return Math.min(900, 92 + lineCount * 22);
    }

    if (type === 'heading') {
        return 80 + Math.min(120, Math.ceil(textLength / 80) * 18);
    }

    if (type === 'rule') {
        return 44;
    }

    return Math.min(960, 72 + Math.ceil(textLength / 120) * 28);
};

const buildChunk = (type, lines, index) => {
    const markdown = lines.join('\n').trim();
    if (!markdown) return null;

    const lineCount = markdown.split('\n').length;
    const textLength = markdown.length;

    return {
        id: `${type}-${index}-${textLength}`,
        type,
        markdown,
        lineCount,
        textLength,
        estimatedMinHeight: estimateChunkHeight(type, markdown),
        deferCodeHighlight: type === 'code' && (textLength > 1800 || lineCount > 48)
    };
};

const shouldKeepCollectingList = (line = '') => (
    isBlankLine(line) || isListStartLine(line) || isIndentedContinuation(line)
);

const shouldKeepCollectingQuote = (line = '') => (
    isBlankLine(line) || isQuoteLine(line)
);

const isChunkBoundaryLine = (line = '') => (
    isHeadingLine(line) ||
    isQuoteLine(line) ||
    isListStartLine(line) ||
    isFenceStartLine(line) ||
    isRuleLine(line)
);

const findSoftSplitIndex = (text = '') => {
    if (text.length <= SOFT_CHUNK_MAX_CHARS) {
        return -1;
    }

    const hardLimit = Math.min(text.length, SOFT_CHUNK_MAX_CHARS);
    for (let index = hardLimit; index >= SOFT_CHUNK_TARGET_CHARS; index -= 1) {
        const char = text[index];
        if (char === '\n') {
            return index + 1;
        }
        if ('。！？.!?；;:：'.includes(char)) {
            return index + 1;
        }
    }

    for (let index = hardLimit; index >= SOFT_CHUNK_TARGET_CHARS; index -= 1) {
        const char = text[index];
        if ('，,、 '.includes(char)) {
            return index + 1;
        }
    }

    return hardLimit;
};

const splitParagraphMarkdown = (markdown = '') => {
    const pieces = [];
    let remaining = markdown.trim();

    while (remaining.length > SOFT_CHUNK_MAX_CHARS) {
        const splitIndex = findSoftSplitIndex(remaining);
        if (splitIndex <= 0) {
            break;
        }

        const nextPiece = remaining.slice(0, splitIndex).trim();
        if (nextPiece) {
            pieces.push(nextPiece);
        }
        remaining = remaining.slice(splitIndex).trim();
    }

    if (remaining) {
        pieces.push(remaining);
    }

    return pieces;
};

const splitListMarkdown = (markdown = '') => {
    const lines = markdown.split('\n');
    const itemGroups = [];
    let currentGroup = [];

    lines.forEach((line) => {
        if (isListStartLine(line) && currentGroup.length > 0) {
            itemGroups.push(currentGroup.join('\n'));
            currentGroup = [line];
            return;
        }

        currentGroup.push(line);
    });

    if (currentGroup.length > 0) {
        itemGroups.push(currentGroup.join('\n'));
    }

    const pieces = [];
    let currentPiece = '';

    itemGroups.forEach((group) => {
        const nextPiece = currentPiece ? `${currentPiece}\n${group}` : group;
        if (nextPiece.length > SOFT_CHUNK_MAX_CHARS && currentPiece) {
            pieces.push(currentPiece);
            currentPiece = group;
            return;
        }

        currentPiece = nextPiece;
    });

    if (currentPiece) {
        pieces.push(currentPiece);
    }

    // Keep list syntax stable. If a single list item is extremely long, we prefer a large
    // list chunk over cutting through the bullet marker and corrupting Markdown semantics.
    return pieces;
};

const splitQuoteMarkdown = (markdown = '') => {
    const lines = markdown.split('\n');
    const pieces = [];
    let currentPiece = [];

    lines.forEach((line) => {
        const nextPiece = [...currentPiece, line].join('\n');
        if (nextPiece.length > SOFT_CHUNK_MAX_CHARS && currentPiece.length > 0) {
            pieces.push(currentPiece.join('\n'));
            currentPiece = [line];
            return;
        }

        currentPiece.push(line);
    });

    if (currentPiece.length > 0) {
        pieces.push(currentPiece.join('\n'));
    }

    // Preserve quote markers. Splitting mid-quote by characters can drop the leading `>`
    // and silently turn the rest into plain paragraphs.
    return pieces;
};

const splitOversizedMarkdown = (type, markdown = '') => {
    if (!markdown || markdown.length <= SOFT_CHUNK_MAX_CHARS) {
        return [markdown];
    }

    if (type === 'paragraph') {
        return splitParagraphMarkdown(markdown);
    }

    if (type === 'list') {
        return splitListMarkdown(markdown);
    }

    if (type === 'quote') {
        return splitQuoteMarkdown(markdown);
    }

    return [markdown];
};

const splitMarkdownIntoChunks = (markdown = '') => {
    const normalized = normalizeMarkdown(markdown);
    if (!normalized.trim()) return [];

    const lines = normalized.split('\n');
    const chunks = [];
    let index = 0;
    let lineIndex = 0;

    const pushChunk = (type, blockLines) => {
        const markdownBlock = blockLines.join('\n').trim();
        if (!markdownBlock) return;

        splitOversizedMarkdown(type, markdownBlock).forEach((piece) => {
            const chunk = buildChunk(type, piece.split('\n'), index);
            if (chunk) {
                chunks.push(chunk);
                index += 1;
            }
        });
    };

    while (lineIndex < lines.length) {
        if (isBlankLine(lines[lineIndex])) {
            lineIndex += 1;
            continue;
        }

        const line = lines[lineIndex];

        if (isFenceStartLine(line)) {
            const fenceMatch = line.match(FENCE_PATTERN);
            const fenceMarker = fenceMatch ? fenceMatch[1] : '```';
            const blockLines = [line];
            lineIndex += 1;

            while (lineIndex < lines.length) {
                const currentLine = lines[lineIndex];
                blockLines.push(currentLine);
                lineIndex += 1;

                if (currentLine.trim().startsWith(fenceMarker)) {
                    break;
                }
            }

            pushChunk('code', blockLines);
            continue;
        }

        if (isHeadingLine(line)) {
            pushChunk('heading', [line]);
            lineIndex += 1;
            continue;
        }

        if (isRuleLine(line)) {
            pushChunk('rule', [line]);
            lineIndex += 1;
            continue;
        }

        if (isQuoteLine(line)) {
            const blockLines = [line];
            lineIndex += 1;

            while (lineIndex < lines.length && shouldKeepCollectingQuote(lines[lineIndex])) {
                blockLines.push(lines[lineIndex]);
                lineIndex += 1;
            }

            pushChunk('quote', blockLines);
            continue;
        }

        if (isListStartLine(line)) {
            const blockLines = [line];
            lineIndex += 1;

            while (lineIndex < lines.length && shouldKeepCollectingList(lines[lineIndex])) {
                blockLines.push(lines[lineIndex]);
                lineIndex += 1;
            }

            pushChunk('list', blockLines);
            continue;
        }

        const blockLines = [line];
        lineIndex += 1;

        while (lineIndex < lines.length) {
            const currentLine = lines[lineIndex];
            if (isBlankLine(currentLine)) {
                lineIndex += 1;
                break;
            }

            if (isChunkBoundaryLine(currentLine)) {
                break;
            }

            blockLines.push(currentLine);
            lineIndex += 1;
        }

        pushChunk('paragraph', blockLines);
    }

    let accumulatedChars = 0;
    let initialVisibleCount = 0;
    let deferredWarmupOrder = 0;

    return chunks.map((chunk, chunkIndex) => {
        const shouldRenderImmediately = (
            initialVisibleCount < MESSAGE_CHUNK_MIN_INITIAL_COUNT ||
            (
                initialVisibleCount < MESSAGE_CHUNK_MAX_INITIAL_COUNT &&
                accumulatedChars < MESSAGE_CHUNK_INITIAL_CHAR_BUDGET
            )
        );

        if (shouldRenderImmediately) {
            accumulatedChars += chunk.textLength;
            initialVisibleCount += 1;
        }

        const warmupOrder = shouldRenderImmediately ? -1 : deferredWarmupOrder++;

        return {
            ...chunk,
            chunkIndex,
            shouldRenderImmediately,
            warmupOrder
        };
    });
};

export const useMessageChunks = (markdown = '') => (
    React.useMemo(() => splitMarkdownIntoChunks(markdown), [markdown])
);
