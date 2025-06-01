import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { X, Check, Download, Copy, Palette, Image as ImageIcon, Loader2, Layout, Settings, Maximize2, Star, Zap, Gem, Flame, Sparkles } from 'lucide-react';
import ShareableContent from './ShareableContent';

// Theme configurations with premium previews
const THEMES = [
    {
        id: 'business',
        label: 'Executive',
        icon: Star,
        preview: 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200',
        accent: 'bg-slate-900',
    },
    {
        id: 'tech',
        label: 'Midnight',
        icon: Zap,
        preview: 'bg-gradient-to-br from-slate-950 to-indigo-950 border-indigo-900/50',
        accent: 'bg-gradient-to-r from-indigo-500 to-purple-500',
    },
    {
        id: 'minimal',
        label: 'Paper',
        icon: Gem,
        preview: 'bg-white border-zinc-200',
        accent: 'bg-zinc-900',
    },
    {
        id: 'darkpro',
        label: 'Obsidian',
        icon: Flame,
        preview: 'bg-gradient-to-br from-zinc-950 to-black border-zinc-800',
        accent: 'bg-gradient-to-r from-amber-500 to-orange-500',
    },
    {
        id: 'colorful',
        label: 'Aurora',
        icon: Sparkles,
        preview: 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 border-purple-700/50',
        accent: 'bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400',
    },
];

// Layout configurations
const LAYOUTS = [
    { id: 'card', label: 'Card', desc: 'Standard' },
    { id: 'full', label: 'Full', desc: 'Compact' },
    { id: 'social', label: 'Social', desc: 'Square' },
    { id: 'slide', label: 'Slide', desc: 'Wide' },
];

// Resolution options (Clarity Scale, NOT width)
// Base: scale=5 (5x the old 1x clarity), each step adds 25%
const RESOLUTIONS = [
    { id: 5, label: '1x', desc: '📱 Mobile', outputWidth: 5895 },
    { id: 6.25, label: '2x', desc: '💻 Desktop', outputWidth: 7369 },
    { id: 7.5, label: '3x', desc: '🖼️ Print', outputWidth: 8843 },
];

// Format options
const FORMATS = [
    { id: 'png', label: 'PNG', mime: 'image/png', ext: 'png' },
    { id: 'jpeg', label: 'JPEG', mime: 'image/jpeg', ext: 'jpg' },
    { id: 'webp', label: 'WebP', mime: 'image/webp', ext: 'webp' },
];

// Get background color for html2canvas based on theme
const getThemeBackground = (themeId) => {
    const bgColors = {
        business: '#f8fafc',
        tech: '#020617',
        minimal: '#ffffff',
        darkpro: '#09090b',
        colorful: '#1e1b4b',
    };
    return bgColors[themeId] || '#ffffff';
};

