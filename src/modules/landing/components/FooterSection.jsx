import React from 'react';

const FooterSection = () => {
    return (
        <div className="py-24 bg-black border-t border-white/10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-900/5 blur-3xl pointer-events-none" />

            <h2 className="text-4xl md:text-5xl font-bold mb-8 relative z-10">Start Thinking in <span className="text-blue-500">Connections</span>.</h2>
            <button
                onClick={() => window.location.href = '/gallery'}
                className="px-12 py-4 bg-white text-black rounded-full text-lg font-bold hover:scale-105 transition-transform hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] relative z-10"
            >
                Launch Alpha
            </button>
            <div className="mt-12 text-white/20 text-sm">
                &copy; 2024 Mixboard. All rights reserved.
            </div>
        </div>
    );
};

export default FooterSection;
