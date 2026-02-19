import { useState, useCallback, useEffect, useRef } from 'react';
import { loadBoard } from '../services/storage';
import { uploadImageToS3 } from '../services/s3';
// Dynamic import for LLM to avoid circular dependencies
// import { chatCompletion, imageGeneration, DEFAULT_ROLES } from '../services/llm'; 
import { useStore } from '../store/useStore';
import { getAnalysisPrompt, getPromptGeneratorPrompt, DEFAULT_STYLE } from '../services/image/imageStylePrompts';
import { useToast } from '../components/Toast';
import { aiSummaryService } from '../services/aiSummaryService';

const MAX_CONTEXT_CHARS = 12000;
const MAX_CARD_SNIPPET_CHARS = 600;
const IMAGE_GENERATION_TASKS = new Map();
const SUMMARY_GENERATION_TASKS = new Map();

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const trimText = (value = '', maxLength = 0) => {
    if (typeof value !== 'string') return '';
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!maxLength || normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength)}...`;
};

const getErrorMessage = (error) => {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (typeof error.message === 'string') return error.message;
    return String(error);
};

const isRetryableGenerationError = (error) => {
    const message = getErrorMessage(error).toLowerCase();
    if (!message) return false;

    const fatalPatterns = [
        'provider configuration is missing',
        'no text content found',
        '没有可用的',
        'api key',
        'failed to analyze context',
        'failed to generate final prompt'
    ];
    if (fatalPatterns.some(pattern => message.includes(pattern))) {
        return false;
    }

    const retryablePatterns = [
        'network',
        'timeout',
        'timed out',
        'temporarily',
        '429',
        '500',
        '502',
        '503',
        '504',
        'rate limit',
        'fetch',
        'disconnect',
        'err_'
    ];

    return retryablePatterns.some(pattern => message.includes(pattern));
};

const withRetry = async (task, { label, maxAttempts = 3, baseDelayMs = 900 } = {}) => {
    let attempt = 0;
    let lastError = null;

    while (attempt < maxAttempts) {
        attempt += 1;
        try {
            return await task();
        } catch (error) {
            lastError = error;
            const shouldRetry = attempt < maxAttempts && isRetryableGenerationError(error);
            if (!shouldRetry) throw error;
            const delay = baseDelayMs * (2 ** (attempt - 1));
            console.warn(`[${label || 'Retry'}] Attempt ${attempt} failed, retrying in ${delay}ms`, error);
            await wait(delay);
        }
    }

    throw lastError || new Error(`${label || 'Task'} failed`);
};

export default function useBoardBackground() {
    const [generatingBoardId, setGeneratingBoardId] = useState(null);
    const toast = useToast();
    const mountedRef = useRef(true);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const safeSetGeneratingBoardId = useCallback((value) => {
        if (mountedRef.current) {
            setGeneratingBoardId(value);
        }
    }, []);

    // Unified role config helper 
    const getRoleConfig = (role) => {
        return useStore.getState().getRoleConfig(role);
    };

    // Shared Helper: Extract Text from Board
    const extractBoardContext = async (boardId) => {
        const boardData = await loadBoard(boardId);
        if (!boardData) throw new Error("Board data could not be loaded");

        if (!boardData.cards || boardData.cards.length === 0) {
            return { boardData, context: "" };
        }

        const contextParts = [];
        let remainingChars = MAX_CONTEXT_CHARS;

        for (const card of boardData.cards) {
            if (remainingChars <= 0) break;
            const parts = [];
            if (card.data?.title) parts.push(trimText(card.data.title, MAX_CARD_SNIPPET_CHARS));
            if (card.data?.text) parts.push(trimText(card.data.text, MAX_CARD_SNIPPET_CHARS));
            if (card.data?.content) parts.push(trimText(card.data.content, MAX_CARD_SNIPPET_CHARS));
            if (Array.isArray(card.data?.messages)) {
                const messageText = card.data.messages
                    .map(message => {
                        if (typeof message?.content === 'string') return message.content;
                        if (Array.isArray(message?.content)) {
                            return message.content
                                .map(part => (typeof part?.text === 'string' ? part.text : ''))
                                .filter(Boolean)
                                .join(' ');
                        }
                        return '';
                    })
                    .filter(Boolean)
                    .join(' ');
                if (messageText) parts.push(trimText(messageText, MAX_CARD_SNIPPET_CHARS));
            }

            const combined = parts.join(' ').trim();
            if (!combined) continue;

            const chunk = combined.length > remainingChars
                ? `${combined.slice(0, Math.max(0, remainingChars - 3))}...`
                : combined;

            contextParts.push(chunk);
            remainingChars -= chunk.length + 1;
        }

        const context = contextParts.join('\n');
        if (context.length >= MAX_CONTEXT_CHARS) {
            console.log(`[Image Gen] Context truncated to ${MAX_CONTEXT_CHARS} chars`);
        }

        return { boardData, context };
    };

    /**
     * INDEPENDENT LOGIC 1: Generate Text Summary (Tags/Theme)
     * Triggered when cards > 3
     */
    const generateBoardSummary = async (boardId, onUpdateBoardMetadata) => {
        if (!boardId) return null;

        if (SUMMARY_GENERATION_TASKS.has(boardId)) {
            console.log(`[Summary Gen] Deduped request for board ${boardId}`);
            return SUMMARY_GENERATION_TASKS.get(boardId);
        }

        const task = (async () => {
            try {
                const config = getRoleConfig('analysis');
                const { boardData } = await extractBoardContext(boardId);
                const summaryResult = await withRetry(
                    () => aiSummaryService.generateBoardSummary(boardData, boardData.cards, config),
                    { label: 'Summary Gen', maxAttempts: 2, baseDelayMs: 800 }
                );

                console.log('[Summary Gen] Result:', summaryResult);

                if (summaryResult && onUpdateBoardMetadata) {
                    await onUpdateBoardMetadata(boardId, { summary: summaryResult });
                    toast.success("Board Tags Updated!");
                }
                return summaryResult;
            } catch (error) {
                console.error("[Summary Gen] Failed:", error);
                return null;
            } finally {
                SUMMARY_GENERATION_TASKS.delete(boardId);
            }
        })();

        SUMMARY_GENERATION_TASKS.set(boardId, task);
        return task;
    };

    /**
     * INDEPENDENT LOGIC 2: Generate Visual Background (Image)
     * Triggered manual or when cards > 10
     */
    const generateBoardImage = async (boardId, onUpdateBoardMetadata) => {
        if (!boardId) return null;

        if (IMAGE_GENERATION_TASKS.has(boardId)) {
            console.log(`[Image Gen] Deduped request for board ${boardId}`);
            return IMAGE_GENERATION_TASKS.get(boardId);
        }

        const task = (async () => {
            try {
                safeSetGeneratingBoardId(boardId);
                const textConfig = getRoleConfig('analysis');
                const imageConfig = getRoleConfig('image');

                console.log('[Image Gen] Starting generation for board:', boardId);

                // 1. Context
                const { context } = await extractBoardContext(boardId);
                if (!context || !context.trim()) {
                    toast.error("No text content found to visualize.");
                    return null;
                }

                console.log('[Image Gen] Context length:', context.length);

                // 2. Visual Concept Analysis
                const analysisPrompt = getAnalysisPrompt(context, DEFAULT_STYLE);
                console.log('[Image Gen] Analyzing Visual Concept...');

                const { chatCompletion, imageGeneration } = await import('../services/llm');

                const visualConcept = await withRetry(
                    () => chatCompletion(
                        [{ role: 'user', content: analysisPrompt }],
                        textConfig,
                        textConfig.model
                    ),
                    { label: 'Image Concept', maxAttempts: 3, baseDelayMs: 900 }
                );

                console.log('[Image Gen] Visual Concept:', visualConcept);
                if (!visualConcept) throw new Error("Failed to analyze context");

                // 3. Prompt Generation
                const promptGenPrompt = getPromptGeneratorPrompt(visualConcept, DEFAULT_STYLE);
                const imagePrompt = await withRetry(
                    () => chatCompletion(
                        [{ role: 'user', content: promptGenPrompt }],
                        textConfig,
                        textConfig.model
                    ),
                    { label: 'Image Prompt', maxAttempts: 3, baseDelayMs: 900 }
                );

                console.log('[Image Gen] Final Image Prompt:', imagePrompt);
                if (!imagePrompt) throw new Error("Failed to generate final prompt");

                // 4. Image Generation
                toast.success("Generating Visuals...");
                const imageUrl = await withRetry(
                    () => imageGeneration(
                        imagePrompt,
                        imageConfig,
                        imageConfig.model
                    ),
                    { label: 'Image Render', maxAttempts: 3, baseDelayMs: 1000 }
                );

                if (!imageUrl) throw new Error("Failed to generate image");

                // 5. Processing & Upload (S3 or Local Base64)
                let finalImageUrl = imageUrl;
                const markdownMatch = finalImageUrl.match(/\!\[.*?\]\((.*?)\)/);
                if (markdownMatch && markdownMatch[1]) {
                    finalImageUrl = markdownMatch[1];
                }

                // Always attempt to persist the image (S3 or Local)
                // This prevents expiring URLs from being saved to the board
                try {
                    let blob;
                    if (finalImageUrl.startsWith('data:')) {
                        const byteString = atob(finalImageUrl.split(',')[1]);
                        const mimeString = finalImageUrl.split(',')[0].split(':')[1].split(';')[0];
                        const ab = new ArrayBuffer(byteString.length);
                        const ia = new Uint8Array(ab);
                        for (let i = 0; i < byteString.length; i++) {
                            ia[i] = byteString.charCodeAt(i);
                        }
                        blob = new Blob([ab], { type: mimeString });
                    } else {
                        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(finalImageUrl)}`;
                        const response = await withRetry(
                            () => fetch(proxyUrl),
                            { label: 'Image Download', maxAttempts: 3, baseDelayMs: 900 }
                        );
                        if (!response.ok) throw new Error("Failed to download generated image via proxy");
                        blob = await response.blob();
                    }

                    const file = new File([blob], `bg_${boardId}_${Date.now()}.png`, { type: 'image/png' });

                    // uploadImageToS3 will now handle the logic:
                    // - If S3 Config exists -> Upload to S3 -> Return S3 URL
                    // - If NO Config -> Convert to Base64 (Compressed) -> Return Base64
                    finalImageUrl = await withRetry(
                        () => uploadImageToS3(file, 'backgrounds'),
                        { label: 'Image Persist', maxAttempts: 2, baseDelayMs: 900 }
                    );

                } catch (uploadError) {
                    console.warn('[Image Gen] Persistence Failed (using original URL):', uploadError);
                    // If persistence fails, we keep the original URL (better than nothing)
                }

                // 6. Save
                if (onUpdateBoardMetadata) {
                    await onUpdateBoardMetadata(boardId, { backgroundImage: finalImageUrl });
                    toast.success("Board Background Updated!");
                }

                return finalImageUrl;
            } catch (error) {
                console.error("[Image Gen] Failed:", error);
                toast.error(`Generation failed: ${error.message}`);
                return null;
            } finally {
                IMAGE_GENERATION_TASKS.delete(boardId);
                safeSetGeneratingBoardId(null);
            }
        })();

        IMAGE_GENERATION_TASKS.set(boardId, task);
        return task;
    };

    // Backward compatibility wrapper (but we should migrate call sites)
    const generateBackground = async (boardId, onUpdateBoardMetadata, options = {}) => {
        // If summaryOnly was passed, call summary
        // if (options.summaryOnly) return generateBoardSummary(boardId, onUpdateBoardMetadata);
        // Default to Image
        return generateBoardImage(boardId, onUpdateBoardMetadata);
    };

    return {
        generatingBoardId,
        generateBackground,      // Deprecated wrapper
        generateBoardSummary,    // New Independent Summary Text
        generateBoardImage       // New Independent Image Logic
    };
}
