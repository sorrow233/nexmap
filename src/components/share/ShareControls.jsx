import React from 'react';
import {
    Check,
    Copy,
    Download,
    Image as ImageIcon,
    LayoutTemplate,
    Loader2,
    ShieldCheck,
    Sparkles
} from 'lucide-react';

const STATUS_STYLES = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    error: 'border-rose-200 bg-rose-50 text-rose-700',
    info: 'border-sky-200 bg-sky-50 text-sky-700'
};

function Section({ title, subtitle, children }) {
    return (
        <section className="space-y-3">
            <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                {subtitle ? <p className="text-xs leading-5 text-slate-500">{subtitle}</p> : null}
            </div>
            {children}
        </section>
    );
}

function FeedbackBanner({ feedback }) {
    if (!feedback) return null;

    return (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${STATUS_STYLES[feedback.type] || STATUS_STYLES.info}`}>
            {feedback.message}
        </div>
    );
}

function ThemeOption({ option, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-2xl border p-3 text-left transition-all ${
                active
                    ? 'border-slate-900 bg-slate-950 text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
            }`}
        >
            <div
                className="mb-3 h-12 rounded-2xl border"
                style={{
                    background: `linear-gradient(135deg, ${option.bg} 0%, ${option.bg} 62%, ${option.accent} 100%)`,
                    borderColor: active ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.08)'
                }}
            />
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-900'}`}>
                        {option.label}
                    </div>
                    <div className={`mt-1 text-xs ${active ? 'text-white/65' : 'text-slate-500'}`}>
                        {option.description}
                    </div>
                </div>
                {active ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-950">
                        <Check size={14} />
                    </span>
                ) : null}
            </div>
        </button>
    );
}

function ChoiceOption({ option, active, onClick, icon: Icon }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                active
                    ? 'border-sky-300 bg-sky-50 text-slate-950'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
            }`}
        >
            <div className="flex items-center gap-3">
                <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${
                        active ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                >
                    <Icon size={18} />
                </span>
                <div className="min-w-0">
                    <div className="text-sm font-semibold">{option.label}</div>
                    <div className="mt-1 text-xs text-slate-500">{option.description}</div>
                </div>
            </div>
        </button>
    );
}

export default function ShareControls({
    themeOptions,
    currentTheme,
    setTheme,
    layouts,
    currentLayout,
    setLayout,
    resolutions,
    currentResolution,
    setResolution,
    showWatermark,
    setShowWatermark,
    onCopy,
    onDownload,
    isCopying,
    isGenerating,
    canCopy,
    canExport,
    feedback,
    copy
}) {
    const isBusy = isCopying || isGenerating;

    return (
        <aside className="flex min-h-0 w-full flex-col bg-[#f8fafc] md:w-full">
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="space-y-6">
                    <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                        <div className="flex items-start gap-3">
                            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                                <Sparkles size={18} />
                            </span>
                            <div>
                                <div className="text-sm font-semibold text-slate-950">{copy.controlTitle}</div>
                                <div className="mt-1 text-xs leading-5 text-slate-500">{copy.controlSubtitle}</div>
                            </div>
                        </div>
                    </div>

                    <FeedbackBanner feedback={feedback} />

                    <Section title={copy.themeTitle} subtitle={copy.themeSubtitle}>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {themeOptions.map((option) => (
                                <ThemeOption
                                    key={option.id}
                                    option={option}
                                    active={option.id === currentTheme}
                                    onClick={() => setTheme(option.id)}
                                />
                            ))}
                        </div>
                    </Section>

                    <Section title={copy.layoutTitle} subtitle={copy.layoutSubtitle}>
                        <div className="grid grid-cols-1 gap-3">
                            {layouts.map((option) => (
                                <ChoiceOption
                                    key={option.id}
                                    option={option}
                                    active={option.id === currentLayout}
                                    onClick={() => setLayout(option.id)}
                                    icon={LayoutTemplate}
                                />
                            ))}
                        </div>
                    </Section>

                    <Section title={copy.exportTitle} subtitle={copy.exportSubtitle}>
                        <div className="grid grid-cols-1 gap-3">
                            {resolutions.map((option) => (
                                <ChoiceOption
                                    key={option.id}
                                    option={option}
                                    active={option.id === currentResolution}
                                    onClick={() => setResolution(option.id)}
                                    icon={ImageIcon}
                                />
                            ))}
                        </div>
                    </Section>

                    <Section title={copy.formatHintTitle} subtitle={copy.formatHintSubtitle}>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                            <div className="font-semibold text-slate-900">{copy.formatHintBody}</div>
                            <div className="mt-2 text-xs leading-5 text-slate-500">{copy.safeHint}</div>
                        </div>
                    </Section>

                    <Section title={copy.brandingTitle} subtitle={copy.brandingSubtitle}>
                        <button
                            type="button"
                            onClick={() => setShowWatermark(!showWatermark)}
                            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition-colors hover:bg-slate-50"
                        >
                            <div className="flex items-center gap-3">
                                <span
                                    className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${
                                        showWatermark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-500'
                                    }`}
                                >
                                    <ShieldCheck size={18} />
                                </span>
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">{copy.brandingToggle}</div>
                                    <div className="mt-1 text-xs leading-5 text-slate-500">{copy.brandingHint}</div>
                                </div>
                            </div>
                            <div
                                className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
                                    showWatermark ? 'bg-slate-950' : 'bg-slate-200'
                                }`}
                            >
                                <div
                                    className={`h-5 w-5 rounded-full bg-white transition-transform ${
                                        showWatermark ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </div>
                        </button>
                    </Section>
                </div>
            </div>

            <div className="border-t border-slate-200 bg-white px-5 py-5 sm:px-6">
                <div className="grid grid-cols-1 gap-3">
                    <button
                        type="button"
                        onClick={onDownload}
                        disabled={isBusy || !canExport}
                        className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-base font-semibold text-white transition-transform duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        {isGenerating ? copy.downloading : canExport ? copy.download : copy.downloadDisabled}
                    </button>
                    <button
                        type="button"
                        onClick={onCopy}
                        disabled={isBusy || !canCopy || !canExport}
                        className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isCopying ? <Loader2 size={18} className="animate-spin" /> : <Copy size={18} />}
                        {isCopying ? copy.copying : !canExport ? copy.copyNoContent : canCopy ? copy.copy : copy.copyDisabled}
                    </button>
                </div>
            </div>
        </aside>
    );
}
