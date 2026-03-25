const OPENAI_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const OPENAI_IMAGE_TARGET_MB = 4.5;

const estimateBase64Bytes = (base64Data = '') => {
    if (!base64Data) return 0;
    const len = String(base64Data).length;
    let padding = 0;
    if (base64Data.endsWith('==')) padding = 2;
    else if (base64Data.endsWith('=')) padding = 1;
    return Math.floor((len * 3) / 4) - padding;
};

const bytesToMB = (bytes = 0) => (bytes / (1024 * 1024)).toFixed(2);

const base64ToBlob = (base64Data, mimeType = 'image/png') => {
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    for (let index = 0; index < len; index += 1) {
        bytes[index] = binaryString.charCodeAt(index);
    }

    return new Blob([bytes], { type: mimeType });
};

const blobToBase64 = async (blob) => (
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = typeof reader.result === 'string' ? reader.result : '';
            resolve(result.split(',')[1] || '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    })
);

const createCompressionPlan = () => ([
    { maxSizeMB: OPENAI_IMAGE_TARGET_MB, maxWidthOrHeight: 2048, initialQuality: 0.82 },
    { maxSizeMB: 4.0, maxWidthOrHeight: 1920, initialQuality: 0.74 },
    { maxSizeMB: 3.2, maxWidthOrHeight: 1600, initialQuality: 0.68 },
    { maxSizeMB: 2.4, maxWidthOrHeight: 1280, initialQuality: 0.6 }
]);

const compressBase64Image = async ({ base64Data, mimeType }) => {
    const sourceBlob = base64ToBlob(base64Data, mimeType);
    const sourceFile = new File(
        [sourceBlob],
        `openai-image-${Date.now()}.${mimeType.includes('png') ? 'png' : 'jpg'}`,
        { type: mimeType || 'image/png', lastModified: Date.now() }
    );

    const { default: imageCompression } = await import('browser-image-compression');
    let bestResult = null;

    for (const plan of createCompressionPlan()) {
        const compressedBlob = await imageCompression(sourceFile, {
            ...plan,
            useWebWorker: true,
            fileType: 'image/webp'
        });
        const compressedBase64 = await blobToBase64(compressedBlob);
        const compressedBytes = estimateBase64Bytes(compressedBase64);

        bestResult = {
            data: compressedBase64,
            mediaType: compressedBlob.type || 'image/webp',
            sizeBytes: compressedBytes
        };

        if (compressedBytes <= OPENAI_IMAGE_MAX_BYTES) {
            return bestResult;
        }
    }

    return bestResult;
};

const normalizeImagePart = async (part) => {
    if (part?.type !== 'image' || !part?.source?.data) {
        return part;
    }

    const currentBytes = estimateBase64Bytes(part.source.data);
    if (currentBytes <= OPENAI_IMAGE_MAX_BYTES) {
        return part;
    }

    const compressed = await compressBase64Image({
        base64Data: part.source.data,
        mimeType: part.source.media_type || 'image/png'
    });

    if (compressed?.sizeBytes && compressed.sizeBytes <= OPENAI_IMAGE_MAX_BYTES) {
        console.warn(
            `[OpenAI] Image compressed from ${bytesToMB(currentBytes)}MB to ${bytesToMB(compressed.sizeBytes)}MB before request`
        );
        return {
            ...part,
            source: {
                ...part.source,
                media_type: compressed.mediaType,
                data: compressed.data
            }
        };
    }

    throw new Error(
        `OpenAI 图片超过 5MB 上限（当前约 ${bytesToMB(currentBytes)}MB），自动压缩后仍无法降到可发送范围，请换更小的图片或先裁剪。`
    );
};

export const normalizeOpenAIImagePayloads = async (messages = []) => {
    if (!Array.isArray(messages) || messages.length === 0) {
        return [];
    }

    const normalizedMessages = [];

    for (const message of messages) {
        if (!message || !Array.isArray(message.content)) {
            normalizedMessages.push(message);
            continue;
        }

        const nextContent = [];
        for (const part of message.content) {
            nextContent.push(await normalizeImagePart(part));
        }

        normalizedMessages.push({
            ...message,
            content: nextContent
        });
    }

    return normalizedMessages;
};

