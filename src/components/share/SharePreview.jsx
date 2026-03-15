import React, { useEffect, useRef, useState } from 'react';
import { FileText, Loader2, Maximize2, Sparkles } from 'lucide-react';
import ShareableContent from './ShareableContent';
import { hasShareableContent } from './shareContent';

export default function SharePreview({
    content,
    theme,
    layout,
    showWatermark,
    themeLabel,
    layoutLabel,
    layoutSize,
    copy
}) {
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    const [scale, setScale] = useState(0.42);
    const [isCalculating, setIsCalculating] = useState(true);
    const hasContent = hasShareableContent(content);

    useEffect(() => {
        let frameId = 0;
        let timeoutId = 0;

        const calculateScale = () => {
            if (!containerRef.current || !contentRef.current) return;

            const container = containerRef.current.getBoundingClientRect();
            const contentWidth = Math.max(contentRef.current.scrollWidth, contentRef.current.offsetWidth, 1);
            const contentHeight = Math.max(contentRef.current.scrollHeight, contentRef.current.offsetHeight, 1);

            const availableWidth = Math.max(container.width - 64, 1);
            const availableHeight = Math.max(container.height - 104, 1);
            const visualCap = container.width < 900 ? 0.42 : container.width < 1180 ? 0.56 : 0.76;
            const nextScale = Math.max(0.18, Math.min(availableWidth / contentWidth, availableHeight / contentHeight, visualCap));

            setScale(nextScale);
            setIsCalculating(false);
        };

        const scheduleScale = () => {
            setIsCalculating(true);
            cancelAnimationFrame(frameId);
            clearTimeout(timeoutId);

            frameId = requestAnimationFrame(() => {
                timeoutId = window.setTimeout(calculateScale, 80);
            });
        };

        scheduleScale();

        const observer = new ResizeObserver(scheduleScale);
        if (containerRef.current) observer.observe(containerRef.current);
        if (contentRef.current) observer.observe(contentRef.current);

        return () => {
            cancelAnimationFrame(frameId);
            clearTimeout(timeoutId);
            observer.disconnect();
        };
    }, [content, theme, layout, showWatermark]);

    return (
        <div
            ref={containerRef}
            className="relative flex min-h-[300px] flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#17304e_0%,#08121d_48%,#04070d_100%)] px-4 py-6 sm:px-6 lg:px-8"
        >
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:42px_42px] opacity-20" />
                <div className="absolute left-[12%] top-[10%] h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
                <div className="absolute bottom-[12%] right-[8%] h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl" />
            </div>

            <div className="absolute left-4 right-4 top-4 z-20 flex flex-wrap items-center gap-2 sm:left-6 sm:right-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-white/90 backdrop-blur-xl">
                    <Sparkles size={12} className="text-cyan-300" />
                    {copy.previewLabel}
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-medium text-white/70 backdrop-blur-xl">
                    {themeLabel}
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-medium text-white/70 backdrop-blur-xl">
                    {layoutLabel}
                </span>
            </div>

            <div className="relative z-10 flex h-full w-full items-center justify-center py-12">
                {hasContent ? (
                    <div
                        className="relative transition-transform duration-500 ease-out"
                        style={{
                            transform: `scale(${scale})`,
                            transformOrigin: 'center center'
                        }}
                    >
                        <div
                            ref={contentRef}
                            className="overflow-hidden rounded-[28px] shadow-[0_35px_80px_rgba(0,0,0,0.45)] ring-1 ring-black/10"
                        >
                            <ShareableContent
                                content={content}
                                theme={theme}
                                layout={layout}
                                showWatermark={showWatermark}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-white/[0.04] px-8 py-10 text-left shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-200">
                            <FileText size={24} />
                        </span>
                        <h3 className="mt-6 text-2xl font-semibold text-white">没有可导出的内容</h3>
                        <p className="mt-3 text-sm leading-7 text-slate-300">
                            当前这次导出没有拿到正文内容。请关闭后重新打开导出面板，再试一次。
                        </p>
                    </div>
                )}
            </div>

            <div className="absolute bottom-4 left-4 right-4 z-20 hidden items-center justify-between gap-3 sm:left-6 sm:right-6 md:flex">
                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white/70 backdrop-blur-xl">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                        {copy.livePreview}
                    </div>
                    <div className="mt-1 text-sm font-medium text-white/90">
                        {copy.previewHint}
                    </div>
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-medium text-white/85 backdrop-blur-xl">
                    <Maximize2 size={15} className="text-cyan-300" />
                    <span>{layoutSize}</span>
                    <span className="text-white/35">/</span>
                    <span>{Math.round(scale * 100)}%</span>
                </div>
            </div>

            <div
                className={`absolute inset-0 z-30 flex items-center justify-center bg-[#050a12]/45 backdrop-blur-sm transition-opacity duration-200 ${
                    isCalculating ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
            >
                <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-xl">
                    <Loader2 size={16} className="animate-spin text-cyan-300" />
                    {copy.calculating}
                </div>
            </div>
        </div>
    );
}
