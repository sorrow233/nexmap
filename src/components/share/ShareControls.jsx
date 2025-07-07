import React from 'react';
import {
    X, Check, Download, Copy, Palette, Layout,
    Settings, Maximize2, Loader2, Sparkles,
    Image as ImageIcon, FileType
} from 'lucide-react';

const ControlSection = ({ title, children, className = "" }) => (
    <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-500 uppercase tracking-widest px-1">
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
    return (
        <div className="w-[380px] bg-zinc-950/90 backdrop-blur-2xl border-l border-white/5 flex flex-col h-full text-zinc-100 shadow-2xl relative">
            {/* Visual Flair: Top Gradient */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />

            {/* Header */}
            <div className="h-20 px-6 border-b border-white/5 flex items-center justify-between shrink-0 relative z-10">
                <div className="flex flex-col">
                    <span className="font-bold text-lg tracking-tight flex items-center gap-2 text-white">
                        Export Image
                    </span>
                    <span className="text-xs text-zinc-500">Customize your snapshot</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all active:scale-95"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-8 custom-scrollbar relative z-10">

                {/* Theme Selection */}
                <ControlSection title="Theme">
                    <div className="grid grid-cols-2 gap-3">
                        {themes.map(t => {
                            const Icon = t.icon;
                            const isActive = currentTheme === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id)}
                                    className={`group relative h-16 rounded-xl border transition-all duration-300 overflow-hidden flex items-center px-4 gap-3 ${isActive
                                        ? 'border-indigo-500/50 bg-zinc-800/80 shadow-[0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/20'
                                        : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'
                                        }`}
                                >
                                    {/* Theme preview dot */}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${isActive ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                                        <Icon size={14} />
                                    </div>

                                    <div className="flex flex-col items-start z-10">
                                        <span className={`text-sm font-semibold transition-colors ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                                            {t.label}
                                        </span>
                                    </div>

                                    {/* Active Indicator */}
                                    {isActive && (
                                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-500" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </ControlSection>

                {/* Layout Selection */}
                <ControlSection title="Layout">
                    <div className="grid grid-cols-2 gap-3">
                        {layouts.map(l => {
                            const isActive = currentLayout === l.id;
                            // Aspect ratio visualization
                            const aspectRatioClass =
                                l.id === 'card' ? 'aspect-[4/3] w-5' :
                                    l.id === 'full' ? 'aspect-[3/4] w-4' :
                                        l.id === 'social' ? 'aspect-square w-5' :
                                            'aspect-video w-6';

                            return (
                                <button
                                    key={l.id}
                                    onClick={() => setLayout(l.id)}
                                    className={`relative flex flex-col items-start p-4 rounded-xl border transition-all duration-300 ${isActive
                                        ? 'bg-gradient-to-br from-zinc-800 to-zinc-900 border-indigo-500/50 text-white shadow-lg shadow-black/20'
                                        : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-white/5 hover:border-white/10'
                                        }`}
                                >
                                    <div className="flex items-center justify-between w-full mb-3">
                                        <div className={`rounded border ${aspectRatioClass} ${isActive ? 'bg-indigo-500 border-indigo-400' : 'bg-zinc-800 border-zinc-700'}`} />
                                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]" />}
                                    </div>

                                    <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-zinc-400'}`}>{l.label}</span>
                                    <span className="text-[10px] text-zinc-500 font-medium">{l.desc}</span>
                                </button>
                            );
                        })}
                    </div>
                </ControlSection>

                {/* Export Settings */}
                <ControlSection title="Settings">
                    <div className="space-y-4 p-5 rounded-2xl bg-black/20 border border-white/5 shadow-inner">

                        {/* Resolution */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1.5">
                                    <Maximize2 size={10} /> Scale
                                </label>
                                <span className="text-[10px] text-zinc-500">{resolutions.find(r => r.id === currentResolution)?.desc}</span>
                            </div>
                            <div className="flex bg-zinc-900/80 p-1 rounded-lg border border-white/5 relative">
                                {resolutions.map(r => (
                                    <button
                                        key={r.id}
                                        onClick={() => setResolution(r.id)}
                                        className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all relative z-10 ${currentResolution === r.id
                                            ? 'text-white'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                            }`}
                                    >
                                        {r.label}
                                    </button>
                                ))}
                                {/* Sliding Pill Background could be implemented with framer-motion, using simple placement for now */}
                                <div
                                    className="absolute top-1 bottom-1 bg-zinc-700/80 rounded-md transition-all duration-300 shadow-sm"
                                    style={{
                                        width: `${100 / resolutions.length - 2}%`,
                                        left: `${(resolutions.findIndex(r => r.id === currentResolution) * (100 / resolutions.length)) + 1}%`
                                    }}
                                />
                            </div>
                        </div>

                        {/* Format */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1.5">
                                    <FileType size={10} /> Format
                                </label>
                            </div>
                            <div className="flex gap-2">
                                {formats.map(f => {
                                    const isActive = currentFormat === f.id;
                                    return (
                                        <button
                                            key={f.id}
                                            onClick={() => setFormat(f.id)}
                                            className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-2 ${isActive
                                                ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.1)]'
                                                : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-800'
                                                }`}
                                        >
                                            {f.label}
                                            {isActive && <Check size={10} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Branding Toggle */}
                        <button
                            onClick={() => setShowWatermark(!showWatermark)}
                            className="w-full flex items-center justify-between pt-2 border-t border-white/5 mt-2 group"
                        >
                            <span className="text-[10px] font-bold text-zinc-400 uppercase group-hover:text-zinc-300 transition-colors">Show Branding</span>
                            <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-300 ${showWatermark ? 'bg-indigo-500' : 'bg-zinc-700'}`}>
                                <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-300 ${showWatermark ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                        </button>

                    </div>
                </ControlSection>

            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-white/5 bg-zinc-900/50 backdrop-blur-xl shrink-0">
                <div className="flex flex-col gap-3">
                    <button
                        onClick={onDownload}
                        disabled={isGenerating}
                        className="w-full h-12 relative bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl shadow-lg shadow-indigo-500/25 font-bold text-sm transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden group"
                    >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                        {isGenerating ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Exporting Landscape...</span>
                            </>
                        ) : (
                            <>
                                <Download size={18} />
                                <span>Save Image</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={onCopy}
                        disabled={isCopying}
                        className={`w-full h-10 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${copySuccess
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-transparent text-zinc-400 border border-transparent hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        {isCopying ? <Loader2 size={14} className="animate-spin" /> : copySuccess ? <Check size={14} /> : <Copy size={14} />}
                        {copySuccess ? 'Copied to Clipboard' : 'Copy to Clipboard'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareControls;
