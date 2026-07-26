import React, { useMemo } from 'react';
import { Check, Globe, Layers3, Sparkles } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import SettingsUsageSummaryCard from './SettingsUsageSummaryCard';
import {
    createInstructionId,
    defaultInstruction,
    getEditableItems,
    normalizeEditableInstruction
} from './instructions/helpers';

const LANGUAGES = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'zh', name: 'Chinese', native: '简体中文' },
    { code: 'ja', name: 'Japanese', native: '日本語' }
];

function LanguageChip({ active, label, caption, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`settings-jp-language-option${active ? ' is-active' : ''}`}
            aria-pressed={active}
        >
            <span>
                <strong>{label}</strong>
                <small>{caption}</small>
            </span>
            {active && <Check size={15} strokeWidth={2} aria-hidden="true" />}
        </button>
    );
}

export default function SettingsBasicSection({
    customInstructions,
    setCustomInstructions,
    advancedInstructionCount = 0,
    onOpenAdvancedInstructions
}) {
    const { language, setLanguage, t } = useLanguage();

    const primaryInstruction = useMemo(() => {
        const items = getEditableItems(customInstructions);
        return items.find(item => item.isGlobal) || items[0] || null;
    }, [customInstructions]);

    const handleLanguageChange = (code) => {
        setLanguage(code);
        localStorage.setItem('userLanguage', code);
    };

    const handlePrimaryInstructionChange = (value) => {
        setCustomInstructions((prevValue) => {
            const current = getEditableItems(prevValue);
            const targetIndex = current.findIndex(item => item.isGlobal);
            const now = Date.now();
            const next = [...current];

            if (targetIndex >= 0) {
                next[targetIndex] = normalizeEditableInstruction({
                    ...next[targetIndex],
                    title: next[targetIndex].title || '默认回复规则',
                    content: value,
                    isGlobal: true,
                    enabled: true,
                    updatedAt: now
                });
            } else {
                next.unshift(normalizeEditableInstruction({
                    ...defaultInstruction(),
                    id: createInstructionId(),
                    title: '默认回复规则',
                    content: value,
                    isGlobal: true,
                    enabled: true,
                    createdAt: now,
                    updatedAt: now
                }));
            }

            return {
                items: next.map((item, idx) => normalizeEditableInstruction(item, idx))
            };
        });
    };

    return (
        <section className="settings-jp-section">
            <SettingsUsageSummaryCard />

            <div className="settings-jp-basic-grid">
                <div className="settings-jp-surface">
                    <div className="settings-jp-section-title">
                        <div className="settings-jp-section-icon">
                            <Globe size={17} strokeWidth={1.7} />
                        </div>
                        <div>
                            <h3>
                                {t.settings.language || '语言'}
                            </h3>
                            <p>
                                {t.settings.languageChoose || '选择界面显示语言。'}
                            </p>
                        </div>
                    </div>

                    <div className="settings-jp-language-list">
                        {LANGUAGES.map((lang) => (
                            <LanguageChip
                                key={lang.code}
                                active={language === lang.code}
                                label={lang.native}
                                caption={lang.name}
                                onClick={() => handleLanguageChange(lang.code)}
                            />
                        ))}
                    </div>
                </div>

                <div className="settings-jp-surface">
                    <div className="settings-jp-section-title">
                        <div className="settings-jp-section-icon">
                            <Sparkles size={17} strokeWidth={1.7} />
                        </div>
                        <div>
                            <h3>默认回复规则</h3>
                            <p>一条全局规则，会应用到日常回复。</p>
                        </div>
                    </div>

                    <textarea
                        value={primaryInstruction?.content || ''}
                        onChange={(e) => handlePrimaryInstructionChange(e.target.value)}
                        placeholder={t.settings?.customInstructionsPlaceholder || '示例：请用轻松友好的语气回复。使用项目符号列表。回答尽量简洁。'}
                        className="settings-jp-instruction-field"
                    />

                    <div className="settings-jp-instruction-meta">
                        <div>
                            <Layers3 size={14} strokeWidth={1.7} />
                            高级指令 <strong>{advancedInstructionCount}</strong>
                        </div>
                        <button
                            type="button"
                            onClick={onOpenAdvancedInstructions}
                            className="settings-jp-text-link"
                        >
                            管理指令 →
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
