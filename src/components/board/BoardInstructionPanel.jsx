import React, { useEffect, useMemo } from 'react';
import {
    Bot,
    CheckCircle2,
    Globe2,
    Lock,
    Loader2,
    Settings2,
    Sparkles,
    AlertTriangle,
    X
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeBoardInstructionSettings } from '../../services/customInstructionsService';

const formatTimestamp = (ts) => {
    if (!ts || Number(ts) <= 0) return '';
    try {
        return new Date(ts).toLocaleString();
    } catch {
        return '';
    }
};

export default function BoardInstructionPanel({
    isOpen,
    onClose,
    instructions = [],
    boardInstructionSettings,
    instructionPanelSummary,
    onToggleInstruction,
    onUseManualMode,
    onUseAutoMode,
    onRunAutoRecommend,
    onOpenSettings,
    isAutoRecommending = false,
    conversationCount = 0
}) {
    const { t } = useLanguage();

    const settings = normalizeBoardInstructionSettings(boardInstructionSettings);
    const enabledIds = useMemo(() => new Set(settings.enabledInstructionIds || []), [settings.enabledInstructionIds]);
    const autoEnabledIds = useMemo(() => new Set(settings.autoEnabledInstructionIds || []), [settings.autoEnabledInstructionIds]);
    const mode = settings.autoSelectionMode === 'manual' ? 'manual' : 'auto';
    const status = settings.autoSelection?.status || 'idle';
    const lastRunAt = settings.autoSelection?.lastRunAt || 0;
    const lastError = settings.autoSelection?.lastError || '';
    const lastResultCount = settings.autoSelection?.lastResultCount || 0;

    const all = Array.isArray(instructions) ? instructions : [];
    const globalInstructions = all.filter(item => item && item.isGlobal === true && item.enabled !== false);
    const optionalInstructions = all.filter(item => item && item.isGlobal !== true && item.enabled !== false);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const canRunAutoNow = !isAutoRecommending && optionalInstructions.length > 0;
    const isManualMode = mode === 'manual';

    const statusLabelMap = {
        idle: t.settings?.canvasInstructionStatusIdle || '待机',
        running: t.settings?.canvasInstructionStatusRunning || '推荐中',
        done: t.settings?.canvasInstructionStatusDone || '推荐完成',
        error: t.settings?.canvasInstructionStatusError || '推荐失败'
    };

    const modeLabel = isManualMode
        ? (t.settings?.canvasInstructionModeManual || '手动')
        : (t.settings?.canvasInstructionModeAuto || '自动');

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-md md:p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            <div className="w-full max-w-4xl max-h-[88vh] overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-[0_30px_100px_rgba(2,6,23,0.75)]">
                <div className="border-b border-white/10 bg-slate-900/60 px-5 py-4 md:px-6 md:py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <h3 className="flex items-center gap-2 text-lg font-black text-white md:text-xl">
                                <Sparkles size={18} className="text-cyan-300" />
                                {t.settings?.canvasInstructionTitle || '画布指令选择'}
                            </h3>
                            <p className="mt-1 text-xs text-slate-300 md:text-sm">
                                {t.settings?.canvasInstructionSubtitle || '全局指令始终生效；可选指令按当前画布单独启用。'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-slate-200 transition-colors hover:bg-slate-800"
                            aria-label={t.settings?.close || 'Close'}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-4 md:text-sm">
                        <div className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-slate-200">
                            {(t.settings?.canvasInstructionMetricActive || '当前生效')}：
                            <span className="ml-1 font-bold text-cyan-200">
                                {instructionPanelSummary?.activeCount ?? (globalInstructions.length + enabledIds.size)}
                            </span>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-slate-200">
                            {(t.settings?.canvasInstructionMetricOptional || '可选指令')}：
                            <span className="ml-1 font-bold text-cyan-200">{optionalInstructions.length}</span>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-slate-200">
                            {(t.settings?.canvasInstructionMetricMode || '模式')}：
                            <span className="ml-1 font-bold text-cyan-200">{modeLabel}</span>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-slate-200">
                            {(t.settings?.canvasInstructionMetricStatus || 'AI 状态')}：
                            <span className="ml-1 font-bold text-cyan-200">{statusLabelMap[status] || statusLabelMap.idle}</span>
                        </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                            onClick={onUseAutoMode}
                            className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors md:text-sm ${mode === 'auto'
                                ? 'bg-cyan-500 text-slate-950'
                                : 'border border-white/15 bg-slate-900 text-slate-200 hover:bg-slate-800'
                                }`}
                        >
                            {t.settings?.canvasInstructionUseAuto || '自动模式'}
                        </button>
                        <button
                            onClick={onUseManualMode}
                            className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors md:text-sm ${mode === 'manual'
                                ? 'bg-cyan-500 text-slate-950'
                                : 'border border-white/15 bg-slate-900 text-slate-200 hover:bg-slate-800'
                                }`}
                        >
                            {t.settings?.canvasInstructionUseManual || '手动模式'}
                        </button>
                        <button
                            onClick={onRunAutoRecommend}
                            disabled={!canRunAutoNow}
                            className="ml-auto rounded-xl border border-cyan-300/30 bg-cyan-400/15 px-3 py-2 text-xs font-bold text-cyan-100 transition-colors hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-60 md:text-sm"
                        >
                            <span className="inline-flex items-center gap-1.5">
                                {isAutoRecommending ? <Loader2 size={13} className="animate-spin" /> : <Bot size={13} />}
                                {isAutoRecommending
                                    ? (t.settings?.canvasInstructionRunning || '推荐中...')
                                    : (t.settings?.canvasInstructionRunNow || '立即 AI 推荐')}
                            </span>
                        </button>
                    </div>

                    <div className="mt-2 text-xs text-slate-400 md:text-sm">
                        {(t.settings?.canvasInstructionConversationCount || '当前画布用户对话次数')}：
                        <span className="ml-1 font-semibold text-slate-200">{conversationCount}</span>
                        {lastRunAt > 0 && (
                            <span className="ml-3">
                                {(t.settings?.canvasInstructionLastRun || '最近推荐')}：
                                <span className="ml-1 text-slate-300">{formatTimestamp(lastRunAt)}</span>
                            </span>
                        )}
                        {status === 'done' && (
                            <span className="ml-3">
                                {(t.settings?.canvasInstructionLastResultCount || '最近推荐条数')}：
                                <span className="ml-1 text-slate-300">{lastResultCount}</span>
                            </span>
                        )}
                    </div>

                    {status === 'error' && (
                        <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100 md:text-sm">
                            <span className="inline-flex items-center gap-1.5 font-semibold">
                                <AlertTriangle size={14} />
                                {t.settings?.canvasInstructionErrorTitle || '推荐失败'}
                            </span>
                            {lastError ? <span className="ml-1">{lastError}</span> : null}
                        </div>
                    )}

                    {!isManualMode && (
                        <div className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100 md:text-sm">
                            {conversationCount <= 2
                                ? (t.settings?.canvasInstructionAutoHintNeedMoreChat || '自动模式会在当前画布用户对话超过 2 次后触发推荐。')
                                : (t.settings?.canvasInstructionAutoHintLocked || '自动模式下可选指令由 AI 维护；切换到手动模式可进行逐条选择。')}
                        </div>
                    )}
                </div>

                <div className="max-h-[calc(88vh-285px)] space-y-6 overflow-y-auto p-5 md:p-6 custom-scrollbar">
                    <section className="space-y-3">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-cyan-200 md:text-base">
                            <Globe2 size={14} />
                            {t.settings?.canvasInstructionGlobalTitle || '全局指令（始终生效）'}
                        </h4>
                        {globalInstructions.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-white/15 bg-slate-900/50 px-3 py-4 text-xs text-slate-400 md:text-sm">
                                {t.settings?.canvasInstructionGlobalEmpty || '暂无全局指令。'}
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {globalInstructions.map(item => (
                                    <div key={item.id} className="rounded-xl border border-cyan-300/20 bg-slate-900/80 p-3">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                                            <Lock size={12} className="text-cyan-300" />
                                            {item.title || (t.settings?.canvasInstructionUntitled || '未命名指令')}
                                        </div>
                                        <p className="mt-1 whitespace-pre-wrap text-xs text-slate-300 md:text-sm">{item.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="space-y-3">
                        <h4 className="text-sm font-bold text-cyan-200 md:text-base">
                            {t.settings?.canvasInstructionOptionalTitle || '画布可选指令（当前画布）'}
                        </h4>
                        {optionalInstructions.length === 0 ? (
                            <div className="space-y-3 rounded-xl border border-dashed border-white/15 bg-slate-900/50 px-3 py-4 text-xs text-slate-300 md:text-sm">
                                <p>{t.settings?.canvasInstructionOptionalEmpty || '暂无可选指令，请先在设置里新增并取消“全局生效”。'}</p>
                                <button
                                    onClick={onOpenSettings}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-100 transition-colors hover:bg-slate-800"
                                >
                                    <Settings2 size={13} />
                                    {t.settings?.canvasInstructionOpenSettings || '前往设置管理指令'}
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {optionalInstructions.map(item => {
                                    const checked = enabledIds.has(item.id);
                                    const fromAuto = autoEnabledIds.has(item.id);
                                    return (
                                        <label
                                            key={item.id}
                                            className={`rounded-xl border p-3 transition-colors ${checked
                                                ? 'border-cyan-300/25 bg-cyan-500/10'
                                                : 'border-white/10 bg-slate-900/80'
                                                } ${isManualMode ? 'cursor-pointer' : 'cursor-default opacity-90'}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    disabled={!isManualMode}
                                                    onChange={(e) => onToggleInstruction(item.id, e.target.checked)}
                                                    className="mt-1 h-4 w-4 rounded border-slate-400 text-cyan-500 focus:ring-cyan-400 disabled:opacity-60"
                                                />
                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold text-slate-100 md:text-[15px]">
                                                        {item.title || (t.settings?.canvasInstructionUntitled || '未命名指令')}
                                                        {fromAuto && (
                                                            <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-cyan-400/15 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">
                                                                <CheckCircle2 size={10} />
                                                                {t.settings?.canvasInstructionAutoTag || 'AI 推荐'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-1 whitespace-pre-wrap text-xs text-slate-300 md:text-sm">{item.content}</p>
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
