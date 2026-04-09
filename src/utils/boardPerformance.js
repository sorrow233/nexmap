const LARGE_BOARD_TOTAL_TEXT_CHARS = 1_000_000;
const LARGE_BOARD_CARD_COUNT = 40;
const LARGE_CARD_TEXT_CHARS = 30_000;
const LARGE_BOARD_LONG_CARD_COUNT = 8;

export const extractMessageContentText = (content) => {
    if (typeof content === 'string') {
        return content;
    }

    if (!Array.isArray(content)) {
        return '';
    }

    return content
        .map((part) => {
            if (part?.type === 'text' && typeof part.text === 'string') {
                return part.text;
            }

            if (part?.type === 'image' || part?.type === 'image_url') {
                return '[Image]';
            }

            return '';
        })
        .filter(Boolean)
        .join(' ');
};

export const estimateCardTextChars = (card = {}) => {
    const title = typeof card?.data?.title === 'string' ? card.data.title.length : 0;
    const summaryTitle = typeof card?.summary?.title === 'string' ? card.summary.title.length : 0;
    const summaryBody = typeof card?.summary?.summary === 'string' ? card.summary.summary.length : 0;
    const marks = Array.isArray(card?.data?.marks)
        ? card.data.marks.reduce((total, mark) => total + String(mark || '').length, 0)
        : 0;
    const runtimeEstimatedChars = Number(card?.data?.runtimeBodyState?.estimatedChars);
    const hasRuntimeEstimate = Number.isFinite(runtimeEstimatedChars) && runtimeEstimatedChars > 0;
    const messages = Array.isArray(card?.data?.messages) ? card.data.messages : [];

    const messageChars = hasRuntimeEstimate
        ? runtimeEstimatedChars
        : messages.reduce((total, message) => (
            total + extractMessageContentText(message?.content).length
        ), 0);

    return title + summaryTitle + summaryBody + marks + messageChars;
};

export const estimateBoardTextChars = (cards = []) => (
    Array.isArray(cards)
        ? cards.reduce((total, card) => total + estimateCardTextChars(card), 0)
        : 0
);

export const countLargeCards = (cards = [], threshold = LARGE_CARD_TEXT_CHARS) => (
    Array.isArray(cards)
        ? cards.reduce((total, card) => (
            estimateCardTextChars(card) >= threshold ? total + 1 : total
        ), 0)
        : 0
);

export const isLargeBoardCards = (cards = []) => {
    const safeCards = Array.isArray(cards) ? cards : [];
    if (safeCards.length >= LARGE_BOARD_CARD_COUNT) {
        return true;
    }

    let totalTextChars = 0;
    let largeCardCount = 0;

    for (const card of safeCards) {
        const cardChars = estimateCardTextChars(card);
        totalTextChars += cardChars;

        if (cardChars >= LARGE_CARD_TEXT_CHARS) {
            largeCardCount += 1;
        }

        if (
            totalTextChars >= LARGE_BOARD_TOTAL_TEXT_CHARS ||
            largeCardCount >= LARGE_BOARD_LONG_CARD_COUNT
        ) {
            return true;
        }
    }

    return (
        totalTextChars >= LARGE_BOARD_TOTAL_TEXT_CHARS ||
        largeCardCount >= LARGE_BOARD_LONG_CARD_COUNT
    );
};

export const resolveBoardHistoryLimit = (cards = []) => (
    isLargeBoardCards(cards) ? 1 : 12
);
