import React, { useState } from 'react';
import {
    ChevronDown,
    ChevronUp,
    Database,
    FileText,
    Gift,
    Link2,
    RefreshCw,
    Settings2
} from 'lucide-react';
import SettingsCreditsTab from './SettingsCreditsTab';
import SettingsInstructionsTab from './SettingsInstructionsTab';
import SettingsStorageTab from './SettingsStorageTab';
import SettingsLinkageTab from './SettingsLinkageTab';

function AdvancedPanel({ title, description, icon: Icon, tone, open, onToggle, children }) {
    return (
        <div className="rounded-[28px] border border-gray-100 bg-gray-50/70 dark:border-gray-800 dark:bg-gray-900/50">
            <button
                onClick={onToggle}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
            >
                <div className="flex min-w-0 items-center gap-3">
                    <div className={`rounded-[16px] p-2.5 ${tone}`}>
                        <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-base font-medium text-gray-900 dark:text-white">{title}</div>
                        <div className="mt-1 text-sm leading-6 text-gray-400 dark:text-gray-500">{description}</div>
                    </div>
                </div>
                {open ? <ChevronUp size={18} className="text-gray-400 dark:text-gray-500" /> : <ChevronDown size={18} className="text-gray-400 dark:text-gray-500" />}
            </button>
            {open && (
                <div className="border-t border-gray-100 px-6 py-6 dark:border-gray-800">
                    {children}
                </div>
            )}
        </div>
    );
}

export default function SettingsAdvancedSection({
    s3Config,
    setS3ConfigState,
    customInstructions,
    setCustomInstructions,
    linkageSettings,
    onLinkageFieldChange,
    appUserUid,
    handleReset,
    onOpenAITab,
    openPanel,
    onOpenPanelChange
}) {
    const [internalOpenPanel, setInternalOpenPanel] = useState(null);
    const isControlled = openPanel !== undefined;
    const activePanel = isControlled ? openPanel : internalOpenPanel;

    const togglePanel = (panelId) => {
        const nextPanel = activePanel === panelId ? null : panelId;
        if (typeof onOpenPanelChange === 'function') {
            onOpenPanelChange(nextPanel);
            return;
        }
        setInternalOpenPanel(nextPanel);
    };

    return (
        <section className="space-y-4">
            <div className="rounded-[32px] border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500">
                            <Settings2 size={13} />
                            高级设置
                        </div>
                        <h3 className="mt-4 text-[28px] font-light tracking-[-0.03em] text-gray-900 dark:text-white">
                            不常用的能力统一折叠收纳
                        </h3>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-400 dark:text-gray-500">
                            恢复、存储、复杂指令和本地绑定都还在，只是默认退到第二层，不占首屏空间。
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handleReset}
                            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 transition-all hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200 dark:hover:bg-rose-950/40"
                        >
                            <RefreshCw size={14} />
                            重置默认配置
                        </button>
                    </div>
                </div>
            </div>

            <AdvancedPanel
                title="额度与兑换"
                description="查看更详细的额度信息、兑换码与购买入口。"
                icon={Gift}
                tone="bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-200"
                open={activePanel === 'credits'}
                onToggle={() => togglePanel('credits')}
            >
                <SettingsCreditsTab onOpenAdvanced={onOpenAITab} />
            </AdvancedPanel>

            <AdvancedPanel
                title="高级指令库"
                description="多条规则、画布可选规则、AI 推荐等仍然保留在这里。"
                icon={FileText}
                tone="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
                open={activePanel === 'instructions'}
                onToggle={() => togglePanel('instructions')}
            >
                <SettingsInstructionsTab
                    customInstructions={customInstructions}
                    setCustomInstructions={setCustomInstructions}
                />
            </AdvancedPanel>

            <AdvancedPanel
                title="存储与恢复"
                description="S3、自定义备份、恢复、导入导出等能力。"
                icon={Database}
                tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300"
                open={activePanel === 'storage'}
                onToggle={() => togglePanel('storage')}
            >
                <SettingsStorageTab
                    s3Config={s3Config}
                    setS3ConfigState={setS3ConfigState}
                />
            </AdvancedPanel>

            <AdvancedPanel
                title="跨应用联动"
                description="管理 FlowStudio 与 Light 的 UID 本地绑定。"
                icon={Link2}
                tone="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                open={activePanel === 'linkage'}
                onToggle={() => togglePanel('linkage')}
            >
                <SettingsLinkageTab
                    linkageSettings={linkageSettings}
                    onLinkageFieldChange={onLinkageFieldChange}
                    appUserUid={appUserUid}
                />
            </AdvancedPanel>
        </section>
    );
}
