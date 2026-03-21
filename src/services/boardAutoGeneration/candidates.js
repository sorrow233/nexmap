import {
    hasAutoImageCompleted,
    hasAutoImageTriggered,
    hasAutoSummaryCompleted,
    hasAutoSummaryTriggered
} from './metadata';

export const AUTO_GENERATION_KIND = Object.freeze({
    SUMMARY: 'summary',
    IMAGE: 'image'
});

const hasEnoughCardsForSummary = (board = {}) => {
    const cardCount = Number(board?.cardCount) || 0;
    return cardCount >= 3 && cardCount < 10;
};

const hasEnoughCardsForImage = (board = {}) => {
    const cardCount = Number(board?.cardCount) || 0;
    return cardCount >= 10;
};

const hasLegacyAutoImageSuccess = (board = {}) => (
    Boolean(board?.backgroundImage) && hasAutoImageTriggered(board)
);

const hasLegacyAutoSummarySuccess = (board = {}) => (
    Boolean(board?.summary) && hasAutoSummaryTriggered(board)
);

export const shouldAutoGenerateSummary = (board = {}) => (
    !board?.deletedAt &&
    hasEnoughCardsForSummary(board) &&
    !board?.summary &&
    !board?.backgroundImage &&
    !hasAutoSummaryCompleted(board) &&
    !hasLegacyAutoSummarySuccess(board)
);

export const shouldAutoGenerateImage = (board = {}) => (
    !board?.deletedAt &&
    hasEnoughCardsForImage(board) &&
    !board?.backgroundImage &&
    !hasAutoImageCompleted(board) &&
    !hasLegacyAutoImageSuccess(board)
);

export const pickNextAutoGenerationCandidate = (boards = []) => {
    if (!Array.isArray(boards) || boards.length === 0) return null;

    for (const board of boards) {
        if (shouldAutoGenerateImage(board)) {
            return {
                board,
                kind: AUTO_GENERATION_KIND.IMAGE
            };
        }

        if (shouldAutoGenerateSummary(board)) {
            return {
                board,
                kind: AUTO_GENERATION_KIND.SUMMARY
            };
        }
    }

    return null;
};
