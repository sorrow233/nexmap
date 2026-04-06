import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, ChevronDown, Check, Globe, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useLanguage } from '../contexts/LanguageContext';
import {
    PRESET_MODELS,
    buildModelEntryKey,
    collectProviderChatModels,
    getModelDisplayName,
    groupModelsByProvider
} from './modelCatalog';
import { normalizeModelIdForProvider, modelsMatch } from '../utils/modelConfig';

/**
 * ModelSwitcher V2 - 极简主义设计
 * 核心理念：用户配置优先，隐藏不必要的复杂性
 */
export default function ModelSwitcher({ compact = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { t } = useLanguage();

    // Store state
    const providers = useStore(state => state.providers);
    const quickChatModel = useStore(state => state.quickChatModel);
    const quickChatProviderId = useStore(state => state.quickChatProviderId);
    const globalChatRole = useStore(state => state.globalRoles?.chat);
    const setQuickChatModel = useStore(state => state.setQuickChatModel);

    // 动态提取用户在所有厂商配置中定义的模型
    const userModels = useMemo(() => collectProviderChatModels(providers), [providers]);

    // 按 Provider 分组模型
    const groupedModels = useMemo(() => groupModelsByProvider(userModels), [userModels]);

    const displayProviderId = quickChatModel
        ? (quickChatProviderId || globalChatRole?.providerId || 'google')
        : (globalChatRole?.providerId || 'google');
    const displayModel = quickChatModel
        || globalChatRole?.model
        || providers?.[displayProviderId]?.model
        || 'google/gemini-3.1-pro-preview';
    const normalizedDisplayModel = normalizeModelIdForProvider(displayProviderId, displayModel);
    const selectedEntry = useMemo(() => {
        return userModels.find((model) => (
            model.providerId === displayProviderId &&
            modelsMatch(model.id, normalizedDisplayModel, displayProviderId)
        )) || null;
    }, [displayProviderId, normalizedDisplayModel, userModels]);

    // 判断是否使用预设模型
    const isUsingPresets = groupedModels.length === 0;

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleModelSelect = (model) => {
        // 关键改进：隔离 Session 覆盖，仅影响 Chat
        setQuickChatModel(model.id, model.providerId);
        setIsOpen(false);
    };

    const handleClearOverride = () => {
        setQuickChatModel(null);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button - 极简风格 */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    group flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                    text-xs font-bold transition-all duration-300
                    ${isOpen
                        ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white'
                        : 'bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }
                `}
                title={t.chatBar.switchModel}
            >
                <div className={`${isOpen ? 'text-brand-500' : ''} transition-colors`}>
                    <Bot size={15} />
                </div>
                {!compact && (
                    <>
                        <span className="max-w-[120px] truncate">
                            {getModelDisplayName(normalizedDisplayModel, userModels, displayProviderId)}
                        </span>
                        {selectedEntry?.provider && (
                            <span className="max-w-[88px] truncate text-[10px] text-slate-400">
                                {selectedEntry.provider}
                            </span>
                        )}
                        <ChevronDown size={12} className={`opacity-50 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </>
                )}
            </button>

            {/* Dropdown - 现代卡片悬浮 */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        className="absolute bottom-full mb-2 left-0 w-64 
                            bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
                            border border-slate-200/50 dark:border-white/10
                            rounded-2xl shadow-xl 
                            ring-1 ring-black/5 dark:ring-white/5 overflow-hidden z-50 p-2"
                    >
                        {/* Header */}
                        <div className="px-2 pb-2 mb-1 border-b border-slate-100 dark:border-white/5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {t.settings.roles?.chatTitle || "对话模型 (Chat Model)"}
                            </span>
                        </div>

                        {/* Reset / Default Option */}
                        {quickChatModel && (
                            <button
                                onClick={handleClearOverride}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl
                                    text-xs font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5
                                    transition-all group mb-1"
                            >
                                <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                                <span>{t.settings.resetDefaults || "恢复默认"}</span>
                            </button>
                        )}

                        {/* Model List - 按 Provider 分组 */}
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar py-1">
                            {groupedModels.length > 0 ? (
                                groupedModels.map((group, groupIndex) => (
                                    <div key={group.providerId || group.name} className={groupIndex > 0 ? 'mt-2 pt-2 border-t border-slate-100 dark:border-white/5' : ''}>
                                        {/* Provider 分组标题 */}
                                        <div className="px-2 py-1.5 flex items-center gap-2">
                                            <Globe size={10} className="text-slate-400" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                {group.name}
                                            </span>
                                        </div>
                                        {/* Provider 下的模型列表 */}
                                        <div className="space-y-0.5">
                                            {group.models.map((model) => {
                                                const isSelected = displayProviderId === model.providerId
                                                    && modelsMatch(model.id, normalizedDisplayModel, model.providerId);
                                                return (
                                                    <button
                                                        key={buildModelEntryKey(model)}
                                                        onClick={() => handleModelSelect(model)}
                                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left
                                                            transition-all duration-200 group
                                                            ${isSelected
                                                                ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-bold'
                                                                : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                                            <div className={`p-1 rounded-lg ${isSelected ? 'bg-white dark:bg-slate-800 shadow-sm' : 'bg-slate-200/50 dark:bg-white/5'}`}>
                                                                {model.icon ? <model.icon size={12} className={model.color} /> : <Bot size={12} />}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="truncate text-xs">{getModelDisplayName(model.id, userModels, model.providerId)}</span>
                                                                <span className="truncate text-[9px] text-slate-400">{model.providerId}</span>
                                                            </div>
                                                        </div>
                                                        {isSelected && <Check size={14} className="text-cyan-500 flex-shrink-0" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                /* 预设模型 fallback */
                                PRESET_MODELS.chat.map((model) => {
                                    const isSelected = displayProviderId === model.providerId
                                        && modelsMatch(model.id, normalizedDisplayModel, model.providerId);
                                    return (
                                        <button
                                            key={model.id}
                                            onClick={() => handleModelSelect(model)}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left
                                                transition-all duration-200 group
                                                ${isSelected
                                                    ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-bold'
                                                    : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white dark:bg-slate-800 shadow-sm' : 'bg-slate-200/50 dark:bg-white/5'}`}>
                                                    {model.icon ? <model.icon size={14} className={model.color} /> : <Bot size={14} />}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="truncate text-xs">{model.name}</span>
                                                    <span className="text-[9px] text-slate-400 font-medium truncate">{model.provider}</span>
                                                </div>
                                            </div>
                                            {isSelected && <Check size={14} className="text-cyan-500 flex-shrink-0" />}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Empty State / Hint */}
                        {isUsingPresets && (
                            <div className="px-3 py-2 mt-1 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg">
                                <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 leading-relaxed">
                                    这里显示的是预设模型。
                                    <br />
                                    您可以在设置中添加自己的 API Key 来使用更多模型。
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
