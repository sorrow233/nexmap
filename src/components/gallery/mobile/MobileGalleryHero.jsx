import React from 'react';
import { Sparkles } from 'lucide-react';
import BoardDropZone from '../../BoardDropZone';

export default function MobileGalleryHero({
    greetingTitle,
    readyText,
    onCreateBoard,
    boardCount = 0
}) {
    return (
        <div className="mb-6 px-1">
            <section className="rounded-[1.9rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.16),transparent_42%),linear-gradient(180deg,#090f1d_0%,#0b1223_100%)] p-[1.125rem] shadow-[0_28px_80px_-46px_rgba(15,23,42,0.95)]">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/14 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-100/80">
                            <Sparkles size={13} />
                            你的画廊
                        </div>
                        <h1 className="mt-3 text-[1.85rem] font-black leading-[1.02] tracking-[-0.07em] text-white">
                            {greetingTitle}
                        </h1>
                        <p className="mt-2 text-[14px] leading-6 text-slate-300">
                            {readyText}
                        </p>
                    </div>

                    <div className="shrink-0 rounded-[1.1rem] border border-white/10 bg-white/[0.05] px-3 py-2 text-right">
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                            画布
                        </div>
                        <div className="mt-1 text-[1.15rem] font-black text-white">
                            {boardCount}
                        </div>
                    </div>
                </div>

                <div className="mt-4 rounded-[1.45rem] border border-white/10 bg-slate-950/24 p-3">
                    <BoardDropZone onCreateBoard={onCreateBoard} variant="compact" />
                </div>
            </section>
        </div>
    );
}
