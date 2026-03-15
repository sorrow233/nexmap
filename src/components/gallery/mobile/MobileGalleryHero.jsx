import React from 'react';
import { Sparkles } from 'lucide-react';
import BoardDropZone from '../../BoardDropZone';

export default function MobileGalleryHero({
    greetingTitle,
    readyText,
    onCreateBoard
}) {
    return (
        <div className="mb-8 px-1">
            <section className="rounded-[2.2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.18),transparent_42%),linear-gradient(180deg,#090f1d_0%,#0b1223_100%)] p-5 shadow-[0_28px_80px_-46px_rgba(15,23,42,0.95)]">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/14 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-100/80">
                    <Sparkles size={13} />
                    IOS Studio
                </div>
                <h1 className="mt-4 text-[2.35rem] font-black leading-[0.96] tracking-[-0.08em] text-white">
                    {greetingTitle}
                </h1>
                <p className="mt-3 max-w-xs text-[15px] leading-6 text-slate-300">
                    {readyText}
                </p>
            </section>

            <div className="mt-4">
                <BoardDropZone onCreateBoard={onCreateBoard} variant="compact" />
            </div>
        </div>
    );
}
