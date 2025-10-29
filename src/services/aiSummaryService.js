
import { chatCompletion } from './llm';

/**
 * Service to generate concise AI summaries for cards
 */
export const aiSummaryService = {
    /**
     * Generate summaries for a batch of cards
     * @param {Array} cards - Array of card objects
     * @param {Object} config - AI Provider config
     * @returns {Promise<Object>} - Map of cardId -> { title, summary }
     */
    async generateBatchSummaries(cards, config) {
        if (!cards || cards.length === 0) return {};

        // Prepare card content for the prompt
        // Limit content length to avoid token limits
        const cardContexts = cards.map(c => {
            const content = c.data?.messages
                ? c.data.messages.map(m => `${m.role}: ${typeof m.content === 'string' ? m.content.substring(0, 200) : '[Multimodal]'}`).join('\n')
                : (typeof c.data?.content === 'string' ? c.data.content.substring(0, 500) : "No Content");

            return `CARD_ID: ${c.id}\nCONTENT:\n${content}\n---`;
        }).join('\n\n');

        const prompt = `
You are an expert design & engineering lead analyzing a team's workspace.
Your goal is to distill complex cards into "Actionable Intent" & "Critical Context".

INPUT CARDS:
${cardContexts}

REQUIREMENTS:
1. "title": 
   - MUST be a high-impact, 2-4 word noun phrase. 
   - Focus on the *Intent* or *Topic* (e.g., "Auth State Logic", "API Schema Refactor", "User Journey Map").
   - NO verbs at start if possible (e.g., use "Navigation Fix" instead of "Fixing Navigation").

2. "summary": 
   - EXACTLY 3 lines.
   - Line 1: 🎯 CORE SUBJECT (What is this about?)
   - Line 2: 🚧 PROBLEM/CONTEXT (What is the challenge/discussion?)
   - Line 3: ✅ ACTION/STATUS (What is being done or decided?)
   - Style: Telegraphic, precise, engineering/design shorthand. No "User is talking about...".

3. Tone:
   - Professional, minimal, high-signal-to-noise ratio.

4. IMPORTANT: 
   - The JSON keys MUST be the EXACT "CARD_ID" strings provided in the input. 
   - Do not add prefixes like "card_" unless they are in the input.
   - Do not hallucinate IDs.

OUTPUT FORMAT:
{
  "card_id_1": {
    "title": "Global State Sync",
    "summary": "• Redux store persistence issues\n• Conflict between local vs cloud state\n• Implementing CRDT strategy"
  }
}
`;

        try {
            const response = await chatCompletion(
                [{ role: 'user', content: prompt }],
                config,
                null, // Use default model
                { temperature: 0.3 } // Lower temperature for consistent formatting
            );

            if (!response) return {};

            let cleanResponse = response.trim();
            // Remove markdown code blocks if present
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            const parsed = JSON.parse(cleanResponse);
            return parsed;

        } catch (error) {
            console.error('[AI Summary] Failed to generate summaries:', error);
            return {};
        }
    }
};
