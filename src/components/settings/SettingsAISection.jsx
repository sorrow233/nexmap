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

const fieldClassName = 'w-full rounded-[20px] border border-[#eee2d6] bg-[#fffdf9] px-4 py-3 text-sm font-medium text-[#40342a] outline-none transition-all focus:border-[#e7d4bb] focus:ring-4 focus:ring-[#f4e7d2] dark:border-slate-700/80 dark:bg-[#0f1722] dark:text-white dark:focus:border-slate-500/70 dark:focus:ring-slate-700/60';
const monoFieldClassName = 'w-full rounded-[20px] border border-[#eee2d6] bg-[#fffdf9] px-4 py-3 text-sm font-mono text-[#40342a] outline-none transition-all focus:border-[#e7d4bb] focus:ring-4 focus:ring-[#f4e7d2] dark:border-slate-700/80 dark:bg-[#0f1722] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-slate-500/70 dark:focus:ring-slate-700/60';
const subtleActionClassName = 'inline-flex items-center gap-1.5 rounded-full border border-[#eadfce] bg-[#fffaf4] px-4 py-2 text-sm font-medium text-[#685745] transition-all hover:bg-white dark:border-slate-700/80 dark:bg-[#17202c] dark:text-slate-100 dark:hover:bg-[#1d2835]';
const dangerActionClassName = 'inline-flex items-center gap-1.5 rounded-full border border-[#edcfce] bg-[#fbefee] px-4 py-2 text-sm font-medium text-[#c66d6d] transition-all hover:bg-[#fff5f4] dark:border-rose-300/20 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/15';

