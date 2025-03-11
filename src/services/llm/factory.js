import { GeminiProvider } from './providers/gemini';
import { OpenAIProvider } from './providers/openai';

export class ModelFactory {
    static getProvider(config) {
        if (!config) throw new Error("Provider configuration is missing.");

        const protocol = config.protocol || 'openai';

        switch (protocol) {
            case 'gemini':
                return new GeminiProvider(config);
            case 'openai':
                return new OpenAIProvider(config);
            default:
                console.warn(`[ModelFactory] Unknown protocol '${protocol}', falling back to OpenAI.`);
                return new OpenAIProvider(config);
        }
    }
}
