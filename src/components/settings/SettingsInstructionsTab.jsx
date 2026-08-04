import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Info, Sparkles } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import InstructionListPanel from './instructions/InstructionListPanel';
import InstructionEditorPanel from './instructions/InstructionEditorPanel';
import {
    settingsDarkSurfaceGradient,
    settingsDarkSurfaceMuted
} from './themeClasses';
import {
    MAX_CONTENT_LENGTH,
    createInstructionId,
    defaultInstruction,
    duplicateInstruction,
    filterInstructions,
    getEditableItems,
    getInstructionSummary,
    normalizeEditableInstruction,
    sortInstructions
} from './instructions/helpers';

export default function SettingsInstructionsTab({ customInstructions, setCustomInstructions }) {
    const { t } = useLanguage();

    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [sort, setSort] = useState('updated_desc');
    const [activeInstructionId, setActiveInstructionId] = useState('');

    const items = useMemo(() => getEditableItems(customInstructions), [customInstructions]);

    const summary = useMemo(() => getInstructionSummary(items), [items]);

    const visibleItems = useMemo(() => {
        const sorted = sortInstructions(items, sort);
        return filterInstructions(sorted, { query, filter });
    }, [items, sort, query, filter]);

    useEffect(() => {
        if (items.length === 0) {
            setActiveInstructionId('');
            return;
        }

        const exists = items.some(item => item.id === activeInstructionId);
        if (!exists) {
            setActiveInstructionId(items[0].id);
        }
    }, [items, activeInstructionId]);

    useEffect(() => {
        if (visibleItems.length === 0) return;
        const visibleHasActive = visibleItems.some(item => item.id === activeInstructionId);
        if (!visibleHasActive) {
            setActiveInstructionId(visibleItems[0].id);
        }
    }, [visibleItems, activeInstructionId]);

    const activeInstruction = useMemo(
        () => items.find(item => item.id === activeInstructionId) || null,
        [items, activeInstructionId]
    );

    const updateItems = (updater) => {
        setCustomInstructions((prevValue) => {
            const current = getEditableItems(prevValue);
            const next = typeof updater === 'function' ? updater(current) : updater;
            return {
                items: (next || []).map((item, idx) => normalizeEditableInstruction(item, idx))
            };
        });
    };

    const handleAddInstruction = (preset = '') => {
        const now = Date.now();
        const newItem = {
            ...defaultInstruction(),
            id: createInstructionId(),
            title: preset ? String(preset).slice(0, 80) : '',
            content: preset ? String(preset).slice(0, MAX_CONTENT_LENGTH) : '',
            createdAt: now,
            updatedAt: now
        };

        updateItems(prev => [newItem, ...prev]);
        setActiveInstructionId(newItem.id);
        setFilter('all');
    };

    const handleRemoveInstruction = (id) => {
        updateItems(prev => prev.filter(item => item.id !== id));
        if (activeInstructionId === id) {
            setActiveInstructionId('');
        }
    };

    const handleDuplicateInstruction = (id) => {
        updateItems(prev => {
            const target = prev.find(item => item.id === id);
            if (!target) return prev;
            const copy = duplicateInstruction(target);
            return [copy, ...prev];
        });

        const candidate = items.find(item => item.id === id);
        if (candidate) {
            const copyId = `ci_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
            setActiveInstructionId(copyId);
        }
    };

    const handleUpdateInstruction = (id, updates) => {
        updateItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            return {
                ...item,
                ...updates,
                updatedAt: Date.now()
            };
        }));
    };

    const handleClearEmptyInstructions = () => {
        updateItems(prev => prev.filter(item => String(item.content || '').trim().length > 0));
    };

    const examples = [
        t.settings?.exampleInstruction1 || '请始终用日语回复',
        t.settings?.exampleInstruction2 || '我是软件工程师，请使用专业术语',
        t.settings?.exampleInstruction3 || '回复控制在 200 字以内'
    ];

    return (
        <div className="settings-jp-feature settings-jp-instructions animate-fade-in">
            <section className={`settings-jp-feature-intro ${settingsDarkSurfaceGradient}`}>
                <div className="settings-jp-feature-orb" />
                <div className="relative">
                    <h3>
                        <FileText size={20} />
                        {t.settings?.customInstructions || '自定义指令'}
                    </h3>
                    <p>
                        {t.settings?.customInstructionsHelp || '在此添加的指令将应用于所有卡片和画布中的每次 AI 交互。'}
                    </p>
                    <p className="settings-jp-feature-note">
                        {t.settings?.customInstructionsUnlimitedHint || '支持无限新增。可将单条指令设为“全局生效”，其余由每个画布单独选择开启。'}
                    </p>
                </div>
            </section>

            <section className="settings-jp-instruction-workspace">
                <InstructionListPanel
                    t={t}
                    items={visibleItems}
                    activeId={activeInstructionId}
                    query={query}
                    filter={filter}
                    sort={sort}
                    onQueryChange={setQuery}
                    onFilterChange={setFilter}
                    onSortChange={setSort}
                    onSelect={setActiveInstructionId}
                    onAddInstruction={() => handleAddInstruction('')}
                    onDuplicateInstruction={handleDuplicateInstruction}
                    onRemoveInstruction={handleRemoveInstruction}
                    onClearEmptyInstructions={handleClearEmptyInstructions}
                    summary={summary}
                    isEmptyState={items.length === 0}
                />

                <InstructionEditorPanel
                    t={t}
                    item={activeInstruction}
                    onChange={handleUpdateInstruction}
                    onDuplicate={handleDuplicateInstruction}
                    onRemove={handleRemoveInstruction}
                />
            </section>

            <section className="settings-jp-instruction-support">
                <div className={`settings-jp-feature-panel ${settingsDarkSurfaceMuted}`}>
                    <p className="settings-jp-feature-eyebrow">
                        {t.settings?.exampleInstructions || '示例指令'}
                    </p>
                    <div className="grid gap-2">
                        {examples.map((example, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleAddInstruction(example)}
                                className="settings-jp-example-button"
                            >
                                <Sparkles size={14} />
                                <span>{example}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="settings-jp-notice is-info">
                    <Info size={18} />
                    <div>
                        <p className="settings-jp-notice-title">
                            {t.settings?.customInstructionsNote || '工作原理'}
                        </p>
                        <p>
                            {t.settings?.customInstructionsInfo || '您的指令会被添加到每个 AI 请求的开头。用于设置语言偏好、回复风格或特定领域的上下文。'}
                        </p>
                        <p className="settings-jp-feature-note">
                            提示：优先写“可执行约束”，如格式、长度、语气、结构，避免写模糊目标。
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
