import React, { useState } from 'react';
import { Link2, CheckCircle2, AlertCircle, ClipboardPaste } from 'lucide-react';

export default function SettingsLinkageTab({ flowStudioUserId, setFlowStudioUserId, appUserUid }) {
    const [pasteError, setPasteError] = useState('');
    const normalized = flowStudioUserId?.trim?.() || '';
    const isBound = normalized.length > 0;

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setFlowStudioUserId(text || '');
            setPasteError('');
        } catch {
            setPasteError('无法读取剪贴板，请手动粘贴。');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="rounded-3xl border border-cyan-200/80 bg-gradient-to-br from-cyan-50 via-sky-50 to-white p-6 dark:border-cyan-300/25 dark:from-cyan-500/15 dark:via-sky-500/10 dark:to-transparent">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-cyan-500/20 p-2.5 text-cyan-700 dark:text-cyan-200">
                            <Link2 size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">FlowStudio 绑定</h3>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                绑定后，文本可静默同步到你的 FlowStudio 队列。
                            </p>
                        </div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-bold ${isBound
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-200'
                        }`}>
                        {isBound ? '已绑定' : '未绑定'}
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-5 dark:border-white/10 dark:bg-slate-900/70">
                <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                    FlowStudio Firebase UID
                </label>
                <input
                    type="text"
                    value={flowStudioUserId}
                    onChange={(e) => setFlowStudioUserId(e.target.value)}
                    placeholder="请输入 FlowStudio 用户 UID"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        onClick={handlePaste}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100 dark:border-white/15 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                        <ClipboardPaste size={13} />
                        从剪贴板粘贴
                    </button>
                    <button
                        onClick={() => setFlowStudioUserId('')}
                        className="rounded-lg border border-rose-300/50 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition-all hover:bg-rose-100 dark:border-rose-300/25 dark:bg-rose-400/10 dark:text-rose-200 dark:hover:bg-rose-400/20"
                    >
                        清除绑定
                    </button>
                </div>
                {pasteError && (
                    <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">{pasteError}</p>
                )}
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    修改后请点击右上角“保存更改”生效并同步到云端。
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/60">
                    <div className="mb-2 flex items-center gap-2 text-slate-800 dark:text-slate-100">
                        {isBound ? <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-300" /> : <AlertCircle size={16} className="text-amber-600 dark:text-amber-300" />}
                        <p className="text-sm font-bold">绑定状态</p>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                        {isBound ? '当前已绑定，Flow 按钮会直接静默发送。' : '当前未绑定，点击 Flow 时会要求输入 UID。'}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/60">
                    <p className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">当前 Aimainmap 账号</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 break-all">
                        {appUserUid || '未登录（仅本地保存，无法云端同步）'}
                    </p>
                </div>
            </div>
        </div>
    );
}
