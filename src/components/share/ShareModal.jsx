import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import ShareableContent from './ShareableContent';
import SharePreview from './SharePreview';
import ShareControls from './ShareControls';
import {
    DEFAULT_SHARE_PRESET,
    SHARE_CLIPBOARD_FORMAT,
    SHARE_DOWNLOAD_FORMAT,
    SHARE_LAYOUTS,
    getShareResolutionMeta,
    getShareThemeOptions
} from './shareCatalog';
import {
    buildShareFilename,
    canvasToBlob,
    copyBlobToClipboard,
    downloadBlob,
    generateShareCanvas
} from './shareExport';
import { hasShareableContent, normalizeShareContent } from './shareContent';
import { useLanguage } from '../../contexts/LanguageContext';

function getShareCopy(t) {
    const locale = t.shareExport || {};

    return {
        title: locale.title || '导出回答',
        subtitle: locale.subtitle || '默认固定高分辨率渲染，保存和复制都输出 WebP。',
        previewLabel: locale.previewLabel || '最终预览',
        previewHint: locale.previewHint || '这里看到的，就是最终导出的画面。',
        calculating: locale.calculating || '正在计算预览尺寸...',
        controlTitle: locale.controlTitle || '导出选项',
        controlSubtitle: locale.controlSubtitle || '只保留风格和画布，清晰度与格式全部由系统固定处理。',
        themeTitle: locale.themeTitle || '风格',
        themeSubtitle: locale.themeSubtitle || '只保留最常用的几种风格。',
        themes: locale.themes || {},
        layoutTitle: locale.layoutTitle || '画布',
        layoutSubtitle: locale.layoutSubtitle || '按阅读场景选择合适的画幅。',
        layouts: locale.layouts || {},
        exportTitle: locale.exportTitle || '清晰度',
        exportSubtitle: locale.exportSubtitle || '默认高清，内容过长时会自动降级避免失败。',
        resolutions: locale.resolutions || {},
        formatHintTitle: locale.formatHintTitle || '输出格式',
        formatHintSubtitle: locale.formatHintSubtitle || '下载和复制会分别使用更合适的格式。',
        formatHintBody: locale.formatHintBody || '保存时输出 WebP，复制到剪贴板时自动使用 PNG。',
        brandingTitle: locale.brandingTitle || '品牌',
        brandingSubtitle: locale.brandingSubtitle || '只有在需要署名时再打开品牌标记。',
        brandingToggle: locale.brandingToggle || '附带 NexMap 标记',
        brandingHint: locale.brandingHint || '会在导出图底部加入产品标识。',
        safeHint: locale.safeHint || '默认固定高分辨率渲染，宁可文件更大，也优先保证导出清晰度。',
        qualityPinnedHint: locale.qualityPinnedHint || '渲染固定使用超清档位，下载与复制都输出 WebP 92% 压缩。',
        download: locale.download || '保存 WebP',
        downloadDisabled: locale.downloadDisabled || '没有可导出的内容',
        downloading: locale.downloading || '正在生成 WebP...',
        downloadSuccess: locale.downloadSuccess || 'WebP 图片已开始下载。',
        copy: locale.copy || '复制 WebP',
        copyNoContent: locale.copyNoContent || '没有可复制的内容',
        copying: locale.copying || '正在复制 WebP...',
        copyDisabled: locale.copyDisabled || '当前环境不支持复制图片',
        copySuccess: locale.copySuccess || 'WebP 图片已复制到剪贴板。',
        emptyTitle: locale.emptyTitle || '没有可导出的内容',
        emptyDescription: locale.emptyDescription || '当前这次导出没有拿到正文内容。请关闭后重新打开导出面板，再试一次。',
        emptyContent: locale.emptyContent || '当前没有可导出的正文内容。',
        copyUnsupported: locale.copyUnsupported || '当前浏览器暂不支持图片复制，请改用下载。',
        copyError: locale.copyError || '复制失败，请稍后重试。',
        exportError: locale.exportError || '导出失败，请稍后重试。',
        webpUnsupported: locale.webpUnsupported || '当前浏览器没有成功生成 WebP，请换个浏览器后再试。',
        autoScaleApplied: locale.autoScaleApplied || '内容较长，已自动降低导出倍率以保证成功。'
    };
}

