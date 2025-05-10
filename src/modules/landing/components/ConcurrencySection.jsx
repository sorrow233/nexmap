import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';

const ConcurrencySection = () => {
    const { t } = useLanguage();
    // We simulate "streams" being either in "thinking" state or "streaming" state
    const [streams, setStreams] = useState(Array(15).fill({ status: 'idle', progress: 0 }));

    useEffect(() => {
        // Staggered start of streams
        const interval = setInterval(() => {
            setStreams(prev => prev.map((s, i) => {
                if (Math.random() > 0.95 && s.status === 'idle') {
                    return { ...s, status: 'streaming', progress: 0, speed: Math.random() * 2 + 1 };
                }
                if (s.status === 'streaming') {
                    const newProg = s.progress + s.speed;
                    if (newProg > 100) return { ...s, status: 'idle', progress: 0 };
                    return { ...s, progress: newProg };
                }
                return s;
            }));
        }, 50);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center py-24 relative overflow-hidden">

            {/* Background Grid Accent */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

            <div className="relative z-10 text-center mb-16 max-w-4xl px-6">
                <div className="inline-flex items-center gap-2 mb-4 bg-orange-500/10 px-4 py-1.5 rounded-full border border-orange-500/20">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    <span className="text-orange-400 text-xs font-bold uppercase tracking-wider">{t.concurrency.badge}</span>
                </div>

                <h2 className="text-5xl md:text-7xl font-bold text-white mb-6">
                    {t.concurrency.title} <br />
                </h2>
                <p className="text-xl text-gray-400">
                    {t.concurrency.text}
                </p>
            </div>

            {/* The Concurrency Visual */}
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full max-w-6xl px-4">
                {streams.map((stream, i) => (
                    <StreamCard key={i} index={i} status={stream.status} progress={stream.progress} t={t} />
                ))}
            </div>

        </div>
    );
};

const StreamCard = ({ index, status, progress, t }) => {
    return (
        <div className="bg-[#111] border border-white/5 rounded-lg p-3 h-32 flex flex-col relative overflow-hidden group hover:border-white/10 transition-colors">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2 opacity-50">
                <div className="w-2 h-2 rounded-full bg-white/20" />
                <span className="text-[10px] font-mono text-white/50">THREAD_{index < 10 ? `0${index}` : index}</span>
            </div>

            {/* Content Area */}
            <div className="flex-1 font-mono text-[10px] leading-tight text-emerald-500/80 overflow-hidden break-all">
                {status === 'idle' ? (
                    <span className="text-white/20">{t.concurrency.idle}</span>
                ) : (
                    <div className="animate-pulse">
                        {/* Simulated Text Gen */}
                        {generateFakeText(progress)}
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            {status === 'streaming' && (
                <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all duration-75" style={{ width: `${progress}%` }} />
            )}
        </div>
    );
};

// Helper for fake code generation visuals
const generateFakeText = (progress) => {
    const chars = "EF80 A12B 99CC DEAD BEEF 0011 2233 ";
    const len = Math.floor(progress * 2);
    let str = "";
    for (let i = 0; i < len; i++) {
        str += chars[i % chars.length];
        if (i % 25 === 0 && i > 0) str += " "; // Newlines simulated by wrap
    }
    return str;
};

export default ConcurrencySection;
