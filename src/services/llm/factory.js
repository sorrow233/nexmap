import { GeminiProvider } from './providers/gemini';
import { OpenAIProvider } from './providers/openai';
import { SystemCreditsProvider } from './providers/systemCredits';

export class ModelFactory {
    /**
     * Get provider based on config
     * If no API key is configured, returns SystemCreditsProvider for free trial
     */
    static getProvider(config, options = {}) {
        if (!config) throw new Error("Provider configuration is missing.");

        // Check if user should use system credits (no API key)
        const hasApiKey = config.apiKey && config.apiKey.trim() !== '';

        if (!hasApiKey && !options.skipSystemCredits) {
            console.log('[ModelFactory] No API key configured, using SystemCreditsProvider');
            return new SystemCreditsProvider();
        }

        const protocol = config.protocol || 'openai';

        switch (protocol) {
            case 'gemini':
                return new GeminiProvider(config);
            case 'openai':
                return new OpenAIProvider(config);
            case 'system-credits':
                return new SystemCreditsProvider();
            default:
                console.warn(`[ModelFactory] Unknown protocol '${protocol}', falling back to OpenAI.`);
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

