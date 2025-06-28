import React from 'react';
import { marked } from 'marked';
import { Sparkles } from 'lucide-react';

// Theme styles configuration
const THEME_STYLES = {
    business: {
        container: 'bg-slate-50 text-slate-800',
        card: 'bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-xl border border-slate-100',
        header: 'bg-gradient-to-r from-brand-500 to-purple-500',
        content: 'prose-slate',
        footer: 'border-slate-100 text-slate-400',
        brandText: 'text-slate-900',
        background: (
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}
            />
        ),
    },
    tech: {
        container: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white',
        card: 'bg-[#0B1120] border border-white/10 shadow-2xl',
        header: 'bg-gradient-to-r from-brand-500 to-purple-500',
        content: 'prose-invert',
        footer: 'border-white/10 text-slate-500',
        brandText: 'text-slate-200',
        background: (
            <>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
            </>
        ),
    },
    minimal: {
        container: 'bg-white text-slate-800',
        card: 'bg-white shadow-none border-0',
        header: 'bg-slate-200',
        content: 'prose-slate',
        footer: 'border-slate-100 text-slate-400',
        brandText: 'text-slate-700',
        background: null,
    },
    darkpro: {
        container: 'bg-black text-white',
        card: 'bg-gradient-to-br from-slate-900/80 to-black border border-white/5 shadow-2xl',
        header: 'bg-gradient-to-r from-brand-400 via-purple-500 to-pink-500',
        content: 'prose-invert',
        footer: 'border-white/5 text-slate-600',
        brandText: 'text-white',
        background: (
            <>
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-600/5 blur-[150px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-brand-500/5 blur-[120px] rounded-full pointer-events-none" />
            </>
        ),
    },
    colorful: {
        container: 'bg-gradient-to-br from-indigo-950 via-purple-900 to-pink-900 text-white',
        card: 'bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl',
        header: 'bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600',
        content: 'prose-invert',
        footer: 'border-white/10 text-white/50',
        brandText: 'text-white',
        background: (
            <>
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-500/20 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent pointer-events-none" />
            </>
        ),
    },
};

// Layout configurations
const LAYOUT_STYLES = {
    card: {
        width: 800,
        padding: 'p-16',
        cardClass: 'rounded-xl',
        headerClass: 'rounded-t-xl',
        aspectRatio: null,
    },
    full: {
        width: 800,
        padding: 'p-8',
        cardClass: 'rounded-none',
        headerClass: 'rounded-none',
        aspectRatio: null,
    },
    social: {
        width: 800,
        padding: 'p-12',
        cardClass: 'rounded-2xl',
        headerClass: 'rounded-t-2xl',
        aspectRatio: 1,
    },
    slide: {
        width: 1280,
        padding: 'p-16',
        cardClass: 'rounded-2xl',
        headerClass: 'rounded-t-2xl',
        aspectRatio: 16 / 9,
    },
};

const ShareableContent = React.forwardRef(({ content, theme = 'business', layout = 'card', showWatermark }, ref) => {
    const themeStyle = THEME_STYLES[theme] || THEME_STYLES.business;
    const layoutStyle = LAYOUT_STYLES[layout] || LAYOUT_STYLES.card;

    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\//g, '.');

    // Parse markdown content
    const htmlContent = marked.parse(content || '');

    // Calculate container dimensions
    const containerStyle = {
        width: `${layoutStyle.width}px`,
        fontFamily: '"Inter", sans-serif',
    };

    if (layoutStyle.aspectRatio) {
        containerStyle.height = `${layoutStyle.width / layoutStyle.aspectRatio}px`;
    } else {
        containerStyle.minHeight = '400px';
    }

    return (
        <div
            ref={ref}
            className={`
                flex flex-col ${layoutStyle.padding} relative overflow-hidden
                ${themeStyle.container}
            `}
            style={containerStyle}
        >
            {/* Background Effects */}
            {themeStyle.background}

            {/* Main Card Container */}
            <div className={`
                flex-grow relative z-10 flex flex-col
                ${themeStyle.card}
                ${layoutStyle.cardClass}
            `}>
                {/* Header Decoration */}
                <div className={`h-2 w-full ${themeStyle.header} ${layoutStyle.headerClass}`} />

                {/* Content */}
                <div className="p-12 flex-grow overflow-hidden">
                    <div
                        className={`
                            prose max-w-none leading-loose
                            ${themeStyle.content}
                            prose-headings:font-bold prose-headings:tracking-tight
                            prose-p:leading-9 prose-p:text-lg prose-p:mb-6
                            prose-pre:bg-slate-900 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl prose-pre:shadow-xl
                            prose-code:font-mono
                        `}
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                </div>

                {/* Footer / Watermark */}
                {showWatermark && (
                    <div className={`
                        mt-auto px-12 py-6 border-t flex justify-between items-center text-xs tracking-widest uppercase font-bold
                        ${themeStyle.footer}
                    `}>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
                                <Sparkles size={12} className="text-white" />
                            </div>
                            <span className={themeStyle.brandText}>
                                NexMap
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span>Generated with AI Insight</span>
                            <span className="opacity-50">|</span>
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
