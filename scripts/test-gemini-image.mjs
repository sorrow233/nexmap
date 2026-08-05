import {
    buildGeminiImageRequest,
    extractGeminiImageDataUrl
} from '../src/services/image/geminiNativeImage.js';

const assert = (condition, message) => {
    if (!condition) throw new Error(message);
};

const request = buildGeminiImageRequest('draw a quiet library', { size: '1024x1024' });
assert(request.contents[0].parts[0].text === 'draw a quiet library', 'prompt should be preserved');
assert(request.generationConfig.responseModalities.includes('IMAGE'), 'IMAGE modality should be requested');
assert(request.generationConfig.imageConfig.aspectRatio === '1:1', 'square size should map to 1:1');

const camelCaseImage = extractGeminiImageDataUrl({
    candidates: [{
        content: {
            parts: [{ inlineData: { mimeType: 'image/webp', data: 'YWJj' } }]
        }
    }]
});
assert(camelCaseImage === 'data:image/webp;base64,YWJj', 'camelCase inline image should be parsed');

const snakeCaseImage = extractGeminiImageDataUrl({
    candidates: [{
        content: {
            parts: [{ inline_data: { mime_type: 'image/png', data: 'ZGVm\n' } }]
        }
    }]
});
assert(snakeCaseImage === 'data:image/png;base64,ZGVm', 'snake_case inline image should be parsed');

let missingImageError = null;
try {
    extractGeminiImageDataUrl({
        candidates: [{ finishReason: 'SAFETY', content: { parts: [{ text: 'blocked' }] } }]
    });
} catch (error) {
    missingImageError = error;
}
assert(missingImageError?.message.includes('SAFETY'), 'missing image error should include finish reason');

console.log('[test-gemini-image] PASS');
