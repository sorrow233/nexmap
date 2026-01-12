import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, ChevronDown, Check, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * 常用模型预设列表
 */
const PRESET_MODELS = {
    chat: [
        { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', provider: 'Google' },
        { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'Google' },
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
        { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek' },
    ],
    image: [
        { id: 'gemini-3-pro-image-preview', name: 'Gemini Image', provider: 'Google' },
        { id: 'dall-e-3', name: 'DALL-E 3', provider: 'OpenAI' },
        { id: 'flux-pro', name: 'Flux Pro', provider: 'Black Forest' },
    ]
};

/**
 * 提取模型显示名称
 */
function getModelDisplayName(modelId) {
    if (!modelId) return '默认模型';

    // 从预设中查找
    const allModels = [...PRESET_MODELS.chat, ...PRESET_MODELS.image];
    const preset = allModels.find(m => m.id === modelId);
    if (preset) return preset.name;

    // 提取最后部分作为显示名
    const parts = modelId.split('/');
    const name = parts[parts.length - 1];
    return name.replace(/-preview$/, '').replace(/-/g, ' ');
}

/**
 * ModelSwitcher - 画布快速模型切换组件
 */
export default function ModelSwitcher({ compact = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'image'
    const dropdownRef = useRef(null);
    const { t } = useLanguage();

    // Store state
    const quickChatModel = useStore(state => state.quickChatModel);
    const quickImageModel = useStore(state => state.quickImageModel);
    const setQuickChatModel = useStore(state => state.setQuickChatModel);
    const setQuickImageModel = useStore(state => state.setQuickImageModel);
    const getEffectiveChatModel = useStore(state => state.getEffectiveChatModel);
    const getEffectiveImageModel = useStore(state => state.getEffectiveImageModel);

    // 当前显示的模型
    const currentChatModel = getEffectiveChatModel?.() || quickChatModel || 'google/gemini-3-pro-preview';
    const currentImageModel = getEffectiveImageModel?.() || quickImageModel || 'gemini-3-pro-image-preview';
    const displayModel = activeTab === 'chat' ? currentChatModel : currentImageModel;

    // 点击外部关闭
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleModelSelect = (modelId) => {
        if (activeTab === 'chat') {
            setQuickChatModel(modelId);
        } else {
            setQuickImageModel(modelId);
        }
        setIsOpen(false);
    };

    const handleClearOverride = () => {
        if (activeTab === 'chat') {
            setQuickChatModel(null);
        } else {
            setQuickImageModel(null);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-1.5 px-2 py-1.5 rounded-lg
                    text-xs font-medium transition-all
                    ${isOpen
                        ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }
                `}
                title="切换模型"
            >
                <Bot size={14} className="text-cyan-500" />
                {!compact && (
                    <>
                        <span className="max-w-[100px] truncate">
                            {getModelDisplayName(displayModel)}
                        </span>
                        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </>
                )}
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full mb-2 left-0 w-64 
                            bg-white dark:bg-slate-900 
                            border border-slate-200 dark:border-slate-700
                            rounded-xl shadow-xl overflow-hidden z-50"
                    >
                        {/* Tab Header */}
                        <div className="flex border-b border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => setActiveTab('chat')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors
                                    ${activeTab === 'chat'
                                        ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                <MessageSquare size={14} />
                                会话模型
                            </button>
                            <button
                                onClick={() => setActiveTab('image')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors
                                    ${activeTab === 'image'
                                        ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                <ImageIcon size={14} />
                                绘画模型
                            </button>
                        </div>

                        {/* Model List */}
                        <div className="max-h-64 overflow-y-auto py-1">
                            {/* Reset to default option */}
                            {(activeTab === 'chat' ? quickChatModel : quickImageModel) && (
                                <button
                                    onClick={handleClearOverride}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left
                                        text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800
                                        border-b border-slate-100 dark:border-slate-800"
                                >
                                    <Sparkles size={12} />
                                    恢复默认（使用设置中的模型）
                                </button>
                            )}

                            {/* Preset Models */}
                            {PRESET_MODELS[activeTab].map((model) => {
                                const isSelected = (activeTab === 'chat' ? currentChatModel : currentImageModel) === model.id;
                                return (
                                    <button
                                        key={model.id}
                                        onClick={() => handleModelSelect(model.id)}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 text-left
                                            transition-colors
                                            ${isSelected
                                                ? 'bg-cyan-50 dark:bg-cyan-900/20'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        <div>
                                            <div className={`text-sm font-medium ${isSelected ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                                {model.name}
                                            </div>
                                            <div className="text-xs text-slate-400">{model.provider}</div>
                                        </div>
                                        {isSelected && (
                                            <Check size={16} className="text-cyan-500" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer hint */}
                        <div className="px-3 py-2 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                            更多模型请在设置中配置
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
