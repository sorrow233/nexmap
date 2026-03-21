export const sanitizeBoardMetadataPatch = (metadata = {}) => Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined)
);

const isBoardMetadataValueEqual = (left, right) => {
    if (left === right) return true;
    if ((left == null) || (right == null)) {
        return left == null && right == null;
    }

    if (typeof left === 'object' || typeof right === 'object') {
        try {
            return JSON.stringify(left) === JSON.stringify(right);
        } catch (error) {
            console.warn('[BoardMetadata] Failed to compare metadata value:', error);
            return false;
        }
    }

    return false;
};

export const hasMeaningfulBoardMetadataChange = (board, metadata = {}) => Object.keys(metadata).some((key) => (
    !isBoardMetadataValueEqual(board?.[key], metadata[key])
));
