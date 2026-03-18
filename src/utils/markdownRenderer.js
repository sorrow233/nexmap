import DOMPurify from 'dompurify';
import { Marked, Renderer } from 'marked';
import markedKatex from 'marked-katex-extension';

const markdownEngine = new Marked();

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

export const sanitizeMarkdownHtml = (html = '', sanitizeOptions = {}) => {
    return DOMPurify.sanitize(html || '', sanitizeOptions);
};

export const renderMarkdownToHtml = (content = '', options = {}) => {
    const { parseOptions = {}, sanitizeOptions = {} } = options;
    return sanitizeMarkdownHtml(parseMarkdown(content, parseOptions), sanitizeOptions);
};
