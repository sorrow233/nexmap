import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Check, ChevronDown, RefreshCw } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    PRESET_MODELS,
    buildModelEntryKey,
    collectProviderChatModels,
    getModelDisplayName,
    groupModelsByProvider
} from '../modelCatalog';
import { modelsMatch, normalizeModelIdForProvider } from '../../utils/modelConfig';
import { resolveCardChatConfig } from '../../store/slices/utils/cardChatConfig';

const PROVIDER_ACCENT_MAP = {
    google: 'bg-sky-400',
    openai: 'bg-emerald-400',
    anthropic: 'bg-violet-400',
    deepseek: 'bg-cyan-400',
    custom: 'bg-pink-400',
    default: 'bg-brand-400'
};

function getProviderAccentClass(providerId) {
    return PROVIDER_ACCENT_MAP[providerId] || PROVIDER_ACCENT_MAP.default;
}

export default function CardModelSwitcher({ card, onUpdate }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { t } = useLanguage();
    const followGlobalLabel = t.settings?.followGlobal || '跟随全局';
    const lockedLabel = t.settings?.lockedToCard || '已锁定';
    const unlockLabel = t.settings?.unlockModelOverride || '解除锁定';

    const providers = useStore((state) => state.providers);
    const globalChatRole = useStore((state) => state.globalRoles?.chat);
    const isSystemCreditsUser = useStore((state) => state.isSystemCreditsUser);
    const quickChatModel = useStore((state) => state.quickChatModel);
    const quickChatProviderId = useStore((state) => state.quickChatProviderId);

    // Avoid selecting a freshly created config object from Zustand directly.
    // A non-stable selector snapshot here can trigger React's infinite re-render guard.
    const effectiveChatConfig = useMemo(() => (
        useStore.getState().getEffectiveChatConfig()
    ), [providers, globalChatRole, isSystemCreditsUser, quickChatModel, quickChatProviderId]);

    const userModels = useMemo(() => collectProviderChatModels(providers), [providers]);
    const groupedModels = useMemo(() => groupModelsByProvider(userModels), [userModels]);

    const resolvedCardConfig = useMemo(() => resolveCardChatConfig({
        providers,
        globalRoles: { chat: globalChatRole },
        isSystemCreditsUser,
        getEffectiveChatConfig: () => effectiveChatConfig
    }, card), [providers, globalChatRole, isSystemCreditsUser, effectiveChatConfig, card]);

    const currentProviderId = resolvedCardConfig.providerId;
    const currentModel = normalizeModelIdForProvider(currentProviderId, resolvedCardConfig.model);
    const isCardModelLocked = card?.data?.modelLocked === true;

    const displayModels = useMemo(() => {
        const sourceModels = groupedModels.length > 0
            ? groupedModels.flatMap((group) => group.models)
            : PRESET_MODELS.chat.map((model) => ({
                ...model,
                id: normalizeModelIdForProvider(model.providerId, model.id)
            }));

        const uniqueModels = Array.from(
            new Map(sourceModels.map((model) => [buildModelEntryKey(model), model])).values()
        );

        return uniqueModels.sort((a, b) => {
            const aSelected = currentProviderId === a.providerId && modelsMatch(a.id, currentModel, a.providerId);
            const bSelected = currentProviderId === b.providerId && modelsMatch(b.id, currentModel, b.providerId);
            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;

            return getModelDisplayName(a.id, userModels, a.providerId).localeCompare(
                getModelDisplayName(b.id, userModels, b.providerId),
                'zh-Hans-CN'
            );
        });
    }, [groupedModels, currentProviderId, currentModel, userModels]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleModelSelect = (model) => {
        if (!card?.id || !onUpdate) return;

        onUpdate(card.id, (currentData) => ({
            ...currentData,
            modelLocked: true,
            model: normalizeModelIdForProvider(model.providerId, model.id),
            providerId: model.providerId
        }));
        setIsOpen(false);
    };

    const handleResetToDefault = () => {
        if (!card?.id || !onUpdate) return;

        onUpdate(card.id, (currentData = {}) => {
            const { modelLocked, model, providerId, ...rest } = currentData;
            return rest;
        });
        setIsOpen(false);
    };

    if (!Array.isArray(card?.data?.messages) || isSystemCreditsUser) {
        return null;
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className={`
                    group flex h-10 items-center justify-center gap-1.5 rounded-2xl border px-3
                    transition-all duration-300 lg:h-11 lg:w-11 lg:px-0
                    ${isOpen
                        ? 'border-brand-400/50 bg-[#172033] text-brand-100 shadow-[0_18px_40px_-24px_rgba(34,211,238,0.35)] dark:border-brand-400/50 dark:bg-[#172033]'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-[#2b3448] dark:bg-[#1a2234] dark:text-slate-100 dark:shadow-[0_18px_36px_-24px_rgba(2,8,23,0.95)] dark:hover:border-brand-400/30 dark:hover:bg-[#1e2840] dark:hover:text-white'
                    }
                `}
                title={t.settings.roles?.chatTitle || '卡片模型'}
            >
                <Bot size={15} className={isOpen ? 'text-brand-300' : 'text-slate-500 dark:text-slate-100'} />
                <span className="max-w-[116px] truncate text-xs font-semibold lg:hidden">
                    {getModelDisplayName(currentModel, userModels, currentProviderId)}
                </span>
                <ChevronDown size={12} className={`transition-transform duration-300 lg:hidden ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 360 }}
                        className="absolute right-0 top-full z-50 mt-3 w-[22rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[2rem] border border-[#2a3448] bg-[#101827] p-4 shadow-[0_32px_80px_-36px_rgba(2,8,23,0.92)] ring-1 ring-white/5 lg:left-full lg:right-auto lg:bottom-0 lg:top-auto lg:mt-0 lg:ml-4"
                    >
                        <div className="flex items-start justify-between gap-3 px-1 pb-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
                                    <Bot size={11} />
                                    <span>{t.settings.roles?.chatTitle || '卡片模型'}</span>
                                </div>
                                <div className="mt-2 truncate text-[15px] font-semibold text-white">
                                    {getModelDisplayName(currentModel, userModels, currentProviderId)}
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                                    <span className={`h-2.5 w-2.5 rounded-full ${getProviderAccentClass(currentProviderId)}`} />
                                    <span className="truncate">{currentProviderId}</span>
                                    <span className="rounded-full border border-[#313b51] bg-[#161f31] px-2 py-0.5 text-[9px] font-semibold text-slate-300">
                                        {isCardModelLocked ? lockedLabel : followGlobalLabel}
                                    </span>
                                </div>
                            </div>

                            {isCardModelLocked && (
                                <button
                                    onClick={handleResetToDefault}
                                    className="mt-0.5 inline-flex shrink-0 items-center gap-2 rounded-full border border-[#313b51] bg-[#161f31] px-3 py-2 text-[10px] font-semibold text-slate-300 transition-all hover:border-brand-400/30 hover:bg-[#1d2840] hover:text-white"
                                >
                                    <RefreshCw size={13} />
                                    <span>{unlockLabel}</span>
                                </button>
                            )}
                        </div>

                        <div className="h-px bg-white/8" />

                        <div className="mt-4 max-h-[min(24rem,calc(100vh-11rem))] overflow-y-auto pr-1 custom-scrollbar">
                            <div className="space-y-3">
                                {displayModels.map((model) => {
                                    const isSelected = currentProviderId === model.providerId
                                        && modelsMatch(model.id, currentModel, model.providerId);

                                    return (
                                        <button
                                            key={buildModelEntryKey(model)}
                                            onClick={() => handleModelSelect(model)}
                                            className={`group flex w-full items-start justify-between gap-4 rounded-[1.65rem] border px-4 py-3.5 text-left transition-all duration-200 ${
                                                isSelected
                                                    ? 'border-white/70 bg-[#1a2437] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]'
                                                    : 'border-[#273145] bg-[#111a2a] text-slate-200 hover:border-[#39435a] hover:bg-[#162032]'
                                            }`}
                                        >
                                            <div className="flex min-w-0 items-start gap-3.5">
                                                <span className={`mt-1 h-4 w-4 shrink-0 rounded-full ${getProviderAccentClass(model.providerId)}`} />
                                                <div className="min-w-0">
                                                    <div className="whitespace-normal break-all text-[14px] font-semibold leading-[1.28]">
                                                        {getModelDisplayName(model.id, userModels, model.providerId)}
                                                    </div>
                                                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-400">
                                                        <span>{model.provider || model.providerId}</span>
                                                        <span className="h-1 w-1 rounded-full bg-white/18" />
                                                        <span className="break-all text-slate-500">{model.providerId}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {isSelected && <Check size={18} className="mt-0.5 shrink-0 text-white/85" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
