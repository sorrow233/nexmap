import React, { useRef, useState, useEffect } from 'react';
import ShareableContent from './ShareableContent';
import { Loader2 } from 'lucide-react';

const SharePreview = ({ content, theme, layout, showWatermark }) => {
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    const [scale, setScale] = useState(0.5);
    const [isCalculating, setIsCalculating] = useState(true);

    // Calculate scale to fit container
    useEffect(() => {
        const calculateScale = () => {
            if (!containerRef.current || !contentRef.current) return;

            const container = containerRef.current.getBoundingClientRect();
            const content = contentRef.current.getBoundingClientRect();

            // Get unscaled dimensions (revert previous scale to get true size)
            // Since we apply scale via transform, getBoundingClientRect might remain affected if we don't be careful.
            // Better: We know the fixed width of ShareableContent (1179 or 1920)
            const baseWidth = layout === 'slide' ? 1920 : 1179;
            // Height is dynamic, so we need to measure the DOM element's scrollHeight or offsetHeight *unscaled*.
            // But we can't easily unscale without rendering at 1.
            // Workaround: Use a wrapper with known width and measure height?
            // Actually, we can just read `offsetWidth` and `offsetHeight` of contentRef.current
            // assuming it has `transform: none` initially or we adjust.

            const contentWidth = contentRef.current.offsetWidth;
            const contentHeight = contentRef.current.offsetHeight;

            const padding = 64; // 32px padding on each side
            const availableWidth = container.width - padding;
            const availableHeight = container.height - padding;

            const scaleX = availableWidth / contentWidth;
            const scaleY = availableHeight / contentHeight;

            // Fit containment
            const newScale = Math.min(scaleX, scaleY, 0.85); // Cap at 0.85 to avoid too large
            setScale(newScale);
            setIsCalculating(false);
        };

        // Initial calc
        // We need a small delay to let ShareableContent render its markdown height
        const timer = setTimeout(calculateScale, 100);

        // Resize observer
        const observer = new ResizeObserver(calculateScale);
        if (containerRef.current) observer.observe(containerRef.current);
        if (contentRef.current) observer.observe(contentRef.current);

        return () => {
            clearTimeout(timer);
            observer.disconnect();
        };
    }, [content, theme, layout, showWatermark]); // Re-calc on any prop change

    return (
        <div ref={containerRef} className="flex-1 relative overflow-hidden bg-zinc-900/50 flex items-center justify-center p-8">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(120,119,198,0.1),transparent_50%)]" />
                <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_100%,rgba(74,86,160,0.1),transparent_50%)]" />
            </div>

            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.2]" style={{
                backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
                backgroundSize: '40px 40px'
            }} />

            {/* Loading Cover */}
            <div className={`absolute inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm transition-opacity duration-300 ${isCalculating ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {/* Only show loader if it takes > 200ms, effectively mostly invisible for fast renders */}
            </div>

            {/* Scales Container */}
            <div
                className="relative z-10 transition-transform duration-500 ease-out shadow-2xl shadow-black/50 rounded-xl ring-1 ring-white/10"
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center'
                }}
            >
                {/* 
                    We need a wrapper for ShareableContent that allows it to render at full size 
                    but doesn't constrain the parent flex container incorrectly.
                    The parent `div` (scaled) will have the size of the child.
                    The `transform` scales it visually.
                */}
                <div ref={contentRef} className="origin-center">
                    <ShareableContent
                        content={content}
                        theme={theme}
                        layout={layout}
                        showWatermark={showWatermark}
                    />
                </div>
            </div>
        </div>
    );
};

export default SharePreview;
