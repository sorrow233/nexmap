import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Check, ChevronDown, Globe, RefreshCw } from 'lucide-react';
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

export default function CardModelSwitcher({ card, onUpdate }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { t } = useLanguage();

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
    const isUsingPresets = groupedModels.length === 0;

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
            model: normalizeModelIdForProvider(model.providerId, model.id),
            providerId: model.providerId
        }));
        setIsOpen(false);
    };

    const handleResetToDefault = () => {
        if (!card?.id || !onUpdate) return;

        const defaultProviderId = effectiveChatConfig.providerId || effectiveChatConfig.id;
        const defaultModel = normalizeModelIdForProvider(defaultProviderId, effectiveChatConfig.model);

        onUpdate(card.id, (currentData) => ({
            ...currentData,
            model: defaultModel,
            providerId: defaultProviderId
        }));
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
                    group flex h-10 items-center justify-center gap-1.5 rounded-full border px-3
                    transition-all duration-300 lg:h-10 lg:w-10 lg:px-0
                    ${isOpen
                        ? 'border-brand-200 bg-brand-50/90 text-brand-700 shadow-sm dark:border-brand-400/30 dark:bg-brand-500/10 dark:text-brand-200'
                        : 'border-slate-200/80 bg-white/80 text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:border-white/15 dark:hover:text-slate-200'
                    }
                `}
                title={t.settings.roles?.chatTitle || '卡片模型'}
            >
                <Bot size={15} className={isOpen ? 'text-brand-500' : ''} />
                <span className="max-w-[108px] truncate text-xs font-semibold lg:hidden">
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
                        className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 p-2 shadow-2xl shadow-slate-900/8 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95 lg:left-full lg:right-auto lg:top-1/2 lg:mt-0 lg:ml-3 lg:-translate-y-1/2"
                    >
                        <div className="mb-1 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 py-2.5 dark:border-white/5 dark:bg-white/5">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                                <Bot size={11} />
                                <span>{t.settings.roles?.chatTitle || '卡片模型'}</span>
                            </div>
                            <div className="mt-1 flex items-end justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                        {getModelDisplayName(currentModel, userModels, currentProviderId)}
                                    </div>
                                    <div className="truncate text-[11px] text-slate-400">
                                        {currentProviderId}
                                    </div>
                                </div>
                                <span className="rounded-full border border-slate-200/80 px-2 py-1 text-[10px] font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
                                    当前卡片
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleResetToDefault}
                            className="mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-500 transition-all hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
                        >
                            <RefreshCw size={14} />
                            <span>{t.settings.resetDefaults || '恢复默认'}</span>
                        </button>

                        <div className="max-h-[320px] overflow-y-auto custom-scrollbar py-1">
                            {groupedModels.length > 0 ? (
                                groupedModels.map((group, groupIndex) => (
                                    <div
                                        key={group.providerId || group.name}
                                        className={groupIndex > 0 ? 'mt-2 border-t border-slate-100 pt-2 dark:border-white/5' : ''}
                                    >
                                        <div className="flex items-center gap-2 px-2 py-1.5">
                                            <Globe size={10} className="text-slate-400" />
                                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                                {group.name}
                                            </span>
                                        </div>
                                        <div className="space-y-0.5">
                                            {group.models.map((model) => {
                                                const isSelected = currentProviderId === model.providerId
                                                    && modelsMatch(model.id, currentModel, model.providerId);

                                                return (
                                                    <button
                                                        key={buildModelEntryKey(model)}
                                                        onClick={() => handleModelSelect(model)}
                                                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-all duration-200 ${
                                                            isSelected
                                                                ? 'bg-slate-100 font-semibold text-slate-900 dark:bg-white/10 dark:text-white'
                                                                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'
                                                        }`}
                                                    >
                                                        <div className="min-w-0 overflow-hidden">
                                                            <div className="truncate text-xs">
                                                                {getModelDisplayName(model.id, userModels, model.providerId)}
                                                            </div>
                                                            <div className="truncate text-[9px] text-slate-400">
                                                                {model.providerId}
                                                            </div>
                                                        </div>
                                                        {isSelected && <Check size={14} className="ml-2 shrink-0 text-brand-500" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                PRESET_MODELS.chat.map((model) => {
                                    const normalizedModelId = normalizeModelIdForProvider(model.providerId, model.id);
                                    const isSelected = currentProviderId === model.providerId
                                        && modelsMatch(normalizedModelId, currentModel, model.providerId);

                                    return (
                                        <button
                                            key={buildModelEntryKey(model)}
                                            onClick={() => handleModelSelect(model)}
                                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-all duration-200 ${
                                                isSelected
                                                    ? 'bg-slate-100 font-semibold text-slate-900 dark:bg-white/10 dark:text-white'
                                                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <div className="min-w-0 overflow-hidden">
                                                <div className="truncate text-xs">
                                                    {model.name}
                                                </div>
                                                <div className="truncate text-[9px] text-slate-400">
                                                    {model.provider}
                                                </div>
                                            </div>
                                            {isSelected && <Check size={14} className="ml-2 shrink-0 text-brand-500" />}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
