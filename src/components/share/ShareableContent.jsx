import React from 'react';
import { marked } from 'marked';
import { Sparkles, Zap, Star, Gem, Flame } from 'lucide-react';

/**
 * 5 个高端主题设计 - 独立于页面暗/亮模式
 * 使用内联样式确保导出颜色一致
 */
const THEME_CONFIGS = {
    // 1. Executive - 顶级商务白金风格
    business: {
        name: 'Executive',
        icon: Star,
        // 使用纯色和微妙渐变，避免 Tailwind 类受暗模式影响
        containerBg: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
        containerColor: '#0f172a',
        cardBg: '#ffffff',
        cardShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08), 0 12px 24px -8px rgba(0, 0, 0, 0.04)',
        cardBorder: '1px solid rgba(226, 232, 240, 0.8)',
        cardRadius: '24px',
        headerGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        headerHeight: '6px',
        contentBg: 'transparent',
        proseColor: '#1e293b',
        proseHeadingColor: '#0f172a',
        footerBg: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
        footerBorder: '1px solid #e2e8f0',
        footerColor: '#64748b',
        brandColor: '#0f172a',
        accentGradient: 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
        backgroundDecor: (
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.03) 1px, transparent 0)',
                backgroundSize: '32px 32px',
                pointerEvents: 'none'
            }} />
        ),
    },

    // 2. Midnight - 深邃科技夜空
    tech: {
        name: 'Midnight',
        icon: Zap,
        containerBg: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)',
        containerColor: '#f8fafc',
        cardBg: 'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(2, 6, 23, 0.95) 100%)',
        cardShadow: '0 32px 64px -16px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        cardBorder: '1px solid rgba(148, 163, 184, 0.1)',
        cardRadius: '28px',
        headerGradient: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 35%, #a855f7 65%, #ec4899 100%)',
        headerHeight: '4px',
        contentBg: 'transparent',
        proseColor: '#e2e8f0',
        proseHeadingColor: '#f8fafc',
        footerBg: 'transparent',
        footerBorder: '1px solid rgba(148, 163, 184, 0.1)',
        footerColor: '#94a3b8',
        brandColor: '#f8fafc',
        accentGradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
        backgroundDecor: (
            <>
                <div style={{
                    position: 'absolute',
                    top: '-20%',
                    right: '-10%',
                    width: '600px',
                    height: '600px',
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                    pointerEvents: 'none'
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '-10%',
                    left: '-10%',
                    width: '400px',
                    height: '400px',
                    background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                    pointerEvents: 'none'
                }} />
            </>
        ),
    },

    // 3. Paper - 纯净极简印刷风
    minimal: {
        name: 'Paper',
        icon: Gem,
        containerBg: '#ffffff',
        containerColor: '#18181b',
        cardBg: '#ffffff',
        cardShadow: 'none',
        cardBorder: 'none',
        cardRadius: '0',
        headerGradient: 'linear-gradient(90deg, #18181b 0%, #3f3f46 100%)',
        headerHeight: '2px',
        contentBg: 'transparent',
        proseColor: '#27272a',
        proseHeadingColor: '#09090b',
        footerBg: 'transparent',
        footerBorder: '1px solid #e4e4e7',
        footerColor: '#71717a',
        brandColor: '#18181b',
        accentGradient: 'linear-gradient(135deg, #18181b 0%, #52525b 100%)',
        backgroundDecor: null,
    },

    // 4. Obsidian - 深黑奢华
    darkpro: {
        name: 'Obsidian',
        icon: Flame,
        containerBg: 'linear-gradient(180deg, #09090b 0%, #18181b 100%)',
        containerColor: '#fafafa',
        cardBg: 'linear-gradient(180deg, #18181b 0%, #0f0f10 100%)',
        cardShadow: '0 40px 80px -20px rgba(0, 0, 0, 0.8), inset 0 1px 0 0 rgba(255, 255, 255, 0.03)',
        cardBorder: '1px solid rgba(255, 255, 255, 0.06)',
        cardRadius: '32px',
        headerGradient: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 30%, #ea580c 70%, #dc2626 100%)',
        headerHeight: '3px',
        contentBg: 'transparent',
        proseColor: '#d4d4d8',
        proseHeadingColor: '#fafafa',
        footerBg: 'transparent',
        footerBorder: '1px solid rgba(255, 255, 255, 0.05)',
        footerColor: '#71717a',
        brandColor: '#fafafa',
        accentGradient: 'linear-gradient(135deg, #fbbf24 0%, #ea580c 100%)',
        backgroundDecor: (
            <>
                <div style={{
                    position: 'absolute',
                    top: '10%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '800px',
                    height: '400px',
                    background: 'radial-gradient(ellipse, rgba(251, 191, 36, 0.06) 0%, transparent 60%)',
                    filter: 'blur(60px)',
                    pointerEvents: 'none'
                }} />
            </>
        ),
    },

    // 5. Aurora - 极光渐变
    colorful: {
        name: 'Aurora',
        icon: Sparkles,
        containerBg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #4c1d95 50%, #581c87 75%, #701a75 100%)',
        containerColor: '#faf5ff',
        cardBg: 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
        cardShadow: '0 32px 64px -16px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
        cardBorder: '1px solid rgba(255, 255, 255, 0.15)',
        cardRadius: '32px',
        headerGradient: 'linear-gradient(90deg, #22d3ee 0%, #818cf8 25%, #c084fc 50%, #f472b6 75%, #fb923c 100%)',
        headerHeight: '4px',
        contentBg: 'transparent',
        proseColor: '#e9d5ff',
        proseHeadingColor: '#faf5ff',
        footerBg: 'transparent',
        footerBorder: '1px solid rgba(255, 255, 255, 0.1)',
        footerColor: 'rgba(250, 245, 255, 0.6)',
        brandColor: '#faf5ff',
        accentGradient: 'linear-gradient(135deg, #22d3ee 0%, #c084fc 50%, #fb923c 100%)',
        backgroundDecor: (
            <>
                <div style={{
                    position: 'absolute',
                    top: '-30%',
                    left: '20%',
                    width: '600px',
                    height: '600px',
                    background: 'radial-gradient(circle, rgba(34, 211, 238, 0.2) 0%, transparent 50%)',
                    filter: 'blur(100px)',
                    pointerEvents: 'none'
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '-20%',
                    right: '10%',
                    width: '500px',
                    height: '500px',
                    background: 'radial-gradient(circle, rgba(244, 114, 182, 0.2) 0%, transparent 50%)',
                    filter: 'blur(80px)',
                    pointerEvents: 'none'
                }} />
                <div style={{
                    position: 'absolute',
                    top: '40%',
                    right: '30%',
                    width: '300px',
                    height: '300px',
                    background: 'radial-gradient(circle, rgba(251, 146, 60, 0.15) 0%, transparent 50%)',
                    filter: 'blur(60px)',
                    pointerEvents: 'none'
                }} />
            </>
        ),
    },
};

