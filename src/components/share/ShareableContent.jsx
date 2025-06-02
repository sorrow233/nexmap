import React, { useEffect } from 'react';
import { marked } from 'marked';

// Advanced Theme Configurations
// 每个主题都是一套完整的设计语言：字体、配色、Markdown渲染规则、装饰元素
const THEME_CONFIGS = {
    // 1. Editorial - 优雅杂志风 (New York Times style)
    editorial: {
        id: 'editorial',
        name: 'Editorial',
        fonts: ['Merriweather', 'Inter'],
        bg: '#FDFBF7', // 羊皮纸色
        text: '#333333',
        accent: '#8B0000', // 深红
        padding: 80, // 豪华留白
        radius: 0,
        settings: {
            '--font-heading': '"Playfair Display", serif',
            '--font-body': '"Merriweather", serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '3.5em',
            '--h1-weight': '900',
            '--h1-spacing': '-0.02em',
            '--line-height': '1.8',
            '--quote-style': 'italic',
            '--quote-border': '4px solid #8B0000',
            '--quote-bg': 'transparent',
            '--code-bg': '#F5F5F5',
            '--code-color': '#AB2222',
        }
    },

    // 2. Terminal - 硬核极客风 (CRT/IDE style)
    terminal: {
        id: 'terminal',
        name: 'Terminal',
        fonts: ['JetBrains Mono'],
        bg: '#0D1117', // GitHub Dark Dimmed
        text: '#C9D1D9',
        accent: '#58A6FF',
        padding: 40, // 紧凑
        radius: 12,
        settings: {
            '--font-heading': '"JetBrains Mono", monospace',
            '--font-body': '"JetBrains Mono", monospace',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '2em',
            '--h1-weight': '700',
            '--h1-prefix': '">_ "', // CSS pseudo-element content
            '--line-height': '1.5',
            '--quote-style': 'normal',
            '--quote-border': '2px solid #30363D',
            '--quote-bg': '#161B22',
            '--code-bg': '#161B22',
            '--code-color': '#FF7B72', // Pink/Red
        }
    },

    // 3. Modern - 现代生产力 (Notion style)
    modern: {
        id: 'modern',
        name: 'Modern',
        fonts: ['Inter'],
        bg: '#FFFFFF',
        text: '#37352F',
        accent: '#2EAADC',
        padding: 60,
        radius: 16,
        settings: {
            '--font-heading': '"Inter", sans-serif',
            '--font-body': '"Inter", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '2.5em',
            '--h1-weight': '800',
            '--line-height': '1.6',
            '--quote-style': 'normal',
            '--quote-border': '4px solid #F0F0F0', // Very subtle
            '--quote-bg': 'transparent',
            '--code-bg': 'rgba(235, 87, 87, 0.1)', // Notion sweet pink bg
            '--code-color': '#EB5757',
        }
    },

    // 4. Swiss - 瑞士平面风格 (Poster style)
    swiss: {
        id: 'swiss',
        name: 'Swiss',
        fonts: ['Inter'], // Using Inter Heavy as substitute for Helvetica
        bg: '#002FA7', // Klein Blue
        text: '#FFFFFF',
        accent: '#FFD700', // Gold
        padding: 80,
        radius: 0,
        settings: {
            '--font-heading': '"Inter", sans-serif',
            '--font-body': '"Inter", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '4em',
            '--h1-weight': '900',
            '--h1-spacing': '-0.05em', // TIGHT tracking
            '--h1-line-height': '0.9', // TIGHT leading
            '--line-height': '1.4',
            '--quote-style': 'normal',
            '--quote-border': 'none',
            '--quote-bg': 'rgba(255,255,255,0.1)',
            '--code-bg': '#000000',
            '--code-color': '#FFD700',
            '--bold-color': '#FFD700', // Gold bold text
        }
    },

    // 5. Handwritten - 手账温暖风 (GoodNotes style)
    handwritten: {
        id: 'handwritten',
        name: 'Handwritten',
        fonts: ['Patrick Hand'],
        bg: '#F9F5F1', // Paper texture color
        text: '#2C3E50', // Ink Blue
        accent: '#F1C40F', // Highlighter Yellow
        padding: 60,
        radius: 2, // Slightly organic
        settings: {
            '--font-heading': '"Patrick Hand", cursive',
            '--font-body': '"Patrick Hand", cursive',
            '--font-code': '"Patrick Hand", cursive',
            '--h1-size': '2.8em',
            '--h1-weight': '400',
            '--line-height': '1.7',
            '--quote-style': 'normal',
            '--quote-border': 'none',
            '--quote-bg': '#FFF9C4', // Sticky note yellow
            '--quote-shadow': '2px 2px 5px rgba(0,0,0,0.05)',
            '--code-bg': '#E8F6F3',
            '--code-color': '#16A085',
            '--highlight-bg': 'linear-gradient(120deg, #f6d365 0%, #fda085 100%)', // Marker effect
        }
    },
};

