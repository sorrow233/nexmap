import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Cpu, Loader2, Settings, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getS3Config, saveS3Config } from '../services/s3';
import {
    CUSTOM_INSTRUCTIONS_KEY,
    normalizeCustomInstructionsValue
} from '../services/customInstructionsService';
import {
    createEmptyLinkageSettings,
} from '../services/linkageTargets';
import {
    getLocalLinkageSettings,
    persistLinkageSettingsLocal
} from '../services/linkageLocalStore';
import { getEditableItems } from './settings/instructions/helpers';
import SettingsBasicSection from './settings/SettingsBasicSection';
import SettingsAISection from './settings/SettingsAISection';
import SettingsAdvancedSection from './settings/SettingsAdvancedSection';
import { cloneGlobalRoles, getSuggestedRoleModel } from './settings/modelRoleUtils';
import { useLanguage } from '../contexts/LanguageContext';
import packageJson from '../../package.json';

const loadWithTimestamp = (key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return { value: null, lastModified: 0 };
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.value !== undefined) {
            return { value: parsed.value, lastModified: parsed.lastModified || 0 };
        }
        return { value: raw, lastModified: 0 };
    } catch {
        return { value: raw, lastModified: 0 };
    }
};

const saveWithTimestamp = (key, value) => {
    localStorage.setItem(key, JSON.stringify({
        value,
        lastModified: Date.now()
    }));
};

