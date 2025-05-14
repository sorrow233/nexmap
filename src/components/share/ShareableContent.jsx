import React from 'react';
import { marked } from 'marked';
import { Sparkles } from 'lucide-react';

const ShareableContent = React.forwardRef(({ content, theme, showWatermark }, ref) => {
    const isBusiness = theme === 'business';
    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\//g, '.');

    // Parse markdown content
    const htmlContent = marked.parse(content || '');

    return (
        <div
            ref={ref}
            className={`
                w-[800px] min-h-[400px] flex flex-col p-16 relative overflow-hidden
                ${isBusiness
                    ? 'bg-slate-50 text-slate-800'
                    : 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white'
                }
            `}
            style={{
                fontFamily: '"Inter", sans-serif'
            }}
        >
            {/* Background Texture/Effects */}
            {isBusiness ? (
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}
                />
            ) : (
                <>
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/10 blur-[120px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
                </>
            )}

            {/* Main Card Container */}
            <div className={`
                flex-grow relative z-10 flex flex-col
                ${isBusiness
                    ? 'bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-xl border border-slate-100'
                    : 'bg-[#0B1120] border border-white/10 shadow-2xl'
                }
            `}>
                {/* Header Decoration */}
                <div className="h-2 w-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-t-xl" />

                {/* Content */}
                <div className="p-12 flex-grow">
                    <div
                        className={`
                            prose max-w-none leading-loose
                            ${isBusiness ? 'prose-slate' : 'prose-invert'}
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
                        ${isBusiness ? 'border-slate-100 text-slate-400' : 'border-white/10 text-slate-500'}
                    `}>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
                                <Sparkles size={12} className="text-white" />
                            </div>
                            <span className={isBusiness ? 'text-slate-900' : 'text-slate-200'}>
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

export default ShareableContent;
