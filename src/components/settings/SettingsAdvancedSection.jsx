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
        <div className="rounded-[30px] border border-[#eee3d7] bg-[rgba(255,252,247,0.84)] shadow-[0_18px_44px_rgba(95,74,50,0.06)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/6">
            <button
                onClick={onToggle}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
            >
                <div className="flex min-w-0 items-center gap-3">
                    <div className={`rounded-[16px] p-2.5 ${tone}`}>
                        <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-base font-semibold text-[#2f241a] dark:text-white">{title}</div>
                        <div className="mt-1 text-sm leading-6 text-[#7b6a58] dark:text-slate-300/80">{description}</div>
                    </div>
                </div>
                {open ? <ChevronUp size={18} className="text-[#b0a08e] dark:text-slate-300/70" /> : <ChevronDown size={18} className="text-[#b0a08e] dark:text-slate-300/70" />}
            </button>
            {open && (
                <div className="border-t border-[#eee3d7] px-6 py-6 dark:border-white/10">
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
        <section className="space-y-5">
            <div className="rounded-[32px] border border-[#eee3d7] bg-[linear-gradient(135deg,rgba(255,252,247,0.94),rgba(246,240,234,0.92))] p-6 shadow-[0_24px_60px_rgba(95,74,50,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(20,24,31,0.94),rgba(12,17,24,0.94))]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#e9dccb] bg-[#f8efe4] px-3 py-1 text-[11px] font-semibold text-[#8d6d49] dark:border-white/10 dark:bg-white/8 dark:text-slate-200">
                            <Settings2 size={13} />
                            高级设置
                        </div>
                        <h3 className="mt-4 text-[28px] font-semibold tracking-[-0.02em] text-[#2f241a] dark:text-white">
                            复杂能力都留在这里，但默认不打扰用户
                        </h3>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-[#7b6a58] dark:text-slate-300">
                            包含恢复、导入导出、复杂指令库和本地绑定等能力。只有需要时再展开。
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handleReset}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#edcfce] bg-[#fbefee] px-4 py-2 text-sm font-medium text-[#c66d6d] transition-all hover:bg-[#fff5f4] dark:border-rose-300/20 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/15"
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
                tone="bg-[#faedd7] text-[#af7c36]"
                open={activePanel === 'credits'}
                onToggle={() => togglePanel('credits')}
            >
                <SettingsCreditsTab onOpenAdvanced={onOpenAITab} />
            </AdvancedPanel>

            <AdvancedPanel
                title="高级指令库"
                description="多条规则、画布可选规则、AI 推荐等仍然保留在这里。"
                icon={FileText}
                tone="bg-[#ebe4f7] text-[#776496]"
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
                tone="bg-[#e5eee8] text-[#5f7666]"
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
                tone="bg-[#e7eef4] text-[#6a7f90]"
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
