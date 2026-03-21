export const AUTO_IMAGE_TRIGGERED_AT_KEY = 'autoImageTriggeredAt';
export const AUTO_SUMMARY_TRIGGERED_AT_KEY = 'autoSummaryTriggeredAt';

export const AUTO_GENERATION_METADATA_KEYS = Object.freeze([
    AUTO_IMAGE_TRIGGERED_AT_KEY,
    AUTO_SUMMARY_TRIGGERED_AT_KEY
]);

export const hasAutoImageTriggered = (board = {}) => {
    const value = Number(board?.[AUTO_IMAGE_TRIGGERED_AT_KEY]);
    return Number.isFinite(value) && value > 0;
};

export const hasAutoSummaryTriggered = (board = {}) => {
    const value = Number(board?.[AUTO_SUMMARY_TRIGGERED_AT_KEY]);
    return Number.isFinite(value) && value > 0;
};

export const createAutoImageTriggeredPatch = (timestamp = Date.now()) => ({
    [AUTO_IMAGE_TRIGGERED_AT_KEY]: timestamp
});

export const createAutoSummaryTriggeredPatch = (timestamp = Date.now()) => ({
    [AUTO_SUMMARY_TRIGGERED_AT_KEY]: timestamp
});

export const hasAutoGenerationMetadataPatch = (metadata = {}) => AUTO_GENERATION_METADATA_KEYS.some((key) => (
    Object.prototype.hasOwnProperty.call(metadata, key)
));
