import React, { useState } from 'react';
import { Plus, Trash2, Key, Globe, Box, Layers, Server, CheckCircle2, AlertCircle, RefreshCw, Settings, Cpu } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

export default function AIModelSection({ providers, setProviders, activeId, setActiveId }) {
    const { t } = useLanguage();
    const [testStatus, setTestStatus] = useState('idle');
    const [testMessage, setTestMessage] = useState('');

    const providerList = Object.values(providers || {});
    const currentProvider = providers[activeId] || {};

    const handleUpdateProvider = (field, value) => {
        setProviders(prev => ({
            ...prev,
            [activeId]: {
                ...prev[activeId],
                [field]: value
            }
        }));
    };

    const handleAddProvider = () => {
        const newId = `custom-${Date.now()}`;
        setProviders(prev => ({
            ...prev,
            [newId]: {
                id: newId,
                name: t.settings.newProvider || 'New Provider',
                baseUrl: 'https://api.openai.com/v1',
                apiKey: '',
                model: 'gpt-4o',
                protocol: 'openai',
                roles: { chat: '', analysis: '', image: '' }
            }
        }));
        setActiveId(newId);
    };

    const handleRemoveProvider = (idToRemove) => {
        const remainingIds = Object.keys(providers).filter(id => id !== idToRemove);
        if (remainingIds.length === 0) return;

        if (activeId === idToRemove) {
            setActiveId(remainingIds[0]);
        }

        setProviders(prev => {
            const next = { ...prev };
            delete next[idToRemove];
            return next;
        });
    };

    const handleTestConnection = async () => {
        setTestStatus('testing');
        setTestMessage('');
        try {
            if (!currentProvider.apiKey) throw new Error("API Key is missing");
            const testModel = currentProvider.roles?.chat || currentProvider.model || null;

            const { chatCompletion } = await import('../../../services/llm');
            await chatCompletion(
                [{ role: 'user', content: 'Hi' }],
                currentProvider,
                testModel,
                { maxTokens: 5 }
            );
            setTestStatus('success');
            setTestMessage('Connection successful!');
        } catch (error) {
            setTestStatus('error');
            setTestMessage(error.message || 'Connection failed');
        }
    };

    return (
        <div className="flex flex-col h-[600px] animate-fade-in">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                    <Cpu size={20} className="text-teal-500" />
                    {t.settings.provider || 'AI Models'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {t.settings.providerDesc || 'Configure LLM providers (OpenAI, Anthropic, Ollama, etc).'}
                </p>
            </div>

            <div className="flex-1 flex gap-6 min-h-0 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900/30">
                {/* Provider List Sidebar */}
                <div className="w-[200px] bg-slate-50 dark:bg-white/5 border-r border-slate-200 dark:border-white/10 flex flex-col">
                    <div className="p-3 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-100/50 dark:bg-white/5">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Providers</span>
                        <button
                            onClick={handleAddProvider}
                            className="p-1.5 bg-white dark:bg-white/10 hover:bg-teal-50 text-slate-600 dark:text-slate-300 hover:text-teal-600 rounded-lg shadow-sm border border-slate-200 dark:border-white/10 transition-all"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {providerList.map(p => (
                            <div key={p.id} className="relative group">
                                <button
                                    onClick={() => setActiveId(p.id)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeId === p.id
                                            ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-white/10'
                                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                        }`}
                                >
                                    <div className="truncate pr-6">{p.name}</div>
                                </button>
                                {providerList.length > 1 && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRemoveProvider(p.id); }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Config Form */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="space-y-6 max-w-lg">

                        {/* Name */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Name</label>
                            <div className="relative">
                                <Server className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    value={currentProvider.name || ''}
                                    onChange={e => handleUpdateProvider('name', e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                    placeholder="Provider Name"
                                />
                            </div>
                        </div>

                        {/* Base URL */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Base URL</label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    value={currentProvider.baseUrl || ''}
                                    onChange={e => handleUpdateProvider('baseUrl', e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                    placeholder="https://api.openai.com/v1"
                                />
                            </div>
                        </div>

                        {/* API Key */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">API Key</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="password"
                                    value={currentProvider.apiKey || ''}
                                    onChange={e => handleUpdateProvider('apiKey', e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                    placeholder="sk-..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Model */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Default Model</label>
                                <div className="relative">
                                    <Box className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        value={currentProvider.model || ''}
                                        onChange={e => handleUpdateProvider('model', e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                        placeholder="gpt-4o"
                                    />
                                </div>
                            </div>

                            {/* Protocol */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Protocol</label>
                                <div className="relative">
                                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select
                                        value={currentProvider.protocol || 'openai'}
                                        onChange={e => handleUpdateProvider('protocol', e.target.value)}
                                        className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="openai">OpenAI Compatible</option>
                                        <option value="gemini">Google Gemini</option>
                                    </select>
                                    <Settings className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                            <button
                                onClick={handleTestConnection}
                                disabled={testStatus === 'testing' || !currentProvider.apiKey}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none"
                            >
                                {testStatus === 'testing' ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                            </button>

                            {testStatus === 'success' && (
                                <div className="mt-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-bold animate-fade-in">
                                    <CheckCircle2 size={16} /> {testMessage}
                                </div>
                            )}
                            {testStatus === 'error' && (
                                <div className="mt-3 flex items-center gap-2 text-red-500 text-sm font-bold animate-fade-in">
                                    <AlertCircle size={16} /> {testMessage}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
