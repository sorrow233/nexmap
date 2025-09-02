import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import favoritesService from '../services/favoritesService';
import { chatCompletion } from '../services/llm';

export default function CategorizationListener() {
    const { getActiveConfig } = useStore();

    useEffect(() => {
        const handleCategorizationRequest = async (event) => {
            const { favId, content } = event.detail;
            const config = getActiveConfig();

            if (!config || !config.apiKey) {
                console.warn('[Categorization] No active provider configured, skipping auto-categorization.');
                return;
            }

            try {
                // Construct prompt
                const prompt = `Task: Categorize the following note content into a single, short category (1-2 words).
Examples: Idea, Bug, Todo, Research, Code, Meeting, Concept.
Content:
"""
${content.length > 500 ? content.substring(0, 500) + '...' : content}
"""
Output ONLY the category name.`;

                const response = await chatCompletion(
                    [{ role: 'user', content: prompt }],
                    config,
                    null, // Use default model
                    { temperature: 0.3 }
                );

                let category = response.trim();
                // cleanup
                category = category.replace(/["']/g, '');
                if (category.endsWith('.')) category = category.slice(0, -1);

                // Capitalize
                category = category.charAt(0).toUpperCase() + category.slice(1);

                console.log(`[Categorization] Assigned category "${category}" to favorite ${favId}`);
                favoritesService.updateCategory(favId, category);

            } catch (e) {
                console.error('[Categorization] Failed to categorize favorite:', e);
            }
        };

        window.addEventListener('request-auto-categorization', handleCategorizationRequest);
        return () => window.removeEventListener('request-auto-categorization', handleCategorizationRequest);
    }, [getActiveConfig]);

    return null; // This component renders nothing
}
