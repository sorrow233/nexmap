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
        text: '#2c2c2c', // 更深的灰，提升对比度
        accent: '#8B0000', // 深红
        padding: 80,
        radius: 0,
        settings: {
            '--font-heading': '"Playfair Display", serif',
            '--font-body': '"Merriweather", serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '3.2em',
            '--h1-weight': '900',
            '--h1-spacing': '-0.02em',
            '--line-height': '1.9', // 更宽松的行高
            '--quote-style': 'italic',
            '--quote-border': 'none', // 取消侧边栏
            '--quote-bg': 'transparent',
            '--code-bg': '#F0EFE9',
            '--code-color': '#8B0000',
        }
    },

    // 2. Terminal - 硬核极客风 (CRT/IDE style)
    terminal: {
        id: 'terminal',
        name: 'Terminal',
        fonts: ['JetBrains Mono'],
        bg: '#050505', // 接近纯黑
        text: '#00ff00', // 经典 CRT 绿
        accent: '#00ff00',
        padding: 40,
        radius: 0, // 终端没有圆角
        settings: {
            '--font-heading': '"JetBrains Mono", monospace',
            '--font-body': '"JetBrains Mono", monospace',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '2em',
            '--h1-weight': '700',
            '--h1-prefix': 'root@mixboard:~# ', // 更硬核的前缀
            '--line-height': '1.4', // 紧凑
            '--quote-style': 'normal',
            '--quote-border': '2px solid #333',
            '--quote-bg': '#111',
            '--code-bg': '#111',
            '--code-color': '#00ff00',
            '--text-shadow': '0 0 2px rgba(0, 255, 0, 0.4)', // CRT 辉光
        }
    },

    // 3. Modern - 现代生产力 (Notion style)
    modern: {
        id: 'modern',
        name: 'Modern',
        fonts: ['Inter'],
        bg: '#FFFFFF',
        text: '#37352F',
        accent: '#EB5757', // Notion Red
        padding: 60,
        radius: 12,
        settings: {
            '--font-heading': '"Inter", sans-serif',
            '--font-body': '"Inter", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '2.4em',
            '--h1-weight': '700',
            '--line-height': '1.7',
            '--quote-style': 'normal',
            '--quote-border': '3px solid #000', // 醒目的黑线
            '--quote-bg': 'transparent',
            '--code-bg': 'rgba(235, 87, 87, 0.1)',
            '--code-color': '#EB5757',
        }
    },

    // 4. Swiss - 瑞士平面风格 (Poster style)
    swiss: {
        id: 'swiss',
        name: 'Swiss',
        fonts: ['Inter'],
        bg: '#0044CC', // 更纯的国际克莱因蓝
        text: '#FFFFFF',
        accent: '#F2C94C', // 警示黄
        padding: 80,
        radius: 0,
        settings: {
            '--font-heading': '"Inter", sans-serif',
            '--font-body': '"Inter", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '4.5em',
            '--h1-weight': '900',
            '--h1-spacing': '-0.06em',
            '--h1-line-height': '0.85', // 极致紧凑
            '--line-height': '1.4',
            '--quote-style': 'normal',
            '--quote-border': 'none',
            '--quote-bg': 'rgba(255,255,255,0.1)',
            '--code-bg': '#000',
            '--code-color': '#F2C94C',
            '--bold-color': '#F2C94C',
        }
    },

    // 5. Handwritten - 手账温暖风 (GoodNotes style)
    handwritten: {
        id: 'handwritten',
        name: 'Handwritten',
        fonts: ['Kalam'], // 换成 Kalam，更有质感
        bg: '#FFFCF5', // 暖白
        text: '#2C3E50',
        accent: '#FF6B6B', // 暖红
        padding: 50,
        radius: 4,
        settings: {
            '--font-heading': '"Kalam", cursive',
            '--font-body': '"Kalam", cursive',
            '--font-code': '"Kalam", cursive',
            '--h1-size': '2.6em',
            '--h1-weight': '700',
            '--line-height': '1.8',
            '--quote-style': 'normal',
            '--quote-border': 'none',
            '--quote-bg': '#FFF3C4', // 浅黄便利贴
            '--quote-shadow': '3px 3px 0px rgba(0,0,0,0.05)', // 硬阴影
            '--code-bg': '#E8F6F3',
            '--code-color': '#16A085',
            '--highlight-bg': 'linear-gradient(120deg, rgba(255, 235, 59, 0.6) 0%, rgba(255, 235, 59, 0.2) 100%)', // 真实荧光笔
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
            // Removed Patrick Hand, Added Kalam
            link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=JetBrains+Mono:wght@400;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Kalam:wght@300;400;700&family=Playfair+Display:wght@700;900&display=swap';
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
                ${s['--text-shadow'] ? `text-shadow: ${s['--text-shadow']};` : ''}
                ${currentThemeId === 'editorial' ? 'text-align: justify;' : ''}
            }

            /* Headers */
            .markdown-body h1 {
                font-family: ${s['--font-heading']};
                font-size: ${s['--h1-size']};
                font-weight: ${s['--h1-weight']};
                letter-spacing: ${s['--h1-spacing'] || 'normal'};
                line-height: ${s['--h1-line-height'] || '1.1'};
                margin-bottom: 0.6em;
                margin-top: 0;
            }
            ${currentThemeId === 'terminal' ? `.markdown-body h1::before { content: "${s['--h1-prefix']}"; color: ${themeConfig.accent}; margin-right: 0.2em; opacity: 0.8; }` : ''}

            .markdown-body h2 {
                font-family: ${s['--font-heading']};
                font-size: 1.8em;
                font-weight: 700;
                margin-top: 1.5em;
                margin-bottom: 0.6em;
                ${currentThemeId === 'editorial' ? `border-top: 1px solid ${themeConfig.text}; padding-top: 1em; margin-top: 2em;` : ''}
            }
            ${currentThemeId === 'terminal' ? `.markdown-body h2::before { content: "// "; color: #666; }` : ''}
            ${currentThemeId === 'handwritten' ? `.markdown-body h2 { color: ${themeConfig.accent}; transform: rotate(-1deg); display: inline-block; }` : ''}


            /* Blockquotes */
            .markdown-body blockquote {
                margin: 1.5em 0;
                padding: 1em 1.5em;
                font-style: ${s['--quote-style']};
                border-left: ${s['--quote-border']};
                background: ${s['--quote-bg']};
                ${s['--quote-shadow'] ? `box-shadow: ${s['--quote-shadow']};` : ''}
                ${currentThemeId === 'editorial' ? `
                    position: relative; 
                    padding: 1.5em 2em;
                    text-align: center;
                    font-size: 1.1em;
                    border: 1px solid rgba(0,0,0,0.1);
                ` : ''}
                ${currentThemeId === 'handwritten' ? `transform: rotate(0.5deg);` : ''}
            }
            ${currentThemeId === 'editorial' ? `
            .markdown-body blockquote::before {
                content: "“";
                display: block;
                font-family: "Playfair Display", serif;
                font-size: 3em;
                line-height: 0.5;
                margin-bottom: 0.2em;
                color: ${themeConfig.accent};
            }` : ''}

            /* Code */
            .markdown-body code {
                font-family: ${s['--font-code']};
                background: ${s['--code-bg']};
                color: ${s['--code-color']};
                padding: 0.2em 0.4em;
                border-radius: 4px;
                font-size: 0.85em;
                ${currentThemeId === 'editorial' ? `border: 1px solid rgba(0,0,0,0.05);` : ''}
            }
            .markdown-body pre {
                background: ${currentThemeId === 'swiss' ? '#000' : (currentThemeId === 'terminal' ? '#111' : '#F8F9FA')};
                padding: 1.5em;
                border-radius: ${currentThemeId === 'handwritten' ? '8px' : '0'};
                overflow-x: auto;
                margin: 1.5em 0;
                ${currentThemeId === 'handwritten' ? `border: 2px dashed ${themeConfig.accent}; background: #fff;` : ''}
                ${currentThemeId === 'terminal' ? `border: 1px solid #333;` : ''}
            }
            .markdown-body pre code {
                background: transparent;
                padding: 0;
                border: none;
                color: inherit;
            }

            /* Lists */
            .markdown-body ul, .markdown-body ol {
                padding-left: 1em;
            }
            .markdown-body ul li {
                position: relative;
                padding-left: 1em;
                margin-bottom: 0.5em;
                list-style: none; /* Reset standard bullets */
            }
            .markdown-body ul li::before {
                content: "${currentThemeId === 'terminal' ? '>' : (currentThemeId === 'handwritten' ? '-' : '•')}";
                position: absolute;
                left: -0.5em;
                color: ${themeConfig.accent};
                font-weight: bold;
            }
             /* Ordered List Counter Color */
            .markdown-body ol {
                counter-reset: item;
                list-style: none;
            }
            .markdown-body ol li {
                position: relative;
                padding-left: 1em;
                margin-bottom: 0.5em;
            }
            .markdown-body ol li::before {
                content: counter(item) ".";
                counter-increment: item;
                position: absolute;
                left: -0.8em;
                font-weight: bold;
                color: ${themeConfig.accent};
                font-family: ${s['--font-code']};
            }

            /* Bold & Highlight */
            .markdown-body strong {
                font-weight: 800;
                ${s['--bold-color'] ? `color: ${s['--bold-color']};` : ''}
                ${currentThemeId === 'handwritten' ? `
                    background: ${themeConfig.settings['--highlight-bg']};
                    padding: 0 0.2em;
                    box-decoration-break: clone;
                ` : ''}
                 ${currentThemeId === 'editorial' ? `
                    color: ${themeConfig.accent};
                ` : ''}
            }

            /* HR */
            .markdown-body hr {
                border: none;
                margin: 2.5em 0;
                text-align: center;
                ${currentThemeId === 'editorial' ? `height: auto;` : `
                    height: ${currentThemeId === 'swiss' ? '4px' : '1px'};
                    background: ${currentThemeId === 'swiss' ? themeConfig.accent : themeConfig.text};
                    opacity: ${currentThemeId === 'terminal' ? '1' : '0.1'};
                `}
                ${currentThemeId === 'handwritten' ? `
                     background: none;
                     border-top: 2px dashed ${themeConfig.accent};
                     opacity: 1;
                ` : ''}
            }
            ${currentThemeId === 'editorial' ? `
            .markdown-body hr::after {
                content: "✻ ✻ ✻";
                font-size: 1.2em;
                color: ${themeConfig.accent};
                letter-spacing: 0.8em;
            }
            ` : ''}
            
            /* Swiss Style Specials */
            ${currentThemeId === 'swiss' ? `
            .markdown-body strong { color: ${themeConfig.accent}; text-transform: uppercase; }
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
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '80px 80px',
                    pointerEvents: 'none'
                }} />
            )}

            {/* Handwritten Paper Texture */}
            {currentThemeId === 'handwritten' && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.4,
                    backgroundImage: `linear-gradient(#E5E7EB 1px, transparent 1px)`,
                    backgroundSize: '100% 2em',
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
                    marginTop: '80px',
                    paddingTop: '30px',
                    borderTop: currentThemeId === 'swiss' ? `6px solid ${themeConfig.accent}` : `1px solid ${themeConfig.text}20`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontFamily: themeConfig.settings['--font-heading'],
                    opacity: 0.9
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '32px', height: '32px',
                            background: themeConfig.accent,
                            borderRadius: currentThemeId === 'terminal' || currentThemeId === 'swiss' ? '0' : '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            color: currentThemeId === 'swiss' || currentThemeId === 'terminal' || currentThemeId === 'handwritten' ? themeConfig.bg : '#fff',
                            fontWeight: 'bold'
                        }}>
                            M
                        </div>
                        <span style={{ fontWeight: 'bold', fontSize: '1.4em', letterSpacing: '-0.02em' }}>MixBoard</span>
                    </div>
                    {currentThemeId === 'editorial' ? (
                        <span style={{ fontSize: '1em', fontFamily: '"Merriweather", serif', fontStyle: 'italic' }}>From the desk of AI</span>
                    ) : (
                        <span style={{ fontSize: '1em', opacity: 0.7, fontFamily: themeConfig.settings['--font-code'] }}>Created with AI</span>
                    )}
                </div>
            )}
        </div>
    );
});

export default ShareableContent;
