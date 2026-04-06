import {
    Bot,
    Sparkles,
    Image as ImageIcon,
    MessageSquare,
    Zap,
    Target,
    ShieldCheck,
    Globe
} from 'lucide-react';
import { normalizeModelIdForProvider, modelsMatch } from '../utils/modelConfig';

export const PRESET_MODELS = {
    chat: [
        { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', provider: 'Google', providerId: 'google', icon: Sparkles, color: 'text-blue-500' },
        { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'Google', providerId: 'google', icon: Zap, color: 'text-amber-500' },
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', providerId: 'openai', icon: Bot, color: 'text-emerald-500' },
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', providerId: 'anthropic', icon: Target, color: 'text-orange-500' },
        { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek', providerId: 'deepseek', icon: ShieldCheck, color: 'text-cyan-600' }
    ],
    image: [
        { id: 'gemini-3-pro-image-preview', name: 'Gemini Image', provider: 'Google', providerId: 'google', icon: ImageIcon, color: 'text-blue-500' },
        { id: 'dall-e-3', name: 'DALL-E 3', provider: 'OpenAI', providerId: 'openai', icon: ImageIcon, color: 'text-emerald-500' },
        { id: 'flux-pro', name: 'Flux Pro', provider: 'Black Forest', providerId: 'black-forest', icon: Sparkles, color: 'text-purple-500' }
    ]
};

export function buildModelEntryKey(model) {
    return `${model?.providerId || 'default'}::${normalizeModelIdForProvider(model?.providerId, model?.id)}`;
}

export function getModelDisplayName(modelId, customModels = [], providerId = null) {
    const normalizedId = normalizeModelIdForProvider(providerId, modelId);
    if (!normalizedId) return '默认配置';

    const custom = customModels.find((model) => (
        model?.providerId === providerId && modelsMatch(model.id, normalizedId, providerId)
    ));
    if (custom?.name) return custom.name;

    const preset = [...PRESET_MODELS.chat, ...PRESET_MODELS.image].find((model) => (
        (providerId ? model.providerId === providerId : true) &&
        modelsMatch(model.id, normalizedId, model.providerId || providerId)
    ));
    if (preset?.name) return preset.name;

    const parts = normalizedId.split('/');
    const fallbackName = parts[parts.length - 1] || normalizedId;
    return fallbackName.replace(/-preview$/i, '').replace(/-/g, ' ');
}

function getProviderIcon(protocol) {
    if (protocol === 'gemini') return Sparkles;
    if (protocol === 'openai') return Bot;
    return Globe;
}

export function collectProviderChatModels(providers = {}) {
    const chatModels = [];

    Object.entries(providers || {}).forEach(([providerKey, provider]) => {
        if (!provider) return;

        const providerId = provider.id || providerKey;
        const modelIds = new Set();

        if (provider.model) modelIds.add(provider.model.trim());
        if (provider.customModels) {
            provider.customModels.split(',').forEach((modelId) => {
                const nextId = modelId.trim();
                if (nextId) modelIds.add(nextId);
            });
        }
        if (provider.roles?.chat) {
            modelIds.add(provider.roles.chat);
        }

        modelIds.forEach((modelId) => {
            const normalizedId = normalizeModelIdForProvider(providerId, modelId);
            if (!normalizedId) return;

            chatModels.push({
                id: normalizedId,
                rawId: modelId,
                name: normalizedId,
                provider: provider.name || providerId,
                providerId,
                icon: provider.roles?.chat === modelId ? MessageSquare : getProviderIcon(provider.protocol)
            });
        });
    });

    return Array.from(new Map(chatModels.map((model) => [buildModelEntryKey(model), model])).values());
}

export function groupModelsByProvider(models = []) {
    const groups = {};

    models.forEach((model) => {
        const providerKey = model.providerId || model.provider || 'other';
        if (!groups[providerKey]) {
            groups[providerKey] = {
                name: model.provider || 'Other',
                providerId: model.providerId,
                models: []
            };
        }
        groups[providerKey].models.push(model);
    });

    return Object.values(groups);
}
