import { useState } from 'react';
import { loadBoard } from '../services/storage';
import { uploadImageToS3, getS3Config } from '../services/s3';
// Dynamic import for LLM to avoid circular dependencies or heavy load if not needed immediately
// import { chatCompletion, imageGeneration, DEFAULT_ROLES } from '../services/llm'; 
import { DEFAULT_ROLES } from '../services/llm/registry';
import { useStore } from '../store/useStore';
import { getAnalysisPrompt, getPromptGeneratorPrompt, DEFAULT_STYLE } from '../services/image/imageStylePrompts';

export default function useBoardBackground() {
    const [generatingBoardId, setGeneratingBoardId] = useState(null);
    const { providers, activeId, getRoleModel } = useStore(state => ({
        providers: state.providers,
        activeId: state.activeId,
        getRoleModel: state.getRoleModel
    }));

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

            // 1. Load board content
            const boardData = await loadBoard(boardId);
            if (!boardData || !boardData.cards || boardData.cards.length === 0) {
                alert("Board is empty. Add some content first to generate a background!");
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
                    return parts.join(' ');
                })
                .filter(text => text && text.trim().length > 0)
                .join('\n');

            // console.log('[Background Gen] Extracted context length:', boardContext.length);

            if (!boardContext.trim()) {
                alert("No text found on board. Add some text first!");
                setGeneratingBoardId(null);
                return;
            }

            // 3. Stage 1: Context Analysis & Character/Scene Design
            // Use 'analysis' model (Gemini Flash) to understand the board and design flat illustration characters/scenes
            const analysisPrompt = getAnalysisPrompt(boardContext, DEFAULT_STYLE);

            // console.log('[Background Gen] Stage 1: Analyzing context...');
            const { chatCompletion, imageGeneration } = await import('../services/llm');
            const visualConcept = await chatCompletion(
                [{ role: 'user', content: analysisPrompt }],
                config,
                getModelForRole('analysis')
            );

            // console.log('[Background Gen] Visual Concept:', visualConcept);

            if (!visualConcept) throw new Error("Failed to analyze context");

            // Stage 2: Prompt Generation for Flat Illustration Style
            // Convert the character concept into a simple, direct image prompt
            const promptGenPrompt = getPromptGeneratorPrompt(visualConcept, DEFAULT_STYLE);

            // console.log('[Background Gen] Stage 2: Drafting final prompt...');
            const imagePrompt = await chatCompletion(
                [{ role: 'user', content: promptGenPrompt }],
                config,
                getModelForRole('analysis') // Or use 'chat' if preferred, but Flash is fine for this
            );

            // console.log('[Background Gen] Final Generated Prompt:', imagePrompt);

            if (!imagePrompt) throw new Error("Failed to generate final prompt");

            // 4. Generate Image
            const imageUrl = await imageGeneration(
                imagePrompt,
                config,
                getModelForRole('image')
            );

            if (!imageUrl) throw new Error("Failed to generate image");

            // console.log('[Background Gen] Image URL:', imageUrl);

            // 5. Check S3 Config & Upload
            let finalImageUrl = imageUrl;

            // CLEANUP: The model often returns markdown like ![image](url). Extract just the URL.
            const markdownMatch = finalImageUrl.match(/\!\[.*?\]\((.*?)\)/);
            if (markdownMatch && markdownMatch[1]) {
                // console.log('[Background Gen] Extracted clean URL from markdown:', finalImageUrl.substring(0, 50) + '...');
            }

            const s3Config = getS3Config();

            if (s3Config && s3Config.enabled) {
                try {
                    // console.log('[Background Gen] S3 is enabled, processing image...');
                    let blob;

                    // Handle Data URI directly (Skip Proxy & Network Stack)
                    if (finalImageUrl.startsWith('data:')) {
                        // console.log('[Background Gen] Detected Data URI. Converting locally via Byte extraction...');
                        // Pure JS conversion to avoid fetch() blocking
                        const byteString = atob(finalImageUrl.split(',')[1]);
                        const mimeString = finalImageUrl.split(',')[0].split(':')[1].split(';')[0];
                        const ab = new ArrayBuffer(byteString.length);
                        const ia = new Uint8Array(ab);
                        for (let i = 0; i < byteString.length; i++) {
                            ia[i] = byteString.charCodeAt(i);
                        }
                        blob = new Blob([ab], { type: mimeString });
                    } else {
                        // Handle Remote URL (Use Proxy to bypass CORS)
                        // console.log('[Background Gen] Detected Remote URL. Using Proxy...');
                        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(finalImageUrl)}`;
                        const response = await fetch(proxyUrl);
                        if (!response.ok) throw new Error("Failed to download generated image via proxy");
                        blob = await response.blob();
                    }

                    const file = new File([blob], `bg_${boardId}_${Date.now()}.png`, { type: 'image/png' });
                    finalImageUrl = await uploadImageToS3(file);
                    // console.log('[Background Gen] Successfully uploaded to S3:', finalImageUrl);

                } catch (uploadError) {
                    // console.error('[Background Gen] S3 Upload Failed:', uploadError);
                    alert(`Background generated but S3 Upload failed: ${uploadError.message}. Using temporary URL.`);
                    // We keep finalImageUrl as valid GMI url so user still gets a result (if it's not a massive data uri causing issues elsewhere)
                }
            } else {
                // console.log('[Background Gen] S3 not configured/enabled. Using raw URL.');
            }

            // 6. Save to board metadata via callback
            if (onUpdateBoardMetadata) {
                await onUpdateBoardMetadata(boardId, { backgroundImage: finalImageUrl });
            }

        } catch (error) {
            // console.error("Background generation failed:", error);
            alert("Failed to generate background. Check your 'Image Generation' settings or try again.");
        } finally {
            setGeneratingBoardId(null);
        }
    };

    return {
        generatingBoardId,
        generateBackground
    };
}
