import React, { useState, useEffect } from 'react';
import VisualHero from './components/VisualHero';
import TopNav from './components/TopNav';
import SEO from '../../components/SEO';

// Lazy Load Heavy Sections
const FeatureBento = React.lazy(() => import('./components/FeatureBento'));
const ConcurrencySection = React.lazy(() => import('./components/ConcurrencySection'));
const SpatialSection = React.lazy(() => import('./components/SpatialSection'));
const DemoInfinite = React.lazy(() => import('./components/DemoInfinite'));
const SproutSection = React.lazy(() => import('./components/SproutSection'));
const GraphSection = React.lazy(() => import('./components/GraphSection'));
const PricingSection = React.lazy(() => import('./components/PricingSection'));
const FooterSection = React.lazy(() => import('./components/FooterSection'));



// The New Landing Orchestrator
const LandingModule = () => {
    // --- Global Scroll Fix ---
    useEffect(() => {
        const doc = document.documentElement;
        const body = document.body;
        const rootEl = document.getElementById('root');

        // 1. Force the document to be scrollable
        doc.style.height = 'auto';
        doc.style.overflowY = 'auto';
        doc.style.overflowX = 'hidden';

        // 2. Allow body to grow
        body.style.height = 'auto';
        body.style.overflowY = 'visible';
        body.style.overflowX = 'hidden';

        // 3. Unlock root
        if (rootEl) {
            rootEl.style.height = 'auto';
            rootEl.style.overflowY = 'visible';
            rootEl.style.overflowX = 'hidden';
        }

        return () => {
            doc.style.height = '';
            doc.style.overflowY = '';
            doc.style.overflowX = '';

            body.style.height = '';
            body.style.overflowY = '';
            body.style.overflowX = '';

            if (rootEl) {
                rootEl.style.height = '';
                rootEl.style.overflowY = '';
                rootEl.style.overflowX = '';
            }
        };
    }, []);

    const [scrollProgress, setScrollProgress] = useState(0);

    // Track scroll for VisualHero
    useEffect(() => {
        const handleScroll = () => {
            const scrTop = window.scrollY;
            const innerH = window.innerHeight;
            const progress = scrTop / innerH;
            setScrollProgress(progress);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleStart = () => {
        const nextSection = window.innerHeight;
        window.scrollTo({ top: nextSection, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
            <SEO title="Home" />
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&display=swap');
                ::-webkit-scrollbar { width: 0px; background: transparent; }
                .font-inter-tight { font-family: 'Inter Tight', sans-serif; }
                
                @keyframes fade-in-up {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
                
                @keyframes float-slow {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); }
                    33% { transform: translate(10px, -10px) rotate(2deg); }
                    66% { transform: translate(-5px, 15px) rotate(-1deg); }
                }
                .animate-float-slow { animation: float-slow 12s ease-in-out infinite; }
            `}</style>

            {/* 1. VISUAL HERO (Sticky) - Keep Eager for LCP */}
            <div className="h-screen w-full sticky top-0 z-0">
                <VisualHero scrollProgress={scrollProgress} onStart={handleStart} />
            </div>

            {/* Spacer for Sticky Hero */}
            <div className="h-[20vh] md:h-[50vh]" />

            {/* Lazy Load Below-the-Fold Sections */}
            <React.Suspense fallback={<div className="min-h-screen bg-[#050505]" />}>
                {/* 2. FEATURE BENTO */}
                <div className="relative z-20 bg-[#050505] border-t border-b border-white/5">
                    <FeatureBento />
                </div>

                {/* 3. UNLIMITED CONCURRENCY */}
                <div className="relative z-10 bg-[#050505] border-t border-white/5">
                    <ConcurrencySection />
                </div>

                {/* 4. SPATIAL ORGANIZATION */}
                <div className="relative z-10 border-t border-white/5">
                    <SpatialSection />
                </div>

                {/* 5. DEMO INFINITE (Embrace Chaos) */}
                <div className="relative z-10 border-t border-white/5">
                    <DemoInfinite />
                </div>

                {/* 6. RECURSIVE SPROUT */}
                <div className="relative z-10 border-t border-white/5">
                    <SproutSection />
                </div>

                {/* 7. GRAPH CONTEXT WALKING */}
                <div className="relative z-10 border-t border-white/5">
                    <GraphSection />
                </div>

                {/* 8. PRICING SECTION */}
                <div className="relative z-10 border-t border-white/5 bg-[#0A0A0A]">
                    <PricingSection showTitle={true} />
                </div>

                {/* FOOTER */}
                <div className="relative z-20">
                    <FooterSection />
                </div>
            </React.Suspense>

            {/* Top Navigation Overlay - Keep Eager */}
            <TopNav />

        </div>
    );
};

export default LandingModule;
