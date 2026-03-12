import { renderMarkdownToHtml } from './markdownRenderer';

const MAX_CACHE_ENTRIES = 500;
const markdownHtmlCache = new Map();

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
        html = renderMarkdownToHtml(normalizedContent);
    } catch (error) {
        html = normalizedContent;
    }

    touchEntry(cacheKey, html);
    return html;
}
