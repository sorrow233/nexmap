const baseTarget = {
    source: 'nexmap'
};

export const LINKAGE_TARGETS = {
    flowstudio: {
        ...baseTarget,
        id: 'flowstudio',
        label: 'FlowStudio',
        buttonLabel: 'Flow',
        settingsKey: 'flowStudioUserId',
        localStorageKey: 'flowstudio_user_id',
        localStorageScopedPrefix: 'flowstudio_user_id:',
        apiUrl: 'https://flowstudio.catzz.work/api/import',
        iconPath: '/flowstudio-32x32.png',
        settingsDescription: '绑定后，划词内容会静默进入你的 FlowStudio 队列。'
    },
    light: {
        ...baseTarget,
        id: 'light',
        label: 'Light',
        buttonLabel: 'Light',
        settingsKey: 'lightUserId',
        localStorageKey: 'light_user_id',
        localStorageScopedPrefix: 'light_user_id:',
        apiUrl: 'https://light.catzz.work/api/import',
        iconPath: '/light-32x32.png',
        settingsDescription: '绑定后，划词内容会直接送进你的 Light 灵感箱。'
    }
};

export const LINKAGE_TARGET_LIST = Object.values(LINKAGE_TARGETS);

export const getLinkageTarget = (targetId) => LINKAGE_TARGETS[targetId] || null;

export const createEmptyLinkageSettings = () => LINKAGE_TARGET_LIST.reduce((acc, target) => {
    acc[target.settingsKey] = '';
    return acc;
}, {});

export const normalizeLinkageSettings = (value) => {
    const next = createEmptyLinkageSettings();

    for (const target of LINKAGE_TARGET_LIST) {
        const raw = value?.[target.settingsKey];
        next[target.settingsKey] = typeof raw === 'string' ? raw.trim() : '';
    }

    return next;
};
