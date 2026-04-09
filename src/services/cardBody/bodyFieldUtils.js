const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

export const CARD_BODY_FIELDS = Object.freeze([
    'messages',
    'content',
    'image',
    'text'
]);

export const hasCardBodyFieldChange = (currentData = {}, updatedData = {}) => (
    CARD_BODY_FIELDS.some((field) => (
        hasOwn(updatedData, field) && updatedData[field] !== currentData?.[field]
    ))
);
