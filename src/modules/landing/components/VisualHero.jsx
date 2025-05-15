import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MousePointer2, Star, Zap, Grid } from 'lucide-react';

const VisualHero = ({ scrollProgress, onStart }) => {
    const navigate = useNavigate();

    // Core animation values
    // 0 -> 1 range
    // Fade out and zoom in as we scroll past
    const opacity = Math.max(0, 1 - scrollProgress * 2.5);
    const scale = 1 + scrollProgress * 1;
    const blur = scrollProgress * 10;
    const translateY = scrollProgress * 200;

    // "Cloud" Parallax
    const cloudRotate = scrollProgress * 20; // Rotate the cloud slightly

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 overflow-hidden pointer-events-none">
            {/* 3D Cloud of Cards Background */}
            <div
                className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none"
                style={{
                    perspective: '1000px',
                    transformStyle: 'preserve-3d',
                }}
            >
                <div
                    className="relative w-[100vw] h-[100vh]"
                    style={{
                        transform: `scale(${1 + scrollProgress}) rotateX(${cloudRotate * 0.5}deg) rotateY(${cloudRotate}deg) translateZ(${-scrollProgress * 500}px)`,
                        transformStyle: 'preserve-3d',
                        transition: 'transform 0.1s linear'
                    }}
                >
                    {/* Floating Cards - Strategic Placement */}
                    <FloatingCard x={-35} y={-25} z={-100} rotate={-10} icon={Star} color="bg-yellow-400" delay={0} />
                    <FloatingCard x={35} y={-20} z={-150} rotate={15} icon={Zap} color="bg-blue-500" delay={1} />
                    <FloatingCard x={-45} y={15} z={-200} rotate={-5} icon={Grid} color="bg-purple-500" delay={2} />
                    <FloatingCard x={40} y={25} z={-120} rotate={8} icon={MousePointer2} color="bg-pink-500" delay={3} />

                    {/* Deeper Layer */}
                    <FloatingCard x={-15} y={-40} z={-400} rotate={20} icon={Star} color="bg-green-400" size="sm" delay={1.5} />
                    <FloatingCard x={20} y={35} z={-350} rotate={-15} icon={Zap} color="bg-orange-500" size="sm" delay={2.5} />
                </div>
            </div>

            {/* Main Content */}
            <div
                className="relative z-10 text-center px-4 will-change-transform"
                style={{
                    opacity,
                    transform: `translateY(${translateY}px) scale(${scale})`,
                    filter: `blur(${blur}px)`,
                }}
            >
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-md rounded-full border border-gray-200/50 shadow-sm mb-8 animate-fade-in-up">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-semibold text-gray-600 tracking-wide">v2.0 Now Available</span>
                </div>

                <div className="relative inline-block mb-8">
                    <h1
                        className="text-6xl md:text-8xl lg:text-[10rem] font-bold tracking-tighter text-[#1a1a1a] leading-[0.9] mix-blend-tighten"
                        style={{ fontFamily: '"Inter Tight", sans-serif' }}
                    >
                        Your Mind,<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 animate-gradient-x p-2 block">
                            Unbounded.
                        </span>
                    </h1>
                </div>

                <p className="text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto font-light leading-relaxed mb-12 animate-fade-in-up delay-100">
                    The infinite canvas where ideas grow, connect, and evolve. <br className="hidden md:block" />
                    <b>Stop organizing files. Start organizing thoughts.</b>
                </p>

                <div className="pointer-events-auto flex flex-col md:flex-row gap-6 justify-center items-center animate-fade-in-up delay-200">
                    <button
                        onClick={() => navigate('/gallery')}
                        className="group relative px-10 py-5 bg-[#1a1a1a] text-white rounded-full text-xl font-medium overflow-hidden transition-all hover:scale-105 hover:shadow-2xl shadow-xl active:scale-95"
                    >
                        <span className="relative z-10 flex items-center gap-3">
                            Start Creating Free
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>

                    <button
                        onClick={onStart}
                        className="group px-8 py-5 bg-white/50 backdrop-blur-sm border border-gray-200 text-gray-600 hover:text-black hover:bg-white rounded-full font-medium transition-all text-lg shadow-sm hover:shadow-lg"
                    >
                        <span className="flex items-center gap-2">
                            Full Tour
                            <span className="group-hover:translate-y-1 transition-transform">↓</span>
                        </span>
                    </button>
                </div>
            </div>

            {/* Bottom Fade Gradient */}
            <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#FDFDFC] to-transparent z-20 pointer-events-none" />
        </div>
    );
};

const FloatingCard = ({ x, y, z, rotate, icon: Icon, color, size = 'md', delay }) => {
    // x, y in percentage relative to center
    // z in px
    const style = {
        left: `calc(50% + ${x}vw)`,
        top: `calc(50% + ${y}vh)`,
        transform: `translate(-50%, -50%) translateZ(${z}px) rotate(${rotate}deg)`,
    };

    const sizeClasses = size === 'md' ? 'w-48 h-32 md:w-64 md:h-40' : 'w-32 h-20 md:w-40 md:h-24';

    return (
        <div
            className={`absolute ${sizeClasses} bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100/50 flex flex-col p-4 animate-float`}
            style={{
                ...style,
                animationDelay: `${delay}s`
            }}
        >
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full ${color} flex items-center justify-center text-white shadow-sm mb-auto`}>
                <Icon className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div className="space-y-2 opacity-40">
                <div className="h-2 w-3/4 bg-gray-200 rounded" />
                <div className="h-2 w-1/2 bg-gray-200 rounded" />
            </div>
        </div>
    );
};

export default VisualHero;
