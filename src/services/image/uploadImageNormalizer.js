export const IMAGE_UPLOAD_ACCEPT = 'image/*,.heic,.heif';

const STANDARD_IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
]);

const HEIC_IMAGE_MIME_TYPES = new Set([
    'image/heic',
    'image/heif',
    'image/heic-sequence',
    'image/heif-sequence'
]);

const HEIC_EXTENSION_RE = /\.(heic|heif)$/i;

const replaceHeicExtension = (fileName = '') => {
    const safeName = String(fileName || '').trim() || 'image.heic';
    if (HEIC_EXTENSION_RE.test(safeName)) {
        return safeName.replace(HEIC_EXTENSION_RE, '.jpg');
    }
    return `${safeName}.jpg`;
};

export const getAcceptedImageTypeLabel = () => 'JPG, PNG, WebP, GIF, HEIC, HEIF';

export const isHeicLikeFile = (file) => {
    if (!file) return false;
    const mimeType = String(file.type || '').toLowerCase();
    if (HEIC_IMAGE_MIME_TYPES.has(mimeType)) {
        return true;
    }
    return HEIC_EXTENSION_RE.test(String(file.name || ''));
};

export const isSupportedImageUploadFile = (file) => {
    if (!file) return false;
    const mimeType = String(file.type || '').toLowerCase();
    return STANDARD_IMAGE_MIME_TYPES.has(mimeType) || isHeicLikeFile(file);
};

const normalizeHeicConversionResult = (result) => {
    if (Array.isArray(result)) {
        return result[0] || null;
    }
    return result || null;
};

export const normalizeImageUploadFile = async (file) => {
    if (!isHeicLikeFile(file)) {
        return file;
    }

    const { default: heic2any } = await import('heic2any');
    const conversionResult = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.92
    });
    const convertedBlob = normalizeHeicConversionResult(conversionResult);

    if (!(convertedBlob instanceof Blob)) {
        throw new Error('HEIC conversion returned an invalid image payload.');
    }

    return new File(
        [convertedBlob],
        replaceHeicExtension(file.name),
        {
            type: convertedBlob.type || 'image/jpeg',
            lastModified: Date.now()
        }
    );
};
