import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { getS3Config } from '../services/s3';
import {
    CUSTOM_INSTRUCTIONS_KEY,
    normalizeCustomInstructionsValue
} from '../services/customInstructionsService';
import {
    createEmptyLinkageSettings,
} from '../services/linkageTargets';
import {
    getLocalLinkageSettings
} from '../services/linkageLocalStore';
import { saveUserSettings } from '../services/storage';
import { getEditableItems } from './settings/instructions/helpers';
import SettingsBasicSection from './settings/SettingsBasicSection';
import SettingsAISection from './settings/SettingsAISection';
import SettingsAdvancedSection from './settings/SettingsAdvancedSection';
import SettingsShell, { SettingsResetDialog } from './settings/SettingsShell';
import { cloneGlobalRoles, getSuggestedRoleModel } from './settings/modelRoleUtils';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeGeminiProviderConfig } from '../services/llm/geminiRouting';
import { hasUsableProviderRoute } from '../services/llm/providerAccess';

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

export default function SettingsModal({ isOpen, onClose, user }) {
    const { t } = useLanguage();
    const storeProviders = useStore(state => state.providers);
    const storeActiveId = useStore(state => state.activeId);
    const storeGlobalRoles = useStore(state => state.globalRoles);
    const storeLastUpdated = useStore(state => state.lastUpdated);

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
    const [isDirty, setIsDirty] = useState(false);
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
    const storeSettingsSignature = useMemo(() => JSON.stringify({
        providers: storeProviders,
        activeId: storeActiveId,
        globalRoles: storeGlobalRoles,
        lastUpdated: storeLastUpdated
    }), [storeActiveId, storeGlobalRoles, storeLastUpdated, storeProviders]);

    const hydrateModalStateFromStore = React.useCallback(() => {
        const state = useStore.getState();
        setProviders(JSON.parse(JSON.stringify(state.providers)));
        setActiveId(state.activeId);
        setGlobalRoles(cloneGlobalRoles(state.globalRoles));

        const s3 = getS3Config();
        if (s3) setS3ConfigState(s3);

        const { value: savedInstructions } = loadWithTimestamp(CUSTOM_INSTRUCTIONS_KEY);
        setCustomInstructions(normalizeCustomInstructionsValue(savedInstructions));
        setLinkageSettings(getLocalLinkageSettings(user?.uid));
    }, [user?.uid]);

    useEffect(() => {
        if (!isOpen) return;
        hydrateModalStateFromStore();
        setTestStatus('idle');
        setTestMessage('');
        setIsSaving(false);
        setIsDirty(false);
        setSaveStatus({ type: 'idle', title: '', message: '', code: '' });
        setRequestedAdvancedPanel(null);
        setActiveTab('basic');
    }, [hydrateModalStateFromStore, isOpen, user?.uid]);

    useEffect(() => {
        if (!isOpen || isSaving || isDirty) return;
        hydrateModalStateFromStore();
    }, [hydrateModalStateFromStore, isDirty, isOpen, isSaving, storeSettingsSignature]);

    const handleLinkageFieldChange = (field, value) => {
        setIsDirty(true);
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
        setIsDirty(true);
        setProviders(prev => ({
            ...prev,
            [activeId]: normalizeGeminiProviderConfig({
                ...prev[activeId],
                [field]: value
            })
        }));
    };

    const handleGlobalRoleChange = (role, providerId, model) => {
        setIsDirty(true);
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

    const handleSetActiveId = (nextActiveId) => {
        setIsDirty(true);
        setActiveId(nextActiveId);
    };

    const handleAddProvider = () => {
        setIsDirty(true);
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
        setIsDirty(true);
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

    const handleSetS3ConfigState = (nextValue) => {
        setIsDirty(true);
        setS3ConfigState(prev => (
            typeof nextValue === 'function' ? nextValue(prev) : nextValue
        ));
    };

    const handleSetCustomInstructions = (nextValue) => {
        setIsDirty(true);
        setCustomInstructions(prev => (
            typeof nextValue === 'function' ? nextValue(prev) : nextValue
        ));
    };

    const handleTestConnection = async () => {
        setTestStatus('testing');
        setTestMessage('');
        try {
            const providerConfig = providers[activeId];
            if (!hasUsableProviderRoute(providerConfig)) {
                throw new Error('当前提供商缺少可用 API Key 或自部署 Base URL');
            }

            const testModel = activeId === globalRoles.chat.providerId
                ? (globalRoles.chat.model || providerConfig.model || null)
                : (providerConfig.model || getSuggestedRoleModel(providerConfig, 'chat'));

            const { chatCompletion } = await import('../services/llm');
            await chatCompletion(
                [{ role: 'user', content: 'Hi, respond with OK only.' }],
                providerConfig,
                testModel,
                { useSearch: false }
            );
            setTestStatus('success');
            setTestMessage(`${t.settings.connectionSuccess} (${testModel || 'default model'})`);
        } catch (error) {
            setTestStatus('error');
            setTestMessage(error.message || t.settings.connectionFailed);
        }
    };

    if (!isOpen) return null;

    const buildSettingsPayload = (now) => {
        const state = useStore.getState();
        const normalizedInstructions = normalizeCustomInstructionsValue(customInstructions);

        return {
            providers,
            activeId,
            globalRoles,
            lastUpdated: now,
            s3Config,
            customInstructions: normalizedInstructions,
            customInstructionsModifiedAt: now,
            globalPrompts: state.globalPrompts || [],
            globalPromptsModifiedAt: state.globalPromptsModifiedAt || 0,
            userLanguage: localStorage.getItem('userLanguage') || '',
            ...linkageSettings,
            settingsSavedAt: now
        };
    };

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        setSaveStatus({
            type: 'saving',
            title: '正在保存设置',
            message: user?.uid ? '正在写入本地并同步到账号...' : '正在写入本地配置...',
            code: ''
        });

        try {
            const now = Date.now();
            const saveResult = await saveUserSettings(user?.uid || null, buildSettingsPayload(now));
            setSaveStatus({
                type: 'success',
                title: saveResult.reason === 'firestore' ? '已同步到账号' : '已保存到本地',
                message: saveResult.reason === 'firestore'
                    ? '当前设置已保存到本地，并同步到你的账号。'
                    : (saveResult.reason === 'local_only_remote_failed'
                        ? '本地保存成功，但云端同步失败了。当前设备上的配置不会丢失。'
                        : '当前设置已保存到这台设备上。'),
                code: ''
            });
            setIsDirty(false);
        } catch (error) {
            console.error('Failed to save settings:', error);
            setSaveStatus({
                type: 'error',
                title: '设置保存失败',
                message: error?.message || '请稍后重试。',
                code: 'settings_save_failed'
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
        localStorage.removeItem('mixboard_settings_sync_meta_v1');
        window.location.reload();
    };

    return (
        <SettingsShell
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isDirty={isDirty}
            isSaving={isSaving}
            saveStatus={saveStatus}
            title={t.settings.title}
            cancelLabel={t.settings.cancel}
            saveLabel={t.settings.saveChanges}
            onClose={onClose}
            onSave={handleSave}
            overlay={(
                <SettingsResetDialog
                    open={showResetConfirm}
                    title={t.settings.resetConfiguration}
                    warning={t.settings.resetWarning}
                    cancelLabel={t.settings.cancel}
                    confirmLabel={t.settings.yesReset}
                    onCancel={() => setShowResetConfirm(false)}
                    onConfirm={confirmReset}
                />
            )}
        >
            {activeTab === 'basic' && (
                <SettingsBasicSection
                    customInstructions={customInstructions}
                    setCustomInstructions={handleSetCustomInstructions}
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
                    setActiveId={handleSetActiveId}
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
                    setS3ConfigState={handleSetS3ConfigState}
                    customInstructions={customInstructions}
                    setCustomInstructions={handleSetCustomInstructions}
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
        </SettingsShell>
    );
}
