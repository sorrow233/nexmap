import React, { useEffect } from 'react';
import { marked } from 'marked';

// Configure marked options
marked.setOptions({
    breaks: true, // Enable line breaks
    gfm: true,    // Enable GitHub Flavored Markdown
});

// Advanced Theme Configurations
const THEME_CONFIGS = {
    // 1. Editorial - 纽约时报杂志风 (New York Editorial) - 原 Theme 4 "米色衬线" 拯救版
    editorial: {
        id: 'editorial',
        name: 'Editorial',
        fonts: ['Merriweather', 'Playfair Display', 'Inter'],
        bg: '#FDFBF7', // 羊皮纸/暖白
        text: '#333333',
        accent: '#8B0000', // 深酒红
        padding: 80, // 巨大的留白
        radius: 0,
        settings: {
            '--font-heading': '"Playfair Display", serif',
            '--font-body': '"Merriweather", serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '3.5em', // 巨大标题
            '--h1-weight': '900',
            '--h1-line-height': '1.1',
            '--h2-size': '2em',
            '--line-height': '1.9', // 呼吸感
            '--block-margin': '2em',
            '--quote-style': 'italic',
            '--quote-border': 'none',
            '--quote-bg': 'transparent',
            '--quote-color': '#555',
            '--code-bg': '#F5F5F0',
            '--code-color': '#8B0000',
        }
    },

    // 2. Terminal - 硅谷极客风 (Silicon Valley) - 原 Theme 2 "深蓝格纹" 拯救版
    terminal: {
        id: 'terminal',
        name: 'Silicon',
        fonts: ['JetBrains Mono', 'Inter'],
        bg: '#0F1115', // 深灰/黑灰，不是蓝
        text: '#E1E3E5', // 灰白，防刺眼
        accent: '#58A6FF', // GitHub Blue
        padding: 60,
        radius: 8,
        settings: {
            '--font-heading': '"JetBrains Mono", monospace',
            '--font-body': '"JetBrains Mono", monospace', // 全员等宽
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '2.2em',
            '--h1-weight': '700',
            '--h1-prefix': '~/ ',
            '--h2-size': '1.6em',
            '--line-height': '1.7',
            '--block-margin': '1.5em',
            '--quote-style': 'normal',
            '--quote-border': '2px solid #30363D',
            '--quote-bg': '#161B22',
            '--quote-color': '#8B949E',
            '--code-bg': '#161B22',
            '--code-color': '#79C0FF',
            '--border-color': 'rgba(255,255,255,0.1)',
        }
    },

    // 3. Modern - Notion 现代风 - 原 Theme 3 "白底" 拯救版
    modern: {
        id: 'modern',
        name: 'Modern',
        fonts: ['Inter'],
        bg: '#FFFFFF',
        text: '#37352F', // Notion Black
        accent: '#E16259', // Notion Red (for strong)
        padding: 60,
        radius: 12,
        settings: {
            '--font-heading': '"Inter", sans-serif',
            '--font-body': '"Inter", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '2.8em',
            '--h1-weight': '700',
            '--h2-size': '1.8em',
            '--line-height': '1.7',
            '--block-margin': '1em', // Notion is slightly compact but clear
            '--quote-style': 'normal',
            '--quote-border': '3px solid #D1D5DB', // 灰色竖线
            '--quote-bg': 'transparent',
            '--quote-color': '#555',
            '--code-bg': 'rgba(235, 87, 87, 0.08)', // 淡红背景
            '--code-color': '#EB5757',
        }
    },

    // 4. Swiss - 瑞士平面风 (International Style)
    swiss: {
        id: 'swiss',
        name: 'Swiss',
        fonts: ['Inter', 'Helvetica Neue', 'Arial'],
        bg: '#F4F4F4', // 国际主义灰
        text: '#111111', // 纯黑
        accent: '#D01111', // 瑞士红 (Swiss Red)
        padding: 90, // 极大的留白
        radius: 0,
        settings: {
            '--font-heading': '"Inter", "Helvetica Neue", Arial, sans-serif',
            '--font-body': '"Inter", "Helvetica Neue", Arial, sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '4.2em', // 巨大标题
            '--h1-weight': '900', // Heavy weight
            '--h1-spacing': '-0.04em', // Tight tracking
            '--h1-line-height': '0.95',
            '--h2-size': '2.2em',
            '--line-height': '1.6',
            '--block-margin': '2em',
            '--quote-style': 'normal',
            '--quote-border': 'none',
            '--quote-bg': '#FFFFFF', // 白盒
            '--quote-color': '#000',
            '--code-bg': '#E0E0E0',
            '--code-color': '#D01111',
            '--bold-color': '#D01111', // 红色强调
        }
    },

    // 5. Handwritten - 手账温暖风 (Cozy) - 原 Theme 5 "横线纸" 拯救版
    handwritten: {
        id: 'handwritten',
        name: 'Cozy',
        fonts: ['Kalam', 'Patrick Hand'],
        bg: '#FFFCF5', // 暖白
        text: '#2C3E50',
        accent: '#FFAB76', // 暖橙荧光笔
        padding: 60,
        radius: 4,
        settings: {
            '--font-heading': '"Kalam", cursive',
            '--font-body': '"Kalam", cursive',
            '--font-code': '"Kalam", cursive',
            '--base-size': '22px', // 手写体字号补偿 (Kalam is small)
            '--h1-size': '3.5em',
            '--h1-weight': '700',
            '--h2-size': '2.4em',
            '--line-height': '1.8',
            '--block-margin': '1.6em',
            '--quote-style': 'normal',
            '--quote-border': 'none',
            '--quote-bg': '#FFF3C4', // 便利贴黄
            '--quote-color': '#2C3E50',
            '--quote-shadow': '3px 3px 0px rgba(0,0,0,0.05)',
            '--code-bg': '#E8F6F3',
            '--code-color': '#16A085',
            // 荧光笔效果，边缘不规则
            '--highlight-bg': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath d='M0 100 L0 20 Q 20 0, 40 20 T 80 20 T 100 20 L 100 100 Z' fill='rgba(255, 200, 100, 0.4)' /%3E%3C/svg%3E")`,
        }
    },
};