export default function SettingsModal({ isOpen, onClose, user }) {
    const { t } = useLanguage();

    const [activeTab, setActiveTab] = useState('basic');
    const [providers, setProviders] = useState({});
    const [activeId, setActiveId] = useState('google');
    const [globalRoles, setGlobalRoles] = useState(cloneGlobalRoles());
    const [testStatus, setTestStatus] = useState('idle');
    const [testMessage, setTestMessage] = useState('');
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState({
        type: 'idle',
        title: '',
        message: '',
        code: ''
    });
    const [requestedAdvancedPanel, setRequestedAdvancedPanel] = useState(null);

    const [s3Config, setS3ConfigState] = useState({
        enabled: false,
        endpoint: '',
        region: 'auto',
        bucket: '',
        accessKeyId: '',
        secretAccessKey: '',
        publicDomain: ''
    });

    const [customInstructions, setCustomInstructions] = useState(
        normalizeCustomInstructionsValue(null)
    );
    const [linkageSettings, setLinkageSettings] = useState(createEmptyLinkageSettings());

    useEffect(() => {
        const state = useStore.getState();
        setProviders(JSON.parse(JSON.stringify(state.providers)));
        setActiveId(state.activeId);
        setGlobalRoles(cloneGlobalRoles(state.globalRoles));

        const s3 = getS3Config();
        if (s3) setS3ConfigState(s3);

        const { value: savedInstructions } = loadWithTimestamp(CUSTOM_INSTRUCTIONS_KEY);
        setCustomInstructions(normalizeCustomInstructionsValue(savedInstructions));
        setLinkageSettings(getLocalLinkageSettings(user?.uid));

        setTestStatus('idle');
        setTestMessage('');
        setIsSaving(false);
        setSaveStatus({ type: 'idle', title: '', message: '', code: '' });
        setRequestedAdvancedPanel(null);
        setActiveTab('basic');
    }, [isOpen, user?.uid]);

    const handleLinkageFieldChange = (field, value) => {
        setLinkageSettings(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const currentProvider = providers[activeId] || {};

    const extraInstructionCount = useMemo(() => {
        const items = getEditableItems(customInstructions);
        if (items.length === 0) return 0;
        const primaryInstruction = items.find(item => item.isGlobal) || items[0];
        return items.filter(item => item.id !== primaryInstruction?.id).length;
    }, [customInstructions]);

    const handleUpdateProvider = (field, value) => {
        setProviders(prev => ({
            ...prev,
            [activeId]: {
                ...prev[activeId],
                [field]: value
            }
        }));
    };

    const handleGlobalRoleChange = (role, providerId, model) => {
        setGlobalRoles(prev => ({
            ...prev,
            [role]: {
                providerId,
                model
            }
        }));

        if (role === 'chat' && providerId !== activeId) {
            setActiveId(providerId);
        }
    };

    const handleAddProvider = () => {
        const newId = `custom-${Date.now()}`;
        setProviders(prev => ({
            ...prev,
            [newId]: {
                id: newId,
                name: t.settings.newProvider || '新建提供商',
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

        const fallbackId = remainingIds[0];
        const fallbackProvider = providers[fallbackId];

        if (activeId === idToRemove) {
            setActiveId(fallbackId);
        }

        setProviders(prev => {
            const next = { ...prev };
            delete next[idToRemove];
            return next;
        });

        setGlobalRoles(prev => {
            const nextRoles = cloneGlobalRoles(prev);
            if (nextRoles.chat.providerId === idToRemove) {
                nextRoles.chat = {
                    providerId: fallbackId,
                    model: getSuggestedRoleModel(fallbackProvider, 'chat')
                };
            }
            if (nextRoles.image.providerId === idToRemove) {
                nextRoles.image = {
                    providerId: fallbackId,
                    model: getSuggestedRoleModel(fallbackProvider, 'image')
                };
            }
            return nextRoles;
        });
    };

    const handleTestConnection = async () => {
        setTestStatus('testing');
        setTestMessage('');
        try {
            const providerConfig = providers[activeId];
            if (!providerConfig?.apiKey) throw new Error('API Key is missing');

            const testModel = activeId === globalRoles.chat.providerId
                ? (globalRoles.chat.model || providerConfig.model || null)
                : (providerConfig.model || getSuggestedRoleModel(providerConfig, 'chat'));

            const { chatCompletion } = await import('../services/llm');
            await chatCompletion(
                [{ role: 'user', content: 'Hi, respond with OK only.' }],
                providerConfig,
                testModel,
                {}
            );
            setTestStatus('success');
            setTestMessage(`${t.settings.connectionSuccess} (${testModel || 'default model'})`);
        } catch (error) {
            setTestStatus('error');
            setTestMessage(error.message || t.settings.connectionFailed);
        }
    };

    if (!isOpen) return null;

    const saveLocalState = (now) => {
        useStore.getState().setFullConfig({
            providers,
            activeId,
            globalRoles,
            lastUpdated: now
        });
        saveS3Config(s3Config);
        saveWithTimestamp(CUSTOM_INSTRUCTIONS_KEY, normalizeCustomInstructionsValue(customInstructions));
        persistLinkageSettingsLocal(linkageSettings, user?.uid);
    };

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        setSaveStatus({
            type: 'saving',
            title: '正在保存设置',
            message: '正在写入本地配置...',
            code: ''
        });

        try {
            const now = Date.now();
            saveLocalState(now);
            setSaveStatus({
                type: 'success',
                title: '已保存到本地',
                message: '当前设置只保存在这台设备上。',
                code: ''
            });
        } catch (error) {
            console.error('Failed to save settings:', error);
            setSaveStatus({
                type: 'error',
                title: '本地保存失败',
                message: error?.message || '请稍后重试。',
                code: 'local_save_failed'
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

    const tabs = [
        {
            id: 'basic',
            icon: Sparkles,
            label: '基础体验',
            description: '语言、默认规则、额度',
            accent: {
                icon: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-200',
                iconActive: 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
            }
        },
        {
            id: 'ai',
            icon: Cpu,
            label: 'AI 设置',
            description: '模型、Key、角色',
            accent: {
                icon: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300',
                iconActive: 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
            }
        },
        {
            id: 'advanced',
            icon: SlidersHorizontal,
            label: '高级设置',
            description: '恢复、存储、绑定',
            accent: {
                icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300',
                iconActive: 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
            }
        }
    ];

    const activeMetaMap = {
        basic: {
            title: '基础体验',
            subtitle: '只保留最常改的设置，其他都往后收。'
        },
        ai: {
            title: 'AI 设置',
            subtitle: '模型、连接和角色统一在一个小面板里解决。'
        },
        advanced: {
            title: '高级设置',
            subtitle: '不常用的能力还在，但默认折叠。'
        }
    };

    const activeMeta = activeMetaMap[activeTab] || activeMetaMap.basic;

    const TabButton = ({ id, icon: Icon, label, description, accent, compact = false }) => {
        const isActive = activeTab === id;

        if (compact) {
            return (
                <button
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${isActive
                        ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-white'
                        }`}
                >
                    <span className={`rounded-full p-1 ${isActive ? accent?.iconActive : accent?.icon}`}>
                        <Icon size={12} />
                    </span>
                    {label}
                </button>
            );
        }

        return (
            <button
                onClick={() => setActiveTab(id)}
                className={`group w-full rounded-[20px] border px-3 py-3 text-left transition-all ${isActive
                    ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
                    : 'border-transparent bg-transparent hover:bg-gray-50 dark:hover:bg-gray-900'
                    }`}
            >
                <div className="flex items-center gap-3">
                    <div className={`rounded-xl p-2 transition-colors ${isActive
                        ? accent?.iconActive
                        : `${accent?.icon} opacity-80 group-hover:opacity-100`
                        }`}>
                        <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                        <div className={`truncate text-sm font-medium ${isActive ? 'text-white dark:text-gray-900' : 'text-gray-900 dark:text-white'}`}>
                            {label}
                        </div>
                        <div className={`truncate text-[11px] ${isActive ? 'text-white/65 dark:text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>
                            {description}
                        </div>
                    </div>
                </div>
            </button>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-stretch justify-center bg-white/60 p-2 backdrop-blur-md dark:bg-black/70 sm:p-5">
            <div className="relative h-full w-full max-w-[1100px] overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
                <div className="relative flex h-full flex-col md:flex-row">
                    <aside className="hidden w-[220px] shrink-0 border-r border-gray-100 bg-white md:flex dark:border-gray-800 dark:bg-gray-950">
                        <div className="flex h-full w-full flex-col p-5">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="rounded-[16px] bg-gray-100 p-2.5 text-gray-700 dark:bg-gray-900 dark:text-gray-200">
                                    <Settings size={18} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-light text-gray-900 dark:text-white">{t.settings.title}</h2>
                                    <p className="text-xs tracking-wide text-gray-400 dark:text-gray-500">minimal system panel</p>
                                </div>
                            </div>

                            <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                                {tabs.map((tab) => (
                                    <TabButton
                                        key={tab.id}
                                        id={tab.id}
                                        icon={tab.icon}
                                        label={tab.label}
                                        description={tab.description}
                                        accent={tab.accent}
                                    />
                                ))}
                            </div>

                            <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                                <p className="text-center font-mono text-[11px] text-gray-400 dark:text-gray-500">v{packageJson.version}</p>
                            </div>
                        </div>
                    </aside>

                    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-white dark:bg-gray-950">
                    <header className="border-b border-gray-100 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-950 sm:px-6 sm:py-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="max-w-3xl">
                                <div className="mb-3 flex gap-2 overflow-x-auto md:hidden custom-scrollbar">
                                    {tabs.map((tab) => (
                                        <TabButton
                                            key={tab.id}
                                            id={tab.id}
                                            icon={tab.icon}
                                            label={tab.label}
                                            description={tab.description}
                                            accent={tab.accent}
                                            compact
                                        />
                                    ))}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                                    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 dark:border-gray-700 dark:bg-gray-900">
                                        <Settings size={12} />
                                        {t.settings.title}
                                    </span>
                                    <span>v{packageJson.version}</span>
                                </div>
                                <h2 className="mt-2 text-[28px] font-light tracking-[-0.03em] text-gray-900 dark:text-white">
                                    {activeMeta.title}
                                </h2>
                                <p className="mt-1 text-sm leading-6 text-gray-400 dark:text-gray-500">
                                    {activeMeta.subtitle}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={onClose}
                                    disabled={isSaving}
                                    className="rounded-[14px] border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:hover:text-white"
                                >
                                    {t.settings.cancel}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="rounded-[14px] bg-gray-900 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-gray-700 disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                                >
                                    <span className="flex items-center gap-2">
                                        {isSaving && <Loader2 size={14} className="animate-spin" />}
                                        {isSaving ? '保存中...' : t.settings.saveChanges}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </header>

                    {saveStatus.type !== 'idle' && (
                        <div className="px-4 pt-4 sm:px-6">
                            <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 ${saveStatus.type === 'success'
                                ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                                : saveStatus.type === 'warning'
                                    ? 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20'
                                    : saveStatus.type === 'error'
                                        ? 'border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20'
                                        : 'border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900'
                                }`}>
                                <div className="flex min-w-0 items-center gap-2">
                                    {saveStatus.type === 'saving' && <Loader2 size={16} className="animate-spin text-gray-500 dark:text-gray-300" />}
                                    {saveStatus.type === 'success' && <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-300" />}
                                    {saveStatus.type === 'warning' && <AlertCircle size={16} className="text-amber-600 dark:text-amber-300" />}
                                    {saveStatus.type === 'error' && <AlertCircle size={16} className="text-rose-600 dark:text-rose-300" />}
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{saveStatus.title}</p>
                                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{saveStatus.message}</p>
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                    <div className="relative z-10 min-h-0 flex-1 overflow-y-auto bg-gray-50/40 p-4 dark:bg-black/10 sm:p-6 custom-scrollbar">
                        <div className={`mx-auto ${activeTab === 'ai' ? 'max-w-[1040px]' : 'max-w-[980px]'}`}>
                            {activeTab === 'basic' && (
                                <SettingsBasicSection
                                    customInstructions={customInstructions}
                                    setCustomInstructions={setCustomInstructions}
                                    advancedInstructionCount={extraInstructionCount}
                                    onOpenAdvancedInstructions={() => {
                                        setActiveTab('advanced');
                                        setRequestedAdvancedPanel('instructions');
                                    }}
                                />
                            )}

                            {activeTab === 'ai' && (
                                <SettingsAISection
                                    providers={providers}
                                    activeId={activeId}
                                    setActiveId={setActiveId}
                                    currentProvider={currentProvider}
                                    globalRoles={globalRoles}
                                    onGlobalRoleChange={handleGlobalRoleChange}
                                    handleUpdateProvider={handleUpdateProvider}
                                    handleAddProvider={handleAddProvider}
                                    handleRemoveProvider={handleRemoveProvider}
                                    handleTestConnection={handleTestConnection}
                                    testStatus={testStatus}
                                    testMessage={testMessage}
                                    handleReset={handleReset}
                                />
                            )}

                            {activeTab === 'advanced' && (
                                <SettingsAdvancedSection
                                    s3Config={s3Config}
                                    setS3ConfigState={setS3ConfigState}
                                    customInstructions={customInstructions}
                                    setCustomInstructions={setCustomInstructions}
                                    linkageSettings={linkageSettings}
                                    onLinkageFieldChange={handleLinkageFieldChange}
                                    appUserUid={user?.uid}
                                    user={user}
                                    isSaving={isSaving}
                                    saveStatus={saveStatus}
                                    handleReset={handleReset}
                                    onOpenAITab={() => setActiveTab('ai')}
                                    openPanel={requestedAdvancedPanel}
                                    onOpenPanelChange={setRequestedAdvancedPanel}
                                />
                            )}
                        </div>
                    </div>
                    </section>
                </div>

                {showResetConfirm && (
                    <div className="absolute inset-0 z-[150] flex items-center justify-center bg-white/50 p-4 backdrop-blur-sm dark:bg-black/60">
                        <div className="w-full max-w-sm rounded-[30px] border border-gray-100 bg-white p-7 shadow-2xl dark:border-gray-800 dark:bg-gray-950">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-300">
                                <AlertCircle size={32} />
                            </div>
                            <h3 className="mb-2 text-center text-xl font-light text-gray-900 dark:text-white">{t.settings.resetConfiguration}</h3>
                            <p className="mb-6 text-center text-sm leading-7 text-gray-500 dark:text-gray-400">
                                {t.settings.resetWarning}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="flex-1 rounded-[14px] border border-gray-200 bg-white py-2.5 font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:hover:text-white"
                                >
                                    {t.settings.cancel}
                                </button>
                                <button
                                    onClick={confirmReset}
                                    className="flex-1 rounded-[14px] bg-gray-900 py-2.5 font-medium text-white transition-all hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
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
