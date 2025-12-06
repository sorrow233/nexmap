import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Key, Globe, Box, Layers, Server, CheckCircle2, AlertCircle, RefreshCw, Settings, Cpu, Brain, Zap } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

export default function AIModelSection({ providers, setProviders, activeId, setActiveId }) {
    const { t } = useLanguage();
    const [testStatus, setTestStatus] = useState('idle');
    const [testMessage, setTestMessage] = useState('');

    const providerList = Object.values(providers || {});
    const currentProvider = providers[activeId] || {};

    // Ensure there's always at least one selected if list is not empty
    useEffect(() => {
        if (!activeId && providerList.length > 0) {
            setActiveId(providerList[0].id);
        }
    }, [providers, activeId, setActiveId]);

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

        // Dont allow deleting the last one? Or maybe allow but show empty state
        // if (remainingIds.length === 0) return;

        if (activeId === idToRemove && remainingIds.length > 0) {
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

            // Dynamic import to avoid circular dependencies if any
            const { chatCompletion } = await import('../../../services/llm');

            // Simple ping
            await chatCompletion(
                [{ role: 'user', content: 'Ping' }],
                currentProvider,
                testModel,
                { maxTokens: 5 }
            );
            setTestStatus('success');
            setTestMessage('Connection successful!');

            // Auto hide success message
            setTimeout(() => {
                setTestStatus('idle');
                setTestMessage('');
            }, 3000);
        } catch (error) {
            console.error(error);
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

            <div className="flex-1 flex gap-6 min-h-0 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900/30 shadow-sm">
                {/* Provider List Sidebar */}
                <div className="w-[220px] bg-slate-50 dark:bg-white/5 border-r border-slate-200 dark:border-white/10 flex flex-col">
                    <div className="p-3 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-100/50 dark:bg-white/5">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-2">Providers</span>
                        <button
                            onClick={handleAddProvider}
                            className="p-1.5 bg-white dark:bg-white/10 hover:bg-teal-50 text-slate-600 dark:text-slate-300 hover:text-teal-600 rounded-lg shadow-sm border border-slate-200 dark:border-white/10 transition-all"
                            title="Add Provider"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {providerList.length === 0 ? (
                            <div className="text-center py-8 text-xs text-slate-400 px-4">
                                No providers configured. Click + to add one.
                            </div>
                        ) : (
                            providerList.map(p => (
                                <div key={p.id} className="relative group">
                                    <button
                                        onClick={() => setActiveId(p.id)}
                                        className={`w-full text-left px-3 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${activeId === p.id
                                                ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-white/10 z-10'
                                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                            }`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${activeId === p.id ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                        <div className="truncate flex-1">{p.name || 'Unnamed'}</div>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRemoveProvider(p.id); }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-20"
                                        title="Delete Provider"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Config Form */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-transparent">
                    {providerList.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <Box size={48} className="mb-4 opacity-20" />
                            <p>Select or add a provider to configure</p>
                        </div>
                    ) : (
                        <div className="p-8 max-w-2xl mx-auto space-y-8">

                            {/* Identity Card */}
                            <div className="flex gap-4 items-start">
                                <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
                                    <Brain size={24} className="text-teal-600 dark:text-teal-400" />
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Provider Name</label>
                                        <input
                                            type="text"
                                            value={currentProvider.name || ''}
                                            onChange={e => handleUpdateProvider('name', e.target.value)}
                                            className="w-full text-lg font-bold bg-transparent border-b border-slate-200 dark:border-white/10 focus:border-teal-500 outline-none px-0 py-1 transition-colors dark:text-white"
                                            placeholder="My AI Provider"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Protocol</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['openai', 'gemini'].map(proto => (
                                                <button
                                                    key={proto}
                                                    onClick={() => handleUpdateProvider('protocol', proto)}
                                                    className={`px-3 py-2 rounded-lg text-sm font-bold border transition-all flex items-center justify-center gap-2 ${currentProvider.protocol === proto
                                                            ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-500/30 text-teal-700 dark:text-teal-300'
                                                            : 'border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'
                                                        }`}
                                                >
                                                    {proto === 'openai' ? <Layers size={14} /> : <Zap size={14} />}
                                                    {proto === 'openai' ? 'OpenAI / Compatible' : 'Google Gemini'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-100 dark:border-white/5" />

                            {/* Connection Details */}
                            <div className="space-y-5">
                                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Server size={18} className="text-slate-400" />
                                    Connection Details
                                </h4>

                                <div className="grid grid-cols-1 gap-5">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Base URL</label>
                                        <div className="relative group">
                                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={16} />
                                            <input
                                                type="text"
                                                value={currentProvider.baseUrl || ''}
                                                onChange={e => handleUpdateProvider('baseUrl', e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-mono focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all dark:text-slate-200"
                                                placeholder="https://api.openai.com/v1"
                                            />
                                        </div>
                                        <p className="mt-1 text-[10px] text-slate-400">Endpoint for chat completions.</p>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">API Key</label>
                                        <div className="relative group">
                                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={16} />
                                            <input
                                                type="password"
                                                value={currentProvider.apiKey || ''}
                                                onChange={e => handleUpdateProvider('apiKey', e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-mono focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all dark:text-slate-200"
                                                placeholder="sk-..."
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Model ID</label>
                                        <div className="relative group">
                                            <Box className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={16} />
                                            <input
                                                type="text"
                                                value={currentProvider.model || ''}
                                                onChange={e => handleUpdateProvider('model', e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-mono focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all dark:text-slate-200"
                                                placeholder="gpt-4o, claude-3-opus..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Test Connection Footer */}
                            <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                <div className="text-xs text-slate-400 max-w-[200px]">
                                    Unsure? Use the Test Connection button to verify your settings.
                                </div>
                                <button
                                    onClick={handleTestConnection}
                                    disabled={testStatus === 'testing' || !currentProvider.apiKey}
                                    className={`
                                        flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all
                                        ${testStatus === 'success'
                                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                            : testStatus === 'error'
                                                ? 'bg-red-500 text-white hover:bg-red-600'
                                                : 'bg-slate-800 dark:bg-white text-white dark:text-black hover:bg-slate-900 dark:hover:bg-slate-200 hover:-translate-y-0.5'
                                        }
                                        disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed
                                    `}
                                >
                                    {testStatus === 'testing' ? <RefreshCw size={16} className="animate-spin" /> :
                                        testStatus === 'success' ? <CheckCircle2 size={16} /> :
                                            testStatus === 'error' ? <AlertCircle size={16} /> :
                                                <RefreshCw size={16} />
                                    }
                                    {testStatus === 'testing' ? 'Testing...' :
                                        testStatus === 'success' ? 'Verified' :
                                            testStatus === 'error' ? 'Failed' :
                                                'Test Connection'}
                                </button>
                            </div>
                            {testMessage && (
                                <div className={`text-center text-xs font-bold mt-2 animate-fade-in ${testStatus === 'error' ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {testMessage}
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
