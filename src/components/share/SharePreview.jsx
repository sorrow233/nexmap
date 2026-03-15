import React, { useEffect, useRef, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import ShareableContent from './ShareableContent';
import { hasShareableContent } from './shareContent';

export default function SharePreview({
    content,
    theme,
    layout,
    showWatermark,
    themeLabel,
    layoutLabel,
    copy
}) {
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    const [scale, setScale] = useState(0.7);
    const [isCalculating, setIsCalculating] = useState(true);
    const hasContent = hasShareableContent(content);

    useEffect(() => {
        if (!hasContent) {
            setScale(1);
            setIsCalculating(false);
            return undefined;
        }

        let frameId = 0;
        let timeoutId = 0;
        let resizeHandler = null;

        const calculateScale = () => {
            if (!containerRef.current || !contentRef.current) {
                setIsCalculating(false);
                return;
            }

            const container = containerRef.current.getBoundingClientRect();
            const contentWidth = Math.max(contentRef.current.scrollWidth, contentRef.current.offsetWidth, 1);
            const contentHeight = Math.max(contentRef.current.scrollHeight, contentRef.current.offsetHeight, 1);

            const availableWidth = Math.max(container.width - 80, 1);
            const availableHeight = Math.max(container.height - 120, 1);
            const visualCap = container.width < 900 ? 0.74 : 0.9;
            const nextScale = Math.max(0.2, Math.min(availableWidth / contentWidth, availableHeight / contentHeight, visualCap));

            setScale(nextScale);
            setIsCalculating(false);
        };

        const scheduleScale = () => {
            setIsCalculating(true);
            cancelAnimationFrame(frameId);
            clearTimeout(timeoutId);
            frameId = requestAnimationFrame(() => {
                timeoutId = window.setTimeout(calculateScale, 60);
            });
        };

        scheduleScale();

        let observer = null;
        if (typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(scheduleScale);
            if (containerRef.current) observer.observe(containerRef.current);
            if (contentRef.current) observer.observe(contentRef.current);
        } else {
            resizeHandler = () => scheduleScale();
            window.addEventListener('resize', resizeHandler);
        }

        return () => {
            cancelAnimationFrame(frameId);
            clearTimeout(timeoutId);
            if (resizeHandler) {
                window.removeEventListener('resize', resizeHandler);
            }
            observer?.disconnect();
        };
    }, [content, hasContent, theme, layout, showWatermark]);

    return (
        <div className="flex h-full min-h-[360px] flex-col bg-[linear-gradient(180deg,#f8fbfd_0%,#eef4f8_100%)]">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                            {copy.previewLabel}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">{copy.previewHint}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                            {themeLabel}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                            {layoutLabel}
                        </span>
                    </div>
                </div>
            </div>

            <div ref={containerRef} className="relative flex min-h-0 flex-1 overflow-hidden p-4 sm:p-6">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-[12%] top-[8%] h-40 w-40 rounded-full bg-sky-200/55 blur-3xl" />
                    <div className="absolute bottom-[10%] right-[8%] h-48 w-48 rounded-full bg-slate-200/70 blur-3xl" />
                </div>

                <div className="relative flex h-full w-full items-start justify-center overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:p-6">
                    {hasContent ? (
                        <div
                            className="origin-top transition-transform duration-300 ease-out"
                            style={{ transform: `scale(${scale})` }}
                        >
                            <div
                                ref={contentRef}
                                className="overflow-hidden rounded-[28px] shadow-[0_20px_50px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/80"
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
                        <div className="my-auto w-full max-w-lg rounded-[28px] border border-slate-200 bg-white px-8 py-10 text-left shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
                                <FileText size={24} />
                            </span>
                            <h3 className="mt-6 text-2xl font-semibold text-slate-950">{copy.emptyTitle}</h3>
                            <p className="mt-3 text-sm leading-7 text-slate-500">
                                {copy.emptyDescription}
                            </p>
                        </div>
                    )}
                </div>

                <div
                    className={`absolute inset-0 z-20 flex items-center justify-center bg-white/55 backdrop-blur-sm transition-opacity duration-200 ${
                        isCalculating ? 'opacity-100' : 'pointer-events-none opacity-0'
                    }`}
                >
                    <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                        <Loader2 size={16} className="animate-spin text-slate-950" />
                        {copy.calculating}
                    </div>
                </div>
            </div>
        </div>
    );
}