// Layout configs (Base 1179px)
const LAYOUT_CONFIGS = {
    card: { width: 1179, aspectRatio: null, paddingScale: 1, centered: false },
    full: { width: 1179, aspectRatio: null, paddingOverride: 40, centered: false }, // Compact: reduced padding
    social: { width: 1179, aspectRatio: 1, paddingScale: 1, centered: true },      // Social: Square + Centered
    slide: { width: 1920, aspectRatio: 16 / 9, paddingScale: 1.5, centered: true }, // Slide: Wide + Centered
};

const ShareableContent = React.forwardRef(({ content, theme = 'modern', layout = 'card', showWatermark }, ref) => {
    // Map theme IDs
    const themeMap = {
        'business': 'editorial',
        'tech': 'terminal',
        'minimal': 'modern',
        'darkpro': 'swiss',
        'colorful': 'handwritten'
    };

    const currentThemeId = THEME_CONFIGS[theme] ? theme : (themeMap[theme] || 'modern');
    const themeConfig = THEME_CONFIGS[currentThemeId];
    const layoutConfig = LAYOUT_CONFIGS[layout] || LAYOUT_CONFIGS.card;

    // Load Fonts logic
    useEffect(() => {
        const linkId = 'mixboard-export-fonts';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=JetBrains+Mono:wght@400;700&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400&family=Kalam:wght@300;400;700&family=Playfair+Display:wght@700;900&display=swap';
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
                content: "“";
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
                counter-reset: item;
                list-style: none;
            }
            .markdown-body ol li {
                position: relative;
                padding-left: 0.5em;
                margin-bottom: 0.5em;
            }
            .markdown-body ol li::before {
                content: counter(item) ".";
                counter-increment: item;
                position: absolute;
                left: -1.2em;
                color: ${themeConfig.accent};
                font-weight: bold;
                font-family: ${s['--font-code']};
                font-variant-numeric: tabular-nums;
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


            {/* Content Content content */}
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
