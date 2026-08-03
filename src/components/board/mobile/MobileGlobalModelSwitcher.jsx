import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Check, ChevronDown, RefreshCw, X } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useStore } from '../../../store/useStore';
import {
    PRESET_MODELS,
    buildModelEntryKey,
    collectProviderChatModels,
    getModelDisplayName
} from '../../modelCatalog';
import { modelsMatch, normalizeModelIdForProvider } from '../../../utils/modelConfig';
import { getMobileBoardCopy } from './mobileBoardCopy';

const PROVIDER_ACCENTS = {
    google: 'bg-sky-400',
    openai: 'bg-emerald-400',
    anthropic: 'bg-violet-400',
    deepseek: 'bg-cyan-400',
    custom: 'bg-pink-400'
};

const getProviderAccent = (providerId) => PROVIDER_ACCENTS[providerId] || 'bg-slate-400';

export default function MobileGlobalModelSwitcher() {
    const [isOpen, setIsOpen] = useState(false);
    const { language } = useLanguage();
    const copy = getMobileBoardCopy(language);
    const providers = useStore((state) => state.providers);
    const globalChatRole = useStore((state) => state.globalRoles?.chat);
    const quickChatModel = useStore((state) => state.quickChatModel);
    const quickChatProviderId = useStore((state) => state.quickChatProviderId);
    const setQuickChatModel = useStore((state) => state.setQuickChatModel);

    const userModels = useMemo(() => collectProviderChatModels(providers), [providers]);
    const availableModels = useMemo(() => {
        const source = userModels.length > 0 ? userModels : PRESET_MODELS.chat;
        return Array.from(new Map(source.map((model) => [buildModelEntryKey(model), model])).values());
    }, [userModels]);

    const currentProviderId = quickChatModel
        ? (quickChatProviderId || globalChatRole?.providerId || 'google')
        : (globalChatRole?.providerId || 'google');
    const currentModel = normalizeModelIdForProvider(
        currentProviderId,
        quickChatModel
            || globalChatRole?.model
            || providers?.[currentProviderId]?.model
            || 'google/gemini-3-pro-preview'
    );
    const currentModelName = getModelDisplayName(currentModel, userModels, currentProviderId);

    const handleModelSelect = (model) => {
        setQuickChatModel(model.id, model.providerId);
        setIsOpen(false);
    };

    const handleFollowGlobal = () => {
        setQuickChatModel(null, null);
        setIsOpen(false);
    };

    return (
        <div className="mt-1.5">
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="flex min-h-10 w-full items-center gap-2.5 rounded-2xl bg-slate-100 px-3.5 text-left text-slate-700 active:bg-slate-200 dark:bg-white/[0.07] dark:text-slate-100 dark:active:bg-white/[0.12]"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                aria-label={`${copy.modelLabel}: ${currentModelName}`}
            >
                <Bot size={16} className="shrink-0 text-cyan-600 dark:text-cyan-300" />
                <span className="shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {copy.modelLabel}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                    {currentModelName}
                </span>
                <ChevronDown size={15} className="shrink-0 text-slate-400" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.button
                            type="button"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[90] bg-slate-950/55 backdrop-blur-[2px]"
                            onClick={() => setIsOpen(false)}
                            aria-label={copy.close}
                        />
                        <motion.section
                            role="dialog"
                            aria-modal="true"
                            aria-label={copy.chooseModel}
                            initial={{ opacity: 0, y: 28 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 28 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
                            className="fixed inset-x-2 bottom-[max(env(safe-area-inset-bottom),0.5rem)] z-[91] flex max-h-[min(74vh,36rem)] flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900"
                        >
                            <div className="flex shrink-0 items-center gap-3 border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-[16px] font-semibold text-slate-950 dark:text-white">
                                        {copy.chooseModel}
                                    </h2>
                                    <p className="mt-0.5 truncate text-[12px] text-slate-500 dark:text-slate-400">
                                        {copy.modelAppliesToNewChats}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="touch-target inline-flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
                                    aria-label={copy.close}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="ios-scroll-fix min-h-0 flex-1 overflow-y-auto p-3">
                                {quickChatModel && (
                                    <button
                                        type="button"
                                        onClick={handleFollowGlobal}
                                        className="mb-2 flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-slate-600 active:bg-slate-100 dark:text-slate-300 dark:active:bg-white/10"
                                    >
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10">
                                            <RefreshCw size={15} />
                                        </span>
                                        <span className="text-[13px] font-medium">{copy.followGlobalModel}</span>
                                    </button>
                                )}

                                <div className="space-y-1">
                                    {availableModels.map((model) => {
                                        const modelId = normalizeModelIdForProvider(model.providerId, model.id);
                                        const isSelected = currentProviderId === model.providerId
                                            && modelsMatch(modelId, currentModel, model.providerId);

                                        return (
                                            <button
                                                key={buildModelEntryKey(model)}
                                                type="button"
                                                onClick={() => handleModelSelect(model)}
                                                className={`flex min-h-[3.75rem] w-full items-center gap-3 rounded-2xl border px-3.5 text-left transition-colors ${isSelected
                                                    ? 'border-cyan-500/40 bg-cyan-50 text-slate-950 dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:text-white'
                                                    : 'border-transparent text-slate-700 active:bg-slate-100 dark:text-slate-200 dark:active:bg-white/10'
                                                    }`}
                                            >
                                                <span className={`h-3 w-3 shrink-0 rounded-full ${getProviderAccent(model.providerId)}`} />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-[14px] font-semibold">
                                                        {getModelDisplayName(modelId, userModels, model.providerId)}
                                                    </span>
                                                    <span className="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-slate-400">
                                                        {model.provider || model.providerId}
                                                    </span>
                                                </span>
                                                {isSelected && <Check size={18} className="shrink-0 text-cyan-600 dark:text-cyan-300" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.section>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
