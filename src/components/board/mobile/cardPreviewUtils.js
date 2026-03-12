const stripMarkdown = (text = '') => {
    return text
        .replace(/<thinking>[\s\S]*?<\/thinking>/g, ' ')
        .replace(/!\[[^\]]*]\([^)]*\)/g, '[图片]')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/[`*_>#]/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
};

const getMessageText = (content) => {
    if (!content) return '';
    if (typeof content === 'string') return stripMarkdown(content);
    if (Array.isArray(content)) {
        const parts = content.map((part) => {
            if (part?.type === 'text') return part.text || '';
            if (part?.type === 'image' || part?.type === 'image_url') return '[图片]';
            return '';
        });
        return stripMarkdown(parts.join(' '));
    }
    return '';
};

export function getCardTitle(card) {
    return (
        card?.summary?.title ||
        card?.data?.title ||
        (card?.type === 'note' ? '笔记' : '未命名卡片')
    )
        .replace(/^#+\s*/, '')
        .trim();
}

export function getCardPreview(card) {
    if (!card) return '';

    if (card.type === 'note') {
        return stripMarkdown(card.data?.content || '') || '空白笔记';
    }

    const marks = card.data?.marks || [];
    if (marks.length > 0) {
        return stripMarkdown(marks.map((mark) => `- ${mark}`).join('\n'));
    }

    if (card.summary?.summary) {
        return stripMarkdown(card.summary.summary);
    }

    const messages = card.data?.messages || [];
    const lastMessage = messages[messages.length - 1];
    return getMessageText(lastMessage?.content) || '还没有消息';
}

export function getCardMetrics(card) {
    return {
        messageCount: card?.data?.messages?.length || 0,
        markCount: card?.data?.marks?.length || 0,
        noteCount: card?.data?.capturedNotes?.length || 0
    };
}
