/**
 * Theme and Layout configurations for ShareableContent export.
 * Extracted from ShareableContent.jsx for better maintainability.
 */

// Advanced Theme Configurations
export const THEME_CONFIGS = {
    // 1. Editorial - 纽约时报杂志风 (New York Editorial)
    editorial: {
        id: 'editorial',
        name: 'Editorial',
        fonts: ['Merriweather', 'Playfair Display', 'Inter'],
        bg: '#FDFBF7',
        text: '#333333',
        accent: '#8B0000',
        padding: 80,
        radius: 0,
        settings: {
            '--font-heading': '"Playfair Display", serif',
            '--font-body': '"Merriweather", serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '3.5em',
            '--h1-weight': '900',
            '--h1-line-height': '1.1',
            '--h2-size': '2em',
            '--line-height': '1.9',
            '--block-margin': '2em',
            '--quote-style': 'italic',
            '--quote-border': 'none',
            '--quote-bg': 'transparent',
            '--quote-color': '#555',
            '--code-bg': '#F5F5F0',
            '--code-color': '#8B0000',
        }
    },

    // 2. Terminal - 硅谷极客风 (Silicon Valley)
    terminal: {
        id: 'terminal',
        name: 'Silicon',
        fonts: ['JetBrains Mono', 'Inter'],
        bg: '#0F1115',
        text: '#E1E3E5',
        accent: '#58A6FF',
        padding: 60,
        radius: 8,
        settings: {
            '--font-heading': '"JetBrains Mono", monospace',
            '--font-body': '"JetBrains Mono", monospace',
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

    // 3. Modern - Notion 现代风
    modern: {
        id: 'modern',
        name: 'Modern',
        fonts: ['Inter'],
        bg: '#FFFFFF',
        text: '#37352F',
        accent: '#E16259',
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
            '--block-margin': '1em',
            '--quote-style': 'normal',
            '--quote-border': '3px solid #D1D5DB',
            '--quote-bg': 'transparent',
            '--quote-color': '#555',
            '--code-bg': 'rgba(235, 87, 87, 0.08)',
            '--code-color': '#EB5757',
        }
    },

    // 4. Swiss - 瑞士平面风 (International Style)
    swiss: {
        id: 'swiss',
        name: 'Swiss',
        fonts: ['Inter', 'Helvetica Neue', 'Arial'],
        bg: '#F4F4F4',
        text: '#111111',
        accent: '#D01111',
        padding: 90,
        radius: 0,
        settings: {
            '--font-heading': '"Inter", "Helvetica Neue", Arial, sans-serif',
            '--font-body': '"Inter", "Helvetica Neue", Arial, sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '4.2em',
            '--h1-weight': '900',
            '--h1-spacing': '-0.04em',
            '--h1-line-height': '0.95',
            '--h2-size': '2.2em',
            '--line-height': '1.6',
            '--block-margin': '2em',
            '--quote-style': 'normal',
            '--quote-border': 'none',
            '--quote-bg': '#FFFFFF',
            '--quote-color': '#000',
            '--code-bg': '#E0E0E0',
            '--code-color': '#D01111',
            '--bold-color': '#D01111',
        }
    },

    // 5. Handwritten - 手账温暖风 (Cozy)
    handwritten: {
        id: 'handwritten',
        name: 'Cozy',
        fonts: ['Kalam', 'Patrick Hand'],
        bg: '#FFFCF5',
        text: '#2C3E50',
        accent: '#FFAB76',
        padding: 60,
        radius: 4,
        settings: {
            '--font-heading': '"Kalam", cursive',
            '--font-body': '"Kalam", cursive',
            '--font-code': '"Kalam", cursive',
            '--base-size': '22px',
            '--h1-size': '3.5em',
            '--h1-weight': '700',
            '--h2-size': '2.4em',
            '--line-height': '1.8',
            '--block-margin': '1.6em',
            '--quote-style': 'normal',
            '--quote-border': 'none',
            '--quote-bg': '#FFF3C4',
            '--quote-color': '#2C3E50',
            '--quote-shadow': '3px 3px 0px rgba(0,0,0,0.05)',
            '--code-bg': '#E8F6F3',
            '--code-color': '#16A085',
            '--highlight-bg': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath d='M0 100 L0 20 Q 20 0, 40 20 T 80 20 T 100 20 L 100 100 Z' fill='rgba(255, 200, 100, 0.4)' /%3E%3C/svg%3E")`,
        }
    },

    // 6. Library - 深棕色与胡桃木 (Dark Walnut)
    library: {
        id: 'library',
        name: 'Library',
        fonts: ['Cormorant Garamond', 'serif'],
        bg: '#2C241B',
        text: '#E6DCC8',
        accent: '#D4AF37',
        padding: 80,
        radius: 4,
        settings: {
            '--font-heading': '"Cormorant Garamond", serif',
            '--font-body': '"Cormorant Garamond", serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '3.2em',
            '--h1-weight': '700',
            '--h2-size': '2.0em',
            '--line-height': '1.8',
            '--block-margin': '1.8em',
            '--quote-style': 'italic',
            '--quote-border': 'none',
            '--quote-bg': 'rgba(0,0,0,0.2)',
            '--quote-color': '#D4AF37',
            '--code-bg': '#1F1A13',
            '--code-color': '#E6DCC8',
        }
    },

    // 7. Parchment - 羊皮纸与褪色墨水 (Aged Paper)
    parchment: {
        id: 'parchment',
        name: 'Parchment',
        fonts: ['Crimson Text', 'serif'],
        bg: '#F2E8C9',
        text: '#4A3B2A',
        accent: '#8B4513',
        padding: 70,
        radius: 2,
        settings: {
            '--font-heading': '"Crimson Text", serif',
            '--font-body': '"Crimson Text", serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '3.0em',
            '--h1-weight': '600',
            '--h2-size': '1.9em',
            '--line-height': '1.75',
            '--block-margin': '1.6em',
            '--quote-style': 'normal',
            '--quote-border': '4px double #8B4513',
            '--quote-bg': 'transparent',
            '--quote-color': '#2F251B',
            '--code-bg': 'rgba(139, 69, 19, 0.08)',
            '--code-color': '#8B4513',
        }
    },

    // 8. Coffee - 咖啡渍与暖阳 (Espresso)
    coffee: {
        id: 'coffee',
        name: 'Coffee',
        fonts: ['Lora', 'serif'],
        bg: '#EBE5CE',
        text: '#3E2723',
        accent: '#795548',
        padding: 75,
        radius: 12,
        settings: {
            '--font-heading': '"Lora", serif',
            '--font-body': '"Lora", serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '2.8em',
            '--h1-weight': '700',
            '--h2-size': '1.8em',
            '--line-height': '1.9',
            '--block-margin': '1.8em',
            '--quote-style': 'italic',
            '--quote-border': 'none',
            '--quote-bg': '#D7CCC8',
            '--quote-color': '#3E2723',
            '--code-bg': '#D7CCC8',
            '--code-color': '#3E2723',
        }
    },

    // 9. Rainy - 阴雨天与湿润空气 (Moody)
    rainy: {
        id: 'rainy',
        name: 'Rainy',
        fonts: ['Playfair Display', 'Inter'],
        bg: '#CFD8DC',
        text: '#263238',
        accent: '#455A64',
        padding: 90,
        radius: 16,
        settings: {
            '--font-heading': '"Playfair Display", serif',
            '--font-body': '"Inter", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '3.2em',
            '--h1-weight': '900',
            '--h2-size': '2.0em',
            '--line-height': '2.0',
            '--block-margin': '2.2em',
            '--quote-style': 'italic',
            '--quote-border': 'none',
            '--quote-bg': 'linear-gradient(to right, rgba(255,255,255,0.4), transparent)',
            '--quote-color': '#37474F',
            '--code-bg': '#B0BEC5',
            '--code-color': '#263238',
        }
    },

    // 10. Academia - 常春藤与墨绿 (Ivy League)
    academia: {
        id: 'academia',
        name: 'Academia',
        fonts: ['EB Garamond', 'serif'],
        bg: '#F5F5F0',
        text: '#1B4D3E',
        accent: '#C5A059',
        padding: 85,
        radius: 6,
        settings: {
            '--font-heading': '"EB Garamond", serif',
            '--font-body': '"EB Garamond", serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '3.4em',
            '--h1-weight': '800',
            '--h2-size': '2.1em',
            '--line-height': '1.7',
            '--block-margin': '1.7em',
            '--quote-style': 'normal',
            '--quote-border': '1px solid #C5A059',
            '--quote-bg': '#FFFFFF',
            '--quote-color': '#1B4D3E',
            '--code-bg': '#E8F5E9',
            '--code-color': '#1B4D3E',
        }
    },

    // 11. Poetry - 诗歌与留白 (Elegance)
    poetry: {
        id: 'poetry',
        name: 'Poetry',
        fonts: ['Cinzel', 'Quicksand'],
        bg: '#FFFBF0',
        text: '#5D4037',
        accent: '#D84315',
        padding: 110,
        radius: 0,
        settings: {
            '--font-heading': '"Cinzel", serif',
            '--font-body': '"Quicksand", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '2.5em',
            '--h1-weight': '400',
            '--h1-spacing': '0.1em',
            '--h2-size': '1.6em',
            '--line-height': '2.2',
            '--block-margin': '2.5em',
            '--quote-style': 'italic',
            '--quote-border': 'none',
            '--quote-bg': 'transparent',
            '--quote-color': '#D84315',
            '--code-bg': '#FFF3E0',
            '--code-color': '#BF360C',
        }
    },

    // 12. Vintage - 皮革与黄铜 (Antique)
    vintage: {
        id: 'vintage',
        name: 'Vintage',
        fonts: ['Playfair Display', 'serif'],
        bg: '#3E2723',
        text: '#D7CCC8',
        accent: '#FFB74D',
        padding: 80,
        radius: 8,
        settings: {
            '--font-heading': '"Playfair Display", serif',
            '--font-body': '"Playfair Display", serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '3.0em',
            '--h1-weight': '700',
            '--h2-size': '2.0em',
            '--line-height': '1.8',
            '--block-margin': '2.0em',
            '--quote-style': 'italic',
            '--quote-border': 'none',
            '--quote-bg': 'rgba(255,255,255,0.05)',
            '--quote-color': '#FFB74D',
            '--code-bg': 'rgba(0,0,0,0.3)',
            '--code-color': '#D7CCC8',
            '--border-color': '#5D4037',
        }
    },

    // 13. Classic - 经典黑白 (Bodoni)
    classic: {
        id: 'classic',
        name: 'Classic',
        fonts: ['Playfair Display', 'Inter'],
        bg: '#FFFFFF',
        text: '#000000',
        accent: '#000000',
        padding: 90,
        radius: 0,
        settings: {
            '--font-heading': '"Playfair Display", serif',
            '--font-body': '"Inter", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '4.5em',
            '--h1-weight': '900',
            '--h2-size': '2.5em',
            '--line-height': '1.6',
            '--block-margin': '2.0em',
            '--quote-style': 'normal',
            '--quote-border': '4px solid #000',
            '--quote-bg': 'transparent',
            '--quote-color': '#000',
            '--code-bg': '#F5F5F5',
            '--code-color': '#000',
        }
    },

    // 14. Etching - 铜版画与棕褐 (Sepia)
    etching: {
        id: 'etching',
        name: 'Etching',
        fonts: ['Cormorant Garamond', 'serif'],
        bg: '#EADBC8',
        text: '#4E342E',
        accent: '#8D6E63',
        padding: 65,
        radius: 4,
        settings: {
            '--font-heading': '"Cormorant Garamond", serif',
            '--font-body': '"Cormorant Garamond", serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '2.8em',
            '--h1-weight': '600',
            '--h1-style': 'italic',
            '--h2-size': '1.8em',
            '--line-height': '1.7',
            '--block-margin': '1.5em',
            '--quote-style': 'italic',
            '--quote-border': '1px solid #8D6E63',
            '--quote-bg': 'transparent',
            '--quote-color': '#5D4037',
            '--code-bg': 'rgba(141, 110, 99, 0.1)',
            '--code-color': '#4E342E',
        }
    },

    // 15. Midnight - 深夜与银河 (Deep Night)
    midnight: {
        id: 'midnight',
        name: 'Midnight',
        fonts: ['Cinzel', 'Inter'],
        bg: '#0D1B2A',
        text: '#E0E1DD',
        accent: '#778DA9',
        padding: 85,
        radius: 12,
        settings: {
            '--font-heading': '"Cinzel", serif',
            '--font-body': '"Inter", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '3.0em',
            '--h1-weight': '700',
            '--h2-size': '2.0em',
            '--line-height': '1.8',
            '--block-margin': '2.0em',
            '--quote-style': 'normal',
            '--quote-border': 'none',
            '--quote-bg': 'rgba(255,255,255,0.05)',
            '--quote-color': '#E0E1DD',
            '--code-bg': '#1B263B',
            '--code-color': '#A9D6E5',
        }
    },

    // --- Japanese Aesthetic Themes ---

    // 16. Sakura - 樱花 (Sakura)
    sakura: {
        id: 'sakura',
        name: 'Sakura',
        fonts: ['Kiwi Maru', 'Inter'],
        bg: '#FFF0F5',
        text: '#5D3A3A',
        accent: '#FFB7B2',
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

    // 17. Matcha - 抹茶 (Matcha)
    matcha: {
        id: 'matcha',
        name: 'Matcha',
        fonts: ['Zen Maru Gothic', 'Inter'],
        bg: '#F2F7F2',
        text: '#3E4E3E',
        accent: '#8AA387',
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

    // 18. Manga - 漫画 (Manga)
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

    // 19. Sky - 天空 (Sky)
    sky: {
        id: 'sky',
        name: 'Sky',
        fonts: ['M PLUS Rounded 1c', 'Inter'],
        bg: '#E0F7FA',
        text: '#01579B',
        accent: '#4FC3F7',
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

    // 20. Citypop - 都市 (Citypop)
    citypop: {
        id: 'citypop',
        name: 'Citypop',
        fonts: ['DotGothic16', 'Inter'],
        bg: '#210046',
        text: '#FF00FF',
        accent: '#00FFFF',
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

    // 21. Ghibli - 森系 (Ghibli)
    ghibli: {
        id: 'ghibli',
        name: 'Ghibli',
        fonts: ['Yomogi', 'Inter'],
        bg: '#F5F5DC',
        text: '#4B5320',
        accent: '#8F9779',
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

    // 22. Peach - 蜜桃 (Peach)
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

    // 23. Lavender - 薰衣草 (Lavender)
    lavender: {
        id: 'lavender',
        name: 'Lavender',
        fonts: ['Zen Maru Gothic'],
        bg: '#F3E5F5',
        text: '#4A148C',
        accent: '#CE93D8',
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

    // 24. Sunset - 黄昏 (Sunset)
    sunset: {
        id: 'sunset',
        name: 'Sunset',
        fonts: ['Kiwi Maru'],
        bg: '#FFF3E0',
        text: '#5D4037',
        accent: '#FFAB91',
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

    // 25. Ocean - 海洋 (Ocean)
    ocean: {
        id: 'ocean',
        name: 'Ocean',
        fonts: ['M PLUS 1p'],
        bg: '#E0F2F1',
        text: '#004D40',
        accent: '#26A69A',
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

    // 26. Zen - 极简 (Minimal)
    zen: {
        id: 'zen',
        name: 'Zen',
        fonts: ['Quicksand', 'Inter'],
        bg: '#F8F9FA',
        text: '#495057',
        accent: '#ADB5BD',
        padding: 100,
        radius: 20,
        settings: {
            '--font-heading': '"Quicksand", sans-serif',
            '--font-body': '"Quicksand", sans-serif',
            '--font-code': '"JetBrains Mono", monospace',
            '--h1-size': '2.6em',
            '--h1-weight': '300',
            '--h2-size': '1.8em',
            '--line-height': '2.0',
            '--block-margin': '2.5em',
            '--quote-style': 'normal',
            '--quote-border': 'none',
            '--quote-bg': '#F1F3F5',
            '--quote-color': '#868E96',
            '--code-bg': '#F1F3F5',
            '--code-color': '#495057',
        }
    },
};

// Layout configs (Base 1179px)
export const LAYOUT_CONFIGS = {
    card: { width: 1179, aspectRatio: null, paddingScale: 1, centered: false },
    full: { width: 1179, aspectRatio: null, paddingOverride: 40, centered: false },
    social: { width: 1179, aspectRatio: 1, paddingScale: 1, centered: true },
    slide: { width: 1920, aspectRatio: 16 / 9, paddingScale: 1.5, centered: true },
};

// Theme ID mapping for legacy compatibility
export const THEME_MAP = {
    'business': 'editorial',
    'tech': 'terminal',
    'minimal': 'modern',
    'darkpro': 'swiss',
    'colorful': 'handwritten'
};

/**
 * Get background color for a theme (used for html2canvas)
 * @param {string} themeId - The theme ID
 * @returns {string} The background color hex code
 */
export function getThemeBackground(themeId) {
    const theme = THEME_CONFIGS[themeId];
    return theme?.bg || '#ffffff';
}

/**
 * Get all theme IDs
 * @returns {string[]} Array of theme IDs
 */
export function getAllThemeIds() {
    return Object.keys(THEME_CONFIGS);
}

/**
 * Get theme config by ID
 * @param {string} themeId - The theme ID
 * @returns {object|null} The theme configuration object or null
 */
export function getThemeConfig(themeId) {
    return THEME_CONFIGS[themeId] || null;
}
