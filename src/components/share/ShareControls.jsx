import React from 'react';
import {
    Check,
    Copy,
    Download,
    Image as ImageIcon,
    LayoutTemplate,
    Loader2,
    Sparkles
} from 'lucide-react';

const STATUS_STYLES = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    error: 'border-rose-200 bg-rose-50 text-rose-700',
    info: 'border-sky-200 bg-sky-50 text-sky-700'
};

function Surface({ children, className = '' }) {
    return (
        <section
            className={`overflow-hidden rounded-[28px] border border-slate-200/90 bg-white/92 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur ${className}`}
        >
            {children}
        </section>
    );
}

function SectionHeading({ title, subtitle, accent }) {
    return (
        <div className="space-y-1.5">
            {accent ? (
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-600">
                    {accent}
                </div>
            ) : null}
            <h3 className="text-base font-semibold tracking-tight text-slate-950">{title}</h3>
            {subtitle ? <p className="text-sm leading-6 text-slate-500">{subtitle}</p> : null}
        </div>
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

function SummaryPill({ icon: Icon, label }) {
    return (
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-2 text-xs font-medium text-slate-600 shadow-[0_6px_20px_rgba(15,23,42,0.06)]">
            <Icon size={14} className="text-slate-900" />
            {label}
        </span>
    );
}

function ThemeOption({ option, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`group flex items-start justify-between gap-4 rounded-[22px] border px-4 py-4 text-left transition-all duration-200 ${
                active
                    ? 'border-slate-900 bg-slate-950 text-white shadow-[0_20px_40px_rgba(15,23,42,0.18)]'
                    : 'border-slate-200 bg-slate-50/80 text-slate-900 hover:border-slate-300 hover:bg-white'
            }`}
        >
            <div className="min-w-0">
                <div className={`text-base font-semibold tracking-tight ${active ? 'text-white' : 'text-slate-950'}`}>
                    {option.label}
                </div>
                <div className={`mt-1 text-sm leading-6 ${active ? 'text-white/68' : 'text-slate-500'}`}>
                    {option.description}
                </div>
            </div>
            <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all ${
                    active
                        ? 'border-white/18 bg-white text-slate-950'
                        : 'border-slate-200 bg-white text-transparent group-hover:text-slate-300'
                }`}
            >
                <Check size={15} />
            </span>
        </button>
    );
}

function CompactOption({ option, active, onClick, icon: Icon, meta }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`rounded-[22px] border p-3 text-left transition-all duration-200 ${
                active
                    ? 'border-slate-900 bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]'
                    : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:border-slate-300 hover:bg-white'
            }`}
        >
            <div className="flex items-center justify-between gap-3">
                <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${
                        active ? 'bg-white/14 text-white' : 'bg-white text-slate-900'
                    }`}
                >
                    <Icon size={18} />
                </span>
                {meta ? (
                    <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                            active ? 'bg-white/12 text-white/80' : 'bg-slate-200/70 text-slate-500'
                        }`}
                    >
                        {meta}
                    </span>
                ) : null}
            </div>
            <div className={`mt-4 text-sm font-semibold ${active ? 'text-white' : 'text-slate-950'}`}>
                {option.label}
            </div>
        </button>
    );
}

function DescriptionNote({ text }) {
    if (!text) return null;

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-slate-500">
            {text}
        </div>
    );
}

export default function ShareControls({
    themeOptions,
    currentTheme,
    setTheme,
    layouts,
    currentLayout,
    setLayout,
    onCopy,
    onDownload,
    isCopying,
    isGenerating,
    canCopy,
    canExport,
    feedback,
    copy,
    autoQualityLabel,
    autoQualityHint
}) {
    const isBusy = isCopying || isGenerating;
    const currentLayoutMeta = layouts.find((option) => option.id === currentLayout) || layouts[0];

    return (
        <aside className="flex min-h-0 w-full flex-col bg-[radial-gradient(circle_at_top,#eef6ff_0%,#f8fafc_42%,#f4f7fb_100%)]">
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="space-y-5">
                    <Surface className="bg-[linear-gradient(145deg,rgba(255,255,255,0.96)_0%,rgba(245,250,255,0.96)_100%)]">
                        <div className="border-b border-slate-200/80 px-5 py-5">
                            <div className="flex items-start gap-4">
                                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-slate-950 text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)]">
                                    <Sparkles size={18} />
                                </span>
                                <div className="min-w-0">
                                    <SectionHeading
                                        accent="WebP First"
                                        title={copy.controlTitle}
                                        subtitle={copy.controlSubtitle}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4 px-5 py-4">
                            <div className="flex flex-wrap gap-2">
                                <SummaryPill icon={Download} label={copy.download} />
                                <SummaryPill icon={Copy} label={copy.copy} />
                                <SummaryPill icon={ImageIcon} label={autoQualityLabel} />
                            </div>
                            <p className="text-sm leading-6 text-slate-500">
                                {autoQualityHint}
                            </p>
                        </div>
                    </Surface>

                    <FeedbackBanner feedback={feedback} />

                    <Surface className="px-5 py-5">
                        <SectionHeading
                            title={copy.themeTitle}
                            subtitle={copy.themeSubtitle}
                        />
                        <div className="mt-4 grid grid-cols-1 gap-3">
                            {themeOptions.map((option) => (
                                <ThemeOption
                                    key={option.id}
                                    option={option}
                                    active={option.id === currentTheme}
                                    onClick={() => setTheme(option.id)}
                                />
                            ))}
                        </div>
                    </Surface>

                    <Surface className="px-5 py-5">
                        <SectionHeading
                            title={copy.layoutTitle}
                            subtitle={copy.layoutSubtitle}
                        />
                        <div className="mt-4 grid grid-cols-3 gap-3">
                            {layouts.map((option) => (
                                <CompactOption
                                    key={option.id}
                                    option={option}
                                    active={option.id === currentLayout}
                                    onClick={() => setLayout(option.id)}
                                    icon={LayoutTemplate}
                                    meta={option.size}
                                />
                            ))}
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                            <DescriptionNote text={currentLayoutMeta?.description} />
                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">
                                {copy.exportTitle}
                                <div className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
                                    {autoQualityLabel}
                                </div>
                            </div>
                        </div>
                    </Surface>
                </div>
            </div>

            <div className="border-t border-slate-200/80 bg-white/92 px-5 py-5 backdrop-blur sm:px-6">
                <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
                    <div className="grid grid-cols-1 gap-3">
                        <button
                            type="button"
                            onClick={onDownload}
                            disabled={isBusy || !canExport}
                            className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#020617_0%,#0f172a_58%,#1d4ed8_100%)] px-4 text-base font-semibold text-white shadow-[0_20px_35px_rgba(29,78,216,0.18)] transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            {isGenerating ? copy.downloading : canExport ? copy.download : copy.downloadDisabled}
                        </button>
                        <button
                            type="button"
                            onClick={onCopy}
                            disabled={isBusy || !canCopy || !canExport}
                            className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-900 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isCopying ? <Loader2 size={18} className="animate-spin" /> : <Copy size={18} />}
                            {isCopying ? copy.copying : !canExport ? copy.copyNoContent : canCopy ? copy.copy : copy.copyDisabled}
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    );
}
