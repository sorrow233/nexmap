import React from 'react';
import BoardDropZone from '../../BoardDropZone';

export default function MobileGalleryHero({
    greetingTitle,
    readyText,
    onCreateBoard
}) {
    return (
        <div className="mb-6 px-1">
            <section className="rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(9,15,29,0.92)_0%,rgba(11,18,35,0.9)_100%)] px-4 py-4 shadow-[0_28px_80px_-46px_rgba(15,23,42,0.95)] ring-1 ring-white/8">
                <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                        快速开始
                    </div>
                    <h1 className="mt-2 text-[1.7rem] font-black leading-[1.06] tracking-[-0.07em] text-white">
                        {greetingTitle}
                    </h1>
                    <p className="mt-2 text-[14px] leading-6 text-slate-400">
                        {readyText}
                    </p>
                </div>

                <div className="mt-4">
                    <BoardDropZone onCreateBoard={onCreateBoard} variant="compact" />
                </div>
            </section>
        </div>
    );
}
