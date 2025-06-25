import React from 'react';
import { Key, Globe, Box, Layers, Settings, CheckCircle2, AlertCircle, RefreshCw, Plus, Trash2, Server } from 'lucide-react';



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
    const providerList = Object.values(providers || {});

    return (
        <div className="flex gap-6 h-full animate-slide-up">

            {/* Advanced User Notice */}
            <div className="absolute -top-2 left-0 right-0 px-4">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg text-xs border border-amber-200 dark:border-amber-800/30 flex items-center gap-2">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    <span>⚙️ <strong>高级设置</strong> - 此页面用于配置自定义 API 密钥，普通用户无需修改。</span>
                </div>
            </div>

            {/* Sidebar: Provider List */}
            <div className="w-1/3 flex flex-col min-h-[400px] border-r border-slate-100 dark:border-white/5 pr-6 pt-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Providers</h3>
                    <button
                        onClick={handleAddProvider}
                        className="p-1.5 hover:bg-brand-50 text-brand-600 dark:hover:bg-brand-900/20 dark:text-brand-400 rounded-lg transition-all"
                        title="Add New Provider"
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
                                {p.protocol === 'gemini' ? 'Gemini Native' : 'OpenAI Compat'}
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
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Provider Name</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Server size={16} /></div>
                            <input
                                type="text"
                                value={currentProvider.name || ''}
                                onChange={e => handleUpdateProvider('name', e.target.value)}
                                className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-bold text-sm text-slate-800 dark:text-white"
                                placeholder="My AI Provider"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-5">
                    {/* API Key */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">API Key</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Key size={16} /></div>
                            <input
                                type="password"
                                value={currentProvider.apiKey || ''}
                                onChange={e => handleUpdateProvider('apiKey', e.target.value)}
                                className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                                placeholder={currentProvider.protocol === 'gemini' ? "Gemini API Key" : "sk-..."}
                            />
                        </div>
                    </div>

                    {/* Base URL */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Base URL</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Globe size={16} /></div>
                            <input
                                type="text"
                                value={currentProvider.baseUrl || ''}
                                onChange={e => handleUpdateProvider('baseUrl', e.target.value)}
                                className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                                placeholder="https://api.openai.com/v1"
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-1 ml-1">
                            {currentProvider.protocol === 'gemini'
                                ? 'Example: https://generativelanguage.googleapis.com/v1beta'
                                : 'Example: https://api.openai.com/v1'}
                        </p>
                    </div>

                    {/* Model & Protocol */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Model Name</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Box size={16} /></div>
                                <input
                                    type="text"
                                    value={currentProvider.model || ''}
                                    onChange={e => handleUpdateProvider('model', e.target.value)}
                                    className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                                    placeholder="gpt-4o"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Protocol</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Layers size={16} /></div>
                                <select
                                    value={currentProvider.protocol}
                                    onChange={e => handleUpdateProvider('protocol', e.target.value)}
                                    className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white appearance-none cursor-pointer"
                                >
                                    <option value="gemini">Gemini Native</option>
                                    <option value="openai">OpenAI Compatible</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                    <Settings size={14} />
                                </div>
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
                        {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                    </button>
                    {testStatus === 'success' && (
                        <span className="text-green-600 flex items-center gap-1 text-sm font-medium animate-fade-in">
                            <CheckCircle2 size={16} /> {testMessage}
                        </span>
                    )}
                    {testStatus === 'error' && (
                        <span className="text-red-500 flex items-center gap-1 text-sm font-medium animate-fade-in">
                            <AlertCircle size={16} /> {testMessage}
                        </span>
                    )}
                </div>

                <div className="pt-4 mt-2 border-t border-slate-200 dark:border-white/10 flex justify-between">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 text-red-500 hover:text-red-600 text-sm font-bold transition-all"
                    >
                        <RefreshCw size={14} /> Reset Defaults
                    </button>
                </div>
            </div>
        </div>
    );
}
