export const createSettingsSlice = (set) => ({
    isSettingsOpen: false,
    activeModel: 'gemini-2.0-flash-exp',
    apiConfig: {},

    setIsSettingsOpen: (val) => set({ isSettingsOpen: typeof val === 'function' ? val() : val }),
    setActiveModel: (val) => set({ activeModel: val }),
    setApiConfig: (val) => set({ apiConfig: val })
});
