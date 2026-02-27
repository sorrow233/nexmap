import React, { useEffect, useMemo, useState } from 'react';
import {
    Bot,
    Clock3,
    Globe2,
    Loader2,
    MessageSquare,
    Settings2,
    Sparkles,
    AlertTriangle,
    X
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeBoardInstructionSettings } from '../../services/customInstructionsService';
import InstructionItemCard from './instructionPanel/InstructionItemCard';
import InstructionToolbar from './instructionPanel/InstructionToolbar';

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
    onRunAutoRecommend,
    onOpenSettings,
    isAutoRecommending = false,
    conversationCount = 0
}) {
    const { t } = useLanguage();
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');

    const settings = normalizeBoardInstructionSettings(boardInstructionSettings);
    const enabledIds = useMemo(
        () => new Set(settings.enabledInstructionIds || []),
        [settings.enabledInstructionIds]
    );
    const autoEnabledIds = useMemo(
        () => new Set(settings.autoEnabledInstructionIds || []),
        [settings.autoEnabledInstructionIds]
    );
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
    const optionalRows = optionalInstructions.map(item => ({
        ...item,
        checked: enabledIds.has(item.id),
        fromAuto: autoEnabledIds.has(item.id),
        searchText: `${item.title || ''}\n${item.content || ''}`.toLowerCase()
    }));

    const normalizedQuery = query.trim().toLowerCase();
    const visibleOptionalRows = optionalRows.filter((item) => {
        if (normalizedQuery && !item.searchText.includes(normalizedQuery)) {
            return false;
        }

        if (filter === 'enabled') return item.checked;
        if (filter === 'recommended') return item.fromAuto;
        if (filter === 'disabled') return !item.checked;
        return true;
    });

    const enabledOptionalCount = optionalRows.filter(item => item.checked).length;
    const autoOptionalCount = optionalRows.filter(item => item.fromAuto).length;
    const activePreviewRows = [
        ...globalInstructions.map(item => ({ ...item, locked: true, checked: true })),
        ...optionalRows.filter(item => item.checked).map(item => ({ ...item, locked: false, checked: true }))
    ];

    const applyOptionalSelection = (nextEnabledIds) => {
        const nextSet = new Set(nextEnabledIds);
        optionalRows.forEach(item => {
            const shouldEnable = nextSet.has(item.id);
            if (item.checked !== shouldEnable) {
                onToggleInstruction?.(item.id, shouldEnable);
            }
        });
    };

    const statusLabelMap = {
        idle: t.settings?.canvasInstructionStatusIdle || '待机',
        running: t.settings?.canvasInstructionStatusRunning || '推荐中',
        done: t.settings?.canvasInstructionStatusDone || '推荐完成',
        error: t.settings?.canvasInstructionStatusError || '推荐失败'
    };

    const modeLabel = t.settings?.canvasInstructionModeManual || '手动';

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-md md:p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-[0_30px_100px_rgba(2,6,23,0.75)]">
                <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
                <div className="pointer-events-none absolute -left-16 -bottom-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

                <div className="relative border-b border-white/10 bg-slate-900/70 px-5 py-4 md:px-6 md:py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <h3 className="flex items-center gap-2 text-xl font-black text-white md:text-2xl">
                                <Sparkles size={18} className="text-cyan-300" />
                                {t.settings?.canvasInstructionTitle || '画布指令选择'}
                            </h3>
                            <p className="mt-1 text-xs text-slate-300 md:text-sm leading-relaxed">
                                {t.settings?.canvasInstructionSubtitle || '全局指令始终生效；可选指令按当前画布单独启用。'}
                                <span className="ml-2 text-slate-400">支持搜索、筛选、批量操作。</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onOpenSettings}
                                className="rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-slate-200 transition-colors hover:bg-slate-800"
                            >
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold md:text-sm">
                                    <Settings2 size={14} />
                                    指令设置
                                </span>
                            </button>
                            <button
                                onClick={onClose}
                                className="rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-slate-200 transition-colors hover:bg-slate-800"
                                aria-label={t.settings?.close || 'Close'}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-5 md:text-sm">
                        <div className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-slate-200">
                            当前生效：<span className="ml-1 font-bold text-cyan-200">{instructionPanelSummary?.activeCount ?? (globalInstructions.length + enabledIds.size)}</span>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-slate-200">
                            可选指令：<span className="ml-1 font-bold text-cyan-200">{optionalInstructions.length}</span>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-slate-200">
                            模式：<span className="ml-1 font-bold text-cyan-200">{modeLabel}</span>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-slate-200">
                            AI 状态：<span className="ml-1 font-bold text-cyan-200">{statusLabelMap[status] || statusLabelMap.idle}</span>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-slate-200">
                            AI 推荐：<span className="ml-1 font-bold text-cyan-200">{autoOptionalCount}</span>
                        </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300 md:text-sm">
                                <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900 px-2 py-1">
                            <MessageSquare size={12} />
                            当前画布对话 {conversationCount}
                        </span>
                        {lastRunAt > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900 px-2 py-1">
                                <Clock3 size={12} />
                                最近推荐 {formatTimestamp(lastRunAt)}
                            </span>
                        )}
                        {status === 'done' && (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900 px-2 py-1">
                                <Bot size={12} />
                                最近推荐条数 {lastResultCount}
                            </span>
                        )}

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

                    {status === 'error' && (
                        <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100 md:text-sm">
                            <span className="inline-flex items-center gap-1.5 font-semibold">
                                <AlertTriangle size={14} />
                                {t.settings?.canvasInstructionErrorTitle || '推荐失败'}
                            </span>
                            {lastError ? <span className="ml-1">{lastError}</span> : null}
                        </div>
                    )}
                </div>

                <div className="relative max-h-[calc(90vh-290px)] overflow-y-auto p-5 md:p-6 custom-scrollbar">
                    <div className="grid gap-6 xl:grid-cols-[1fr,1.45fr]">
                        <section className="space-y-3">
                            <h4 className="flex items-center gap-2 text-sm font-bold text-cyan-200 md:text-base">
                                <Globe2 size={14} />
                                全局指令（始终生效）
                            </h4>
                            {globalInstructions.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/50 px-3 py-4 text-xs text-slate-400 md:text-sm">
                                    {t.settings?.canvasInstructionGlobalEmpty || '暂无全局指令。'}
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {globalInstructions.map(item => (
                                        <InstructionItemCard
                                            key={item.id}
                                            title={item.title}
                                            content={item.content}
                                            checked
                                            locked
                                        />
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="space-y-3">
                            <h4 className="text-sm font-bold text-cyan-200 md:text-base">
                                画布可选指令（当前画布）
                            </h4>

                            {optionalRows.length === 0 ? (
                                <div className="space-y-3 rounded-2xl border border-dashed border-white/15 bg-slate-900/50 px-3 py-4 text-xs text-slate-300 md:text-sm">
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
                                <div className="space-y-3">
                                    <InstructionToolbar
                                        query={query}
                                        onQueryChange={setQuery}
                                        filter={filter}
                                        onFilterChange={setFilter}
                                        optionalCount={optionalRows.length}
                                        visibleCount={visibleOptionalRows.length}
                                        enabledCount={enabledOptionalCount}
                                        autoCount={autoOptionalCount}
                                        onEnableAll={() => applyOptionalSelection(optionalRows.map(item => item.id))}
                                        onDisableAll={() => applyOptionalSelection([])}
                                        onApplyAuto={() => applyOptionalSelection(optionalRows.filter(item => item.fromAuto).map(item => item.id))}
                                    />

                                    {visibleOptionalRows.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/50 px-3 py-4 text-xs text-slate-400 md:text-sm">
                                            没有匹配的指令，试试清除搜索或切换筛选条件。
                                        </div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {visibleOptionalRows.map(item => (
                                                <InstructionItemCard
                                                    key={item.id}
                                                    title={item.title}
                                                    content={item.content}
                                                    checked={item.checked}
                                                    fromAuto={item.fromAuto}
                                                    onToggle={(checked) => onToggleInstruction?.(item.id, checked)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    </div>

                    <section className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                        <h4 className="text-sm font-bold text-cyan-200 md:text-base">
                            当前会附加到 AI 请求的指令预览
                        </h4>
                        {activePreviewRows.length === 0 ? (
                            <p className="text-xs text-slate-400 md:text-sm">
                                目前没有生效指令，AI 将仅按默认系统提示词回答。
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {activePreviewRows.slice(0, 4).map((item) => (
                                    <p key={item.id} className="text-xs text-slate-200 md:text-sm">
                                        <span className="mr-1 text-cyan-200">•</span>
                                        {item.title || '未命名指令'}
                                    </p>
                                ))}
                                {activePreviewRows.length > 4 && (
                                    <p className="text-xs text-slate-400 md:text-sm">
                                        还有 {activePreviewRows.length - 4} 条指令已生效。
                                    </p>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
