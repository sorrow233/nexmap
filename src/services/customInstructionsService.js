const CUSTOM_INSTRUCTIONS_KEY = 'mixboard_custom_instructions';
const BOARD_INSTRUCTION_SETTINGS_CACHE_KEY = 'mixboard_board_instruction_settings_map';
const CURRENT_BOARD_ID_KEY = 'mixboard_current_board_id';

const nowTs = () => Date.now();

const createInstructionId = () => `ci_${nowTs().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const DEFAULT_CUSTOM_INSTRUCTIONS = Object.freeze({
    items: []
});

export const DEFAULT_BOARD_INSTRUCTION_SETTINGS = Object.freeze({
    enabledInstructionIds: [],
    autoEnabledInstructionIds: [],
    autoSelectionMode: 'auto', // 'auto' | 'manual'
    autoSelection: {
        status: 'idle', // 'idle' | 'running' | 'done' | 'error'
        lastRunAt: 0,
        lastConversationCount: 0,
        lastError: '',
        lastResultCount: 0,
        lastTrigger: 'auto' // 'auto' | 'manual'
    }
});

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const uniqueStrings = (list) => {
    const out = [];
    const seen = new Set();
    (list || []).forEach(item => {
        if (typeof item !== 'string') return;
        const normalized = item.trim();
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        out.push(normalized);
    });
    return out;
};

export const normalizeInstructionItem = (item, index = 0, legacyStringAsGlobal = false) => {
    if (typeof item === 'string') {
        const content = item.trim();
        if (!content) return null;
        return {
            id: createInstructionId(),
            title: `Instruction ${index + 1}`,
            content,
            isGlobal: legacyStringAsGlobal,
            enabled: true,
            createdAt: nowTs(),
            updatedAt: nowTs()
        };
    }

    if (!isObject(item)) return null;

    const content = String(item.content || item.text || '').trim();
    if (!content) return null;

    const titleCandidate = item.title || item.name || item.text || `Instruction ${index + 1}`;
    const title = String(titleCandidate).trim().slice(0, 80) || `Instruction ${index + 1}`;

    const createdAt = Number(item.createdAt);
    const updatedAt = Number(item.updatedAt);

    return {
        id: String(item.id || createInstructionId()),
        title,
        content,
        isGlobal: item.isGlobal === true,
        enabled: item.enabled !== false,
        createdAt: Number.isFinite(createdAt) ? createdAt : nowTs(),
        updatedAt: Number.isFinite(updatedAt) ? updatedAt : nowTs()
    };
};

export const normalizeCustomInstructionsValue = (value) => {
    if (typeof value === 'string') {
        const normalized = normalizeInstructionItem(value, 0, true);
        return {
            items: normalized ? [normalized] : []
        };
    }

    if (Array.isArray(value)) {
        return {
            items: value
                .map((item, idx) => normalizeInstructionItem(item, idx, false))
                .filter(Boolean)
        };
    }

    if (isObject(value)) {
        if (Array.isArray(value.items)) {
            return {
                items: value.items
                    .map((item, idx) => normalizeInstructionItem(item, idx, false))
                    .filter(Boolean)
            };
        }

        if (value.value !== undefined) {
            return normalizeCustomInstructionsValue(value.value);
        }

        const normalized = normalizeInstructionItem(value, 0, false);
        return {
            items: normalized ? [normalized] : []
        };
    }

    return {
        items: []
    };
};

export const hasAnyCustomInstruction = (value) => {
    const normalized = normalizeCustomInstructionsValue(value);
    return normalized.items.length > 0;
};

export const parseCustomInstructionsFromStorageRaw = (raw) => {
    if (!raw) {
        return {
            value: normalizeCustomInstructionsValue(DEFAULT_CUSTOM_INSTRUCTIONS),
            lastModified: 0
        };
    }

    try {
        const parsed = JSON.parse(raw);
        if (isObject(parsed) && parsed.value !== undefined) {
            return {
                value: normalizeCustomInstructionsValue(parsed.value),
                lastModified: Number(parsed.lastModified) || 0
            };
        }
        return {
            value: normalizeCustomInstructionsValue(parsed),
            lastModified: 0
        };
    } catch {
        return {
            value: normalizeCustomInstructionsValue(raw),
            lastModified: 0
        };
    }
};

export const readCustomInstructionsFromLocalStorage = () => {
    const raw = localStorage.getItem(CUSTOM_INSTRUCTIONS_KEY);
    return parseCustomInstructionsFromStorageRaw(raw).value;
};

export const normalizeBoardInstructionSettings = (value) => {
    if (!isObject(value)) {
        return {
            ...DEFAULT_BOARD_INSTRUCTION_SETTINGS,
            enabledInstructionIds: [],
            autoEnabledInstructionIds: [],
            autoSelection: { ...DEFAULT_BOARD_INSTRUCTION_SETTINGS.autoSelection }
        };
    }

    const mode = value.autoSelectionMode === 'manual' ? 'manual' : 'auto';
    const autoSelection = isObject(value.autoSelection) ? value.autoSelection : {};

    return {
        enabledInstructionIds: uniqueStrings(value.enabledInstructionIds),
        autoEnabledInstructionIds: uniqueStrings(value.autoEnabledInstructionIds),
        autoSelectionMode: mode,
        autoSelection: {
            status: ['idle', 'running', 'done', 'error'].includes(autoSelection.status) ? autoSelection.status : 'idle',
            lastRunAt: Number(autoSelection.lastRunAt) || 0,
            lastConversationCount: Number(autoSelection.lastConversationCount) || 0,
            lastError: typeof autoSelection.lastError === 'string' ? autoSelection.lastError : '',
            lastResultCount: Math.max(0, Number(autoSelection.lastResultCount) || 0),
            lastTrigger: autoSelection.lastTrigger === 'manual' ? 'manual' : 'auto'
        }
    };
};

export const getInstructionCatalogBreakdown = (allInstructionsValue) => {
    const allInstructions = normalizeCustomInstructionsValue(allInstructionsValue).items.filter(i => i.enabled !== false);
    const globalInstructions = allInstructions.filter(i => i.isGlobal === true);
    const optionalInstructions = allInstructions.filter(i => i.isGlobal !== true);
    const optionalIdSet = new Set(optionalInstructions.map(item => item.id));

    return {
        allInstructions,
        globalInstructions,
        optionalInstructions,
        optionalIdSet
    };
};

export const sanitizeBoardInstructionSettingsForCatalog = (boardInstructionSettings, allInstructionsValue) => {
    const settings = normalizeBoardInstructionSettings(boardInstructionSettings);
    const { optionalIdSet } = getInstructionCatalogBreakdown(allInstructionsValue);

    const sanitizedEnabled = settings.enabledInstructionIds.filter(id => optionalIdSet.has(id));
    const sanitizedAuto = settings.autoEnabledInstructionIds.filter(id => optionalIdSet.has(id));

    return {
        ...settings,
        enabledInstructionIds: sanitizedEnabled,
        autoEnabledInstructionIds: sanitizedAuto
    };
};

const readBoardInstructionSettingsMap = () => {
    const raw = localStorage.getItem(BOARD_INSTRUCTION_SETTINGS_CACHE_KEY);
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return isObject(parsed) ? parsed : {};
    } catch {
        return {};
    }
};

export const saveBoardInstructionSettingsCache = (boardId, settings) => {
    if (!boardId) return;
    const map = readBoardInstructionSettingsMap();
    map[boardId] = normalizeBoardInstructionSettings(settings);
    localStorage.setItem(BOARD_INSTRUCTION_SETTINGS_CACHE_KEY, JSON.stringify(map));
};

export const loadBoardInstructionSettingsCache = (boardId) => {
    if (!boardId) return normalizeBoardInstructionSettings(null);
    const map = readBoardInstructionSettingsMap();
    return normalizeBoardInstructionSettings(map[boardId]);
};

const getCurrentBoardId = () => {
    try {
        return sessionStorage.getItem(CURRENT_BOARD_ID_KEY);
    } catch {
        return null;
    }
};

export const resolveActiveInstructionsForBoard = (allInstructionsValue, boardInstructionSettings) => {
    const { globalInstructions, optionalInstructions } = getInstructionCatalogBreakdown(allInstructionsValue);

    if (optionalInstructions.length === 0) return globalInstructions;

    const settings = sanitizeBoardInstructionSettingsForCatalog(boardInstructionSettings, allInstructionsValue);
    const enabledIds = new Set(settings.enabledInstructionIds);
    const enabledOptional = optionalInstructions.filter(item => enabledIds.has(item.id));

    return [...globalInstructions, ...enabledOptional];
};

export const resolveActiveInstructionsForCurrentBoard = () => {
    const boardId = getCurrentBoardId();
    const allInstructions = readCustomInstructionsFromLocalStorage();
    const boardSettings = loadBoardInstructionSettingsCache(boardId);
    return resolveActiveInstructionsForBoard(allInstructions, boardSettings);
};

export const extractCustomInstructionsPlainText = (allInstructionsValue) => {
    const items = normalizeCustomInstructionsValue(allInstructionsValue).items;
    return items.map(item => item.content).filter(Boolean).join('\n');
};

export {
    CUSTOM_INSTRUCTIONS_KEY,
    BOARD_INSTRUCTION_SETTINGS_CACHE_KEY
};
