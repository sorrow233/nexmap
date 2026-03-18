import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ClipboardPaste, Link2 } from 'lucide-react';
import { LINKAGE_TARGET_LIST } from '../../services/linkageTargets';

export default function SettingsLinkageTab({ linkageSettings, onLinkageFieldChange, appUserUid }) {
    const [pasteErrors, setPasteErrors] = useState({});

    const boundCount = useMemo(() => (
        LINKAGE_TARGET_LIST.filter(target => (linkageSettings?.[target.cloudSettingsKey] || '').trim().length > 0).length
    ), [linkageSettings]);

    const handlePaste = async (field) => {
        try {
            const text = await navigator.clipboard.readText();
            onLinkageFieldChange(field, text || '');
            setPasteErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        } catch {
            setPasteErrors(prev => ({
                ...prev,
                [field]: '无法读取剪贴板，请手动粘贴。'
            }));
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="rounded-[28px] border border-[#eee3d7] bg-[linear-gradient(135deg,rgba(255,252,247,0.96),rgba(245,240,234,0.92))] p-6 dark:border-white/10 dark:bg-white/6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-[#e7eef4] p-2.5 text-[#6a7f90] dark:bg-white/10 dark:text-slate-200">
                            <Link2 size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold tracking-[-0.02em] text-[#2f241a] dark:text-white">跨应用联动绑定</h3>
                            <p className="mt-1 text-sm text-[#7b6a58] dark:text-slate-300">
                                同一套划词菜单，同时支持发往 FlowStudio 和 Light。
                            </p>
                        </div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${boundCount > 0
                        ? 'bg-[#edf5ee] text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200'
                        : 'bg-[#fbf3e7] text-[#b17d31] dark:bg-amber-400/20 dark:text-amber-200'
                        }`}>
                        {boundCount > 0 ? `已绑定 ${boundCount} 个目标` : '尚未绑定'}
                    </div>
                </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                {LINKAGE_TARGET_LIST.map((target) => {
                    const value = linkageSettings?.[target.cloudSettingsKey] || '';
                    const isBound = value.trim().length > 0;
                    const pasteError = pasteErrors[target.cloudSettingsKey] || '';

                    return (
                        <div
                            key={target.id}
                            className="rounded-[26px] border border-[#eee3d7] bg-[rgba(255,252,247,0.92)] p-5 shadow-[0_16px_36px_rgba(95,74,50,0.06)] dark:border-white/10 dark:bg-slate-900/70"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={target.iconPath}
                                        alt={target.label}
                                        className="h-10 w-10 rounded-2xl border border-[#eee3d7] bg-white p-1.5 object-contain dark:border-white/10 dark:bg-slate-950"
                                    />
                                    <div>
                                        <h4 className="text-base font-semibold tracking-[-0.02em] text-[#2f241a] dark:text-white">{target.label}</h4>
                                        <p className="mt-1 text-xs text-[#7b6a58] dark:text-slate-300">
                                            {target.settingsDescription}
                                        </p>
                                    </div>
                                </div>
                                <div className={`rounded-full px-3 py-1 text-[11px] font-semibold ${isBound
                                    ? 'bg-[#edf5ee] text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200'
                                    : 'bg-[#fbf3e7] text-[#b17d31] dark:bg-amber-400/20 dark:text-amber-200'
                                    }`}>
                                    {isBound ? '已绑定' : '未绑定'}
                                </div>
                            </div>

                            <label className="mb-2 mt-5 block text-sm font-semibold text-[#5a4b3c] dark:text-slate-200">
                                {target.label} Firebase UID
                            </label>
                            <input
                                type="text"
                                value={value}
                                onChange={(e) => onLinkageFieldChange(target.cloudSettingsKey, e.target.value)}
                                placeholder={`请输入 ${target.label} 用户 UID`}
                                className="w-full rounded-2xl border border-[#eee3d7] bg-[#fffdf9] px-4 py-3 text-sm text-[#40342a] placeholder:text-[#b0a08e] outline-none transition-colors focus:border-[#e7d4bb] focus:ring-2 focus:ring-[#f4e7d2] dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                            />

                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    onClick={() => handlePaste(target.cloudSettingsKey)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-[#eadfce] bg-[#fffaf4] px-3 py-1.5 text-xs font-semibold text-[#6d5d4d] transition-all hover:bg-white dark:border-white/15 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                    <ClipboardPaste size={13} />
                                    从剪贴板粘贴
                                </button>
                                <button
                                    onClick={() => onLinkageFieldChange(target.cloudSettingsKey, '')}
                                    className="rounded-full border border-[#edcfce] bg-[#fbefee] px-3 py-1.5 text-xs font-semibold text-[#c66d6d] transition-all hover:bg-[#fff5f4] dark:border-rose-300/25 dark:bg-rose-400/10 dark:text-rose-200 dark:hover:bg-rose-400/20"
                                >
                                    清除绑定
                                </button>
                            </div>

                            {pasteError && (
                                <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">{pasteError}</p>
                            )}

                            <div className="mt-4 rounded-[22px] border border-[#eee3d7] bg-[rgba(255,252,247,0.88)] p-4 dark:border-white/10 dark:bg-slate-900/60">
                                <div className="mb-2 flex items-center gap-2 text-[#4e4237] dark:text-slate-100">
                                    {isBound ? <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-300" /> : <AlertCircle size={16} className="text-amber-600 dark:text-amber-300" />}
                                    <p className="text-sm font-semibold">发送状态</p>
                                </div>
                                <p className="text-xs text-[#7b6a58] dark:text-slate-300">
                                    {isBound
                                        ? `当前已绑定，划词菜单里的 ${target.buttonLabel} 按钮会优先静默发送。`
                                        : `当前未绑定，点击 ${target.buttonLabel} 时会要求输入 UID。`}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-[#eee3d7] bg-[rgba(255,252,247,0.9)] p-4 dark:border-white/10 dark:bg-slate-900/60">
                    <p className="mb-2 text-sm font-semibold text-[#4e4237] dark:text-slate-100">保存提醒</p>
                    <p className="text-xs text-[#7b6a58] dark:text-slate-300">
                        修改绑定后，请点击右上角“保存更改”，这样本地和云端都会同步。
                    </p>
                </div>

                <div className="rounded-[24px] border border-[#eee3d7] bg-[rgba(255,252,247,0.9)] p-4 dark:border-white/10 dark:bg-slate-900/60">
                    <p className="mb-2 text-sm font-semibold text-[#4e4237] dark:text-slate-100">当前 Aimainmap 账号</p>
                    <p className="break-all text-xs text-[#7b6a58] dark:text-slate-300">
                        {appUserUid || '未登录（仅本地保存，无法云端同步）'}
                    </p>
                </div>
            </div>
        </div>
    );
}
