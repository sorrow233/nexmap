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

function AdvancedPanel({ title, description, icon: Icon, index, open, onToggle, children }) {
    return (
        <div className={`settings-jp-accordion${open ? ' is-open' : ''}`}>
            <button
                type="button"
                onClick={onToggle}
                className="settings-jp-accordion-trigger"
                aria-expanded={open}
            >
                <span className="settings-jp-accordion-index">{index}</span>
                <div className="settings-jp-accordion-icon">
                    <Icon size={17} strokeWidth={1.7} />
                </div>
                <div className="settings-jp-accordion-copy">
                    <strong>{title}</strong>
                    <span>{description}</span>
                </div>
                <div className="settings-jp-accordion-toggle" aria-hidden="true">
                    {open
                        ? <ChevronUp size={17} strokeWidth={1.7} />
                        : <ChevronDown size={17} strokeWidth={1.7} />}
                </div>
            </button>
            {open && (
                <div className="settings-jp-accordion-body">
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
        <section className="settings-jp-section">
            <div className="settings-jp-advanced-intro">
                <div className="settings-jp-section-title">
                    <div className="settings-jp-section-icon">
                        <Settings2 size={17} strokeWidth={1.7} />
                    </div>
                    <div>
                        <h3>按需展开</h3>
                        <p>导入导出、指令库和本地绑定仍完整保留。</p>
                    </div>
                </div>
                <button type="button" onClick={handleReset} className="settings-jp-reset-link">
                    <RefreshCw size={14} strokeWidth={1.7} />
                    重置默认配置
                </button>
            </div>

            <AdvancedPanel
                index="01"
                title="额度与兑换"
                description="查看更详细的额度信息、兑换码与购买入口。"
                icon={Gift}
                open={activePanel === 'credits'}
                onToggle={() => togglePanel('credits')}
            >
                <SettingsCreditsTab onOpenAdvanced={onOpenAITab} />
            </AdvancedPanel>

            <AdvancedPanel
                index="02"
                title="高级指令库"
                description="多条规则、画布可选规则、AI 推荐等仍然保留在这里。"
                icon={FileText}
                open={activePanel === 'instructions'}
                onToggle={() => togglePanel('instructions')}
            >
                <SettingsInstructionsTab
                    customInstructions={customInstructions}
                    setCustomInstructions={setCustomInstructions}
                />
            </AdvancedPanel>

            <AdvancedPanel
                index="03"
                title="存储与恢复"
                description="S3、自定义备份、恢复、导入导出等能力。"
                icon={Database}
                open={activePanel === 'storage'}
                onToggle={() => togglePanel('storage')}
            >
                <SettingsStorageTab
                    s3Config={s3Config}
                    setS3ConfigState={setS3ConfigState}
                />
            </AdvancedPanel>

            <AdvancedPanel
                index="04"
                title="跨应用联动"
                description="管理 FlowStudio 与 Light 的 UID 本地绑定。"
                icon={Link2}
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
