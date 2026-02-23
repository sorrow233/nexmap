import React from 'react';
import { Clock } from 'lucide-react';

const MAX_PREVIEW_ITEMS = 3;
const PREVIEW_MAX_LENGTH = 26;

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

export default function PendingQueueIndicator({ pendingMessages = [] }) {
    const pendingCount = pendingMessages.length;
    if (pendingCount === 0) return null;

    const previewItems = pendingMessages.slice(0, MAX_PREVIEW_ITEMS);
    const hiddenCount = Math.max(0, pendingCount - previewItems.length);

    return (
        <div className="pt-4 flex justify-center animate-fade-in">
            <div className="flex flex-col gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-2xl min-w-[220px]">
                <div className="flex items-center gap-2">
                    <Clock size={14} className="text-amber-500 animate-pulse" />
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                        已排队 {pendingCount} 条，当前回答完成后自动发送
                    </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {previewItems.map((item, index) => (
                        <span
                            key={`${item?.text || 'pending'}-${index}`}
                            className="text-[11px] px-2 py-1 rounded-full bg-amber-100/70 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-700/40"
                        >
                            {getMessagePreview(item)}
                        </span>
                    ))}
                    {hiddenCount > 0 && (
                        <span className="text-[11px] px-2 py-1 rounded-full bg-amber-100/70 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-700/40">
                            +{hiddenCount}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
