import { htmlToMarkdown } from './htmlToMarkdown';

const MATH_HTML_PATTERN = /(class=(['"])[^'"]*\bkatex\b|application\/x-tex|<math\b)/i;

const selectionBelongsToNode = (selection, rootNode) => {
    if (!selection || !rootNode || selection.rangeCount === 0 || selection.isCollapsed) {
        return false;
    }

    const range = selection.getRangeAt(0);
    const commonAncestor = range.commonAncestorContainer;
    return rootNode.contains(commonAncestor);
};

const cloneSelectionHtml = (selection) => {
    if (!selection || selection.rangeCount === 0) return '';

    const wrapper = document.createElement('div');
    for (let index = 0; index < selection.rangeCount; index += 1) {
        wrapper.appendChild(selection.getRangeAt(index).cloneContents());
    }
    return wrapper.innerHTML;
};

export const extractMarkdownFromClipboard = (clipboardData) => {
    const html = clipboardData?.getData?.('text/html') || '';
    if (!html || !MATH_HTML_PATTERN.test(html)) {
        return '';
    }

    return htmlToMarkdown(html).trim();
};

export const insertMarkdownIntoTextarea = ({
    event,
    textarea,
    currentValue,
    nextText,
    onChangeText,
    onAfterInsert
}) => {
    if (!textarea || typeof onChangeText !== 'function') {
        return false;
    }

    const selectionStart = textarea.selectionStart ?? currentValue.length;
    const selectionEnd = textarea.selectionEnd ?? currentValue.length;
    const nextValue = `${currentValue.slice(0, selectionStart)}${nextText}${currentValue.slice(selectionEnd)}`;

    event.preventDefault();
    onChangeText(nextValue);

    requestAnimationFrame(() => {
        const cursorPosition = selectionStart + nextText.length;
        textarea.focus();
        if (typeof textarea.setSelectionRange === 'function') {
            textarea.setSelectionRange(cursorPosition, cursorPosition);
        }
        if (typeof onAfterInsert === 'function') {
            onAfterInsert(textarea);
        }
    });

    return true;
};

export const handleMathRichPaste = ({
    event,
    currentValue,
    onChangeText,
    onAfterInsert
}) => {
    const markdown = extractMarkdownFromClipboard(event?.clipboardData);
    if (!markdown) {
        return false;
    }

    return insertMarkdownIntoTextarea({
        event,
        textarea: event.currentTarget,
        currentValue,
        nextText: markdown,
        onChangeText,
        onAfterInsert
    });
};

export const copySelectionAsMarkdown = (event) => {
    const rootNode = event?.currentTarget;
    const clipboardData = event?.clipboardData;
    if (!rootNode || !clipboardData || typeof window === 'undefined') {
        return false;
    }

    const selection = window.getSelection();
    if (!selectionBelongsToNode(selection, rootNode)) {
        return false;
    }

    const selectionHtml = cloneSelectionHtml(selection);
    const markdown = htmlToMarkdown(selectionHtml).trim();
    if (!markdown) {
        return false;
    }

    event.preventDefault();
    clipboardData.setData('text/plain', markdown);
    clipboardData.setData('text/html', selectionHtml);
    return true;
};
