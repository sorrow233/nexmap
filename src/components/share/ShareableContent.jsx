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



    // --- New Japanese Aesthetic Themes (10) ---

    // 6. Sakura - 樱花 (Sakura)
    sakura: {
        id: 'sakura',
        name: 'Sakura',
        fonts: ['Kiwi Maru', 'Inter'],
        bg: '#FFF0F5', // Lavender Blush
        text: '#5D3A3A',
        accent: '#FFB7B2', // Pastel Pink
        padding: 60,
        radius: 12,
        settings: {
            '--font-heading': '"Kiwi Maru", serif',
            '--font-body': '"Kiwi Maru", serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '3em',
            '--h1-weight': '500',
            '--h2-size': '2em',
            '--line-height': '1.8',
            '--block-margin': '1.8em',
            '--quote-style': 'normal',
            '--quote-border': 'none',
            '--quote-bg': 'rgba(255, 183, 178, 0.2)',
            '--quote-color': '#D65A5A',
            '--code-bg': '#FFF5F7',
            '--code-color': '#D65A5A',
        }
    },

    // 7. Matcha - 抹茶 (Matcha)
    matcha: {
        id: 'matcha',
        name: 'Matcha',
        fonts: ['Zen Maru Gothic', 'Inter'],
        bg: '#F2F7F2', // Very pale green
        text: '#3E4E3E', // Dark olive
        accent: '#8AA387', // Sage
        padding: 70,
        radius: 8,
        settings: {
            '--font-heading': '"Zen Maru Gothic", sans-serif',
            '--font-body': '"Zen Maru Gothic", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '2.8em',
            '--h1-weight': '700',
            '--h2-size': '1.8em',
            '--line-height': '1.9',
            '--block-margin': '2em',
            '--quote-style': 'normal',
            '--quote-border': '4px solid #8AA387',
            '--quote-bg': 'transparent',
            '--quote-color': '#5D705D',
            '--code-bg': '#E9F0E9',
            '--code-color': '#3E4E3E',
        }
    },

    // 8. Manga - 漫画 (Manga)
    manga: {
        id: 'manga',
        name: 'Manga',
        fonts: ['Dela Gothic One', 'Inter'],
        bg: '#FFFFFF',
        text: '#000000',
        accent: '#000000',
        padding: 50,
        radius: 0,
        settings: {
            '--font-heading': '"Dela Gothic One", cursive',
            '--font-body': '"Inter", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '3.2em',
            '--h1-weight': '400',
            '--h2-size': '2em',
            '--line-height': '1.6',
            '--block-margin': '1.5em',
            '--quote-style': 'normal',
            '--quote-border': '4px solid black',
            '--quote-bg': 'transparent',
            '--quote-color': '#000',
            '--code-bg': '#F0F0F0',
            '--code-color': '#000',
        }
    },

    // 9. Sky - 天空 (Sky)
    sky: {
        id: 'sky',
        name: 'Sky',
        fonts: ['M PLUS Rounded 1c', 'Inter'],
        bg: '#E0F7FA', // Light Cyan
        text: '#01579B', // Dark Blue
        accent: '#4FC3F7', // Light Blue
        padding: 80,
        radius: 16,
        settings: {
            '--font-heading': '"M PLUS Rounded 1c", sans-serif',
            '--font-body': '"M PLUS Rounded 1c", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '3em',
            '--h1-weight': '800',
            '--h2-size': '2em',
            '--line-height': '1.8',
            '--block-margin': '2em',
            '--quote-style': 'normal',
            '--quote-border': 'none',
            '--quote-bg': 'rgba(255, 255, 255, 0.6)',
            '--quote-color': '#0277BD',
            '--code-bg': 'rgba(255, 255, 255, 0.4)',
            '--code-color': '#01579B',
        }
    },

    // 10. Citypop - 都市 (Citypop)
    citypop: {
        id: 'citypop',
        name: 'Citypop',
        fonts: ['DotGothic16', 'Inter'],
        bg: '#210046', // Deep Purple
        text: '#FF00FF', // Magenta
        accent: '#00FFFF', // Cyan
        padding: 60,
        radius: 0,
        settings: {
            '--font-heading': '"DotGothic16", sans-serif',
            '--font-body': '"Inter", sans-serif',
            '--font-code': '"DotGothic16", sans-serif',
            '--h1-size': '2.5em',
            '--h1-weight': '400',
            '--h2-size': '1.8em',
            '--line-height': '1.7',
            '--block-margin': '1.8em',
            '--quote-style': 'italic',
            '--quote-border': '2px solid #00FFFF',
            '--quote-bg': 'transparent',
            '--quote-color': '#00FFFF',
            '--code-bg': '#110022',
            '--code-color': '#FF00FF',
        }
    },

    // 11. Ghibli - 森系 (Ghibli)
    ghibli: {
        id: 'ghibli',
        name: 'Ghibli',
        fonts: ['Yomogi', 'Inter'],
        bg: '#F5F5DC', // Beige
        text: '#4B5320', // Army Green
        accent: '#8F9779', // Sage
        padding: 80,
        radius: 6,
        settings: {
            '--font-heading': '"Yomogi", cursive',
            '--font-body': '"Yomogi", cursive',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '3.2em',
            '--h1-weight': '400',
            '--h2-size': '2.2em',
            '--line-height': '1.9',
            '--block-margin': '2em',
            '--quote-style': 'normal',
            '--quote-border': 'none',
            '--quote-bg': 'rgba(143, 151, 121, 0.2)',
            '--quote-color': '#4B5320',
            '--code-bg': '#E8E8D0',
            '--code-color': '#333300',
        }
    },

    // 12. Peach - 蜜桃 (Peach)
    peach: {
        id: 'peach',
        name: 'Peach',
        fonts: ['M PLUS Rounded 1c'],
        bg: '#FFF5F5',
        text: '#D66D75',
        accent: '#E29587',
        padding: 70,
        radius: 20,
        settings: {
            '--font-heading': '"M PLUS Rounded 1c", sans-serif',
            '--font-body': '"M PLUS Rounded 1c", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '3em',
            '--h1-weight': '700',
            '--h2-size': '2em',
            '--line-height': '1.8',
            '--block-margin': '2em',
            '--quote-style': 'normal',
            '--quote-border': 'none',
            '--quote-bg': '#FFE0E0',
            '--quote-color': '#D66D75',
            '--code-bg': '#FFE0E0',
            '--code-color': '#C44D58',
        }
    },

    // 13. Lavender - 薰衣草 (Lavender)
    lavender: {
        id: 'lavender',
        name: 'Lavender',
        fonts: ['Zen Maru Gothic'],
        bg: '#F3E5F5', // Pale Purple
        text: '#4A148C', // Dark Purple
        accent: '#CE93D8', // Light Purple
        padding: 80,
        radius: 12,
        settings: {
            '--font-heading': '"Zen Maru Gothic", sans-serif',
            '--font-body': '"Zen Maru Gothic", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '2.8em',
            '--h1-weight': '700',
            '--h2-size': '1.8em',
            '--line-height': '2.0',
            '--block-margin': '2em',
            '--quote-style': 'italic',
            '--quote-border': 'none',
            '--quote-bg': '#FFFFFF',
            '--quote-color': '#7B1FA2',
            '--code-bg': '#FFFFFF',
            '--code-color': '#4A148C',
        }
    },

    // 14. Sunset - 黄昏 (Sunset)
    sunset: {
        id: 'sunset',
        name: 'Sunset',
        fonts: ['Kiwi Maru'],
        bg: '#FFF3E0', // Orange Lighter
        text: '#5D4037', // Brown
        accent: '#FFAB91', // Deep Orange
        padding: 60,
        radius: 4,
        settings: {
            '--font-heading': '"Kiwi Maru", serif',
            '--font-body': '"Kiwi Maru", serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '3.2em',
            '--h1-weight': '500',
            '--h2-size': '2em',
            '--line-height': '1.8',
            '--block-margin': '1.8em',
            '--quote-style': 'normal',
            '--quote-border': '1px solid #FFAB91',
            '--quote-bg': 'rgba(255, 171, 145, 0.1)',
            '--quote-color': '#BF360C',
            '--code-bg': '#FFE0B2',
            '--code-color': '#3E2723',
        }
    },

    // 15. Ocean - 海洋 (Ocean)
    ocean: {
        id: 'ocean',
        name: 'Ocean',
        fonts: ['M PLUS 1p'],
        bg: '#E0F2F1', // Teal Light
        text: '#004D40', // Teal Dark
        accent: '#26A69A', // Teal
        padding: 90,
        radius: 0,
        settings: {
            '--font-heading': '"M PLUS 1p", sans-serif',
            '--font-body': '"M PLUS 1p", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '3em',
            '--h1-weight': '700',
            '--h2-size': '2em',
            '--line-height': '1.8',
            '--block-margin': '2.2em',
            '--quote-style': 'normal',
            '--quote-border': 'none',
            '--quote-bg': 'rgba(38, 166, 154, 0.1)',
            '--quote-color': '#00695C',
            '--code-bg': '#B2DFDB',
            '--code-color': '#004D40',
        }
    },

    // 16. Zen - 极简 (Minimal)
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

    // --- Minimalist / Swiss Style Themes (10) ---

    // 17. Swiss Classic - 经典瑞士 (Helvetica Hero)
    swiss_classic: {
        id: 'swiss_classic',
        name: 'Swiss Classic',
        fonts: ['Inter'], // Using Inter as Helvetica proxy for web reliability
        bg: '#FFFFFF',
        text: '#000000',
        accent: '#FF3B30', // Vibrant functionality red
        padding: 80,
        radius: 0,
        settings: {
            '--font-heading': '"Inter", "Helvetica Neue", Arial, sans-serif',
            '--font-body': '"Inter", "Helvetica Neue", Arial, sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '5em', // Hero scale
            '--h1-weight': '900', // Heavy
            '--h1-spacing': '-0.05em', // Tight
            '--h1-line-height': '0.9',
            '--h2-size': '2.5em',
            '--line-height': '1.4',
            '--block-margin': '2em',
            '--quote-style': 'normal',
            '--quote-border': 'none',
            '--quote-bg': 'transparent',
            '--quote-color': '#000',
            // Specific: Big bold separation
            '--border-color': '#000',
            '--code-bg': '#F5F5F5',
            '--code-color': '#000',
        }
    },

    // 18. Grid Theory - 网格理论 (Ordered)
    swiss_grid: {
        id: 'swiss_grid',
        name: 'Grid Theory',
        fonts: ['Inter'],
        bg: '#F0F0F0', // Neutral grey grid base
        text: '#1A1A1A',
        accent: '#0055FF', // Blueprint Blue
        padding: 60,
        radius: 0,
        settings: {
            '--font-heading': '"Inter", sans-serif',
            '--font-body': '"Inter", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '3em',
            '--h1-weight': '700',
            '--h2-size': '2em',
            '--line-height': '1.6',
            '--block-margin': '2em',
            '--quote-style': 'italic',
            '--quote-border': '2px solid #0055FF',
            '--quote-bg': '#FFFFFF',
            '--quote-color': '#1A1A1A',
            '--code-bg': '#FFFFFF',
            '--code-color': '#0055FF',
        }
    },

    // 19. Dark Rational - 理性黑 (Dark Swiss)
    swiss_dark: {
        id: 'swiss_dark',
        name: 'Dark Rational',
        fonts: ['Inter'],
        bg: '#050505', // Almost black
        text: '#F5F5F5',
        accent: '#D01111', // Swiss Red
        padding: 90,
        radius: 0,
        settings: {
            '--font-heading': '"Inter", sans-serif',
            '--font-body': '"Inter", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '4em',
            '--h1-weight': '700',
            '--h1-spacing': '-0.03em',
            '--h2-size': '2.2em',
            '--line-height': '1.5',
            '--block-margin': '2.2em',
            '--quote-style': 'normal',
            '--quote-border': 'none',
            '--quote-bg': '#1A1A1A',
            '--quote-color': '#fff',
            '--code-bg': '#1A1A1A',
            '--code-color': '#D01111',
            '--border-color': '#333',
        }
    },

    // 20. Braun Aesthetics - 重工设计 (Functional)
    swiss_braun: {
        id: 'swiss_braun',
        name: 'Braun',
        fonts: ['Inter'],
        bg: '#EBEBEB', // Matte mechanism grey
        text: '#222222',
        accent: '#E65100', // Industrial Orange
        padding: 70,
        radius: 4, // Slight industrial radius
        settings: {
            '--font-heading': '"Inter", sans-serif',
            '--font-body': '"Inter", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '2.8em',
            '--h1-weight': '600',
            '--h2-size': '1.8em',
            '--line-height': '1.5',
            '--block-margin': '1.5em',
            '--quote-style': 'normal',
            '--quote-border': 'none',
            '--quote-bg': '#DCDCDC',
            '--quote-color': '#444',
            '--code-bg': '#222',
            '--code-color': '#E65100', // Orange on Black
        }
    },

    // 21. International - 国际主义 (Airport)
    swiss_intl: {
        id: 'swiss_intl',
        name: 'International',
        fonts: ['Inter'],
        bg: '#FDFDFD',
        text: '#111',
        accent: '#000', // Stark Contrast
        padding: 50,
        radius: 0,
        settings: {
            '--font-heading': '"Inter", sans-serif',
            '--font-body': '"Inter", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '3.2em',
            '--h1-weight': '800', // Extra Bold
            '--h2-size': '2em',
            '--line-height': '1.3', // Tighter
            '--block-margin': '1.2em', // Information Design
            '--quote-style': 'normal',
            '--quote-border': '4px solid #000',
            '--quote-bg': 'transparent',
            '--quote-color': '#000',
            '--code-bg': '#F1F1F1',
            '--code-color': '#000',
        }
    },

    // 22. Architect - 建筑师 (Brutalist)
    swiss_arch: {
        id: 'swiss_arch',
        name: 'Architect',
        fonts: ['JetBrains Mono', 'Inter'],
        bg: '#D6D6D6', // Concrete
        text: '#000',
        accent: '#000',
        padding: 100,
        radius: 0,
        settings: {
            '--font-heading': '"JetBrains Mono", monospace', // Technical
            '--font-body': '"Inter", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '4.5em',
            '--h1-weight': '300', // Light
            '--h1-spacing': '-0.05em',
            '--h2-size': '2em',
            '--line-height': '1.6',
            '--block-margin': '3em',
            '--quote-style': 'italic',
            '--quote-border': 'none',
            '--quote-bg': '#C0C0C0', // Darker Concrete
            '--quote-color': '#000',
            '--code-bg': '#000',
            '--code-color': '#FFF',
            '--border-color': '#000',
        }
    },

    // 23. Typographic - 字体排印 (Scale)
    swiss_type: {
        id: 'swiss_type',
        name: 'Typographic',
        fonts: ['Playfair Display', 'Inter'],
        bg: '#FFFFFF',
        text: '#222',
        accent: '#222',
        padding: 80,
        radius: 0,
        settings: {
            '--font-heading': '"Playfair Display", serif', // Contrast serif header
            '--font-body': '"Inter", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '6em', // Massive
            '--h1-weight': '400',
            '--h1-line-height': '0.8',
            '--h2-size': '2em',
            '--line-height': '1.8',
            '--block-margin': '2em',
            '--quote-style': 'italic',
            '--quote-border': '1px solid #222',
            '--quote-bg': 'transparent',
            '--quote-color': '#222',
            '--code-bg': '#F9F9F9',
            '--code-color': '#222',
        }
    },

    // 24. Poster - 海报 (Graphic)
    swiss_poster: {
        id: 'swiss_poster',
        name: 'Poster',
        fonts: ['Inter'],
        bg: '#F25042', // Bold Red Background
        text: '#FFFFFF',
        accent: '#FFFFFF',
        padding: 80,
        radius: 0,
        settings: {
            '--font-heading': '"Inter", sans-serif',
            '--font-body': '"Inter", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '5em',
            '--h1-weight': '900',
            '--h1-line-height': '0.85',
            '--h2-size': '2.5em',
            '--line-height': '1.5',
            '--block-margin': '2em',
            '--quote-style': 'normal',
            '--quote-border': 'none',
            '--quote-bg': '#D13025', // Darker Red
            '--quote-color': '#FFF',
            '--code-bg': '#FFFFFF',
            '--code-color': '#F25042', // Inverted
            '--border-color': '#FFF',
        }
    },

    // 25. Mono Rational - 等宽理性 (Technical)
    swiss_mono: {
        id: 'swiss_mono',
        name: 'Mono Rational',
        fonts: ['JetBrains Mono'],
        bg: '#F5F7FA',
        text: '#333',
        accent: '#000',
        padding: 60,
        radius: 0,
        settings: {
            '--font-heading': '"Inter", sans-serif',
            '--font-body': '"JetBrains Mono", monospace', // Mono body for code feel
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '3em',
            '--h1-weight': '700',
            '--h2-size': '1.8em',
            '--line-height': '1.6',
            '--block-margin': '1.8em',
            '--quote-style': 'normal',
            '--quote-border': '1px solid #333',
            '--quote-bg': 'transparent',
            '--quote-color': '#333',
            '--code-bg': '#E1E4E8',
            '--code-color': '#000',
        }
    },

    // 26. Clean State - 纯白 (Blank)
    swiss_clean: {
        id: 'swiss_clean',
        name: 'Clean State',
        fonts: ['Inter'],
        bg: '#FFFFFF',
        text: '#444',
        accent: '#999',
        padding: 120, // Extreme padding
        radius: 0,
        settings: {
            '--font-heading': '"Inter", sans-serif',
            '--font-body': '"Inter", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '2em', // Restrained
            '--h1-weight': '500', // Medium
            '--h2-size': '1.5em',
            '--line-height': '2.2', // Very loose
            '--block-margin': '3em',
            '--quote-style': 'normal',
            '--quote-border': 'none',
            '--quote-bg': 'transparent',
            '--quote-color': '#888',
            '--code-bg': '#FAFAFA',
            '--code-color': '#666',
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
            // Added: Cormorant Garamond, EB Garamond, Cinzel, Lora, Crimson Text
            link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=JetBrains+Mono:wght@400;700&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400&family=Kalam:wght@300;400;700&family=Playfair+Display:wght@700;900&family=Quicksand:wght@300;400;500;700&family=Kiwi+Maru:wght@300;400;500&family=Zen+Maru+Gothic:wght@300;400;500;700&family=Dela+Gothic+One&family=M+PLUS+Rounded+1c:wght@300;400;500;700;800&family=DotGothic16&family=Yomogi&family=M+PLUS+1p:wght@300;400;500;700&display=swap';
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
