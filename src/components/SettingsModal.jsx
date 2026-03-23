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
            description: '语言、默认回复规则、基础额度',
            accent: {
                icon: 'bg-[#f7dfcf] text-[#9f6f4d] dark:bg-amber-400/15 dark:text-amber-200',
                iconActive: 'bg-[#f3d5c0] text-[#8f6143] dark:bg-amber-300/20 dark:text-amber-100'
            }
        },
        {
            id: 'ai',
            icon: Cpu,
            label: 'AI 设置',
            description: '模型、Key、连接与角色',
            accent: {
                icon: 'bg-[#ebe4f7] text-[#776496] dark:bg-violet-400/15 dark:text-violet-200',
                iconActive: 'bg-[#e1d7f3] text-[#695784] dark:bg-violet-300/20 dark:text-violet-100'
            }
        },
        {
            id: 'advanced',
            icon: SlidersHorizontal,
            label: '高级设置',
            description: '存储、指令库、绑定与恢复',
            accent: {
                icon: 'bg-[#e5efe6] text-[#5f7666] dark:bg-emerald-400/15 dark:text-emerald-200',
                iconActive: 'bg-[#dbe9de] text-[#4e6555] dark:bg-emerald-300/20 dark:text-emerald-100'
            }
        }
    ];

    const activeMetaMap = {
        basic: {
            title: '基础体验',
            subtitle: '常用偏好、语言和默认规则都集中在这里'
        },
        ai: {
            title: 'AI 设置',
            subtitle: '模型、连接和角色配置统一收纳'
        },
        advanced: {
            title: '高级设置',
            subtitle: '恢复、本地绑定和高级能力按需展开'
        }
    };

    const activeMeta = activeMetaMap[activeTab] || activeMetaMap.basic;
    const activeTabMeta = tabs.find(tab => tab.id === activeTab) || tabs[0];

    const TabButton = ({ id, icon: Icon, label, description, accent, compact = false }) => {
        const isActive = activeTab === id;

        if (compact) {
            return (
                <button
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${isActive
                        ? 'border-[#eadbc6] bg-[#fffaf3] text-[#5e4d3e] shadow-[0_10px_24px_rgba(92,74,50,0.10)] dark:border-white/15 dark:bg-white/12 dark:text-white dark:shadow-[0_12px_30px_rgba(2,6,23,0.35)]'
                        : 'border-[#efe6da] bg-[rgba(255,252,247,0.84)] text-[#83705e] hover:bg-white dark:border-white/10 dark:bg-white/8 dark:text-slate-300 dark:hover:bg-white/12 dark:hover:text-white'
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
                className={`group w-full rounded-[22px] border px-3 py-3 text-left transition-all ${isActive
                    ? 'border-[#ebdecf] bg-[#fffaf3] shadow-[0_16px_32px_rgba(93,75,52,0.08)] dark:border-white/15 dark:bg-white/10 dark:shadow-[0_18px_38px_rgba(2,6,23,0.32)]'
                    : 'border-transparent bg-transparent hover:bg-[#fbf6ef] dark:hover:bg-white/6'
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
                        <div className={`truncate text-sm font-semibold ${isActive ? 'text-[#2f241a] dark:text-white' : 'text-[#584c40] dark:text-slate-200'}`}>
                            {label}
                        </div>
                        <div className="truncate text-[11px] text-[#938370] dark:text-slate-300/70">
                            {description}
                        </div>
                    </div>
                </div>
            </button>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-stretch justify-center bg-[rgba(104,92,78,0.18)] p-2 backdrop-blur-[18px] dark:bg-slate-950/80 sm:p-6">
            <div className="relative h-full w-full max-w-[1320px] overflow-hidden rounded-[38px] border border-[#efe5d8] bg-[linear-gradient(180deg,rgba(248,244,238,0.98),rgba(241,235,228,0.98))] shadow-[0_34px_100px_rgba(82,67,49,0.18)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(18,22,30,0.96),rgba(12,16,23,0.94))] dark:shadow-[0_35px_120px_rgba(2,6,23,0.65)]">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#f5d5a8]/35 blur-3xl dark:bg-amber-300/10" />
                    <div className="absolute bottom-0 left-10 h-72 w-72 rounded-full bg-[#ddd7ef]/40 blur-3xl dark:bg-violet-300/10" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(250,239,222,0.8),transparent_30%),radial-gradient(circle_at_82%_14%,rgba(239,228,246,0.6),transparent_28%),radial-gradient(circle_at_72%_86%,rgba(235,240,226,0.55),transparent_28%)] dark:bg-[radial-gradient(circle_at_14%_16%,rgba(245,158,11,0.09),transparent_26%),radial-gradient(circle_at_82%_14%,rgba(168,85,247,0.10),transparent_24%),radial-gradient(circle_at_72%_86%,rgba(52,211,153,0.08),transparent_24%)]" />
                </div>

                <div className="relative flex h-full flex-col md:flex-row">
                    <aside className="hidden w-[280px] shrink-0 border-r border-[#ebe0d3] bg-[rgba(255,251,246,0.8)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/6 md:flex">
                        <div className="flex h-full w-full flex-col p-6">
                            <div className="mb-6 flex items-center gap-3">
                                <div className={`rounded-[18px] p-2.5 shadow-[0_10px_24px_rgba(94,73,51,0.10)] ${activeTabMeta.accent.iconActive}`}>
                                    <Settings size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-[#2f241a] dark:text-white">{t.settings.title}</h2>
                                    <p className="text-xs font-medium text-[#8f7e6b] dark:text-slate-300/70">轻一点，静一点，分类还在</p>
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

                            <div className="mt-5 border-t border-[#ece2d6] pt-4 dark:border-white/10">
                                <p className="text-center font-mono text-[11px] text-[#ad9d8a] dark:text-slate-400/60">v{packageJson.version}</p>
                            </div>
                        </div>
                    </aside>

                    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[rgba(248,244,238,0.66)] dark:bg-[#0f141c]/82">
                    <header className="border-b border-[#ece1d4] bg-[rgba(255,251,246,0.72)] px-4 py-4 backdrop-blur-2xl dark:border-white/10 dark:bg-white/6 sm:px-8 sm:py-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-3xl">
                                <div className="inline-flex items-center gap-2 rounded-full border border-[#eadbc8] bg-[#f8eee3] px-3 py-1 text-[11px] font-semibold text-[#8d6d49] dark:border-white/10 dark:bg-white/8 dark:text-slate-200">
                                    <Settings size={13} />
                                    {t.settings.title}
                                </div>
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
                                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-[#2f241a] dark:text-white">
                                    {activeMeta.title}
                                </h2>
                                <p className="mt-2 text-sm leading-7 text-[#7b6a58] dark:text-slate-300">
                                    {activeMeta.subtitle}。当前版本 v{packageJson.version}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={onClose}
                                    disabled={isSaving}
                                    className="rounded-[16px] border border-[#eaddca] bg-[#fffaf3] px-4 py-2 text-sm font-medium text-[#655545] transition-all hover:bg-white disabled:opacity-60 dark:border-white/10 dark:bg-white/8 dark:text-slate-200 dark:hover:bg-white/12"
                                >
                                    {t.settings.cancel}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="rounded-[16px] bg-[#efb65a] px-5 py-2 text-sm font-semibold text-[#322515] shadow-[0_14px_30px_rgba(226,174,92,0.28)] transition-all hover:bg-[#f3bf6c] disabled:opacity-60"
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
                        <div className="px-4 pt-4 sm:px-8">
                            <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 ${saveStatus.type === 'success'
                                ? 'border-emerald-200/80 bg-[#f0f7f1] dark:border-emerald-400/20 dark:bg-emerald-500/10'
                                : saveStatus.type === 'warning'
                                    ? 'border-[#eed8ae] bg-[#fbf5e8] dark:border-amber-300/20 dark:bg-amber-500/10'
                                    : saveStatus.type === 'error'
                                        ? 'border-rose-200/80 bg-[#fbefef] dark:border-rose-400/20 dark:bg-rose-500/10'
                                        : 'border-[#ece1d4] bg-[rgba(255,252,247,0.88)] dark:border-white/10 dark:bg-white/8'
                                }`}>
                                <div className="flex min-w-0 items-center gap-2">
                                    {saveStatus.type === 'saving' && <Loader2 size={16} className="animate-spin text-[#7b6a58] dark:text-slate-200" />}
                                    {saveStatus.type === 'success' && <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-300" />}
                                    {saveStatus.type === 'warning' && <AlertCircle size={16} className="text-[#b58834] dark:text-amber-300" />}
                                    {saveStatus.type === 'error' && <AlertCircle size={16} className="text-rose-600 dark:text-rose-300" />}
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-[#34291f] dark:text-white">{saveStatus.title}</p>
                                        <p className="truncate text-xs text-[#7a6956] dark:text-slate-300">{saveStatus.message}</p>
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                    <div className="relative z-10 min-h-0 flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                        <div className={`mx-auto ${activeTab === 'ai' ? 'max-w-[1120px]' : 'max-w-5xl'}`}>
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
                    <div className="absolute inset-0 z-[150] flex items-center justify-center bg-[rgba(85,74,61,0.32)] p-4 backdrop-blur-sm">
                        <div className="w-full max-w-sm rounded-[30px] border border-[#efe1d2] bg-[rgba(255,251,246,0.92)] p-7 shadow-[0_24px_60px_rgba(78,63,44,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#11161f]/92">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f7e7e7] text-rose-500 dark:bg-rose-500/15 dark:text-rose-300">
                                <AlertCircle size={32} />
                            </div>
                            <h3 className="mb-2 text-center text-xl font-semibold text-[#2f241a] dark:text-white">{t.settings.resetConfiguration}</h3>
                            <p className="mb-6 text-center text-sm leading-7 text-[#7b6a58] dark:text-slate-300">
                                {t.settings.resetWarning}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="flex-1 rounded-[14px] border border-[#eadfcd] bg-[#fffaf3] py-2.5 font-medium text-[#655545] transition-all hover:bg-white dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/12"
                                >
                                    {t.settings.cancel}
                                </button>
                                <button
                                    onClick={confirmReset}
                                    className="flex-1 rounded-[14px] bg-[#e58b88] py-2.5 font-semibold text-white transition-all hover:bg-[#ea9a98]"
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
