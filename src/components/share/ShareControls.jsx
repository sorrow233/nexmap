import React from 'react';
import {
    X, Check, Download, Copy, Palette, Layout,
    Settings, Maximize2, Loader2
} from 'lucide-react';

const ControlSection = ({ title, icon: Icon, children }) => (
    <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
            <Icon size={12} />
            <span>{title}</span>
        </div>
        {children}
    </div>
);

const ShareControls = ({
    themes,
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
    onClose,
    onCopy,
    onDownload,
    isCopying,
    isGenerating,
    copySuccess
}) => {

    // Helper to get active theme object
    const activeThemeObj = themes.find(t => t.id === currentTheme);
    const ThemeIcon = activeThemeObj?.icon;

    return (
        <div className="w-[360px] bg-zinc-900/95 backdrop-blur-xl border-l border-white/10 flex flex-col h-full text-zinc-100">
            {/* Header */}
            <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
                <span className="font-bold text-base tracking-tight flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></span>
                    Export Image
                </span>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                {/* Theme Selection */}
                <ControlSection title="Theme" icon={Palette}>
                    <div className="grid grid-cols-5 gap-3">
                        {themes.map(t => {
                            const Icon = t.icon;
                            const isActive = currentTheme === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id)}
                                    className={`group relative aspect-[3/4] rounded-xl transition-all duration-300 overflow-hidden ${isActive
                                            ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/20 scale-105'
                                            : 'ring-1 ring-white/10 hover:ring-white/30 hover:scale-105'
                                        }`}
                                >
                                    {/* Preview Fake UI */}
                                    <div className={`absolute inset-0 ${t.preview} opacity-80`} />
                                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${t.accent}`} />

                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                        <div className={`p-1.5 rounded-full ${isActive ? 'bg-indigo-500 text-white' : 'bg-black/20 text-zinc-400 group-hover:text-zinc-200'}`}>
                                            <Icon size={14} />
                                        </div>
                                    </div>

                                    {/* Label on Hover */}
                                    <div className={`absolute bottom-0 inset-x-0 py-1 text-[9px] font-bold text-center bg-black/40 backdrop-blur-md text-white/90 translate-y-full group-hover:translate-y-0 transition-transform ${isActive ? 'translate-y-0' : ''}`}>
                                        {t.label}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </ControlSection>

                {/* Layout Selection */}
                <ControlSection title="Layout" icon={Layout}>
                    <div className="grid grid-cols-2 gap-2">
                        {layouts.map(l => {
                            const Icon = l.icon;
                            const isActive = currentLayout === l.id;
                            return (
                                <button
                                    key={l.id}
                                    onClick={() => setLayout(l.id)}
                                    className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${isActive
                                            ? 'bg-white/10 border-indigo-500/50 text-white shadow-inner'
                                            : 'bg-transparent border-white/5 text-zinc-400 hover:bg-white/5 hover:border-white/10'
                                        }`}
                                >
                                    <Icon size={18} className={isActive ? 'text-indigo-400' : 'text-zinc-500'} />
                                    <div className="flex flex-col items-start">
                                        <span className="text-xs font-semibold">{l.label}</span>
                                        <span className="text-[10px] opacity-50">{l.desc}</span>
                                    </div>
                                    {isActive && <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                                </button>
                            );
                        })}
                    </div>
                </ControlSection>

                {/* Export Settings Group */}
                <ControlSection title="Export Settings" icon={Settings}>
                    <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/5">

                        {/* Resolution */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-medium text-zinc-400 uppercase">Quality Scale</label>
                            <div className="flex p-1 bg-black/20 rounded-lg">
                                {resolutions.map(r => (
                                    <button
                                        key={r.id}
                                        onClick={() => setResolution(r.id)}
                                        className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${currentResolution === r.id
                                                ? 'bg-zinc-700 text-white shadow-sm'
                                                : 'text-zinc-500 hover:text-zinc-300'
                                            }`}
                                    >
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                            <div className="text-[10px] text-zinc-500 text-right">
                                {resolutions.find(r => r.id === currentResolution)?.desc} Quality
                            </div>
                        </div>

                        {/* Format */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-medium text-zinc-400 uppercase">Format</label>
                            <div className="flex gap-2">
                                {formats.map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setFormat(f.id)}
                                        className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${currentFormat === f.id
                                                ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300'
                                                : 'bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-600'
                                            }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                </ControlSection>

                {/* Branding Toggle */}
                <button
                    onClick={() => setShowWatermark(!showWatermark)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${showWatermark
                            ? 'bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border-indigo-500/30'
                            : 'bg-white/5 border-white/5 hover:bg-white/10'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${showWatermark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/10 text-zinc-500'}`}>
                            <Maximize2 size={16} />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className={`text-sm font-medium ${showWatermark ? 'text-white' : 'text-zinc-400'}`}>
                                Branding
                            </span>
                            <span className="text-[10px] opacity-50">Show footer info</span>
                        </div>
                    </div>
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${showWatermark ? 'bg-indigo-500' : 'bg-zinc-700'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${showWatermark ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                </button>

            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-white/5 bg-zinc-900">
                <div className="flex gap-3">
                    <button
                        onClick={onCopy}
                        disabled={isCopying}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${copySuccess
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                : 'bg-white/5 text-zinc-300 border border-white/10 hover:bg-white/10 hover:text-white'
                            } disabled:opacity-50`}
                    >
                        {isCopying ? <Loader2 size={16} className="animate-spin" /> : copySuccess ? <Check size={16} /> : <Copy size={16} />}
                        {copySuccess ? 'Copied' : 'Copy'}
                    </button>

                    <button
                        onClick={onDownload}
                        disabled={isGenerating}
                        className="flex-[2] py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl shadow-lg shadow-indigo-500/25 font-bold text-sm transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        {isGenerating ? 'Exporting...' : 'Save Image'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareControls;
