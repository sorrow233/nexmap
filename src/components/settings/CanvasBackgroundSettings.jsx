import React from 'react';
import { Check, ImagePlus, Loader2, Sparkles, Trash2 } from 'lucide-react';
import {
    MAX_CUSTOM_CANVAS_BACKGROUNDS
} from '../../services/customCanvasBackgrounds';
import { IMAGE_UPLOAD_ACCEPT } from '../../services/image/uploadImageNormalizer';

const formatSize = (bytes) => {
    const size = Number(bytes) || 0;
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export default function CanvasBackgroundSettings({
    library,
    isLoading,
    isProcessing,
    error,
    onFilesSelected,
    onRemove,
    onEnabledChange,
    onOpacityChange
}) {
    const items = library?.items || [];
    const canUpload = items.length < MAX_CUSTOM_CANVAS_BACKGROUNDS && !isProcessing;

    return (
        <div className="rounded-[30px] border border-[#eee3d7] bg-[rgba(255,252,247,0.82)] p-6 shadow-[0_20px_48px_rgba(95,74,50,0.06)] backdrop-blur-2xl dark:border-slate-800/80 dark:bg-[#141c26]/90">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="rounded-[18px] bg-[#e5efe6] p-2.5 text-[#5f7666] dark:bg-emerald-400/15 dark:text-emerald-200">
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-[#2f241a] dark:text-white">画布背景图库</h3>
                        <p className="mt-1 max-w-2xl text-sm leading-7 text-[#7b6a58] dark:text-slate-300/80">
                            上传多张图片后，每个画布会稳定随机使用其中一张。图片只铺在画布底层，不会变成卡片背景。
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(library?.enabled)}
                    disabled={items.length === 0 || isLoading}
                    onClick={() => onEnabledChange(!library?.enabled)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-45 ${library?.enabled
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200'
                        : 'border-[#e8ddd0] bg-[#fffaf3] text-[#81705e] dark:border-slate-700 dark:bg-[#17202c] dark:text-slate-300'
                        }`}
                >
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full ${library?.enabled ? 'bg-emerald-500 text-white' : 'bg-[#ded4c8] text-transparent dark:bg-slate-600'}`}>
                        <Check size={12} strokeWidth={3} />
                    </span>
                    {library?.enabled ? '已启用' : '已停用'}
                </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4 rounded-[22px] border border-[#eee3d7] bg-[#fffaf3]/80 px-4 py-3 dark:border-white/10 dark:bg-[#111826]/70">
                <label htmlFor="canvas-background-opacity" className="text-xs font-semibold text-[#655545] dark:text-slate-200">
                    背景强度 {Math.round((library?.opacity || 0.34) * 100)}%
                </label>
                <input
                    id="canvas-background-opacity"
                    type="range"
                    min="12"
                    max="60"
                    step="1"
                    value={Math.round((library?.opacity || 0.34) * 100)}
                    onChange={(event) => onOpacityChange(Number(event.target.value) / 100)}
                    className="h-1.5 min-w-[180px] flex-1 cursor-pointer accent-emerald-600"
                />
                <span className="text-[11px] text-[#988773] dark:text-slate-400">推荐 28%–40%，卡片文字会更清晰</span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((item) => (
                    <div key={item.id} className="group relative aspect-[4/3] overflow-hidden rounded-[20px] border border-[#eadfd3] bg-[#f4eee7] dark:border-white/10 dark:bg-slate-900">
                        <img src={item.previewUrl} alt={item.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-3 pb-2.5 pt-8 text-white">
                            <p className="truncate text-xs font-semibold">{item.name}</p>
                            <p className="mt-0.5 text-[10px] text-white/70">{formatSize(item.size)}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => onRemove(item.id)}
                            aria-label={`删除背景 ${item.name}`}
                            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white opacity-100 backdrop-blur-md transition hover:bg-rose-500 sm:opacity-0 sm:group-hover:opacity-100"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}

                {canUpload && (
                    <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed border-[#d9c9b8] bg-[#fffaf3]/65 px-4 text-center text-[#806d5a] transition hover:border-[#bda990] hover:bg-white dark:border-slate-700 dark:bg-[#111826]/65 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-[#17202c]">
                        <input
                            type="file"
                            accept={IMAGE_UPLOAD_ACCEPT}
                            multiple
                            className="sr-only"
                            onChange={(event) => {
                                onFilesSelected(Array.from(event.target.files || []));
                                event.target.value = '';
                            }}
                        />
                        <ImagePlus size={22} />
                        <span className="mt-2 text-xs font-semibold">添加背景图片</span>
                        <span className="mt-1 text-[10px] text-[#a08e7b] dark:text-slate-500">最多 {MAX_CUSTOM_CANVAS_BACKGROUNDS} 张</span>
                    </label>
                )}

                {isProcessing && (
                    <div className="flex aspect-[4/3] items-center justify-center rounded-[20px] border border-[#eadfd3] bg-[#fffaf3]/65 text-[#806d5a] dark:border-white/10 dark:bg-[#111826]/65 dark:text-slate-300">
                        <Loader2 size={22} className="animate-spin" />
                        <span className="ml-2 text-xs font-semibold">正在优化图片</span>
                    </div>
                )}
            </div>

            {isLoading && (
                <div className="mt-4 flex items-center gap-2 text-xs text-[#81705e] dark:text-slate-300">
                    <Loader2 size={14} className="animate-spin" /> 正在读取本地背景图库…
                </div>
            )}
            {error && <p className="mt-4 text-xs font-medium text-rose-600 dark:text-rose-300">{error}</p>}
            <p className="mt-4 text-[11px] leading-6 text-[#988773] dark:text-slate-400">
                当前 {items.length}/{MAX_CUSTOM_CANVAS_BACKGROUNDS} 张。上传时会自动压缩至适合画布显示的 WebP，并只保存在这台设备上。
            </p>
        </div>
    );
}
