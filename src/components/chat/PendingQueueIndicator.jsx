import React from 'react';
import { Clock3, Image as ImageIcon, SendHorizonal } from 'lucide-react';

const MAX_PREVIEW_ITEMS = 3;
const PREVIEW_MAX_LENGTH = 32;

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

function QueueSlot({ item, order, isPrimary = false }) {
    return (
        <div
            className={[
                'relative overflow-hidden rounded-[1.25rem] border',
                isPrimary
                    ? 'border-amber-300/80 bg-white/90 dark:bg-slate-950/70 shadow-[0_18px_40px_-24px_rgba(217,119,6,0.55)]'
                    : 'border-amber-200/70 bg-amber-50/70 dark:bg-amber-950/20'
            ].join(' ')}
        >
            <div className="flex items-start gap-3 px-4 py-3.5">
                <div
                    className={[
                        'shrink-0 flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-black tracking-[0.18em]',
                        isPrimary
                            ? 'border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-600/70 dark:bg-amber-500/10 dark:text-amber-200'
                            : 'border-amber-200 bg-white/80 text-amber-600 dark:border-amber-700/60 dark:bg-slate-900/60 dark:text-amber-300'
                    ].join(' ')}
                >
                    {String(order).padStart(2, '0')}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-500/80 dark:text-amber-300/80">
                            {isPrimary ? 'Next Dispatch' : 'Queued'}
                        </p>
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            {getMessageMeta(item)}
                        </span>
                    </div>

                    <p
                        className={[
                            'mt-1.5 break-words text-left text-slate-800 dark:text-slate-100',
                            isPrimary ? 'text-[15px] font-semibold leading-6' : 'text-[13px] font-medium leading-5'
                        ].join(' ')}
                    >
                        {getMessagePreview(item)}
                    </p>
                </div>

                {Array.isArray(item?.images) && item.images.length > 0 && (
                    <div className="shrink-0 flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-100/70 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-700/50 dark:bg-amber-500/10 dark:text-amber-200">
                        <ImageIcon size={12} />
                        <span>{item.images.length}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function PendingQueueIndicator({ pendingMessages = [] }) {
    const pendingCount = pendingMessages.length;
    if (pendingCount === 0) return null;

    const [nextItem, ...restItems] = pendingMessages;
    const previewItems = restItems.slice(0, MAX_PREVIEW_ITEMS - 1);
    const hiddenCount = Math.max(0, pendingCount - 1 - previewItems.length);

    return (
        <div className="pt-6 flex justify-start animate-fade-in">
            <div className="relative w-full max-w-xl overflow-hidden rounded-[1.9rem] border border-amber-200/80 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(255,247,214,0.88))] shadow-[0_28px_70px_-40px_rgba(217,119,6,0.45)] dark:border-amber-700/30 dark:bg-[linear-gradient(135deg,rgba(55,35,8,0.4),rgba(32,22,8,0.72))]">
                <div className="absolute inset-y-0 left-0 w-24 bg-[radial-gradient(circle_at_left,rgba(251,191,36,0.22),transparent_70%)] pointer-events-none" />
                <div className="absolute right-5 top-5 h-16 w-16 rounded-full bg-amber-200/30 blur-2xl dark:bg-amber-400/10 pointer-events-none" />

                <div className="relative px-5 py-4 sm:px-6 sm:py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/80 bg-white/75 text-amber-600 shadow-[0_10px_24px_-18px_rgba(217,119,6,0.7)] dark:border-amber-600/60 dark:bg-slate-950/50 dark:text-amber-300">
                                    <Clock3 size={18} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-500/80 dark:text-amber-300/80">
                                        Message Queue
                                    </p>
                                    <h3 className="mt-1 text-[18px] font-black tracking-tight text-amber-900 dark:text-amber-50">
                                        已排队 {pendingCount} 条，按顺序自动续发
                                    </h3>
                                </div>
                            </div>

                            <p className="mt-3 text-sm leading-6 text-amber-800/80 dark:text-amber-100/75">
                                当前回答结束后，系统会从下一条开始继续发送，不需要重复点击。
                            </p>
                        </div>

                        <div className="hidden sm:flex shrink-0 items-center gap-2 rounded-full border border-amber-200/80 bg-white/70 px-3 py-1.5 text-[11px] font-bold text-amber-700 dark:border-amber-700/50 dark:bg-slate-950/45 dark:text-amber-200">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            队列待命中
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        <QueueSlot item={nextItem} order={1} isPrimary />

                        {previewItems.length > 0 && (
                            <div className="relative pl-4">
                                <div className="absolute left-[15px] top-0 bottom-0 w-px bg-gradient-to-b from-amber-300/70 to-transparent dark:from-amber-500/30" />
                                <div className="space-y-2">
                                    {previewItems.map((item, index) => (
                                        <QueueSlot
                                            key={`${item?.text || 'pending'}-${index + 1}`}
                                            item={item}
                                            order={index + 2}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2.5">
                        {hiddenCount > 0 && (
                            <span className="inline-flex items-center rounded-full border border-amber-200/80 bg-white/75 px-3 py-1.5 text-[12px] font-semibold text-amber-700 dark:border-amber-700/50 dark:bg-slate-950/45 dark:text-amber-200">
                                还有 +{hiddenCount} 条待发送
                            </span>
                        )}

                        <span className="inline-flex items-center gap-2 text-[12px] font-medium text-slate-600 dark:text-slate-300">
                            <SendHorizonal size={14} className="text-amber-500 dark:text-amber-300" />
                            下一条会自动接力，不会丢失顺序
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
