const DEFAULT_ASPECT_RATIO = '16:9';
const DEFAULT_IMAGE_SIZE = '1K';

const SIZE_TO_ASPECT_RATIO = Object.freeze({
    '1024x1024': '1:1',
    '1536x1024': '3:2',
    '1024x1536': '2:3',
    '1792x1024': '16:9',
    '1024x1792': '9:16'
});

function normalizeBase64(value = '') {
    return String(value || '').replace(/\s+/g, '');
}

function getInlineImage(part = {}) {
    const inlineData = part.inlineData || part.inline_data;
    const data = normalizeBase64(inlineData?.data);
    if (!data) return null;

    const mimeType = inlineData?.mimeType || inlineData?.mime_type || 'image/png';
    if (!String(mimeType).startsWith('image/')) return null;

    return `data:${mimeType};base64,${data}`;
}

export function buildGeminiImageRequest(prompt, options = {}) {
    const normalizedPrompt = String(prompt || '').trim();
    if (!normalizedPrompt) {
        throw new Error('图片生成提示词不能为空');
    }

    const aspectRatio = options.aspectRatio || SIZE_TO_ASPECT_RATIO[options.size] || DEFAULT_ASPECT_RATIO;
    const imageSize = options.imageSize || DEFAULT_IMAGE_SIZE;

    return {
        contents: [{
            role: 'user',
            parts: [{ text: normalizedPrompt }]
        }],
        generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: {
                aspectRatio,
                imageSize
            }
        }
    };
}

export function extractGeminiImageDataUrl(responseData = {}) {
    const candidates = Array.isArray(responseData?.candidates) ? responseData.candidates : [];

    for (const candidate of candidates) {
        const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
        for (const part of parts) {
            const image = getInlineImage(part);
            if (image) return image;
        }
    }

    const finishReasons = candidates
        .map(candidate => candidate?.finishReason)
        .filter(Boolean)
        .join(', ');
    const blockReason = responseData?.promptFeedback?.blockReason;
    const detail = blockReason || finishReasons;
    throw new Error(`Gemini 图片响应中没有可用图片${detail ? `（${detail}）` : ''}`);
}
