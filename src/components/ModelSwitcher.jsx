import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, ChevronDown, Check, Image as ImageIcon, MessageSquare, Zap, Target, ShieldCheck, Globe, RefreshCw, Settings as SettingsIcon } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * 常用模型预设列表 - 增加图标分类
 */
const PRESET_MODELS = {
    chat: [
        { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', provider: 'Google', icon: Sparkles, color: 'text-blue-500' },
        { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'Google', icon: Zap, color: 'text-amber-500' },
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', icon: Bot, color: 'text-emerald-500' },
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', icon: Target, color: 'text-orange-500' },
        { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek', icon: ShieldCheck, color: 'text-cyan-600' },
    ],
    image: [
        { id: 'gemini-3-pro-image-preview', name: 'Gemini Image', provider: 'Google', icon: ImageIcon, color: 'text-blue-500' },
        { id: 'dall-e-3', name: 'DALL-E 3', provider: 'OpenAI', icon: ImageIcon, color: 'text-emerald-500' },
        { id: 'flux-pro', name: 'Flux Pro', provider: 'Black Forest', icon: Sparkles, color: 'text-purple-500' },
    ]
};

/**
 * 提取模型显示名称 (简化版，移除 ID)
 */
function getModelDisplayName(modelId, customModels = []) {
    if (!modelId) return '默认配置';

    // 1. 自定义模型
    const custom = customModels.find(m => m.id === modelId);
    if (custom) return custom.name;

    // 2. 预设模型
    const allPresets = [...PRESET_MODELS.chat, ...PRESET_MODELS.image];
    const preset = allPresets.find(m => m.id === modelId);
    if (preset) return preset.name;

    // 3. Fallback: 简单的名称处理
    const parts = modelId.split('/');
    const name = parts[parts.length - 1];
    return name.replace(/-preview$/, '').replace(/-/g, ' ');
}

/**
 * ModelSwitcher V2 - 极简主义设计
 * 核心理念：用户配置优先，隐藏不必要的复杂性
 */
export default function ModelSwitcher({ compact = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'image'
    const dropdownRef = useRef(null);
    const { t } = useLanguage();

    // Store state
    const providers = useStore(state => state.providers);
    const quickChatModel = useStore(state => state.quickChatModel);
    const quickImageModel = useStore(state => state.quickImageModel);
    const setQuickChatModel = useStore(state => state.setQuickChatModel);
    const setQuickImageModel = useStore(state => state.setQuickImageModel);
    const getEffectiveChatModel = useStore(state => state.getEffectiveChatModel);
    const getEffectiveImageModel = useStore(state => state.getEffectiveImageModel);

    // 动态提取用户在所有厂商配置中定义的模型
    const userModels = useMemo(() => {
        const chatModels = [];
        const imageModels = [];

        Object.values(providers || {}).forEach(p => {
            if (!p) return;

            // 收集所有定义的模型 ID
            const modelIds = new Set();
            if (p.model) modelIds.add(p.model.trim());
            if (p.customModels) {
                p.customModels.split(',').forEach(m => {
                    const id = m.trim();
                    if (id) modelIds.add(id);
                });
            }

            modelIds.forEach(id => {
                const modelObj = {
                    id,
                    name: id,
                    provider: p.name,
                    providerId: p.id,
                    icon: p.protocol === 'openai' ? Bot : p.protocol === 'gemini' ? Sparkles : Globe
                };

                // 简单分类：通常目前大家配的都是 Chat
                chatModels.push(modelObj);
            });

            // 角色分配模型 (保持兼容)
            if (p.roles) {
                if (p.roles.chat) chatModels.push({ id: p.roles.chat, name: p.roles.chat, provider: p.name, providerId: p.id, icon: MessageSquare });
                if (p.roles.image) imageModels.push({ id: p.roles.image, name: p.roles.image, provider: p.name, providerId: p.id, icon: ImageIcon });
            }
        });

        const unique = (arr) => Array.from(new Map(arr.map(item => [item.id, item])).values());
        return { chat: unique(chatModels), image: unique(imageModels) };
    }, [providers]);

    const currentChatModel = getEffectiveChatModel?.() || quickChatModel;
    const currentImageModel = getEffectiveImageModel?.() || quickImageModel;
    const displayModel = activeTab === 'chat' ? currentChatModel : currentImageModel;

    // 核心改进：合并所有厂商的模型为一个平行列表
    const currentList = userModels[activeTab].length > 0 ? userModels[activeTab] : PRESET_MODELS[activeTab];
    const isUsingPresets = userModels[activeTab].length === 0;

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
        // 关键改进：不再调用 setActiveProvider(model.providerId)
        // 仅仅记录“当前会话”临时使用的模型和它所属的厂商 ID
        const providerId = model.providerId;

        if (activeTab === 'chat') {
            setQuickChatModel(model.id, providerId);
        } else {
            setQuickImageModel(model.id, providerId);
        }
        setIsOpen(false);
    };

    const handleClearOverride = () => {
        if (activeTab === 'chat') setQuickChatModel(null);
        else setQuickImageModel(null);
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
                title={activeTab === 'chat' ? t.chatBar.switchModel : '切换绘画模型'}
            >
                <div className={`${isOpen ? 'text-brand-500' : ''} transition-colors`}>
                    {activeTab === 'chat' ? <Bot size={15} /> : <ImageIcon size={15} />}
                </div>
                {!compact && (
                    <>
                        <span className="max-w-[120px] truncate">
                            {getModelDisplayName(displayModel, userModels[activeTab])}
                        </span>
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
                        {/* Header: Mode Switcher */}
                        <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-slate-100 dark:border-white/5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {activeTab === 'chat' ? 'Chat Model' : 'Image Model'}
                            </span>
                            <div className="flex bg-slate-100 dark:bg-white/10 rounded-lg p-0.5">
                                <button
                                    onClick={() => setActiveTab('chat')}
                                    className={`p-1 rounded-md transition-all ${activeTab === 'chat' ? 'bg-white dark:bg-slate-800 shadow-sm text-cyan-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    title="对话模型"
                                >
                                    <MessageSquare size={12} />
                                </button>
                                <button
                                    onClick={() => setActiveTab('image')}
                                    className={`p-1 rounded-md transition-all ${activeTab === 'image' ? 'bg-white dark:bg-slate-800 shadow-sm text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    title="绘画模型"
                                >
                                    <ImageIcon size={12} />
                                </button>
                            </div>
                        </div>

                        {/* Reset / Default Option */}
                        {(activeTab === 'chat' ? quickChatModel : quickImageModel) && (
                            <button
                                onClick={handleClearOverride}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl
                                    text-xs font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5
                                    transition-all group mb-1"
                            >
                                <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                                <span>恢复默认</span>
                            </button>
                        )}

                        {/* Model List */}
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1 py-1">
                            {currentList.map((model) => {
                                const isSelected = displayModel === model.id;
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
                            })}
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
