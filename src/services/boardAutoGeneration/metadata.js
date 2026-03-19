export const AUTO_IMAGE_TRIGGERED_AT_KEY = 'autoImageTriggeredAt';

export const hasAutoImageTriggered = (board = {}) => {
    const value = Number(board?.[AUTO_IMAGE_TRIGGERED_AT_KEY]);
    return Number.isFinite(value) && value > 0;
};

export const createAutoImageTriggeredPatch = (timestamp = Date.now()) => ({
    [AUTO_IMAGE_TRIGGERED_AT_KEY]: timestamp
});
