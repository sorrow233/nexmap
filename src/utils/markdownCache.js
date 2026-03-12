import { renderMarkdownToHtml } from './markdownRenderer';

const MAX_CACHE_ENTRIES = 500;
const markdownHtmlCache = new Map();
const SIMPLE_MARKDOWN_PATTERN = /[`*_[\]#>|~\-]|\n|\d+\.\s|!\[|\|/;

const escapeHtml = (value) => value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const renderPlainTextToHtml = (content) => {
    if (!content) return '';
    return escapeHtml(content).replaceAll('\n', '<br />');
};

const touchEntry = (key, value) => {
    if (markdownHtmlCache.has(key)) {
        markdownHtmlCache.delete(key);
    }
    markdownHtmlCache.set(key, value);

    if (markdownHtmlCache.size > MAX_CACHE_ENTRIES) {
        const oldestKey = markdownHtmlCache.keys().next().value;
        if (oldestKey) {
            markdownHtmlCache.delete(oldestKey);
        }
    }
};

export function renderCachedMarkdownToHtml(content, namespace = 'default') {
    const normalizedContent = typeof content === 'string' ? content : '';
    const cacheKey = `${namespace}:${normalizedContent}`;

    if (markdownHtmlCache.has(cacheKey)) {
        const cachedValue = markdownHtmlCache.get(cacheKey);
        touchEntry(cacheKey, cachedValue);
        return cachedValue;
    }

    let html;
    try {
        html = SIMPLE_MARKDOWN_PATTERN.test(normalizedContent)
            ? renderMarkdownToHtml(normalizedContent)
            : renderPlainTextToHtml(normalizedContent);
    } catch (error) {
        html = renderPlainTextToHtml(normalizedContent);
    }

    touchEntry(cacheKey, html);
    return html;
}
