export const AUTO_IMAGE_TRIGGERED_AT_KEY = 'autoImageTriggeredAt';
export const AUTO_SUMMARY_TRIGGERED_AT_KEY = 'autoSummaryTriggeredAt';
export const AUTO_IMAGE_COMPLETED_AT_KEY = 'autoImageCompletedAt';
export const AUTO_SUMMARY_COMPLETED_AT_KEY = 'autoSummaryCompletedAt';

export const AUTO_GENERATION_METADATA_KEYS = Object.freeze([
    AUTO_IMAGE_TRIGGERED_AT_KEY,
    AUTO_SUMMARY_TRIGGERED_AT_KEY,
    AUTO_IMAGE_COMPLETED_AT_KEY,
    AUTO_SUMMARY_COMPLETED_AT_KEY
]);

export const hasAutoImageTriggered = (board = {}) => {
    const value = Number(board?.[AUTO_IMAGE_TRIGGERED_AT_KEY]);
    return Number.isFinite(value) && value > 0;
};

export const hasAutoSummaryTriggered = (board = {}) => {
    const value = Number(board?.[AUTO_SUMMARY_TRIGGERED_AT_KEY]);
    return Number.isFinite(value) && value > 0;
};

export const hasAutoImageCompleted = (board = {}) => {
    const value = Number(board?.[AUTO_IMAGE_COMPLETED_AT_KEY]);
    return Number.isFinite(value) && value > 0;
};

export const hasAutoSummaryCompleted = (board = {}) => {
    const value = Number(board?.[AUTO_SUMMARY_COMPLETED_AT_KEY]);
    return Number.isFinite(value) && value > 0;
};

export const createAutoImageTriggeredPatch = (timestamp = Date.now()) => ({
    [AUTO_IMAGE_TRIGGERED_AT_KEY]: timestamp
});

export const createAutoSummaryTriggeredPatch = (timestamp = Date.now()) => ({
    [AUTO_SUMMARY_TRIGGERED_AT_KEY]: timestamp
});

export const createAutoImageCompletedPatch = (timestamp = Date.now()) => ({
    [AUTO_IMAGE_COMPLETED_AT_KEY]: timestamp
});

export const createAutoSummaryCompletedPatch = (timestamp = Date.now()) => ({
    [AUTO_SUMMARY_COMPLETED_AT_KEY]: timestamp
});

export const hasAutoGenerationMetadataPatch = (metadata = {}) => AUTO_GENERATION_METADATA_KEYS.some((key) => (
    Object.prototype.hasOwnProperty.call(metadata, key)
));