export default function ShareModal({ isOpen, onClose, content }) {
    const [theme, setTheme] = useState('business');
    const [layout, setLayout] = useState('card');
    const [showWatermark, setShowWatermark] = useState(true);
    const [resolution, setResolution] = useState(5); // 5x clarity = new 1x
    const [format, setFormat] = useState('webp');
    const [quality, setQuality] = useState(0.92);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const captureRef = useRef(null);

    if (!isOpen) return null;

    const generateCanvas = async () => {
        if (!captureRef.current) return null;
        await document.fonts.ready;
        await new Promise(resolve => setTimeout(resolve, 150));

        const canvas = await html2canvas(captureRef.current, {
            scale: resolution,
            backgroundColor: getThemeBackground(theme),
            logging: false,
            useCORS: true,
            allowTaint: false,
        });
        return canvas;
    };

    const handleDownload = async () => {
        setIsGenerating(true);
        try {
            const canvas = await generateCanvas();
            if (!canvas) return;

            const formatConfig = FORMATS.find(f => f.id === format);
            const needsQuality = format !== 'png';
            const image = canvas.toDataURL(formatConfig.mime, needsQuality ? quality : undefined);

            const link = document.createElement('a');
            link.href = image;
            link.download = `nexmap-${theme}-${Date.now()}.${formatConfig.ext}`;
            link.click();
        } catch (err) {
            console.error("Export failed:", err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyToClipboard = async () => {
        setIsCopying(true);
        setCopySuccess(false);
        try {
            const canvas = await generateCanvas();
            if (!canvas) return;

            canvas.toBlob(async (blob) => {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 2000);
                } catch (err) {
                    console.error("Copy failed:", err);
                }
                setIsCopying(false);
            }, 'image/png');
        } catch (err) {
            console.error("Copy failed:", err);
            setIsCopying(false);
        }
    };

    const currentTheme = THEMES.find(t => t.id === theme);
    const ThemeIcon = currentTheme?.icon || Star;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-6xl h-[90vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl flex overflow-hidden border border-zinc-200 dark:border-zinc-700/50">

                {/* Left: Preview Area */}
                <div className="flex-grow flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden">
                    {/* Background pattern */}
                    <div className="absolute inset-0 opacity-50" style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)`,
                        backgroundSize: '20px 20px'
                    }} />

                    {/* Live Preview */}
                    <div className="transform scale-[0.45] sm:scale-[0.5] lg:scale-[0.55] origin-center transition-transform duration-300">
                        <ShareableContent
                            content={content}
                            theme={theme}
                            layout={layout}
                            showWatermark={showWatermark}
                        />
                    </div>
                </div>

                {/* Right: Controls */}
                <div className="w-[340px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-700/50 flex flex-col">
                    {/* Header */}
                    <div className="p-5 border-b border-zinc-200 dark:border-zinc-700/50 flex justify-between items-center">
                        <h2 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <ImageIcon size={16} className="text-white" />
                            </div>
                            Export Image
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                            <X size={18} className="text-zinc-500" />
                        </button>
                    </div>

                    <div className="p-5 flex-grow space-y-6 overflow-y-auto">

                        {/* Theme Selection */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <Palette size={12} /> Theme
                            </label>
                            <div className="grid grid-cols-5 gap-2">
                                {THEMES.map(t => {
                                    const Icon = t.icon;
                                    return (
                                        <button
                                            key={t.id}
                                            onClick={() => setTheme(t.id)}
                                            className={`group relative p-1 rounded-xl border-2 transition-all duration-200 ${theme === t.id
                                                ? 'border-indigo-500 shadow-lg shadow-indigo-500/20'
                                                : 'border-transparent hover:border-zinc-300 dark:hover:border-zinc-600'
                                                }`}
                                            title={t.label}
                                        >
                                            <div className={`w-full aspect-[3/4] rounded-lg ${t.preview} border overflow-hidden flex flex-col`}>
                                                <div className={`h-1 ${t.accent}`} />
                                                <div className="flex-1 flex items-center justify-center">
                                                    <Icon size={12} className="opacity-30" />
                                                </div>
                                            </div>
                                            {theme === t.id && (
                                                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                                                    <Check size={10} className="text-white" strokeWidth={3} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                                <ThemeIcon size={12} />
                                <span className="font-medium">{currentTheme?.label}</span>
                            </div>
                        </div>

                        {/* Layout Selection */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <Layout size={12} /> Layout
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {LAYOUTS.map(l => (
                                    <button
                                        key={l.id}
                                        onClick={() => setLayout(l.id)}
                                        className={`p-2.5 rounded-xl border transition-all duration-200 ${layout === l.id
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                            }`}
                                    >
                                        <div className="text-[10px] font-bold">{l.label}</div>
                                        <div className="text-[9px] opacity-60 mt-0.5">{l.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Export Options */}
                        <div className="space-y-4">
                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <Settings size={12} /> Export Options
                            </label>

                            {/* Resolution (Device-Centric) */}
                            <div className="space-y-2">
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">Best For</span>
                                <div className="flex gap-2">
                                    {RESOLUTIONS.map(r => (
                                        <button
                                            key={r.id}
                                            onClick={() => setResolution(r.id)}
                                            className={`flex-1 py-2.5 px-2 rounded-xl text-center transition-all ${resolution === r.id
                                                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md'
                                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                                }`}
                                        >
                                            <div className="text-[11px] font-bold">{r.desc}</div>
                                            <div className="text-[9px] opacity-60 mt-0.5">{r.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Format */}
                            <div className="space-y-2">
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">Format</span>
                                <div className="flex gap-2">
                                    {FORMATS.map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => setFormat(f.id)}
                                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${format === f.id
                                                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md'
                                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                                }`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Quality */}
                            {format !== 'png' && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Quality</span>
                                        <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">{Math.round(quality * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="1"
                                        step="0.01"
                                        value={quality}
                                        onChange={(e) => setQuality(parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Watermark Toggle */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <Maximize2 size={12} /> Settings
                            </label>
                            <button
                                onClick={() => setShowWatermark(!showWatermark)}
                                className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${showWatermark
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                                    : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                    }`}
                            >
                                <span className={`text-sm font-medium ${showWatermark ? 'text-indigo-700 dark:text-indigo-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                    Show Footer & Branding
                                </span>
                                {showWatermark && <Check size={16} className="text-indigo-500" />}
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="p-5 border-t border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-900/50">
                        <div className="flex gap-2">
                            <button
                                onClick={handleCopyToClipboard}
                                disabled={isCopying}
                                className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${copySuccess
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                                    } disabled:opacity-60`}
                            >
                                {isCopying ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : copySuccess ? (
                                    <Check size={16} />
                                ) : (
                                    <Copy size={16} />
                                )}
                                {copySuccess ? 'Copied!' : 'Copy'}
                            </button>
                            <button
                                onClick={handleDownload}
                                disabled={isGenerating}
                                className="flex-[2] py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl shadow-lg shadow-indigo-500/25 font-bold text-sm transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                {isGenerating ? 'Generating...' : 'Save Image'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden Capture Target */}
            <div className="fixed left-[-9999px] top-0 pointer-events-none">
                <ShareableContent
                    ref={captureRef}
                    content={content}
                    theme={theme}
                    layout={layout}
                    showWatermark={showWatermark}
                />
            </div>
        </div>
    );
}
