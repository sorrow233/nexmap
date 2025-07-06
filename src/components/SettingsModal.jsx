import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle2, AlertCircle, Database, Layers, Cpu } from 'lucide-react';
// import { chatCompletion } from '../services/llm'; // Converted to dynamic import
import { useStore } from '../store/useStore';
import { getS3Config, saveS3Config } from '../services/s3';
import { saveUserSettings } from '../services/storage';

import SettingsLLMTab from './settings/SettingsLLMTab';
import SettingsRolesTab from './settings/SettingsRolesTab';
import SettingsStorageTab from './settings/SettingsStorageTab';

export default function SettingsModal({ isOpen, onClose, user, onShowWelcome }) {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState('llm');

    // LLM State
    const [providers, setProviders] = useState({});
    const [activeId, setActiveId] = useState('google');

    // Testing State
    const [testStatus, setTestStatus] = useState('idle');
    const [testMessage, setTestMessage] = useState('');

    // UI State  
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

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

    // Load configuration on mount from Store
    useEffect(() => {
        const state = useStore.getState();
        // Ensure we copy the state to local component state so editing doesn't affect store until saved
        setProviders(JSON.parse(JSON.stringify(state.providers))); // Deep copy to be safe
        setActiveId(state.activeId);

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

    const handleAddProvider = () => {
        const newId = `custom-${Date.now()}`;
        setProviders(prev => ({
            ...prev,
            [newId]: {
                id: newId,
                name: 'New Provider',
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
        if (remainingIds.length === 0) return; // Prevent deleting last provider

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
            const currentConfig = providers[activeId];
            if (!currentConfig.apiKey) throw new Error("API Key is missing");

            // Updated signature: chatCompletion(messages, config, model, options)
            const { chatCompletion } = await import('../services/llm');
            await chatCompletion(
                [{ role: 'user', content: 'Hi, respond with OK only.' }],
                currentConfig,
                null,
                {}
            );
            setTestStatus('success');
            setTestMessage('Connection Successful!');
        } catch (error) {
            // console.error(error);
            setTestStatus('error');
            setTestMessage(error.message || 'Connection Failed');
        }
    };

    const handleSave = async () => {
        // Save LLM Config to Store
        useStore.getState().setFullConfig({
            providers,
            activeId
        });

        // Save S3 config
        saveS3Config(s3Config);

        // Sync to cloud if logged in
        if (user && user.uid) {
            try {
                await saveUserSettings(user.uid, {
                    providers,
                    activeId,
                    s3Config
                });
                // console.log("[Sync] User settings pushed to cloud");
            } catch (e) {
                // console.error("[Sync] Failed to push settings to cloud", e);
            }
        }

        setSaveSuccess(true);
        setTimeout(() => window.location.reload(), 1500);
    };

    const handleReset = () => {
        setShowResetConfirm(true);
    };

    const confirmReset = () => {
        localStorage.removeItem('mixboard_providers_v3');
        window.location.reload();
    };

    const currentProvider = providers[activeId] || {};

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center font-sans">
            <div className="bg-white dark:bg-slate-900 w-[650px] h-[700px] rounded-3xl shadow-2xl animate-fade-in border border-slate-100 dark:border-white/10 flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-2xl text-brand-600 dark:text-brand-400">
                            <Settings size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Settings</h2>
                            <p className="text-slate-500 text-sm">Configure AI Provider & Storage</p>
                        </div>
                    </div>
                    {/* Tabs */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
                        <button
                            onClick={() => setActiveTab('llm')}
                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'llm'
                                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <Cpu size={14} /> Provider
                        </button>
                        <button
                            onClick={() => setActiveTab('roles')}
                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'roles'
                                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <Layers size={14} /> Roles
                        </button>
                        <button
                            onClick={() => setActiveTab('storage')}
                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'storage'
                                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <Database size={14} /> Storage
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                    {/* LLM Tab */}
                    {activeTab === 'llm' && (
                        <SettingsLLMTab
                            providers={providers}
                            activeId={activeId}
                            setActiveId={setActiveId}
                            currentProvider={currentProvider}
                            handleUpdateProvider={handleUpdateProvider}
                            handleAddProvider={handleAddProvider}
                            handleRemoveProvider={handleRemoveProvider}
                            handleTestConnection={handleTestConnection}
                            testStatus={testStatus}
                            testMessage={testMessage}
                            handleReset={handleReset}
                        />
                    )}

                    {/* Model Roles Tab */}
                    {activeTab === 'roles' && (
                        <SettingsRolesTab
                            currentProvider={currentProvider}
                            handleUpdateProvider={handleUpdateProvider}
                        />
                    )}

                    {/* Storage Tab */}
                    {activeTab === 'storage' && (
                        <SettingsStorageTab
                            s3Config={s3Config}
                            setS3ConfigState={setS3ConfigState}
                            onShowWelcome={onShowWelcome}
                        />
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

                {/* Success Toast */}
                {saveSuccess && (
                    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] animate-slide-down">
                        <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
                            <CheckCircle2 size={24} />
                            <div>
                                <p className="font-bold">Settings Saved!</p>
                                <p className="text-sm text-emerald-100">Reloading in a moment...</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reset Confirmation Dialog */}
                {showResetConfirm && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 max-w-md animate-scale-in border border-slate-200 dark:border-white/10">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400">
                                    <AlertCircle size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">Reset to Defaults?</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">This will clear all your LLM settings. This action cannot be undone.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmReset}
                                    className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition-all shadow-lg"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
