import React from 'react';
import { Key, Globe, Box, Layers, Settings, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function SettingsLLMTab({
    currentProvider,
    handleUpdateProvider,
    handleTestConnection,
    testStatus,
    testMessage,
    handleReset
}) {
    return (
        <div className="space-y-8 animate-slide-up">

            {/* Config Form */}
            <div className="space-y-5">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Model Configuration</h3>

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
                            placeholder="GMI API Key"
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
                            placeholder="https://api.gmi-serving.com/v1"
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-1 ml-1">
                        {currentProvider.protocol === 'gemini'
                            ? 'Example: https://api.gmi-serving.com/v1 (GMI Native)'
                            : 'Example: https://api.gmi-serving.com/v1 (GMI OpenAI Compatible)'}
                    </p>
                </div>

                {/* Model */}
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
                                placeholder="google/gemini-3-flash-preview"
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
            <div className="flex items-center gap-4 pt-2">
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

            <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex justify-between">
                <button
                    onClick={handleReset}
                    className="flex items-center gap-2 text-red-500 hover:text-red-600 text-sm font-bold transition-all"
                >
                    <RefreshCw size={14} /> Reset Defaults
                </button>
            </div>
        </div>
    );
}
