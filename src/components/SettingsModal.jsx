import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle2, AlertCircle, Database, Layers, Cpu, Gift, Globe, FileText, Loader2, Cloud, CloudOff, Link2 } from 'lucide-react';
// import { chatCompletion } from '../services/llm'; // Converted to dynamic import
import { useStore } from '../store/useStore';
import { getS3Config, saveS3Config } from '../services/s3';
import { updateUserSettings, loadUserSettings } from '../services/syncService';
import { linkageService } from '../services/linkageService';
import {
    CUSTOM_INSTRUCTIONS_KEY,
    normalizeCustomInstructionsValue
} from '../services/customInstructionsService';

// --- Timestamp-aware localStorage utilities for smart sync ---
const loadWithTimestamp = (key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return { value: null, lastModified: 0 };
    try {
        const parsed = JSON.parse(raw);
        // New format: { value, lastModified }
        if (parsed && typeof parsed === 'object' && parsed.value !== undefined) {
            return { value: parsed.value, lastModified: parsed.lastModified || 0 };
        }
        // Old format was just a string, JSON.parse would fail or return non-object
        return { value: raw, lastModified: 0 };
    } catch {
        // Old format: plain string
        return { value: raw, lastModified: 0 };
    }
};

const saveWithTimestamp = (key, value) => {
    localStorage.setItem(key, JSON.stringify({
        value,
        lastModified: Date.now()
    }));
};

const normalizeUpdatedAt = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (value && typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value === 'string') {
        const asNum = Number(value);
        if (Number.isFinite(asNum)) return asNum;
        const asDate = Date.parse(value);
        if (Number.isFinite(asDate)) return asDate;
    }
    return 0;
};

import SettingsCreditsTab from './settings/SettingsCreditsTab';
import SettingsLLMTab from './settings/SettingsLLMTab';
import SettingsRolesTab from './settings/SettingsRolesTab';
import SettingsStorageTab from './settings/SettingsStorageTab';
import SettingsGeneralTab from './settings/SettingsGeneralTab';
import SettingsInstructionsTab from './settings/SettingsInstructionsTab';
import SettingsLinkageTab from './settings/SettingsLinkageTab';
import { useLanguage } from '../contexts/LanguageContext';

const FLOWSTUDIO_USER_ID_KEY = 'flowstudio_user_id';
const FLOWSTUDIO_USER_ID_KEY_PREFIX = 'flowstudio_user_id:';

const persistFlowStudioUidLocal = (flowUid, appUid) => {
    const normalized = flowUid?.trim?.() || '';
    const scopedKey = appUid ? `${FLOWSTUDIO_USER_ID_KEY_PREFIX}${appUid}` : null;

    if (normalized) {
        localStorage.setItem(FLOWSTUDIO_USER_ID_KEY, normalized);
        if (scopedKey) localStorage.setItem(scopedKey, normalized);
        return;
    }

    localStorage.removeItem(FLOWSTUDIO_USER_ID_KEY);
    if (scopedKey) localStorage.removeItem(scopedKey);
};

