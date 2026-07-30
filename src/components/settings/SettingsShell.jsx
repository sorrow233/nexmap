import React from 'react';
import {
    AlertCircle,
    CheckCircle2,
    Cpu,
    Loader2,
    Save,
    SlidersHorizontal,
    Sparkles,
    X
} from 'lucide-react';
import packageJson from '../../../package.json';
import './settingsTheme.css';

const TABS = [
    {
        id: 'basic',
        icon: Sparkles,
        label: '基础体验',
        description: '语言与默认规则'
    },
    {
        id: 'ai',
        icon: Cpu,
        label: 'AI 设置',
        description: '模型、连接与角色'
    },
    {
        id: 'advanced',
        icon: SlidersHorizontal,
        label: '高级设置',
        description: '存储、指令与恢复'
    }
];

const TAB_META = {
    basic: {
        title: '基础体验',
        subtitle: '语言、额度与默认回复规则'
    },
    ai: {
        title: 'AI 设置',
        subtitle: '模型角色、连接与提供商管理'
    },
    advanced: {
        title: '高级设置',
        subtitle: '额度、指令、存储与跨应用联动'
    }
};

function SettingsNavItem({ tab, active, compact, onSelect }) {
    const Icon = tab.icon;

    return (
        <button
            type="button"
            onClick={() => onSelect(tab.id)}
            className={`settings-jp-nav-item${active ? ' is-active' : ''}${compact ? ' is-compact' : ''}`}
            aria-pressed={active}
        >
            <span className="settings-jp-nav-icon" aria-hidden="true">
                <Icon size={compact ? 14 : 17} strokeWidth={1.7} />
            </span>
            <span className="settings-jp-nav-copy">
                <span className="settings-jp-nav-label">{tab.label}</span>
                {!compact && <span className="settings-jp-nav-description">{tab.description}</span>}
            </span>
        </button>
    );
}

function SaveStatus({ status }) {
    if (status.type === 'idle') return null;

    const Icon = status.type === 'saving'
        ? Loader2
        : status.type === 'success'
            ? CheckCircle2
            : AlertCircle;

    return (
        <div className={`settings-jp-status is-${status.type}`} role="status" aria-live="polite">
            <Icon
                size={16}
                className={status.type === 'saving' ? 'animate-spin' : ''}
                aria-hidden="true"
            />
            <div>
                <p>{status.title}</p>
                <span>{status.message}</span>
            </div>
        </div>
    );
}

export function SettingsResetDialog({ open, title, warning, cancelLabel, confirmLabel, onCancel, onConfirm }) {
    if (!open) return null;

    return (
        <div className="settings-jp-dialog-backdrop" role="presentation">
            <div
                className="settings-jp-dialog"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="settings-reset-title"
                aria-describedby="settings-reset-description"
            >
                <div className="settings-jp-dialog-mark" aria-hidden="true">
                    <AlertCircle size={23} strokeWidth={1.7} />
                </div>
                <p className="settings-jp-kicker">RESET</p>
                <h3 id="settings-reset-title">{title}</h3>
                <p id="settings-reset-description">{warning}</p>
                <div className="settings-jp-dialog-actions">
                    <button type="button" className="settings-jp-button is-secondary" onClick={onCancel}>
                        {cancelLabel}
                    </button>
                    <button type="button" className="settings-jp-button is-danger" onClick={onConfirm}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function SettingsShell({
    activeTab,
    setActiveTab,
    isDirty,
    isSaving,
    saveStatus,
    title,
    cancelLabel,
    saveLabel,
    onClose,
    onSave,
    overlay,
    children
}) {
    const activeMeta = TAB_META[activeTab] || TAB_META.basic;

    return (
        <div className="settings-jp-root" role="dialog" aria-modal="true" aria-label={title}>
            <div className="settings-jp-shell">
                <aside className="settings-jp-sidebar">
                    <div className="settings-jp-brand">
                        <div className="settings-jp-brand-mark" aria-hidden="true">
                            <Sparkles size={19} strokeWidth={1.8} />
                        </div>
                        <div>
                            <span>NEXMAP</span>
                            <strong>设置中心</strong>
                        </div>
                    </div>

                    <nav className="settings-jp-nav" aria-label="设置分类">
                        {TABS.map((tab) => (
                            <SettingsNavItem
                                key={tab.id}
                                tab={tab}
                                active={activeTab === tab.id}
                                onSelect={setActiveTab}
                            />
                        ))}
                    </nav>

                    <div className="settings-jp-sidebar-note">
                        <span aria-hidden="true" />
                        <div>
                            <strong>{isDirty ? '有未保存更改' : '设置已就绪'}</strong>
                            <small>VERSION {packageJson.version}</small>
                        </div>
                    </div>
                </aside>

                <main className="settings-jp-main">
                    <header className="settings-jp-header">
                        <div className="settings-jp-mobile-brand">
                            <span className="settings-jp-mobile-seal">
                                <Sparkles size={13} strokeWidth={1.8} />
                            </span>
                            <strong>NEXMAP · 设置中心</strong>
                        </div>

                        <div className="settings-jp-mobile-nav">
                            {TABS.map((tab) => (
                                <SettingsNavItem
                                    key={tab.id}
                                    tab={tab}
                                    active={activeTab === tab.id}
                                    compact
                                    onSelect={setActiveTab}
                                />
                            ))}
                        </div>

                        <div className="settings-jp-header-row">
                            <div className="settings-jp-heading">
                                <div>
                                    <p className="settings-jp-breadcrumb">设置中心</p>
                                    <h2>{activeMeta.title}</h2>
                                    <p className="settings-jp-subtitle">{activeMeta.subtitle}</p>
                                </div>
                            </div>

                            <div className="settings-jp-header-actions">
                                <button
                                    type="button"
                                    className="settings-jp-icon-button"
                                    onClick={onClose}
                                    disabled={isSaving}
                                    aria-label={cancelLabel}
                                    title={cancelLabel}
                                >
                                    <X size={19} strokeWidth={1.7} />
                                </button>
                                <button
                                    type="button"
                                    className={`settings-jp-button is-primary${isDirty ? ' has-change' : ''}`}
                                    onClick={onSave}
                                    disabled={isSaving}
                                >
                                    {isSaving
                                        ? <Loader2 size={15} className="animate-spin" />
                                        : <Save size={15} strokeWidth={1.8} />}
                                    {isSaving ? '保存中…' : saveLabel}
                                </button>
                            </div>
                        </div>

                        <SaveStatus status={saveStatus} />
                    </header>

                    <div className="settings-jp-scroll custom-scrollbar">
                        <div key={activeTab} className="settings-jp-content">
                            {children}
                        </div>
                    </div>
                </main>

                {overlay}
            </div>
        </div>
    );
}