// Layout configs (Base 1179px)
const LAYOUT_CONFIGS = {
    card: { width: 1179, aspectRatio: null },
    full: { width: 1179, aspectRatio: null },
    social: { width: 1179, aspectRatio: 1 },
    slide: { width: 1920, aspectRatio: 16 / 9 },
};

const ShareableContent = React.forwardRef(({ content, theme = 'modern', layout = 'card', showWatermark }, ref) => {
    // Determine Theme Config
    // Fallback mapping for old theme names if they exist in state
    const themeMap = {
        'business': 'editorial',
        'tech': 'terminal',
        'minimal': 'modern',
        'darkpro': 'swiss',
        'colorful': 'handwritten'
    };

    // Accept either new ID or map old ID
    const currentThemeId = THEME_CONFIGS[theme] ? theme : (themeMap[theme] || 'modern');
    const themeConfig = THEME_CONFIGS[currentThemeId];
    const layoutConfig = LAYOUT_CONFIGS[layout] || LAYOUT_CONFIGS.card;

    // Load Fonts dynamically
    useEffect(() => {
        const linkId = 'mixboard-export-fonts';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&family=JetBrains+Mono:wght@400;700&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400&family=Patrick+Hand&family=Playfair+Display:wght@700;900&display=swap';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
    }, []);

    // Generate HTML with marked
    const htmlContent = marked(content || 'No content provided');

    // Dynamic CSS Generation
    const generateThemeStyles = () => {
        const s = themeConfig.settings;

        return `
            .markdown-body {
                font-family: ${s['--font-body']};
                color: ${themeConfig.text};
                line-height: ${s['--line-height']};
            }

            /* Headers */
            .markdown-body h1 {
                font-family: ${s['--font-heading']};
                font-size: ${s['--h1-size']};
                font-weight: ${s['--h1-weight']};
                letter-spacing: ${s['--h1-spacing'] || 'normal'};
                line-height: ${s['--h1-line-height'] || '1.2'};
                margin-bottom: 0.6em;
                margin-top: 0;
            }
            ${currentThemeId === 'terminal' ? `.markdown-body h1::before { content: "${s['--h1-prefix']}"; color: ${themeConfig.accent}; margin-right: 10px; }` : ''}

            .markdown-body h2 {
                font-family: ${s['--font-heading']};
                font-size: 1.8em;
                font-weight: 700;
                margin-top: 1.5em;
                margin-bottom: 0.5em;
                ${currentThemeId === 'editorial' ? `border-bottom: 1px solid ${themeConfig.accent}; padding-bottom: 0.3em;` : ''}
            }
             ${currentThemeId === 'terminal' ? `.markdown-body h2::before { content: "## "; color: ${themeConfig.accent}; opacity: 0.7; }` : ''}


            /* Blockquotes */
            .markdown-body blockquote {
                margin: 1.5em 0;
                padding: 1em 1.5em;
                font-style: ${s['--quote-style']};
                border-left: ${s['--quote-border']};
                background: ${s['--quote-bg']};
                ${s['--quote-shadow'] ? `box-shadow: ${s['--quote-shadow']}; border-radius: 4px;` : ''}
                ${currentThemeId === 'editorial' ? `position: relative; padding-left: 2.5em;` : ''}
            }
            ${currentThemeId === 'editorial' ? `
            .markdown-body blockquote::before {
                content: "“";
                position: absolute;
                left: 0.4em;
                top: -0.1em;
                font-size: 4em;
                color: ${themeConfig.accent};
                opacity: 0.3;
                font-family: "Playfair Display", serif;
            }` : ''}

            /* Code */
            .markdown-body code {
                font-family: ${s['--font-code']};
                background: ${s['--code-bg']};
                color: ${s['--code-color']};
                padding: 0.2em 0.4em;
                border-radius: 4px;
                font-size: 0.85em;
            }
            .markdown-body pre {
                background: ${currentThemeId === 'swiss' ? '#000' : (currentThemeId === 'terminal' ? '#161B22' : '#F8F9FA')};
                padding: 1.5em;
                border-radius: 8px;
                overflow-x: auto;
                margin: 1.5em 0;
            }
            .markdown-body pre code {
                background: transparent;
                padding: 0;
                color: inherit;
            }

            /* Lists */
            .markdown-body ul li {
                position: relative;
                padding-left: 1.5em;
                margin-bottom: 0.5em;
                list-style: none; /* Reset standard bullets */
            }
            .markdown-body ul li::before {
                content: "${currentThemeId === 'terminal' ? '>' : '•'}";
                position: absolute;
                left: 0;
                color: ${themeConfig.accent};
                font-weight: bold;
            }
             /* Ordered List Counter Color */
            .markdown-body ol {
                counter-reset: item;
                list-style: none;
                padding-left: 0;
            }
            .markdown-body ol li {
                position: relative;
                padding-left: 2em;
                margin-bottom: 0.5em;
            }
            .markdown-body ol li::before {
                content: counter(item) ".";
                counter-increment: item;
                position: absolute;
                left: 0;
                font-weight: bold;
                color: ${themeConfig.accent};
                font-family: ${s['--font-code']};
            }

            /* Bold & Highlight */
            .markdown-body strong {
                font-weight: 800;
                ${s['--bold-color'] ? `color: ${s['--bold-color']};` : ''}
                ${currentThemeId === 'editorial' || currentThemeId === 'handwritten' ? `
                    background: linear-gradient(120deg, transparent 60%, ${currentThemeId === 'editorial' ? 'rgba(139, 0, 0, 0.1)' : 'rgba(241, 196, 15, 0.3)'} 60%);
                ` : ''}
            }

            /* HR */
            .markdown-body hr {
                border: none;
                margin: 2em 0;
                text-align: center;
                ${currentThemeId === 'editorial' ? `
                    height: auto;
                ` : `
                    height: 2px;
                    background: ${themeConfig.accent};
                    opacity: 0.2;
                `}
            }
            ${currentThemeId === 'editorial' ? `
            .markdown-body hr::after {
                content: "* * *";
                font-family: "Playfair Display", serif;
                font-size: 1.5em;
                color: ${themeConfig.accent};
                letter-spacing: 0.5em;
            }
            ` : ''}
            
            /* Swiss Style Specials */
            ${currentThemeId === 'swiss' ? `
            .markdown-body p { margin-bottom: 1.5em; text-align: justify; }
            .markdown-body { font-weight: 500; }
            ` : ''}
        `;
    };

    return (
        <div ref={ref} style={{
            width: `${layoutConfig.width}px`,
            minHeight: layoutConfig.aspectRatio ? `${layoutConfig.width / layoutConfig.aspectRatio}px` : 'auto',
            backgroundColor: themeConfig.bg,
            color: themeConfig.text,
            padding: `${themeConfig.padding}px`,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            boxSizing: 'border-box',
            fontFeatureSettings: '"kern" 1, "liga" 1',
            textRendering: 'optimizeLegibility',
        }}>
            {/* Inject Theme Styles */}
            <style>{generateThemeStyles()}</style>

            {/* Swiss Grid Background */}
            {currentThemeId === 'swiss' && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `linear-gradient(${themeConfig.text} 1px, transparent 1px), linear-gradient(90deg, ${themeConfig.text} 1px, transparent 1px)`,
                    backgroundSize: '100px 100px',
                    opacity: 0.05,
                    pointerEvents: 'none'
                }} />
            )}

            {/* Handwritten Paper Texture */}
            {currentThemeId === 'handwritten' && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `radial-gradient(#000 1px, transparent 0)`,
                    backgroundSize: '24px 24px',
                    opacity: 0.05,
                    pointerEvents: 'none'
                }} />
            )}

            {/* Content Container */}
            <div className={`markdown-body flex-grow`} style={{
                position: 'relative',
                zIndex: 10
            }}>
                <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </div>

            {/* Footer */}
            {showWatermark && (
                <div style={{
                    marginTop: '60px',
                    paddingTop: '20px',
                    borderTop: currentThemeId === 'swiss' ? `4px solid ${themeConfig.text}` : `1px solid ${themeConfig.text}30`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontFamily: themeConfig.settings['--font-heading'],
                    opacity: 0.8
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '24px', height: '24px',
                            background: themeConfig.accent,
                            borderRadius: currentThemeId === 'terminal' ? '50%' : '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            color: currentThemeId === 'swiss' || currentThemeId === 'terminal' ? themeConfig.bg : '#fff',
                            fontWeight: 'bold'
                        }}>
                            M
                        </div>
                        <span style={{ fontWeight: 'bold', fontSize: '1.2em' }}>MixBoard</span>
                    </div>
                    <span style={{ fontSize: '0.9em', opacity: 0.7 }}>Created with AI</span>
                </div>
            )}
        </div>
    );
});

export default ShareableContent;
