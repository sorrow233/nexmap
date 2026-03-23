import React from 'react';
import { Clock3, Image as ImageIcon, SendHorizonal } from 'lucide-react';
import Spotlight from '../shared/Spotlight';

const MAX_TRAILING_ITEMS = 2;
const PREVIEW_MAX_LENGTH = 36;

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
        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-600 shadow-[0_10px_24px_-22px_rgba(120,98,70,0.24)]">
            {imageCount > 0 && <ImageIcon size={12} className="shrink-0 text-emerald-500" />}
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
        <div className="animate-fade-in pt-4 flex justify-start">
            <Spotlight
                spotColor="rgba(163, 194, 176, 0.18)"
                size={180}
                className="w-full max-w-[29rem] rounded-[1.5rem]"
            >
                <section className="relative overflow-hidden rounded-[1.5rem] border border-stone-200/90 bg-[linear-gradient(180deg,#fffdf9,#f6efe5)] shadow-[0_20px_48px_-36px_rgba(120,98,70,0.24)]">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(198,221,203,0.42),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(243,223,196,0.42),transparent_34%)]" />

                    <div className="relative px-4 py-4 sm:px-4.5 sm:py-4.5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] border border-stone-200 bg-white text-stone-600 shadow-[0_12px_24px_-22px_rgba(120,98,70,0.28)]">
                                    <Clock3 size={16} strokeWidth={1.9} />
                                </div>

                                <div className="min-w-0">
                                    <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-stone-400">
                                        Queue
                                    </p>
                                    <h3 className="mt-1 text-[0.95rem] font-semibold tracking-[-0.02em] text-stone-800">
                                        已排队 {pendingCount} 条，回答完成后自动续发
                                    </h3>
                                    <p className="mt-1 text-[12px] leading-5 text-stone-500">
                                        系统会自动从下一条继续发送。
                                    </p>
                                </div>
                            </div>

                            <div className="hidden shrink-0 items-center gap-2 rounded-full border border-emerald-100 bg-white px-2.5 py-1 text-[11px] font-medium text-emerald-700 sm:inline-flex">
                                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                待命中
                            </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-2.5">
                            <div className="rounded-[1.15rem] border border-white bg-white px-3.5 py-3 shadow-[0_14px_28px_-24px_rgba(120,98,70,0.24)]">
                                <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-stone-400">
                                    <SendHorizonal size={12} className="text-emerald-500" />
                                    <span>Next</span>
                                    <span className="normal-case tracking-normal text-[10px] text-stone-500">
                                        {getMessageMeta(nextItem)}
                                    </span>
                                </div>

                                <p className="mt-2 text-[14px] font-medium leading-5 text-stone-800">
                                    {getMessagePreview(nextItem)}
                                </p>
                            </div>

                            {(trailingItems.length > 0 || hiddenCount > 0) && (
                                <div className="flex flex-wrap items-center gap-2">
                                    {trailingItems.map((item, index) => (
                                        <TrailingQueueChip key={`${item?.text || 'pending'}-${index + 1}`} item={item} />
                                    ))}
                                    {hiddenCount > 0 && (
                                        <span className="inline-flex items-center rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600">
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
