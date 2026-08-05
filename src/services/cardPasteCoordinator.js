export const isCardPasteTargetReady = ({
    targetBoardId = '',
    activeBoardId = '',
    isBoardLoading = false,
    isReadOnly = false
} = {}) => (
    Boolean(targetBoardId)
    && targetBoardId === activeBoardId
    && !isBoardLoading
    && !isReadOnly
);
