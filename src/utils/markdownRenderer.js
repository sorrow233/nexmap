import DOMPurify from 'dompurify';
import { Marked, Renderer } from 'marked';
import markedKatex from 'marked-katex-extension';

const markdownEngine = new Marked();
const DEFAULT_SANITIZE_ATTRS = ['target', 'rel', 'data-external-link'];

markdownEngine.use(markedKatex({
    throwOnError: false,
    nonStandard: true,
    output: 'htmlAndMathml',
    strict: 'ignore'
}));

markdownEngine.setOptions({
    breaks: true,
    gfm: true
});

export const createMarkdownRenderer = () => new Renderer();

export const parseMarkdown = (content = '', parseOptions = {}) => {
    return markdownEngine.parse(content || '', parseOptions);
};

const mergeSanitizeOptions = (sanitizeOptions = {}) => {
    const incomingAddAttr = Array.isArray(sanitizeOptions.ADD_ATTR) ? sanitizeOptions.ADD_ATTR : [];
    return {
        ...sanitizeOptions,
        ADD_ATTR: Array.from(new Set([...DEFAULT_SANITIZE_ATTRS, ...incomingAddAttr]))
    };
};

const isExternalHttpLink = (href = '') => {
    const normalizedHref = String(href || '').trim();
    if (!normalizedHref || typeof window === 'undefined') return false;
    if (/^(mailto:|tel:|#|\/(?!\/))/i.test(normalizedHref)) return false;

    try {
        const resolvedUrl = new URL(normalizedHref, window.location.origin);
        const isHttp = resolvedUrl.protocol === 'http:' || resolvedUrl.protocol === 'https:';
        return isHttp && resolvedUrl.origin !== window.location.origin;
    } catch {
        return false;
    }
};

const decorateExternalLinks = (html = '') => {
    if (!html || typeof document === 'undefined') return html || '';

    const container = document.createElement('div');
    container.innerHTML = html;

    container.querySelectorAll('a[href]').forEach((anchor) => {
        const href = anchor.getAttribute('href') || '';
        if (!isExternalHttpLink(href)) return;

        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener noreferrer nofollow');
        anchor.setAttribute('data-external-link', 'true');
    });

    return container.innerHTML;
};

export const sanitizeMarkdownHtml = (html = '', sanitizeOptions = {}) => {
    const sanitizedHtml = DOMPurify.sanitize(html || '', mergeSanitizeOptions(sanitizeOptions));
    return decorateExternalLinks(sanitizedHtml);
};

export const renderMarkdownToHtml = (content = '', options = {}) => {
    const { parseOptions = {}, sanitizeOptions = {} } = options;
    return sanitizeMarkdownHtml(parseMarkdown(content, parseOptions), sanitizeOptions);
};
