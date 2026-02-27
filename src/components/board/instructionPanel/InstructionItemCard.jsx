import React from 'react';
import { Bot, CheckCircle2, Lock } from 'lucide-react';

export default function InstructionItemCard({
    title,
    content,
    checked = false,
    locked = false,
    fromAuto = false,
    onToggle
}) {
    const handleToggle = (e) => {
        if (locked || typeof onToggle !== 'function') return;
        onToggle(e.target.checked);
    };

    return (
        <div
            className={`rounded-2xl border p-3 transition-colors ${locked
                ? 'border-emerald-300/25 bg-emerald-500/10'
                : checked
                    ? 'border-cyan-300/30 bg-cyan-500/10'
                    : 'border-white/10 bg-slate-900/70'
                }`}
        >
            <div className="flex items-start gap-3">
                {locked ? (
                    <span className="mt-1 inline-flex h-4 w-4 items-center justify-center text-emerald-200">
                        <Lock size={13} />
                    </span>
                ) : (
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={handleToggle}
                        className="mt-1 h-4 w-4 rounded border-slate-400 text-cyan-500 focus:ring-cyan-400"
                    />
                )}

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-100">
                            {title || '未命名指令'}
                        </p>
                        {locked && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-300/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-100">
                                <Lock size={10} />
                                全局
                            </span>
                        )}
                        {fromAuto && !locked && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-cyan-300/15 px-1.5 py-0.5 text-[10px] font-bold text-cyan-100">
                                <Bot size={10} />
                                AI 推荐
                            </span>
                        )}
                        {checked && !locked && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-100">
                                <CheckCircle2 size={10} />
                                已启用
                            </span>
                        )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-300 md:text-sm">
                        {content}
                    </p>
                </div>
            </div>
        </div>
    );
}
