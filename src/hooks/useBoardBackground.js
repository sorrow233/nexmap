import { useState } from 'react';
import { loadBoard } from '../services/storage';
import { uploadImageToS3, getS3Config } from '../services/s3';
// Dynamic import for LLM to avoid circular dependencies or heavy load if not needed immediately
// import { chatCompletion, imageGeneration, DEFAULT_ROLES } from '../services/llm'; 
import { DEFAULT_ROLES } from '../services/llm/registry';
import { useStore } from '../store/useStore';

export default function useBoardBackground() {
    const [generatingBoardId, setGeneratingBoardId] = useState(null);
    const { providers, activeId, getRoleModel } = useStore();

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
            const analysisPrompt = `You are an expert Japanese illustrator specializing in **Irasutoya style** (いらすとや風).
            
            **MANDATORY STYLE**: images MUST use **Irasutoya style** (Mifune Takashi style) - soft colors, rounded shapes, hand-drawn feel, textureless or soft-textured, warm atmosphere.
            
            **CONTENT TO ANALYZE**:
            """
            ${boardContext.slice(0, 3000)}
            """
            
            **YOUR TASK**:
            1. **Identify the Core Topic & Design Diverse Characters**:
               - AVOID defaulting to a generic male office worker unless explicitly required.
               - actively separate roles: use women, children, elderly, or animals (cat/dog/rabbit) where appropriate to increase variety.
               - Example: For "testing", use a female engineer or a cat using a computer.
               - Example: For "family", use a diverse group.
            
            2. **Character Design**: Describe the character(s) in Irasutoya style.
               - "Soft rounded features, beady eyes (dot eyes), simple smile, pastel/warm clothing colors".
               - "No sharp angles, no detailed noses, simple hands".
            
            3. **Style**: "Irasutoya style", "Mifune Takashi", "Flat but warm", "No outlines or soft colored outlines".
            
            **OUTPUT FORMAT** (1-2 sentences):
            Describe ONLY the character(s) and their action/setting.
            FOCUS on identifying the subject as "Irasutoya style character".`;

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
            const promptGenPrompt = `You are an expert prompt engineer for **Irasutoya / Mifune Takashi style** image generation.
            
            **CHARACTER CONCEPT**: "${visualConcept}"
            
            **CRITICAL RULES**:
            1. **Style MUST be**: "Irasutoya style" (いらすとや), by Takashi Mifune. Low saturation, warm pastel colors, soft rounded clean lines (or no lines).
            2. **Faces**: Simple "dot eyes" (beady eyes), simple smiles, generic but expressive faces typical of Irasutoya.
            3. **Proportions**: Soft, slightly rounded proportions (2-3 heads tall). NOT realistic, NOT standard anime.
            4. **Background**: Minimal, solid or simple pattern background (white/beige dominant).
            5. **No Text**: The image must NOT contain any text.
            
            **FORBIDDEN STYLE KEYWORDS**:
            - NO "anime big eyes", "detailed shading", "cinematic lighting", "sharp outlines", "3D render".
            - NO "Corporate Memphis" (flat vector art with exaggerated limbs).
            
            **ALLOWED STYLE KEYWORDS**:
            - "Irasutoya style", "Takashi Mifune", "Japanese clip art", "soft illustration", "warm pastel colors", "cute simple character", "hand-drawn feel".
            
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
