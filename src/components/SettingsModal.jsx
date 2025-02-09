import React, { useState, useEffect } from 'react';
import { Settings, ChevronDown, CheckCircle2, AlertCircle, Database, Server, Globe, Key, Box, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { getApiConfig, setApiConfig, clearApiConfig, chatCompletion } from '../services/llm';
import { getS3Config, saveS3Config } from '../services/s3';

export default function SettingsModal({ isOpen, onClose, user }) {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState('llm');
    const [apiKey, setApiKey] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [model, setModel] = useState('');
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
        const config = getApiConfig();
        setApiKey(config.apiKey);
        setBaseUrl(config.baseUrl);
        setModel(config.model);

        const s3 = getS3Config();
        if (s3) setS3ConfigState(s3);
    }, [isOpen]);

    const handleTestConnection = async () => {
        setTestStatus('testing');
        setTestMessage('');
        try {
            await chatCompletion(
                [{ role: 'user', content: 'Hi, respond with OK only.' }],
                model,
                { overrideConfig: { apiKey, baseUrl, model } }
            );
            setTestStatus('success');
            setTestMessage('Connection Successful!');
        } catch (error) {
            setTestStatus('error');
            setTestMessage(error.message || 'Connection Failed');
        }
    };

    const handleSave = () => {
        // Save API config
        setApiConfig({
            apiKey,
            baseUrl,
            model
        });

        // Save S3 config
        saveS3Config(s3Config);

        alert('Settings saved! Reloading page to apply changes...');
        window.location.reload();
    };

    const handleClearAndReset = () => {
        if (confirm('This will clear all API configuration and reload the page. Continue?')) {
            clearApiConfig();
            window.location.reload();
        }
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
                            <p className="text-slate-500 text-sm">Simple & reliable configuration</p>
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
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-xl text-sm border border-blue-100 dark:border-blue-900/30">
                                <p className="font-bold mb-1">Simplified Configuration</p>
                                <p>Enter your API credentials below. Changes apply immediately after saving.</p>
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
                                        value={apiKey}
                                        onChange={e => setApiKey(e.target.value)}
                                        className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                                        placeholder="AIzaSy... or sk-..."
                                    />
                                </div>
                            </div>

                            {/* Base URL */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Base URL</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Globe size={16} />
                                    </div>
                                    <input
                                        type="text"
                                        value={baseUrl}
                                        onChange={e => setBaseUrl(e.target.value)}
                                        className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                                        placeholder="https://generativelanguage.googleapis.com/v1beta"
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-1 ml-1">
                                    Google: generativelanguage.googleapis.com/v1beta | GMI Cloud: api.gmi-serving.com/v1
                                </p>
                            </div>

                            {/* Model Name */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Model Name</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Box size={16} />
                                    </div>
                                    <input
                                        type="text"
                                        value={model}
                                        onChange={e => setModel(e.target.value)}
                                        className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                                        placeholder="gemini-2.0-flash-exp"
                                    />
                                </div>
                            </div>

                            {/* Test Connection */}
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handleTestConnection}
                                    disabled={testStatus === 'testing' || !apiKey}
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

                            {/* Clear Configuration */}
                            <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                                <button
                                    onClick={handleClearAndReset}
                                    className="flex items-center gap-2 text-red-500 hover:text-red-600 text-sm font-bold transition-all"
                                >
                                    <RefreshCw size={14} />
                                    Clear & Reset All Configuration
                                </button>
                                <p className="text-xs text-slate-400 mt-1 ml-6">Use this if settings aren't applying properly</p>
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
                                        onChange={e => setS3ConfigState({ ...s3Config, enabled: e.target.checked })}
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
                                                onChange={e => setS3ConfigState({ ...s3Config, endpoint: e.target.value })}
                                                placeholder="https://<account>.r2.cloudflarestorage.com"
                                                className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Region</label>
                                            <input
                                                type="text"
                                                value={s3Config.region}
                                                onChange={e => setS3ConfigState({ ...s3Config, region: e.target.value })}
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
                                                    onChange={e => setS3ConfigState({ ...s3Config, bucket: e.target.value })}
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

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Public Domain (Optional)</label>
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Globe size={16} /></div>
                                            <input
                                                type="text"
                                                value={s3Config.publicDomain}
                                                onChange={e => setS3ConfigState({ ...s3Config, publicDomain: e.target.value })}
                                                placeholder="https://images.mydomain.com"
                                                className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                                            />
                                        </div>
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
            </div >
        </div >
    );
}
