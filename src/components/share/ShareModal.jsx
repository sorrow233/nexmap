import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { X, Check, Download, Layers, Layout, Palette, Image as ImageIcon, Loader2 } from 'lucide-react';
import ShareableContent from './ShareableContent';

export default function ShareModal({ isOpen, onClose, content }) {
    const [theme, setTheme] = useState(() => {
        if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
            return 'tech';
        }
        return 'business';
    });
    const [showWatermark, setShowWatermark] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    // We use a hidden ref for the high-res capture
    const captureRef = useRef(null);

    if (!isOpen) return null;

    const handleDownload = async () => {
        if (!captureRef.current) return;
        setIsGenerating(true);

        try {
            // Wait a moment for any renders
            await new Promise(resolve => setTimeout(resolve, 100));

            const isTechTheme = theme === 'tech';

            const canvas = await html2canvas(captureRef.current, {
                scale: 3, // Increased resolution for better clarity
                backgroundColor: isTechTheme ? '#020617' : '#ffffff', // Explicit background
                logging: false,
                useCORS: true
            });

            // Use JPEG for tech theme (handles gradients better/smaller size), PNG for business (crisp text)
            const fileType = isTechTheme ? 'image/jpeg' : 'image/png';
            const fileExt = isTechTheme ? 'jpg' : 'png';
            const quality = isTechTheme ? 0.95 : undefined;

            const image = canvas.toDataURL(fileType, quality);

            // Create download link
            const link = document.createElement('a');
            link.href = image;
            link.download = `neural-insight-${Date.now()}.${fileExt}`;
            link.click();
        } catch (err) {
            console.error("Capture failed:", err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-5xl h-[85vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex overflow-hidden border border-slate-200 dark:border-white/10 animate-fade-in">

                {/* Left: Preview Area */}
                <div className="flex-grow flex items-center justify-center bg-slate-100/50 dark:bg-slate-950/50 relative overflow-hidden p-8">
                    <div className="absolute inset-0 pattern-grid-lg opacity-[0.03] pointer-events-none" />

                    {/* Live Preview (Scaled fit) */}
                    <div className="transform scale-[0.6] sm:scale-[0.7] md:scale-[0.8] origin-center shadow-2xl rounded-xl transition-all duration-500">
                        <ShareableContent
                            content={content}
                            theme={theme}
                            showWatermark={showWatermark}
                        />
                    </div>
                </div>

                {/* Right: Controls */}
                <div className="w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/10 flex flex-col z-10">
                    <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
                        <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <ImageIcon size={20} className="text-brand-500" />
                            <span>Export Image</span>
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>

                    <div className="p-6 flex-grow space-y-8 overflow-y-auto">

                        {/* Theme Selection */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Palette size={14} /> Theme
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setTheme('business')}
                                    className={`p-3 rounded-xl border flex flex-col gap-2 items-center transition-all ${theme === 'business'
                                        ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 font-bold'
                                        : 'border-slate-200 dark:border-white/10 text-slate-500 hover:border-brand-200 dark:hover:border-white/20'
                                        }`}
                                >
                                    <div className="w-full h-8 bg-slate-100 rounded border border-slate-200" />
                                    <span className="text-sm">Business</span>
                                </button>
                                <button
                                    onClick={() => setTheme('tech')}
                                    className={`p-3 rounded-xl border flex flex-col gap-2 items-center transition-all ${theme === 'tech'
                                        ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 font-bold'
                                        : 'border-slate-200 dark:border-white/10 text-slate-500 hover:border-brand-200 dark:hover:border-white/20'
                                        }`}
                                >
                                    <div className="w-full h-8 bg-slate-900 rounded border border-slate-700" />
                                    <span className="text-sm">Tech</span>
                                </button>
                            </div>
                        </div>

                        {/* Watermark Toggle */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Layout size={14} /> settings
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

                    <div className="p-6 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50">
                        <button
                            onClick={handleDownload}
                            disabled={isGenerating}
                            className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-lg shadow-brand-500/20 font-bold text-sm tracking-wide transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            {isGenerating ? 'Generating...' : 'Save Image'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Hidden Capture Target - Rendered off-screen but valid in DOM */}
            <div className="fixed left-[-9999px] top-0 pointer-events-none">
                <ShareableContent
                    ref={captureRef}
                    content={content}
                    theme={theme}
                    showWatermark={showWatermark}
                />
            </div>
        </div>
    );
}
