import React, { useMemo, useState } from 'react';
import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Cpu,
    Globe,
    Image as ImageIcon,
    Key,
    MessageSquare,
    Plus,
    RefreshCw,
    Server,
    Trash2
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getSuggestedRoleModel } from './modelRoleUtils';
import {
    classifyGeminiApiKey,
    isLegacyGmiBaseUrl,
    isOfficialGeminiBaseUrl,
    isVertexExpressBaseUrl,
    resolveGeminiBaseUrl,
    DEFAULT_GEMINI_BASE_URL,
    DEFAULT_OPENAI_BASE_URL,
    DEFAULT_VERTEX_EXPRESS_BASE_URL
} from '../../services/llm/geminiRouting';
import { hasUsableProviderRoute } from '../../services/llm/providerAccess';
import {
    settingsDarkChip,
    settingsDarkField,
    settingsDarkFieldSoft,
    settingsDarkSurfaceStrong
} from './themeClasses';

const fieldClassName = `settings-jp-field ${settingsDarkField}`;
const monoFieldClassName = `settings-jp-field is-mono ${settingsDarkField}`;
const subtleActionClassName = `settings-jp-inline-action ${settingsDarkChip}`;
const dangerActionClassName = 'settings-jp-inline-action is-danger';

function SectionLabel({ icon: Icon, children }) {
    return (
        <label className="settings-jp-field-label">
            <Icon size={14} strokeWidth={1.7} />
            {children}
        </label>
    );
}

