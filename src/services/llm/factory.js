import { GeminiProvider } from './providers/gemini.js';
import { GmiProvider, isGmiBaseUrl } from './providers/gmi.js';
import { OpenAIProvider } from './providers/openai.js';
import { SystemCreditsProvider } from './providers/systemCredits.js';
import { runtimeLog, runtimeWarn } from '../../utils/runtimeLogging';

export class ModelFactory {
    static hasGoogleOfficialKey(config = {}) {
        const keys = String(config.apiKeys || config.apiKey || '')
            .split(',')
            .map((key) => key.trim())
            .filter(Boolean);

        return keys.some((key) => key.startsWith('AIza'));
    }

    static shouldUseGmiProvider(config = {}) {
        return isGmiBaseUrl(config.baseUrl) && !this.hasGoogleOfficialKey(config);
    }

    /**
     * Check if a model should use Gemini native protocol
     * @param {string} model - Model name
     * @returns {boolean}
     */
    static isGeminiModel(model) {
        if (!model) return false;
        const lowerModel = model.toLowerCase();
        // Match: google/gemini-*, gemini-*, gemma-*
        return lowerModel.startsWith('google/gemini') ||
            lowerModel.startsWith('gemini') ||
            lowerModel.startsWith('google/gemma') ||
            lowerModel.startsWith('gemma');
    }

    /**
     * Check if a model outputs thinking content with <think>...</think> tags
     * These models need special filtering to hide thought process
     * @param {string} model - Model name
     * @returns {boolean}
     */
    static isThinkingModel(model) {
        if (!model) return false;
        const lowerModel = model.toLowerCase();
        // Kimi-K2.5, DeepSeek-R1, and models with "-thinking" suffix
        return lowerModel.includes('kimi-k2.5') ||
            lowerModel.includes('kimi-k2') ||
            lowerModel.includes('deepseek-r1') ||
            lowerModel.includes('-thinking') ||
            lowerModel.includes('_thinking');
    }

    /**
     * Get provider based on config and model
     * If no API key is configured, returns SystemCreditsProvider for free trial
     * 
     * Protocol selection logic:
     * 1. If config.protocol is 'gemini' AND model is a Gemini model → GeminiProvider
     * 2. If config.protocol is 'gemini' BUT model is NOT a Gemini model → OpenAIProvider (auto-switch)
     * 3. If config.protocol is 'openai' → OpenAIProvider
     * 4. Default → OpenAIProvider
     * 
     * @param {Object} config - Provider config
     * @param {Object} options - Options including model name
     * @param {string} options.model - Model name for protocol auto-detection
     */
    static getProvider(config, options = {}) {
        if (!config) throw new Error("Provider configuration is missing.");

        // Check if user should use system credits (no API key)
        const hasApiKey = config.apiKey && config.apiKey.trim() !== '';

        if (!hasApiKey && !options.skipSystemCredits) {
            runtimeLog('[ModelFactory] No API key configured, using SystemCreditsProvider');
            return new SystemCreditsProvider();
        }

        const protocol = config.protocol || 'openai';
        const model = options.model || config.model || '';

        // Auto-detect protocol based on model name
        if (protocol === 'gemini') {
            // Only use Gemini native protocol for actual Gemini models
            if (this.isGeminiModel(model)) {
                if (this.shouldUseGmiProvider(config)) {
                    return new GmiProvider(config);
                }
                return new GeminiProvider(config);
            } else {
                // Non-Gemini model on Gemini provider config → use OpenAI compatible
                runtimeLog(`[ModelFactory] Model '${model}' is not a Gemini model, using OpenAI compatible protocol`);
                return new OpenAIProvider(config);
            }
        }

        switch (protocol) {
            case 'openai':
                return new OpenAIProvider(config);
            case 'system-credits':
                return new SystemCreditsProvider();
            default:
                runtimeWarn(`[ModelFactory] Unknown protocol '${protocol}', falling back to OpenAI.`);
                return new OpenAIProvider(config);
        }
    }

    /**
     * Check if system credits should be used
     */
    static shouldUseSystemCredits(config) {
        return !config?.apiKey || config.apiKey.trim() === '';
    }
}
