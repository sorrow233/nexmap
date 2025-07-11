/**
 * System Credits Provider
 * 
 * LLM Provider that uses system credits for users without their own API key.
 * Uses DeepSeek-V3.2 model for cost efficiency via OpenAI Protocol.
 */

import { LLMProvider } from './base';
import { resolveRemoteImages } from '../utils';
import {
    streamWithSystemCredits,
    chatWithSystemCredits,
    CreditsExhaustedError
} from '../../systemCredits/systemCreditsService';

export class SystemCreditsProvider extends LLMProvider {
    constructor() {
        // No config needed - everything is server-side
        super({});
        this.model = 'deepseek-ai/DeepSeek-V3.2';
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
        const resolvedMessages = await resolveRemoteImages(messages);

        // Pass standard messages to backend
        const formattedMessages = this.formatMessages(resolvedMessages);

        const requestBody = {
            messages: formattedMessages,
            temperature: options.temperature !== undefined ? options.temperature : 1.0,
            max_tokens: 8192,
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
        const resolvedMessages = await resolveRemoteImages(messages);
        const formattedMessages = this.formatMessages(resolvedMessages);

        const requestBody = {
            messages: formattedMessages,
            temperature: options.temperature !== undefined ? options.temperature : 1.0,
            max_tokens: 8192,
        };

        await streamWithSystemCredits(requestBody, onToken, options);
    }

    /**
     * Image generation - NOT supported with system credits
     */
    async generateImage(prompt, model, options = {}) {
        throw new Error('图片生成功能需要配置您自己的 API Key。请在设置中添加您的 GMI API Key。');
    }
}
