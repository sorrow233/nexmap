import { AI_MODELS, AI_PROVIDERS } from '../../../services/aiConstants';
import { normalizeModelIdForProvider } from '../../../utils/modelConfig';

const DEFAULT_CHAT_PROVIDER_ID = 'google';

function getProviderConfig(state, providerId) {
    return state?.providers?.[providerId]
        || state?.providers?.[DEFAULT_CHAT_PROVIDER_ID]
        || {};
}

export function resolveCardChatConfig(state, card) {
    if (state?.isSystemCreditsUser) {
        return {
            source: 'system-credits',
            providerId: AI_PROVIDERS.SYSTEM_CREDITS,
            model: AI_MODELS.FREE_TIER,
            config: {
                apiKey: AI_PROVIDERS.SYSTEM_CREDITS,
                model: AI_MODELS.FREE_TIER,
                id: AI_PROVIDERS.SYSTEM_CREDITS,
                providerId: AI_PROVIDERS.SYSTEM_CREDITS,
                protocol: AI_PROVIDERS.SYSTEM_CREDITS
            }
        };
    }

    const fallbackConfig = typeof state?.getEffectiveChatConfig === 'function'
        ? state.getEffectiveChatConfig()
        : {};
    const fallbackProviderId = fallbackConfig.providerId
        || fallbackConfig.id
        || state?.globalRoles?.chat?.providerId
        || DEFAULT_CHAT_PROVIDER_ID;
    const fallbackModel = normalizeModelIdForProvider(
        fallbackProviderId,
        fallbackConfig.model || getProviderConfig(state, fallbackProviderId).model
    );

    const cardProviderId = card?.data?.providerId || fallbackProviderId;
    const cardModel = normalizeModelIdForProvider(cardProviderId, card?.data?.model);
    const providerConfig = getProviderConfig(state, cardProviderId);

    if (cardModel) {
        return {
            source: 'card',
            providerId: cardProviderId,
            model: cardModel,
            config: {
                ...providerConfig,
                model: cardModel,
                providerId: cardProviderId
            }
        };
    }

    return {
        source: 'default',
        providerId: fallbackProviderId,
        model: fallbackModel,
        config: {
            ...getProviderConfig(state, fallbackProviderId),
            model: fallbackModel,
            providerId: fallbackProviderId
        }
    };
}
