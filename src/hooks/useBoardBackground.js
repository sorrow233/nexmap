import { useState, useCallback } from 'react';
import { loadBoard } from '../services/storage';
import { uploadImageToS3, getS3Config } from '../services/s3';
// Dynamic import for LLM to avoid circular dependencies
// import { chatCompletion, imageGeneration, DEFAULT_ROLES } from '../services/llm'; 
import { DEFAULT_ROLES } from '../services/llm/registry';
import { useStore } from '../store/useStore';
import { getAnalysisPrompt, getPromptGeneratorPrompt, DEFAULT_STYLE } from '../services/image/imageStylePrompts';
import { useToast } from '../components/Toast';

export default function useBoardBackground() {
    const [generatingBoardId, setGeneratingBoardId] = useState(null);
    const { providers, activeId, getRoleModel } = useStore();
    const toast = useToast();

    // Helper to get active config for LLM calls
    const getLlmConfig = () => {
        const activeProvider = providers?.[activeId] || {
            baseUrl: 'https://api.gmi-serving.com/v1',
            apiKey: '',
            protocol: 'gemini'
        };
        return activeProvider;
    };

    const getModelForRole = (role) => {
        return getRoleModel(role);
    };

    // Shared Helper: Extract Text from Board
    const extractBoardContext = async (boardId) => {
        const boardData = await loadBoard(boardId);
        if (!boardData) throw new Error("Board data could not be loaded");

        if (!boardData.cards || boardData.cards.length === 0) {
            return { boardData, context: "" };
        }

        const context = boardData.cards
            .map(c => {
                const parts = [];
                if (c.data?.title) parts.push(c.data.title);
                if (c.data?.text) parts.push(c.data.text);
                if (c.data?.content) parts.push(c.data.content); // For Note cards
                if (c.data?.messages) parts.push(c.data.messages.map(m => m.content).join(' ')); // Chat cards
                return parts.join(' ');
            })
            .filter(text => text && text.trim().length > 0)
            .join('\n');

        return { boardData, context };
    };

    /**
     * INDEPENDENT LOGIC 1: Generate Text Summary (Tags/Theme)
     * Triggered when cards > 3
     */
    const generateBoardSummary = async (boardId, onUpdateBoardMetadata) => {
        try {
            // Quietly set loading state or handle externally if needed. 
            // For summary, we often don't block the UI with a spinner primarily meant for images.
            // But we can set it if we want the same spinner.
            // setGeneratingBoardId(boardId); 

            const config = getLlmConfig();
            const { boardData, context } = await extractBoardContext(boardId);

            if (!context.trim()) {
                console.warn('[Summary Gen] No text content found');
                return;
            }

            console.log('[Summary Gen] Generating summary for:', boardId);

            // Dynamic import
            const { aiSummaryService } = await import('../services/aiSummaryService');

            const summaryResult = await aiSummaryService.generateBoardSummary(
                boardData,
                boardData.cards,
                { ...config, model: getModelForRole('analysis') }
            );

            console.log('[Summary Gen] Result:', summaryResult);

            if (summaryResult && onUpdateBoardMetadata) {
                await onUpdateBoardMetadata(boardId, { summary: summaryResult });
                toast.success("Board Tags Updated!");
            }

        } catch (error) {
            console.error("[Summary Gen] Failed:", error);
            // We usually don't toast error for auto-summary to avoid annoyance
        } finally {
            // setGeneratingBoardId(null);
        }
    };

    /**
     * INDEPENDENT LOGIC 2: Generate Visual Background (Image)
     * Triggered manual or when cards > 10
     */
    const generateBoardImage = async (boardId, onUpdateBoardMetadata) => {
        try {
            setGeneratingBoardId(boardId);
            const config = getLlmConfig();

            console.log('[Image Gen] Starting generation for board:', boardId);

            // 1. Context
            const { context } = await extractBoardContext(boardId);
            if (!context || !context.trim()) {
                toast.error("No text content found to visualize.");
                setGeneratingBoardId(null);
                return;
            }

            console.log('[Image Gen] Context length:', context.length);

            // 2. Visual Concept Analysis
            const analysisPrompt = getAnalysisPrompt(context, DEFAULT_STYLE);
            console.log('[Image Gen] Analyzing Visual Concept...');

            const { chatCompletion, imageGeneration } = await import('../services/llm');

            const visualConcept = await chatCompletion(
                [{ role: 'user', content: analysisPrompt }],
                config,
                getModelForRole('analysis')
            );

            console.log('[Image Gen] Visual Concept:', visualConcept);
            if (!visualConcept) throw new Error("Failed to analyze context");

            // 3. Prompt Generation
            const promptGenPrompt = getPromptGeneratorPrompt(visualConcept, DEFAULT_STYLE);
            const imagePrompt = await chatCompletion(
                [{ role: 'user', content: promptGenPrompt }],
                config,
                getModelForRole('analysis')
            );

            console.log('[Image Gen] Final Image Prompt:', imagePrompt);
            if (!imagePrompt) throw new Error("Failed to generate final prompt");

            // 4. Image Generation
            toast.success("Generating Visuals...");
            const imageUrl = await imageGeneration(
                imagePrompt,
                config,
                getModelForRole('image')
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
                    const response = await fetch(proxyUrl);
                    if (!response.ok) throw new Error("Failed to download generated image via proxy");
                    blob = await response.blob();
                }

                const file = new File([blob], `bg_${boardId}_${Date.now()}.png`, { type: 'image/png' });

                // uploadImageToS3 will now handle the logic:
                // - If S3 Config exists -> Upload to S3 -> Return S3 URL
                // - If NO Config -> Convert to Base64 (Compressed) -> Return Base64
                finalImageUrl = await uploadImageToS3(file, 'backgrounds');

            } catch (uploadError) {
                console.warn('[Image Gen] Persistence Failed (using original URL):', uploadError);
                // If persistence fails, we keep the original URL (better than nothing)
            }

            // 6. Save
            if (onUpdateBoardMetadata) {
                await onUpdateBoardMetadata(boardId, { backgroundImage: finalImageUrl });
                toast.success("Board Background Updated!");
            }

        } catch (error) {
            console.error("[Image Gen] Failed:", error);
            toast.error(`Generation failed: ${error.message}`);
        } finally {
            setGeneratingBoardId(null);
        }
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
