import React, { useState, useEffect } from 'react';
import { Settings, ChevronDown, CheckCircle2, AlertCircle, Database, Server, Globe, Key, Box } from 'lucide-react';
import { getApiKey, setApiKey, getBaseUrl, setBaseUrl, getModel, setModel, chatCompletion } from '../services/llm';
import { saveUserSettings } from '../services/storage';
import { getS3Config, saveS3Config } from '../services/s3';

export default function SettingsModal({ isOpen, onClose, user }) {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState('llm'); // 'llm' or 'storage'

    // --- LLM State ---
    const PROVIDERS = [
        { id: 'custom', name: 'Custom (自定义)', baseUrl: '', models: '' },
        { id: 'gmicloud', name: 'GMI Cloud (Inference)', baseUrl: 'https://api.gmi-serving.com/v1', models: 'google/gemini-3-flash-preview, google/gemini-1.5-pro, google/gemini-1.5-flash' },
        { id: 'siliconflow', name: 'SiliconFlow (硅基流动)', baseUrl: 'https://api.siliconflow.cn/v1', models: 'deepseek-ai/DeepSeek-V2.5, deepseek-ai/DeepSeek-V3, deepseek-ai/DeepSeek-R1-Distill-Qwen-32B' },
        { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', models: 'deepseek-chat, deepseek-reasoner' },
        { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', models: 'gpt-4o, gpt-4o-mini, o1-preview, o1-mini' },
        { id: 'gemini', name: 'Google Gemini (Compatible)', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', models: 'gemini-2.0-flash-exp, gemini-1.5-pro, gemini-1.5-flash' },
        { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', models: 'auto, google/gemini-pro-1.5, deepseek/deepseek-chat' },
    ];

    const [providerId, setProviderId] = useState(() => {
        const currentUrl = getBaseUrl();
        const found = PROVIDERS.find(p => p.id !== 'custom' && p.baseUrl === currentUrl);
        return found ? found.id : 'custom';
    });

    const [url, setUrl] = useState(getBaseUrl());
    const [models, setModelsState] = useState(getModel());
    const [key, setKey] = useState(() => {
        const currentUrl = getBaseUrl();
        const found = PROVIDERS.find(p => p.id !== 'custom' && p.baseUrl === currentUrl);
        const pid = found ? found.id : 'custom';
        return localStorage.getItem(`mixboard_llm_key_${pid}`) || '';
    });

    const [testStatus, setTestStatus] = useState('idle');
    const [testMessage, setTestMessage] = useState('');

    // --- Storage State ---
    const [s3Config, setS3Config] = useState({
        enabled: false,
        endpoint: '',
        region: 'auto',
        bucket: '',
        accessKeyId: '',
        secretAccessKey: '',
        publicDomain: ''
    });

    useEffect(() => {
        const stored = getS3Config();
        if (stored) setS3Config(stored);
    }, []);

    // --- Handlers ---
    const handleProviderChange = (e) => {
        const pid = e.target.value;
        setProviderId(pid);
        const p = PROVIDERS.find(x => x.id === pid);
        if (p && p.id !== 'custom') {
            setUrl(p.baseUrl);
            if (p.models) setModelsState(p.models);
            const providerKey = localStorage.getItem(`mixboard_llm_key_${pid}`) || '';
            setKey(providerKey);
        }
    };

    const handleTestConnection = async () => {
        setTestStatus('testing');
        setTestMessage('');
        try {
            // Use the first model in the list for testing
            const testModel = models.split(',')[0].trim();
            await chatCompletion(
                [{ role: 'user', content: 'Hi' }],
                testModel,
                { apiKey: key, baseUrl: url }
            );
            setTestStatus('success');
            setTestMessage('Connection Successful!');
        } catch (error) {
            setTestStatus('error');
            setTestMessage(error.message || 'Connection Failed');
        }
    };

    const handleSave = async () => {
        // Save LLM Settings
        localStorage.setItem(`mixboard_llm_key_${providerId}`, key);
        setApiKey(key);
        setBaseUrl(url);
        setModel(models);

        // Update Global Model List
        const currentModels = JSON.parse(localStorage.getItem('mixboard_my_models') || '[]');
        // Remove existing for this provider and re-add from current state
        const otherProviderModels = currentModels.filter(m => m.providerId !== providerId);
        const newProviderModels = models.split(',').map(m => m.trim()).filter(m => m).map(m => ({
            name: m,
            value: m,
            providerId: providerId
        }));
        localStorage.setItem('mixboard_my_models', JSON.stringify([...otherProviderModels, ...newProviderModels]));

        // Save S3 Settings
        saveS3Config(s3Config);

        // Cloud Sync (User Settings)
        if (user) {
            const allKeys = {};
            PROVIDERS.forEach(p => {
                const k = localStorage.getItem(`mixboard_llm_key_${p.id}`);
                if (k) allKeys[p.id] = k;
            });

            await saveUserSettings(user.uid, {
                apiKeys: allKeys,
                baseUrl: url,
                model: models,
                s3Config: s3Config,
                updatedAt: Date.now()
            });
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center font-sans">
            <div className="bg-white dark:bg-slate-900 w-[600px] h-[600px] rounded-3xl shadow-2xl animate-fade-in border border-slate-100 dark:border-white/10 flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-2xl text-brand-600 dark:text-brand-400">
                            <Settings size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Settings</h2>
                            <p className="text-slate-500 text-sm">Configure app preferences</p>
                        </div>
                    </div>
                    {/* Tabs */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('llm')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'llm'
                                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            LLM Model
                        </button>
                        <button
                            onClick={() => setActiveTab('storage')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'storage'
                                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            Image Storage
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                    {/* LLM Tab */}
                    {activeTab === 'llm' && (
                        <div className="space-y-6 animate-slide-up">
                            {/* Provider Selector */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Provider</label>
                                <div className="relative">
                                    <select
                                        value={providerId}
                                        onChange={handleProviderChange}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl appearance-none focus:ring-2 focus:ring-brand-500 outline-none font-medium text-slate-700 dark:text-slate-200 transition-all hover:bg-slate-100 dark:hover:bg-slate-700"
                                    >
                                        {PROVIDERS.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <ChevronDown size={16} />
                                    </div>
                                </div>
                            </div>

                            {/* API Key */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">API Key</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Key size={16} />
                                    </div>
                                    <input
                                        type="password"
                                        value={key}
                                        onChange={e => setKey(e.target.value)}
                                        className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                                        placeholder="sk-..."
                                    />
                                </div>
                            </div>

                            {/* Advanced Settings */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Base URL</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                            <Globe size={14} />
                                        </div>
                                        <input
                                            type="text"
                                            value={url}
                                            onChange={e => setUrl(e.target.value)}
                                            className="w-full p-2 pl-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-mono text-slate-600 dark:text-slate-300 focus:border-brand-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Available Models (Comma separated)</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-3 text-slate-400">
                                            <Box size={14} />
                                        </div>
                                        <textarea
                                            value={models}
                                            onChange={e => setModelsState(e.target.value)}
                                            rows={2}
                                            className="w-full p-2 pl-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-mono text-slate-600 dark:text-slate-300 focus:border-brand-500 outline-none resize-none"
                                            placeholder="model-1, model-2..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Test Connection */}
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handleTestConnection}
                                    disabled={testStatus === 'testing' || !key}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                                >
                                    {testStatus === 'testing' ? 'Connecting...' : 'Test Connection'}
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
                        </div>
                    )}

                    {/* Storage Tab */}
                    {activeTab === 'storage' && (
                        <div className="space-y-6 animate-slide-up">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-xl text-sm border border-blue-100 dark:border-blue-900/30">
                                <p className="font-bold mb-1">BYOK (Bring Your Own Key)</p>
                                <p>Use your own S3 storage (AWS, Cloudflare R2, MinIO) to store images. This enables image sync across devices and saves local space.</p>
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
                                        onChange={e => setS3Config({ ...s3Config, enabled: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
                                </label>
                            </div>

                            {s3Config.enabled && (
                                <div className="space-y-4 animate-fade-in">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Endpoint URL</label>
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Server size={16} /></div>
                                            <input
                                                type="text"
                                                value={s3Config.endpoint}
                                                onChange={e => setS3Config({ ...s3Config, endpoint: e.target.value })}
                                                placeholder="https://<account>.r2.cloudflarestorage.com"
                                                className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                                            />
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">Required for R2/MinIO. Optional for standard AWS S3.</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Region</label>
                                            <input
                                                type="text"
                                                value={s3Config.region}
                                                onChange={e => setS3Config({ ...s3Config, region: e.target.value })}
                                                placeholder="auto / us-east-1"
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Bucket Name</label>
                                            <div className="relative">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Database size={16} /></div>
                                                <input
                                                    type="text"
                                                    value={s3Config.bucket}
                                                    onChange={e => setS3Config({ ...s3Config, bucket: e.target.value })}
                                                    placeholder="my-images"
                                                    className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Access Key ID</label>
                                            <input
                                                type="text"
                                                value={s3Config.accessKeyId}
                                                onChange={e => setS3Config({ ...s3Config, accessKeyId: e.target.value })}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Secret Access Key</label>
                                            <input
                                                type="password"
                                                value={s3Config.secretAccessKey}
                                                onChange={e => setS3Config({ ...s3Config, secretAccessKey: e.target.value })}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Public Domain (Optional)</label>
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Globe size={16} /></div>
                                            <input
                                                type="text"
                                                value={s3Config.publicDomain}
                                                onChange={e => setS3Config({ ...s3Config, publicDomain: e.target.value })}
                                                placeholder="https://images.mydomain.com"
                                                className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                                            />
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">If your bucket is behind a CDN or custom domain.</p>
                                    </div>

                                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg text-xs border border-yellow-100 dark:border-yellow-900/30 flex gap-2">
                                        <AlertCircle size={16} className="shrink-0" />
                                        <p>Make sure to configure CORS on your bucket to allow PUT/GET requests from this domain!</p>
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
