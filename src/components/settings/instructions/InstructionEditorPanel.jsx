import React from 'react';
import { AlertTriangle, Copy, Globe2, Layers3, Trash2 } from 'lucide-react';
import {
    MAX_CONTENT_LENGTH,
    MAX_TITLE_LENGTH,
    getInstructionDisplayTitle
} from './helpers';

export default function InstructionEditorPanel({
    t,
    item,
    onChange,
    onDuplicate,
    onRemove
}) {
    if (!item) {
        return (
            <section className="rounded-[26px] border border-dashed border-[#e4d7c9] bg-[rgba(255,252,247,0.72)] p-8 text-center dark:border-white/15 dark:bg-white/5">
                <p className="text-sm text-[#8f7e6b] dark:text-slate-300">
                    请选择左侧一条指令进行编辑，或新建一条指令开始。
                </p>
            </section>
        );
    }

    const isEmpty = !String(item.content || '').trim();

    return (
        <section className="rounded-[26px] border border-[#eee3d7] bg-[rgba(255,252,247,0.92)] p-4 dark:border-white/10 dark:bg-white/5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h4 className="text-base font-semibold text-[#3f3429] dark:text-slate-100">
                        {getInstructionDisplayTitle(item, t.settings?.canvasInstructionUntitled || '未命名指令')}
                    </h4>
                    <p className="text-xs text-[#958472] dark:text-slate-300">
                        ID: <span className="font-mono">{item.id}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onDuplicate?.(item.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-[#eadfce] bg-[#fffaf4] px-3 py-1.5 text-xs font-semibold text-[#6d5d4d] transition-colors hover:bg-white dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        <Copy size={12} />
                        复制
                    </button>
                    <button
                        onClick={() => onRemove?.(item.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-[#edcfce] bg-[#fbefee] px-3 py-1.5 text-xs font-semibold text-[#c66d6d] transition-colors hover:bg-[#fff5f4] dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                    >
                        <Trash2 size={12} />
                        删除
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="mb-1 block text-xs font-semibold text-[#7b6a58] dark:text-slate-300">
                        标题
                    </label>
                    <input
                        value={item.title || ''}
                        onChange={(e) => onChange?.(item.id, { title: e.target.value.slice(0, MAX_TITLE_LENGTH) })}
                        placeholder={t.settings?.instructionTitlePlaceholder || '指令标题（可选）'}
                        className="w-full rounded-2xl border border-[#eee3d7] bg-[#fffdf9] px-3 py-2 text-sm text-[#4f4337] outline-none transition-colors focus:border-[#e7d4bb] dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100"
                    />
                    <p className="mt-1 text-right text-[11px] text-[#b0a08e]">
                        {(item.title || '').length}/{MAX_TITLE_LENGTH}
                    </p>
                </div>

                <div>
                    <label className="mb-1 block text-xs font-semibold text-[#7b6a58] dark:text-slate-300">
                        指令正文
                    </label>
                    <textarea
                        value={item.content || ''}
                        onChange={(e) => onChange?.(item.id, { content: e.target.value.slice(0, MAX_CONTENT_LENGTH) })}
                        placeholder={t.settings?.customInstructionsPlaceholder || '示例：请用轻松友好的语气回复。使用项目符号列表。回答尽量简洁。'}
                        className={`custom-scrollbar min-h-[220px] w-full resize-y rounded-[24px] border p-3 text-sm leading-relaxed text-[#4f4337] outline-none transition-colors focus:border-[#e7d4bb] dark:bg-slate-900/40 dark:text-slate-100 ${isEmpty
                            ? 'border-[#eed8ae] bg-[#fff7ed] dark:border-amber-300/40 dark:bg-amber-500/10'
                            : 'border-[#eee3d7] bg-[#fffdf9] dark:border-white/10'
                            }`}
                    />
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                        <span className={`${isEmpty ? 'text-[#b17d31] dark:text-amber-200' : 'text-[#b0a08e]'}`}>
                            {isEmpty ? '内容为空时不会生效' : '建议单条指令聚焦一个行为目标'}
                        </span>
                        <span className="text-[#b0a08e]">{(item.content || '').length}/{MAX_CONTENT_LENGTH}</span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#eee3d7] bg-[#fffaf4] px-3 py-2 text-xs dark:border-white/10 dark:bg-slate-900/30">
                    <label className="inline-flex items-center gap-2 text-[#6f5f4e] dark:text-slate-200">
                        <input
                            type="checkbox"
                            checked={item.enabled !== false}
                            onChange={(e) => onChange?.(item.id, { enabled: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-[#d89e47] focus:ring-[#e7d4bb]"
                        />
                        启用
                    </label>

                    <label className="inline-flex items-center gap-2 text-[#6f5f4e] dark:text-slate-200">
                        <input
                            type="checkbox"
                            checked={item.isGlobal === true}
                            onChange={(e) => onChange?.(item.id, { isGlobal: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-[#d89e47] focus:ring-[#e7d4bb]"
                        />
                        <Globe2 size={12} />
                        {t.settings?.instructionGlobal || '全局生效'}
                    </label>

                    {item.isGlobal !== true && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11px] text-[#8f7e6b] dark:bg-white/10 dark:text-slate-300">
                            <Layers3 size={11} />
                            {t.settings?.instructionOptionalHint || '由画布单独选择'}
                        </span>
                    )}
                </div>

                {isEmpty && (
                    <div className="flex items-start gap-2 rounded-xl border border-[#eed8ae] bg-[#fbf3e7] px-3 py-2 text-xs text-[#9f7331] dark:border-amber-300/30 dark:bg-amber-500/10 dark:text-amber-200">
                        <AlertTriangle size={14} className="mt-0.5" />
                        <span>{t.settings?.instructionEmptyWarning || '包含空内容指令：保存后这些条目不会生效。请补充内容或删除。'}</span>
                    </div>
                )}
            </div>
        </section>
    );
}