export default function ShareModal({ isOpen, onClose, content }) {
    const { t } = useLanguage();
    const copy = getShareCopy(t);
    const captureRef = useRef(null);
    const normalizedContent = normalizeShareContent(content);
    const canExport = hasShareableContent(normalizedContent);
    const themeOptions = getShareThemeOptions();

    const [theme, setTheme] = useState(DEFAULT_SHARE_PRESET.theme);
    const [layout, setLayout] = useState(DEFAULT_SHARE_PRESET.layout);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const showWatermark = true;

    const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard?.write && typeof ClipboardItem !== 'undefined';

    const layouts = SHARE_LAYOUTS.map((item) => ({
        ...item,
        label: t.shareExport?.layouts?.[item.id]?.title || {
            card: '自适应',
            social: '方图',
            slide: '横图'
        }[item.id],
        description: t.shareExport?.layouts?.[item.id]?.description || {
            card: '适合聊天回答和长内容。',
            social: '更适合社交媒体转发。',
            slide: '适合横版展示和汇报。'
        }[item.id]
    }));

    const themes = themeOptions.map((item) => ({
        ...item,
        label: t.shareExport?.themes?.[item.id]?.title || item.label,
        description: t.shareExport?.themes?.[item.id]?.description || {
            modern: '干净明亮，适合大多数回答。',
            editorial: '更像一页精排文章。',
            zen: '更柔和的留白感。',
            night: '暗底展示，适合深色内容。'
        }[item.id]
    }));

    const selectedThemeLabel = themes.find((item) => item.id === theme)?.label || theme;
    const selectedLayoutLabel = layouts.find((item) => item.id === layout)?.label || layout;
    const fixedResolutionMeta = getShareResolutionMeta('print');

    useEffect(() => {
        if (!isOpen) return undefined;

        setTheme(DEFAULT_SHARE_PRESET.theme);
        setLayout(DEFAULT_SHARE_PRESET.layout);
        setFeedback(null);

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const showFeedback = (type, message, wasScaledDown = false) => {
        setFeedback({
            type,
            message: wasScaledDown ? `${message} ${copy.autoScaleApplied}` : message
        });
    };

    const getExportBlob = async (formatMeta) => {
        const resolutionMeta = getShareResolutionMeta(fixedResolutionMeta.id);
        const { canvas, wasScaledDown } = await generateShareCanvas(captureRef.current, {
            themeId: theme,
            requestedScale: resolutionMeta.scale
        });
        const blob = await canvasToBlob(canvas, formatMeta.mime, formatMeta.quality);

        return { blob, wasScaledDown };
    };

    const handleDownload = async () => {
        if (isGenerating || isCopying) return;

        setIsGenerating(true);
        setFeedback(null);

        try {
            if (!canExport) {
                showFeedback('info', copy.emptyContent);
                return;
            }

            const { blob, wasScaledDown } = await getExportBlob(SHARE_DOWNLOAD_FORMAT);
            downloadBlob(
                blob,
                buildShareFilename({
                    themeId: theme,
                    layoutId: layout,
                    extension: SHARE_DOWNLOAD_FORMAT.ext
                })
            );
            showFeedback('success', copy.downloadSuccess, wasScaledDown);
        } catch (error) {
            console.error('[ShareModal] Download export failed:', error);
            if (error.message === 'unsupported-export-format') {
                showFeedback('error', copy.webpUnsupported);
            } else {
                showFeedback('error', copy.exportError);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = async () => {
        if (isCopying || isGenerating) return;

        setIsCopying(true);
        setFeedback(null);

        try {
            if (!canExport) {
                showFeedback('info', copy.emptyContent);
                return;
            }

            const { blob, wasScaledDown } = await getExportBlob(SHARE_CLIPBOARD_FORMAT);
            await copyBlobToClipboard(blob);
            showFeedback('success', copy.copySuccess, wasScaledDown);
        } catch (error) {
            console.error('[ShareModal] Clipboard export failed:', error);
            if (error.message === 'clipboard-unsupported') {
                showFeedback('info', copy.copyUnsupported);
            } else if (error.message === 'unsupported-export-format') {
                showFeedback('error', copy.webpUnsupported);
            } else {
                showFeedback('error', copy.copyError);
            }
        } finally {
            setIsCopying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6">
            <div
                className="absolute inset-0 bg-slate-950/45 backdrop-blur-xl"
                onClick={onClose}
            />

            <div className="relative mx-auto flex h-full max-h-[920px] w-full max-w-[1280px] flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.22)]">
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{copy.title}</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{copy.subtitle}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                    >
                        <X size={20} />
                    </button>
                </header>

                <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="min-h-[320px] border-b border-slate-200 lg:border-b-0 lg:border-r">
                        <SharePreview
                            content={normalizedContent}
                            theme={theme}
                            layout={layout}
                            showWatermark={showWatermark}
                            themeLabel={selectedThemeLabel}
                            layoutLabel={selectedLayoutLabel}
                            copy={copy}
                        />
                    </div>

                    <ShareControls
                        themeOptions={themes}
                        currentTheme={theme}
                        setTheme={setTheme}
                        layouts={layouts}
                        currentLayout={layout}
                        setLayout={setLayout}
                        onCopy={handleCopy}
                        onDownload={handleDownload}
                        isCopying={isCopying}
                        isGenerating={isGenerating}
                        canCopy={canCopy}
                        canExport={canExport}
                        feedback={feedback}
                        copy={copy}
                    />
                </div>
            </div>

            <div className="pointer-events-none fixed left-[-20000px] top-0">
                <ShareableContent
                    ref={captureRef}
                    content={normalizedContent}
                    theme={theme}
                    layout={layout}
                    showWatermark={showWatermark}
                />
            </div>
        </div>
    );
}
