/**
 * System Credits Provider
 * 
 * LLM Provider that uses system credits for users without their own API key.
 * Uses Kimi-K2-Thinking model for free tier conversations (200 times/week).
 */

import { LLMProvider } from './base';
import { resolveAllImages } from '../utils';
import {
    streamWithSystemCredits,
    chatWithSystemCredits,
    imageWithSystemCredits,
    CreditsExhaustedError,
    ImageQuotaExhaustedError
} from '../../systemCredits/systemCreditsService';

export class SystemCreditsProvider extends LLMProvider {
    constructor() {
        // No config needed - everything is server-side
        super({});
        this.model = 'moonshotai/Kimi-K2-Thinking';
    }

    /**
     * Format messages to OpenAI format (standard)
     */
    formatMessages(messages) {
        // OpenAI format is straightforward: mapped directly
        return messages.map(msg => {
            // Handle image content for OpenAI (GPT-4 Vision style)
            if (Array.isArray(msg.content)) {
                return {
                    role: msg.role,
                    content: msg.content.map(part => {
                        if (part.type === 'text') return { type: 'text', text: part.text };
                        if (part.type === 'image') return {
                            type: 'image_url',
                            image_url: {
                                url: `data:${part.source.media_type};base64,${part.source.data}`
                            }
                        };
                        return null;
                    }).filter(Boolean)
                };
            }

            // Standard text content
            return {
                role: msg.role,
                content: msg.content
            };
        });
    }

    /**
     * Non-streaming chat (for analysis tasks)
     */
    async chat(messages, model, options = {}) {
        const resolvedMessages = await resolveAllImages(messages);

        // Pass standard messages to backend
        const formattedMessages = this.formatMessages(resolvedMessages);

        const requestBody = {
            messages: formattedMessages,
            temperature: options.temperature !== undefined ? options.temperature : 1.0
        };

        const response = await chatWithSystemCredits(requestBody);

        // Standard text content

        // Parse OpenAI response format
        const content = response.choices?.[0]?.message?.content || "";
        return content;
    }

    /**
     * Streaming chat (for main conversations)
     */
    async stream(messages, onToken, model, options = {}) {
        const resolvedMessages = await resolveAllImages(messages);
        const formattedMessages = this.formatMessages(resolvedMessages);

        const requestBody = {
            messages: formattedMessages,
            temperature: options.temperature !== undefined ? options.temperature : 1.0
        };

        await streamWithSystemCredits(requestBody, onToken, options);
    }

    /**
     * Image generation using system credits
     * Uses Seedream model with weekly quota (20/week)
     */
    async generateImage(prompt, model, options = {}) {
        const result = await imageWithSystemCredits(prompt, {
            size: options.size || '1024x1024',
            watermark: options.watermark || false
        });

        // Return the image URL in the expected format
        return result.url;
    }
}
