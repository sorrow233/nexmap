import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ClipboardPaste, Link2 } from 'lucide-react';
import { LINKAGE_TARGET_LIST } from '../../services/linkageTargets';
import {
    settingsDarkChip,
    settingsDarkFieldSoft,
    settingsDarkIcon,
    settingsDarkSurface,
    settingsDarkSurfaceGradient,
    settingsDarkSurfaceMuted
} from './themeClasses';

export default function SettingsLinkageTab({ linkageSettings, onLinkageFieldChange, appUserUid }) {
    const [pasteErrors, setPasteErrors] = useState({});

    const boundCount = useMemo(() => (
        LINKAGE_TARGET_LIST.filter(target => (linkageSettings?.[target.settingsKey] || '').trim().length > 0).length
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
        <div className="settings-jp-feature settings-jp-linkage animate-fade-in">
            <div className={`settings-jp-feature-intro ${settingsDarkSurfaceGradient}`}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`settings-jp-feature-icon ${settingsDarkIcon}`}>
                            <Link2 size={20} />
                        </div>
                        <div>
                            <h3>跨应用联动绑定</h3>
                            <p>
                                同一套划词菜单，同时支持发往 FlowStudio 和 Light。
                            </p>
                        </div>
                    </div>
                    <div className={`settings-jp-status-pill${boundCount > 0 ? ' is-positive' : ' is-muted'}`}>
                        {boundCount > 0 ? `已绑定 ${boundCount} 个目标` : '尚未绑定'}
                    </div>
                </div>
            </div>

            <div className="settings-jp-linkage-grid">
                {LINKAGE_TARGET_LIST.map((target) => {
                    const value = linkageSettings?.[target.settingsKey] || '';
                    const isBound = value.trim().length > 0;
                    const pasteError = pasteErrors[target.settingsKey] || '';

                    return (
                        <div
                            key={target.id}
                            className={`settings-jp-linkage-card ${settingsDarkSurface}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={target.iconPath}
                                        alt={target.label}
                                        className="settings-jp-linkage-logo"
                                    />
                                    <div>
                                        <h4>{target.label}</h4>
                                        <p>
                                            {target.settingsDescription}
                                        </p>
                                    </div>
                                </div>
                                <div className={`settings-jp-status-pill${isBound ? ' is-positive' : ' is-muted'}`}>
                                    {isBound ? '已绑定' : '未绑定'}
                                </div>
                            </div>

                            <label className="settings-jp-feature-label">
                                {target.label} Firebase UID
                            </label>
                            <input
                                type="text"
                                value={value}
                                onChange={(e) => onLinkageFieldChange(target.settingsKey, e.target.value)}
                                placeholder={`请输入 ${target.label} 用户 UID`}
                                className={`settings-jp-feature-field ${settingsDarkFieldSoft}`}
                            />

                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    onClick={() => handlePaste(target.settingsKey)}
                                    className={`settings-jp-feature-button is-quiet is-compact ${settingsDarkChip}`}
                                >
                                    <ClipboardPaste size={13} />
                                    从剪贴板粘贴
                                </button>
                                <button
                                    onClick={() => onLinkageFieldChange(target.settingsKey, '')}
                                    className="settings-jp-feature-button is-danger is-compact"
                                >
                                    清除绑定
                                </button>
                            </div>

                            {pasteError && (
                                <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">{pasteError}</p>
                            )}

                            <div className={`settings-jp-linkage-state ${settingsDarkSurfaceMuted}`}>
                                <div>
                                    {isBound ? <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-300" /> : <AlertCircle size={16} className="text-amber-600 dark:text-amber-300" />}
                                    <p className="text-sm font-semibold">发送状态</p>
                                </div>
                                <p>
                                    {isBound
                                        ? `当前已绑定，划词菜单里的 ${target.buttonLabel} 按钮会优先静默发送。`
                                        : `当前未绑定，点击 ${target.buttonLabel} 时会要求输入 UID。`}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="settings-jp-linkage-notes">
                <div className={`settings-jp-feature-panel is-compact ${settingsDarkSurfaceMuted}`}>
                    <p className="settings-jp-notice-title">保存提醒</p>
                    <p>
                        修改绑定后，请点击右上角“保存更改”，这样这台设备上的本地绑定才会更新。
                    </p>
                </div>

                <div className={`settings-jp-feature-panel is-compact ${settingsDarkSurfaceMuted}`}>
                    <p className="settings-jp-notice-title">当前 Aimainmap 账号</p>
                    <p className="break-all">
                        {appUserUid || '未登录（仍可本地保存绑定）'}
                    </p>
                </div>
            </div>
        </div>
    );
}
