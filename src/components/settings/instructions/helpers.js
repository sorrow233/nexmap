import { normalizeCustomInstructionsValue } from '../../../services/customInstructionsService';

export const MAX_TITLE_LENGTH = 80;
export const MAX_CONTENT_LENGTH = 1200;

export const FILTER_OPTIONS = [
    { id: 'all', labelKey: 'all', fallback: '全部' },
    { id: 'enabled', labelKey: 'enabled', fallback: '已启用' },
    { id: 'global', labelKey: 'global', fallback: '全局' },
    { id: 'optional', labelKey: 'optional', fallback: '画布可选' },
    { id: 'empty', labelKey: 'empty', fallback: '空内容' }
];

export const createInstructionId = () => `ci_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const defaultInstruction = () => ({
    id: createInstructionId(),
    title: '',
    content: '',
    isGlobal: false,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
});

export const normalizeEditableInstruction = (item, index = 0) => {
    if (!item || typeof item !== 'object') {
        return {
            ...defaultInstruction(),
            id: `ci_${Date.now().toString(36)}_${index}`
        };
    }

    return {
        id: String(item.id || `ci_${Date.now().toString(36)}_${index}`),
        title: String(item.title || item.name || '').slice(0, MAX_TITLE_LENGTH),
        content: String(item.content || item.text || '').slice(0, MAX_CONTENT_LENGTH),
        isGlobal: item.isGlobal === true,
        enabled: item.enabled !== false,
        createdAt: Number(item.createdAt) || Date.now(),
        updatedAt: Number(item.updatedAt) || Date.now()
    };
};

export const getEditableItems = (value) => {
    if (value && typeof value === 'object' && Array.isArray(value.items)) {
        return value.items.map((item, idx) => normalizeEditableInstruction(item, idx));
    }

    return normalizeCustomInstructionsValue(value).items.map((item, idx) => normalizeEditableInstruction(item, idx));
};

export const getInstructionSummary = (items = []) => {
    const total = items.length;
    const enabled = items.filter(item => item.enabled !== false && item.content.trim()).length;
    const global = items.filter(item => item.isGlobal === true && item.enabled !== false && item.content.trim()).length;
    const optional = items.filter(item => item.isGlobal !== true && item.enabled !== false && item.content.trim()).length;
    const empty = items.filter(item => !item.content.trim()).length;

    return { total, enabled, global, optional, empty };
};

export const getInstructionDisplayTitle = (item, fallbackTitle = '未命名指令') => {
    if (!item) return fallbackTitle;
    return (item.title || '').trim() || fallbackTitle;
};

export const getInstructionSnippet = (item, fallbackSnippet = '点击右侧编辑器填写内容') => {
    const content = String(item?.content || '').trim();
    if (!content) return fallbackSnippet;

    const firstLine = content.split('\n').find(line => line.trim().length > 0) || content;
    if (firstLine.length <= 72) return firstLine;
    return `${firstLine.slice(0, 72)}...`;
};

export const sortInstructions = (items = [], sort = 'updated_desc') => {
    const arr = [...items];

    if (sort === 'updated_asc') {
        return arr.sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
    }

    if (sort === 'title_asc') {
        return arr.sort((a, b) => {
            const ta = String(a.title || '').toLowerCase();
            const tb = String(b.title || '').toLowerCase();
            return ta.localeCompare(tb, 'zh-Hans-CN');
        });
    }

    if (sort === 'created_desc') {
        return arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    return arr.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
};

export const filterInstructions = (items = [], { query = '', filter = 'all' } = {}) => {
    const normalizedQuery = String(query || '').trim().toLowerCase();

    return items.filter((item) => {
        const title = String(item.title || '').toLowerCase();
        const content = String(item.content || '').toLowerCase();

        if (normalizedQuery && !title.includes(normalizedQuery) && !content.includes(normalizedQuery)) {
            return false;
        }

        if (filter === 'enabled') return item.enabled !== false;
        if (filter === 'global') return item.isGlobal === true;
        if (filter === 'optional') return item.isGlobal !== true;
        if (filter === 'empty') return !String(item.content || '').trim();

        return true;
    });
};

export const duplicateInstruction = (item) => ({
    ...item,
    id: createInstructionId(),
    title: item.title ? `${item.title} (副本)` : '',
    createdAt: Date.now(),
    updatedAt: Date.now()
});