export default function SettingsModal({ isOpen, onClose, user }) {
    if (!isOpen) return null;

    const { t } = useLanguage();
    const offlineMode = useStore(state => state.offlineMode);
    const setOfflineMode = useStore(state => state.setOfflineMode);

    const [activeTab, setActiveTab] = useState('credits');

    // LLM State
    const [providers, setProviders] = useState({});
    const [activeId, setActiveId] = useState('google');

    // Testing State
    const [testStatus, setTestStatus] = useState('idle');
    const [testMessage, setTestMessage] = useState('');

    // UI State  
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState({
        type: 'idle', // idle | saving | success | warning | error
        title: '',
        message: '',
        code: ''
    });
    const [pendingCloudPayload, setPendingCloudPayload] = useState(null);

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

    // Custom Instructions State
    const [customInstructions, setCustomInstructions] = useState(
        normalizeCustomInstructionsValue(null)
    );
    const [flowStudioUserId, setFlowStudioUserId] = useState('');

    // Load configuration on mount from Store
    useEffect(() => {
        const state = useStore.getState();
        setProviders(JSON.parse(JSON.stringify(state.providers)));
        setActiveId(state.activeId);

        const s3 = getS3Config();
        if (s3) setS3ConfigState(s3);

        // Load custom instructions (with timestamp support)
        const { value: savedInstructions } = loadWithTimestamp(CUSTOM_INSTRUCTIONS_KEY);
        setCustomInstructions(normalizeCustomInstructionsValue(savedInstructions));
        setFlowStudioUserId(linkageService.getFlowStudioUserId() || '');

        setIsSaving(false);
        setSaveStatus({ type: 'idle', title: '', message: '', code: '' });
        setPendingCloudPayload(null);
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
        const newId = `custom - ${Date.now()} `;
        setProviders(prev => ({
            ...prev,
            [newId]: {
                id: newId,
                name: t.settings.newProvider,
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

            // Use the user's configured model for testing:
            // Priority: roles.chat > model > default
            const testModel = currentConfig.roles?.chat || currentConfig.model || null;

            const { chatCompletion } = await import('../services/llm');
            await chatCompletion(
                [{ role: 'user', content: 'Hi, respond with OK only.' }],
                currentConfig,
                testModel,
                {}
            );
            setTestStatus('success');
            setTestMessage(`${t.settings.connectionSuccess}(${testModel || 'default model'})`);
        } catch (error) {
            setTestStatus('error');
            setTestMessage(error.message || t.settings.connectionFailed);
        }
    };

    const buildCloudPayload = (now) => ({
        providers,
        activeId,
        globalRoles: useStore.getState().globalRoles,
        s3Config,
        customInstructions: normalizeCustomInstructionsValue(customInstructions),
        flowStudioUserId: flowStudioUserId?.trim?.() || '',
        lastUpdated: now,
        customInstructionsModified: true // Signal to add serverTimestamp
    });

    const saveLocalState = (now) => {
        useStore.getState().setFullConfig({
            providers,
            activeId,
            globalRoles: useStore.getState().globalRoles,
            lastUpdated: now
        });
        saveS3Config(s3Config);
        saveWithTimestamp(CUSTOM_INSTRUCTIONS_KEY, normalizeCustomInstructionsValue(customInstructions));
        persistFlowStudioUidLocal(flowStudioUserId, user?.uid);
    };

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        setSaveStatus({
            type: 'saving',
            title: 'Saving Settings',
            message: 'Applying local changes and syncing to cloud...',
            code: ''
        });

        try {
            const now = Date.now();
            const payload = buildCloudPayload(now);

            saveLocalState(now);

            if (user?.uid) {
                const cloudSaveResult = await updateUserSettings(user.uid, payload);
                if (!cloudSaveResult?.ok) {
                    setPendingCloudPayload(payload);
                    if (cloudSaveResult?.reason === 'offline_mode') {
                        setSaveStatus({
                            type: 'warning',
                            title: 'Saved Locally',
                            message: 'Cloud sync is disabled (offline mode). Disable offline mode, then click Retry Cloud Sync.',
                            code: 'offline_mode'
                        });
                        return;
                    }
                    setSaveStatus({
                        type: 'error',
                        title: 'Saved Locally, Cloud Sync Failed',
                        message: 'Your local settings are kept. Click Retry Cloud Sync to push to this account.',
                        code: 'cloud_sync_failed'
                    });
                    return;
                }
            }

            setPendingCloudPayload(null);
            setSaveStatus({
                type: 'success',
                title: user?.uid ? 'Saved and Synced' : 'Saved Locally',
                message: user?.uid ? 'Settings are now available on your other devices.' : 'Log in to sync these settings across devices.',
                code: ''
            });
        } catch (error) {
            console.error("Failed to save settings:", error);
            setPendingCloudPayload(prev => prev || buildCloudPayload(Date.now()));
            setSaveStatus({
                type: 'error',
                title: 'Saved Locally, Cloud Sync Failed',
                message: error?.message || 'Please retry cloud sync.',
                code: 'cloud_sync_failed'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRetryCloudSync = async () => {
        if (!user?.uid || !pendingCloudPayload || isSaving) return;
        setIsSaving(true);
        setSaveStatus({
            type: 'saving',
            title: 'Retrying Cloud Sync',
            message: 'Uploading your latest settings...',
            code: ''
        });
        try {
            const cloudSaveResult = await updateUserSettings(user.uid, pendingCloudPayload);
            if (!cloudSaveResult?.ok) {
                if (cloudSaveResult?.reason === 'offline_mode') {
                    setSaveStatus({
                        type: 'warning',
                        title: 'Cloud Sync Still Disabled',
                        message: 'Offline mode is still enabled. Disable it and retry.',
                        code: 'offline_mode'
                    });
                    return;
                }
                setSaveStatus({
                    type: 'error',
                    title: 'Cloud Sync Failed Again',
                    message: 'Please check network/auth and retry.',
                    code: 'cloud_sync_failed'
                });
                return;
            }

            setPendingCloudPayload(null);
            setSaveStatus({
                type: 'success',
                title: 'Cloud Sync Complete',
                message: 'Your settings are now synced to this account.',
                code: ''
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePullFromCloud = async () => {
        if (isSaving) return;
        if (!user?.uid) {
            setSaveStatus({
                type: 'warning',
                title: 'Login Required',
                message: 'Please log in first to pull settings from cloud.',
                code: 'no_user'
            });
            return;
        }

        setIsSaving(true);
        setSaveStatus({
            type: 'saving',
            title: 'Pulling Cloud Settings',
            message: 'Fetching latest settings from this account...',
            code: ''
        });

        try {
            const settings = await loadUserSettings(user.uid);
            if (!settings?.providers) {
                setSaveStatus({
                    type: 'warning',
                    title: 'No Cloud Settings Found',
                    message: 'This account has no provider settings in cloud yet.',
                    code: 'no_cloud_settings'
                });
                return;
            }

            const localState = useStore.getState();
            const cloudUpdated = normalizeUpdatedAt(settings.lastUpdated);
            const nextConfig = {
                providers: settings.providers,
                activeId: settings.activeId || 'google',
                globalRoles: settings.globalRoles || localState.globalRoles,
                lastUpdated: cloudUpdated || Date.now()
            };
            useStore.getState().setFullConfig(nextConfig);
            setProviders(JSON.parse(JSON.stringify(nextConfig.providers)));
            setActiveId(nextConfig.activeId);

            if (settings.s3Config) {
                saveS3Config(settings.s3Config);
                setS3ConfigState(settings.s3Config);
            }

            if (settings.customInstructions !== undefined) {
                const normalizedCloudInstructions = normalizeCustomInstructionsValue(settings.customInstructions);
                saveWithTimestamp(CUSTOM_INSTRUCTIONS_KEY, normalizedCloudInstructions);
                setCustomInstructions(normalizedCloudInstructions);
            }

            if (typeof settings.flowStudioUserId === 'string') {
                setFlowStudioUserId(settings.flowStudioUserId);
                persistFlowStudioUidLocal(settings.flowStudioUserId, user?.uid);
            }

            setPendingCloudPayload(null);
            setSaveStatus({
                type: 'success',
                title: 'Pulled from Cloud',
                message: 'Cloud settings have been applied to this device.',
                code: ''
            });
        } catch (e) {
            setSaveStatus({
                type: 'error',
                title: 'Pull Failed',
                message: e?.message || 'Failed to pull settings from cloud.',
                code: 'pull_failed'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setShowResetConfirm(true);
    };

    const confirmReset = () => {
        localStorage.removeItem('mixboard_providers_v3');
        window.location.reload();
    };

    const currentProvider = providers[activeId] || {};

    const primaryTabs = [
        { id: 'credits', icon: Gift, label: t.settings.credits, description: t.settings.creditsDesc },
        { id: 'language', icon: Globe, label: t.settings.language, description: t.settings.languageChoose || t.settings.language },
        { id: 'instructions', icon: FileText, label: t.settings?.customInstructions || 'Custom Instructions', description: t.settings?.customInstructionsDesc || 'Global AI behavior' },
        { id: 'linkage', icon: Link2, label: 'FlowStudio 绑定', description: '管理跨应用同步 UID' }
    ];

    const aiTabs = [
        { id: 'llm', icon: Cpu, label: t.settings.provider, description: t.settings.providerDesc },
        { id: 'roles', icon: Layers, label: t.settings.modelRoles, description: t.settings.modelRolesDesc },
        { id: 'storage', icon: Database, label: t.settings.storage, description: t.settings.storageDesc }
    ];

    const mobileTabs = [...primaryTabs, ...aiTabs];

    const activeTabMetaMap = {
        credits: {
            title: t.settings.creditsUsage,
            subtitle: '配额、兑换码和购买入口'
        },
        language: {
            title: t.settings.language,
            subtitle: '界面显示语言与同步偏好'
        },
        instructions: {
            title: t.settings?.customInstructions || 'Custom Instructions',
            subtitle: '定义全局 AI 回复行为'
        },
        linkage: {
            title: 'FlowStudio 绑定',
            subtitle: '查看、修改或清除 FlowStudio Firebase UID'
        },
        llm: {
            title: t.settings.modelProvider,
            subtitle: '模型供应商与连接配置'
        },
        roles: {
            title: t.settings.modelRoles,
            subtitle: '按功能分配模型职责'
        },
        storage: {
            title: t.settings.storageSettings,
            subtitle: '存储、备份与恢复设置'
        }
    };

    const activeMeta = activeTabMetaMap[activeTab] || activeTabMetaMap.credits;

    const TabButton = ({ id, icon: Icon, label, description, compact = false }) => {
        const isActive = activeTab === id;
        if (compact) {
            return (
                <button
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${isActive
                        ? 'border-cyan-400/50 bg-cyan-400/20 text-cyan-100'
                        : 'border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/20 hover:text-white'
                        }`}
                >
                    <Icon size={14} />
                    {label}
                </button>
            );
        }

        return (
            <button
                onClick={() => setActiveTab(id)}
                className={`group w-full rounded-2xl border px-3 py-3 text-left transition-all ${isActive
                    ? 'border-cyan-400/40 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(56,189,248,0.2)]'
                    : 'border-white/10 bg-slate-900/30 hover:border-white/20 hover:bg-slate-800/60'
                    }`}
            >
                <div className="flex items-center gap-3">
                    <div className={`rounded-xl p-2 transition-colors ${isActive
                        ? 'bg-cyan-500/20 text-cyan-200'
                        : 'bg-white/5 text-slate-400 group-hover:text-slate-200'
                        }`}>
                        <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                        <div className={`truncate text-sm font-bold ${isActive ? 'text-cyan-100' : 'text-slate-200'}`}>{label}</div>
                        <div className="truncate text-[11px] text-slate-400">{description}</div>
                    </div>
                </div>
            </button>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-stretch justify-center bg-slate-950/70 p-2 backdrop-blur-md sm:p-6">
            <div className="relative h-full w-full max-w-[1280px] overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 shadow-[0_35px_120px_rgba(2,6,23,0.65)]">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
                    <div className="absolute -bottom-24 left-8 h-80 w-80 rounded-full bg-blue-700/20 blur-3xl" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(56,189,248,0.1),transparent_34%),radial-gradient(circle_at_85%_88%,rgba(14,116,144,0.16),transparent_33%)]" />
                </div>

                <div className="relative flex h-full flex-col md:flex-row">
                    <aside className="hidden w-[300px] shrink-0 border-r border-white/10 bg-slate-900/65 backdrop-blur-xl md:flex">
                        <div className="flex h-full w-full flex-col p-6">
                            <div className="mb-6 flex items-center gap-3">
                                <div className="rounded-2xl bg-cyan-500/20 p-2.5 text-cyan-200 shadow-[0_0_32px_rgba(14,165,233,0.35)]">
                                    <Settings size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black tracking-tight text-white">{t.settings.title}</h2>
                                    <p className="text-xs font-medium text-slate-400">{t.settings.configuration}</p>
                                </div>
                            </div>

                            <div className="flex-1 space-y-5 overflow-y-auto pr-1 custom-scrollbar">
                                <div className="space-y-2">
                                    <p className="px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">基础</p>
                                    {primaryTabs.map(tab => (
                                        <TabButton key={tab.id} id={tab.id} icon={tab.icon} label={tab.label} description={tab.description} />
                                    ))}
                                </div>

                                <div className="space-y-2">
                                    <p className="px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">AI 配置</p>
                                    {aiTabs.map(tab => (
                                        <TabButton key={tab.id} id={tab.id} icon={tab.icon} label={tab.label} description={tab.description} />
                                    ))}
                                </div>
                            </div>

                            <div className="mt-5 border-t border-white/10 pt-4">
                                <p className="text-center font-mono text-[11px] text-slate-500">v2.2.130</p>
                            </div>
                        </div>
                    </aside>

                    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-950/70">
                        <div className="border-b border-white/10 bg-slate-900/45 px-4 py-3 backdrop-blur-xl sm:px-8 sm:py-5">
                            <div className="mb-3 flex gap-2 overflow-x-auto md:hidden custom-scrollbar">
                                {mobileTabs.map(tab => (
                                    <TabButton key={tab.id} id={tab.id} icon={tab.icon} label={tab.label} compact />
                                ))}
                            </div>

                            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-300/80">
                                        {t.settings.title}
                                    </p>
                                    <h2 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                                        {activeMeta.title}
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-300">
                                        {activeMeta.subtitle}
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={onClose}
                                        disabled={isSaving}
                                        className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-300 transition-all hover:bg-slate-800 disabled:opacity-60"
                                    >
                                        {t.settings.cancel}
                                    </button>
                                    {user?.uid && (
                                        <button
                                            onClick={handlePullFromCloud}
                                            disabled={isSaving}
                                            className="rounded-xl border border-cyan-300/25 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-100 transition-all hover:bg-cyan-400/20 disabled:opacity-60"
                                        >
                                            Pull Cloud
                                        </button>
                                    )}
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-slate-950 shadow-[0_8px_30px_rgba(6,182,212,0.35)] transition-all hover:bg-cyan-400 disabled:opacity-60"
                                    >
                                        <span className="flex items-center gap-2">
                                            {isSaving && <Loader2 size={14} className="animate-spin" />}
                                            {isSaving ? 'Saving...' : t.settings.saveChanges}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {saveStatus.type !== 'idle' && (
                            <div className="px-4 pt-4 sm:px-8">
                                <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 ${saveStatus.type === 'success'
                                    ? 'border-emerald-400/30 bg-emerald-400/10'
                                    : saveStatus.type === 'warning'
                                        ? 'border-amber-300/30 bg-amber-300/10'
                                        : saveStatus.type === 'error'
                                            ? 'border-rose-400/30 bg-rose-400/10'
                                            : 'border-white/15 bg-slate-900/70'
                                    }`}>
                                    <div className="flex min-w-0 items-center gap-2">
                                        {saveStatus.type === 'saving' && <Loader2 size={16} className="animate-spin text-slate-200" />}
                                        {saveStatus.type === 'success' && <CheckCircle2 size={16} className="text-emerald-300" />}
                                        {saveStatus.type === 'warning' && <CloudOff size={16} className="text-amber-300" />}
                                        {saveStatus.type === 'error' && <AlertCircle size={16} className="text-rose-300" />}
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-white">{saveStatus.title}</p>
                                            <p className="truncate text-xs text-slate-300">{saveStatus.message}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {saveStatus.code === 'offline_mode' && offlineMode && (
                                            <button
                                                onClick={() => {
                                                    setOfflineMode(false);
                                                    setSaveStatus({
                                                        type: 'warning',
                                                        title: 'Offline Mode Disabled',
                                                        message: 'Cloud sync is enabled again. Click Retry Cloud Sync.',
                                                        code: 'offline_mode_disabled'
                                                    });
                                                }}
                                                disabled={isSaving}
                                                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400 disabled:opacity-60"
                                            >
                                                Disable Offline
                                            </button>
                                        )}
                                        {user?.uid && pendingCloudPayload && saveStatus.type !== 'saving' && (
                                            <button
                                                onClick={handleRetryCloudSync}
                                                disabled={isSaving}
                                                className="flex items-center gap-1 rounded-lg border border-white/15 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-100 transition-all hover:bg-slate-800 disabled:opacity-60"
                                            >
                                                <Cloud size={12} />
                                                Retry Cloud Sync
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                            <div className={`mx-auto ${activeTab === 'llm' ? 'max-w-[1100px]' : 'max-w-4xl'}`}>
                                {activeTab === 'credits' && (
                                    <SettingsCreditsTab onOpenAdvanced={() => {
                                        setActiveTab('llm');
                                    }} />
                                )}

                                {activeTab === 'language' && <SettingsGeneralTab />}

                                {activeTab === 'instructions' && (
                                    <SettingsInstructionsTab
                                        customInstructions={customInstructions}
                                        setCustomInstructions={setCustomInstructions}
                                    />
                                )}

                                {activeTab === 'linkage' && (
                                    <SettingsLinkageTab
                                        flowStudioUserId={flowStudioUserId}
                                        setFlowStudioUserId={setFlowStudioUserId}
                                        appUserUid={user?.uid}
                                    />
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
                                    />
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                {showResetConfirm && (
                    <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-sm rounded-3xl border border-rose-400/20 bg-slate-950 p-7 shadow-2xl">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">
                                <AlertCircle size={32} />
                            </div>
                            <h3 className="mb-2 text-center text-xl font-black text-white">{t.settings.resetConfiguration}</h3>
                            <p className="mb-6 text-center text-sm leading-relaxed text-slate-300">
                                {t.settings.resetWarning}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="flex-1 rounded-xl border border-white/10 py-2.5 font-bold text-slate-200 transition-all hover:bg-white/5"
                                >
                                    {t.settings.cancel}
                                </button>
                                <button
                                    onClick={confirmReset}
                                    className="flex-1 rounded-xl bg-rose-500 py-2.5 font-bold text-white transition-all hover:bg-rose-400"
                                >
                                    {t.settings.yesReset}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
