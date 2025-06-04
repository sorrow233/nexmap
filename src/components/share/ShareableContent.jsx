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

    // 6. Neon - 赛博朋克 (Cyberpunk)
    neon: {
        id: 'neon',
        name: 'Neon',
        fonts: ['Orbitron', 'Inter'],
        bg: '#050a14',
        text: '#E0E0E0',
        accent: '#00F0FF', // Cyan
        padding: 60,
        radius: 0,
        settings: {
            '--font-heading': '"Orbitron", sans-serif',
            '--font-body': '"Inter", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '3.0em',
            '--h1-weight': '900',
            '--h2-size': '2em',
            '--line-height': '1.7',
            '--block-margin': '1.5em',
            '--quote-style': 'italic',
            '--quote-border': '2px solid #FF00eb', // Magenta
            '--quote-bg': 'rgba(255, 0, 235, 0.05)',
            '--quote-color': '#FF00eb',
            '--code-bg': '#0a1020',
            '--code-color': '#00F0FF',
            '--bold-color': '#FF00eb', // Neon Pink
        }
    },

    // 7. Brutal - 粗野主义 (Brutalist)
    brutal: {
        id: 'brutal',
        name: 'Brutal',
        fonts: ['Archivo Black', 'Space Mono'],
        bg: '#FFFFFF',
        text: '#000000',
        accent: '#000000',
        padding: 50,
        radius: 0,
        settings: {
            '--font-heading': '"Archivo Black", sans-serif',
            '--font-body': '"Space Mono", monospace',
            '--font-code': '"Space Mono", monospace',
            '--h1-size': '3.5em',
            '--h1-weight': '900',
            '--h1-line-height': '1',
            '--h2-size': '2.2em',
            '--line-height': '1.5',
            '--block-margin': '2em',
            '--quote-style': 'normal',
            '--quote-border': '8px solid black',
            '--quote-bg': 'transparent',
            '--quote-color': '#000',
            '--code-bg': '#E0E0E0',
            '--code-color': '#000',
            '--border-color': '#000',
        }
    },

    // 8. Garden - 植物系 (Botanical)
    garden: {
        id: 'garden',
        name: 'Garden',
        fonts: ['Cormorant Garamond', 'Inter'],
        bg: '#F0F4EF', // Pale Sage
        text: '#2D3A30', // Deep Green
        accent: '#4A6741', // Sage Green
        padding: 70,
        radius: 12,
        settings: {
            '--font-heading': '"Cormorant Garamond", serif',
            '--font-body': '"Cormorant Garamond", serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--base-size': '20px',
            '--h1-size': '3.2em',
            '--h1-weight': '700',
            '--h2-size': '2.2em',
            '--h1-line-height': '1.1',
            '--line-height': '1.8',
            '--block-margin': '1.8em',
            '--quote-style': 'italic',
            '--quote-border': 'none',
            '--quote-bg': '#E6EBE6',
            '--quote-color': '#4A6741',
            '--code-bg': '#E6EBE6',
            '--code-color': '#2D3A30',
        }
    },

    // 9. Retro - 蒸汽波 (Vaporwave)
    retro: {
        id: 'retro',
        name: 'Retro',
        fonts: ['Press Start 2P', 'Inter'],
        bg: '#2B213A', // Dark Purple
        text: '#FFD1F9', // Pinkish White
        accent: '#FF71CE', // Vapor Pink
        padding: 60,
        radius: 0,
        settings: {
            '--font-heading': '"Press Start 2P", cursive',
            '--font-body': '"Inter", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '2.0em', // Pixel fonts run large
            '--h1-weight': '400',
            '--h2-size': '1.4em',
            '--line-height': '1.8',
            '--block-margin': '2em',
            '--quote-style': 'normal',
            '--quote-border': '4px dashed #01CDFE', // Cyan
            '--quote-bg': 'rgba(1, 205, 254, 0.1)',
            '--quote-color': '#01CDFE',
            '--code-bg': '#241B33',
            '--code-color': '#05FFA1', // Green
        }
    },

    // 10. Blueprint - 建筑图纸 (Architectural)
    blueprint: {
        id: 'blueprint',
        name: 'Blueprint',
        fonts: ['Share Tech Mono'],
        bg: '#003366', // Blueprint Blue
        text: '#FFFFFF',
        accent: '#FFCC00', // Yellow measure lines
        padding: 70,
        radius: 0,
        settings: {
            '--font-heading': '"Share Tech Mono", monospace',
            '--font-body': '"Share Tech Mono", monospace',
            '--font-code': '"Share Tech Mono", monospace',
            '--h1-size': '2.8em',
            '--h1-weight': '400',
            '--h2-size': '1.8em',
            '--line-height': '1.6',
            '--block-margin': '1.8em',
            '--quote-style': 'normal',
            '--quote-border': '1px solid #FFFFFF',
            '--quote-bg': 'rgba(255,255,255,0.05)',
            '--quote-color': '#E0E0E0',
            '--code-bg': 'rgba(0,0,0,0.2)',
            '--code-color': '#FFCC00',
            '--bold-color': '#FFCC00',
        }
    },

    // 11. Gazette - 旧报纸 (Vintage)
    gazette: {
        id: 'gazette',
        name: 'Gazette',
        fonts: ['UnifrakturMaguntia', 'Merriweather'],
        bg: '#F4ECD8', // Aged Paper
        text: '#211808',
        accent: '#8B0000',
        padding: 60,
        radius: 1,
        settings: {
            '--font-heading': '"UnifrakturMaguntia", serif',
            '--font-body': '"Merriweather", serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '4em',
            '--h1-weight': '400',
            '--h2-size': '2em',
            '--line-height': '1.7',
            '--block-margin': '1.5em',
            '--quote-style': 'italic',
            '--quote-border': 'double 4px #8B0000',
            '--quote-bg': 'transparent',
            '--quote-color': '#4A3B2A',
            '--code-bg': '#EBE3CE',
            '--code-color': '#211808',
        }
    },

    // 12. Library - 深色学院 (Dark Academia)
    library: {
        id: 'library',
        name: 'Library',
        fonts: ['Crimson Text', 'Playfair Display'],
        bg: '#1E1B18', // Very Dark Brown/Black
        text: '#D4C5B0', // Parchment text
        accent: '#C6A87C', // Gold
        padding: 80,
        radius: 4,
        settings: {
            '--font-heading': '"Playfair Display", serif',
            '--font-body': '"Crimson Text", serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '3.2em',
            '--h1-weight': '700',
            '--h1-line-height': '1.2',
            '--h2-size': '2.0em',
            '--line-height': '1.9',
            '--block-margin': '2em',
            '--quote-style': 'italic',
            '--quote-border': 'none',
            '--quote-bg': 'rgba(198, 168, 124, 0.08)',
            '--quote-color': '#C6A87C',
            '--code-bg': '#141210',
            '--code-color': '#C6A87C',
        }
    },

    // 13. Zen - 极简 (Minimal)
    zen: {
        id: 'zen',
        name: 'Zen',
        fonts: ['Quicksand', 'Inter'],
        bg: '#F8F9FA', // Off white
        text: '#495057', // Grey 700
        accent: '#ADB5BD', // Grey 500
        padding: 100, // Maximum whitespace
        radius: 20,
        settings: {
            '--font-heading': '"Quicksand", sans-serif',
            '--font-body': '"Quicksand", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '2.6em',
            '--h1-weight': '300', // Light weight
            '--h2-size': '1.8em',
            '--line-height': '2.0', // Super airy
            '--block-margin': '2.5em',
            '--quote-style': 'normal',
            '--quote-border': 'none',
            '--quote-bg': '#F1F3F5',
            '--quote-color': '#868E96',
            '--code-bg': '#F1F3F5',
            '--code-color': '#495057',
        }
    },

    // 14. Comic - 波普艺术 (Pop Art)
    comic: {
        id: 'comic',
        name: 'Comic',
        fonts: ['Bangers', 'Comic Neue'],
        bg: '#FFFFFF',
        text: '#000000',
        accent: '#FFEA00', // Yellow
        padding: 50,
        radius: 0,
        settings: {
            '--font-heading': '"Bangers", cursive',
            '--font-body': '"Comic Neue", cursive',
            '--font-code': '"JetBrains Mono", monospace',
            '--base-size': '22px', // Comic Neue is small
            '--h1-size': '3.5em',
            '--h1-weight': '400',
            '--h1-line-height': '1.1',
            '--h1-shadow': '3px 3px 0px #000',
            '--h2-size': '2.2em',
            '--line-height': '1.5',
            '--block-margin': '1.5em',
            '--quote-style': 'normal',
            '--quote-border': '3px solid black',
            '--quote-bg': '#FFEA00', // Yellow
            '--quote-color': '#000000',
            '--quote-shadow': '5px 5px 0px #000',
            '--code-bg': '#000',
            '--code-color': '#FFF',
            '--border-color': '#000',
        }
    },

    // 15. Bauhaus - 包豪斯 (Geometric)
    bauhaus: {
        id: 'bauhaus',
        name: 'Bauhaus',
        fonts: ['Jost'],
        bg: '#F0F0F0',
        text: '#111111',
        accent: '#D02121', // Red
        padding: 80,
        radius: 0,
        settings: {
            '--font-heading': '"Jost", sans-serif',
            '--font-body': '"Jost", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '4em',
            '--h1-weight': '900',
            '--h2-size': '2em',
            '--line-height': '1.6',
            '--block-margin': '2em',
            '--quote-style': 'normal',
            '--quote-border': 'none',
            '--quote-bg': '#FFFFFF',
            '--quote-color': '#111',
            '--code-bg': '#2B4FA1', // Blue
            '--code-color': '#FFFFFF',
            '--bold-color': '#D02121', // Red
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
            link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=JetBrains+Mono:wght@400;700&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400&family=Kalam:wght@300;400;700&family=Playfair+Display:wght@700;900&family=Orbitron:wght@400;700;900&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Archivo+Black&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Press+Start+2P&family=Share+Tech+Mono&family=UnifrakturMaguntia&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Quicksand:wght@300;400;500;700&family=Bangers&family=Comic+Neue:wght@400;700&family=Jost:wght@300;400;500;700&display=swap';
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
            ${currentThemeId === 'comic' ? `.markdown-body h1 { text-shadow: 3px 3px 0px #000; -webkit-text-stroke: 1px black; }` : ''}
            ${currentThemeId === 'neon' ? `.markdown-body h1 { text-shadow: 0 0 10px ${themeConfig.accent}, 0 0 20px ${themeConfig.accent}; }` : ''}

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

            /* Brutal Borders */
            ${currentThemeId === 'brutal' ? `
            .markdown-body img {
                border: 4px solid black;
                box-shadow: 8px 8px 0px black;
            }` : ''}

            /* Comic Borders */
            ${currentThemeId === 'comic' ? `
            .markdown-body img {
                border: 3px solid black;
                box-shadow: 6px 6px 0px black;
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

            {/* Blueprint Grid */}
            {currentThemeId === 'blueprint' && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                    pointerEvents: 'none'
                }} />
            )}

            {/* Comic Halftone */}
            {currentThemeId === 'comic' && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `radial-gradient(#e5e5e5 1px, transparent 1px)`,
                    backgroundSize: '10px 10px',
                    opacity: 0.5,
                    pointerEvents: 'none'
                }} />
            )}

            {/* Retro Sun Gradient */}
            {currentThemeId === 'retro' && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(180deg, rgba(43,33,58,0) 70%, rgba(255,113,206,0.1) 100%)`,
                    pointerEvents: 'none'
                }} />
            )}

            {/* Bauhaus Shapes */}
            {currentThemeId === 'bauhaus' && (
                <>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '150px', height: '150px', background: '#D02121', opacity: 0.1, borderRadius: '0 0 100% 0' }} />
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: '200px', height: '200px', background: '#2B4FA1', opacity: 0.1, clipPath: 'polygon(100% 100%, 0% 100%, 100% 0%)' }} />
                </>
            )}

            {/* Neon Glow */}
            {currentThemeId === 'neon' && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: `radial-gradient(circle at 50% 0%, rgba(0,240,255,0.1), transparent 70%)`,
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
