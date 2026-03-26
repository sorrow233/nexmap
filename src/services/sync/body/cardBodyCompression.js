import LZString from 'lz-string';
import { cloneSerializable } from '../boardSnapshot';

export const CARD_BODY_COMPRESSION_ENCODING = 'lz-string-base64';

const CARD_BODY_FIELDS = ['messages', 'content', 'image', 'text'];

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

const getSourceRecord = (value = {}) => (
    value?.data && typeof value.data === 'object' ? value.data : value
);

export const extractCardBodyPayload = (value = {}) => {
    const source = getSourceRecord(value);
    const payload = {};

    CARD_BODY_FIELDS.forEach((field) => {
        if (hasOwn(source, field)) {
            payload[field] = cloneSerializable(source[field]);
        }
    });

    return payload;
};

export const hasCardBodyPayload = (value = {}) => (
    CARD_BODY_FIELDS.some((field) => hasOwn(value, field))
);

export const serializeCardBodyPayload = (value = {}) => {
    const payload = extractCardBodyPayload(value);
    if (!hasCardBodyPayload(payload)) {
        return null;
    }

    return {
        payload,
        serialized: JSON.stringify(payload)
    };
};

export const compressCardBodyPayload = (value = {}) => {
    const serializedPayload = serializeCardBodyPayload(value);
    if (!serializedPayload) {
        return null;
    }

    const compressedBody = LZString.compressToBase64(serializedPayload.serialized);
    if (typeof compressedBody !== 'string' || !compressedBody) {
        throw new Error('Failed to compress card body payload');
    }

    return {
        ...serializedPayload,
        bodyEncoding: CARD_BODY_COMPRESSION_ENCODING,
        compressedBody,
        rawBytes: new TextEncoder().encode(serializedPayload.serialized).length,
        compressedBytes: new TextEncoder().encode(compressedBody).length
    };
};

export const decompressCardBodyPayload = ({
    bodyEncoding = '',
    compressedBody = ''
} = {}) => {
    if (bodyEncoding !== CARD_BODY_COMPRESSION_ENCODING) {
        return null;
    }

    if (typeof compressedBody !== 'string' || !compressedBody) {
        return null;
    }

    let decompressed = '';

    try {
        decompressed = LZString.decompressFromBase64(compressedBody) || '';
    } catch {
        return null;
    }

    if (!decompressed) {
        return null;
    }

    try {
        const parsed = JSON.parse(decompressed);
        const payload = extractCardBodyPayload(parsed);
        return hasCardBodyPayload(payload) ? payload : null;
    } catch {
        return null;
    }
};
