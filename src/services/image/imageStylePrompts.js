/**
 * Image Style Prompts Module
 * 
 * Centralized style definitions for image generation.
 * Implements Japanese "Free Sozai" (フリー素材) style, specifically:
 * - Kango Roo! (看護roo!) style: Soft, clinical, rounded medical illustrations
 * - Irasutoya (いらすとや) style: Hand-drawn feel, warm textures
 */

/**
 * Style Types
 */
export const STYLE_TYPES = {
    KANGO_ROO: 'kango_roo',     // 看護roo! style - medical/soft/clinical
    IRASUTOYA: 'irasutoya',     // いらすとや - hand-drawn texture
};

/**
 * Default style for all image generation
 */
export const DEFAULT_STYLE = STYLE_TYPES.KANGO_ROO;

/**
 * Style Definitions
 * Each style contains:
 * - name: Display name
 * - description: What makes this style unique
 * - keywords: Positive prompts to include
 * - negative: Things to avoid
 * - characterRules: How to draw characters
 * - colorPalette: Color guidance
 */
const STYLE_DEFINITIONS = {
    [STYLE_TYPES.KANGO_ROO]: {
        name: 'Kango Roo! (看護roo!)',
        description: 'Japanese medical/nursing illustration style. Extremely soft, rounded, clinical colors. Used to de-escalate scary medical topics.',

        // Core style keywords
        keywords: [
            'みふねたかし style',         // Takashi Mifune in Japanese - most important
            'Mifune Takashi illustration',
            'いらすとや風',                // Irasutoya style in Japanese
            'Irasutoya style',
            'Japanese フリー素材',
            'Kango Roo style',
            'soft rounded shapes',
            'clinical pastel colors',
            'gentle and approachable',
            'educational illustration',
            'simple clean design',
            'no harsh outlines',
            'soft colored edges',
        ],

        // Things to explicitly avoid
        negative: [
            'anime style',
            'realistic',
            'photographic',
            'sharp outlines',
            '3D render',
            'cinematic lighting',
            'dramatic shadows',
            'detailed shading',
            'complex textures',
            'scary',
            'bloody',
            'anatomically detailed',
        ],

        // Character design rules
        characterRules: `
            - Simple "dot eyes" (●) or small oval eyes, never anime-style large eyes
            - Minimal facial features: simple nose (or none), gentle curved smile
            - Rounded body proportions, soft edges, 2-3 heads tall
            - Hands simplified (mitten-like or 4 fingers)
            - Clothing in soft pastel colors (light blue, pink, cream, mint)
            - No gender stereotyping - use diverse characters (women, elderly, children, animals)
            - Expressions simple but warm and reassuring
        `,

        // Color guidance
        colorPalette: `
            - Low saturation pastels: soft pink, light blue, cream, mint green
            - White or very light beige backgrounds
            - Soft shadows using slightly darker pastels (no black shadows)
            - Skin tones in warm peachy-cream
            - Avoid primary colors; use muted, clinical versions
        `,
    },

    [STYLE_TYPES.IRASUTOYA]: {
        name: 'Irasutoya (いらすとや)',
        description: 'Takashi Mifune style. Hand-drawn texture, warm atmosphere, ubiquitous in Japan.',

        keywords: [
            'Irasutoya style',
            'Mifune Takashi',
            'いらすとや',
            'Japanese clip art',
            'warm pastel colors',
            'hand-drawn feel',
            'soft texture',
            'cute simple character',
            'flat illustration',
        ],

        negative: [
            'anime',
            'realistic',
            'photographic',
            'sharp lines',
            '3D render',
            'corporate memphis',
        ],

        characterRules: `
            - Beady "dot eyes", simple expressions
            - Soft rounded proportions
            - Hand-drawn texture/grain
            - 2-3 heads tall proportions
            - Simple but expressive poses
        `,

        colorPalette: `
            - Warm pastel colors
            - Soft gradients
            - Light backgrounds
            - Hand-drawn texture overlay
        `,
    },
};

/**
 * Get style definition by type
 */
export function getStyleDefinition(styleType = DEFAULT_STYLE) {
    return STYLE_DEFINITIONS[styleType] || STYLE_DEFINITIONS[DEFAULT_STYLE];
}

