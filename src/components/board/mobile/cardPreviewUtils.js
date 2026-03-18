const stripMarkdown = (text = '', imageToken = '[Image]') => {
    return text
        .replace(/<thinking>[\s\S]*?<\/thinking>/g, ' ')
        .replace(/!\[[^\]]*]\([^)]*\)/g, imageToken)
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/[`*_>#]/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
};

const getMessageText = (content, imageToken = '[Image]') => {
    if (!content) return '';
    if (typeof content === 'string') return stripMarkdown(content, imageToken);
    if (Array.isArray(content)) {
        const parts = content.map((part) => {
            if (part?.type === 'text') return part.text || '';
            if (part?.type === 'image' || part?.type === 'image_url') return imageToken;
            return '';
        });
        return stripMarkdown(parts.join(' '), imageToken);
    }
    return '';
};

export function getCardTitle(card, copy = {}) {
    return (
        card?.summary?.title ||
        card?.data?.title ||
        (card?.type === 'note' ? (copy.noteLabel || 'Note') : (copy.untitledCard || 'Untitled Card'))
    )
        .replace(/^#+\s*/, '')
        .trim();
}

export function getCardPreview(card, copy = {}) {
    if (!card) return '';
    const imageToken = copy.imageToken || '[Image]';

    if (card.type === 'note') {
        return stripMarkdown(card.data?.content || '', imageToken) || copy.emptyNote || 'Blank note';
    }

    const marks = card.data?.marks || [];
    if (marks.length > 0) {
        return stripMarkdown(marks.map((mark) => `- ${mark}`).join('\n'), imageToken);
    }

    if (card.summary?.summary) {
        return stripMarkdown(card.summary.summary, imageToken);
    }

    const messages = card.data?.messages || [];
    const lastMessage = messages[messages.length - 1];
    return getMessageText(lastMessage?.content, imageToken) || 'No messages yet';
}

export function getCardMetrics(card) {
    return {
        messageCount: card?.data?.messages?.length || 0,
        markCount: card?.data?.marks?.length || 0,
        noteCount: card?.data?.capturedNotes?.length || 0
    };
}

export function estimateCardWeight(card) {
    const titleLength = getCardTitle(card).length;
    const previewLength = getCardPreview(card).length;
    const metrics = getCardMetrics(card);
    const baseWeight = card?.type === 'note' ? 1.8 : 2.2;

    return baseWeight
        + Math.ceil(titleLength / 18) * 0.55
        + Math.ceil(previewLength / 70) * 0.75
        + metrics.markCount * 0.18
        + metrics.noteCount * 0.12;
}
