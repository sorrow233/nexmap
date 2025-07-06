import React from 'react';
import ShareableContent from './ShareableContent';

const SharePreview = ({ content, theme, layout, showWatermark }) => {
    return (
        <div className="flex-1 relative overflow-hidden bg-zinc-900/50 flex items-center justify-center p-8">
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

            {/* Live Preview Container */}
            <div className="relative z-10 transform ml-auto mr-auto transition-transform duration-500 ease-out hover:scale-[0.56] scale-[0.55] shadow-2xl shadow-black/50 rounded-xl overflow-hidden ring-1 ring-white/10">
                <ShareableContent
                    content={content}
                    theme={theme}
                    layout={layout}
                    showWatermark={showWatermark}
                />
            </div>
        </div>
    );
};

export default SharePreview;
