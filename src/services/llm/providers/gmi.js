import { OpenAIProvider } from './openai';
import { generateGeminiImage } from '../../image/geminiImageGenerator';

const DEFAULT_GMI_TEXT_MODEL = 'google/gemini-3.1-pro-preview';

function isGoogleTextModel(modelId = '') {
    const normalized = String(modelId || '').trim().toLowerCase();
    if (!normalized) return false;

    const clean = normalized.startsWith('google/')
        ? normalized.slice('google/'.length)
        : normalized;

    return (clean.startsWith('gemini-') || clean.startsWith('gemma-')) && !clean.includes('image');
}

export function normalizeGmiModelId(modelId = '') {
    const normalized = String(modelId || '').trim();
    if (!normalized) return DEFAULT_GMI_TEXT_MODEL;

    if (!isGoogleTextModel(normalized)) {
        return normalized;
    }

    return normalized.startsWith('google/')
        ? normalized
        : `google/${normalized}`;
}

export function isGmiBaseUrl(baseUrl = '') {
    return String(baseUrl || '').includes('api.gmi-serving.com');
}

export class GmiProvider extends OpenAIProvider {
    _resolveTextModel(model) {
        return normalizeGmiModelId(model || this.config?.model || DEFAULT_GMI_TEXT_MODEL);
    }

    async chat(messages, model, options = {}) {
        return super.chat(messages, this._resolveTextModel(model), options);
    }

    async stream(messages, onToken, model, options = {}) {
        return super.stream(messages, onToken, this._resolveTextModel(model), options);
    }

    async generateImage(prompt, model, options = {}) {
        const apiKey = this._getKeyPool().getNextKey();
        if (!apiKey) {
            throw new Error('没有可用的 GMI API Key');
        }

        return generateGeminiImage(apiKey, prompt, model, options);
    }
}
