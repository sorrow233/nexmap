import React, { useEffect } from 'react';
import { marked } from 'marked';
import { THEME_CONFIGS, LAYOUT_CONFIGS, THEME_MAP } from './themeConfigs';

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
        const s = themeConfig.settings;

        return `
            .markdown-body {
                font-family: ${s['--font-body']};
                ${s['--base-size'] ? `font-size: ${s['--base-size']};` : ''}
                color: ${themeConfig.text};
                line-height: ${s['--line-height']};
                font-feature-settings: "kern" 1, "liga" 1;
            }

            /* --- Typography Hierarchy --- */
            .markdown-body h1 {
                font-family: ${s['--font-heading']};
                font-size: ${s['--h1-size']};
                font-weight: ${s['--h1-weight']};
                line-height: ${s['--h1-line-height'] || '1.2'};
                letter-spacing: ${s['--h1-spacing'] || 'normal'};
                margin-top: 0;
                margin-bottom: 0.6em;
            }
            ${currentThemeId === 'terminal' ? `.markdown-body h1::before { content: "${s['--h1-prefix']}"; display: inline-block; margin-right: 0.3em; opacity: 0.5; }` : ''}

            .markdown-body h2 {
                font-family: ${s['--font-heading']};
                font-size: ${s['--h2-size']};
                font-weight: 700;
                margin-top: 1.5em; /* Breathing room */
                margin-bottom: 0.6em;
                ${currentThemeId === 'editorial' ? `border-bottom: 1px solid ${themeConfig.accent}40; padding-bottom: 0.3em; display: inline-block;` : ''}
            }

            .markdown-body p {
                margin-bottom: ${s['--block-margin']};
                ${currentThemeId === 'editorial' ? 'text-align: justify;' : ''}
            }

            /* --- Components --- */
            
            /* Blockquotes */
            .markdown-body blockquote {
                margin: 2em 0;
                padding: 1.2em 1.5em;
                font-style: ${s['--quote-style']};
                border-left: ${s['--quote-border']};
                background: ${s['--quote-bg']};
                color: ${s['--quote-color']};
                ${s['--quote-shadow'] ? `box-shadow: ${s['--quote-shadow']}; border-radius: 6px;` : ''}
                ${currentThemeId === 'editorial' ? `
                    position: relative;
                    padding-left: 3em; 
                    padding-right: 1em;
                    border: none;
                ` : ''}
            }
            /* Editorial Quote Mark */
            ${currentThemeId === 'editorial' ? `
            .markdown-body blockquote::before {
                content: """;
                position: absolute;
                left: 0.4em;
                top: -0.2em;
                font-family: "Playfair Display", serif;
                font-size: 4em;
                color: ${themeConfig.accent};
                opacity: 0.2;
                line-height: 1;
            }` : ''}

            /* Code Blocks */
            .markdown-body pre {
                background: ${s['--code-bg']};
                padding: 1.5em;
                border-radius: ${currentThemeId === 'handwritten' ? '8px' : '6px'};
                overflow-x: auto;
                margin: 1.5em 0;
                ${currentThemeId === 'terminal' || currentThemeId === 'editorial' ? `border: 1px solid rgba(0,0,0,0.08);` : ''}
            }
            .markdown-body pre code {
                font-family: ${s['--font-code']};
                background: transparent;
                padding: 0;
                color: ${s['--code-color']};
                font-size: 0.9em;
            }

            /* Inline Code */
            .markdown-body code {
                font-family: ${s['--font-code']};
                background: ${s['--code-bg']};
                color: ${s['--code-color']};
                padding: 0.2em 0.4em;
                margin: 0 0.1em;
                border-radius: 4px;
                font-size: 0.85em;
                ${currentThemeId === 'editorial' ? 'border: 1px solid rgba(0,0,0,0.05);' : ''}
            }

            /* Lists */
            .markdown-body ul, .markdown-body ol {
                padding-left: 1.2em;
                margin-bottom: ${s['--block-margin']};
            }
            .markdown-body ul li {
                list-style: none; /* Custom bullets */
                position: relative;
                padding-left: 0.5em; 
                margin-bottom: 0.5em;
            }
            .markdown-body ul li::before {
                content: "${currentThemeId === 'terminal' ? '>' : (currentThemeId === 'modern' ? '◦' : '•')}";
                position: absolute;
                left: -1em;
                color: ${themeConfig.accent};
                font-weight: bold;
            }
             .markdown-body ol {
                list-style: decimal;
                padding-left: 1.5em;
            }
            .markdown-body ol li {
                position: relative;
                padding-left: 0.3em;
                margin-bottom: 0.5em;
            }
            .markdown-body ol li::marker {
                color: ${themeConfig.accent};
                font-weight: bold;
                font-family: ${s['--font-code']};
            }

            /* Bold & Highlights */
            .markdown-body strong {
                font-weight: 800;
                ${s['--bold-color'] ? `color: ${s['--bold-color']};` : ''}
                ${currentThemeId === 'handwritten' ? `
                    background: linear-gradient(100deg, rgba(255,171,118,0) 10%, rgba(255,171,118,0.3) 15%, rgba(255,171,118,0.3) 85%, rgba(255,171,118,0) 90%);
                    padding: 0 0.2em;
                    border-radius: 4px;
                ` : ''}
                 ${currentThemeId === 'editorial' ? `
                    background: linear-gradient(120deg, transparent 65%, ${themeConfig.accent}15 65%);
                    color: inherit;
                ` : ''}
            }

            /* HR */
            .markdown-body hr {
                border: none;
                margin: 3em 0;
                text-align: center;
                ${currentThemeId === 'editorial' ? `height: auto;` : `
                    height: 1px;
                    background: ${currentThemeId === 'swiss' ? 'transparent' : themeConfig.text};
                    opacity: 0.1;
                `}
            }
            /* Editorial HR */
            ${currentThemeId === 'editorial' ? `
            .markdown-body hr::after {
                content: "✻ ✻ ✻";
                font-size: 1.2em;
                color: ${themeConfig.accent};
                letter-spacing: 0.8em;
                opacity: 0.6;
            }` : ''}

            /* Link override (if any) */
            .markdown-body a { color: ${themeConfig.accent}; text-decoration: none; border-bottom: 1px solid ${themeConfig.accent}; }
        `;
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
                        <div style={{
                            width: '24px', height: '24px',
                            background: themeConfig.accent,
                            borderRadius: '4px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: currentThemeId === 'swiss' ? themeConfig.bg : '#fff',
                            fontSize: '14px', fontWeight: 'bold'
                        }}>N</div>
                        <span style={{ fontWeight: 'bold', letterSpacing: '-0.02em', fontSize: '1.1em' }}>NexMap</span>
                    </div>
                </div>
            )}
        </div>
    );
});

export default ShareableContent;
