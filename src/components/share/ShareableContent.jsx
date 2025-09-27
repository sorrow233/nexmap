import React, { useEffect } from 'react';
import { marked } from 'marked';
import { THEME_CONFIGS, LAYOUT_CONFIGS, THEME_MAP, generateThemeCSS } from './themeConfigs';

// Configure marked options
marked.setOptions({
    breaks: true, // Enable line breaks
    gfm: true,    // Enable GitHub Flavored Markdown
});

const ShareableContent = React.forwardRef(({ content, theme = 'modern', layout = 'card', showWatermark }, ref) => {
    // Map theme IDs using imported THEME_MAP
    const currentThemeId = THEME_CONFIGS[theme] ? theme : (THEME_MAP[theme] || 'modern');
    const themeConfig = THEME_CONFIGS[currentThemeId];
    const layoutConfig = LAYOUT_CONFIGS[layout] || LAYOUT_CONFIGS.card;

    // Load Fonts logic
    useEffect(() => {
        const linkId = 'mixboard-export-fonts';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            // Added: Cormorant Garamond, EB Garamond, Cinzel, Lora, Crimson Text
            link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=JetBrains+Mono:wght@400;700&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400&family=Kalam:wght@300;400;700&family=Playfair+Display:wght@700;900&family=Quicksand:wght@300;400;500;700&family=Kiwi+Maru:wght@300;400;500&family=Zen+Maru+Gothic:wght@300;400;500;700&family=Dela+Gothic+One&family=M+PLUS+Rounded+1c:wght@300;400;500;700;800&family=DotGothic16&family=Yomogi&family=M+PLUS+1p:wght@300;400;500;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=EB+Garamond:wght@400;700;800&family=Cinzel:wght@400;700&family=Lora:ital,wght@0,400;0,700;1,400&family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&display=swap';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
    }, []);

    const htmlContent = marked(content || 'No content provided');

    // CSS Generator
    const generateThemeStyles = () => {
        return generateThemeCSS(themeConfig);
    };

    return (
        <div ref={ref} style={{
            width: `${layoutConfig.width}px`,
            minHeight: layoutConfig.aspectRatio ? `${layoutConfig.width / layoutConfig.aspectRatio}px` : 'auto',
            backgroundColor: themeConfig.bg,
            color: themeConfig.text,
            padding: `${layoutConfig.paddingOverride || (themeConfig.padding * (layoutConfig.paddingScale || 1))}px`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: layoutConfig.centered ? 'center' : 'flex-start',
            position: 'relative',
            boxSizing: 'border-box',
            fontFeatureSettings: '"kern" 1, "liga" 1',
            textRendering: 'optimizeLegibility',
        }}>
            <style>{generateThemeStyles()}</style>

            {/* --- Background Effects --- */}

            {/* Silicon Grid (Theme 2) */}
            {currentThemeId === 'terminal' && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `linear-gradient(${themeConfig.settings['--border-color']} 1px, transparent 1px), linear-gradient(90deg, ${themeConfig.settings['--border-color']} 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                    opacity: 0.3,
                    pointerEvents: 'none'
                }} />
            )}

            {/* Swiss Grid (Theme 4) - Very Subtle */}
            {currentThemeId === 'swiss' && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)`,
                    backgroundSize: '100px 100px',
                    pointerEvents: 'none'
                }} />
            )}

            {/* Swiss Grid (New) */}
            {(currentThemeId === 'swiss_grid') && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `linear-gradient(${themeConfig.accent}15 1px, transparent 1px), linear-gradient(90deg, ${themeConfig.accent}15 1px, transparent 1px)`,
                    backgroundSize: '20px 20px',
                    pointerEvents: 'none'
                }} />
            )}

            {/* Cozy Noise (Theme 5) */}
            {currentThemeId === 'handwritten' && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.03,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    pointerEvents: 'none'
                }} />
            )}

            {/* Sakura Petals */}
            {currentThemeId === 'sakura' && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `radial-gradient(#FFB7B2 2px, transparent 2px)`,
                    backgroundSize: '30px 30px',
                    opacity: 0.3,
                    pointerEvents: 'none'
                }} />
            )}

            {/* Manga Halftone */}
            {currentThemeId === 'manga' && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `radial-gradient(#000000 1px, transparent 1px)`,
                    backgroundSize: '4px 4px',
                    opacity: 0.1,
                    pointerEvents: 'none'
                }} />
            )}

            {/* Sky Gradient */}
            {currentThemeId === 'sky' && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(180deg, #E0F7FA 0%, #FFFFFF 100%)`,
                    pointerEvents: 'none'
                }} />
            )}

            {/* Citypop Gradient */}
            {currentThemeId === 'citypop' && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(45deg, #210046 0%, #300060 100%)`,
                    pointerEvents: 'none'
                }} />
            )}

            {/* Ocean Waves Effect */}
            {currentThemeId === 'ocean' && (
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '20%',
                    background: `linear-gradient(0deg, #B2DFDB 0%, transparent 100%)`,
                    pointerEvents: 'none',
                    opacity: 0.5
                }} />
            )}


            {/* Content */}
            <div className={`markdown-body flex-grow`} style={{ position: 'relative', zIndex: 10 }}>
                <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </div>

            {/* Footer */}
            {showWatermark && (
                <div style={{
                    marginTop: '80px',
                    paddingTop: '20px',
                    borderTop: currentThemeId === 'swiss' ? `4px solid ${themeConfig.accent}` : `1px solid ${themeConfig.text}15`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontFamily: themeConfig.settings['--font-heading'],
                    opacity: 0.7
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Logo Mark */}
                        <img
                            src="/nexmap-icon.svg"
                            alt="NexMap Logo"
                            style={{
                                width: '24px', height: '24px',
                                objectFit: 'contain'
                            }}
                        />
                        <span style={{ fontWeight: 'bold', letterSpacing: '-0.02em', fontSize: '1.1em' }}>NexMap</span>
                    </div>
                </div>
            )}
        </div>
    );
});

export default ShareableContent;
