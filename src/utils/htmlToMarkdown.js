
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

function traverse(node, context = { depth: 0 }) {
    if (!node) return '';

    // Handle Text Nodes
    if (node.nodeType === Node.TEXT_NODE) {
        let text = node.textContent;

        if (context.isPre) {
            return text;
        }

        text = text.replace(/[\n\r\t]+/g, ' ');
        return text;
    }

    // Handle Element Nodes
    if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        let content = '';

        const isPre = tagName === 'pre' || context.isPre;
        const isList = tagName === 'ul' || tagName === 'ol';

        // Increase depth for nested lists
        const newDepth = isList ? (context.depth + 1) : context.depth;

        let children = Array.from(node.childNodes);

        children.forEach(child => {
            content += traverse(child, { ...context, isPre, depth: newDepth });
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
            case 'br': return '  \n';
            case 'hr': return '\n---\n\n';

            // Lists
            case 'ul':
            case 'ol':
                return `\n${content}\n`;
            case 'li':
                const indent = '  '.repeat(Math.max(0, context.depth - 1));
                const parentTag = node.parentElement?.tagName.toLowerCase();

                if (parentTag === 'ol') {
                    // Use the index from the loop in the parent processing or calculate it
                    // Since we are traversing recursively, we need to know our index among siblings.
                    // The traverse function currently iterates children. We should pass the index down?
                    // Actually, the previous implementation of traverse didn't pass index. 
                    // Let's change the strategy: The traverse function iterates children. 
                    // We can't easily change the recursive signature to pass index without changing all calls.
                    // A better way for `li` is to look at its own position among previous element siblings.

                    let index = 1;
                    let sibling = node.previousElementSibling;
                    while (sibling) {
                        if (sibling.tagName.toLowerCase() === 'li') {
                            index++;
                        }
                        sibling = sibling.previousElementSibling;
                    }
                    return `${indent}${index}. ${content.trim()}\n`;
                }
                return `${indent}- ${content.trim()}\n`;

            // Formatting
            case 'strong':
            case 'b':
                return content.trim() ? `**${content}**` : '';
            case 'em':
            case 'i':
                return content.trim() ? `*${content}*` : '';
            case 'code':
                if (context.isPre) return content;
                return `\`${content}\``;
            case 'pre':
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