function RoleRow({
    icon: Icon,
    label,
    roleKey,
    roleValue,
    providers,
    onChange,
    accent
}) {
    const providerList = Object.values(providers || {});
    const currentProvider = providers?.[roleValue?.providerId];

    return (
        <div className="settings-jp-role-row">
            <div className="settings-jp-role-title">
                <span className={accent}>
                    <Icon size={15} strokeWidth={1.7} />
                </span>
                {label}
            </div>
            <div className="grid gap-3 md:grid-cols-[180px,1fr]">
                <select
                    value={roleValue?.providerId || 'google'}
                    onChange={(e) => {
                        const providerId = e.target.value;
                        onChange(roleKey, providerId, getSuggestedRoleModel(providers?.[providerId], roleKey));
                    }}
                    className={fieldClassName}
                >
                    {providerList.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                            {provider.name}
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    value={roleValue?.model || ''}
                    onChange={(e) => onChange(roleKey, roleValue?.providerId || 'google', e.target.value)}
                    placeholder={getSuggestedRoleModel(currentProvider, roleKey)}
                    className={monoFieldClassName}
                />
            </div>
        </div>
    );
}

export default function SettingsAISection({
    providers,
    activeId,
    setActiveId,
    currentProvider,
    globalRoles,
    onGlobalRoleChange,
    handleUpdateProvider,
    handleAddProvider,
    handleRemoveProvider,
    handleTestConnection,
    testStatus,
    testMessage,
    handleReset
}) {
    const { t } = useLanguage();
    const [showAdvanced, setShowAdvanced] = useState(false);
    const providerList = Object.values(providers || {});
    const roleAccents = useMemo(() => ({
        chat: 'bg-[#ece6f7] text-[#765f98] dark:bg-violet-400/15 dark:text-violet-200',
        image: 'bg-[#dcecf0] text-[#61818c] dark:bg-cyan-400/15 dark:text-cyan-200'
    }), []);
    const providerKeys = String(currentProvider?.apiKey || '')
        .split(',')
        .map(key => key.trim())
        .filter(Boolean);
    const hasMultipleKeys = providerKeys.length > 1;
    const firstKeyKind = classifyGeminiApiKey(providerKeys[0] || '');
    const currentBaseUrl = String(currentProvider?.baseUrl || '');
    const resolvedGeminiBaseUrl = resolveGeminiBaseUrl(currentBaseUrl, currentProvider?.apiKey || '');
    const isGeminiProvider = currentProvider?.protocol === 'gemini';
    const hasProviderRoute = hasUsableProviderRoute(currentProvider);
    const imageRoleNeedsProviderWarning = isGeminiProvider &&
        globalRoles?.image?.providerId === activeId &&
        (isVertexExpressBaseUrl(resolvedGeminiBaseUrl) || isOfficialGeminiBaseUrl(resolvedGeminiBaseUrl));

    let routeHint = '';
    if (isGeminiProvider) {
        if (isVertexExpressBaseUrl(resolvedGeminiBaseUrl)) {
            routeHint = resolvedGeminiBaseUrl === currentBaseUrl
                ? '当前链路：Vertex AI Express 直连'
                : '当前链路：当前配置会自动切到 Vertex AI Express 直连';
        } else if (isOfficialGeminiBaseUrl(resolvedGeminiBaseUrl)) {
            routeHint = resolvedGeminiBaseUrl === currentBaseUrl
                ? '当前链路：Google 官方 Gemini 直连'
                : '当前链路：当前配置会自动切到 Google 官方 Gemini 直连';
        } else if (isLegacyGmiBaseUrl(currentBaseUrl)) {
            routeHint = hasMultipleKeys
                ? '当前链路：GMI 代理，多 Key 轮询已开启'
                : '当前链路：GMI 代理';
        } else if (currentBaseUrl) {
            routeHint = `当前链路：自定义 Gemini 地址 ${currentBaseUrl}`;
        } else {
            routeHint = '当前链路：Google 官方 Gemini 直连';
        }
    }

    return (
        <section className="settings-jp-ai">
            <div className="settings-jp-ai-head">
                <div>
                    <div className="settings-jp-ai-kicker">
                        <Cpu size={13} strokeWidth={1.7} />
                        CURRENT ROUTING
                    </div>
                    <h3>模型与连接</h3>
                    <p>先设置日常使用的模型；多提供商与自定义地址在高级区域中管理。</p>
                </div>

                <button
                    type="button"
                    onClick={() => setShowAdvanced(prev => !prev)}
                    className={subtleActionClassName}
                    aria-expanded={showAdvanced}
                >
                    {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {showAdvanced ? '收起高级 AI 设置' : '展开高级 AI 设置'}
                </button>
            </div>

            <div className="settings-jp-ai-grid">
                <div className="settings-jp-role-list">
                    <RoleRow
                        icon={MessageSquare}
                        label={t.settings.roles?.chatTitle || '对话模型'}
                        roleKey="chat"
                        roleValue={globalRoles.chat}
                        providers={providers}
                        onChange={onGlobalRoleChange}
                        accent={roleAccents.chat}
                    />
                    <RoleRow
                        icon={ImageIcon}
                        label={t.settings.roles?.imageTitle || '图片模型'}
                        roleKey="image"
                        roleValue={globalRoles.image}
                        providers={providers}
                        onChange={onGlobalRoleChange}
                        accent={roleAccents.image}
                    />
                </div>

                <div className="settings-jp-surface settings-jp-connection">
                    <SectionLabel icon={Server}>当前连接</SectionLabel>

                    {providerList.length > 1 && (
                        <div className="mt-3">
                            <select
                                value={activeId}
                                onChange={(e) => setActiveId(e.target.value)}
                                className={fieldClassName}
                            >
                                {providerList.map((provider) => (
                                    <option key={provider.id} value={provider.id}>
                                        {provider.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="mt-3 space-y-3">
                        <div>
                            <label className="settings-jp-field-label is-block">
                                {t.settings.apiKey || 'API 密钥'}
                            </label>
                            <div className="relative">
                                <div className="settings-jp-field-icon">
                                    <Key size={16} strokeWidth={1.7} />
                                </div>
                                <textarea
                                    value={currentProvider.apiKey || ''}
                                    onChange={(e) => handleUpdateProvider('apiKey', e.target.value)}
                                    rows={3}
                                    className={`settings-jp-field is-mono has-icon ${settingsDarkFieldSoft}`}
                                    placeholder={currentProvider.protocol === 'gemini'
                                        ? (t.settings.geminiKeyPlaceholder || 'AQ... 或 AIza...')
                                        : (t.settings.openaiKeyPlaceholder || 'sk-...')}
                                />
                            </div>
                            <p className="settings-jp-field-help">
                                不填也能用默认体验；只有你要接自己的服务时才需要这里。
                            </p>
                        </div>

                        {routeHint && (
                            <div className={`settings-jp-route-hint ${settingsDarkSurfaceStrong}`}>
                                {routeHint}
                            </div>
                        )}

                        {imageRoleNeedsProviderWarning && (
                            <div className="settings-jp-notice is-warning">
                                当前图片角色正指向这个 Google / Vertex 直连提供商，但图片生成链路尚未接入这里。建议把图片角色切回支持图片的提供商后再使用。
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <button
                                onClick={handleTestConnection}
                                disabled={testStatus === 'testing' || !hasProviderRoute}
                                className="settings-jp-test-button"
                            >
                                {testStatus === 'testing' ? (t.settings.testing || '测试中...') : (t.settings.testConnection || '测试连接')}
                            </button>

                            {testStatus === 'success' && (
                                <span className="settings-jp-inline-status is-success">
                                    <CheckCircle2 size={15} />
                                    {testMessage}
                                </span>
                            )}

                            {testStatus === 'error' && (
                                <span className="settings-jp-inline-status is-error">
                                    <AlertCircle size={15} />
                                    {testMessage}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showAdvanced && (
                <div className="settings-jp-ai-advanced">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <SectionLabel icon={Globe}>高级 AI 设置</SectionLabel>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleAddProvider}
                                className={`${subtleActionClassName} px-3 py-1.5 text-xs`}
                            >
                                <Plus size={13} />
                                新建提供商
                            </button>
                            <button
                                onClick={handleReset}
                                className={`${dangerActionClassName} px-3 py-1.5 text-xs`}
                            >
                                <RefreshCw size={13} />
                                {t.settings.resetDefaults || '重置默认'}
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[240px,1fr]">
                        <div className="space-y-2">
                            {providerList.map((provider) => {
                                const isActive = provider.id === activeId;
                                return (
                                    <div
                                        key={provider.id}
                                        className={`settings-jp-provider-item${isActive ? ' is-active' : ''}`}
                                    >
                                        <button
                                            onClick={() => setActiveId(provider.id)}
                                            className="min-w-0 flex-1 text-left"
                                        >
                                            <div className="truncate text-sm font-semibold">{provider.name || 'Untitled Provider'}</div>
                                            <div className="settings-jp-provider-meta">
                                                {provider.protocol === 'gemini'
                                                    ? (t.settings.geminiNative || 'Gemini 原生')
                                                    : (t.settings.openaiCompat || 'OpenAI 兼容')}
                                            </div>
                                        </button>
                                        {providerList.length > 1 && (
                                            <button
                                                onClick={() => handleRemoveProvider(provider.id)}
                                                className="settings-jp-icon-action is-danger"
                                                aria-label={`删除 ${provider.name || provider.id}`}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="grid gap-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="settings-jp-field-label is-block">
                                        {t.settings.providerName || '提供商名称'}
                                    </label>
                                    <input
                                        type="text"
                                        value={currentProvider.name || ''}
                                        onChange={(e) => handleUpdateProvider('name', e.target.value)}
                                        className={fieldClassName}
                                    />
                                </div>

                                <div>
                                    <label className="settings-jp-field-label is-block">
                                        {t.settings.protocol || '协议'}
                                    </label>
                                    <select
                                        value={currentProvider.protocol || 'openai'}
                                        onChange={(e) => handleUpdateProvider('protocol', e.target.value)}
                                        className={fieldClassName}
                                    >
                                        <option value="gemini">{t.settings.geminiNative || 'Gemini 原生'}</option>
                                        <option value="openai">{t.settings.openaiCompat || 'OpenAI 兼容'}</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="settings-jp-field-label is-block">
                                        {t.settings.baseUrl || 'Base URL'}
                                    </label>
                                    <input
                                        type="text"
                                        value={currentProvider.baseUrl || ''}
                                        onChange={(e) => handleUpdateProvider('baseUrl', e.target.value)}
                                        className={monoFieldClassName}
                                        placeholder={currentProvider.protocol === 'gemini'
                                            ? (firstKeyKind === 'AQ' ? DEFAULT_VERTEX_EXPRESS_BASE_URL : DEFAULT_GEMINI_BASE_URL)
                                            : DEFAULT_OPENAI_BASE_URL}
                                    />
                                </div>

                                <div>
                                    <label className="settings-jp-field-label is-block">
                                        {t.settings.modelName || '模型名称'}
                                    </label>
                                    <input
                                        type="text"
                                        value={currentProvider.model || ''}
                                        onChange={(e) => handleUpdateProvider('model', e.target.value)}
                                        className={monoFieldClassName}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="settings-jp-field-label is-block">
                                    {t.settings?.modelList || '可用模型列表'}
                                </label>
                                <textarea
                                    value={currentProvider.customModels || ''}
                                    onChange={(e) => handleUpdateProvider('customModels', e.target.value)}
                                    rows={3}
                                    className={`settings-jp-field is-mono ${settingsDarkFieldSoft}`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
