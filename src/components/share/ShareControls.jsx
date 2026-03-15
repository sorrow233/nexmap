import React from 'react';
import {
    Check,
    Copy,
    Download,
    FileText,
    Image as ImageIcon,
    Loader2,
    Maximize2,
    MessageSquare,
    Monitor,
    ShieldCheck,
    Square,
    Wand2
} from 'lucide-react';

const LAYOUT_ICONS = {
    card: MessageSquare,
    full: FileText,
    social: Square,
    slide: Monitor
};

const STATUS_STYLES = {
    success: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
    error: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
    info: 'border-cyan-400/20 bg-cyan-500/10 text-cyan-100'
};

function Section({ title, subtitle, children }) {
    return (
        <section className="space-y-4">
            <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                {subtitle ? <p className="text-xs leading-5 text-slate-400">{subtitle}</p> : null}
            </div>
            {children}
        </section>
    );
}

function ThemeCard({ theme, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`group relative overflow-hidden rounded-2xl border p-3 text-left transition-all duration-200 ${
                active
                    ? 'border-cyan-400/40 bg-white/10 shadow-[0_12px_32px_rgba(18,205,255,0.12)]'
                    : 'border-white/8 bg-white/[0.04] hover:border-white/16 hover:bg-white/[0.07]'
            }`}
        >
            <div
                className="mb-3 h-16 rounded-xl border border-black/10 shadow-inner"
                style={{
                    background: `linear-gradient(135deg, ${theme.bg} 0%, ${theme.bg} 62%, ${theme.accent} 100%)`
                }}
            />
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-sm font-semibold text-white">{theme.label}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">{theme.id}</div>
                </div>
                {active ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400 text-slate-950">
                        <Check size={14} />
                    </span>
                ) : null}
            </div>
        </button>
    );
}

function ChoiceCard({ title, description, meta, active, onClick, icon: Icon }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
                active
                    ? 'border-cyan-400/40 bg-cyan-400/10 text-white shadow-[0_10px_28px_rgba(18,205,255,0.08)]'
                    : 'border-white/8 bg-white/[0.04] text-slate-200 hover:border-white/16 hover:bg-white/[0.07]'
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${
                        active ? 'bg-cyan-400 text-slate-950' : 'bg-white/8 text-slate-300'
                    }`}
                >
                    <Icon size={18} />
                </span>
                {active ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400 text-slate-950">
                        <Check size={14} />
                    </span>
                ) : null}
            </div>
            <div className="mt-4 text-sm font-semibold">{title}</div>
            <div className="mt-1 text-xs leading-5 text-slate-400">{description}</div>
            {meta ? <div className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{meta}</div> : null}
        </button>
    );
}

function StatusBanner({ feedback }) {
    if (!feedback) return null;

    return (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${STATUS_STYLES[feedback.type] || STATUS_STYLES.info}`}>
            {feedback.message}
        </div>
    );
}

export default function ShareControls({
    themeSections,
    currentTheme,
    setTheme,
    layouts,
    currentLayout,
    setLayout,
    resolutions,
    currentResolution,
    setResolution,
    formats,
    currentFormat,
    setFormat,
    showWatermark,
    setShowWatermark,
    onCopy,
    onDownload,
    isCopying,
    isGenerating,
    canCopy,
    feedback,
    copy
}) {
    return (
        <aside className="flex w-full flex-col bg-[#07111b]/94 text-white xl:w-[430px]">
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
                <div className="space-y-6">
                    <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/14 text-cyan-200">
                                <Wand2 size={18} />
                            </span>
                            <div>
                                <div className="text-sm font-semibold text-white">{copy.controlTitle}</div>
                                <div className="mt-1 text-xs leading-5 text-slate-400">{copy.controlSubtitle}</div>
                            </div>
                        </div>
                    </div>

                    <StatusBanner feedback={feedback} />

                    <Section title={copy.themeTitle} subtitle={copy.themeSubtitle}>
                        <div className="space-y-5">
                            {themeSections.map((section) => (
                                <div key={section.id} className="space-y-3">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                        {copy.themeSections?.[section.id] || section.id}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {section.themes.map((theme) => (
                                            <ThemeCard
                                                key={theme.id}
                                                theme={theme}
                                                active={theme.id === currentTheme}
                                                onClick={() => setTheme(theme.id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section title={copy.layoutTitle} subtitle={copy.layoutSubtitle}>
                        <div className="grid grid-cols-2 gap-3">
                            {layouts.map((layout) => {
                                const Icon = LAYOUT_ICONS[layout.id] || FileText;
                                return (
                                    <ChoiceCard
                                        key={layout.id}
                                        title={layout.label}
                                        description={layout.description}
                                        meta={layout.size}
                                        active={layout.id === currentLayout}
                                        onClick={() => setLayout(layout.id)}
                                        icon={Icon}
                                    />
                                );
                            })}
                        </div>
                    </Section>

                    <Section title={copy.exportTitle} subtitle={copy.exportSubtitle}>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {resolutions.map((resolution) => (
                                <ChoiceCard
                                    key={resolution.id}
                                    title={resolution.label}
                                    description={resolution.description}
                                    meta={resolution.shortLabel}
                                    active={resolution.id === currentResolution}
                                    onClick={() => setResolution(resolution.id)}
                                    icon={Maximize2}
                                />
                            ))}
                            {formats.map((format) => (
                                <ChoiceCard
                                    key={format.id}
                                    title={format.label}
                                    description={format.description}
                                    meta={format.meta}
                                    active={format.id === currentFormat}
                                    onClick={() => setFormat(format.id)}
                                    icon={ImageIcon}
                                />
                            ))}
                        </div>
                    </Section>

                    <Section title={copy.brandingTitle} subtitle={copy.brandingSubtitle}>
                        <button
                            type="button"
                            onClick={() => setShowWatermark(!showWatermark)}
                            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-left transition-colors hover:bg-white/[0.07]"
                        >
                            <div className="flex items-center gap-3">
                                <span
                                    className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${
                                        showWatermark ? 'bg-cyan-400/14 text-cyan-200' : 'bg-white/8 text-slate-400'
                                    }`}
                                >
                                    <ShieldCheck size={18} />
                                </span>
                                <div>
                                    <div className="text-sm font-semibold text-white">{copy.brandingToggle}</div>
                                    <div className="mt-1 text-xs leading-5 text-slate-400">{copy.brandingHint}</div>
                                </div>
                            </div>
                            <div
                                className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
                                    showWatermark ? 'bg-cyan-400' : 'bg-white/12'
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

            <div className="border-t border-white/10 bg-[#050c15]/95 px-5 py-5 sm:px-6">
                <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs leading-5 text-slate-400">
                    {copy.safeHint}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <button
                        type="button"
                        onClick={onDownload}
                        disabled={isGenerating}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 text-sm font-semibold text-slate-950 transition-transform duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        {isGenerating ? copy.downloading : copy.download}
                    </button>
                    <button
                        type="button"
                        onClick={onCopy}
                        disabled={isCopying || !canCopy}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isCopying ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                        {isCopying ? copy.copying : canCopy ? copy.copy : copy.copyDisabled}
                    </button>
                </div>
            </div>
        </aside>
    );
}
