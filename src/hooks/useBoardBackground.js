import { useState } from 'react';
import { loadBoard } from '../services/storage';
import { uploadImageToS3, getS3Config } from '../services/s3';
// Dynamic import for LLM to avoid circular dependencies or heavy load if not needed immediately
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
        // Fallback if store is not yet loaded or empty
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

    const generateBackground = async (boardId, onUpdateBoardMetadata) => {
        try {
            setGeneratingBoardId(boardId);
            const config = getLlmConfig();

            console.log('[Background Gen] Starting generation for board:', boardId);

            // 1. Load board content
            const boardData = await loadBoard(boardId);
            if (!boardData) {
                console.error('[Background Gen] Board not found');
                toast.error("Board data could not be loaded.");
                setGeneratingBoardId(null);
                return;
            }
            if (!boardData.cards || boardData.cards.length === 0) {
                console.warn('[Background Gen] Board has no cards');
                toast.error("Board has no cards to analyze.");
                setGeneratingBoardId(null);
                return;
            }

            // 2. Extract text from cards
            const boardContext = boardData.cards
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

            console.log('[Background Gen] Extracted context length:', boardContext.length);

            if (!boardContext.trim()) {
                console.warn('[Background Gen] No text content found in cards');
                toast.error("No text content found to analyze.");
                setGeneratingBoardId(null);
                return;
            }

            // 3. Stage 1: Context Analysis & Character/Scene Design
            const analysisPrompt = getAnalysisPrompt(boardContext, DEFAULT_STYLE);

            console.log('[Background Gen] Stage 1: Parallel Generation...');
            const { chatCompletion, imageGeneration } = await import('../services/llm');
            const { aiSummaryService } = await import('../services/aiSummaryService');

            const [visualConcept, summaryResult] = await Promise.all([
                chatCompletion(
                    [{ role: 'user', content: analysisPrompt }],
                    config,
                    getModelForRole('analysis')
                ),
                aiSummaryService.generateBoardSummary(boardData, boardData.cards, { ...config, model: getModelForRole('analysis') })
            ]);

            console.log('[Background Gen] Summary Result:', summaryResult);
            console.log('[Background Gen] Visual Concept:', visualConcept);

            if (summaryResult && onUpdateBoardMetadata) {
                await onUpdateBoardMetadata(boardId, { summary: summaryResult });
                toast.success("Board Summary Updated!");
            }

            if (!visualConcept) throw new Error("Failed to analyze context (AI returned empty)");

            // Stage 2: Prompt Generation
            const promptGenPrompt = getPromptGeneratorPrompt(visualConcept, DEFAULT_STYLE);
            const imagePrompt = await chatCompletion(
                [{ role: 'user', content: promptGenPrompt }],
                config,
                getModelForRole('analysis')
            );

            console.log('[Background Gen] Image Prompt:', imagePrompt);
            if (!imagePrompt) throw new Error("Failed to generate final prompt");

            // 4. Generate Image
            toast.success("Generating Visuals...");
            const imageUrl = await imageGeneration(
                imagePrompt,
                config,
                getModelForRole('image')
            );

            if (!imageUrl) throw new Error("Failed to generate image");

            // ... (S3 logic same as before) ...
            let finalImageUrl = imageUrl;
            // ... (Markdown cleaning) ...
            const markdownMatch = finalImageUrl.match(/\!\[.*?\]\((.*?)\)/);
            if (markdownMatch && markdownMatch[1]) {
                finalImageUrl = markdownMatch[1];
            }

            const s3Config = getS3Config();
            if (s3Config && s3Config.enabled) {
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
                    finalImageUrl = await uploadImageToS3(file, 'backgrounds');
                } catch (uploadError) {
                    console.warn('[Background Gen] S3 Upload Failed:', uploadError);
                }
            }

            // 6. Save to board metadata via callback
            if (onUpdateBoardMetadata) {
                await onUpdateBoardMetadata(boardId, { backgroundImage: finalImageUrl });
                toast.success("Board Background Updated!");
            }

        } catch (error) {
            console.error("Background generation failed:", error);
            toast.error(`Generation failed: ${error.message}`);
        } finally {
            setGeneratingBoardId(null);
        }
    };

    return {
        generatingBoardId,
        generateBackground
    };
}
