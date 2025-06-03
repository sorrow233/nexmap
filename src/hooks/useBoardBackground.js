import { useState } from 'react';
import { loadBoard } from '../services/storage';
import { uploadImageToS3, getS3Config } from '../services/s3';
// Dynamic import for LLM to avoid circular dependencies or heavy load if not needed immediately
// import { chatCompletion, imageGeneration, DEFAULT_ROLES } from '../services/llm'; 
import { DEFAULT_ROLES } from '../services/llm/registry';
import { useStore } from '../store/useStore';

export default function useBoardBackground() {
    const [generatingBoardId, setGeneratingBoardId] = useState(null);
    const { providers, activeId, roles } = useStore();

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
        return roles?.[role] || DEFAULT_ROLES[role];
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
            const analysisPrompt = `You are an expert Japanese commercial illustrator specializing in **flat design style** (扁平化插画風格), similar to irasutoya (いらすとや).
            
            **MANDATORY STYLE**: All images MUST use **Japanese flat illustration style** (日本插画小人風格) - simple, clean, friendly characters with NORMAL proportions (not big-headed chibi), soft rounded shapes, minimal details.
            
            **CONTENT TO ANALYZE**:
            """
            ${boardContext.slice(0, 3000)}
            """
            
            **YOUR TASK**:
            1. **Identify the Core Topic**:
               - If it mentions a **specific person** (e.g., "Elon Musk", "马斯克"), design that person in flat illustration style with recognizable features
               - If it's about **testing/debugging** (e.g., "测试", "你好"), design a friendly IT engineer/developer testing systems
               - If it's about **sleep issues** (e.g., "睡眠", "失眠"), design a tired person with sleep problems
               - For other topics, design relevant characters doing related activities
            
            2. **Character Design**: Describe the character(s) with NORMAL body proportions (not chibi), simple friendly expression
               - Example for Musk: "Person with Elon's hair and features, wearing black shirt, pointing at simple rocket drawing, friendly smile"
               - Example for testing: "IT engineer with glasses, sitting at desk with laptop, simple office background with floating test icons"
               - Example for sleep: "Tired person with slightly dark eyes, yawning, holding pillow, simple bedroom background with clock"
            
            3. **Style**: Flat design, rounded shapes, soft colors, minimal shadows, commercial illustration aesthetic
            
            **OUTPUT FORMAT** (1-2 sentences):
            Describe ONLY the flat illustration character(s) with normal proportions, their action, and simple background.
            NO chibi/big-head style, NO anime style, NO photorealistic elements.`;

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
            const promptGenPrompt = `You are an expert prompt engineer for **Japanese flat illustration style** image generation.
            
            **CHARACTER CONCEPT**: "${visualConcept}"
            
            **CRITICAL RULES**:
            1. **Style MUST be**: Japanese flat design illustration, simple commercial art style like irasutoya (いらすとや), with NORMAL body proportions
            2. **Simplicity**: Clean flat design - NO gradients, NO complex shading, simple rounded shapes
            3. **Proportions**: NORMAL head-to-body ratio (NOT chibi/big-head style)
            4. **Background**: Minimal, clean background with soft solid colors - must have plenty of empty space for UI text readability
            5. **No Text**: The image must NOT contain any text, letters, numbers, or words
            6. **Quality**: Add only basic quality terms like "clean simple illustration", "soft colors", "professional flat design"
            
            **FORBIDDEN STYLE KEYWORDS** (DO NOT USE):
            - NO "chibi", "kawaii", "big head", "SD style", "Q-version"
            - NO "8k resolution", "ray tracing", "volumetric lighting", "photorealistic", "cinematic", "anime style"
            - NO "Makoto Shinkai", "watercolor", "3D render", "manga", "gradient shading"
            
            **ALLOWED STYLE KEYWORDS**:
            - "Japanese flat illustration", "irasutoya style", "simple flat design", "clean minimalist illustration", "soft rounded shapes", "commercial art style", "normal proportions"
            
            **OUTPUT**: Return ONLY the final English image prompt (1-2 sentences maximum).
            
            **FINAL PROMPT**:`;

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
