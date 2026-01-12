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
    const providerList = Object.values(providers || {});

    // ... (rest of the file until the specific block)

    {/* Key Pool Status Dashboard */ }
    {
        currentProvider.apiKey && (
            <div className="mt-3 p-3 bg-slate-50/50 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/5">
                <div className="flex justify-between items-center mb-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        Key Pool 状态
                    </div>
                    <button
                        onClick={() => {
                            getKeyPool(currentProvider.id, currentProvider.apiKey).resetFailedStatus();
                            // 强制刷新组件状态
                            handleUpdateProvider('apiKey', currentProvider.apiKey + ' ');
                            setTimeout(() => handleUpdateProvider('apiKey', currentProvider.apiKey.trim()), 0);
                        }}
                        className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:opacity-80 transition-opacity uppercase"
                    >
                        一键重置
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {(() => {
                        const pool = getKeyPool(currentProvider.id, currentProvider.apiKey);
                        const stats = pool.getStats();
                        return stats.keys.map((k, i) => (
                            <div
                                key={i}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono transition-all ${k.status === 'active'
                                    ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-500/20 text-red-500'
                                    }`}
                                title={k.status === 'active' ? '处于活动状态' : '已失效或限流，将被跳过'}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${k.status === 'active' ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`}></div>
                                {k.key}
                            </div>
                        ));
                    })()}
                </div>
            </div>
        )
    }
                    </div >

        {/* Base URL */ }
        < div >
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
                    </div >

        {/* Model & Protocol */ }
        < div className = "grid grid-cols-2 gap-4" >
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
                    </div >
                </div >

        {/* Test Connection */ }
        < div className = "flex items-center gap-4 pt-6 mt-auto" >
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
        </div >

        <div className="pt-4 mt-2 border-t border-slate-200 dark:border-white/10 flex justify-between">
            <button
                onClick={handleReset}
                className="flex items-center gap-2 text-red-500 hover:text-red-600 text-sm font-bold transition-all"
            >
                <RefreshCw size={14} /> {t.settings.resetDefaults}
            </button>
        </div>
            </div >
        </div >
    );
}
