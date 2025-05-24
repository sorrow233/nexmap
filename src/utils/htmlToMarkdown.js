
/**
 * Simple HTML to Markdown converter for browser environments.
 * Traverses a DOM node or HTML string and produces Markdown.
 */
export function htmlToMarkdown(input) {
    if (!input) return '';

    let root;
    if (typeof input === 'string') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(input, 'text/html');
        root = doc.body;
    } else if (input instanceof Node) {
        root = input;
    } else {
        return '';
    }

    return traverse(root, { isBlock: true }).trim();
}

function traverse(node, context = {}) {
    if (!node) return '';

    // Handle Text Nodes
    if (node.nodeType === Node.TEXT_NODE) {
        let text = node.textContent;

        // If we are inside a code block, preserve all whitespace strictly
        if (context.isPre) {
            return text;
        }

        // Otherwise, collapse whitespace
        // If it's pure whitespace and we are in a block context start/end, might want to trim
        // But simple collapse is usually safer:
        // text = text.replace(/\s+/g, ' ');

        // ACTUALLY: For generic markdown, we want to collapse newlines/tabs to spaces, 
        // unless it's pre.
        // However, we must be careful not to glue words together if they were separated by a newline in HTML source
        // but rendered as space.
        text = text.replace(/[\n\r\t]+/g, ' ');
        return text;
    }

    // Handle Element Nodes
    if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        let content = '';

        // Recursion
        const isPre = tagName === 'pre' || context.isPre;
        // Don't traverse children for certain tags if we handle them specially (not needed here yet)

        let children = Array.from(node.childNodes);

        children.forEach(child => {
            content += traverse(child, { ...context, isPre });
        });

        switch (tagName) {
            // Headers
            case 'h1': return `\n# ${content.trim()}\n\n`;
            case 'h2': return `\n## ${content.trim()}\n\n`;
            case 'h3': return `\n### ${content.trim()}\n\n`;
            case 'h4': return `\n#### ${content.trim()}\n\n`;
            case 'h5': return `\n##### ${content.trim()}\n\n`;
            case 'h6': return `\n###### ${content.trim()}\n\n`;

            // Paragraphs and Breaks
            case 'p': return `\n${content.trim()}\n\n`;
            case 'br': return '  \n'; // Markdown line break with 2 spaces
            case 'hr': return '\n---\n\n';

            // Lists
            case 'ul': return `\n${content}\n`;
            case 'ol': return `\n${content}\n`; // logic for numbers is hard to perfectly sync without index, simplified below
            case 'li':
                // Check parent for type
                const parentTag = node.parentElement?.tagName.toLowerCase();
                if (parentTag === 'ol') {
                    // Start of list item. 
                    // To get exact number is costly, let's just use "1." for generic markdown parsers which auto-increment
                    return `1. ${content.trim()}\n`;
                }
                return `- ${content.trim()}\n`;

            // Formatting
            case 'strong':
            case 'b':
                return content.trim() ? `**${content}**` : '';
            case 'em':
            case 'i':
                return content.trim() ? `*${content}*` : '';
            case 'code':
                // content might have backticks
                if (context.isPre) return content; // Handled by pre
                return `\`${content}\``;
            case 'pre':
                // Check if there's a code block class on the inner code
                // Try to find language
                return `\n\`\`\`\n${content}\n\`\`\`\n\n`;

            case 'blockquote':
                return `\n> ${content.trim().split('\n').join('\n> ')}\n\n`;

            case 'a':
                const href = node.getAttribute('href');
                return href ? `[${content}](${href})` : content;

            case 'img':
                const src = node.getAttribute('src');
                const alt = node.getAttribute('alt') || '';
                return src ? `![${alt}](${src})` : '';

            // Layout / Structure - treat as transparent but ensure spacing if block
            case 'div':
            case 'section':
            case 'article':
                return `\n${content}\n`;

            default:
                return content;
        }
    }

    return '';
}
