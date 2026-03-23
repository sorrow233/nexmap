import React from 'react';
import { Clock3 } from 'lucide-react';

export default function PendingQueueIndicator({ pendingMessages = [] }) {
    const pendingCount = pendingMessages.length;
    if (pendingCount === 0) return null;

    return (
        <div className="animate-fade-in pt-2">
            <div className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-stone-200 bg-[#fffdf8] px-3 py-1.5 text-[12px] text-stone-600 shadow-[0_10px_28px_-24px_rgba(120,98,70,0.28)]">
                <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
                    <span className="absolute h-2.5 w-2.5 rounded-full bg-emerald-400/28 animate-ping" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <Clock3 size={13} strokeWidth={1.8} className="shrink-0 text-stone-400" />
                <span className="truncate leading-none">已排队 {pendingCount} 条，当前回答结束后自动发送</span>
            </div>
        </div>
    );
}
