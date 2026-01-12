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

                    {/* Role Configuration (Advanced) */}
                    <div className="pt-4 mt-2 border-t border-slate-200 dark:border-white/5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                            <Layers size={10} className="inline mr-1" />
                            {t.settings?.roleAssignment || "功能角色模型分配 (Advanced)"}
                        </label>
                        <div className="space-y-4">
                            {/* Chat Model (Dialogue) */}
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
                                    {t.settings.roles?.analysisTitle || "功能模型 (Analysis Role)"}
                                </label>
                                <input
                                    type="text"
                                    value={currentProvider.roles?.analysis || ''}
                                    onChange={e => {
                                        const newRoles = { ...(currentProvider.roles || {}), analysis: e.target.value };
                                        handleUpdateProvider('roles', newRoles);
                                    }}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-brand-500 outline-none text-xs font-mono text-slate-800 dark:text-white"
                                    placeholder={currentProvider.model || "默认随主模型"}
                                />
                            </div>

                            {/* Image Model */}
                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                                    <ImageIcon size={12} className="text-purple-500" />
                                    {t.settings.roles?.imageTitle || "绘画模型 (Image Role)"}
                                </label>
                                <input
                                    type="text"
                                    value={currentProvider.roles?.image || ''}
                                    onChange={e => {
                                        const newRoles = { ...(currentProvider.roles || {}), image: e.target.value };
                                        handleUpdateProvider('roles', newRoles);
                                    }}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-brand-500 outline-none text-xs font-mono text-slate-800 dark:text-white"
                                    placeholder="dall-e-3, flux-pro..."
                                />
                            </div>
                        </div>
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
