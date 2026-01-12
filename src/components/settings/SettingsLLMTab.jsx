import React from 'react';
import { Key, Globe, Box, Layers, Settings, CheckCircle2, AlertCircle, RefreshCw, Plus, Trash2, Server, MessageSquare, Zap, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getKeyPool } from '../../services/llm/keyPoolManager';

export default function SettingsLLMTab({
    providers,
    activeId,
    setActiveId,
    currentProvider,
    handleUpdateProvider,
    handleAddProvider,
    handleRemoveProvider,
    handleTestConnection,
    testStatus,
    testMessage,
    handleReset
}) {
    const { t } = useLanguage();
    const [ignored, forceUpdate] = React.useState(0);
    const providerList = Object.values(providers || {});

    return (
        <div className="flex gap-6 h-full">

            {/* Sidebar: Provider List */}
            <div className="w-1/3 flex flex-col min-h-[400px] border-r border-slate-100 dark:border-white/5 pr-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.settings.provider}</h3>
                    <button
                        onClick={handleAddProvider}
                        className="p-1.5 hover:bg-brand-50 text-brand-600 dark:hover:bg-brand-900/20 dark:text-brand-400 rounded-lg transition-all"
                        title={t.settings.newProvider}
                    >
                        <Plus size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {providerList.map(p => (
                        <button
                            key={p.id}
                            onClick={() => setActiveId(p.id)}
                            className={`w-full text-left p-3 rounded-xl border transition-all group relative ${activeId === p.id
                                ? 'bg-brand-50 dark:bg-brand-900/10 border-brand-200 dark:border-brand-500/30 shadow-sm'
                                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'
                                }`}
                        >
                            <div className={`font-bold text-sm mb-0.5 ${activeId === p.id ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                {p.name || 'Untitled Provider'}
                            </div>
                            <div className="text-xs text-slate-400 truncate font-mono">
                                {p.protocol === 'gemini' ? t.settings.geminiNative : t.settings.openaiCompat}
                            </div>

                            {/* Delete Button (only visible on hover and if not the only one) */}
                            {providerList.length > 1 && (
                                <div
                                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveProvider(p.id);
                                    }}
                                >
                                    <div className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                        <Trash2 size={14} />
                                    </div>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content: Configuration */}
            <div className="w-2/3 flex flex-col h-full overflow-y-auto pr-1 pb-4 custom-scrollbar">

                {/* Provider Name & Protocol Header */}
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.providerName}</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Server size={16} /></div>
                            <input
                                type="text"
                                value={currentProvider.name || ''}
                                onChange={e => handleUpdateProvider('name', e.target.value)}
                                className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-bold text-sm text-slate-800 dark:text-white"
                                placeholder={t.settings.newProvider || "My AI Provider"}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-5">
                    {/* API Key(s) - 支持多 Key 轮询 */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            {t.settings.apiKey}
                            <span className="ml-2 text-xs font-normal text-slate-400">
                                (多个 Key 用逗号分隔，自动轮询)
                            </span>
                        </label>
                        <div className="relative">
                            <div className="absolute left-3 top-3 text-slate-400"><Key size={16} /></div>
                            <textarea
                                value={currentProvider.apiKey || ''}
                                onChange={e => handleUpdateProvider('apiKey', e.target.value)}
                                className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white resize-none"
                                placeholder={currentProvider.protocol === 'gemini' ? t.settings.geminiKeyPlaceholder : `${t.settings.openaiKeyPlaceholder}, key2, key3...`}
                                rows={2}
                            />
                        </div>

                        {/* Debug Info: Key Pool Status (Hidden by default for simplicity) */}
                        {/* 
                        <div className="mt-3 p-3 bg-slate-50/50 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/5 opacity-50 hover:opacity-100 transition-opacity">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                Key Pool Pool Debug Info
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(() => {
                                    const pool = getKeyPool(currentProvider.id, currentProvider.apiKey);
                                    const stats = pool.getStats();
                                    return stats.keys.map((k, i) => (
                                        <div key={i} className="text-[10px] font-mono text-slate-400">{k.key.substring(0, 8)}... ({k.status})</div>
                                    ));
                                })()}
                            </div>
                        </div> 
                        */}
                    </div>

                    {/* Base URL */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.baseUrl}</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Globe size={16} /></div>
                            <input
                                type="text"
                                value={currentProvider.baseUrl || ''}
                                onChange={e => handleUpdateProvider('baseUrl', e.target.value)}
                                className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                                placeholder={t.settings.urlPlaceholder}
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-1 ml-1">
                            {currentProvider.protocol === 'gemini'
                                ? t.settings.exampleUrlGemini
                                : t.settings.exampleUrlOpenai}
                        </p>
                    </div>

                    {/* Model & Protocol */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.modelName}</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Box size={16} /></div>
                                <input
                                    type="text"
                                    value={currentProvider.model || ''}
                                    onChange={e => handleUpdateProvider('model', e.target.value)}
                                    className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                                    placeholder={t.settings.modelPlaceholder}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.protocol}</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Layers size={16} /></div>
                                <select
                                    value={currentProvider.protocol}
                                    onChange={e => handleUpdateProvider('protocol', e.target.value)}
                                    className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white appearance-none cursor-pointer"
                                >
                                    <option value="gemini">{t.settings.geminiNative}</option>
                                    <option value="openai">{t.settings.openaiCompat}</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                    <Settings size={14} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Model List (Multi-Model Support) */}
                    <div className="pt-4 border-t border-slate-200 dark:border-white/5">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            {t.settings?.modelList || "可用模型列表"}
                            <span className="ml-2 text-[10px] font-normal text-slate-400">
                                (该厂商支持的多个模型，用逗号分隔，如: gpt-3.5-turbo, gpt-4-turbo)
                            </span>
                        </label>
                        <div className="relative">
                            <div className="absolute left-3 top-3 text-slate-400"><Box size={16} /></div>
                            <textarea
                                value={currentProvider.customModels || ''}
                                onChange={e => handleUpdateProvider('customModels', e.target.value)}
                                className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white resize-none"
                                placeholder="gpt-4-turbo, o1-preview, deepseek-coder..."
                                rows={2}
                            />
                        </div>
                    </div>

                    {/* Role Configuration (Advanced) */}
                    <div className="pt-4 mt-2 border-t border-slate-200 dark:border-white/5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 focus-within:text-brand-500 transition-colors">
                            <Layers size={12} />
                            {t.settings.roles?.title || "功能角色模型分配"}
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Chat Model */}
                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                                    <MessageSquare size={12} className="text-blue-500" />
                                    {t.settings.roles?.chatTitle || "对话模型"}
                                </label>
                                <input
                                    type="text"
                                    value={currentProvider.roles?.chat || ''}
                                    onChange={e => {
                                        const newRoles = { ...(currentProvider.roles || {}), chat: e.target.value };
                                        handleUpdateProvider('roles', newRoles);
                                    }}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-brand-500 outline-none text-xs font-mono text-slate-800 dark:text-white"
                                    placeholder={currentProvider.model || "默认随主模型"}
                                />
                            </div>

                            {/* Analysis/Functional Model */}
                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                                    <Zap size={12} className="text-amber-500" />
                                    {t.settings.roles?.analysisTitle || "功能模型"}
                                </label>
                                <input
                                    type="text"
                                    value={currentProvider.roles?.analysis || ''}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* 1. Dialogue & Functional Role */}
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                                            <MessageSquare size={14} className="text-blue-500" />
                                            {t.settings.roles?.chatTitle || "对话与各种功能 (Dialogue & Analysis)"}
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <select
                                                value={useStore.getState().globalRoles.chat.providerId}
                                                onChange={(e) => {
                                                    const pId = e.target.value;
                                                    const model = providers[pId]?.model || 'default';
                                                    useStore.getState().setGlobalRole('chat', pId, model);
                                                }}
                                                className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500"
                                            >
                                                {providerList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                            <input
                                                type="text"
                                                value={useStore.getState().globalRoles.chat.model}
                                                onChange={(e) => useStore.getState().setGlobalRole('chat', useStore.getState().globalRoles.chat.providerId, e.target.value)}
                                                className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-brand-500"
                                                placeholder="Model ID"
                                            />
                                        </div>
                                    </div>

                                    {/* 2. Image Role */}
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                                            <ImageIcon size={14} className="text-purple-500" />
                                            {t.settings.roles?.imageTitle || "图片生成 (Image Mode)"}
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <select
                                                value={useStore.getState().globalRoles.image.providerId}
                                                onChange={(e) => {
                                                    const pId = e.target.value;
                                                    const model = providers[pId]?.model || 'default';
                                                    useStore.getState().setGlobalRole('image', pId, model);
                                                }}
                                                className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500"
                                            >
                                                {providerList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                            <input
                                                type="text"
                                                value={useStore.getState().globalRoles.image.model}
                                                onChange={(e) => useStore.getState().setGlobalRole('image', useStore.getState().globalRoles.image.providerId, e.target.value)}
                                                className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-brand-500"
                                                placeholder="Image Model ID"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <p className="mt-4 text-[10px] text-slate-400 leading-relaxed bg-white/50 dark:bg-black/20 p-2.5 rounded-xl border border-slate-100 dark:border-white/5">
                                    <AlertCircle size={10} className="inline mr-1" />
                                    {t.settings.roles?.importantText || "对话模型将同时承担摘要、拆分、追问等所有智力功能。图片模型设定后固定执行任务。"}
                                </p>
                            </div>
                        </div>

                        {/* Test Connection */}
                        <div className="flex items-center gap-4 pt-6 mt-auto">
                            <button
                                onClick={handleTestConnection}
                                disabled={testStatus === 'testing' || !currentProvider.apiKey}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                            >
                                {testStatus === 'testing' ? t.settings.testing : t.settings.testConnection}
                            </button>
                            {
                                testStatus === 'success' && (
                                    <span className="text-green-600 flex items-center gap-1 text-sm font-medium animate-fade-in">
                                        <CheckCircle2 size={16} /> {testMessage}
                                    </span>
                                )
                            }
                            {
                                testStatus === 'error' && (
                                    <span className="text-red-500 flex items-center gap-1 text-sm font-medium animate-fade-in">
                                        <AlertCircle size={16} /> {testMessage}
                                    </span>
                                )
                            }
                        </div>

                        <div className="pt-4 mt-2 border-t border-slate-200 dark:border-white/10 flex justify-between">
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-2 text-red-500 hover:text-red-600 text-sm font-bold transition-all"
                            >
                                <RefreshCw size={14} /> {t.settings.resetDefaults}
                            </button>
                        </div>
                    </div>
                </div>
                );
}
