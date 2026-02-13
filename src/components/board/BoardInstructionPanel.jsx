import React from 'react';
import { Bot, Globe2, Lock, Sparkles, X } from 'lucide-react';

export default function BoardInstructionPanel({
    isOpen,
    onClose,
    instructions = [],
    boardInstructionSettings,
    onToggleInstruction,
    onUseManualMode,
    onUseAutoMode,
    onRunAutoRecommend,
    isAutoRecommending = false,
    conversationCount = 0
}) {
    if (!isOpen) return null;

    const settings = boardInstructionSettings || {};
    const enabledIds = new Set(settings.enabledInstructionIds || []);
    const autoEnabledIds = new Set(settings.autoEnabledInstructionIds || []);
    const mode = settings.autoSelectionMode === 'manual' ? 'manual' : 'auto';
    const status = settings.autoSelection?.status || 'idle';
    const lastRunAt = settings.autoSelection?.lastRunAt || 0;

    const all = Array.isArray(instructions) ? instructions : [];
    const globalInstructions = all.filter(item => item && item.isGlobal === true && item.enabled !== false);
    const optionalInstructions = all.filter(item => item && item.isGlobal !== true && item.enabled !== false);

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
            <div className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-[0_30px_90px_rgba(2,6,23,0.75)]">
                <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
                    <div>
                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                            <Sparkles size={18} className="text-cyan-300" />
                            画布指令选择
                        </h3>
                        <p className="mt-1 text-sm text-slate-300">
                            全局指令始终生效；非全局指令可按当前画布单独开启。当前对话次数：{conversationCount}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                            模式：{mode === 'manual' ? '手动' : '自动'} · AI状态：{status}
                            {lastRunAt ? ` · 最近推荐：${new Date(lastRunAt).toLocaleString()}` : ''}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="overflow-y-auto max-h-[calc(85vh-170px)] p-6 space-y-6 custom-scrollbar">
                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 flex flex-wrap items-center gap-2">
                        <button
                            onClick={onUseAutoMode}
                            className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${mode === 'auto'
                                ? 'bg-cyan-500 text-slate-950'
                                : 'bg-slate-900 text-slate-200 border border-white/15 hover:bg-slate-800'
                                }`}
                        >
                            自动模式
                        </button>
                        <button
                            onClick={onUseManualMode}
                            className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${mode === 'manual'
                                ? 'bg-cyan-500 text-slate-950'
                                : 'bg-slate-900 text-slate-200 border border-white/15 hover:bg-slate-800'
                                }`}
                        >
                            手动模式
                        </button>
                        <button
                            onClick={onRunAutoRecommend}
                            disabled={isAutoRecommending}
                            className="ml-auto rounded-xl border border-cyan-300/30 bg-cyan-400/15 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-400/25 disabled:opacity-60"
                        >
                            <span className="inline-flex items-center gap-1">
                                <Bot size={12} />
                                {isAutoRecommending ? '推荐中...' : '立即AI推荐'}
                            </span>
                        </button>
                    </div>

                    <section className="space-y-3">
                        <h4 className="text-sm font-bold text-cyan-200 flex items-center gap-2">
                            <Globe2 size={14} />
                            全局指令（始终生效）
                        </h4>
                        {globalInstructions.length === 0 ? (
                            <p className="text-xs text-slate-400">暂无全局指令。</p>
                        ) : (
                            <div className="grid gap-3">
                                {globalInstructions.map(item => (
                                    <div key={item.id} className="rounded-xl border border-cyan-300/20 bg-slate-900/80 p-3">
                                        <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                                            <Lock size={12} className="text-cyan-300" />
                                            {item.title || '未命名指令'}
                                        </div>
                                        <p className="mt-1 text-xs text-slate-300 whitespace-pre-wrap">{item.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="space-y-3">
                        <h4 className="text-sm font-bold text-cyan-200">画布可选指令（当前画布）</h4>
                        {optionalInstructions.length === 0 ? (
                            <p className="text-xs text-slate-400">暂无可选指令，请先在设置里新增并取消“全局生效”。</p>
                        ) : (
                            <div className="grid gap-3">
                                {optionalInstructions.map(item => {
                                    const checked = enabledIds.has(item.id);
                                    const fromAuto = autoEnabledIds.has(item.id);
                                    return (
                                        <label key={item.id} className="rounded-xl border border-white/10 bg-slate-900/80 p-3 flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(e) => onToggleInstruction(item.id, e.target.checked)}
                                                className="mt-1 h-4 w-4 rounded border-slate-400 text-cyan-500 focus:ring-cyan-400"
                                            />
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-slate-100">
                                                    {item.title || '未命名指令'}
                                                    {fromAuto && (
                                                        <span className="ml-2 rounded-md bg-cyan-400/15 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">
                                                            AI 推荐
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-xs text-slate-300 whitespace-pre-wrap">{item.content}</p>
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
