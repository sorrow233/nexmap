import { renderMarkdownToHtml } from './markdownRenderer';

const MAX_CACHE_ENTRIES = 500;
const MAX_CACHEABLE_CONTENT_CHARS = 20_000;
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

const hashMarkdownContent = (content) => {
    let hash = 0;
    for (let index = 0; index < content.length; index += 1) {
        hash = ((hash << 5) - hash) + content.charCodeAt(index);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
};

const buildCacheKey = (namespace, content) => `${namespace}:${content.length}:${hashMarkdownContent(content)}`;

const renderMarkdownContent = (content) => {
    try {
        return SIMPLE_MARKDOWN_PATTERN.test(content)
            ? renderMarkdownToHtml(content)
            : renderPlainTextToHtml(content);
    } catch (error) {
        return renderPlainTextToHtml(content);
    }
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
    if (normalizedContent.length > MAX_CACHEABLE_CONTENT_CHARS) {
        return renderMarkdownContent(normalizedContent);
    }

    const cacheKey = buildCacheKey(namespace, normalizedContent);

    if (markdownHtmlCache.has(cacheKey)) {
        const cachedValue = markdownHtmlCache.get(cacheKey);
        touchEntry(cacheKey, cachedValue);
        return cachedValue;
    }

    const html = renderMarkdownContent(normalizedContent);
    touchEntry(cacheKey, html);
    return html;
}
