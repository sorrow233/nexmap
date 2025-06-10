/**
 * System Credits Provider
 * 
 * LLM Provider that uses system credits for users without their own API key.
 * Uses DeepSeek-V3.2 model for cost efficiency.
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
     * Format messages to Gemini format
     */
    formatMessages(messages) {
        const contents = [];
        let systemInstruction = "";

        messages.forEach(msg => {
            if (msg.role === 'system') {
                systemInstruction += (typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)) + "\n";
                return;
            }

            const role = msg.role === 'assistant' ? 'model' : 'user';
            let parts = [];

            if (typeof msg.content === 'string') {
                parts = [{ text: msg.content }];
            } else if (Array.isArray(msg.content)) {
                parts = msg.content.map(part => {
                    if (part.type === 'text') return { text: part.text };
                    if (part.type === 'image') return {
                        inline_data: {
                            mime_type: part.source.media_type,
                            data: part.source.data
                        }
                    };
                    return null;
                }).filter(Boolean);
            }

            if (contents.length > 0 && contents[contents.length - 1].role === role) {
                contents[contents.length - 1].parts.push(...parts);
            } else {
                contents.push({ role, parts });
            }
        });

        return { contents, systemInstruction };
    }

    /**
     * Non-streaming chat (for analysis tasks)
     */
    async chat(messages, model, options = {}) {
        const resolvedMessages = await resolveRemoteImages(messages);
        const { contents, systemInstruction } = this.formatMessages(resolvedMessages);

        const requestBody = {
            contents,
            tools: [{ google_search: {} }],
            generationConfig: {
                temperature: options.temperature !== undefined ? options.temperature : 1.0,
                maxOutputTokens: 32768, // Lower limit for Flash
            }
        };

        if (systemInstruction) {
            requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        console.log('[SystemCredits] Making chat request with system credits');

        const response = await chatWithSystemCredits(requestBody);

        // Log remaining credits
        if (response._systemCredits) {
            console.log(`[SystemCredits] Credits used: ${response._systemCredits.used.toFixed(4)}, Remaining: ${response._systemCredits.remaining.toFixed(2)}`);
        }

        const content = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return content;
    }

    /**
     * Streaming chat (for main conversations)
     */
    async stream(messages, onToken, model, options = {}) {
        const resolvedMessages = await resolveRemoteImages(messages);
        const { contents, systemInstruction } = this.formatMessages(resolvedMessages);

        const requestBody = {
            contents,
            tools: [{ google_search: {} }],
            generationConfig: {
                temperature: options.temperature !== undefined ? options.temperature : 1.0,
                maxOutputTokens: 32768,
            }
        };

        if (systemInstruction) {
            requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        console.log('[SystemCredits] Starting stream with system credits');

        await streamWithSystemCredits(requestBody, onToken, options);
    }

    /**
     * Image generation - NOT supported with system credits
     */
    async generateImage(prompt, model, options = {}) {
        throw new Error('图片生成功能需要配置您自己的 API Key。请在设置中添加您的 GMI API Key。');
    }
}