function SectionLabel({ icon: Icon, children }) {
    return (
        <label className="flex items-center gap-2 text-[11px] font-medium text-[#8d7a67] dark:text-slate-300/70">
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
        <div className="rounded-[28px] border border-[#eee2d6] bg-[rgba(255,252,247,0.9)] p-5 shadow-[0_18px_46px_rgba(95,74,49,0.06)] dark:border-slate-800/80 dark:bg-[#141c26]/90">
            <div className="mb-4 flex items-center gap-3 text-sm font-semibold text-[#2f241a] dark:text-white">
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
        chat: 'bg-[#ece6f7] text-[#765f98] dark:bg-violet-400/15 dark:text-violet-200',
        image: 'bg-[#dcecf0] text-[#61818c] dark:bg-cyan-400/15 dark:text-cyan-200'
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
        <section className="rounded-[32px] border border-[#eee3d7] bg-[linear-gradient(135deg,rgba(255,252,247,0.94),rgba(246,240,234,0.92))] p-6 shadow-[0_24px_60px_rgba(95,74,50,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(20,24,31,0.94),rgba(12,17,24,0.94))]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#e9dccb] bg-[#f8efe4] px-3 py-1 text-[11px] font-semibold text-[#8d6d49] dark:border-slate-700/70 dark:bg-[#17202c] dark:text-slate-100">
                        <Cpu size={13} />
                        AI 设置
                    </div>
                    <h3 className="mt-4 text-[28px] font-semibold tracking-[-0.02em] text-[#2f241a] dark:text-white">
                        把模型、Key 和角色合并到一个地方
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-[#7b6a58] dark:text-slate-300">
                        默认只展示真正常用的内容：对话模型、图片模型、当前连接。
                        只有你确实要折腾多提供商或自定义 Base URL 时，才展开高级选项。
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

            <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr,1fr]">
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

                <div className="rounded-[28px] border border-[#eee2d6] bg-[rgba(255,252,247,0.86)] p-5 shadow-[0_16px_40px_rgba(95,74,49,0.05)] backdrop-blur-2xl dark:border-slate-800/80 dark:bg-[#141c26]/90">
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
                            <label className="mb-2 block text-sm font-medium text-[#594b3d] dark:text-slate-200">
                                {t.settings.apiKey || 'API 密钥'}
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute left-4 top-4 text-[#b7a895] dark:text-slate-500">
                                    <Key size={16} />
                                </div>
                                <textarea
                                    value={currentProvider.apiKey || ''}
                                    onChange={(e) => handleUpdateProvider('apiKey', e.target.value)}
                                    rows={3}
                                    className="w-full rounded-[24px] border border-[#eee2d6] bg-[#fffdf9] px-4 py-4 pl-11 text-sm font-mono text-[#40342a] outline-none transition-all focus:border-[#e7d4bb] focus:ring-4 focus:ring-[#f4e7d2] dark:border-white/10 dark:bg-white/8 dark:text-white dark:focus:border-white/20 dark:focus:ring-white/10"
                                    placeholder={currentProvider.protocol === 'gemini'
                                        ? (t.settings.geminiKeyPlaceholder || 'Gemini API Key')
                                        : (t.settings.openaiKeyPlaceholder || 'sk-...')}
                                />
                            </div>
                            <p className="mt-2 text-xs leading-6 text-[#8d7b68] dark:text-slate-300/75">
                                不填也能用默认体验；只有你要接自己的服务时才需要这里。
                            </p>
                        </div>

                        {routeHint && (
                            <div className="rounded-[20px] border border-[#eadfcf] bg-[#f8f2e8] px-4 py-3 text-sm text-[#7d6b57] dark:border-slate-800/70 dark:bg-[#17202c] dark:text-slate-200">
                                {routeHint}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <button
                                onClick={handleTestConnection}
                                disabled={testStatus === 'testing' || !currentProvider.apiKey}
                                className="rounded-full bg-[#efb65a] px-4 py-2 text-sm font-semibold text-[#332412] shadow-[0_12px_28px_rgba(226,174,92,0.25)] transition-all hover:bg-[#f3bf6c] disabled:cursor-not-allowed disabled:opacity-50"
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
                <div className="mt-6 rounded-[28px] border border-[#eee2d6] bg-[rgba(251,247,241,0.9)] p-5 shadow-[0_16px_40px_rgba(95,74,49,0.05)] backdrop-blur-2xl dark:border-slate-800/80 dark:bg-[#141c26]/90">
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
                                            ? 'border-[#eadbc9] bg-[#fffaf3] text-[#2f241a] shadow-[0_10px_24px_rgba(93,75,52,0.08)] dark:border-slate-600/70 dark:bg-[#1b2430] dark:text-white dark:shadow-[0_14px_32px_rgba(2,6,23,0.42)]'
                                            : 'border-[#eee4d8] bg-[rgba(255,252,247,0.86)] text-[#665746] hover:bg-white dark:border-slate-800/80 dark:bg-[#141c26] dark:text-slate-200 dark:hover:border-slate-700/80 dark:hover:bg-[#1a2330]'
                                            }`}
                                    >
                                        <button
                                            onClick={() => setActiveId(provider.id)}
                                            className="min-w-0 flex-1 text-left"
                                        >
                                            <div className="truncate text-sm font-semibold">{provider.name || 'Untitled Provider'}</div>
                                            <div className="truncate text-xs text-[#938270] dark:text-slate-300/70">
                                                {provider.protocol === 'gemini'
                                                    ? (t.settings.geminiNative || 'Gemini 原生')
                                                    : (t.settings.openaiCompat || 'OpenAI 兼容')}
                                            </div>
                                        </button>
                                        {providerList.length > 1 && (
                                            <button
                                                onClick={() => handleRemoveProvider(provider.id)}
                                                className="rounded-full p-1 text-[#b0a08e] transition-all hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
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
                                    <label className="mb-2 block text-sm font-medium text-[#594b3d] dark:text-slate-200">
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
                                    <label className="mb-2 block text-sm font-medium text-[#594b3d] dark:text-slate-200">
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
                                    <label className="mb-2 block text-sm font-medium text-[#594b3d] dark:text-slate-200">
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
                                    <label className="mb-2 block text-sm font-medium text-[#594b3d] dark:text-slate-200">
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
                                <label className="mb-2 block text-sm font-medium text-[#594b3d] dark:text-slate-200">
                                    {t.settings?.modelList || '可用模型列表'}
                                </label>
                                <textarea
                                    value={currentProvider.customModels || ''}
                                    onChange={(e) => handleUpdateProvider('customModels', e.target.value)}
                                    rows={3}
                                    className="w-full rounded-[24px] border border-[#eee2d6] bg-[#fffdf9] px-4 py-4 text-sm font-mono text-[#40342a] outline-none transition-all focus:border-[#e7d4bb] focus:ring-4 focus:ring-[#f4e7d2] dark:border-white/10 dark:bg-white/8 dark:text-white dark:focus:border-white/20 dark:focus:ring-white/10"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
