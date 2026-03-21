import { useStore } from '../store/useStore';
import { createAgentSubmitHandler } from './aiSprouting/createAgentSubmitHandler';
import { createSproutHandlers } from './aiSprouting/createSproutHandlers';

/**
 * Hook to handle AI branching operations like "sprouting" new ideas
 * or expanding marked topics into new cards.
 */
export function useAISprouting() {
    const {
        cards,
        createAICard,
        updateCardContent,
        setCardGenerating,
        updateCardFull
    } = useStore();

    const sproutHandlers = createSproutHandlers({
        cards,
        createAICard,
        updateCardContent,
        setCardGenerating
    });

    const handleAgentSubmit = createAgentSubmitHandler({
        createAICard,
        updateCardContent,
        updateCardFull,
        setCardGenerating
    });

    return {
        ...sproutHandlers,
        handleAgentSubmit
    };
}
