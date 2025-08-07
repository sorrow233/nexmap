import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Star, Sparkles, MessageSquare, FileText, Instagram, Monitor, Feather, Coffee, Cloud, Music, Heart, Sun, Waves, Flower, Leaf, Mountain, Grid, Type, Box, Hash, AlignLeft, Maximize, Layout, Book, School, Palette, Moon, Wind, PenTool, LayoutTemplate, Ghost } from 'lucide-react';
import ShareableContent from './ShareableContent';
import SharePreview from './SharePreview';
import ShareControls from './ShareControls';
import { getThemeBackground } from './themeConfigs';

// Theme categories for the UI
const THEME_CATEGORIES = [
    {
        name: 'Premium Themes',
        themes: [
            { id: 'editorial', label: 'Editorial', icon: Star, preview: 'bg-[#FDFBF7] border-slate-200', accent: 'bg-[#8B0000]' },
            { id: 'zen', label: 'Zen', icon: Feather, preview: 'bg-[#F8F9FA] border-gray-100', accent: 'bg-[#ADB5BD]' },
            { id: 'academia', label: 'Academia', icon: School, preview: 'bg-[#F5F5F0] border-[#C5A059]', accent: 'bg-[#C5A059]' },
            { id: 'ghibli', label: 'Ghibli', icon: Mountain, preview: 'bg-[#F5F5DC] border-[#8F9779]', accent: 'bg-[#8F9779]' },
            { id: 'rainy', label: 'Rainy', icon: Cloud, preview: 'bg-[#CFD8DC] border-[#455A64]', accent: 'bg-[#455A64]' },
        ]
    }
];

// Flatten for internal logic
const THEMES = THEME_CATEGORIES.flatMap(cat => cat.themes);

// Layout configurations
const LAYOUTS = [
    { id: 'card', label: 'Message', desc: 'Auto fit', icon: MessageSquare },
    { id: 'full', label: 'Document', desc: 'A4 / Doc', icon: FileText },
    { id: 'social', label: 'Social', desc: 'Square 1:1', icon: Instagram },
    { id: 'slide', label: 'Presentation', desc: '16:9', icon: Monitor },
];

// Resolution options (Clarity Scale for html2canvas)
// Safe range: 2-3x to prevent WebP encoding failures on large canvases
const RESOLUTIONS = [
    { id: 3, label: '1x', desc: 'Mobile', outputWidth: 3537 },      // Base: 3.0
    { id: 3.45, label: '2x', desc: 'Desktop', outputWidth: 4067 },  // +15%: 3.45
    { id: 3.97, label: '3x', desc: 'Print', outputWidth: 4680 },    // +15%: 3.97
];

// Format options
const FORMATS = [
    { id: 'webp', label: 'WebP', mime: 'image/webp', ext: 'webp' },
    { id: 'png', label: 'PNG', mime: 'image/png', ext: 'png' },
];

// getThemeBackground is now imported from themeConfigs.js


export default function ShareModal({ isOpen, onClose, content }) {
    const [theme, setTheme] = useState('editorial');
    const [layout, setLayout] = useState('card');
    const [showWatermark, setShowWatermark] = useState(true);
    const [resolution, setResolution] = useState(3);
    const [format, setFormat] = useState('webp');
    const [quality] = useState(0.88);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const captureRef = useRef(null);

    if (!isOpen) return null;

    const generateCanvas = async () => {
        if (!captureRef.current) return null;
        await document.fonts.ready;
        // Small delay to ensure rendering is complete
        await new Promise(resolve => setTimeout(resolve, 300));

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
            let image = canvas.toDataURL(formatConfig.mime, needsQuality ? quality : undefined);

            if (format === 'webp' && (!image || image.length < 100)) {
                console.warn('WebP export failed, falling back to PNG');
                image = canvas.toDataURL('image/png');
            }

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

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-6xl h-[85vh] bg-zinc-900 rounded-2xl shadow-2xl flex overflow-hidden ring-1 ring-white/10 animate-fade-in-up">

                {/* Left: Preview */}
                <SharePreview
                    content={content}
                    theme={theme}
                    layout={layout}
                    showWatermark={showWatermark}
                />

                {/* Right: Controls */}
                <ShareControls
                    themes={{ categories: THEME_CATEGORIES }}
                    currentTheme={theme}
                    setTheme={setTheme}
                    layouts={LAYOUTS}
                    currentLayout={layout}
                    setLayout={setLayout}
                    resolutions={RESOLUTIONS}
                    currentResolution={resolution}
                    setResolution={setResolution}
                    formats={FORMATS}
                    currentFormat={format}
                    setFormat={setFormat}
                    showWatermark={showWatermark}
                    setShowWatermark={setShowWatermark}
                    onClose={onClose}
                    onCopy={handleCopyToClipboard}
                    onDownload={handleDownload}
                    isCopying={isCopying}
                    isGenerating={isGenerating}
                    copySuccess={copySuccess}
                />
            </div>

            {/* Hidden Capture Target - Kept intact for functionality */}
            <div className="fixed left-[-9999px] top-0 pointer-events-none opacity-0">
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
