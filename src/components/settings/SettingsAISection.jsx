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

const fieldClassName = 'w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-all focus:border-gray-300 focus:ring-4 focus:ring-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-gray-700 dark:focus:ring-gray-800';
const monoFieldClassName = 'w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-mono text-gray-900 outline-none transition-all focus:border-gray-300 focus:ring-4 focus:ring-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-600 dark:focus:border-gray-700 dark:focus:ring-gray-800';
const subtleActionClassName = 'inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:hover:text-white';
const dangerActionClassName = 'inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 transition-all hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200 dark:hover:bg-rose-950/40';

function SectionLabel({ icon: Icon, children }) {
    return (
        <label className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
            <Icon size={14} />
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
        <div className="rounded-[28px] border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-900/50">
            <div className="mb-4 flex items-center gap-3 text-sm font-medium text-gray-900 dark:text-white">
                <span className={`rounded-[16px] p-2 ${accent}`}>
                    <Icon size={16} />
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
        chat: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300',
        image: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300'
    }), []);
    const providerKeys = String(currentProvider?.apiKey || '')
        .split(',')
        .map(key => key.trim())
        .filter(Boolean);
    const hasMultipleKeys = providerKeys.length > 1;
    const currentBaseUrl = String(currentProvider?.baseUrl || '');
    const isGeminiProvider = currentProvider?.protocol === 'gemini';

    let routeHint = '';
    if (isGeminiProvider) {
        if (currentBaseUrl.includes('generativelanguage.googleapis.com')) {
            routeHint = '当前链路：Google 官方 Gemini 直连';
        } else if (currentBaseUrl.includes('api.gmi-serving.com')) {
            routeHint = hasMultipleKeys
                ? '当前链路：GMI 代理，多 Key 轮询已开启'
                : '当前链路：GMI 代理';
        } else if (currentBaseUrl) {
            routeHint = `当前链路：自定义 Gemini 地址 ${currentBaseUrl}`;
        }
    }

    return (
        <section className="rounded-[32px] border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500">
                        <Cpu size={13} />
                        AI 设置
                    </div>
                    <h3 className="mt-4 text-[28px] font-light tracking-[-0.03em] text-gray-900 dark:text-white">
                        模型、连接和角色都收进一个面板
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-400 dark:text-gray-500">
                        先改最常用的两项。只有需要多个提供商、Base URL 或自定义模型时，再展开下面的高级区。
                    </p>
                </div>

                <button
                    onClick={() => setShowAdvanced(prev => !prev)}
                    className={`${subtleActionClassName} self-start`}
                >
                    {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {showAdvanced ? '收起高级 AI 设置' : '展开高级 AI 设置'}
                </button>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
                <div className="space-y-4">
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

                <div className="rounded-[28px] border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-900/50">
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
                            <label className="mb-2 block text-sm font-medium text-gray-600 dark:text-gray-300">
                                {t.settings.apiKey || 'API 密钥'}
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute left-4 top-4 text-gray-400 dark:text-gray-600">
                                    <Key size={16} />
                                </div>
                                <textarea
                                    value={currentProvider.apiKey || ''}
                                    onChange={(e) => handleUpdateProvider('apiKey', e.target.value)}
                                    rows={3}
                                    className="w-full rounded-[24px] border border-gray-100 bg-white px-4 py-4 pl-11 text-sm font-mono text-gray-900 outline-none transition-all focus:border-gray-300 focus:ring-4 focus:ring-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-gray-700 dark:focus:ring-gray-800"
                                    placeholder={currentProvider.protocol === 'gemini'
                                        ? (t.settings.geminiKeyPlaceholder || 'Gemini API Key')
                                        : (t.settings.openaiKeyPlaceholder || 'sk-...')}
                                />
                            </div>
                            <p className="mt-2 text-xs leading-6 text-gray-400 dark:text-gray-500">
                                不填也能用默认体验；只有你要接自己的服务时才需要这里。
                            </p>
                        </div>

                        {routeHint && (
                            <div className="rounded-[20px] border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                {routeHint}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <button
                                onClick={handleTestConnection}
                                disabled={testStatus === 'testing' || !currentProvider.apiKey}
                                className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                            >
                                {testStatus === 'testing' ? (t.settings.testing || '测试中...') : (t.settings.testConnection || '测试连接')}
                            </button>

                            {testStatus === 'success' && (
                                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                                    <CheckCircle2 size={15} />
                                    {testMessage}
                                </span>
                            )}

                            {testStatus === 'error' && (
                                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-600 dark:text-rose-300">
                                    <AlertCircle size={15} />
                                    {testMessage}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showAdvanced && (
                <div className="mt-5 rounded-[28px] border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-900/50">
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
                                        className={`flex items-center gap-2 rounded-[22px] border px-3 py-3 transition-all ${isActive
                                            ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
                                            : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        <button
                                            onClick={() => setActiveId(provider.id)}
                                            className="min-w-0 flex-1 text-left"
                                        >
                                            <div className="truncate text-sm font-semibold">{provider.name || 'Untitled Provider'}</div>
                                            <div className={`truncate text-xs ${isActive ? 'text-white/65 dark:text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>
                                                {provider.protocol === 'gemini'
                                                    ? (t.settings.geminiNative || 'Gemini 原生')
                                                    : (t.settings.openaiCompat || 'OpenAI 兼容')}
                                            </div>
                                        </button>
                                        {providerList.length > 1 && (
                                            <button
                                                onClick={() => handleRemoveProvider(provider.id)}
                                                className={`rounded-full p-1 transition-all ${isActive ? 'text-white/70 hover:bg-white/10 hover:text-white dark:text-gray-500 dark:hover:bg-gray-200 dark:hover:text-gray-900' : 'text-gray-400 hover:bg-rose-50 hover:text-rose-500 dark:text-gray-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-200'}`}
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
                                    <label className="mb-2 block text-sm font-medium text-gray-600 dark:text-gray-300">
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
                                    <label className="mb-2 block text-sm font-medium text-gray-600 dark:text-gray-300">
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
                                    <label className="mb-2 block text-sm font-medium text-gray-600 dark:text-gray-300">
                                        {t.settings.baseUrl || 'Base URL'}
                                    </label>
                                    <input
                                        type="text"
                                        value={currentProvider.baseUrl || ''}
                                        onChange={(e) => handleUpdateProvider('baseUrl', e.target.value)}
                                        className={monoFieldClassName}
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-600 dark:text-gray-300">
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
                                <label className="mb-2 block text-sm font-medium text-gray-600 dark:text-gray-300">
                                    {t.settings?.modelList || '可用模型列表'}
                                </label>
                                <textarea
                                    value={currentProvider.customModels || ''}
                                    onChange={(e) => handleUpdateProvider('customModels', e.target.value)}
                                    rows={3}
                                    className="w-full rounded-[24px] border border-gray-100 bg-white px-4 py-4 text-sm font-mono text-gray-900 outline-none transition-all focus:border-gray-300 focus:ring-4 focus:ring-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-gray-700 dark:focus:ring-gray-800"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
