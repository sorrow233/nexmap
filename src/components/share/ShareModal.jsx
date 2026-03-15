import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import ShareableContent from './ShareableContent';
import SharePreview from './SharePreview';
import ShareControls from './ShareControls';
import {
    DEFAULT_SHARE_PRESET,
    SHARE_FORMATS,
    SHARE_LAYOUTS,
    SHARE_RESOLUTIONS,
    getShareFormatMeta,
    getShareLayoutMeta,
    getShareResolutionMeta,
    getShareThemeMeta,
    getShareThemeSections
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
        title: locale.title || '导出图片',
        subtitle: locale.subtitle || '重做后的导出面板会优先保证稳定性，再兼顾风格与清晰度。',
        previewLabel: locale.previewLabel || '实时预览',
        livePreview: locale.livePreview || '实时预览',
        previewHint: locale.previewHint || '左侧预览会随着主题和版式即时更新。',
        calculating: locale.calculating || '正在计算预览尺寸...',
        controlTitle: locale.controlTitle || '导出设置',
        controlSubtitle: locale.controlSubtitle || '主题、版式和输出参数已经从旧逻辑里拆开，后续更容易维护。',
        themeTitle: locale.themeTitle || '主题',
        themeSubtitle: locale.themeSubtitle || '直接读取现有主题系统，避免 UI 和底层配置继续分叉。',
        themeSections: locale.themeSections || {},
        layoutTitle: locale.layoutTitle || '版式',
        layoutSubtitle: locale.layoutSubtitle || '为聊天摘录、长文分享、社媒封面和横版演示准备了不同画布。',
        exportTitle: locale.exportTitle || '导出参数',
        exportSubtitle: locale.exportSubtitle || '当内容过长时会自动降低倍率，优先保证成功导出。',
        brandingTitle: locale.brandingTitle || '品牌标记',
        brandingSubtitle: locale.brandingSubtitle || '需要保留 NexMap 标识时打开即可。',
        brandingToggle: locale.brandingToggle || '显示品牌标记',
        brandingHint: locale.brandingHint || '会在导出图底部附带产品标识。',
        safeHint: locale.safeHint || '如果内容特别长，系统会自动降低导出倍率，避免旧版那种大图直接失败的问题。',
        download: locale.download || '保存图片',
        downloadDisabled: locale.downloadDisabled || '没有可导出的内容',
        downloading: locale.downloading || '正在生成图片...',
        downloadSuccess: locale.downloadSuccess || '图片已开始下载。',
        copy: locale.copy || '复制到剪贴板',
        copyNoContent: locale.copyNoContent || '没有可复制的内容',
        copying: locale.copying || '正在复制...',
        copyDisabled: locale.copyDisabled || '当前环境不支持复制图片',
        copySuccess: locale.copySuccess || '图片已复制到剪贴板。',
        emptyContent: locale.emptyContent || '当前没有可导出的正文内容。',
        copyUnsupported: locale.copyUnsupported || '当前浏览器暂不支持图片复制，请改用下载。',
        copyError: locale.copyError || '复制失败，请稍后重试。',
        exportError: locale.exportError || '导出失败，请稍后重试。',
        autoScaleApplied: locale.autoScaleApplied || '内容较长，已自动降低导出倍率以保证成功。'
    };
}