/**
 * Enhance a user prompt with style keywords
 * Used for direct image generation (/draw command)
 * 
 * @param {string} userPrompt - The user's original prompt
 * @param {string} styleType - Style type from STYLE_TYPES
 * @returns {string} - Enhanced prompt with style keywords
 */
export function enhancePromptWithStyle(userPrompt, styleType = DEFAULT_STYLE) {
    const style = getStyleDefinition(styleType);

    // Build enhanced prompt
    const stylePrefix = style.keywords.slice(0, 5).join(', ');
    const enhancedPrompt = `${stylePrefix}. ${userPrompt}. Simple clean illustration, soft pastel colors, white background, no text.`;

    return enhancedPrompt;
}

/**
 * Generate the context analysis prompt (Stage 1)
 * Used to understand board content and design appropriate characters
 * 
 * @param {string} boardContext - Extracted text from board cards
 * @param {string} styleType - Style type from STYLE_TYPES
 * @returns {string} - Complete analysis prompt for LLM
 */
export function getAnalysisPrompt(boardContext, styleType = DEFAULT_STYLE) {
    const style = getStyleDefinition(styleType);

    return `You are an expert Japanese illustrator specializing in **${style.name}** style.

**MANDATORY STYLE**: All designs MUST use **${style.name}** - ${style.description}

**CONTENT TO ANALYZE**:
"""
${boardContext.slice(0, 3000)}
"""

**YOUR TASK**:
1. **Identify the Core Topic & Design Diverse Characters**:
   - AVOID defaulting to a generic male office worker unless explicitly required.
   - Actively diversify: use women, children, elderly, or cute animals (cat/dog/rabbit) where appropriate.
   - Example: For "software testing", use a female engineer or a cat debugging code.
   - Example: For "medical checkup", use a friendly nurse with a patient (not just a doctor).
   - Example: For "family planning", use a diverse family group.

2. **Character Design Rules**:
${style.characterRules}

3. **Color Palette**:
${style.colorPalette}

**OUTPUT FORMAT** (1-2 sentences only):
Describe ONLY the character(s), their appearance, and their action/setting.
Focus on visual description suitable for ${style.name} style illustration.`;
}

/**
 * Generate the final prompt engineering prompt (Stage 2)
 * Converts visual concept to optimized image generation prompt
 * 
 * @param {string} visualConcept - Output from analysis stage
 * @param {string} styleType - Style type from STYLE_TYPES
 * @returns {string} - Complete prompt generation prompt for LLM
 */
export function getPromptGeneratorPrompt(visualConcept, styleType = DEFAULT_STYLE) {
    const style = getStyleDefinition(styleType);

    const keywordsString = style.keywords.join('", "');
    const negativeString = style.negative.join('", "');

    return `You are an expert prompt engineer for **${style.name}** image generation.

**CHARACTER CONCEPT**: "${visualConcept}"

**CRITICAL STYLE RULES**:
1. **Style MUST be**: "${style.keywords.slice(0, 3).join('", "')}"
2. **Character Features**:
${style.characterRules}
3. **Colors**: ${style.colorPalette.split('\n')[1]?.trim() || 'Soft pastels'}
4. **Background**: Minimal, solid white or light beige, simple if any.
5. **NO TEXT** in the image.

**FORBIDDEN** (will ruin the style):
- "${negativeString}"

**ALLOWED KEYWORDS**:
- "${keywordsString}"

**OUTPUT**: Return ONLY the final English image prompt (1-2 sentences maximum). Do not include any explanation.

**FINAL PROMPT**:`;
}

/**
 * Style prefix for backend/server-side use
 * Simplified version for Cloudflare Functions (no module imports)
 */
export const BACKEND_STYLE_PREFIX =
    'Kango Roo style, Japanese medical illustration, soft rounded shapes, ' +
    'clinical pastel colors, simple clean design, no harsh outlines, ' +
    'dot eyes, gentle expression, white background, no text. ';

/**
 * Get negative prompt keywords for style
 * Used by some image models that support negative prompts
 */
export function getNegativePrompt(styleType = DEFAULT_STYLE) {
    const style = getStyleDefinition(styleType);
    return style.negative.join(', ');
}
