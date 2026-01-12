import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, ChevronDown, Check, Image as ImageIcon, MessageSquare, Zap, Target, Cpu, ShieldCheck, Globe, RefreshCw } from 'lucide-react';
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
 * 提取模型显示名称
 */
function getModelDisplayName(modelId, customModels = []) {
    if (!modelId) return '默认配置';

    // 先从自定义模型中查找
    const custom = customModels.find(m => m.id === modelId);
    if (custom) return custom.name;

    // 再从预设中查找
    const allPresets = [...PRESET_MODELS.chat, ...PRESET_MODELS.image];
    const preset = allPresets.find(m => m.id === modelId);
    if (preset) return preset.name;

    const parts = modelId.split('/');
    const name = parts[parts.length - 1];
    return name.replace(/-preview$/, '').replace(/-/g, ' ');
}

/**
 * ModelSwitcher - 画布快速模型切换组件 (Dynamic & Glassmorphism)
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

    // 动态提取用户的自定义模型
    const userModels = useMemo(() => {
        const chatModels = [];
        const imageModels = [];

        Object.values(providers || {}).forEach(p => {
            if (!p) return;
            // 基本模型
            if (p.model) {
                const modelObj = { id: p.model, name: p.model, provider: p.name, icon: p.protocol === 'openai' ? Bot : p.protocol === 'gemini' ? Sparkles : Globe };
                if (p.protocol === 'openai' || p.protocol === 'gemini' || p.protocol === 'anthropic' || p.protocol === 'custom') {
                    chatModels.push(modelObj);
                }
            }
            // 角色分配模型
            if (p.roles) {
                if (p.roles.chat) chatModels.push({ id: p.roles.chat, name: p.roles.chat, provider: `${p.name} (Chat)`, icon: MessageSquare });
                if (p.roles.image) imageModels.push({ id: p.roles.image, name: p.roles.image, provider: `${p.name} (Image)`, icon: ImageIcon });
            }
        });

        // 去重
        const unique = (arr) => Array.from(new Map(arr.map(item => [item.id, item])).values());
        return { chat: unique(chatModels), image: unique(imageModels) };
    }, [providers]);

    const currentChatModel = getEffectiveChatModel?.() || quickChatModel;
    const currentImageModel = getEffectiveImageModel?.() || quickImageModel;
    const displayModel = activeTab === 'chat' ? currentChatModel : currentImageModel;

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
                    group flex items-center gap-2 px-3 py-1.5 rounded-xl
                    text-xs font-bold transition-all duration-300
                    ${isOpen
                        ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                        : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                    }
                `}
                title={activeTab === 'chat' ? t.chatBar.switchModel : '切换绘画模型'}
            >
                <div className={`${isOpen ? 'text-white' : 'text-cyan-500'} transition-colors`}>
                    {activeTab === 'chat' ? <Bot size={15} /> : <ImageIcon size={15} />}
                </div>
                {!compact && (
                    <>
                        <span className="max-w-[110px] truncate tracking-tight">
                            {activeTab === 'chat' ? '对话: ' : '绘图: '}{getModelDisplayName(displayModel, userModels[activeTab])}
                        </span>
                        <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </>
                )}
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="absolute bottom-full mb-3 left-0 w-72 
                            bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl 
                            border border-white/20 dark:border-white/10
                            rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] 
                            ring-1 ring-black/5 dark:ring-white/5 overflow-hidden z-50"
                    >
                        {/* Tab Switcher */}
                        <div className="p-1 mx-2 mt-2 bg-slate-100/50 dark:bg-white/5 rounded-xl flex">
                            <button
                                onClick={() => setActiveTab('chat')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all
                                    ${activeTab === 'chat'
                                        ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                <MessageSquare size={14} />
                                会话
                            </button>
                            <button
                                onClick={() => setActiveTab('image')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all
                                    ${activeTab === 'image'
                                        ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                <ImageIcon size={14} />
                                绘画
                            </button>
                        </div>

                        {/* Model List Area */}
                        <div className="max-h-[380px] overflow-y-auto py-2 px-2 custom-scrollbar">
                            {/* Reset Option */}
                            {(activeTab === 'chat' ? quickChatModel : quickImageModel) && (
                                <button
                                    onClick={handleClearOverride}
                                    className="w-full flex items-center gap-3 px-3 py-2 mb-2 rounded-xl
                                        text-xs font-bold text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5
                                        border border-dashed border-slate-200 dark:border-white/10 transition-all shadow-sm"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                                        <RefreshCw size={14} />
                                    </div>
                                    <div className="text-left font-bold">恢复默认配置</div>
                                </button>
                            )}

                            {/* User Configured Models Section */}
                            {userModels[activeTab].length > 0 && (
                                <div className="mb-2">
                                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <div className="h-px flex-1 bg-slate-100 dark:bg-white/5"></div>
                                        我的配置
                                        <div className="h-px flex-1 bg-slate-100 dark:bg-white/5"></div>
                                    </div>
                                    <div className="space-y-0.5 mt-1">
                                        {userModels[activeTab].map((model) => {
                                            const isSelected = displayModel === model.id;
                                            return (
                                                <ModelItem
                                                    key={`user-${model.id}`}
                                                    model={model}
                                                    isSelected={isSelected}
                                                    onClick={() => handleModelSelect(model.id)}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Preset List Section */}
                            <div>
                                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <div className="h-px flex-1 bg-slate-100 dark:bg-white/5"></div>
                                    常用预设
                                    <div className="h-px flex-1 bg-slate-100 dark:bg-white/5"></div>
                                </div>
                                <div className="space-y-0.5 mt-1">
                                    {PRESET_MODELS[activeTab].map((model) => {
                                        const isSelected = displayModel === model.id;
                                        return (
                                            <ModelItem
                                                key={`preset-${model.id}`}
                                                model={model}
                                                isSelected={isSelected}
                                                onClick={() => handleModelSelect(model.id)}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ModelItem({ model, isSelected, onClick }) {
    const Icon = model.icon || Bot;
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left
                transition-all duration-200 group relative
                ${isSelected
                    ? 'bg-cyan-50/50 dark:bg-cyan-900/20 ring-1 ring-cyan-500/20 shadow-sm'
                    : 'hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
        >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 
                ${isSelected ? 'bg-white dark:bg-slate-800 shadow-sm' : 'bg-slate-100 dark:bg-white/5'}`}>
                <Icon size={16} className={model.color || 'text-slate-500 group-hover:text-cyan-500'} />
            </div>

            <div className="flex-1 min-w-0">
                <div className={`text-xs font-bold truncate ${isSelected ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-700 dark:text-slate-200'}`}>
                    {model.name}
                </div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-70 truncate">{model.provider}</div>
            </div>

            {isSelected && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Check size={14} className="text-cyan-500" />
                </motion.div>
            )}
        </button>
    );
}
