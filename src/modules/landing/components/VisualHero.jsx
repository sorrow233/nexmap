import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MousePointer2, Layout, Zap, Hash, Compass } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

const VisualHero = ({ scrollProgress, onStart }) => {
    const navigate = useNavigate();
    const { t } = useLanguage();

    // Keyframes for the "Dive" effect
    // 0 -> 1: The camera moves forward into the cloud of cards
    const clampedProgress = Math.max(0, Math.min(1, scrollProgress));

    // Camera movement
    const zOffset = clampedProgress * 2500; // Move deeply into the scene
    const fadeOut = Math.max(0, 1 - clampedProgress * 2); // Text fades out quickly

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden perspective-[1000px]">

            {/* 3D SCENE CONTAINER */}
            <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                    perspective: '1000px',
                    transformStyle: 'preserve-3d',
                }}
            >
                {/* THE UNIVERSE OF CARDS - Hidden on mobile to prevent overflow */}
                <div
                    className="hidden md:block relative w-[100vw] h-[100vh]"
                    style={{
                        transform: `translateZ(${clampedProgress * 1500}px)`,
                        transformStyle: 'preserve-3d',
                        transition: 'transform 0.1s linear' // Smooth scroll link
                    }}
                >
                    {/* Background Grid Floor - giving sense of depth */}
                    <div
                        className="absolute inset-[-100%] opacity-20"
                        style={{
                            transform: 'rotateX(80deg) translateY(500px) translateZ(-500px)',
                            backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
                            backgroundSize: '100px 100px',
                            width: '300%',
                            height: '300%'
                        }}
                    />

                    {/* HERO CARDS - The ones closest to camera initially */}
                    <FloatingCard x={-20} y={-15} z={0} rotate={-12} icon={Layout} color="bg-blue-500" title={t.hero.cards.alpha} />
                    <FloatingCard x={25} y={10} z={-100} rotate={15} icon={Zap} color="bg-amber-500" title={t.hero.cards.ideas} delay={0.2} />
                    <FloatingCard x={-30} y={25} z={-200} rotate={-8} icon={Hash} color="bg-purple-500" title={t.hero.cards.tags} delay={0.5} />
                    <FloatingCard x={35} y={-25} z={-150} rotate={10} icon={Compass} color="bg-emerald-500" title={t.hero.cards.explore} delay={0.3} />

                    {/* DEEP FIELD CARDS - Create the "Tunnel" effect */}
                    <FloatingCard x={-10} y={-40} z={-500} rotate={20} icon={MousePointer2} color="bg-pink-500" size="sm" />
                    <FloatingCard x={40} y={40} z={-600} rotate={-15} icon={Layout} color="bg-indigo-500" size="sm" />
                    <FloatingCard x={-45} y={15} z={-800} rotate={-5} icon={Hash} color="bg-cyan-500" size="sm" />
                    <FloatingCard x={20} y={-30} z={-900} rotate={12} icon={Zap} color="bg-rose-500" size="sm" />

                    {/* The "Event Horizon" cards */}
                    <FloatingCard x={0} y={0} z={-1500} rotate={0} icon={Compass} color="bg-white/10" size="lg" isGhost />
                </div>
            </div>

            {/* HERO TEXT - Stays front and center until scroll */}
            <div
                className="relative z-10 text-center px-4 max-w-5xl mx-auto will-change-transform mt-[-5vh]"
                style={{
                    opacity: fadeOut,
                    transform: `scale(${1 + clampedProgress * 0.5}) blur(${clampedProgress * 20}px)`,
                    pointerEvents: fadeOut <= 0.1 ? 'none' : 'auto'
                }}
            >
                {/* Brand Pill */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)] mb-8 animate-fade-in-up">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-gray-400 text-sm font-medium tracking-wide">{t.hero.brand}</span>
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-[8rem] lg:text-[10rem] leading-[0.95] md:leading-[0.9] font-bold tracking-tighter text-white mb-4 md:mb-6 font-inter-tight">
                    {t.hero.title1} <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 relative">
                        {t.hero.title2}
                        <div className="absolute inset-0 bg-blue-500/20 blur-[100px] -z-10" />
                    </span>
                </h1>

                <p className="text-base sm:text-lg md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-8 md:mb-12 px-4 animate-fade-in-up delay-[200ms]">
                    {t.hero.sub1} <br className="hidden sm:block" />
                    <span className="text-white font-semibold">{t.hero.sub2}</span>
                </p>

                <div className="flex flex-col gap-4 md:flex-row md:gap-6 justify-center items-center animate-fade-in-up delay-[400ms] w-full px-4">
                    <button
                        onClick={() => navigate('/gallery')}
                        className="group relative px-8 py-4 md:px-10 md:py-5 bg-white text-black rounded-full text-lg md:text-xl font-bold overflow-hidden transition-transform hover:scale-105 w-full sm:w-auto"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            {t.hero.ctaPrimary}
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <button
                        onClick={onStart}
                        className="px-6 py-3 md:px-8 md:py-5 text-gray-400 hover:text-white transition-colors flex items-center gap-2 font-medium"
                    >
                        {t.hero.ctaSecondary} <span className="animate-bounce">↓</span>
                    </button>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div
                className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 transition-opacity duration-500"
                style={{ opacity: fadeOut }}
            >
                <div className="w-[1px] h-20 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
            </div>
        </div>
    );
};

const FloatingCard = ({ x, y, z, rotate, icon: Icon, color, title, size = 'md', delay = 0, isGhost = false }) => {
    // x, y in vw/vh
    const sizeClasses = size === 'sm' ? 'w-48 h-32' : size === 'lg' ? 'w-96 h-64' : 'w-72 h-44';

    return (
        <div
            className={`absolute ${sizeClasses} rounded-2xl flex flex-col p-5 border shadow-2xl animate-float-medium transition-all duration-700
                ${isGhost ? 'bg-transparent border-white/5' : 'bg-[#0A0A0A] border-white/10'}`}
            style={{
                left: `calc(50% + ${x}vw)`,
                top: `calc(50% + ${y}vh)`,
                transform: `translate(-50%, -50%) translateZ(${z}px) rotate(${rotate}deg)`,
                animationDelay: `${delay}s`
            }}
        >
            {!isGhost && (
                <>
                    <div className="flex items-center gap-3 mb-auto">
                        <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,0,0,0.3)]`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        {title && <span className="text-white/80 font-semibold text-sm">{title}</span>}
                    </div>
                    <div className="space-y-3 opacity-30">
                        <div className="h-2 w-3/4 bg-white/50 rounded-full" />
                        <div className="h-2 w-1/2 bg-white/50 rounded-full" />
                    </div>
                </>
            )}
        </div>
    );
};

export default VisualHero;
