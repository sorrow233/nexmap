import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Star, Zap, Gem, Flame, Sparkles, MessageSquare, FileText, Instagram, Monitor, Box, Leaf, Sun, Ruler, Newspaper, Book, Feather, Smile, Hexagon } from 'lucide-react';
import ShareableContent from './ShareableContent';
import SharePreview from './SharePreview';
import ShareControls from './ShareControls';

// Theme configurations
const THEMES = [
    {
        id: 'editorial',
        label: 'Editorial',
        icon: Star,
        preview: 'bg-[#FDFBF7] border-slate-200',
        accent: 'bg-[#8B0000]',
    },
    {
        id: 'handwritten',
        label: 'Cozy',
        icon: Sparkles,
        preview: 'bg-[#F9F5F1] border-orange-100',
        accent: 'bg-[#F1C40F]',
    },
    {
        id: 'neon',
        label: 'Neon',
        icon: Zap,
        preview: 'bg-[#050a14] border-cyan-900',
        accent: 'bg-[#00F0FF]',
    },
    {
        id: 'brutal',
        label: 'Brutal',
        icon: Box,
        preview: 'bg-white border-black border-4',
        accent: 'bg-black',
    },
    {
        id: 'garden',
        label: 'Garden',
        icon: Leaf,
        preview: 'bg-[#F0F4EF] border-green-800',
        accent: 'bg-[#4A6741]',
    },
    {
        id: 'retro',
        label: 'Retro',
        icon: Sun,
        preview: 'bg-[#2B213A] border-pink-500',
        accent: 'bg-[#FF71CE]',
    },
    {
        id: 'blueprint',
        label: 'Blueprint',
        icon: Ruler,
        preview: 'bg-[#003366] border-blue-400',
        accent: 'bg-[#FFCC00]',
    },
    {
        id: 'gazette',
        label: 'Gazette',
        icon: Newspaper,
        preview: 'bg-[#F4ECD8] border-yellow-900',
        accent: 'bg-[#8B0000]',
    },
    {
        id: 'library',
        label: 'Library',
        icon: Book,
        preview: 'bg-[#1E1B18] border-stone-800',
        accent: 'bg-[#C6A87C]',
    },
    {
        id: 'zen',
        label: 'Zen',
        icon: Feather,
        preview: 'bg-[#F8F9FA] border-gray-100',
        accent: 'bg-[#ADB5BD]',
    },
    {
        id: 'comic',
        label: 'Comic',
        icon: Smile,
        preview: 'bg-white border-black border-2',
        accent: 'bg-[#FFEA00]',
    },
    {
        id: 'bauhaus',
        label: 'Bauhaus',
        icon: Hexagon,
        preview: 'bg-[#F0F0F0] border-red-600',
        accent: 'bg-[#D02121]',
    },
];

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

// Get background color for html2canvas based on theme
const getThemeBackground = (themeId) => {
    const bgColors = {
        editorial: '#FDFBF7',
        terminal: '#0F1115',
        modern: '#FFFFFF',
        swiss: '#F4F4F4',
        handwritten: '#FFFCF5',
        neon: '#050a14',
        brutal: '#FFFFFF',
        garden: '#F0F4EF',
        retro: '#2B213A',
        blueprint: '#003366',
        gazette: '#F4ECD8',
        library: '#1E1B18',
        zen: '#F8F9FA',
        comic: '#FFFFFF',
        bauhaus: '#F0F0F0',
    };
    return bgColors[themeId] || '#ffffff';
};

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
                    themes={THEMES}
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
