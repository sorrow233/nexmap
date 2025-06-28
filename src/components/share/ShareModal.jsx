import React, { useState, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { X, Check, Download, Copy, Palette, Image as ImageIcon, Loader2, Layout, Settings, Maximize2 } from 'lucide-react';
import ShareableContent from './ShareableContent';

// Theme configurations
const THEMES = [
    { id: 'business', label: 'Business', preview: 'bg-slate-100 border-slate-200' },
    { id: 'tech', label: 'Tech', preview: 'bg-slate-900 border-slate-700' },
    { id: 'minimal', label: 'Minimal', preview: 'bg-white border-slate-200' },
    { id: 'darkpro', label: 'Dark Pro', preview: 'bg-black border-slate-800' },
    { id: 'colorful', label: 'Colorful', preview: 'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-400' },
];

// Layout configurations
const LAYOUTS = [
    { id: 'card', label: 'Card', icon: '▢', width: 800, aspectRatio: null },
    { id: 'full', label: 'Full', icon: '□', width: 800, aspectRatio: null },
    { id: 'social', label: 'Social', icon: '■', width: 800, aspectRatio: 1 },
    { id: 'slide', label: 'Slide', icon: '▭', width: 1280, aspectRatio: 16 / 9 },
];

// Resolution options
const RESOLUTIONS = [
    { id: 1, label: '1x', scale: 1 },
    { id: 2, label: '2x', scale: 2 },
    { id: 3, label: '3x', scale: 3 },
];

// Format options
const FORMATS = [
    { id: 'png', label: 'PNG', mime: 'image/png', ext: 'png' },
    { id: 'jpeg', label: 'JPEG', mime: 'image/jpeg', ext: 'jpg' },
    { id: 'webp', label: 'WebP', mime: 'image/webp', ext: 'webp' },
];

export default function ShareModal({ isOpen, onClose, content }) {
    // Theme and layout state
    const [theme, setTheme] = useState(() => {
        if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
            return 'tech';
        }
        return 'business';
    });
    const [layout, setLayout] = useState('card');
    const [showWatermark, setShowWatermark] = useState(true);

    // Export options state
    const [resolution, setResolution] = useState(2);
    const [format, setFormat] = useState('png');
    const [quality, setQuality] = useState(0.92);

    // UI state
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const captureRef = useRef(null);

    if (!isOpen) return null;

    // Get background color based on theme
    const getBackgroundColor = (themeId) => {
        switch (themeId) {
            case 'business': return '#f8fafc';
            case 'tech': return '#020617';
            case 'minimal': return '#ffffff';
            case 'darkpro': return '#000000';
            case 'colorful': return '#1e1b4b';
            default: return '#ffffff';
        }
    };

    // Generate canvas from content
    const generateCanvas = async () => {
        if (!captureRef.current) return null;

        // Wait for fonts to load
        await document.fonts.ready;

        // Small delay for render
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(captureRef.current, {
            scale: resolution,
            backgroundColor: getBackgroundColor(theme),
            logging: false,
            useCORS: true,
            allowTaint: false,
        });

        return canvas;
    };

    // Download image
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
            link.download = `nexmap-export-${Date.now()}.${formatConfig.ext}`;
            link.click();
        } catch (err) {
            console.error("Export failed:", err);
        } finally {
            setIsGenerating(false);
        }
    };

    // Copy to clipboard
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

    const currentLayout = LAYOUTS.find(l => l.id === layout);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-6xl h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex overflow-hidden border border-slate-200 dark:border-white/10 animate-fade-in">

                {/* Left: Preview Area */}
                <div className="flex-grow flex items-center justify-center bg-slate-100/50 dark:bg-slate-950/50 relative overflow-hidden p-8">
                    <div className="absolute inset-0 pattern-grid-lg opacity-[0.03] pointer-events-none" />

                    {/* Live Preview (Scaled fit) */}
                    <div className="transform scale-[0.5] sm:scale-[0.55] md:scale-[0.6] origin-center shadow-2xl rounded-xl transition-all duration-500">
                        <ShareableContent
                            content={content}
                            theme={theme}
                            layout={layout}
                            showWatermark={showWatermark}
                        />
                    </div>
                </div>

                {/* Right: Controls */}
                <div className="w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/10 flex flex-col z-10">
                    <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
                        <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <ImageIcon size={20} className="text-brand-500" />
                            <span>Export Image</span>
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>

                    <div className="p-5 flex-grow space-y-6 overflow-y-auto">

                        {/* Theme Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Palette size={12} /> Theme
                            </label>
                            <div className="grid grid-cols-5 gap-2">
                                {THEMES.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t.id)}
                                        className={`group relative p-1.5 rounded-lg border-2 transition-all ${theme === t.id
                                                ? 'border-brand-500 ring-2 ring-brand-500/20'
                                                : 'border-transparent hover:border-slate-300 dark:hover:border-white/20'
                                            }`}
                                        title={t.label}
                                    >
                                        <div className={`w-full aspect-square rounded ${t.preview} border`} />
                                        {theme === t.id && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 rounded-full flex items-center justify-center">
                                                <Check size={10} className="text-white" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                                {THEMES.find(t => t.id === theme)?.label}
                            </p>
                        </div>

                        {/* Layout Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Layout size={12} /> Layout
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {LAYOUTS.map(l => (
                                    <button
                                        key={l.id}
                                        onClick={() => setLayout(l.id)}
                                        className={`p-2 rounded-lg border text-center transition-all ${layout === l.id
                                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400'
                                                : 'border-slate-200 dark:border-white/10 text-slate-500 hover:border-brand-200 dark:hover:border-white/20'
                                            }`}
                                    >
                                        <div className="text-lg mb-0.5">{l.icon}</div>
                                        <div className="text-[10px] font-medium">{l.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Export Options */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Settings size={12} /> Export Options
                            </label>

                            {/* Resolution */}
                            <div className="space-y-1.5">
                                <span className="text-xs text-slate-500 dark:text-slate-400">Resolution</span>
                                <div className="flex gap-2">
                                    {RESOLUTIONS.map(r => (
                                        <button
                                            key={r.id}
                                            onClick={() => setResolution(r.scale)}
                                            className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-all ${resolution === r.scale
                                                    ? 'bg-brand-500 text-white'
                                                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                                                }`}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Format */}
                            <div className="space-y-1.5">
                                <span className="text-xs text-slate-500 dark:text-slate-400">Format</span>
                                <div className="flex gap-2">
                                    {FORMATS.map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => setFormat(f.id)}
                                            className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-all ${format === f.id
                                                    ? 'bg-brand-500 text-white'
                                                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                                                }`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Quality (only for JPEG/WebP) */}
                            {format !== 'png' && (
                                <div className="space-y-1.5">
                                    <div className="flex justify-between">
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Quality</span>
                                        <span className="text-xs font-mono text-brand-500">{Math.round(quality * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="1"
                                        step="0.01"
                                        value={quality}
                                        onChange={(e) => setQuality(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-500"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Settings */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Maximize2 size={12} /> Settings
                            </label>
                            <button
                                onClick={() => setShowWatermark(!showWatermark)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${showWatermark
                                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                                    : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
                                    }`}
                            >
                                <span className={`text-sm font-medium ${showWatermark ? 'text-brand-700 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                    Show Footer & Branding
                                </span>
                                {showWatermark && <Check size={16} className="text-brand-500" />}
                            </button>
                        </div>

                    </div>

                    {/* Action Buttons */}
                    <div className="p-5 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                        <div className="flex gap-2">
                            <button
                                onClick={handleCopyToClipboard}
                                disabled={isCopying}
                                className={`flex-1 py-3 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${copySuccess
                                        ? 'bg-green-500 text-white'
                                        : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/15'
                                    } disabled:opacity-70 disabled:cursor-not-allowed`}
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
                                className="flex-[2] py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-lg shadow-brand-500/20 font-bold text-sm tracking-wide transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                {isGenerating ? 'Generating...' : 'Save Image'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden Capture Target - Rendered off-screen but valid in DOM */}
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
