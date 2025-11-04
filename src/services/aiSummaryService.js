
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
You are an objective observer of a creative workspace.
Analyze the provided user content and generate a precise, high-level summary.

INPUT CARDS:
${cardContexts}

REQUIREMENTS:
1. "title": A prominent, high-level keyword or phrase (e.g., "Navigation Logic", "API Debugging"). Max 4 words.
2. "summary": Exactly 3 short, objective bullet points describing specific actions or topics.
   - Point 1: What is the main subject?
   - Point 2: What is the specific problem or discussion?
   - Point 3: What is the current status or action?
3. Tone: Clinical, precise, objective. No fluff.
4. Output MUST be valid JSON object keyed by CARD_ID.

OUTPUT FORMAT:
{
  "card_id_1": {
    "title": "Navigation State",
    "summary": "• Discussing global router configuration\n• Fixing circular dependency in Auth\n• Proposed solution using events"
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
