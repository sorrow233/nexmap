import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle2, AlertCircle, Database, Server, Globe, Key, Box, RefreshCw, Layers, Cpu, Radio, Workflow } from 'lucide-react';
import { getProviderSettings, saveProviderSettings, chatCompletion, DEFAULT_ROLES } from '../services/llm';
import { getProviderSettings as getRegSettings } from '../services/llm/registry'; // Import directly to get complete object
import { getS3Config, saveS3Config } from '../services/s3';
import { saveUserSettings } from '../services/storage';

export default function SettingsModal({ isOpen, onClose, user }) {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState('llm');

    // LLM State
    const [providers, setProviders] = useState({});
    const [activeId, setActiveId] = useState('google');
    const [roles, setRoles] = useState({});

    // Testing State
    const [testStatus, setTestStatus] = useState('idle');
    const [testMessage, setTestMessage] = useState('');

    // S3 Storage State
    const [s3Config, setS3ConfigState] = useState({
        enabled: false,
        endpoint: '',
        region: 'auto',
        bucket: '',
        accessKeyId: '',
        secretAccessKey: '',
        publicDomain: ''
    });

    // Load configuration on mount
    useEffect(() => {
        const settings = getRegSettings();
        if (settings) {
            setProviders(settings.providers);
            setActiveId(settings.activeId);
            setRoles(settings.roles || DEFAULT_ROLES);
        }

        const s3 = getS3Config();
        if (s3) setS3ConfigState(s3);
    }, [isOpen]);

    const handleUpdateProvider = (field, value) => {
        setProviders(prev => ({
            ...prev,
            [activeId]: {
                ...prev[activeId],
                [field]: value
            }
        }));
    };

    const handleUpdateRole = (role, field, value) => {
        setRoles(prev => ({
            ...prev,
            [role]: {
                ...(prev[role] || {}),
                [field]: value
            }
        }));
    };

    const handleTestConnection = async () => {
        setTestStatus('testing');
        setTestMessage('');
        try {
            const currentConfig = providers[activeId];
            if (!currentConfig.apiKey) throw new Error("API Key is missing");

            await chatCompletion(
                [{ role: 'user', content: 'Hi, respond with OK only.' }],
                null, // use default model
                { config: currentConfig } // Pass explicit config for testing
            );
            setTestStatus('success');
            setTestMessage('Connection Successful!');
        } catch (error) {
            console.error(error);
            setTestStatus('error');
            setTestMessage(error.message || 'Connection Failed');
        }
    };

    const handleSave = async () => {
        // Save LLM Config
        saveProviderSettings(providers, activeId, roles);

        // Save S3 config
        saveS3Config(s3Config);

        // Sync to cloud if logged in
        if (user && user.uid) {
            try {
                await saveUserSettings(user.uid, {
                    providers,
                    activeId,
                    roles,
                    s3Config
                });
                console.log("[Sync] User settings pushed to cloud");
            } catch (e) {
                console.error("[Sync] Failed to push settings to cloud", e);
            }
        }

        alert('Settings saved! Reloading page to apply changes...');
        window.location.reload();
    };

    const handleReset = () => {
        if (confirm('Reset LLM settings to defaults? This cannot be undone.')) {
            localStorage.removeItem('mixboard_providers_v3');
            window.location.reload();
        }
    };

    const currentProvider = providers[activeId] || {};

    const ROLE_DESCRIPTIONS = {
        chat: { label: 'Main Chat', desc: 'The primary model used for conversation.' },
        extraction: { label: 'Title & Summary', desc: 'Used for generating titles and summarizing content.' },
        analysis: { label: 'Deep Analysis', desc: 'Used for generating follow-up questions and complex reasoning.' },
        image: { label: 'Image Generation', desc: 'Used for generating images from prompts.' }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center font-sans">
            <div className="bg-white dark:bg-slate-900 w-[700px] h-[750px] rounded-3xl shadow-2xl animate-fade-in border border-slate-100 dark:border-white/10 flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-2xl text-brand-600 dark:text-brand-400">
                            <Settings size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Settings</h2>
                            <p className="text-slate-500 text-sm">Configure AI Providers & Storage</p>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="px-6 pt-4 pb-0 flex gap-2 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('llm')}
                        className={`px-4 py-3 border-b-2 font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'llm'
                            ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-900/10'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        <Cpu size={18} /> Model Setup
                    </button>
                    <button
                        onClick={() => setActiveTab('roles')}
                        className={`px-4 py-3 border-b-2 font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'roles'
                            ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-900/10'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        <Workflow size={18} /> Functional Roles
                    </button>
                    <button
                        onClick={() => setActiveTab('storage')}
                        className={`px-4 py-3 border-b-2 font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'storage'
                            ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-900/10'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        <Database size={18} /> Storage
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                    {/* LLM Tab */}
                    {activeTab === 'llm' && (
                        <div className="space-y-8 animate-slide-up">

                            {/* Provider Selection */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Select Provider to Configure</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.values(providers).map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setActiveId(p.id)}
                                            className={`relative p-4 rounded-xl border-2 text-left transition-all ${activeId === p.id
                                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                                                : 'border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'
                                                }`}
                                        >
                                            <div className="font-bold text-slate-800 dark:text-slate-100">{p.name}</div>
                                            <div className="text-xs text-slate-500 mt-1">{p.protocol === 'gemini' ? 'Native Protocol' : 'OpenAI Protocol'}</div>
                                            {activeId === p.id && (
                                                <div className="absolute top-3 right-3 text-brand-600 dark:text-brand-400">
                                                    <Settings size={20} />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Config Form */}
                            <div className="space-y-5 pt-6 border-t border-slate-100 dark:border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Configuration: {currentProvider.name}</h3>
                                    <div className="text-xs text-slate-500 italic">ID: {currentProvider.id}</div>
                                </div>


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
                                                placeholder="gpt-4o / gemini-2.0-flash-exp"
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
                    )}

                    {/* Roles Tab */}
                    {activeTab === 'roles' && (
                        <div className="space-y-6 animate-slide-up">
                            <div className="p-4 bg-brand-50 dark:bg-brand-900/20 text-brand-800 dark:text-brand-200 rounded-xl text-sm border border-brand-100 dark:border-brand-900/30">
                                <p className="font-bold mb-1">Advanced Model Routing</p>
                                <p>Assign different providers to specialized tasks for optimal performance and cost.</p>
                            </div>

                            <div className="space-y-4">
                                {Object.entries(ROLE_DESCRIPTIONS).map(([roleKey, info]) => {
                                    const roleConfig = roles[roleKey] || { providerId: activeId, model: '' };
                                    return (
                                        <div key={roleKey} className="p-4 border border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                        {info.label}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 mt-1">{info.desc}</p>
                                                </div>
                                                <div className="px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded text-xs font-mono text-slate-600 dark:text-slate-400">
                                                    {roleKey}
                                                </div>
                                            </div>

                                            {/* Provider Selection */}
                                            <div className="mb-3">
                                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Provider</label>
                                                <select
                                                    value={roleConfig.providerId || activeId}
                                                    onChange={(e) => handleUpdateRole(roleKey, 'providerId', e.target.value)}
                                                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-800 dark:text-white cursor-pointer hover:border-brand-400 transition-colors"
                                                >
                                                    {Object.values(providers).map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Model Input */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Model Name</label>
                                                <input
                                                    type="text"
                                                    value={roleConfig.model || ''}
                                                    onChange={(e) => handleUpdateRole(roleKey, 'model', e.target.value)}
                                                    placeholder={providers[roleConfig.providerId]?.model || "google/gemini-3-flash-preview"}
                                                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-800 dark:text-white font-mono placeholder:text-slate-400 focus:border-brand-400 transition-colors"
                                                />
                                                <p className="text-xs text-slate-400 mt-1">可以使用不同的模型,如 google/gemini-3-pro-preview</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Storage Tab */}
                    {activeTab === 'storage' && (
                        <div className="space-y-6 animate-slide-up">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-xl text-sm border border-blue-100 dark:border-blue-900/30">
                                <p className="font-bold mb-1">BYOK (Bring Your Own Key)</p>
                                <p>Use your own S3 storage (AWS, Cloudflare R2, MinIO) to store images.</p>
                            </div>

                            {/* Enable Toggle */}
                            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-white/10 rounded-2xl">
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Enable S3 Storage</h3>
                                    <p className="text-xs text-slate-500">Upload images to your own cloud bucket</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={s3Config.enabled}
                                        onChange={e => setS3ConfigState({ ...s3Config, enabled: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
                                </label>
                            </div>

                            {s3Config.enabled && (
                                <div className="space-y-4 animate-fade-in">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Endpoint URL</label>
                                        <input
                                            type="text"
                                            value={s3Config.endpoint}
                                            onChange={e => setS3ConfigState({ ...s3Config, endpoint: e.target.value })}
                                            placeholder="https://<account>.r2.cloudflarestorage.com"
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Region</label>
                                            <input
                                                type="text"
                                                value={s3Config.region}
                                                onChange={e => setS3ConfigState({ ...s3Config, region: e.target.value })}
                                                placeholder="auto"
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Bucket Name</label>
                                            <input
                                                type="text"
                                                value={s3Config.bucket}
                                                onChange={e => setS3ConfigState({ ...s3Config, bucket: e.target.value })}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Access Key ID</label>
                                            <input
                                                type="text"
                                                value={s3Config.accessKeyId}
                                                onChange={e => setS3ConfigState({ ...s3Config, accessKeyId: e.target.value })}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Secret Access Key</label>
                                            <input
                                                type="password"
                                                value={s3Config.secretAccessKey}
                                                onChange={e => setS3ConfigState({ ...s3Config, secretAccessKey: e.target.value })}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-5 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-500 shadow-lg shadow-brand-500/30 transition-all hover:scale-105 active:scale-95"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
}