// Layout configurations (Base: 1179px = iPhone 14 Pro Retina Standard)
const LAYOUT_CONFIGS = {
    card: { width: 1179, aspectRatio: null, padding: 88 },
    full: { width: 1179, aspectRatio: null, padding: 64 },
    social: { width: 1179, aspectRatio: 1, padding: 88 },
    slide: { width: 2048, aspectRatio: 16 / 9, padding: 128 }, // 2K Slide
};

const ShareableContent = React.forwardRef(({ content, theme = 'business', layout = 'card', showWatermark }, ref) => {
    const themeConfig = THEME_CONFIGS[theme] || THEME_CONFIGS.business;
    const layoutConfig = LAYOUT_CONFIGS[layout] || LAYOUT_CONFIGS.card;
    const IconComponent = themeConfig.icon;

    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Parse markdown content
    const htmlContent = marked.parse(content || '');

    // Common Text Styles (Typography Scaled for 1080px)
    // Base 17px -> 24px (approx 1.4x scale)
    const baseTextStyle = {
        fontFamily: themeConfig.fontFamily,
        color: themeConfig.proseColor,
        fontSize: '24px',
        lineHeight: '1.85',
        letterSpacing: theme === 'tech' ? '-0.02em' : '0.01em',
    };

    return (
        <div
            ref={ref}
            style={{
                width: `${layoutConfig.width}px`,
                // Auto height, but with aspect ratio constraint if needed
                minHeight: layoutConfig.aspectRatio ? `${layoutConfig.width / layoutConfig.aspectRatio}px` : '1000px',
                background: themeConfig.containerBg,
                padding: `${layoutConfig.padding}px`,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                isolation: 'isolate', // Dark mode independence
                justifyContent: layout === 'slide' || layout === 'social' ? 'center' : 'flex-start',
            }}
        >
            {/* Background Decorations */}
            {themeConfig.backgroundDecor}

            {/* Main Content Card */}
            <div
                style={{
                    backgroundColor: themeConfig.cardBg,
                    boxShadow: themeConfig.cardShadow,
                    border: themeConfig.cardBorder,
                    borderRadius: '32px', // Scaled radius
                    overflow: 'hidden',
                    position: 'relative',
                    zIndex: 10,
                    width: '100%',
                    height: layout === 'full' ? '100%' : 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Header Accent */}
                {themeConfig.headerHeight !== '0' && (
                    <div style={{
                        width: '100%',
                        height: '12px', // Scaled Header Height
                        background: themeConfig.headerGradient,
                    }} />
                )}

                {/* Content Area - Typography Engine */}
                <div style={{
                    padding: '80px 96px', // Scaled padding (was 48px 56px)
                    flex: 1,
                }}>
                    <div
                        dangerouslySetInnerHTML={{
                            __html: htmlContent
                                // H1: Grand Title (Scaled)
                                .replace(/<h1/g, `<h1 style="
                                    font-size: 3.2em; /* ~76px */
                                    line-height: 1.3;
                                    font-weight: 800;
                                    color: ${themeConfig.proseHeadingColor};
                                    margin-bottom: 0.8em;
                                    margin-top: 0;
                                    letter-spacing: -0.03em;
                                "`)
                                // H2: Section Title (Scaled)
                                .replace(/<h2/g, `<h2 style="
                                    font-size: 2.4em; /* ~57px */
                                    line-height: 1.4;
                                    font-weight: 700;
                                    color: ${themeConfig.proseHeadingColor};
                                    margin-top: 1.5em;
                                    margin-bottom: 0.6em;
                                    letter-spacing: -0.02em;
                                    border-bottom: 2px solid ${theme === 'tech' || theme === 'darkpro' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
                                    padding-bottom: 0.3em;
                                "`)
                                // H3: Subsection (Scaled)
                                .replace(/<h3/g, `<h3 style="
                                    font-size: 1.8em; /* ~43px */
                                    line-height: 1.5;
                                    font-weight: 600;
                                    color: ${themeConfig.proseHeadingColor};
                                    margin-top: 1.2em;
                                    margin-bottom: 0.4em;
                                "`)
                                // Paragraph: Readable Body
                                .replace(/<p/g, `<p style="
                                    ${Object.entries(baseTextStyle).map(([k, v]) => `${k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}:${v}`).join(';')};
                                    margin-bottom: 1.5em;
                                "`)
                                // List Items: Clean Indentation
                                .replace(/<ul/g, `<ul style="margin-bottom: 1.5em; padding-left: 1.2em; list-style-type: none;">`)
                                .replace(/<li/g, `<li style="
                                    ${Object.entries(baseTextStyle).map(([k, v]) => `${k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}:${v}`).join(';')};
                                    margin-bottom: 0.5em;
                                    position: relative;
                                    padding-left: 1em;
                                ">
                                    <span style="
                                        position: absolute;
                                        left: -0.8em;
                                        color: ${theme === 'colorful' ? themeConfig.brandColor : 'currentColor'};
                                        opacity: 0.6;
                                    ">•</span>
                                `)
                                // Blockquote: Editorial Style
                                .replace(/<blockquote/g, `<blockquote style="
                                    border-left: 6px solid ${themeConfig.brandColor}; /* Scaled border */
                                    margin: 1.5em 0;
                                    padding: 1em 1.5em; /* Scaled padding */
                                    background: ${theme === 'darkpro' || theme === 'tech' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'};
                                    border-radius: 0 12px 12px 0;
                                    font-style: italic;
                                "`)
                                // Strong: Emphasis
                                .replace(/<strong/g, `<strong style="
                                    font-weight: 700;
                                    color: ${themeConfig.proseHeadingColor};
                                "`)
                                // Code: Rounded & Clean
                                .replace(/<code/g, `<code style="
                                    font-family: 'JetBrains Mono', monospace;
                                    font-size: 0.9em;
                                    padding: 0.2em 0.4em;
                                    border-radius: 6px;
                                    background: ${theme === 'darkpro' || theme === 'tech' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'};
                                    color: ${themeConfig.proseHeadingColor};
                                "`)
                        }}
                    />
                </div>

                {/* Footer / Watermark (Re-designed & Scaled) */}
                {showWatermark && (
                    <div style={{
                        padding: '32px 96px', // Scaled padding
                        background: themeConfig.footerBg,
                        borderTop: themeConfig.footerBorder,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        {/* Left: Brand Identity */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '48px', // Scaled icon size
                                height: '48px',
                                borderRadius: '12px',
                                background: themeConfig.accentGradient,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px -2px rgba(0,0,0,0.2)'
                            }}>
                                <IconComponent size={24} color="#ffffff" strokeWidth={2.5} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{
                                    color: themeConfig.brandColor,
                                    fontSize: '16px', // Scaled font
                                    fontWeight: '800',
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    lineHeight: '1.2'
                                }}>NexMap</span>
                                <span style={{
                                    fontSize: '13px', // Scaled sub font
                                    color: themeConfig.footerColor,
                                    fontWeight: '500'
                                }}>Visual Thinking</span>
                            </div>
                        </div>

                        {/* Right: Meta Info */}
                        <div style={{
                            fontSize: '14px', // Scaled meta font
                            color: themeConfig.footerColor,
                            fontWeight: '600',
                            letterSpacing: '0.05em',
                            display: 'flex',
                            gap: '24px',
                            alignItems: 'center',
                            textTransform: 'uppercase'
                        }}>
                            <span>AI Insight</span>
                            <span style={{
                                width: '2px',
                                height: '16px',
                                background: 'currentColor',
                                opacity: 0.2
                            }} />
                            <span>{currentDate}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

ShareableContent.displayName = 'ShareableContent';

export default ShareableContent;