export default function ShareModal({ isOpen, onClose, content }) {
    const { t } = useLanguage();
    const copy = getShareCopy(t);
    const themeSections = getShareThemeSections();
    const captureRef = useRef(null);
    const normalizedContent = normalizeShareContent(content);
    const canExport = hasShareableContent(content);

    const [theme, setTheme] = useState(DEFAULT_SHARE_PRESET.theme);
    const [layout, setLayout] = useState(DEFAULT_SHARE_PRESET.layout);
    const [showWatermark, setShowWatermark] = useState(DEFAULT_SHARE_PRESET.showWatermark);
    const [resolution, setResolution] = useState(DEFAULT_SHARE_PRESET.resolution);
    const [format, setFormat] = useState(DEFAULT_SHARE_PRESET.format);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const themeMeta = getShareThemeMeta(theme) || themeSections[0]?.themes?.[0] || null;
    const layoutMeta = getShareLayoutMeta(layout);
    const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard?.write && typeof ClipboardItem !== 'undefined';

    const layouts = SHARE_LAYOUTS.map((item) => ({
        ...item,
        label: t.shareExport?.layouts?.[item.id]?.title || {
            card: '卡片',
            full: '长文',
            social: '方图',
            slide: '演示'
        }[item.id],
        description: t.shareExport?.layouts?.[item.id]?.description || {
            card: '高度自适应，适合聊天摘录。',
            full: '更紧凑的长文排版。',
            social: '1:1 方图，适合社媒。',
            slide: '16:9 横版展示。'
        }[item.id]
    }));

    const resolutions = SHARE_RESOLUTIONS.map((item) => ({
        ...item,
        label: t.shareExport?.resolutions?.[item.id]?.title || {
            standard: '标准',
            hd: '高清',
            print: '超清'
        }[item.id],
        description: t.shareExport?.resolutions?.[item.id]?.description || {
            standard: '更快，适合日常分享。',
            hd: '细节更稳，默认推荐。',
            print: '优先清晰度，长内容会自动降级。'
        }[item.id]
    }));

    const formats = SHARE_FORMATS.map((item) => ({
        ...item,
        label: item.id.toUpperCase(),
        description: t.shareExport?.formats?.[item.id]?.description || {
            png: '兼容性最好，适合保存原图。',
            webp: '体积更小，适合网页分享。'
        }[item.id],
        meta: t.shareExport?.formats?.[item.id]?.meta || {
            png: 'LOSSLESS',
            webp: 'SMALLER'
        }[item.id]
    }));

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        setFeedback(null);
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

    const getExportBlob = async (formatId) => {
        const resolutionMeta = getShareResolutionMeta(resolution);
        const formatMeta = getShareFormatMeta(formatId);
        const { canvas, wasScaledDown } = await generateShareCanvas(captureRef.current, {
            themeId: theme,
            requestedScale: resolutionMeta.scale
        });
        const blob = await canvasToBlob(canvas, formatMeta.mime, formatMeta.quality);

        return { blob, formatMeta, wasScaledDown };
    };

    const handleDownload = async () => {
        if (isGenerating) return;

        setIsGenerating(true);
        setFeedback(null);

        try {
            if (!canExport) {
                showFeedback('info', copy.emptyContent);
                return;
            }

            const { blob, formatMeta, wasScaledDown } = await getExportBlob(format);
            downloadBlob(
                blob,
                buildShareFilename({
                    themeId: theme,
                    layoutId: layout,
                    extension: formatMeta.ext
                })
            );
            showFeedback('success', copy.downloadSuccess, wasScaledDown);
        } catch (error) {
            console.error('[ShareModal] Download export failed:', error);
            showFeedback('error', copy.exportError);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = async () => {
        if (isCopying) return;

        setIsCopying(true);
        setFeedback(null);

        try {
            if (!canExport) {
                showFeedback('info', copy.emptyContent);
                return;
            }

            const { blob, wasScaledDown } = await getExportBlob('png');
            await copyBlobToClipboard(blob);
            showFeedback('success', copy.copySuccess, wasScaledDown);
        } catch (error) {
            console.error('[ShareModal] Clipboard export failed:', error);
            if (error.message === 'clipboard-unsupported') {
                showFeedback('info', copy.copyUnsupported);
            } else {
                showFeedback('error', copy.copyError);
            }
        } finally {
            setIsCopying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] p-3 sm:p-6">
            <div
                className="absolute inset-0 bg-slate-950/72 backdrop-blur-xl"
                onClick={onClose}
            />

            <div className="relative mx-auto flex h-full max-h-[960px] w-full max-w-[1500px] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#020913]/96 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
                <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-8">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{copy.title}</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{copy.subtitle}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </header>

                <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[minmax(0,1fr)_320px] lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_420px]">
                    <div className="min-h-[300px] max-h-[44vh] flex-1 border-b border-white/10 md:max-h-none md:border-b-0 md:border-r">
                        <SharePreview
                            content={normalizedContent}
                            theme={theme}
                            layout={layout}
                            showWatermark={showWatermark}
                            themeLabel={themeMeta?.label || theme}
                            layoutLabel={layouts.find((item) => item.id === layout)?.label || layout}
                            layoutSize={layoutMeta.size}
                            copy={copy}
                        />
                    </div>

                    <ShareControls
                        themeSections={themeSections}
                        currentTheme={theme}
                        setTheme={setTheme}
                        layouts={layouts}
                        currentLayout={layout}
                        setLayout={setLayout}
                        resolutions={resolutions}
                        currentResolution={resolution}
                        setResolution={setResolution}
                        formats={formats}
                        currentFormat={format}
                        setFormat={setFormat}
                        showWatermark={showWatermark}
                        setShowWatermark={setShowWatermark}
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
