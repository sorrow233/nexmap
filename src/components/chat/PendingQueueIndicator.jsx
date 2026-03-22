import React from 'react';
import { Clock3, Image as ImageIcon, SendHorizonal } from 'lucide-react';
import Spotlight from '../shared/Spotlight';

const MAX_TRAILING_ITEMS = 2;
const PREVIEW_MAX_LENGTH = 34;

const getMessagePreview = (item) => {
    const text = item?.text || '';
    const hasText = Boolean(text && text.trim());
    const imageCount = Array.isArray(item?.images) ? item.images.length : 0;

    if (!hasText && imageCount > 0) {
        return `图片消息 (${imageCount})`;
    }

    if (!hasText) {
        return '空白消息';
    }

    const normalized = text.replace(/\s+/g, ' ').trim();
    if (normalized.length <= PREVIEW_MAX_LENGTH) return normalized;
    return `${normalized.slice(0, PREVIEW_MAX_LENGTH)}...`;
};

const getMessageMeta = (item) => {
    const imageCount = Array.isArray(item?.images) ? item.images.length : 0;
    if (imageCount <= 0) return '文本消息';
    if (!(item?.text || '').trim()) return `${imageCount} 张图片`;
    return `${imageCount} 张图片 + 文本`;
};

function TrailingQueueChip({ item }) {
    const imageCount = Array.isArray(item?.images) ? item.images.length : 0;

    return (
        <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-amber-200/70 bg-white/70 px-3 py-1.5 text-[12px] font-medium text-slate-600 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.18)] dark:border-amber-700/40 dark:bg-slate-950/40 dark:text-slate-300">
            {imageCount > 0 && <ImageIcon size={12} className="shrink-0 text-amber-500 dark:text-amber-300" />}
            <span className="truncate">{getMessagePreview(item)}</span>
        </span>
    );
}

export default function PendingQueueIndicator({ pendingMessages = [] }) {
    const pendingCount = pendingMessages.length;
    if (pendingCount === 0) return null;

    const [nextItem, ...restItems] = pendingMessages;
    const trailingItems = restItems.slice(0, MAX_TRAILING_ITEMS);
    const hiddenCount = Math.max(0, restItems.length - trailingItems.length);

    return (
        <div className="pt-6 flex justify-start animate-fade-in">
            <Spotlight
                spotColor="rgba(251, 191, 36, 0.12)"
                size={320}
                className="w-full max-w-[46rem] rounded-[2rem]"
            >
                <section className="relative overflow-hidden rounded-[2rem] border border-amber-200/70 bg-[linear-gradient(180deg,rgba(255,253,247,0.96),rgba(255,250,235,0.92))] shadow-[0_28px_80px_-56px_rgba(180,83,9,0.35)] backdrop-blur-xl dark:border-amber-700/30 dark:bg-[linear-gradient(180deg,rgba(39,27,10,0.52),rgba(23,17,8,0.72))]">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.08),transparent_32%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.10),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.06),transparent_30%)]" />

                    <div className="relative px-5 py-5 sm:px-7 sm:py-7">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-4 sm:gap-5">
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.6rem] border border-amber-200/80 bg-white/72 text-amber-600 shadow-[0_22px_40px_-30px_rgba(217,119,6,0.38)] dark:border-amber-700/40 dark:bg-slate-950/40 dark:text-amber-300">
                                    <Clock3 size={24} strokeWidth={1.9} />
                                </div>

                                <div className="min-w-0">
                                    <p className="text-[11px] font-black uppercase tracking-[0.34em] text-amber-400/95 dark:text-amber-300/80">
                                        Message Queue
                                    </p>
                                    <h3 className="mt-2 text-[clamp(1.8rem,3vw,2.75rem)] font-black tracking-[-0.04em] text-amber-950 dark:text-amber-50">
                                        已排队 {pendingCount} 条，按顺序自动续发
                                    </h3>
                                    <p className="mt-4 max-w-[34rem] text-[15px] leading-8 text-amber-900/65 dark:text-amber-50/68">
                                        当前回答结束后，系统会从下一条开始继续发送，不需要重复点击。
                                    </p>
                                </div>
                            </div>

                            <div className="hidden shrink-0 items-center gap-2 rounded-full border border-amber-200/75 bg-white/76 px-4 py-2 text-[13px] font-semibold text-amber-700 shadow-[0_18px_40px_-34px_rgba(217,119,6,0.35)] sm:inline-flex dark:border-amber-700/40 dark:bg-slate-950/40 dark:text-amber-200">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                                队列待命中
                            </div>
                        </div>

                        <div className="mt-7 rounded-[1.8rem] border border-amber-200/75 bg-white/78 px-5 py-5 shadow-[0_20px_50px_-42px_rgba(15,23,42,0.28)] dark:border-amber-700/30 dark:bg-slate-950/38 sm:px-6 sm:py-6">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-[18px] font-black tracking-[0.14em] text-amber-600 dark:border-amber-600/60 dark:bg-amber-500/10 dark:text-amber-200">
                                    01
                                </div>
                                <p className="text-[11px] font-black uppercase tracking-[0.32em] text-amber-400 dark:text-amber-300/85">
                                    Next Dispatch
                                </p>
                                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                    {getMessageMeta(nextItem)}
                                </span>
                            </div>

                            <p className="mt-4 text-[clamp(1.55rem,2.2vw,2.15rem)] font-black leading-[1.16] tracking-[-0.04em] text-slate-800 dark:text-slate-100">
                                {getMessagePreview(nextItem)}
                            </p>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-slate-600 dark:text-slate-300">
                                <SendHorizonal size={14} className="text-amber-500 dark:text-amber-300" />
                                下一条会自动接力，不会丢失顺序
                            </span>

                            {trailingItems.length > 0 && (
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    {trailingItems.map((item, index) => (
                                        <TrailingQueueChip key={`${item?.text || 'pending'}-${index + 1}`} item={item} />
                                    ))}
                                    {hiddenCount > 0 && (
                                        <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-3 py-1.5 text-[12px] font-semibold text-amber-700 dark:border-amber-700/40 dark:bg-amber-500/10 dark:text-amber-200">
                                            +{hiddenCount}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </Spotlight>
        </div>
    );
}
