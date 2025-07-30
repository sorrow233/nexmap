import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Star, Sparkles, MessageSquare, FileText, Instagram, Monitor, Feather, Coffee, Cloud, Music, Heart, Sun, Waves, Flower, Leaf, Mountain, Grid, Type, Box, Hash, AlignLeft, Maximize, Layout, Book, School, Palette, Moon, Wind, PenTool, LayoutTemplate, Ghost } from 'lucide-react';
import ShareableContent from './ShareableContent';
import SharePreview from './SharePreview';
import ShareControls from './ShareControls';

// Theme configurations
// Theme categories for the UI
const THEME_CATEGORIES = [
    {
        name: 'Classic & Essential',
        themes: [
            { id: 'editorial', label: 'Editorial', icon: Star, preview: 'bg-[#FDFBF7] border-slate-200', accent: 'bg-[#8B0000]' },
            { id: 'modern', label: 'Modern', icon: LayoutTemplate, preview: 'bg-white border-slate-200', accent: 'bg-[#E16259]' },
            { id: 'terminal', label: 'Silicon', icon: Hash, preview: 'bg-[#0F1115] border-slate-800', accent: 'bg-[#58A6FF]' },
            { id: 'handwritten', label: 'Cozy', icon: Sparkles, preview: 'bg-[#F9F5F1] border-orange-100', accent: 'bg-[#F1C40F]' },
            { id: 'zen', label: 'Zen', icon: Feather, preview: 'bg-[#F8F9FA] border-gray-100', accent: 'bg-[#ADB5BD]' },
        ]
    },
    {
        name: 'Artistic & Literary',
        themes: [
            { id: 'library', label: 'Library', icon: Book, preview: 'bg-[#2C241B] border-[#D4AF37]', accent: 'bg-[#D4AF37]' },
            { id: 'parchment', label: 'Parchment', icon: FileText, preview: 'bg-[#F2E8C9] border-[#8B4513]', accent: 'bg-[#8B4513]' },
            { id: 'coffee', label: 'Coffee', icon: Coffee, preview: 'bg-[#EBE5CE] border-[#795548]', accent: 'bg-[#795548]' },
            { id: 'rainy', label: 'Rainy', icon: Cloud, preview: 'bg-[#CFD8DC] border-[#455A64]', accent: 'bg-[#455A64]' },
            { id: 'academia', label: 'Academia', icon: School, preview: 'bg-[#F5F5F0] border-[#C5A059]', accent: 'bg-[#C5A059]' },
            { id: 'poetry', label: 'Poetry', icon: PenTool, preview: 'bg-[#FFFBF0] border-[#D84315]', accent: 'bg-[#D84315]' },
            { id: 'vintage', label: 'Vintage', icon: Palette, preview: 'bg-[#3E2723] border-[#FFB74D]', accent: 'bg-[#FFB74D]' },
            { id: 'classic', label: 'Classic', icon: Type, preview: 'bg-white border-black', accent: 'bg-black' },
            { id: 'etching', label: 'Etching', icon: Feather, preview: 'bg-[#EADBC8] border-[#8D6E63]', accent: 'bg-[#8D6E63]' },
            { id: 'midnight', label: 'Midnight', icon: Moon, preview: 'bg-[#0D1B2A] border-[#778DA9]', accent: 'bg-[#778DA9]' },
        ]
    },
    {
        name: 'Swiss Minimalist',
        themes: [
            { id: 'swiss_classic', label: 'Swiss Classic', icon: Type, preview: 'bg-white border-red-500', accent: 'bg-[#FF3B30]' },
            { id: 'swiss_grid', label: 'Grid Theory', icon: Grid, preview: 'bg-[#F0F0F0] border-blue-500', accent: 'bg-[#0055FF]' },
            { id: 'swiss_dark', label: 'Dark Rational', icon: Box, preview: 'bg-[#050505] border-white', accent: 'bg-[#D01111]' },
            { id: 'swiss_braun', label: 'Braun', icon: Monitor, preview: 'bg-[#EBEBEB] border-orange-500', accent: 'bg-[#E65100]' },
            { id: 'swiss_intl', label: 'International', icon: Hash, preview: 'bg-[#FDFDFD] border-black', accent: 'bg-black' },
            { id: 'swiss_arch', label: 'Architect', icon: Layout, preview: 'bg-[#D6D6D6] border-black', accent: 'bg-black' },
            { id: 'swiss_type', label: 'Typographic', icon: Type, preview: 'bg-white border-black', accent: 'bg-[#222]' },
            { id: 'swiss_poster', label: 'Poster', icon: Maximize, preview: 'bg-[#F25042] border-white', accent: 'bg-white' },
            { id: 'swiss_mono', label: 'Mono Rational', icon: AlignLeft, preview: 'bg-[#F5F7FA] border-gray-500', accent: 'bg-[#333]' },
            { id: 'swiss_clean', label: 'Clean State', icon: Feather, preview: 'bg-white border-gray-200', accent: 'bg-[#999]' },
        ]
    },
    {
        name: 'Japanese Aesthetic',
        themes: [
            { id: 'sakura', label: 'Sakura', icon: Flower, preview: 'bg-[#FFF0F5] border-[#FFB7B2]', accent: 'bg-[#FFB7B2]' },
            { id: 'matcha', label: 'Matcha', icon: Leaf, preview: 'bg-[#F2F7F2] border-[#8AA387]', accent: 'bg-[#8AA387]' },
            { id: 'manga', label: 'Manga', icon: Ghost, preview: 'bg-white border-black border-2', accent: 'bg-black' },
            { id: 'sky', label: 'Sky', icon: Cloud, preview: 'bg-[#E0F7FA] border-[#4FC3F7]', accent: 'bg-[#4FC3F7]' },
            { id: 'citypop', label: 'Citypop', icon: Music, preview: 'bg-[#210046] border-[#00FFFF]', accent: 'bg-[#FF00FF]' },
            { id: 'ghibli', label: 'Ghibli', icon: Mountain, preview: 'bg-[#F5F5DC] border-[#8F9779]', accent: 'bg-[#8F9779]' },
            { id: 'peach', label: 'Peach', icon: Heart, preview: 'bg-[#FFF5F5] border-[#E29587]', accent: 'bg-[#E29587]' },
            { id: 'lavender', label: 'Lavender', icon: Wind, preview: 'bg-[#F3E5F5] border-[#CE93D8]', accent: 'bg-[#CE93D8]' },
            { id: 'sunset', label: 'Sunset', icon: Sun, preview: 'bg-[#FFF3E0] border-[#FFAB91]', accent: 'bg-[#FFAB91]' },
            { id: 'ocean', label: 'Ocean', icon: Waves, preview: 'bg-[#E0F2F1] border-[#26A69A]', accent: 'bg-[#26A69A]' },
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

// Get background color for html2canvas based on theme
const getThemeBackground = (themeId) => {
    const bgColors = {
        editorial: '#FDFBF7',
        terminal: '#0F1115',
        modern: '#FFFFFF',
        swiss: '#F4F4F4',
        handwritten: '#FFFCF5',

        zen: '#F8F9FA',

        // Artistic
        library: '#2C241B',
        parchment: '#F2E8C9',
        coffee: '#EBE5CE',
        rainy: '#CFD8DC',
        academia: '#F5F5F0',
        poetry: '#FFFBF0',
        vintage: '#3E2723',
        classic: '#FFFFFF',
        etching: '#EADBC8',
        midnight: '#0D1B2A',

        // Swiss
        swiss_classic: '#FFFFFF',
        swiss_grid: '#F0F0F0',
        swiss_dark: '#050505',
        swiss_braun: '#EBEBEB',
        swiss_intl: '#FDFDFD',
        swiss_arch: '#D6D6D6',
        swiss_type: '#FFFFFF',
        swiss_poster: '#F25042',
        swiss_mono: '#F5F7FA',
        swiss_clean: '#FFFFFF',

        sakura: '#FFF0F5',
        matcha: '#F2F7F2',
        manga: '#FFFFFF',
        sky: '#E0F7FA',
        citypop: '#210046',
        ghibli: '#F5F5DC',
        peach: '#FFF5F5',
        lavender: '#F3E5F5',
        sunset: '#FFF3E0',
        ocean: '#E0F2F1',
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
