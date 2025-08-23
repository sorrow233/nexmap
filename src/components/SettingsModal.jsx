import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle2, AlertCircle, Database, Layers, Cpu, Gift } from 'lucide-react';
// import { chatCompletion } from '../services/llm'; // Converted to dynamic import
import { useStore } from '../store/useStore';
import { getS3Config, saveS3Config } from '../services/s3';
import { saveUserSettings } from '../services/storage';

import SettingsCreditsTab from './settings/SettingsCreditsTab';
import SettingsLLMTab from './settings/SettingsLLMTab';
import SettingsRolesTab from './settings/SettingsRolesTab';
import SettingsStorageTab from './settings/SettingsStorageTab';

export default function SettingsModal({ isOpen, onClose, user, onShowWelcome }) {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState('credits');
    const [showAdvanced, setShowAdvanced] = useState(false);

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
        setProviders(JSON.parse(JSON.stringify(state.providers)));
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
            const currentConfig = providers[activeId];
            if (!currentConfig.apiKey) throw new Error("API Key is missing");

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
            setTestStatus('error');
            setTestMessage(error.message || 'Connection Failed');
        }
    };

    const handleSave = async () => {
        useStore.getState().setFullConfig({
            providers,
            activeId
        });

        saveS3Config(s3Config);

        if (user && user.uid) {
            try {
                await saveUserSettings(user.uid, {
                    providers,
                    activeId,
                    s3Config
                });
            } catch (e) {
                // console.error(e);
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

    const TabButton = ({ id, icon: Icon, label, description }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 group flex items-center gap-3 ${activeTab === id
                ? 'bg-brand-50 dark:bg-brand-900/20 shadow-sm border border-brand-200 dark:border-brand-500/30'
                : 'hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent'
                }`}
        >
            <div className={`p-2 rounded-lg transition-colors ${activeTab === id
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                }`}>
                <Icon size={18} />
            </div>
            <div>
                <div className={`text-sm font-bold ${activeTab === id
                    ? 'text-brand-900 dark:text-brand-100'
                    : 'text-slate-700 dark:text-slate-300'
                    }`}>{label}</div>
                {description && (
                    <div className="text-[10px] text-slate-400 font-medium">{description}</div>
                )}
            </div>
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center font-sans p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-[950px] h-[650px] rounded-3xl shadow-2xl flex overflow-hidden border border-slate-200 dark:border-white/10">

                {/* Sidebar */}
                <div className="w-[280px] bg-slate-50/50 dark:bg-slate-900/50 border-r border-slate-100 dark:border-white/5 p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-8 px-2">
                        <div className="p-2.5 bg-brand-600 rounded-xl text-white shadow-lg shadow-brand-500/30">
                            <Settings size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Settings</h2>
                            <p className="text-xs text-slate-500 font-medium">Configuration</p>
                        </div>
                    </div>

                    <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
                        <div className="space-y-1">
                            <div className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">General</div>
                            <TabButton id="credits" icon={Gift} label="Credits" description="Manage usage & limits" />
                        </div>

                        {/* Advanced Toggle */}
                        <div className="pt-2">
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors uppercase tracking-wider"
                            >
                                <span>Advanced Settings</span>
                                <Settings size={14} className={`transition-transform duration-300 ${showAdvanced ? 'rotate-90' : ''}`} />
                            </button>
                        </div>

                        {showAdvanced && (
                            <div className="animate-slide-down space-y-6 pl-2 border-l-2 border-slate-100 dark:border-white/5 ml-4">
                                <div className="space-y-1">
                                    <div className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">AI Configuration</div>
                                    <TabButton id="llm" icon={Cpu} label="Provider" description="Models & API Keys" />
                                    <TabButton id="roles" icon={Layers} label="Model Roles" description="Assign specialized models" />
                                </div>

                                <div className="space-y-1">
                                    <div className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Data & Storage</div>
                                    <TabButton id="storage" icon={Database} label="Storage" description="S3 & Cloud settings" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5 px-2">
                        <div className="text-[10px] text-slate-400 text-center font-mono">
                            v0.0.35-sidebar-ui
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 relative">
                    {/* Content Header */}
                    <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 sticky top-0">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                            {activeTab === 'credits' && 'Credits & Usage'}
                            {activeTab === 'llm' && 'Model Provider'}
                            {activeTab === 'roles' && 'Model Roles'}
                            {activeTab === 'storage' && 'Storage Settings'}
                        </h2>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-500 shadow-lg shadow-brand-500/30 transition-all hover:scale-105 active:scale-95 text-sm"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="max-w-3xl mx-auto animate-fade-in-up">
                            {activeTab === 'credits' && (
                                <SettingsCreditsTab onOpenAdvanced={() => {
                                    setShowAdvanced(true);
                                    setActiveTab('llm'); // Or stay on credits? User likely wants to config. Let's go to LLM.
                                }} />
                            )}

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

                            {activeTab === 'roles' && (
                                <SettingsRolesTab
                                    currentProvider={currentProvider}
                                    handleUpdateProvider={handleUpdateProvider}
                                />
                            )}

                            {activeTab === 'storage' && (
                                <SettingsStorageTab
                                    s3Config={s3Config}
                                    setS3ConfigState={setS3ConfigState}
                                    onShowWelcome={onShowWelcome}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Dialogs & Toasts */}
                {saveSuccess && (
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[200] animate-slide-down">
                        <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md bg-opacity-95">
                            <CheckCircle2 size={24} />
                            <div>
                                <p className="font-bold">Settings Saved!</p>
                                <p className="text-sm text-emerald-100">Applying changes...</p>
                            </div>
                        </div>
                    </div>
                )}

                {showResetConfirm && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 max-w-sm animate-scale-in border border-slate-200 dark:border-white/10">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-4">
                                <AlertCircle size={32} />
                            </div>
                            <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-2 text-center">Reset Configuration?</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6 leading-relaxed">
                                This will remove all custom providers and API keys. The app will return to its default state.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="flex-1 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmReset}
                                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition-all shadow-lg shadow-red-500/20"
                                >
                                    Yes, Reset
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
