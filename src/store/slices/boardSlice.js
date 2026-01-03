import { uuid } from '../../utils/uuid';

const GLOBAL_PROMPTS_KEY = 'mixboard_global_prompts';
const DEFAULT_GLOBAL_PROMPTS = [
    { id: '1', name: '续写', text: '续写', content: '请基于当前内容，继续深入探讨并延展相关想法。', color: 'rose' },
    { id: '2', name: '头脑风暴', text: '头脑风暴', content: '请针对当前主题，发散出 5 个新颖且具可行性的创意方向。', color: 'emerald' },
    { id: '3', name: '总结提炼', text: '总结提炼', content: '请总结以上内容的核心要点，并提炼成简洁的行动指南。', color: 'sky' }
];

const loadGlobalPrompts = () => {
    const saved = localStorage.getItem(GLOBAL_PROMPTS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_GLOBAL_PROMPTS;
};

export const createBoardSlice = (set, get) => ({
    boardPrompts: [],
    globalPrompts: loadGlobalPrompts(),
    globalPromptsModifiedAt: Date.now(),

    setGlobalPrompts: (prompts, fromCloud = false) => {
        set({
            globalPrompts: prompts,
            globalPromptsModifiedAt: fromCloud ? (get().globalPromptsModifiedAt || 0) : Date.now()
        });
        if (!fromCloud) {
            localStorage.setItem(GLOBAL_PROMPTS_KEY, JSON.stringify(prompts));
        }
    },
    addGlobalPrompt: (prompt) => {
        const next = [...get().globalPrompts, { id: uuid(), ...prompt }];
        get().setGlobalPrompts(next);
    },

    removeGlobalPrompt: (id) => {
        const next = get().globalPrompts.filter(p => p.id !== id);
        get().setGlobalPrompts(next);
    },

    updateGlobalPrompt: (id, updates) => {
        const next = get().globalPrompts.map(p => p.id === id ? { ...p, ...updates } : p);
        get().setGlobalPrompts(next);
    },
    boardPrompts: [],

    addBoardPrompt: (promptOrText) => set((state) => {
        const newPrompt = typeof promptOrText === 'object'
            ? { id: uuid(), createdAt: Date.now(), ...promptOrText }
            : { id: uuid(), text: promptOrText, createdAt: Date.now() };
        return {
            boardPrompts: [...(state.boardPrompts || []), newPrompt]
        };
    }),

    removeBoardPrompt: (id) => set((state) => ({
        boardPrompts: (state.boardPrompts || []).filter((p) => p.id !== id)
    })),

    updateBoardPrompt: (id, updates) => set((state) => ({
        boardPrompts: (state.boardPrompts || []).map(p =>
            p.id === id
                ? (typeof updates === 'string' ? { ...p, text: updates } : { ...p, ...updates })
                : p
        )
    })),

    // Set all board prompts (e.g. when loading board data)
    setBoardPrompts: (prompts) => set({ boardPrompts: prompts || [] }),
});
